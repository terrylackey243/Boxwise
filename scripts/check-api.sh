#!/bin/bash

# Boxwise API Check Script
# This script checks the API configuration and connectivity

# ANSI color codes
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Get the script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
cd "$SCRIPT_DIR"

echo -e "${BLUE}=== Boxwise API Configuration Check ===${NC}"
echo ""

# Check if Nginx is installed and running
echo -e "${BLUE}Checking Nginx status...${NC}"
if command -v nginx &> /dev/null; then
    if pgrep -x "nginx" > /dev/null || systemctl is-active --quiet nginx 2>/dev/null; then
        echo -e "${GREEN}Nginx is running${NC}"
        
        # Find Nginx configuration file for Boxwise
        echo -e "\n${BLUE}Looking for Boxwise Nginx configuration...${NC}"
        NGINX_CONF_FILE=""
        for conf in /etc/nginx/sites-enabled/*; do
            if grep -q "boxwise" "$conf" 2>/dev/null; then
                NGINX_CONF_FILE="$conf"
                echo -e "${GREEN}Found Nginx configuration at: $NGINX_CONF_FILE${NC}"
                break
            fi
        done
        
        if [ -z "$NGINX_CONF_FILE" ]; then
            echo -e "${RED}No Nginx configuration found for Boxwise${NC}"
            echo -e "Checking all Nginx configurations..."
            
            for conf in /etc/nginx/sites-enabled/*; do
                echo -e "\n${YELLOW}Configuration file: $conf${NC}"
                grep -E "location|proxy_pass" "$conf" 2>/dev/null | grep -v "#" | sed 's/^/  /'
            done
        else
            # Check API configuration in Nginx
            echo -e "\n${BLUE}Checking API configuration in Nginx...${NC}"
            API_CONFIG=$(grep -A 10 "location /api" "$NGINX_CONF_FILE" 2>/dev/null)
            
            if [ -z "$API_CONFIG" ]; then
                echo -e "${RED}No API configuration found in Nginx config${NC}"
                echo -e "Showing all location blocks:"
                grep -A 10 "location" "$NGINX_CONF_FILE" 2>/dev/null | grep -v "#" | sed 's/^/  /'
            else
                echo -e "${GREEN}API configuration found:${NC}"
                echo -e "$API_CONFIG" | grep -v "#" | sed 's/^/  /'
                
                # Check for double API path
                PROXY_PASS=$(echo "$API_CONFIG" | grep "proxy_pass" | grep -v "#")
                if echo "$PROXY_PASS" | grep -q "api.*api"; then
                    echo -e "\n${RED}WARNING: Possible double API path detected in proxy_pass directive${NC}"
                    echo -e "Current configuration: $PROXY_PASS"
                    echo -e "This might cause the 502 Bad Gateway error when accessing /api/api/auth/register"
                    echo -e "\n${YELLOW}Suggested fix:${NC}"
                    echo -e "Edit the Nginx configuration file: $NGINX_CONF_FILE"
                    echo -e "Change the proxy_pass directive to remove the duplicate 'api' path"
                    echo -e "Example: proxy_pass http://localhost:5001; (instead of http://localhost:5001/api)"
                    echo -e "Then reload Nginx: sudo systemctl reload nginx"
                fi
            fi
        fi
    else
        echo -e "${RED}Nginx is installed but not running${NC}"
        echo -e "Try starting Nginx: sudo systemctl start nginx"
    fi
else
    echo -e "${RED}Nginx is not installed${NC}"
fi

echo ""

# Check if backend server is running
echo -e "${BLUE}Checking backend server status...${NC}"
if command -v pm2 &> /dev/null && pm2 list | grep -q "boxwise"; then
    echo -e "${GREEN}Backend server is running with PM2${NC}"
    PM2_STATUS=$(pm2 list | grep "boxwise")
    echo -e "PM2 status: $PM2_STATUS"
    
    # Check PM2 logs for API errors
    echo -e "\n${BLUE}Checking PM2 logs for API errors...${NC}"
    PM2_LOGS=$(pm2 logs boxwise --lines 20 --nostream 2>&1)
    API_ERRORS=$(echo "$PM2_LOGS" | grep -i "error\|exception\|fail")
    
    if [ -n "$API_ERRORS" ]; then
        echo -e "${RED}Found errors in PM2 logs:${NC}"
        echo -e "$API_ERRORS" | sed 's/^/  /'
    else
        echo -e "${GREEN}No obvious errors found in recent PM2 logs${NC}"
    fi
elif [ -f "$SCRIPT_DIR/server.pid" ]; then
    PID=$(cat "$SCRIPT_DIR/server.pid")
    if ps -p $PID > /dev/null; then
        echo -e "${GREEN}Backend server is running directly (PID: $PID)${NC}"
    else
        echo -e "${RED}Backend server PID file exists but process is not running${NC}"
        echo -e "Try restarting the backend: ./restart-production.sh"
    fi
else
    echo -e "${RED}Backend server is not running${NC}"
    echo -e "Try starting the application: ./start-production.sh"
fi

echo ""

# Test API endpoint directly
echo -e "${BLUE}Testing API endpoint directly...${NC}"
BACKEND_PORT=5001
if command -v curl &> /dev/null; then
    echo -e "Testing connection to backend server on port $BACKEND_PORT..."
    CURL_RESULT=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:$BACKEND_PORT/api/health 2>/dev/null || echo "Failed")
    
    if [ "$CURL_RESULT" = "200" ]; then
        echo -e "${GREEN}Backend API is responding on http://localhost:$BACKEND_PORT/api/health${NC}"
    elif [ "$CURL_RESULT" = "Failed" ]; then
        echo -e "${RED}Could not connect to backend API on http://localhost:$BACKEND_PORT/api/health${NC}"
        echo -e "The backend server might not be running or might be listening on a different port"
    else
        echo -e "${YELLOW}Backend API responded with status code: $CURL_RESULT${NC}"
    fi
    
    # Test auth endpoint
    echo -e "\nTesting auth endpoint directly..."
    AUTH_RESULT=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:$BACKEND_PORT/api/auth/status 2>/dev/null || echo "Failed")
    
    if [ "$AUTH_RESULT" = "200" ] || [ "$AUTH_RESULT" = "401" ]; then
        echo -e "${GREEN}Auth endpoint is responding on http://localhost:$BACKEND_PORT/api/auth/status${NC}"
        echo -e "Status code: $AUTH_RESULT (401 is expected if not authenticated)"
    elif [ "$AUTH_RESULT" = "Failed" ]; then
        echo -e "${RED}Could not connect to auth endpoint on http://localhost:$BACKEND_PORT/api/auth/status${NC}"
    else
        echo -e "${YELLOW}Auth endpoint responded with status code: $AUTH_RESULT${NC}"
    fi
else
    echo -e "${YELLOW}curl command not available, skipping direct API test${NC}"
fi

echo ""

# Check for environment variables that might affect the API
echo -e "${BLUE}Checking environment variables...${NC}"
if [ -f "$SCRIPT_DIR/server/.env" ]; then
    echo -e "${GREEN}Found server environment file: $SCRIPT_DIR/server/.env${NC}"
    
    # Check for API-related variables
    API_PORT=$(grep -E "^PORT=" "$SCRIPT_DIR/server/.env" | cut -d= -f2)
    if [ -n "$API_PORT" ]; then
        echo -e "API port: $API_PORT"
        if [ "$API_PORT" != "$BACKEND_PORT" ]; then
            echo -e "${YELLOW}Warning: API port in .env ($API_PORT) differs from default port ($BACKEND_PORT)${NC}"
            echo -e "Make sure Nginx is configured to proxy to the correct port"
        fi
    else
        echo -e "API port not specified in .env, using default: $BACKEND_PORT"
    fi
    
    # Check for API URL prefix
    API_PREFIX=$(grep -E "^API_PREFIX=" "$SCRIPT_DIR/server/.env" | cut -d= -f2)
    if [ -n "$API_PREFIX" ]; then
        echo -e "API prefix: $API_PREFIX"
        if [ "$API_PREFIX" = "/api" ]; then
            echo -e "${YELLOW}Warning: API_PREFIX is set to '/api' in .env${NC}"
            echo -e "This might cause the double 'api' path issue if Nginx is also configured with '/api'"
        fi
    else
        echo -e "API prefix not specified in .env"
    fi
else
    echo -e "${YELLOW}No server environment file found${NC}"
fi

echo ""

# Summary and recommendations
echo -e "${BLUE}=== Summary and Recommendations ===${NC}"
echo ""

echo -e "${YELLOW}Based on the error message you provided:${NC}"
echo -e "1. You're getting a 502 Bad Gateway error when trying to login"
echo -e "2. The request is going to https://www.boxwise.app/api/api/auth/register"
echo -e "3. The double 'api/api' in the URL path suggests a configuration issue"
echo ""

echo -e "${YELLOW}Possible solutions:${NC}"
echo -e "1. Check the Nginx configuration for the API proxy path"
echo -e "   - Look for a location block for /api"
echo -e "   - Make sure the proxy_pass directive doesn't include '/api' if the location already has it"
echo -e "   - Example fix: change 'proxy_pass http://localhost:5001/api;' to 'proxy_pass http://localhost:5001;'"
echo ""
echo -e "2. Check the server environment variables"
echo -e "   - Make sure the PORT in .env matches what Nginx is configured to proxy to"
echo -e "   - Check if API_PREFIX is causing a double path issue"
echo ""
echo -e "3. Restart the services after making changes"
echo -e "   - Reload Nginx: sudo systemctl reload nginx"
echo -e "   - Restart the application: ./restart-production.sh"
echo ""

echo -e "${BLUE}For more detailed troubleshooting:${NC}"
echo -e "1. Check Nginx error logs: sudo tail -n 100 /var/log/nginx/error.log"
echo -e "2. Check application logs: pm2 logs boxwise"
echo -e "3. Test the API directly: curl http://localhost:5001/api/health"
echo ""

#!/bin/bash

# Boxwise Fix Nginx API Path Script
# This script fixes the double API path issue in Nginx configuration

# ANSI color codes
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
BOLD='\033[1m'
NC='\033[0m' # No Color

# Get the script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
cd "$SCRIPT_DIR"

echo -e "${BLUE}${BOLD}=== Boxwise Fix Nginx API Path ===${NC}"
echo -e "${BLUE}Current directory: ${SCRIPT_DIR}${NC}"
echo ""

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    echo -e "${YELLOW}Warning: This script may need root privileges for some operations.${NC}"
    echo -e "Consider running with sudo if you encounter permission issues."
    echo ""
fi

# Check if Nginx is installed
if ! command -v nginx &> /dev/null; then
    echo -e "${RED}Nginx is not installed${NC}"
    echo -e "Please install Nginx and run this script again."
    exit 1
fi

# Check if Nginx is running
if ! systemctl is-active --quiet nginx; then
    echo -e "${RED}Nginx is not running${NC}"
    echo -e "${YELLOW}Would you like to start Nginx? (y/n)${NC}"
    read -r answer
    if [[ "$answer" =~ ^[Yy]$ ]]; then
        echo -e "${BLUE}Starting Nginx...${NC}"
        systemctl start nginx
        if [ $? -ne 0 ]; then
            echo -e "${RED}Failed to start Nginx${NC}"
            echo -e "Please start Nginx manually and run this script again."
            exit 1
        fi
        echo -e "${GREEN}Nginx started successfully${NC}"
    else
        echo -e "${YELLOW}Skipping Nginx start${NC}"
        echo -e "This script requires Nginx to be running. Please start Nginx and run this script again."
        exit 1
    fi
fi

# Find Nginx configuration files
echo -e "${BLUE}${BOLD}Looking for Nginx configuration files...${NC}"
NGINX_CONF_DIR="/etc/nginx"
SITES_AVAILABLE_DIR="$NGINX_CONF_DIR/sites-available"
SITES_ENABLED_DIR="$NGINX_CONF_DIR/sites-enabled"

# Check if sites-available and sites-enabled directories exist
if [ ! -d "$SITES_AVAILABLE_DIR" ] || [ ! -d "$SITES_ENABLED_DIR" ]; then
    echo -e "${YELLOW}Standard Nginx sites directories not found${NC}"
    echo -e "Looking for configuration files in $NGINX_CONF_DIR..."
    
    # Find all configuration files in the Nginx directory
    CONF_FILES=()
    while IFS= read -r -d '' file; do
        CONF_FILES+=("$file")
    done < <(find "$NGINX_CONF_DIR" -type f -name "*.conf" -print0)
    
    if [ ${#CONF_FILES[@]} -eq 0 ]; then
        echo -e "${RED}No Nginx configuration files found${NC}"
        echo -e "Please check your Nginx installation and run this script again."
        exit 1
    fi
    
    echo -e "${GREEN}Found ${#CONF_FILES[@]} configuration files${NC}"
else
    # Find all configuration files in sites-available and sites-enabled
    CONF_FILES=()
    while IFS= read -r -d '' file; do
        CONF_FILES+=("$file")
    done < <(find "$SITES_AVAILABLE_DIR" "$SITES_ENABLED_DIR" -type f -print0)
    
    if [ ${#CONF_FILES[@]} -eq 0 ]; then
        echo -e "${RED}No Nginx configuration files found${NC}"
        echo -e "Please check your Nginx installation and run this script again."
        exit 1
    fi
    
    echo -e "${GREEN}Found ${#CONF_FILES[@]} configuration files${NC}"
fi

# Look for API configuration in Nginx files
echo -e "${BLUE}${BOLD}Looking for API configuration...${NC}"
API_CONF_FILES=()
for file in "${CONF_FILES[@]}"; do
    if grep -q "location /api" "$file"; then
        API_CONF_FILES+=("$file")
        echo -e "${GREEN}Found API configuration in $file${NC}"
    fi
done

if [ ${#API_CONF_FILES[@]} -eq 0 ]; then
    echo -e "${RED}No API configuration found in Nginx files${NC}"
    echo -e "Would you like to create a new API configuration? (y/n)"
    read -r answer
    if [[ "$answer" =~ ^[Yy]$ ]]; then
        echo -e "${BLUE}Creating new API configuration...${NC}"
        
        # Ask for the configuration file to modify
        echo -e "${YELLOW}Please enter the path to the Nginx configuration file to modify:${NC}"
        read -r conf_file
        
        if [ ! -f "$conf_file" ]; then
            echo -e "${RED}File not found: $conf_file${NC}"
            echo -e "Please check the file path and run this script again."
            exit 1
        fi
        
        # Ask for the backend server port
        echo -e "${YELLOW}Please enter the backend server port (default: 5001):${NC}"
        read -r backend_port
        if [ -z "$backend_port" ]; then
            backend_port=5001
        fi
        
        # Create a backup of the original file
        cp "$conf_file" "$conf_file.bak"
        echo -e "${GREEN}Created backup of Nginx configuration at: $conf_file.bak${NC}"
        
        # Add API location block to the server block
        sed -i '/server {/a \
    location /api {\
        proxy_pass http://localhost:'"$backend_port"';\
        proxy_http_version 1.1;\
        proxy_set_header Upgrade $http_upgrade;\
        proxy_set_header Connection "upgrade";\
        proxy_set_header Host $host;\
        proxy_set_header X-Real-IP $remote_addr;\
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;\
        proxy_set_header X-Forwarded-Proto $scheme;\
    }' "$conf_file"
        
        echo -e "${GREEN}Added API configuration to $conf_file${NC}"
        
        # Test the new configuration
        echo -e "${BLUE}Testing Nginx configuration...${NC}"
        nginx -t
        if [ $? -ne 0 ]; then
            echo -e "${RED}Nginx configuration test failed${NC}"
            echo -e "${YELLOW}Restoring backup...${NC}"
            cp "$conf_file.bak" "$conf_file"
            echo -e "${GREEN}Backup restored${NC}"
            exit 1
        fi
        
        echo -e "${GREEN}Nginx configuration test passed${NC}"
        echo -e "${BLUE}Reloading Nginx...${NC}"
        systemctl reload nginx
        if [ $? -ne 0 ]; then
            echo -e "${RED}Failed to reload Nginx${NC}"
            echo -e "Please reload Nginx manually with: systemctl reload nginx"
        else
            echo -e "${GREEN}Nginx reloaded successfully${NC}"
        fi
        
        echo -e "${GREEN}API configuration created successfully${NC}"
        exit 0
    else
        echo -e "${YELLOW}Skipping API configuration creation${NC}"
        echo -e "Please create an API configuration manually and run this script again."
        exit 1
    fi
fi

# Check for double API path in Nginx configuration
echo -e "${BLUE}${BOLD}Checking for double API path...${NC}"
DOUBLE_API_FILES=()
for file in "${API_CONF_FILES[@]}"; do
    if grep -q "proxy_pass.*api.*api" "$file"; then
        DOUBLE_API_FILES+=("$file")
        echo -e "${RED}Found double API path in $file${NC}"
    fi
done

if [ ${#DOUBLE_API_FILES[@]} -eq 0 ]; then
    echo -e "${GREEN}No double API path found in Nginx configuration${NC}"
    echo -e "Would you like to check the API configuration anyway? (y/n)"
    read -r answer
    if [[ ! "$answer" =~ ^[Yy]$ ]]; then
        echo -e "${YELLOW}Skipping API configuration check${NC}"
        exit 0
    fi
    DOUBLE_API_FILES=("${API_CONF_FILES[@]}")
fi

# Fix double API path in Nginx configuration
echo -e "${BLUE}${BOLD}Fixing API configuration...${NC}"
for file in "${DOUBLE_API_FILES[@]}"; do
    echo -e "${BLUE}Checking file: $file${NC}"
    
    # Create a backup of the original file
    cp "$file" "$file.bak"
    echo -e "${GREEN}Created backup of Nginx configuration at: $file.bak${NC}"
    
    # Display the current API configuration
    echo -e "${YELLOW}Current API configuration:${NC}"
    grep -A 10 "location /api" "$file" | grep -v "#" | sed 's/^/  /'
    
    # Fix the proxy_pass directive
    if grep -q "proxy_pass.*api.*api" "$file"; then
        echo -e "${BLUE}Fixing double API path...${NC}"
        sed -i 's|proxy_pass http://localhost:[0-9]\+/api/api|proxy_pass http://localhost:5001/api|g' "$file"
        sed -i 's|proxy_pass http://localhost:[0-9]\+/api|proxy_pass http://localhost:5001|g' "$file"
        
        echo -e "${GREEN}Fixed double API path in $file${NC}"
    else
        echo -e "${YELLOW}No double API path found in this file${NC}"
        echo -e "Would you like to update the API configuration anyway? (y/n)"
        read -r answer
        if [[ "$answer" =~ ^[Yy]$ ]]; then
            echo -e "${BLUE}Updating API configuration...${NC}"
            
            # Ask for the backend server port
            echo -e "${YELLOW}Please enter the backend server port (default: 5001):${NC}"
            read -r backend_port
            if [ -z "$backend_port" ]; then
                backend_port=5001
            fi
            
            # Update the proxy_pass directive
            sed -i 's|proxy_pass http://localhost:[0-9]\+/api|proxy_pass http://localhost:'"$backend_port"'|g' "$file"
            
            echo -e "${GREEN}Updated API configuration in $file${NC}"
        else
            echo -e "${YELLOW}Skipping API configuration update${NC}"
        fi
    fi
    
    # Display the updated API configuration
    echo -e "${YELLOW}Updated API configuration:${NC}"
    grep -A 10 "location /api" "$file" | grep -v "#" | sed 's/^/  /'
    
    # Test the new configuration
    echo -e "${BLUE}Testing Nginx configuration...${NC}"
    nginx -t
    if [ $? -ne 0 ]; then
        echo -e "${RED}Nginx configuration test failed${NC}"
        echo -e "${YELLOW}Restoring backup...${NC}"
        cp "$file.bak" "$file"
        echo -e "${GREEN}Backup restored${NC}"
        continue
    fi
    
    echo -e "${GREEN}Nginx configuration test passed${NC}"
    echo -e "${BLUE}Reloading Nginx...${NC}"
    systemctl reload nginx
    if [ $? -ne 0 ]; then
        echo -e "${RED}Failed to reload Nginx${NC}"
        echo -e "Please reload Nginx manually with: systemctl reload nginx"
    else
        echo -e "${GREEN}Nginx reloaded successfully${NC}"
    fi
done

# Test the API endpoint
echo -e "${BLUE}${BOLD}Testing API endpoint...${NC}"
if command -v curl &> /dev/null; then
    echo -e "${YELLOW}Testing connection to API endpoint...${NC}"
    CURL_RESULT=$(curl -s -o /dev/null -w "%{http_code}" http://localhost/api/health 2>/dev/null || echo "Failed")
    
    if [ "$CURL_RESULT" = "200" ]; then
        echo -e "${GREEN}API endpoint is responding on http://localhost/api/health${NC}"
        API_WORKING=true
    elif [ "$CURL_RESULT" = "Failed" ]; then
        echo -e "${RED}Could not connect to API endpoint on http://localhost/api/health${NC}"
        echo -e "The API endpoint might not be available or might be listening on a different port"
        API_WORKING=false
    else
        echo -e "${YELLOW}API endpoint responded with status code: $CURL_RESULT${NC}"
        API_WORKING=false
    fi
    
    # Test auth endpoint
    echo -e "\n${YELLOW}Testing auth endpoint...${NC}"
    AUTH_RESULT=$(curl -s -o /dev/null -w "%{http_code}" http://localhost/api/auth/status 2>/dev/null || echo "Failed")
    
    if [ "$AUTH_RESULT" = "200" ] || [ "$AUTH_RESULT" = "401" ]; then
        echo -e "${GREEN}Auth endpoint is responding on http://localhost/api/auth/status${NC}"
        echo -e "Status code: $AUTH_RESULT (401 is expected if not authenticated)"
        AUTH_WORKING=true
    elif [ "$AUTH_RESULT" = "Failed" ]; then
        echo -e "${RED}Could not connect to auth endpoint on http://localhost/api/auth/status${NC}"
        AUTH_WORKING=false
    else
        echo -e "${YELLOW}Auth endpoint responded with status code: $AUTH_RESULT${NC}"
        AUTH_WORKING=false
    fi
else
    echo -e "${YELLOW}curl command not available, skipping API test${NC}"
    API_WORKING=false
    AUTH_WORKING=false
fi

# Summary
echo -e "${BLUE}${BOLD}=== Summary ===${NC}"
if [ "$API_WORKING" = true ] && [ "$AUTH_WORKING" = true ]; then
    echo -e "${GREEN}The API configuration has been successfully fixed!${NC}"
    echo -e "You should now be able to access the application and log in."
else
    echo -e "${RED}The API is still not working properly.${NC}"
    echo -e "Here are some additional things to try:"
    echo -e "1. Check if the backend server is running with: pm2 list"
    echo -e "2. Check the backend server logs with: pm2 logs boxwise"
    echo -e "3. Make sure the environment variables are set correctly in server/.env"
    echo -e "4. Try restarting the backend server with: pm2 restart boxwise"
    echo -e "5. Check if there are any other issues in the Nginx error logs:"
    echo -e "   tail -n 100 /var/log/nginx/error.log"
fi

echo -e "${GREEN}${BOLD}Fix Nginx API Path Script completed!${NC}"

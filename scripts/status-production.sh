#!/bin/bash

# Boxwise Production Status Script
# This script checks the status of all Boxwise services in production mode

# Get the script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
cd "$SCRIPT_DIR"

echo "=== Boxwise Production Status ==="

# Check MongoDB status
echo "Checking MongoDB status..."
if command -v systemctl &> /dev/null; then
    systemctl status mongod | head -n 3
elif pgrep -x "mongod" > /dev/null; then
    echo "MongoDB is running (PID: $(pgrep -x "mongod"))"
else
    echo "MongoDB is not running"
fi
echo ""

# Check Nginx status
echo "Checking Nginx status..."
if command -v nginx &> /dev/null; then
    if command -v systemctl &> /dev/null; then
        systemctl status nginx | head -n 3
    elif pgrep -x "nginx" > /dev/null; then
        echo "Nginx is running (PID: $(pgrep -x "nginx" | head -n 1))"
    else
        echo "Nginx is not running"
    fi
    
    # Check if a site configuration exists for Boxwise
    NGINX_CONF_EXISTS=false
    NGINX_CONF_FILE=""
    for conf in /etc/nginx/sites-enabled/*; do
        if grep -q "boxwise" "$conf" 2>/dev/null; then
            NGINX_CONF_EXISTS=true
            NGINX_CONF_FILE="$conf"
            break
        fi
    done
    
    if [ "$NGINX_CONF_EXISTS" = true ]; then
        echo "Nginx configuration for Boxwise found at: $NGINX_CONF_FILE"
        
        # Find the domain name from Nginx configuration
        DOMAIN=$(grep -E "^\s*server_name" "$NGINX_CONF_FILE" | head -n 1 | sed -E 's/^\s*server_name\s+([^;]+);.*/\1/' | awk '{print $1}')
        if [ -n "$DOMAIN" ]; then
            echo "Domain: $DOMAIN"
        fi
        
        # Check if SSL is configured
        if grep -q "ssl_certificate" "$NGINX_CONF_FILE" 2>/dev/null; then
            echo "SSL is configured"
        else
            echo "SSL is not configured"
        fi
    else
        echo "No Nginx configuration found for Boxwise"
    fi
else
    echo "Nginx is not installed"
fi
echo ""

# Check if frontend is running with serve
echo "Checking frontend status..."
if [ -f "$SCRIPT_DIR/client-serve.pid" ]; then
    PID=$(cat "$SCRIPT_DIR/client-serve.pid")
    if ps -p $PID > /dev/null; then
        echo "Frontend server is running with 'serve' (PID: $PID)"
        echo "URL: http://localhost:3000"
    else
        echo "Frontend server PID file exists but process is not running"
    fi
else
    if [ "$NGINX_CONF_EXISTS" = true ]; then
        echo "Frontend is being served by Nginx"
        if [ -n "$DOMAIN" ]; then
            if grep -q "ssl_certificate" "$NGINX_CONF_FILE" 2>/dev/null; then
                echo "URL: https://$DOMAIN"
            else
                echo "URL: http://$DOMAIN"
            fi
        fi
    else
        echo "Frontend server is not running"
    fi
fi
echo ""

# Check backend status
echo "Checking backend status..."
if command -v pm2 &> /dev/null; then
    echo "PM2 status for Boxwise:"
    pm2 list | grep -A 1 -B 1 "boxwise" || echo "No Boxwise process found in PM2"
elif [ -f "$SCRIPT_DIR/server.pid" ]; then
    PID=$(cat "$SCRIPT_DIR/server.pid")
    if ps -p $PID > /dev/null; then
        echo "Backend server is running directly (PID: $PID)"
        echo "URL: http://localhost:5001/api"
    else
        echo "Backend server PID file exists but process is not running"
    fi
else
    echo "Backend server is not running"
fi
echo ""

# Check client build status
echo "Checking client build status..."
if [ -d "$SCRIPT_DIR/client/build" ] && [ ! -z "$(ls -A "$SCRIPT_DIR/client/build")" ]; then
    echo "Client build exists"
    echo "Build directory: $SCRIPT_DIR/client/build"
    echo "Last modified: $(stat -c %y "$SCRIPT_DIR/client/build" 2>/dev/null || stat -f "%Sm" "$SCRIPT_DIR/client/build")"
else
    echo "Client build does not exist or is empty"
fi
echo ""

echo "=== Boxwise Production Status Complete ==="

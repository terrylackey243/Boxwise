#!/bin/bash

# Boxwise Server Status Check Script
# This script provides a simple, color-coded status check of all Boxwise services

# ANSI color codes
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Get the script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
cd "$SCRIPT_DIR"

echo -e "${BLUE}=== Boxwise Server Status Check ===${NC}"
echo ""

# Function to print status
print_status() {
    local service=$1
    local status=$2
    local details=$3
    
    if [ "$status" == "up" ]; then
        echo -e "${service}: ${GREEN}UP${NC} ${details}"
    elif [ "$status" == "warning" ]; then
        echo -e "${service}: ${YELLOW}WARNING${NC} ${details}"
    else
        echo -e "${service}: ${RED}DOWN${NC} ${details}"
    fi
}

# Check MongoDB status
echo -e "${BLUE}Checking MongoDB...${NC}"
if pgrep -x "mongod" > /dev/null || systemctl is-active --quiet mongod 2>/dev/null; then
    print_status "MongoDB" "up" "(PID: $(pgrep -x "mongod" 2>/dev/null || echo "managed by systemd"))"
else
    print_status "MongoDB" "down" "(not running)"
fi
echo ""

# Check Nginx status
echo -e "${BLUE}Checking Nginx...${NC}"
if pgrep -x "nginx" > /dev/null || systemctl is-active --quiet nginx 2>/dev/null; then
    # Check if a site configuration exists for Boxwise
    NGINX_CONF_EXISTS=false
    DOMAIN=""
    for conf in /etc/nginx/sites-enabled/*; do
        if grep -q "boxwise" "$conf" 2>/dev/null; then
            NGINX_CONF_EXISTS=true
            DOMAIN=$(grep -E "^\s*server_name" "$conf" 2>/dev/null | head -n 1 | sed -E 's/^\s*server_name\s+([^;]+);.*/\1/' | awk '{print $1}')
            break
        fi
    done
    
    if [ "$NGINX_CONF_EXISTS" = true ]; then
        if [ -n "$DOMAIN" ]; then
            print_status "Nginx" "up" "(serving Boxwise at $DOMAIN)"
        else
            print_status "Nginx" "up" "(serving Boxwise)"
        fi
    else
        print_status "Nginx" "warning" "(running but no Boxwise configuration found)"
    fi
else
    print_status "Nginx" "down" "(not running)"
fi
echo ""

# Check frontend status
echo -e "${BLUE}Checking Frontend...${NC}"
if [ "$NGINX_CONF_EXISTS" = true ]; then
    if [ -n "$DOMAIN" ]; then
        print_status "Frontend" "up" "(served by Nginx at $DOMAIN)"
    else
        print_status "Frontend" "up" "(served by Nginx)"
    fi
elif [ -f "$SCRIPT_DIR/client-serve.pid" ]; then
    PID=$(cat "$SCRIPT_DIR/client-serve.pid")
    if ps -p $PID > /dev/null; then
        print_status "Frontend" "up" "(running with 'serve' on port 3000, PID: $PID)"
    else
        print_status "Frontend" "down" "(process not running, PID file exists)"
    fi
else
    print_status "Frontend" "down" "(not running)"
fi
echo ""

# Check backend status
echo -e "${BLUE}Checking Backend...${NC}"
if command -v pm2 &> /dev/null && pm2 list | grep -q "boxwise"; then
    STATUS=$(pm2 list | grep "boxwise" | awk '{print $10}')
    if [ "$STATUS" == "online" ] || [ "$STATUS" == "cluster" ]; then
        CPU=$(pm2 list | grep "boxwise" | awk '{print $11}')
        MEM=$(pm2 list | grep "boxwise" | awk '{print $12}')
        RESTARTS=$(pm2 list | grep "boxwise" | awk '{print $9}')
        print_status "Backend" "up" "(managed by PM2, Status: $STATUS, CPU: $CPU, Memory: $MEM, Restarts: $RESTARTS)"
    else
        print_status "Backend" "warning" "(managed by PM2 but status is $STATUS)"
    fi
elif [ -f "$SCRIPT_DIR/server.pid" ]; then
    PID=$(cat "$SCRIPT_DIR/server.pid")
    if ps -p $PID > /dev/null; then
        print_status "Backend" "up" "(running directly, PID: $PID)"
    else
        print_status "Backend" "down" "(process not running, PID file exists)"
    fi
else
    print_status "Backend" "down" "(not running)"
fi
echo ""

# Check client build status
echo -e "${BLUE}Checking Client Build...${NC}"
if [ -d "$SCRIPT_DIR/client/build" ] && [ ! -z "$(ls -A "$SCRIPT_DIR/client/build")" ]; then
    LAST_MODIFIED=$(stat -c %y "$SCRIPT_DIR/client/build" 2>/dev/null || stat -f "%Sm" "$SCRIPT_DIR/client/build")
    print_status "Client Build" "up" "(last modified: $LAST_MODIFIED)"
else
    print_status "Client Build" "down" "(not found or empty)"
fi
echo ""

# Summary
echo -e "${BLUE}=== Summary ===${NC}"
MONGODB_STATUS=$(pgrep -x "mongod" > /dev/null || systemctl is-active --quiet mongod 2>/dev/null && echo "up" || echo "down")
NGINX_STATUS=$(pgrep -x "nginx" > /dev/null || systemctl is-active --quiet nginx 2>/dev/null && echo "up" || echo "down")
FRONTEND_STATUS="down"
if [ "$NGINX_CONF_EXISTS" = true ]; then
    FRONTEND_STATUS="up"
elif [ -f "$SCRIPT_DIR/client-serve.pid" ]; then
    PID=$(cat "$SCRIPT_DIR/client-serve.pid")
    if ps -p $PID > /dev/null; then
        FRONTEND_STATUS="up"
    fi
fi
BACKEND_STATUS="down"
if command -v pm2 &> /dev/null && pm2 list | grep -q "boxwise"; then
    STATUS=$(pm2 list | grep "boxwise" | awk '{print $10}')
    if [ "$STATUS" == "online" ] || [ "$STATUS" == "cluster" ]; then
        BACKEND_STATUS="up"
    else
        BACKEND_STATUS="warning"
    fi
elif [ -f "$SCRIPT_DIR/server.pid" ]; then
    PID=$(cat "$SCRIPT_DIR/server.pid")
    if ps -p $PID > /dev/null; then
        BACKEND_STATUS="up"
    fi
fi
BUILD_STATUS=$([ -d "$SCRIPT_DIR/client/build" ] && [ ! -z "$(ls -A "$SCRIPT_DIR/client/build")" ] && echo "up" || echo "down")

# Print overall status
if [ "$MONGODB_STATUS" == "up" ] && [ "$BACKEND_STATUS" == "up" ] && ([ "$NGINX_STATUS" == "up" ] || [ "$FRONTEND_STATUS" == "up" ]); then
    echo -e "${GREEN}All essential services are running!${NC}"
elif [ "$BACKEND_STATUS" == "warning" ] && ([ "$NGINX_STATUS" == "up" ] || [ "$FRONTEND_STATUS" == "up" ]); then
    echo -e "${YELLOW}Core services are running, but the backend may have issues (status: $STATUS).${NC}"
elif [ "$BACKEND_STATUS" == "down" ] && ([ "$NGINX_STATUS" == "up" ] || [ "$FRONTEND_STATUS" == "up" ]); then
    echo -e "${RED}Critical service down: Backend is not running!${NC}"
elif [ "$MONGODB_STATUS" == "down" ]; then
    echo -e "${RED}Critical service down: MongoDB is not running!${NC}"
elif [ "$NGINX_STATUS" == "down" ] && [ "$FRONTEND_STATUS" == "down" ]; then
    echo -e "${RED}Critical service down: Frontend is not accessible!${NC}"
else
    echo -e "${RED}Multiple critical services are down!${NC}"
fi

echo ""
echo -e "${BLUE}For more detailed information, run:${NC}"
echo "./status-production.sh"
echo ""

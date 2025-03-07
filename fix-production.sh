#!/bin/bash

# Boxwise Fix Production Script
# This script diagnoses and fixes common production issues

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

echo -e "${BLUE}${BOLD}=== Boxwise Production Fix Script ===${NC}"
echo -e "${BLUE}Current directory: ${SCRIPT_DIR}${NC}"
echo ""

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    echo -e "${YELLOW}Warning: This script may need root privileges for some operations.${NC}"
    echo -e "Consider running with sudo if you encounter permission issues."
    echo ""
fi

# Function to check if a service is running
check_service() {
    local service=$1
    if systemctl is-active --quiet $service; then
        echo -e "${GREEN}$service is running${NC}"
        return 0
    else
        echo -e "${RED}$service is not running${NC}"
        return 1
    fi
}

# Function to restart a service
restart_service() {
    local service=$1
    echo -e "${BLUE}Restarting $service...${NC}"
    systemctl restart $service
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}$service restarted successfully${NC}"
        return 0
    else
        echo -e "${RED}Failed to restart $service${NC}"
        return 1
    fi
}

# Check MongoDB status
echo -e "${BLUE}${BOLD}Checking MongoDB status...${NC}"
if check_service mongod; then
    echo -e "MongoDB is running properly."
else
    echo -e "${YELLOW}Attempting to start MongoDB...${NC}"
    systemctl start mongod
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}MongoDB started successfully${NC}"
    else
        echo -e "${RED}Failed to start MongoDB${NC}"
        echo -e "This could be due to:"
        echo -e "1. MongoDB is not installed"
        echo -e "2. MongoDB service is not configured properly"
        echo -e "3. MongoDB data directory has permission issues"
        echo ""
        echo -e "${YELLOW}Would you like to install MongoDB? (y/n)${NC}"
        read -r answer
        if [[ "$answer" =~ ^[Yy]$ ]]; then
            echo -e "${BLUE}Installing MongoDB...${NC}"
            apt-get update
            apt-get install -y mongodb
            systemctl enable mongodb
            systemctl start mongodb
            if [ $? -eq 0 ]; then
                echo -e "${GREEN}MongoDB installed and started successfully${NC}"
            else
                echo -e "${RED}Failed to install or start MongoDB${NC}"
                echo -e "Please install MongoDB manually and then run this script again."
                exit 1
            fi
        else
            echo -e "${YELLOW}Skipping MongoDB installation${NC}"
            echo -e "Please install and start MongoDB manually, then run this script again."
            exit 1
        fi
    fi
fi
echo ""

# Check Nginx status
echo -e "${BLUE}${BOLD}Checking Nginx status...${NC}"
if check_service nginx; then
    echo -e "Nginx is running properly."
else
    echo -e "${YELLOW}Attempting to start Nginx...${NC}"
    systemctl start nginx
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}Nginx started successfully${NC}"
    else
        echo -e "${RED}Failed to start Nginx${NC}"
        echo -e "This could be due to:"
        echo -e "1. Nginx is not installed"
        echo -e "2. Nginx configuration has errors"
        echo -e "3. Nginx is trying to use ports that are already in use"
        echo ""
        echo -e "${YELLOW}Would you like to check Nginx configuration? (y/n)${NC}"
        read -r answer
        if [[ "$answer" =~ ^[Yy]$ ]]; then
            echo -e "${BLUE}Checking Nginx configuration...${NC}"
            nginx -t
        fi
    fi
fi
echo ""

# Check PM2 status
echo -e "${BLUE}${BOLD}Checking PM2 status...${NC}"
if command -v pm2 &> /dev/null; then
    echo -e "${GREEN}PM2 is installed${NC}"
    PM2_STATUS=$(pm2 list 2>/dev/null)
    if echo "$PM2_STATUS" | grep -q "boxwise"; then
        echo -e "${GREEN}Boxwise application is running in PM2${NC}"
        echo -e "PM2 status for Boxwise:"
        pm2 list | grep -A 1 -B 1 "boxwise"
    else
        echo -e "${RED}Boxwise application is not running in PM2${NC}"
        echo -e "${YELLOW}Would you like to start the Boxwise application with PM2? (y/n)${NC}"
        read -r answer
        if [[ "$answer" =~ ^[Yy]$ ]]; then
            echo -e "${BLUE}Starting Boxwise with PM2...${NC}"
            if [ -f "$SCRIPT_DIR/ecosystem.config.js" ]; then
                pm2 start ecosystem.config.js
            else
                echo -e "${YELLOW}ecosystem.config.js not found, creating a basic one...${NC}"
                cat > "$SCRIPT_DIR/ecosystem.config.js" << EOF
module.exports = {
  apps: [{
    name: 'boxwise',
    script: './server/src/index.js',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 5001,
      MONGO_URI: 'mongodb://localhost:27017/boxwise',
      JWT_SECRET: 'boxwise_jwt_secret_$(openssl rand -hex 12)'
    },
    watch: false,
    max_memory_restart: '500M'
  }]
};
EOF
                pm2 start ecosystem.config.js
            fi
            if [ $? -eq 0 ]; then
                echo -e "${GREEN}Boxwise started with PM2 successfully${NC}"
                pm2 save
            else
                echo -e "${RED}Failed to start Boxwise with PM2${NC}"
            fi
        fi
    fi
else
    echo -e "${RED}PM2 is not installed${NC}"
    echo -e "${YELLOW}Would you like to install PM2? (y/n)${NC}"
    read -r answer
    if [[ "$answer" =~ ^[Yy]$ ]]; then
        echo -e "${BLUE}Installing PM2...${NC}"
        npm install -g pm2
        if [ $? -eq 0 ]; then
            echo -e "${GREEN}PM2 installed successfully${NC}"
        else
            echo -e "${RED}Failed to install PM2${NC}"
            echo -e "Please install PM2 manually with: npm install -g pm2"
        fi
    else
        echo -e "${YELLOW}Skipping PM2 installation${NC}"
    fi
fi
echo ""

# Fix MongoDB connection in environment file
echo -e "${BLUE}${BOLD}Checking server environment file...${NC}"
if [ -f "$SCRIPT_DIR/server/.env" ]; then
    echo -e "${GREEN}Server environment file found${NC}"
    
    # Check if MONGO_URI is set
    if grep -q "^MONGO_URI=" "$SCRIPT_DIR/server/.env"; then
        MONGO_URI=$(grep "^MONGO_URI=" "$SCRIPT_DIR/server/.env" | cut -d= -f2-)
        echo -e "${GREEN}MONGO_URI is set to: $MONGO_URI${NC}"
    else
        echo -e "${RED}MONGO_URI is not set in the environment file${NC}"
        echo -e "${YELLOW}Adding MONGO_URI to the environment file...${NC}"
        echo "MONGO_URI=mongodb://localhost:27017/boxwise" >> "$SCRIPT_DIR/server/.env"
        echo -e "${GREEN}Added MONGO_URI=mongodb://localhost:27017/boxwise to the environment file${NC}"
    fi
    
    # Check if JWT_SECRET is set
    if grep -q "^JWT_SECRET=" "$SCRIPT_DIR/server/.env"; then
        echo -e "${GREEN}JWT_SECRET is set${NC}"
    else
        echo -e "${RED}JWT_SECRET is not set in the environment file${NC}"
        echo -e "${YELLOW}Adding JWT_SECRET to the environment file...${NC}"
        JWT_SECRET="boxwise_jwt_secret_$(openssl rand -hex 12)"
        echo "JWT_SECRET=$JWT_SECRET" >> "$SCRIPT_DIR/server/.env"
        echo -e "${GREEN}Added JWT_SECRET to the environment file${NC}"
    fi
    
    # Check if NODE_ENV is set to production
    if grep -q "^NODE_ENV=production" "$SCRIPT_DIR/server/.env"; then
        echo -e "${GREEN}NODE_ENV is set to production${NC}"
    else
        echo -e "${RED}NODE_ENV is not set to production in the environment file${NC}"
        if grep -q "^NODE_ENV=" "$SCRIPT_DIR/server/.env"; then
            echo -e "${YELLOW}Updating NODE_ENV to production...${NC}"
            sed -i "s/^NODE_ENV=.*/NODE_ENV=production/" "$SCRIPT_DIR/server/.env"
        else
            echo -e "${YELLOW}Adding NODE_ENV=production to the environment file...${NC}"
            echo "NODE_ENV=production" >> "$SCRIPT_DIR/server/.env"
        fi
        echo -e "${GREEN}Set NODE_ENV to production in the environment file${NC}"
    fi
    
    # Check if PORT is set
    if grep -q "^PORT=" "$SCRIPT_DIR/server/.env"; then
        PORT=$(grep "^PORT=" "$SCRIPT_DIR/server/.env" | cut -d= -f2-)
        echo -e "${GREEN}PORT is set to: $PORT${NC}"
    else
        echo -e "${RED}PORT is not set in the environment file${NC}"
        echo -e "${YELLOW}Adding PORT=5001 to the environment file...${NC}"
        echo "PORT=5001" >> "$SCRIPT_DIR/server/.env"
        echo -e "${GREEN}Added PORT=5001 to the environment file${NC}"
    fi
else
    echo -e "${RED}Server environment file not found${NC}"
    echo -e "${YELLOW}Creating a new environment file...${NC}"
    
    # Create a new environment file
    cat > "$SCRIPT_DIR/server/.env" << EOF
NODE_ENV=production
PORT=5001
MONGO_URI=mongodb://localhost:27017/boxwise
JWT_SECRET=boxwise_jwt_secret_$(openssl rand -hex 12)
EOF
    echo -e "${GREEN}Created new server environment file with default values${NC}"
fi

# Update ecosystem.config.js if it exists
if [ -f "$SCRIPT_DIR/ecosystem.config.js" ]; then
    echo -e "${BLUE}${BOLD}Updating PM2 ecosystem.config.js...${NC}"
    
    # Check if MONGO_URI is set in ecosystem.config.js
    if grep -q "MONGO_URI" "$SCRIPT_DIR/ecosystem.config.js"; then
        echo -e "${GREEN}MONGO_URI is already set in ecosystem.config.js${NC}"
    else
        echo -e "${YELLOW}Adding MONGO_URI to ecosystem.config.js...${NC}"
        sed -i "/env: {/a \ \ \ \ \ \ MONGO_URI: 'mongodb://localhost:27017/boxwise'," "$SCRIPT_DIR/ecosystem.config.js"
        echo -e "${GREEN}Added MONGO_URI to ecosystem.config.js${NC}"
    fi
    
    # Check if JWT_SECRET is set in ecosystem.config.js
    if grep -q "JWT_SECRET" "$SCRIPT_DIR/ecosystem.config.js"; then
        echo -e "${GREEN}JWT_SECRET is already set in ecosystem.config.js${NC}"
    else
        echo -e "${YELLOW}Adding JWT_SECRET to ecosystem.config.js...${NC}"
        JWT_SECRET="boxwise_jwt_secret_$(openssl rand -hex 12)"
        sed -i "/env: {/a \ \ \ \ \ \ JWT_SECRET: '$JWT_SECRET'," "$SCRIPT_DIR/ecosystem.config.js"
        echo -e "${GREEN}Added JWT_SECRET to ecosystem.config.js${NC}"
    fi
fi
echo ""

# Restart the application
echo -e "${BLUE}${BOLD}Restarting the application...${NC}"
if command -v pm2 &> /dev/null && pm2 list | grep -q "boxwise"; then
    echo -e "${YELLOW}Restarting Boxwise with PM2...${NC}"
    pm2 restart boxwise
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}Boxwise restarted successfully with PM2${NC}"
        pm2 save
    else
        echo -e "${RED}Failed to restart Boxwise with PM2${NC}"
    fi
elif [ -f "$SCRIPT_DIR/restart-production.sh" ]; then
    echo -e "${YELLOW}Running restart-production.sh script...${NC}"
    bash "$SCRIPT_DIR/restart-production.sh"
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}Application restarted successfully${NC}"
    else
        echo -e "${RED}Failed to restart the application${NC}"
    fi
else
    echo -e "${RED}Could not find a way to restart the application${NC}"
    echo -e "${YELLOW}Please restart the application manually${NC}"
fi
echo ""

# Test the API
echo -e "${BLUE}${BOLD}Testing the API...${NC}"
if command -v curl &> /dev/null; then
    echo -e "${YELLOW}Testing connection to backend server...${NC}"
    CURL_RESULT=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:5001/api/health 2>/dev/null || echo "Failed")
    
    if [ "$CURL_RESULT" = "200" ]; then
        echo -e "${GREEN}Backend API is responding on http://localhost:5001/api/health${NC}"
    elif [ "$CURL_RESULT" = "Failed" ]; then
        echo -e "${RED}Could not connect to backend API on http://localhost:5001/api/health${NC}"
        echo -e "The backend server might not be running or might be listening on a different port"
    else
        echo -e "${YELLOW}Backend API responded with status code: $CURL_RESULT${NC}"
    fi
else
    echo -e "${YELLOW}curl command not available, skipping API test${NC}"
fi
echo ""

# Check Nginx configuration for API
echo -e "${BLUE}${BOLD}Checking Nginx configuration for API...${NC}"
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
else
    # Check API configuration in Nginx
    API_CONFIG=$(grep -A 10 "location /api" "$NGINX_CONF_FILE" 2>/dev/null)
    
    if [ -z "$API_CONFIG" ]; then
        echo -e "${RED}No API configuration found in Nginx config${NC}"
    else
        echo -e "${GREEN}API configuration found:${NC}"
        echo -e "$API_CONFIG" | grep -v "#" | sed 's/^/  /'
        
        # Check for double API path
        PROXY_PASS=$(echo "$API_CONFIG" | grep "proxy_pass" | grep -v "#")
        if echo "$PROXY_PASS" | grep -q "api.*api"; then
            echo -e "${RED}WARNING: Double API path detected in proxy_pass directive${NC}"
            echo -e "Current configuration: $PROXY_PASS"
            echo -e "${YELLOW}Would you like to fix this issue? (y/n)${NC}"
            read -r answer
            if [[ "$answer" =~ ^[Yy]$ ]]; then
                echo -e "${BLUE}Fixing Nginx configuration...${NC}"
                # Create a backup of the original file
                cp "$NGINX_CONF_FILE" "$NGINX_CONF_FILE.bak"
                echo -e "${GREEN}Created backup of Nginx configuration at: $NGINX_CONF_FILE.bak${NC}"
                
                # Fix the proxy_pass directive
                sed -i 's|proxy_pass http://localhost:[0-9]\+/api;|proxy_pass http://localhost:5001;|g' "$NGINX_CONF_FILE"
                
                # Test the new configuration
                nginx -t
                if [ $? -eq 0 ]; then
                    echo -e "${GREEN}Nginx configuration is valid${NC}"
                    echo -e "${YELLOW}Reloading Nginx...${NC}"
                    systemctl reload nginx
                    if [ $? -eq 0 ]; then
                        echo -e "${GREEN}Nginx reloaded successfully${NC}"
                    else
                        echo -e "${RED}Failed to reload Nginx${NC}"
                    fi
                else
                    echo -e "${RED}Nginx configuration is invalid${NC}"
                    echo -e "${YELLOW}Restoring backup...${NC}"
                    cp "$NGINX_CONF_FILE.bak" "$NGINX_CONF_FILE"
                    echo -e "${GREEN}Backup restored${NC}"
                fi
            fi
        fi
    fi
fi
echo ""

# Summary
echo -e "${BLUE}${BOLD}=== Summary ===${NC}"
echo -e "1. MongoDB: $(check_service mongod && echo "${GREEN}Running${NC}" || echo "${RED}Not running${NC}")"
echo -e "2. Nginx: $(check_service nginx && echo "${GREEN}Running${NC}" || echo "${RED}Not running${NC}")"
echo -e "3. Backend server: $(command -v pm2 &> /dev/null && pm2 list | grep -q "boxwise" && echo "${GREEN}Running with PM2${NC}" || echo "${RED}Not running with PM2${NC}")"
echo -e "4. Environment variables: $([ -f "$SCRIPT_DIR/server/.env" ] && grep -q "^MONGO_URI=" "$SCRIPT_DIR/server/.env" && echo "${GREEN}MONGO_URI is set${NC}" || echo "${RED}MONGO_URI is not set${NC}")"
echo -e "5. API test: $([ "$CURL_RESULT" = "200" ] && echo "${GREEN}Successful${NC}" || echo "${RED}Failed${NC}")"
echo ""

echo -e "${BLUE}${BOLD}Next steps:${NC}"
echo -e "1. If all checks are green, try accessing the application again"
echo -e "2. If you're still experiencing issues, check the logs:"
echo -e "   - PM2 logs: pm2 logs boxwise"
echo -e "   - Nginx error logs: tail -n 100 /var/log/nginx/error.log"
echo -e "   - MongoDB logs: tail -n 100 /var/log/mongodb/mongod.log"
echo -e "3. You can also run the following scripts for more detailed diagnostics:"
echo -e "   - ./check-api.sh"
echo -e "   - ./check-servers.sh"
echo -e "   - ./check-ssl.sh"
echo ""

echo -e "${GREEN}${BOLD}Fix script completed!${NC}"

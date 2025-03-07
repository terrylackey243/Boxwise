#!/bin/bash

# Boxwise Fix Critical Issues Script
# This script aggressively fixes critical issues that other scripts couldn't resolve

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

echo -e "${BLUE}${BOLD}=== Boxwise Fix Critical Issues ===${NC}"
echo -e "${BLUE}Current directory: ${SCRIPT_DIR}${NC}"
echo ""

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    echo -e "${YELLOW}Warning: This script may need root privileges for some operations.${NC}"
    echo -e "Consider running with sudo if you encounter permission issues."
    echo ""
fi

# Display help
function show_help {
    echo "Boxwise Fix Critical Issues Script"
    echo "Usage: $0 [options]"
    echo ""
    echo "Options:"
    echo "  -f, --force               Force aggressive fixes without prompting"
    echo "  -h, --help                Show this help message"
    echo ""
    echo "Example:"
    echo "  $0 -f"
    exit 1
}

# Default values
FORCE=false

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case "$1" in
        -f|--force)
            FORCE=true
            shift
            ;;
        -h|--help)
            show_help
            ;;
        *)
            echo "Unknown option: $1"
            show_help
            ;;
    esac
done

# Function to ask for confirmation
confirm() {
    local message=$1
    if [ "$FORCE" = true ]; then
        return 0
    fi
    echo -e "${YELLOW}$message (y/n)${NC}"
    read -r answer
    if [[ "$answer" =~ ^[Yy]$ ]]; then
        return 0
    else
        return 1
    fi
}

# Function to check if a port is in use
check_port() {
    local port=$1
    if command -v netstat &> /dev/null; then
        netstat -tuln | grep -q ":$port "
        return $?
    elif command -v ss &> /dev/null; then
        ss -tuln | grep -q ":$port "
        return $?
    elif command -v lsof &> /dev/null; then
        lsof -i ":$port" &> /dev/null
        return $?
    else
        echo -e "${YELLOW}Warning: Cannot check if port $port is in use (netstat, ss, and lsof not found)${NC}"
        return 1
    fi
}

# Function to test connection between two ports
test_connection() {
    local from_port=$1
    local to_port=$2
    
    if command -v nc &> /dev/null; then
        echo -e "${BLUE}Testing connection from port $from_port to port $to_port...${NC}"
        nc -z localhost $to_port
        if [ $? -eq 0 ]; then
            echo -e "${GREEN}Connection successful${NC}"
            return 0
        else
            echo -e "${RED}Connection failed${NC}"
            return 1
        fi
    else
        echo -e "${YELLOW}nc command not available, skipping connection test${NC}"
        return 0
    fi
}

# Step 1: Verify backend server is running
echo -e "${BLUE}${BOLD}Step 1: Verifying backend server is running...${NC}"
BACKEND_RUNNING=false
if check_port 5001; then
    echo -e "${GREEN}Backend server is running on port 5001${NC}"
    BACKEND_RUNNING=true
else
    echo -e "${RED}Backend server is not running on port 5001${NC}"
    BACKEND_RUNNING=false
    
    # Check if PM2 is installed
    if command -v pm2 &> /dev/null; then
        echo -e "${GREEN}PM2 is installed${NC}"
        
        # Check if the application is running with PM2
        if pm2 list | grep -q "boxwise"; then
            echo -e "${GREEN}Boxwise application is running in PM2${NC}"
            echo -e "PM2 status for Boxwise:"
            pm2 list | grep -A 1 -B 1 "boxwise"
            
            # Check if the application is listening on port 5001
            echo -e "${YELLOW}PM2 shows Boxwise is running, but it's not listening on port 5001${NC}"
            echo -e "Checking PM2 logs for errors..."
            pm2 logs boxwise --lines 20 --nostream
            
            # Restart the application
            if confirm "Would you like to restart the Boxwise application in PM2?"; then
                echo -e "${BLUE}Restarting Boxwise application...${NC}"
                pm2 restart boxwise
                if [ $? -eq 0 ]; then
                    echo -e "${GREEN}Boxwise application restarted successfully${NC}"
                    sleep 5
                    if check_port 5001; then
                        echo -e "${GREEN}Backend server is now running on port 5001${NC}"
                        BACKEND_RUNNING=true
                    else
                        echo -e "${RED}Backend server is still not running on port 5001${NC}"
                    fi
                else
                    echo -e "${RED}Failed to restart Boxwise application${NC}"
                fi
            fi
        else
            echo -e "${RED}Boxwise application is not running in PM2${NC}"
            
            # Start the application
            if confirm "Would you like to start the Boxwise application in PM2?"; then
                echo -e "${BLUE}Starting Boxwise application...${NC}"
                
                # Get environment variables from .env file
                if [ -f "$SCRIPT_DIR/server/.env" ]; then
                    MONGO_URI=$(grep "^MONGO_URI=" "$SCRIPT_DIR/server/.env" | cut -d= -f2-)
                    JWT_SECRET=$(grep "^JWT_SECRET=" "$SCRIPT_DIR/server/.env" | cut -d= -f2-)
                    PORT=$(grep "^PORT=" "$SCRIPT_DIR/server/.env" | cut -d= -f2-)
                    
                    if [ -z "$MONGO_URI" ]; then
                        MONGO_URI="mongodb://localhost:27017/boxwise"
                        echo -e "${YELLOW}MONGO_URI not found in .env, using default: $MONGO_URI${NC}"
                    fi
                    
                    if [ -z "$JWT_SECRET" ]; then
                        JWT_SECRET="boxwise_jwt_secret_$(openssl rand -hex 12)"
                        echo -e "${YELLOW}JWT_SECRET not found in .env, generating a new one${NC}"
                    fi
                    
                    if [ -z "$PORT" ]; then
                        PORT=5001
                        echo -e "${YELLOW}PORT not found in .env, using default: $PORT${NC}"
                    fi
                else
                    echo -e "${RED}server/.env file not found${NC}"
                    MONGO_URI="mongodb://localhost:27017/boxwise"
                    JWT_SECRET="boxwise_jwt_secret_$(openssl rand -hex 12)"
                    PORT=5001
                    echo -e "${YELLOW}Using default environment variables${NC}"
                fi
                
                # Create ecosystem.config.js
                echo -e "${BLUE}Creating ecosystem.config.js...${NC}"
                cat > "$SCRIPT_DIR/ecosystem.config.js" << EOF
module.exports = {
  apps: [{
    name: 'boxwise',
    script: './server/src/index.js',
    instances: 1,
    exec_mode: 'fork',
    env: {
      NODE_ENV: 'production',
      PORT: $PORT,
      MONGO_URI: '$MONGO_URI',
      JWT_SECRET: '$JWT_SECRET'
    },
    watch: false,
    max_memory_restart: '500M'
  }]
};
EOF
                
                # Start the application
                pm2 start ecosystem.config.js
                if [ $? -eq 0 ]; then
                    echo -e "${GREEN}Boxwise application started successfully${NC}"
                    pm2 save
                    sleep 5
                    if check_port 5001; then
                        echo -e "${GREEN}Backend server is now running on port 5001${NC}"
                        BACKEND_RUNNING=true
                    else
                        echo -e "${RED}Backend server is still not running on port 5001${NC}"
                    fi
                else
                    echo -e "${RED}Failed to start Boxwise application${NC}"
                fi
            fi
        fi
    else
        echo -e "${RED}PM2 is not installed${NC}"
        
        # Install PM2
        if confirm "Would you like to install PM2?"; then
            echo -e "${BLUE}Installing PM2...${NC}"
            npm install -g pm2
            if [ $? -eq 0 ]; then
                echo -e "${GREEN}PM2 installed successfully${NC}"
                
                # Start the application
                if confirm "Would you like to start the Boxwise application in PM2?"; then
                    echo -e "${BLUE}Starting Boxwise application...${NC}"
                    
                    # Get environment variables from .env file
                    if [ -f "$SCRIPT_DIR/server/.env" ]; then
                        MONGO_URI=$(grep "^MONGO_URI=" "$SCRIPT_DIR/server/.env" | cut -d= -f2-)
                        JWT_SECRET=$(grep "^JWT_SECRET=" "$SCRIPT_DIR/server/.env" | cut -d= -f2-)
                        PORT=$(grep "^PORT=" "$SCRIPT_DIR/server/.env" | cut -d= -f2-)
                        
                        if [ -z "$MONGO_URI" ]; then
                            MONGO_URI="mongodb://localhost:27017/boxwise"
                            echo -e "${YELLOW}MONGO_URI not found in .env, using default: $MONGO_URI${NC}"
                        fi
                        
                        if [ -z "$JWT_SECRET" ]; then
                            JWT_SECRET="boxwise_jwt_secret_$(openssl rand -hex 12)"
                            echo -e "${YELLOW}JWT_SECRET not found in .env, generating a new one${NC}"
                        fi
                        
                        if [ -z "$PORT" ]; then
                            PORT=5001
                            echo -e "${YELLOW}PORT not found in .env, using default: $PORT${NC}"
                        fi
                    else
                        echo -e "${RED}server/.env file not found${NC}"
                        MONGO_URI="mongodb://localhost:27017/boxwise"
                        JWT_SECRET="boxwise_jwt_secret_$(openssl rand -hex 12)"
                        PORT=5001
                        echo -e "${YELLOW}Using default environment variables${NC}"
                    fi
                    
                    # Create ecosystem.config.js
                    echo -e "${BLUE}Creating ecosystem.config.js...${NC}"
                    cat > "$SCRIPT_DIR/ecosystem.config.js" << EOF
module.exports = {
  apps: [{
    name: 'boxwise',
    script: './server/src/index.js',
    instances: 1,
    exec_mode: 'fork',
    env: {
      NODE_ENV: 'production',
      PORT: $PORT,
      MONGO_URI: '$MONGO_URI',
      JWT_SECRET: '$JWT_SECRET'
    },
    watch: false,
    max_memory_restart: '500M'
  }]
};
EOF
                    
                    # Start the application
                    pm2 start ecosystem.config.js
                    if [ $? -eq 0 ]; then
                        echo -e "${GREEN}Boxwise application started successfully${NC}"
                        pm2 save
                        sleep 5
                        if check_port 5001; then
                            echo -e "${GREEN}Backend server is now running on port 5001${NC}"
                            BACKEND_RUNNING=true
                        else
                            echo -e "${RED}Backend server is still not running on port 5001${NC}"
                        fi
                    else
                        echo -e "${RED}Failed to start Boxwise application${NC}"
                    fi
                fi
            else
                echo -e "${RED}Failed to install PM2${NC}"
            fi
        fi
    fi
fi
echo ""

# Step 2: Test backend API
echo -e "${BLUE}${BOLD}Step 2: Testing backend API...${NC}"
BACKEND_API_WORKING=false
if [ "$BACKEND_RUNNING" = true ]; then
    if command -v curl &> /dev/null; then
        echo -e "${YELLOW}Testing connection to backend server on port 5001...${NC}"
        CURL_RESULT=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:5001/api/health 2>/dev/null || echo "Failed")
        
        if [ "$CURL_RESULT" = "200" ]; then
            echo -e "${GREEN}Backend API is responding on http://localhost:5001/api/health${NC}"
            BACKEND_API_WORKING=true
        elif [ "$CURL_RESULT" = "Failed" ]; then
            echo -e "${RED}Could not connect to backend API on http://localhost:5001/api/health${NC}"
            BACKEND_API_WORKING=false
            
            # Check if the backend server is listening on the correct port
            echo -e "${YELLOW}Checking if the backend server is listening on port 5001...${NC}"
            if check_port 5001; then
                echo -e "${GREEN}Backend server is listening on port 5001${NC}"
                
                # Check if the backend server is responding to requests
                echo -e "${YELLOW}Checking if the backend server is responding to requests...${NC}"
                CURL_RESULT=$(curl -s -v http://localhost:5001/api/health 2>&1 || echo "Failed")
                echo -e "${YELLOW}Curl verbose output:${NC}"
                echo "$CURL_RESULT"
                
                # Check if the backend server is running with PM2
                if command -v pm2 &> /dev/null; then
                    echo -e "${YELLOW}Checking PM2 logs for errors...${NC}"
                    pm2 logs boxwise --lines 20 --nostream
                fi
            else
                echo -e "${RED}Backend server is not listening on port 5001${NC}"
            fi
        else
            echo -e "${YELLOW}Backend API responded with status code: $CURL_RESULT${NC}"
            BACKEND_API_WORKING=false
        fi
    else
        echo -e "${YELLOW}curl command not available, skipping API test${NC}"
    fi
else
    echo -e "${RED}Backend server is not running, skipping API test${NC}"
fi
echo ""

# Step 3: Fix PM2 environment variables
echo -e "${BLUE}${BOLD}Step 3: Fixing PM2 environment variables...${NC}"
PM2_ENV_VARS_FIXED=false
if command -v pm2 &> /dev/null; then
    if pm2 list | grep -q "boxwise"; then
        echo -e "${GREEN}Boxwise application is running in PM2${NC}"
        
        # Check PM2 environment variables
        PM2_ENV=$(pm2 env boxwise 2>/dev/null)
        if echo "$PM2_ENV" | grep -q "MONGO_URI"; then
            echo -e "${GREEN}MONGO_URI is set in PM2 environment${NC}"
            PM2_ENV_VARS_FIXED=true
        else
            echo -e "${RED}MONGO_URI is not set in PM2 environment${NC}"
            
            # Get environment variables from .env file
            if [ -f "$SCRIPT_DIR/server/.env" ]; then
                MONGO_URI=$(grep "^MONGO_URI=" "$SCRIPT_DIR/server/.env" | cut -d= -f2-)
                JWT_SECRET=$(grep "^JWT_SECRET=" "$SCRIPT_DIR/server/.env" | cut -d= -f2-)
                PORT=$(grep "^PORT=" "$SCRIPT_DIR/server/.env" | cut -d= -f2-)
                
                if [ -z "$MONGO_URI" ]; then
                    MONGO_URI="mongodb://localhost:27017/boxwise"
                    echo -e "${YELLOW}MONGO_URI not found in .env, using default: $MONGO_URI${NC}"
                fi
                
                if [ -z "$JWT_SECRET" ]; then
                    JWT_SECRET="boxwise_jwt_secret_$(openssl rand -hex 12)"
                    echo -e "${YELLOW}JWT_SECRET not found in .env, generating a new one${NC}"
                fi
                
                if [ -z "$PORT" ]; then
                    PORT=5001
                    echo -e "${YELLOW}PORT not found in .env, using default: $PORT${NC}"
                fi
            else
                echo -e "${RED}server/.env file not found${NC}"
                MONGO_URI="mongodb://localhost:27017/boxwise"
                JWT_SECRET="boxwise_jwt_secret_$(openssl rand -hex 12)"
                PORT=5001
                echo -e "${YELLOW}Using default environment variables${NC}"
            fi
            
            # Recreate the application in PM2
            echo -e "${BLUE}Recreating the application in PM2 with explicit environment variables...${NC}"
            
            # Create ecosystem.config.js
            echo -e "${BLUE}Creating ecosystem.config.js...${NC}"
            cat > "$SCRIPT_DIR/ecosystem.config.js" << EOF
module.exports = {
  apps: [{
    name: 'boxwise',
    script: './server/src/index.js',
    instances: 1,
    exec_mode: 'fork',
    env: {
      NODE_ENV: 'production',
      PORT: $PORT,
      MONGO_URI: '$MONGO_URI',
      JWT_SECRET: '$JWT_SECRET'
    },
    watch: false,
    max_memory_restart: '500M'
  }]
};
EOF
            
            # Restart the application
            pm2 delete boxwise
            pm2 start ecosystem.config.js
            if [ $? -eq 0 ]; then
                echo -e "${GREEN}Boxwise application recreated successfully${NC}"
                pm2 save
                
                # Check PM2 environment variables again
                PM2_ENV=$(pm2 env boxwise 2>/dev/null)
                if echo "$PM2_ENV" | grep -q "MONGO_URI"; then
                    echo -e "${GREEN}MONGO_URI is now set in PM2 environment${NC}"
                    PM2_ENV_VARS_FIXED=true
                else
                    echo -e "${RED}MONGO_URI is still not set in PM2 environment${NC}"
                    
                    # Try setting environment variables directly
                    echo -e "${BLUE}Trying to set environment variables directly...${NC}"
                    pm2 set boxwise:MONGO_URI "$MONGO_URI"
                    pm2 set boxwise:JWT_SECRET "$JWT_SECRET"
                    pm2 set boxwise:PORT "$PORT"
                    pm2 set boxwise:NODE_ENV "production"
                    
                    # Restart the application
                    pm2 restart boxwise --update-env
                    if [ $? -eq 0 ]; then
                        echo -e "${GREEN}Boxwise application restarted with updated environment variables${NC}"
                        
                        # Check PM2 environment variables again
                        PM2_ENV=$(pm2 env boxwise 2>/dev/null)
                        if echo "$PM2_ENV" | grep -q "MONGO_URI"; then
                            echo -e "${GREEN}MONGO_URI is now set in PM2 environment${NC}"
                            PM2_ENV_VARS_FIXED=true
                        else
                            echo -e "${RED}MONGO_URI is still not set in PM2 environment${NC}"
                        fi
                    else
                        echo -e "${RED}Failed to restart Boxwise application${NC}"
                    fi
                fi
            else
                echo -e "${RED}Failed to recreate Boxwise application${NC}"
            fi
        fi
    else
        echo -e "${RED}Boxwise application is not running in PM2${NC}"
    fi
else
    echo -e "${RED}PM2 is not installed${NC}"
fi
echo ""

# Step 4: Fix Nginx configuration
echo -e "${BLUE}${BOLD}Step 4: Fixing Nginx configuration...${NC}"
NGINX_FIXED=false
if command -v nginx &> /dev/null; then
    if systemctl is-active --quiet nginx; then
        echo -e "${GREEN}Nginx is running${NC}"
        
        # Find Nginx configuration files
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
        else
            # Find all configuration files in sites-available and sites-enabled
            CONF_FILES=()
            while IFS= read -r -d '' file; do
                CONF_FILES+=("$file")
            done < <(find "$SITES_AVAILABLE_DIR" "$SITES_ENABLED_DIR" -type f -print0)
        fi
        
        # Look for server blocks in Nginx files
        SERVER_CONF_FILES=()
        for file in "${CONF_FILES[@]}"; do
            if grep -q "server {" "$file"; then
                SERVER_CONF_FILES+=("$file")
                echo -e "${GREEN}Found server block in $file${NC}"
            fi
        done
        
        if [ ${#SERVER_CONF_FILES[@]} -eq 0 ]; then
            echo -e "${RED}No server blocks found in Nginx files${NC}"
            
            # Create a new server block
            echo -e "${BLUE}Creating a new server block...${NC}"
            
            # Ask for the configuration file to create
            echo -e "${YELLOW}Please enter the path to create the Nginx configuration file:${NC}"
            read -r conf_file
            
            # Create the configuration file
            echo -e "${BLUE}Creating $conf_file...${NC}"
            cat > "$conf_file" << EOF
server {
    listen 80;
    server_name localhost;

    location / {
        root /var/www/html;
        index index.html index.htm;
        try_files \$uri \$uri/ /index.html;
    }

    location /api {
        proxy_pass http://localhost:5001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
EOF
            
            # Test the new configuration
            echo -e "${BLUE}Testing Nginx configuration...${NC}"
            nginx -t
            if [ $? -ne 0 ]; then
                echo -e "${RED}Nginx configuration test failed${NC}"
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
                NGINX_FIXED=true
            fi
        else
            # Fix each server block
            for file in "${SERVER_CONF_FILES[@]}"; do
                echo -e "${BLUE}Fixing server block in $file...${NC}"
                
                # Create a backup of the original file
                cp "$file" "$file.bak"
                echo -e "${GREEN}Created backup of Nginx configuration at: $file.bak${NC}"
                
                # Check if the file has an API location block
                if grep -q "location /api" "$file"; then
                    echo -e "${GREEN}Found API location block in $file${NC}"
                    
                    # Display the current API configuration
                    echo -e "${YELLOW}Current API configuration:${NC}"
                    grep -A 10 "location /api" "$file" | grep -v "#" | sed 's/^/  /'
                    
                    # Fix the proxy_pass directive
                    sed -i 's|proxy_pass http://localhost:[0-9]\+/api;|proxy_pass http://localhost:5001;|g' "$file"
                    sed -i 's|proxy_pass http://localhost:[0-9]\+/api/;|proxy_pass http://localhost:5001;|g' "$file"
                    sed -i 's|proxy_pass http://localhost:[0-9]\+;|proxy_pass http://localhost:5001;|g' "$file"
                    
                    # If no proxy_pass directive was found, add it
                    if ! grep -q "proxy_pass" "$file"; then
                        sed -i '/location \/api {/a \        proxy_pass http://localhost:5001;' "$file"
                    fi
                    
                    # Display the updated API configuration
                    echo -e "${YELLOW}Updated API configuration:${NC}"
                    grep -A 10 "location /api" "$file" | grep -v "#" | sed 's/^/  /'
                else
                    echo -e "${RED}No API location block found in $file${NC}"
                    
                    # Add an API location block
                    echo -e "${BLUE}Adding API location block to $file...${NC}"
                    sed -i '/server {/a \    location /api {\n        proxy_pass http://localhost:5001;\n        proxy_http_version 1.1;\n        proxy_set_header Upgrade $http_upgrade;\n        proxy_set_header Connection "upgrade";\n        proxy_set_header Host $host;\n        proxy_set_header X-Real-IP $remote_addr;\n        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;\n        proxy_set_header X-Forwarded-Proto $scheme;\n    }' "$file"
                    
                    # Display the added API configuration
                    echo -e "${YELLOW}Added API configuration:${NC}"
                    grep -A 10 "location /api" "$file" | grep -v "#" | sed 's/^/  /'
                fi
            done
            
            # Test the new configuration
            echo -e "${BLUE}Testing Nginx configuration...${NC}"
            nginx -t
            if [ $? -ne 0 ]; then
                echo -e "${RED}Nginx configuration test failed${NC}"
                echo -e "${YELLOW}Restoring backup...${NC}"
                for file in "${SERVER_CONF_FILES[@]}"; do
                    cp "$file.bak" "$file"
                done
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
                NGINX_FIXED=true
            fi
        fi
        
        # Test connection between Nginx and backend server
        echo -e "${BLUE}Testing connection between Nginx and backend server...${NC}"
        test_connection 80 5001
    else
        echo -e "${RED}Nginx is not running${NC}"
        
        # Start Nginx
        if confirm "Would you like to start Nginx?"; then
            echo -e "${BLUE}Starting Nginx...${NC}"
            systemctl start nginx
            if [ $? -eq 0 ]; then
                echo -e "${GREEN}Nginx started successfully${NC}"
            else
                echo -e "${RED}Failed to start Nginx${NC}"
            fi
        fi
    fi
else
    echo -e "${RED}Nginx is not installed${NC}"
fi
echo ""

# Step 5: Test Nginx API endpoint
echo -e "${BLUE}${BOLD}Step 5: Testing Nginx API endpoint...${NC}"
NGINX_API_WORKING=false
if command -v curl &> /dev/null; then
    echo -e "${YELLOW}Testing Nginx API endpoint...${NC}"
    CURL_RESULT=$(curl -s -o /dev/null -w "%{http_code}" http://localhost/api/health 2>/dev/null || echo "Failed")
    
    if [ "$CURL_RESULT" = "200" ]; then
        echo -e "${GREEN}Nginx API endpoint is responding on http://localhost/api/health${NC}"
        NGINX_API_WORKING=true
    elif [ "$CURL_RESULT" = "Failed" ]; then
        echo -e "${RED}Could not connect to Nginx API endpoint on http://localhost/api/health${NC}"
        NGINX_API_WORKING=false
        
        # Check if Nginx is running
        if systemctl is-active --quiet nginx; then
            echo -e "${GREEN}Nginx is running${NC}"
            
            # Check if the backend server is running
            if check_port 5001; then
                echo -e "${GREEN}Backend server is running on port 5001${NC}"
                
                # Check if the backend server is responding to requests
                echo -e "${YELLOW}Checking if the backend server is responding to requests...${NC}"
                CURL_RESULT=$(curl -s -v http://localhost:5001/api/health 2>&1 || echo "Failed")
                echo -e "${YELLOW}Curl verbose output:${NC}"
                echo "$CURL_RESULT"
                
                # Check Nginx error logs
                echo -e "${YELLOW}Checking Nginx error logs...${NC}"
                tail -n 100 /var/log/nginx/error.log
                
                # Check if there are any firewall rules blocking connections
                echo -e "${YELLOW}Checking if there are any firewall rules blocking connections...${NC}"
                if command -v iptables &> /dev/null; then
                    iptables -L -n
                fi
                
                # Try a more direct approach
                echo -e "${BLUE}Trying a more direct approach to fix Nginx configuration...${NC}"
                
                # Find the main Nginx configuration file
                MAIN_CONF_FILE=""
                for file in "${SERVER_CONF_FILES[@]}"; do
                    if grep -q "server_name" "$file"; then
                        MAIN_CONF_FILE="$file"
                        break
                    fi
                done
                
                if [ -n "$MAIN_CONF_FILE" ]; then
                    echo -e "${GREEN}Found main Nginx configuration file: $MAIN_CONF_FILE${NC}"
                    
                    # Create a backup of the original file
                    cp "$MAIN_CONF_FILE" "$MAIN_CONF_FILE.bak"
                    echo -e "${GREEN}Created backup of Nginx configuration at: $MAIN_CONF_FILE.bak${NC}"
                    
                    # Replace the entire API location block
                    echo -e "${BLUE}Replacing the entire API location block...${NC}"
                    sed -i '/location \/api {/,/}/d' "$MAIN_CONF_FILE"
                    
                    # Add a new API location block
                    echo -e "${BLUE}Adding a new API location block...${NC}"
                    sed -i '/server {/a \    location /api {\n        proxy_pass http://localhost:5001;\n        proxy_http_version 1.1;\n        proxy_set_header Upgrade $http_upgrade;\n        proxy_set_header Connection "upgrade";\n        proxy_set_header Host $host;\n        proxy_set_header X-Real-IP $remote_addr;\n        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;\n        proxy_set_header X-Forwarded-Proto $scheme;\n    }' "$MAIN_CONF_FILE"
                    
                    # Test the new configuration
                    echo -e "${BLUE}Testing Nginx configuration...${NC}"
                    nginx -t
                    if [ $? -ne 0 ]; then
                        echo -e "${RED}Nginx configuration test failed${NC}"
                        echo -e "${YELLOW}Restoring backup...${NC}"
                        cp "$MAIN_CONF_FILE.bak" "$MAIN_CONF_FILE"
                        echo -e "${GREEN}Backup restored${NC}"
                    else
                        echo -e "${GREEN}Nginx configuration test passed${NC}"
                        echo -e "${BLUE}Reloading Nginx...${NC}"
                        systemctl reload nginx
                        if [ $? -ne 0 ]; then
                            echo -e "${RED}Failed to reload Nginx${NC}"
                            echo -e "Please reload Nginx manually with: systemctl reload nginx"
                        else
                            echo -e "${GREEN}Nginx reloaded successfully${NC}"
                            NGINX_FIXED=true
                        fi
                    fi
                else
                    echo -e "${RED}Could not find main Nginx configuration file${NC}"
                fi
            else
                echo -e "${RED}Backend server is not running on port 5001${NC}"
            fi
        else
            echo -e "${RED}Nginx is not running${NC}"
        fi
    else
        echo -e "${YELLOW}Nginx API endpoint responded with status code: $CURL_RESULT${NC}"
        NGINX_API_WORKING=false
    fi
    
    # Test Nginx auth endpoint
    echo -e "\n${YELLOW}Testing Nginx auth endpoint...${NC}"
    NGINX_AUTH_RESULT=$(curl -s -o /dev/null -w "%{http_code}" http://localhost/api/auth/status 2>/dev/null || echo "Failed")
    
    if [ "$NGINX_AUTH_RESULT" = "200" ] || [ "$NGINX_AUTH_RESULT" = "401" ]; then
        echo -e "${GREEN}Nginx auth endpoint is responding on http://localhost/api/auth/status${NC}"
        echo -e "Status code: $NGINX_AUTH_RESULT (401 is expected if not authenticated)"
        NGINX_AUTH_WORKING=true
    elif [ "$NGINX_AUTH_RESULT" = "Failed" ]; then
        echo -e "${RED}Could not connect to Nginx auth endpoint on http://localhost/api/auth/status${NC}"
        NGINX_AUTH_WORKING=false
    else
        echo -e "${YELLOW}Nginx auth endpoint responded with status code: $NGINX_AUTH_RESULT${NC}"
        NGINX_AUTH_WORKING=false
    fi
else
    echo -e "${YELLOW}curl command not available, skipping API test${NC}"
fi
echo ""

# Final summary
echo -e "${BLUE}${BOLD}=== Final Summary ===${NC}"
if [ "$PM2_ENV_VARS_FIXED" = true ] && [ "$NGINX_API_WORKING" = true ] && [ "$NGINX_AUTH_WORKING" = true ]; then
    echo -e "${GREEN}${BOLD}All critical issues have been resolved!${NC}"
    echo -e "The application should now be working properly."
    echo -e "You should be able to access the application and log in."
else
    echo -e "${RED}${BOLD}Some issues still remain.${NC}"
    
    if [ "$PM2_ENV_VARS_FIXED" = false ]; then
        echo -e "${RED}PM2 environment variables are still not set.${NC}"
        echo -e "Here are some additional things to try:"
        echo -e "1. Check if the server/.env file exists and contains the correct environment variables"
        echo -e "2. Try manually setting the environment variables in PM2:"
        echo -e "   pm2 set boxwise:MONGO_URI \"mongodb://localhost:27017/boxwise\""
        echo -e "   pm2 set boxwise:JWT_SECRET \"your_jwt_secret\""
        echo -e "   pm2 set boxwise:PORT \"5001\""
        echo -e "   pm2 set boxwise:NODE_ENV \"production\""
        echo -e "   pm2 restart boxwise --update-env"
        echo -e "3. Try running the application directly to see if there are any errors:"
        echo -e "   cd server && node src/index.js"
    fi
    
    if [ "$NGINX_API_WORKING" = false ] || [ "$NGINX_AUTH_WORKING" = false ]; then
        echo -e "${RED}Nginx API endpoints are still not working.${NC}"
        echo -e "Here are some additional things to try:"
        echo -e "1. Check if the backend server is running with: pm2 list"
        echo -e "2. Check the backend server logs with: pm2 logs boxwise"
        echo -e "3. Check if there are any other issues in the Nginx error logs:"
        echo -e "   tail -n 100 /var/log/nginx/error.log"
        echo -e "4. Try manually editing the Nginx configuration to ensure the proxy_pass directive is correct:"
        echo -e "   location /api {"
        echo -e "       proxy_pass http://localhost:5001;"
        echo -e "       ..."
        echo -e "   }"
        echo -e "5. Make sure there are no firewall rules blocking connections between Nginx and the backend server."
        echo -e "6. Try restarting both Nginx and the backend server:"
        echo -e "   systemctl restart nginx"
        echo -e "   pm2 restart boxwise"
    fi
fi

echo -e "${GREEN}${BOLD}Fix Critical Issues Script completed!${NC}"

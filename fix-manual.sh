#!/bin/bash

# Boxwise Fix Manual Script
# This script provides a step-by-step manual intervention process to fix critical issues

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

echo -e "${BLUE}${BOLD}=== Boxwise Manual Fix Guide ===${NC}"
echo -e "${BLUE}Current directory: ${SCRIPT_DIR}${NC}"
echo ""

# Display help
function show_help {
    echo "Boxwise Manual Fix Guide"
    echo "Usage: $0 [options]"
    echo ""
    echo "Options:"
    echo "  -h, --help                Show this help message"
    echo ""
    echo "Example:"
    echo "  $0"
    exit 1
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case "$1" in
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

# Function to display a section header
section() {
    local title=$1
    echo ""
    echo -e "${BLUE}${BOLD}=== $title ===${NC}"
}

# Introduction
section "Introduction"
echo -e "This script will guide you through a manual process to fix persistent issues with your Boxwise application."
echo -e "You will be asked to perform specific actions and confirm the results."
echo -e "Let's start by gathering some information about your system."
echo ""

# Step 1: Gather system information
section "Step 1: Gathering System Information"

# Check if PM2 is installed
echo -e "${BLUE}Checking if PM2 is installed...${NC}"
if command -v pm2 &> /dev/null; then
    echo -e "${GREEN}PM2 is installed${NC}"
    PM2_INSTALLED=true
else
    echo -e "${RED}PM2 is not installed${NC}"
    PM2_INSTALLED=false
    
    echo -e "${YELLOW}Please install PM2 with the following command:${NC}"
    echo -e "npm install -g pm2"
    
    if confirm "Would you like to install PM2 now?"; then
        echo -e "${BLUE}Installing PM2...${NC}"
        npm install -g pm2
        if [ $? -eq 0 ]; then
            echo -e "${GREEN}PM2 installed successfully${NC}"
            PM2_INSTALLED=true
        else
            echo -e "${RED}Failed to install PM2${NC}"
            echo -e "Please install PM2 manually and run this script again."
            exit 1
        fi
    else
        echo -e "${RED}PM2 is required to continue. Please install PM2 and run this script again.${NC}"
        exit 1
    fi
fi

# Check if Nginx is installed
echo -e "${BLUE}Checking if Nginx is installed...${NC}"
if command -v nginx &> /dev/null; then
    echo -e "${GREEN}Nginx is installed${NC}"
    NGINX_INSTALLED=true
else
    echo -e "${RED}Nginx is not installed${NC}"
    NGINX_INSTALLED=false
    
    echo -e "${YELLOW}Please install Nginx with the following command:${NC}"
    echo -e "sudo apt-get install nginx"
    
    if confirm "Would you like to install Nginx now?"; then
        echo -e "${BLUE}Installing Nginx...${NC}"
        sudo apt-get update
        sudo apt-get install -y nginx
        if [ $? -eq 0 ]; then
            echo -e "${GREEN}Nginx installed successfully${NC}"
            NGINX_INSTALLED=true
        else
            echo -e "${RED}Failed to install Nginx${NC}"
            echo -e "Please install Nginx manually and run this script again."
            exit 1
        fi
    else
        echo -e "${RED}Nginx is required to continue. Please install Nginx and run this script again.${NC}"
        exit 1
    fi
fi

# Check if MongoDB is installed
echo -e "${BLUE}Checking if MongoDB is installed...${NC}"
if command -v mongod &> /dev/null; then
    echo -e "${GREEN}MongoDB is installed${NC}"
    MONGODB_INSTALLED=true
else
    echo -e "${RED}MongoDB is not installed${NC}"
    MONGODB_INSTALLED=false
    
    echo -e "${YELLOW}Please install MongoDB with the following commands:${NC}"
    echo -e "sudo apt-get install -y mongodb"
    
    if confirm "Would you like to install MongoDB now?"; then
        echo -e "${BLUE}Installing MongoDB...${NC}"
        sudo apt-get update
        sudo apt-get install -y mongodb
        if [ $? -eq 0 ]; then
            echo -e "${GREEN}MongoDB installed successfully${NC}"
            MONGODB_INSTALLED=true
        else
            echo -e "${RED}Failed to install MongoDB${NC}"
            echo -e "Please install MongoDB manually and run this script again."
            exit 1
        fi
    else
        echo -e "${RED}MongoDB is required to continue. Please install MongoDB and run this script again.${NC}"
        exit 1
    fi
fi

# Step 2: Check environment variables
section "Step 2: Checking Environment Variables"

# Check if server/.env file exists
echo -e "${BLUE}Checking if server/.env file exists...${NC}"
if [ -f "$SCRIPT_DIR/server/.env" ]; then
    echo -e "${GREEN}server/.env file exists${NC}"
    ENV_FILE_EXISTS=true
    
    # Check if MONGO_URI is set
    echo -e "${BLUE}Checking if MONGO_URI is set in server/.env...${NC}"
    if grep -q "^MONGO_URI=" "$SCRIPT_DIR/server/.env"; then
        MONGO_URI=$(grep "^MONGO_URI=" "$SCRIPT_DIR/server/.env" | cut -d= -f2-)
        echo -e "${GREEN}MONGO_URI is set to: $MONGO_URI${NC}"
        MONGO_URI_SET=true
    else
        echo -e "${RED}MONGO_URI is not set in server/.env${NC}"
        MONGO_URI_SET=false
        
        echo -e "${YELLOW}Please add MONGO_URI to server/.env with the following command:${NC}"
        echo -e "echo 'MONGO_URI=mongodb://localhost:27017/boxwise' >> server/.env"
        
        if confirm "Would you like to add MONGO_URI to server/.env now?"; then
            echo -e "${BLUE}Adding MONGO_URI to server/.env...${NC}"
            echo "MONGO_URI=mongodb://localhost:27017/boxwise" >> "$SCRIPT_DIR/server/.env"
            if [ $? -eq 0 ]; then
                echo -e "${GREEN}MONGO_URI added to server/.env${NC}"
                MONGO_URI_SET=true
                MONGO_URI="mongodb://localhost:27017/boxwise"
            else
                echo -e "${RED}Failed to add MONGO_URI to server/.env${NC}"
            fi
        fi
    fi
    
    # Check if JWT_SECRET is set
    echo -e "${BLUE}Checking if JWT_SECRET is set in server/.env...${NC}"
    if grep -q "^JWT_SECRET=" "$SCRIPT_DIR/server/.env"; then
        JWT_SECRET=$(grep "^JWT_SECRET=" "$SCRIPT_DIR/server/.env" | cut -d= -f2-)
        echo -e "${GREEN}JWT_SECRET is set${NC}"
        JWT_SECRET_SET=true
    else
        echo -e "${RED}JWT_SECRET is not set in server/.env${NC}"
        JWT_SECRET_SET=false
        
        # Generate a random JWT_SECRET
        JWT_SECRET="boxwise_jwt_secret_$(openssl rand -hex 12)"
        
        echo -e "${YELLOW}Please add JWT_SECRET to server/.env with the following command:${NC}"
        echo -e "echo 'JWT_SECRET=$JWT_SECRET' >> server/.env"
        
        if confirm "Would you like to add JWT_SECRET to server/.env now?"; then
            echo -e "${BLUE}Adding JWT_SECRET to server/.env...${NC}"
            echo "JWT_SECRET=$JWT_SECRET" >> "$SCRIPT_DIR/server/.env"
            if [ $? -eq 0 ]; then
                echo -e "${GREEN}JWT_SECRET added to server/.env${NC}"
                JWT_SECRET_SET=true
            else
                echo -e "${RED}Failed to add JWT_SECRET to server/.env${NC}"
            fi
        fi
    fi
    
    # Check if PORT is set
    echo -e "${BLUE}Checking if PORT is set in server/.env...${NC}"
    if grep -q "^PORT=" "$SCRIPT_DIR/server/.env"; then
        PORT=$(grep "^PORT=" "$SCRIPT_DIR/server/.env" | cut -d= -f2-)
        echo -e "${GREEN}PORT is set to: $PORT${NC}"
        PORT_SET=true
    else
        echo -e "${RED}PORT is not set in server/.env${NC}"
        PORT_SET=false
        
        echo -e "${YELLOW}Please add PORT to server/.env with the following command:${NC}"
        echo -e "echo 'PORT=5001' >> server/.env"
        
        if confirm "Would you like to add PORT to server/.env now?"; then
            echo -e "${BLUE}Adding PORT to server/.env...${NC}"
            echo "PORT=5001" >> "$SCRIPT_DIR/server/.env"
            if [ $? -eq 0 ]; then
                echo -e "${GREEN}PORT added to server/.env${NC}"
                PORT_SET=true
                PORT=5001
            else
                echo -e "${RED}Failed to add PORT to server/.env${NC}"
            fi
        fi
    fi
    
    # Check if NODE_ENV is set
    echo -e "${BLUE}Checking if NODE_ENV is set in server/.env...${NC}"
    if grep -q "^NODE_ENV=" "$SCRIPT_DIR/server/.env"; then
        NODE_ENV=$(grep "^NODE_ENV=" "$SCRIPT_DIR/server/.env" | cut -d= -f2-)
        echo -e "${GREEN}NODE_ENV is set to: $NODE_ENV${NC}"
        NODE_ENV_SET=true
    else
        echo -e "${RED}NODE_ENV is not set in server/.env${NC}"
        NODE_ENV_SET=false
        
        echo -e "${YELLOW}Please add NODE_ENV to server/.env with the following command:${NC}"
        echo -e "echo 'NODE_ENV=production' >> server/.env"
        
        if confirm "Would you like to add NODE_ENV to server/.env now?"; then
            echo -e "${BLUE}Adding NODE_ENV to server/.env...${NC}"
            echo "NODE_ENV=production" >> "$SCRIPT_DIR/server/.env"
            if [ $? -eq 0 ]; then
                echo -e "${GREEN}NODE_ENV added to server/.env${NC}"
                NODE_ENV_SET=true
                NODE_ENV="production"
            else
                echo -e "${RED}Failed to add NODE_ENV to server/.env${NC}"
            fi
        fi
    fi
else
    echo -e "${RED}server/.env file does not exist${NC}"
    ENV_FILE_EXISTS=false
    
    echo -e "${YELLOW}Please create server/.env file with the following command:${NC}"
    echo -e "touch server/.env"
    
    if confirm "Would you like to create server/.env now?"; then
        echo -e "${BLUE}Creating server/.env...${NC}"
        mkdir -p "$SCRIPT_DIR/server"
        touch "$SCRIPT_DIR/server/.env"
        if [ $? -eq 0 ]; then
            echo -e "${GREEN}server/.env created${NC}"
            ENV_FILE_EXISTS=true
            
            # Add environment variables to server/.env
            echo -e "${BLUE}Adding environment variables to server/.env...${NC}"
            echo "MONGO_URI=mongodb://localhost:27017/boxwise" >> "$SCRIPT_DIR/server/.env"
            echo "JWT_SECRET=boxwise_jwt_secret_$(openssl rand -hex 12)" >> "$SCRIPT_DIR/server/.env"
            echo "PORT=5001" >> "$SCRIPT_DIR/server/.env"
            echo "NODE_ENV=production" >> "$SCRIPT_DIR/server/.env"
            
            echo -e "${GREEN}Environment variables added to server/.env${NC}"
            MONGO_URI="mongodb://localhost:27017/boxwise"
            JWT_SECRET="boxwise_jwt_secret_$(openssl rand -hex 12)"
            PORT=5001
            NODE_ENV="production"
            MONGO_URI_SET=true
            JWT_SECRET_SET=true
            PORT_SET=true
            NODE_ENV_SET=true
        else
            echo -e "${RED}Failed to create server/.env${NC}"
        fi
    else
        echo -e "${RED}server/.env file is required to continue. Please create server/.env and run this script again.${NC}"
        exit 1
    fi
fi

# Step 3: Create ecosystem.config.js
section "Step 3: Creating ecosystem.config.js"

echo -e "${BLUE}Creating ecosystem.config.js...${NC}"
cat > "$SCRIPT_DIR/ecosystem.config.js" << EOF
module.exports = {
  apps: [{
    name: 'boxwise',
    script: './server/src/index.js',
    instances: 1,
    exec_mode: 'fork',
    env: {
      NODE_ENV: '${NODE_ENV:-production}',
      PORT: ${PORT:-5001},
      MONGO_URI: '${MONGO_URI:-mongodb://localhost:27017/boxwise}',
      JWT_SECRET: '${JWT_SECRET:-boxwise_jwt_secret_$(openssl rand -hex 12)}'
    },
    watch: false,
    max_memory_restart: '500M'
  }]
};
EOF

if [ $? -eq 0 ]; then
    echo -e "${GREEN}ecosystem.config.js created successfully${NC}"
    ECOSYSTEM_CREATED=true
else
    echo -e "${RED}Failed to create ecosystem.config.js${NC}"
    ECOSYSTEM_CREATED=false
fi

# Step 4: Restart PM2 process
section "Step 4: Restarting PM2 Process"

echo -e "${BLUE}Checking if Boxwise application is running in PM2...${NC}"
if pm2 list | grep -q "boxwise"; then
    echo -e "${GREEN}Boxwise application is running in PM2${NC}"
    PM2_RUNNING=true
    
    echo -e "${BLUE}Stopping Boxwise application...${NC}"
    pm2 delete boxwise
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}Boxwise application stopped successfully${NC}"
    else
        echo -e "${RED}Failed to stop Boxwise application${NC}"
    fi
else
    echo -e "${YELLOW}Boxwise application is not running in PM2${NC}"
    PM2_RUNNING=false
fi

echo -e "${BLUE}Starting Boxwise application with ecosystem.config.js...${NC}"
pm2 start ecosystem.config.js
if [ $? -eq 0 ]; then
    echo -e "${GREEN}Boxwise application started successfully${NC}"
    pm2 save
    PM2_STARTED=true
else
    echo -e "${RED}Failed to start Boxwise application${NC}"
    PM2_STARTED=false
    
    echo -e "${YELLOW}Please check the PM2 logs for errors:${NC}"
    pm2 logs boxwise --lines 20 --nostream
    
    echo -e "${YELLOW}You can try starting the application directly to see if there are any errors:${NC}"
    echo -e "cd server && node src/index.js"
    
    if confirm "Would you like to try starting the application directly now?"; then
        echo -e "${BLUE}Starting application directly...${NC}"
        cd "$SCRIPT_DIR/server" && NODE_ENV="${NODE_ENV:-production}" PORT="${PORT:-5001}" MONGO_URI="${MONGO_URI:-mongodb://localhost:27017/boxwise}" JWT_SECRET="${JWT_SECRET:-boxwise_jwt_secret_$(openssl rand -hex 12)}" node src/index.js &
        DIRECT_PID=$!
        sleep 5
        kill $DIRECT_PID
        cd "$SCRIPT_DIR"
    fi
fi

# Step 5: Check if backend server is running
section "Step 5: Checking Backend Server"

echo -e "${BLUE}Checking if backend server is running on port ${PORT:-5001}...${NC}"
if check_port ${PORT:-5001}; then
    echo -e "${GREEN}Backend server is running on port ${PORT:-5001}${NC}"
    BACKEND_RUNNING=true
else
    echo -e "${RED}Backend server is not running on port ${PORT:-5001}${NC}"
    BACKEND_RUNNING=false
    
    echo -e "${YELLOW}Please check the PM2 logs for errors:${NC}"
    pm2 logs boxwise --lines 20 --nostream
    
    echo -e "${YELLOW}You can try restarting the application:${NC}"
    echo -e "pm2 restart boxwise"
    
    if confirm "Would you like to restart the application now?"; then
        echo -e "${BLUE}Restarting application...${NC}"
        pm2 restart boxwise
        sleep 5
        if check_port ${PORT:-5001}; then
            echo -e "${GREEN}Backend server is now running on port ${PORT:-5001}${NC}"
            BACKEND_RUNNING=true
        else
            echo -e "${RED}Backend server is still not running on port ${PORT:-5001}${NC}"
        fi
    fi
fi

# Step 6: Fix Nginx configuration
section "Step 6: Fixing Nginx Configuration"

echo -e "${BLUE}Checking Nginx configuration...${NC}"

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
    echo -e "${BLUE}We need to create a new server block.${NC}"
    
    # Ask for the configuration file to create
    echo -e "${YELLOW}Please enter the path to create the Nginx configuration file:${NC}"
    echo -e "(e.g., /etc/nginx/sites-available/boxwise or /etc/nginx/conf.d/boxwise.conf)"
    read -r conf_file
    
    # Create the configuration file
    echo -e "${BLUE}Creating $conf_file...${NC}"
    sudo tee "$conf_file" > /dev/null << EOF
server {
    listen 80;
    server_name localhost;

    location / {
        root /var/www/html;
        index index.html index.htm;
        try_files \$uri \$uri/ /index.html;
    }

    location /api {
        proxy_pass http://localhost:${PORT:-5001};
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
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}Nginx configuration file created successfully${NC}"
        NGINX_CONF_CREATED=true
        
        # If the file is in sites-available, create a symlink in sites-enabled
        if [[ "$conf_file" == *"sites-available"* ]]; then
            echo -e "${BLUE}Creating symlink in sites-enabled...${NC}"
            sudo ln -sf "$conf_file" "${conf_file/sites-available/sites-enabled}"
            if [ $? -eq 0 ]; then
                echo -e "${GREEN}Symlink created successfully${NC}"
            else
                echo -e "${RED}Failed to create symlink${NC}"
            fi
        fi
    else
        echo -e "${RED}Failed to create Nginx configuration file${NC}"
        NGINX_CONF_CREATED=false
    fi
else
    # Fix each server block
    for file in "${SERVER_CONF_FILES[@]}"; do
        echo -e "${BLUE}Checking server block in $file...${NC}"
        
        # Create a backup of the original file
        sudo cp "$file" "$file.bak"
        echo -e "${GREEN}Created backup of Nginx configuration at: $file.bak${NC}"
        
        # Check if the file has an API location block
        if grep -q "location /api" "$file"; then
            echo -e "${GREEN}Found API location block in $file${NC}"
            
            # Display the current API configuration
            echo -e "${YELLOW}Current API configuration:${NC}"
            grep -A 10 "location /api" "$file" | grep -v "#" | sed 's/^/  /'
            
            # Replace the entire API location block
            echo -e "${BLUE}Replacing the API location block...${NC}"
            sudo sed -i '/location \/api {/,/}/d' "$file"
            
            # Add a new API location block
            echo -e "${BLUE}Adding a new API location block...${NC}"
            sudo sed -i '/server {/a \    location /api {\n        proxy_pass http://localhost:'"${PORT:-5001}"';\n        proxy_http_version 1.1;\n        proxy_set_header Upgrade $http_upgrade;\n        proxy_set_header Connection "upgrade";\n        proxy_set_header Host $host;\n        proxy_set_header X-Real-IP $remote_addr;\n        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;\n        proxy_set_header X-Forwarded-Proto $scheme;\n    }' "$file"
            
            # Display the updated API configuration
            echo -e "${YELLOW}Updated API configuration:${NC}"
            grep -A 10 "location /api" "$file" | grep -v "#" | sed 's/^/  /'
        else
            echo -e "${RED}No API location block found in $file${NC}"
            
            # Add an API location block
            echo -e "${BLUE}Adding API location block to $file...${NC}"
            sudo sed -i '/server {/a \    location /api {\n        proxy_pass http://localhost:'"${PORT:-5001}"';\n        proxy_http_version 1.1;\n        proxy_set_header Upgrade $http_upgrade;\n        proxy_set_header Connection "upgrade";\n        proxy_set_header Host $host;\n        proxy_set_header X-Real-IP $remote_addr;\n        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;\n        proxy_set_header X-Forwarded-Proto $scheme;\n    }' "$file"
            
            # Display the added API configuration
            echo -e "${YELLOW}Added API configuration:${NC}"
            grep -A 10 "location /api" "$file" | grep -v "#" | sed 's/^/  /'
        fi
    done
fi

# Test the Nginx configuration
echo -e "${BLUE}Testing Nginx configuration...${NC}"
sudo nginx -t
if [ $? -eq 0 ]; then
    echo -e "${GREEN}Nginx configuration test passed${NC}"
    NGINX_CONF_VALID=true
    
    # Reload Nginx
    echo -e "${BLUE}Reloading Nginx...${NC}"
    sudo systemctl reload nginx
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}Nginx reloaded successfully${NC}"
        NGINX_RELOADED=true
    else
        echo -e "${RED}Failed to reload Nginx${NC}"
        NGINX_RELOADED=false
    fi
else
    echo -e "${RED}Nginx configuration test failed${NC}"
    NGINX_CONF_VALID=false
    
    # Restore the backup
    echo -e "${YELLOW}Restoring backup...${NC}"
    for file in "${SERVER_CONF_FILES[@]}"; do
        sudo cp "$file.bak" "$file"
    done
    echo -e "${GREEN}Backup restored${NC}"
    
    echo -e "${YELLOW}Please check the Nginx error logs for more information:${NC}"
    echo -e "sudo tail -n 100 /var/log/nginx/error.log"
fi

# Step 7: Test API connectivity
section "Step 7: Testing API Connectivity"

echo -e "${BLUE}Testing API connectivity...${NC}"

# Test backend API directly
echo -e "${YELLOW}Testing connection to backend server on port ${PORT:-5001}...${NC}"
if command -v curl &> /dev/null; then
    CURL_RESULT=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:${PORT:-5001}/api/health 2>/dev/null || echo "Failed")
    
    if [ "$CURL_RESULT" = "200" ]; then
        echo -e "${GREEN}Backend API is responding on http://localhost:${PORT:-5001}/api/health${NC}"
        BACKEND_API_WORKING=true
    elif [ "$CURL_RESULT" = "Failed" ]; then
        echo -e "${RED}Could not connect to backend API on http://localhost:${PORT:-5001}/api/health${NC}"
        BACKEND_API_WORKING=false
    else
        echo -e "${YELLOW}Backend API responded with status code: $CURL_RESULT${NC}"
        BACKEND_API_WORKING=false
    fi
else
    echo -e "${YELLOW}curl command not available, skipping API test${NC}"
    BACKEND_API_WORKING=false
fi

# Test Nginx API endpoint
echo -e "${YELLOW}Testing Nginx API endpoint...${NC}"
if command -v curl &> /dev/null; then
    NGINX_API_RESULT=$(curl -s -o /dev/null -w "%{http_code}" http://localhost/api/health 2>/dev/null || echo "Failed")
    
    if [ "$NGINX_API_RESULT" = "200" ]; then
        echo -e "${GREEN}Nginx API endpoint is responding on http://localhost/api/health${NC}"
        NGINX_API_WORKING=true
    elif [ "$NGINX_API_RESULT" = "Failed" ]; then
        echo -e "${RED}Could not connect to Nginx API endpoint on http://localhost/api/health${NC}"
        NGINX_API_WORKING=false
    else
        echo -e "${YELLOW}Nginx API endpoint responded with status code: $NGINX_API_RESULT${NC}"
        NGINX_API_WORKING=false
    fi
else
    echo -e "${YELLOW}curl command not available, skipping API test${NC}"
    NGINX_API_WORKING=false
fi

# Test Nginx auth endpoint
echo -e "${YELLOW}Testing Nginx auth endpoint...${NC}"
if command -v curl &> /dev/null; then
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
    NGINX_AUTH_WORKING=false
fi

# Step 8: Final summary
section "Step 8: Final Summary"

if [ "$BACKEND_API_WORKING" = true ] && [ "$NGINX_API_WORKING" = true ] && [ "$NGINX_AUTH_WORKING" = true ]; then
    echo -e "${GREEN}${BOLD}All issues have been resolved!${NC}"
    echo -e "The application should now be working properly."
    echo -e "You should be able to access the application and log in."
else
    echo -e "${RED}${BOLD}Some issues still remain.${NC}"
    
    if [ "$BACKEND_API_WORKING" = false ]; then
        echo -e "${RED}Backend API is not working.${NC}"
        echo -e "Here are some additional things to try:"
        echo -e "1. Check if the backend server is running with: pm2 list"
        echo -e "2. Check the backend server logs with: pm2 logs boxwise"
        echo -e "3. Make sure the environment variables are set correctly in server/.env"
        echo -e "4. Try running the application directly to see if there are any errors:"
        echo -e "   cd server && node src/index.js"
    fi
    
    if [ "$NGINX_API_WORKING" = false ] || [ "$NGINX_AUTH_WORKING" = false ]; then
        echo -e "${RED}Nginx API endpoints are not working.${NC}"
        echo -e "Here are some additional things to try:"
        echo -e "1. Check if the backend server is running and accessible from Nginx"
        echo -e "2. Check the Nginx error logs: sudo tail -n 100 /var/log/nginx/error.log"
        echo -e "3. Make sure there are no firewall rules blocking connections between Nginx and the backend server"
        echo -e "4. Try restarting both Nginx and the backend server:"
        echo -e "   sudo systemctl restart nginx"
        echo -e "   pm2 restart boxwise"
        echo -e "5. Verify that the proxy_pass directive in the Nginx configuration is correct:"
        echo -e "   location /api {"
        echo -e "       proxy_pass http://localhost:${PORT:-5001};"
        echo -e "       ..."
        echo -e "   }"
    fi
    
    echo -e "\n${YELLOW}If you're still having issues, here are some manual steps to try:${NC}"
    echo -e "1. Manually set environment variables in PM2:"
    echo -e "   pm2 set boxwise:MONGO_URI \"${MONGO_URI:-mongodb://localhost:27017/boxwise}\""
    echo -e "   pm2 set boxwise:JWT_SECRET \"${JWT_SECRET:-boxwise_jwt_secret_$(openssl rand -hex 12)}\""
    echo -e "   pm2 set boxwise:PORT \"${PORT:-5001}\""
    echo -e "   pm2 set boxwise:NODE_ENV \"${NODE_ENV:-production}\""
    echo -e "   pm2 restart boxwise --update-env"
    
    echo -e "2. Create a minimal Nginx configuration file:"
    echo -e "   sudo tee /etc/nginx/conf.d/boxwise.conf > /dev/null << EOF"
    echo -e "   server {"
    echo -e "       listen 80;"
    echo -e "       server_name localhost;"
    echo -e ""
    echo -e "       location / {"
    echo -e "           root /var/www/html;"
    echo -e "           index index.html index.htm;"
    echo -e "           try_files \\\$uri \\\$uri/ /index.html;"
    echo -e "       }"
    echo -e ""
    echo -e "       location /api {"
    echo -e "           proxy_pass http://localhost:${PORT:-5001};"
    echo -e "           proxy_http_version 1.1;"
    echo -e "           proxy_set_header Upgrade \\\$http_upgrade;"
    echo -e "           proxy_set_header Connection \"upgrade\";"
    echo -e "           proxy_set_header Host \\\$host;"
    echo -e "           proxy_set_header X-Real-IP \\\$remote_addr;"
    echo -e "           proxy_set_header X-Forwarded-For \\\$proxy_add_x_forwarded_for;"
    echo -e "           proxy_set_header X-Forwarded-Proto \\\$scheme;"
    echo -e "       }"
    echo -e "   }"
    echo -e "   EOF"
    echo -e "   sudo nginx -t && sudo systemctl reload nginx"
    
    echo -e "3. Test the API endpoints directly:"
    echo -e "   curl -v http://localhost:${PORT:-5001}/api/health"
    echo -e "   curl -v http://localhost/api/health"
fi

echo -e "\n${GREEN}${BOLD}Boxwise Manual Fix Guide completed!${NC}"
echo -e "Thank you for using the Boxwise Manual Fix Guide."

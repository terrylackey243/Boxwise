#!/bin/bash

# Boxwise Doctor Script
# This script runs all checks and fixes only what's needed

# ANSI color codes
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m' # No Color

# Get the script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
cd "$SCRIPT_DIR"

echo -e "${BLUE}${BOLD}=== Boxwise Doctor ===${NC}"
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
    echo "Boxwise Doctor Script"
    echo "Usage: $0 [options]"
    echo ""
    echo "Options:"
    echo "  -a, --auto-fix            Automatically fix issues without prompting"
    echo "  -c, --check-only          Only check for issues, don't fix anything"
    echo "  -h, --help                Show this help message"
    echo ""
    echo "Example:"
    echo "  $0 -a"
    exit 1
}

# Default values
AUTO_FIX=false
CHECK_ONLY=false

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case "$1" in
        -a|--auto-fix)
            AUTO_FIX=true
            shift
            ;;
        -c|--check-only)
            CHECK_ONLY=true
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

# Initialize issue tracking
MONGODB_RUNNING=false
MONGODB_CONNECTION=false
NGINX_RUNNING=false
NGINX_API_PATH=false
PM2_INSTALLED=false
PM2_RUNNING=false
PM2_ENV_VARS=false
BACKEND_RUNNING=false
API_WORKING=false
AUTH_WORKING=false

# Function to check if a service is running
check_service() {
    local service=$1
    if systemctl is-active --quiet $service; then
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

# Function to ask for confirmation
confirm() {
    local message=$1
    if [ "$AUTO_FIX" = true ]; then
        return 0
    fi
    if [ "$CHECK_ONLY" = true ]; then
        return 1
    fi
    echo -e "${YELLOW}$message (y/n)${NC}"
    read -r answer
    if [[ "$answer" =~ ^[Yy]$ ]]; then
        return 0
    else
        return 1
    fi
}

# Function to run a fix script
run_fix_script() {
    local script=$1
    local description=$2
    
    if [ "$CHECK_ONLY" = true ]; then
        echo -e "${YELLOW}Check-only mode: Would run $script to $description${NC}"
        return
    fi
    
    if [ -x "$SCRIPT_DIR/$script" ]; then
        echo -e "${BLUE}Running $script to $description...${NC}"
        bash "$SCRIPT_DIR/$script"
        if [ $? -eq 0 ]; then
            echo -e "${GREEN}Successfully ran $script${NC}"
        else
            echo -e "${RED}Failed to run $script${NC}"
        fi
    else
        echo -e "${RED}Error: Script $script is not executable or does not exist.${NC}"
    fi
}

# Check MongoDB
echo -e "${BLUE}${BOLD}Checking MongoDB...${NC}"
if check_service mongod; then
    echo -e "${GREEN}MongoDB is running${NC}"
    MONGODB_RUNNING=true
else
    echo -e "${RED}MongoDB is not running${NC}"
    MONGODB_RUNNING=false
    
    if confirm "Would you like to start MongoDB?"; then
        echo -e "${BLUE}Starting MongoDB...${NC}"
        systemctl start mongod
        if [ $? -eq 0 ]; then
            echo -e "${GREEN}MongoDB started successfully${NC}"
            MONGODB_RUNNING=true
        else
            echo -e "${RED}Failed to start MongoDB${NC}"
        fi
    fi
fi

# Check MongoDB connection
if [ "$MONGODB_RUNNING" = true ]; then
    echo -e "${BLUE}Testing MongoDB connection...${NC}"
    
    # Get MongoDB URI from environment file
    MONGO_URI=""
    if [ -f "$SCRIPT_DIR/server/.env" ]; then
        if grep -q "^MONGO_URI=" "$SCRIPT_DIR/server/.env"; then
            MONGO_URI=$(grep "^MONGO_URI=" "$SCRIPT_DIR/server/.env" | cut -d= -f2-)
            echo -e "${GREEN}Found MONGO_URI in server/.env: $MONGO_URI${NC}"
        else
            echo -e "${RED}MONGO_URI not found in server/.env${NC}"
        fi
    else
        echo -e "${RED}server/.env file not found${NC}"
    fi
    
    # If MONGO_URI is not set, use default
    if [ -z "$MONGO_URI" ]; then
        MONGO_URI="mongodb://localhost:27017/boxwise"
        echo -e "${YELLOW}Using default MONGO_URI: $MONGO_URI${NC}"
    fi
    
    # Create a temporary script to test the MongoDB connection
    TEMP_DIR=$(mktemp -d)
    cat > "$TEMP_DIR/test-mongo.js" << EOF
const mongoose = require('mongoose');

// MongoDB connection
const MONGO_URI = '$MONGO_URI';

console.log(\`Attempting to connect to MongoDB at: \${MONGO_URI}\`);

// Connect to MongoDB
mongoose.connect(MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => {
  console.log('Successfully connected to MongoDB');
  mongoose.connection.close();
  console.log('Disconnected from MongoDB');
  process.exit(0);
})
.catch(err => {
  console.error('MongoDB connection error:', err);
  process.exit(1);
});
EOF

    # Create a package.json file in the temporary directory
    cat > "$TEMP_DIR/package.json" << EOF
{
  "name": "boxwise-test-mongo",
  "version": "1.0.0",
  "description": "Script to test MongoDB connection",
  "main": "test-mongo.js",
  "dependencies": {
    "mongoose": "^7.0.3"
  }
}
EOF

    # Change to the temporary directory
    cd "$TEMP_DIR"

    # Install dependencies
    echo -e "${BLUE}Installing dependencies...${NC}"
    npm install --quiet
    if [ $? -ne 0 ]; then
        echo -e "${RED}Failed to install dependencies. Please check npm error messages above.${NC}"
        cd "$SCRIPT_DIR"
        rm -rf "$TEMP_DIR"
        MONGODB_CONNECTION=false
    else
        # Run the test script
        echo -e "${BLUE}Testing MongoDB connection...${NC}"
        node test-mongo.js
        
        # Check if the test was successful
        MONGO_TEST_RESULT=$?
        if [ $MONGO_TEST_RESULT -eq 0 ]; then
            echo -e "${GREEN}MongoDB connection test successful${NC}"
            MONGODB_CONNECTION=true
        else
            echo -e "${RED}MongoDB connection test failed${NC}"
            MONGODB_CONNECTION=false
        fi
        
        # Clean up
        cd "$SCRIPT_DIR"
        rm -rf "$TEMP_DIR"
    fi
fi
echo ""

# Check Nginx
echo -e "${BLUE}${BOLD}Checking Nginx...${NC}"
if check_service nginx; then
    echo -e "${GREEN}Nginx is running${NC}"
    NGINX_RUNNING=true
else
    echo -e "${RED}Nginx is not running${NC}"
    NGINX_RUNNING=false
    
    if confirm "Would you like to start Nginx?"; then
        echo -e "${BLUE}Starting Nginx...${NC}"
        systemctl start nginx
        if [ $? -eq 0 ]; then
            echo -e "${GREEN}Nginx started successfully${NC}"
            NGINX_RUNNING=true
        else
            echo -e "${RED}Failed to start Nginx${NC}"
        fi
    fi
fi

# Check Nginx API path
if [ "$NGINX_RUNNING" = true ]; then
    echo -e "${BLUE}Checking Nginx API path...${NC}"
    
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
        
        if [ ${#CONF_FILES[@]} -eq 0 ]; then
            echo -e "${RED}No Nginx configuration files found${NC}"
            NGINX_API_PATH=false
        else
            echo -e "${GREEN}Found ${#CONF_FILES[@]} configuration files${NC}"
        fi
    else
        # Find all configuration files in sites-available and sites-enabled
        CONF_FILES=()
        while IFS= read -r -d '' file; do
            CONF_FILES+=("$file")
        done < <(find "$SITES_AVAILABLE_DIR" "$SITES_ENABLED_DIR" -type f -print0)
        
        if [ ${#CONF_FILES[@]} -eq 0 ]; then
            echo -e "${RED}No Nginx configuration files found${NC}"
            NGINX_API_PATH=false
        else
            echo -e "${GREEN}Found ${#CONF_FILES[@]} configuration files${NC}"
        fi
    fi
    
    # Look for API configuration in Nginx files
    API_CONF_FILES=()
    for file in "${CONF_FILES[@]}"; do
        if grep -q "location /api" "$file"; then
            API_CONF_FILES+=("$file")
            echo -e "${GREEN}Found API configuration in $file${NC}"
        fi
    done
    
    if [ ${#API_CONF_FILES[@]} -eq 0 ]; then
        echo -e "${RED}No API configuration found in Nginx files${NC}"
        NGINX_API_PATH=false
    else
        # Check for double API path in Nginx configuration
        DOUBLE_API_FILES=()
        for file in "${API_CONF_FILES[@]}"; do
            if grep -q "proxy_pass.*api.*api" "$file"; then
                DOUBLE_API_FILES+=("$file")
                echo -e "${RED}Found double API path in $file${NC}"
                NGINX_API_PATH=false
            fi
        done
        
        if [ ${#DOUBLE_API_FILES[@]} -eq 0 ]; then
            echo -e "${GREEN}No double API path found in Nginx configuration${NC}"
            NGINX_API_PATH=true
        fi
    fi
fi
echo ""

# Check PM2
echo -e "${BLUE}${BOLD}Checking PM2...${NC}"
if command -v pm2 &> /dev/null; then
    echo -e "${GREEN}PM2 is installed${NC}"
    PM2_INSTALLED=true
    
    # Check if the application is running with PM2
    if pm2 list | grep -q "boxwise"; then
        echo -e "${GREEN}Boxwise application is running in PM2${NC}"
        echo -e "PM2 status for Boxwise:"
        pm2 list | grep -A 1 -B 1 "boxwise"
        PM2_RUNNING=true
        
        # Check PM2 environment variables
        echo -e "${BLUE}Checking PM2 environment variables...${NC}"
        PM2_ENV=$(pm2 env boxwise 2>/dev/null)
        if echo "$PM2_ENV" | grep -q "MONGO_URI"; then
            echo -e "${GREEN}MONGO_URI is set in PM2 environment${NC}"
            PM2_ENV_VARS=true
        else
            echo -e "${RED}MONGO_URI is not set in PM2 environment${NC}"
            PM2_ENV_VARS=false
        fi
    else
        echo -e "${RED}Boxwise application is not running in PM2${NC}"
        PM2_RUNNING=false
    fi
else
    echo -e "${RED}PM2 is not installed${NC}"
    PM2_INSTALLED=false
    
    if confirm "Would you like to install PM2?"; then
        echo -e "${BLUE}Installing PM2...${NC}"
        npm install -g pm2
        if [ $? -eq 0 ]; then
            echo -e "${GREEN}PM2 installed successfully${NC}"
            PM2_INSTALLED=true
        else
            echo -e "${RED}Failed to install PM2${NC}"
        fi
    fi
fi
echo ""

# Check backend server
echo -e "${BLUE}${BOLD}Checking backend server...${NC}"
if [ "$PM2_RUNNING" = true ]; then
    echo -e "${GREEN}Backend server is running with PM2${NC}"
    BACKEND_RUNNING=true
else
    # Check if the backend server is running directly
    if check_port 5001; then
        echo -e "${GREEN}Backend server is running on port 5001${NC}"
        BACKEND_RUNNING=true
    else
        echo -e "${RED}Backend server is not running${NC}"
        BACKEND_RUNNING=false
    fi
fi
echo ""

# Test API connectivity
echo -e "${BLUE}${BOLD}Testing API connectivity...${NC}"
if command -v curl &> /dev/null; then
    echo -e "${YELLOW}Testing connection to backend server on port 5001...${NC}"
    CURL_RESULT=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:5001/api/health 2>/dev/null || echo "Failed")
    
    if [ "$CURL_RESULT" = "200" ]; then
        echo -e "${GREEN}Backend API is responding on http://localhost:5001/api/health${NC}"
        API_WORKING=true
    elif [ "$CURL_RESULT" = "Failed" ]; then
        echo -e "${RED}Could not connect to backend API on http://localhost:5001/api/health${NC}"
        API_WORKING=false
    else
        echo -e "${YELLOW}Backend API responded with status code: $CURL_RESULT${NC}"
        API_WORKING=false
    fi
    
    # Test auth endpoint
    echo -e "\n${YELLOW}Testing auth endpoint...${NC}"
    AUTH_RESULT=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:5001/api/auth/status 2>/dev/null || echo "Failed")
    
    if [ "$AUTH_RESULT" = "200" ] || [ "$AUTH_RESULT" = "401" ]; then
        echo -e "${GREEN}Auth endpoint is responding on http://localhost:5001/api/auth/status${NC}"
        echo -e "Status code: $AUTH_RESULT (401 is expected if not authenticated)"
        AUTH_WORKING=true
    elif [ "$AUTH_RESULT" = "Failed" ]; then
        echo -e "${RED}Could not connect to auth endpoint on http://localhost:5001/api/auth/status${NC}"
        AUTH_WORKING=false
    else
        echo -e "${YELLOW}Auth endpoint responded with status code: $AUTH_RESULT${NC}"
        AUTH_WORKING=false
    fi
    
    # Test Nginx API endpoint
    if [ "$NGINX_RUNNING" = true ]; then
        echo -e "\n${YELLOW}Testing Nginx API endpoint...${NC}"
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
    fi
else
    echo -e "${YELLOW}curl command not available, skipping API test${NC}"
    API_WORKING=false
    AUTH_WORKING=false
fi
echo ""

# Diagnosis summary
echo -e "${BLUE}${BOLD}=== Diagnosis Summary ===${NC}"
echo -e "1. MongoDB: $([ "$MONGODB_RUNNING" = true ] && echo "${GREEN}Running${NC}" || echo "${RED}Not running${NC}")"
echo -e "2. MongoDB Connection: $([ "$MONGODB_CONNECTION" = true ] && echo "${GREEN}Working${NC}" || echo "${RED}Not working${NC}")"
echo -e "3. Nginx: $([ "$NGINX_RUNNING" = true ] && echo "${GREEN}Running${NC}" || echo "${RED}Not running${NC}")"
echo -e "4. Nginx API Path: $([ "$NGINX_API_PATH" = true ] && echo "${GREEN}Correct${NC}" || echo "${RED}Incorrect${NC}")"
echo -e "5. PM2: $([ "$PM2_INSTALLED" = true ] && echo "${GREEN}Installed${NC}" || echo "${RED}Not installed${NC}")"
echo -e "6. PM2 Application: $([ "$PM2_RUNNING" = true ] && echo "${GREEN}Running${NC}" || echo "${RED}Not running${NC}")"
echo -e "7. PM2 Environment Variables: $([ "$PM2_ENV_VARS" = true ] && echo "${GREEN}Set${NC}" || echo "${RED}Not set${NC}")"
echo -e "8. Backend Server: $([ "$BACKEND_RUNNING" = true ] && echo "${GREEN}Running${NC}" || echo "${RED}Not running${NC}")"
echo -e "9. API Endpoint: $([ "$API_WORKING" = true ] && echo "${GREEN}Working${NC}" || echo "${RED}Not working${NC}")"
echo -e "10. Auth Endpoint: $([ "$AUTH_WORKING" = true ] && echo "${GREEN}Working${NC}" || echo "${RED}Not working${NC}")"
if [ "$NGINX_RUNNING" = true ]; then
    echo -e "11. Nginx API Endpoint: $([ "$NGINX_API_WORKING" = true ] && echo "${GREEN}Working${NC}" || echo "${RED}Not working${NC}")"
    echo -e "12. Nginx Auth Endpoint: $([ "$NGINX_AUTH_WORKING" = true ] && echo "${GREEN}Working${NC}" || echo "${RED}Not working${NC}")"
fi
echo ""

# Fix issues
echo -e "${BLUE}${BOLD}=== Recommended Fixes ===${NC}"

# Fix MongoDB
if [ "$MONGODB_RUNNING" = false ]; then
    echo -e "${RED}Issue: MongoDB is not running${NC}"
    if confirm "Would you like to fix this issue?"; then
        echo -e "${BLUE}Starting MongoDB...${NC}"
        systemctl start mongod
        if [ $? -eq 0 ]; then
            echo -e "${GREEN}MongoDB started successfully${NC}"
            MONGODB_RUNNING=true
        else
            echo -e "${RED}Failed to start MongoDB${NC}"
        fi
    fi
fi

# Fix MongoDB connection
if [ "$MONGODB_CONNECTION" = false ] && [ "$MONGODB_RUNNING" = true ]; then
    echo -e "${RED}Issue: MongoDB connection is not working${NC}"
    if confirm "Would you like to fix this issue?"; then
        run_fix_script "fix-mongodb-connection.sh" "fix MongoDB connection issues"
    fi
fi

# Fix Nginx
if [ "$NGINX_RUNNING" = false ]; then
    echo -e "${RED}Issue: Nginx is not running${NC}"
    if confirm "Would you like to fix this issue?"; then
        echo -e "${BLUE}Starting Nginx...${NC}"
        systemctl start nginx
        if [ $? -eq 0 ]; then
            echo -e "${GREEN}Nginx started successfully${NC}"
            NGINX_RUNNING=true
        else
            echo -e "${RED}Failed to start Nginx${NC}"
        fi
    fi
fi

# Fix Nginx API path
if [ "$NGINX_API_PATH" = false ] && [ "$NGINX_RUNNING" = true ]; then
    echo -e "${RED}Issue: Nginx API path is incorrect (double API path)${NC}"
    if confirm "Would you like to fix this issue?"; then
        run_fix_script "fix-nginx-api.sh" "fix Nginx API path issues"
    fi
fi

# Fix PM2
if [ "$PM2_INSTALLED" = false ]; then
    echo -e "${RED}Issue: PM2 is not installed${NC}"
    if confirm "Would you like to fix this issue?"; then
        echo -e "${BLUE}Installing PM2...${NC}"
        npm install -g pm2
        if [ $? -eq 0 ]; then
            echo -e "${GREEN}PM2 installed successfully${NC}"
            PM2_INSTALLED=true
        else
            echo -e "${RED}Failed to install PM2${NC}"
        fi
    fi
fi

# Fix PM2 application
if [ "$PM2_RUNNING" = false ] && [ "$PM2_INSTALLED" = true ]; then
    echo -e "${RED}Issue: Boxwise application is not running in PM2${NC}"
    if confirm "Would you like to fix this issue?"; then
        run_fix_script "start-backend.sh" "start the backend server"
    fi
fi

# Fix PM2 environment variables
if [ "$PM2_ENV_VARS" = false ] && [ "$PM2_RUNNING" = true ]; then
    echo -e "${RED}Issue: PM2 environment variables are not set${NC}"
    if confirm "Would you like to fix this issue?"; then
        run_fix_script "fix-pm2-env.sh" "fix PM2 environment variables"
    fi
fi

# Fix backend server
if [ "$BACKEND_RUNNING" = false ]; then
    echo -e "${RED}Issue: Backend server is not running${NC}"
    if confirm "Would you like to fix this issue?"; then
        run_fix_script "start-backend.sh" "start the backend server"
    fi
fi

# Fix API connectivity
if [ "$API_WORKING" = false ] && [ "$BACKEND_RUNNING" = true ]; then
    echo -e "${RED}Issue: API endpoint is not working${NC}"
    if confirm "Would you like to fix this issue?"; then
        run_fix_script "fix-production.sh" "fix production issues"
    fi
fi

# Final check
echo -e "${BLUE}${BOLD}=== Final Check ===${NC}"
echo -e "Running a final check to see if all issues have been resolved..."

# Test API connectivity again
if command -v curl &> /dev/null; then
    echo -e "${YELLOW}Testing connection to backend server on port 5001...${NC}"
    CURL_RESULT=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:5001/api/health 2>/dev/null || echo "Failed")
    
    if [ "$CURL_RESULT" = "200" ]; then
        echo -e "${GREEN}Backend API is responding on http://localhost:5001/api/health${NC}"
        FINAL_API_WORKING=true
    elif [ "$CURL_RESULT" = "Failed" ]; then
        echo -e "${RED}Could not connect to backend API on http://localhost:5001/api/health${NC}"
        FINAL_API_WORKING=false
    else
        echo -e "${YELLOW}Backend API responded with status code: $CURL_RESULT${NC}"
        FINAL_API_WORKING=false
    fi
    
    # Test auth endpoint
    echo -e "\n${YELLOW}Testing auth endpoint...${NC}"
    AUTH_RESULT=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:5001/api/auth/status 2>/dev/null || echo "Failed")
    
    if [ "$AUTH_RESULT" = "200" ] || [ "$AUTH_RESULT" = "401" ]; then
        echo -e "${GREEN}Auth endpoint is responding on http://localhost:5001/api/auth/status${NC}"
        echo -e "Status code: $AUTH_RESULT (401 is expected if not authenticated)"
        FINAL_AUTH_WORKING=true
    elif [ "$AUTH_RESULT" = "Failed" ]; then
        echo -e "${RED}Could not connect to auth endpoint on http://localhost:5001/api/auth/status${NC}"
        FINAL_AUTH_WORKING=false
    else
        echo -e "${YELLOW}Auth endpoint responded with status code: $AUTH_RESULT${NC}"
        FINAL_AUTH_WORKING=false
    fi
    
    # Test Nginx API endpoint
    if [ "$NGINX_RUNNING" = true ]; then
        echo -e "\n${YELLOW}Testing Nginx API endpoint...${NC}"
        NGINX_API_RESULT=$(curl -s -o /dev/null -w "%{http_code}" http://localhost/api/health 2>/dev/null || echo "Failed")
        
        if [ "$NGINX_API_RESULT" = "200" ]; then
            echo -e "${GREEN}Nginx API endpoint is responding on http://localhost/api/health${NC}"
            FINAL_NGINX_API_WORKING=true
        elif [ "$NGINX_API_RESULT" = "Failed" ]; then
            echo -e "${RED}Could not connect to Nginx API endpoint on http://localhost/api/health${NC}"
            FINAL_NGINX_API_WORKING=false
        else
            echo -e "${YELLOW}Nginx API endpoint responded with status code: $NGINX_API_RESULT${NC}"
            FINAL_NGINX_API_WORKING=false
        fi
        
        # Test Nginx auth endpoint
        echo -e "\n${YELLOW}Testing Nginx auth endpoint...${NC}"
        NGINX_AUTH_RESULT=$(curl -s -o /dev/null -w "%{http_code}" http://localhost/api/auth/status 2>/dev/null || echo "Failed")
        
        if [ "$NGINX_AUTH_RESULT" = "200" ] || [ "$NGINX_AUTH_RESULT" = "401" ]; then
            echo -e "${GREEN}Nginx auth endpoint is responding on http://localhost/api/auth/status${NC}"
            echo -e "Status code: $NGINX_AUTH_RESULT (401 is expected if not authenticated)"
            FINAL_NGINX_AUTH_WORKING=true
        elif [ "$NGINX_AUTH_RESULT" = "Failed" ]; then
            echo -e "${RED}Could not connect to Nginx auth endpoint on http://localhost/api/auth/status${NC}"
            FINAL_NGINX_AUTH_WORKING=false
        else
            echo -e "${YELLOW}Nginx auth endpoint responded with status code: $NGINX_AUTH_RESULT${NC}"
            FINAL_NGINX_AUTH_WORKING=false
        fi
    fi
else
    echo -e "${YELLOW}curl command not available, skipping API test${NC}"
    FINAL_API_WORKING=false
    FINAL_AUTH_WORKING=false
fi
echo ""

# Final summary
echo -e "${BLUE}${BOLD}=== Final Summary ===${NC}"
if [ "$FINAL_API_WORKING" = true ] && [ "$FINAL_AUTH_WORKING" = true ]; then
    if [ "$NGINX_RUNNING" = true ]; then
        if [ "$FINAL_NGINX_API_WORKING" = true ] && [ "$FINAL_NGINX_AUTH_WORKING" = true ]; then
            echo -e "${GREEN}${BOLD}All issues have been resolved!${NC}"
            echo -e "The application should now be working properly."
            echo -e "You should be able to access the application and log in."
        else
            echo -e "${YELLOW}${BOLD}Backend API is working, but Nginx API is not.${NC}"
            echo -e "You may need to check your Nginx configuration."
            echo -e "Try running the fix-nginx-api.sh script again."
        fi
    else
        echo -e "${GREEN}${BOLD}Backend API is working!${NC}"
        echo -e "The application should now be working properly."
        echo -e "You should be able to access the application directly at http://localhost:5001"
    fi
else
    echo -e "${RED}${BOLD}Some issues still remain.${NC}"
    echo -e "Here are some additional things to try:"
    echo -e "1. Check if MongoDB is running and accessible"
    echo -e "2. Check if the backend server is running with: pm2 list"
    echo -e "3. Check the backend server logs with: pm2 logs boxwise"
    echo -e "4. Make sure the environment variables are set correctly in server/.env"
    echo -e "5. Try restarting the backend server with: pm2 restart boxwise"
    echo -e "6. Check if there are any other issues in the Nginx error logs:"
    echo -e "   tail -n 100 /var/log/nginx/error.log"
    echo -e "7. Run the boxwise-menu.sh script and try other diagnostic tools"
fi

echo -e "${GREEN}${BOLD}Boxwise Doctor completed!${NC}"

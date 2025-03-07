#!/bin/bash

# Boxwise Start Backend Script
# This script focuses specifically on starting the backend server

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

echo -e "${BLUE}${BOLD}=== Boxwise Start Backend Script ===${NC}"
echo -e "${BLUE}Current directory: ${SCRIPT_DIR}${NC}"
echo ""

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    echo -e "${YELLOW}Warning: This script may need root privileges for some operations.${NC}"
    echo -e "Consider running with sudo if you encounter permission issues."
    echo ""
fi

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

# Check MongoDB status
echo -e "${BLUE}${BOLD}Checking MongoDB status...${NC}"
if systemctl is-active --quiet mongod; then
    echo -e "${GREEN}MongoDB is running${NC}"
else
    echo -e "${RED}MongoDB is not running${NC}"
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
        MONGO_URI="mongodb://localhost:27017/boxwise"
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
        PORT=5001
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
    PORT=5001
    MONGO_URI="mongodb://localhost:27017/boxwise"
fi
echo ""

# Check if port 5001 is already in use
echo -e "${BLUE}${BOLD}Checking if port $PORT is in use...${NC}"
if check_port $PORT; then
    echo -e "${YELLOW}Port $PORT is already in use${NC}"
    echo -e "This could mean that:"
    echo -e "1. The backend server is already running"
    echo -e "2. Another application is using port $PORT"
    
    # Check if it's the backend server
    if command -v pm2 &> /dev/null && pm2 list | grep -q "boxwise"; then
        echo -e "${GREEN}Boxwise application is running in PM2${NC}"
        echo -e "PM2 status for Boxwise:"
        pm2 list | grep -A 1 -B 1 "boxwise"
        
        echo -e "${YELLOW}Would you like to restart the backend server? (y/n)${NC}"
        read -r answer
        if [[ "$answer" =~ ^[Yy]$ ]]; then
            echo -e "${BLUE}Restarting Boxwise with PM2...${NC}"
            pm2 restart boxwise
            if [ $? -eq 0 ]; then
                echo -e "${GREEN}Boxwise restarted successfully with PM2${NC}"
                pm2 save
            else
                echo -e "${RED}Failed to restart Boxwise with PM2${NC}"
            fi
        fi
    else
        echo -e "${RED}Could not determine what is using port $PORT${NC}"
        echo -e "${YELLOW}Would you like to try to kill the process using port $PORT? (y/n)${NC}"
        read -r answer
        if [[ "$answer" =~ ^[Yy]$ ]]; then
            if command -v lsof &> /dev/null; then
                PID=$(lsof -t -i:$PORT)
                if [ -n "$PID" ]; then
                    echo -e "${BLUE}Killing process $PID using port $PORT...${NC}"
                    kill -9 $PID
                    if [ $? -eq 0 ]; then
                        echo -e "${GREEN}Process killed successfully${NC}"
                    else
                        echo -e "${RED}Failed to kill process${NC}"
                    fi
                else
                    echo -e "${RED}Could not find process using port $PORT${NC}"
                fi
            else
                echo -e "${RED}lsof command not found, cannot determine process using port $PORT${NC}"
            fi
        fi
    fi
else
    echo -e "${GREEN}Port $PORT is available${NC}"
fi
echo ""

# Test MongoDB connection
echo -e "${BLUE}${BOLD}Testing MongoDB connection...${NC}"
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
    exit 1
fi

# Run the test script
echo -e "${BLUE}Testing MongoDB connection...${NC}"
node test-mongo.js

# Check if the test was successful
MONGO_TEST_RESULT=$?
if [ $MONGO_TEST_RESULT -eq 0 ]; then
    echo -e "${GREEN}MongoDB connection test successful${NC}"
    MONGO_WORKING=true
else
    echo -e "${RED}MongoDB connection test failed${NC}"
    echo -e "Please check if MongoDB is running and accessible at $MONGO_URI"
    MONGO_WORKING=false
fi

# Clean up
cd "$SCRIPT_DIR"
rm -rf "$TEMP_DIR"
echo ""

# Start the backend server
echo -e "${BLUE}${BOLD}Starting the backend server...${NC}"

# Check if PM2 is installed
if command -v pm2 &> /dev/null; then
    echo -e "${GREEN}PM2 is installed${NC}"
    
    # Check if the backend server is already running with PM2
    if pm2 list | grep -q "boxwise"; then
        echo -e "${YELLOW}Boxwise application is already running in PM2${NC}"
        echo -e "PM2 status for Boxwise:"
        pm2 list | grep -A 1 -B 1 "boxwise"
        
        echo -e "${YELLOW}Would you like to restart the backend server? (y/n)${NC}"
        read -r answer
        if [[ "$answer" =~ ^[Yy]$ ]]; then
            echo -e "${BLUE}Restarting Boxwise with PM2...${NC}"
            pm2 restart boxwise
            if [ $? -eq 0 ]; then
                echo -e "${GREEN}Boxwise restarted successfully with PM2${NC}"
                pm2 save
            else
                echo -e "${RED}Failed to restart Boxwise with PM2${NC}"
            fi
        fi
    else
        echo -e "${YELLOW}Boxwise application is not running in PM2${NC}"
        
        # Check if ecosystem.config.js exists
        if [ -f "$SCRIPT_DIR/ecosystem.config.js" ]; then
            echo -e "${GREEN}ecosystem.config.js found${NC}"
            echo -e "${BLUE}Starting Boxwise with PM2 using ecosystem.config.js...${NC}"
            pm2 start ecosystem.config.js
            if [ $? -eq 0 ]; then
                echo -e "${GREEN}Boxwise started successfully with PM2${NC}"
                pm2 save
            else
                echo -e "${RED}Failed to start Boxwise with PM2 using ecosystem.config.js${NC}"
            fi
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
      PORT: $PORT,
      MONGO_URI: '$MONGO_URI',
      JWT_SECRET: '$(grep "^JWT_SECRET=" "$SCRIPT_DIR/server/.env" | cut -d= -f2-)'
    },
    watch: false,
    max_memory_restart: '500M'
  }]
};
EOF
            echo -e "${GREEN}Created ecosystem.config.js${NC}"
            echo -e "${BLUE}Starting Boxwise with PM2 using the new ecosystem.config.js...${NC}"
            pm2 start ecosystem.config.js
            if [ $? -eq 0 ]; then
                echo -e "${GREEN}Boxwise started successfully with PM2${NC}"
                pm2 save
            else
                echo -e "${RED}Failed to start Boxwise with PM2 using the new ecosystem.config.js${NC}"
                
                # Try starting directly
                echo -e "${YELLOW}Trying to start the backend server directly with PM2...${NC}"
                cd "$SCRIPT_DIR/server"
                pm2 start src/index.js --name boxwise -- --env production
                if [ $? -eq 0 ]; then
                    echo -e "${GREEN}Boxwise started successfully with PM2${NC}"
                    pm2 save
                else
                    echo -e "${RED}Failed to start Boxwise with PM2 directly${NC}"
                fi
                cd "$SCRIPT_DIR"
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
            
            # Start the backend server with PM2
            echo -e "${BLUE}Starting Boxwise with PM2...${NC}"
            cd "$SCRIPT_DIR/server"
            pm2 start src/index.js --name boxwise -- --env production
            if [ $? -eq 0 ]; then
                echo -e "${GREEN}Boxwise started successfully with PM2${NC}"
                pm2 save
            else
                echo -e "${RED}Failed to start Boxwise with PM2${NC}"
            fi
            cd "$SCRIPT_DIR"
        else
            echo -e "${RED}Failed to install PM2${NC}"
            echo -e "Please install PM2 manually with: npm install -g pm2"
        fi
    else
        echo -e "${YELLOW}Skipping PM2 installation${NC}"
        
        # Try to start the backend server directly
        echo -e "${BLUE}Starting the backend server directly...${NC}"
        cd "$SCRIPT_DIR/server"
        echo -e "${YELLOW}Running: NODE_ENV=production PORT=$PORT MONGO_URI=$MONGO_URI node src/index.js &${NC}"
        NODE_ENV=production PORT=$PORT MONGO_URI=$MONGO_URI node src/index.js > "$SCRIPT_DIR/server.log" 2>&1 &
        BACKEND_PID=$!
        echo $BACKEND_PID > "$SCRIPT_DIR/server.pid"
        echo -e "${GREEN}Backend server started with PID $BACKEND_PID${NC}"
        echo -e "${YELLOW}Logs are being written to $SCRIPT_DIR/server.log${NC}"
        cd "$SCRIPT_DIR"
    fi
fi
echo ""

# Wait for the backend server to start
echo -e "${BLUE}${BOLD}Waiting for the backend server to start...${NC}"
echo -e "${YELLOW}This may take a few seconds...${NC}"
sleep 5
echo ""

# Test the backend server
echo -e "${BLUE}${BOLD}Testing the backend server...${NC}"
if command -v curl &> /dev/null; then
    echo -e "${YELLOW}Testing connection to backend server on port $PORT...${NC}"
    CURL_RESULT=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:$PORT/api/health 2>/dev/null || echo "Failed")
    
    if [ "$CURL_RESULT" = "200" ]; then
        echo -e "${GREEN}Backend API is responding on http://localhost:$PORT/api/health${NC}"
        BACKEND_WORKING=true
    elif [ "$CURL_RESULT" = "Failed" ]; then
        echo -e "${RED}Could not connect to backend API on http://localhost:$PORT/api/health${NC}"
        echo -e "The backend server might not be running or might be listening on a different port"
        BACKEND_WORKING=false
    else
        echo -e "${YELLOW}Backend API responded with status code: $CURL_RESULT${NC}"
        BACKEND_WORKING=false
    fi
    
    # Test auth endpoint
    echo -e "\n${YELLOW}Testing auth endpoint...${NC}"
    AUTH_RESULT=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:$PORT/api/auth/status 2>/dev/null || echo "Failed")
    
    if [ "$AUTH_RESULT" = "200" ] || [ "$AUTH_RESULT" = "401" ]; then
        echo -e "${GREEN}Auth endpoint is responding on http://localhost:$PORT/api/auth/status${NC}"
        echo -e "Status code: $AUTH_RESULT (401 is expected if not authenticated)"
        AUTH_WORKING=true
    elif [ "$AUTH_RESULT" = "Failed" ]; then
        echo -e "${RED}Could not connect to auth endpoint on http://localhost:$PORT/api/auth/status${NC}"
        AUTH_WORKING=false
    else
        echo -e "${YELLOW}Auth endpoint responded with status code: $AUTH_RESULT${NC}"
        AUTH_WORKING=false
    fi
else
    echo -e "${YELLOW}curl command not available, skipping API test${NC}"
    BACKEND_WORKING=false
    AUTH_WORKING=false
fi
echo ""

# Check logs if the backend server is not working
if [ "$BACKEND_WORKING" = false ]; then
    echo -e "${BLUE}${BOLD}Checking backend server logs...${NC}"
    
    # Check PM2 logs if using PM2
    if command -v pm2 &> /dev/null && pm2 list | grep -q "boxwise"; then
        echo -e "${YELLOW}Checking PM2 logs for Boxwise...${NC}"
        pm2 logs boxwise --lines 20 --nostream
    elif [ -f "$SCRIPT_DIR/server.log" ]; then
        echo -e "${YELLOW}Checking server.log...${NC}"
        tail -n 20 "$SCRIPT_DIR/server.log"
    else
        echo -e "${RED}No logs found${NC}"
    fi
    echo ""
fi

# Summary
echo -e "${BLUE}${BOLD}=== Summary ===${NC}"
echo -e "1. MongoDB: $([ "$MONGO_WORKING" = true ] && echo "${GREEN}Working${NC}" || echo "${RED}Not working${NC}")"
echo -e "2. Backend server: $([ "$BACKEND_WORKING" = true ] && echo "${GREEN}Working${NC}" || echo "${RED}Not working${NC}")"
echo -e "3. Auth endpoint: $([ "$AUTH_WORKING" = true ] && echo "${GREEN}Working${NC}" || echo "${RED}Not working${NC}")"
echo ""

# Next steps
echo -e "${BLUE}${BOLD}Next steps:${NC}"
if [ "$BACKEND_WORKING" = true ] && [ "$AUTH_WORKING" = true ]; then
    echo -e "${GREEN}The backend server is running and responding to requests.${NC}"
    echo -e "You should now be able to access the application at http://localhost:3000"
    echo -e "If you're still experiencing issues, check the Nginx configuration with:"
    echo -e "  ./check-api.sh"
else
    echo -e "${RED}The backend server is not working properly.${NC}"
    echo -e "Here are some things to try:"
    echo -e "1. Check if MongoDB is running and accessible"
    echo -e "2. Check if the backend server is running with: pm2 list"
    echo -e "3. Check the backend server logs with: pm2 logs boxwise"
    echo -e "4. Make sure the environment variables are set correctly in server/.env"
    echo -e "5. Try restarting the backend server with: pm2 restart boxwise"
    echo -e "6. If all else fails, try reinstalling dependencies:"
    echo -e "   cd server && npm install && cd .."
fi
echo ""

echo -e "${GREEN}${BOLD}Start Backend Script completed!${NC}"

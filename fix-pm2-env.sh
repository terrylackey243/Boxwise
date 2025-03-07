#!/bin/bash

# Boxwise Fix PM2 Environment Variables Script
# This script fixes environment variables in PM2 configuration

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

echo -e "${BLUE}${BOLD}=== Boxwise Fix PM2 Environment Variables ===${NC}"
echo -e "${BLUE}Current directory: ${SCRIPT_DIR}${NC}"
echo ""

# Check if PM2 is installed
if ! command -v pm2 &> /dev/null; then
    echo -e "${RED}PM2 is not installed${NC}"
    echo -e "${YELLOW}Would you like to install PM2? (y/n)${NC}"
    read -r answer
    if [[ "$answer" =~ ^[Yy]$ ]]; then
        echo -e "${BLUE}Installing PM2...${NC}"
        npm install -g pm2
        if [ $? -ne 0 ]; then
            echo -e "${RED}Failed to install PM2${NC}"
            echo -e "Please install PM2 manually with: npm install -g pm2"
            exit 1
        fi
        echo -e "${GREEN}PM2 installed successfully${NC}"
    else
        echo -e "${YELLOW}Skipping PM2 installation${NC}"
        echo -e "This script requires PM2 to function. Please install PM2 and run this script again."
        exit 1
    fi
fi

# Check if the application is running with PM2
if ! pm2 list | grep -q "boxwise"; then
    echo -e "${RED}Boxwise application is not running with PM2${NC}"
    echo -e "${YELLOW}Would you like to start the Boxwise application with PM2? (y/n)${NC}"
    read -r answer
    if [[ "$answer" =~ ^[Yy]$ ]]; then
        echo -e "${BLUE}Starting Boxwise with PM2...${NC}"
        if [ -f "$SCRIPT_DIR/ecosystem.config.js" ]; then
            pm2 start ecosystem.config.js
        else
            echo -e "${YELLOW}ecosystem.config.js not found, creating a basic one...${NC}"
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
            echo -e "${GREEN}Created ecosystem.config.js${NC}"
            pm2 start ecosystem.config.js
        fi
        
        if [ $? -ne 0 ]; then
            echo -e "${RED}Failed to start Boxwise with PM2${NC}"
            exit 1
        fi
        echo -e "${GREEN}Boxwise started successfully with PM2${NC}"
        pm2 save
    else
        echo -e "${YELLOW}Skipping Boxwise startup${NC}"
        echo -e "This script requires the Boxwise application to be running with PM2."
        exit 1
    fi
fi

# Get environment variables from .env file
echo -e "${BLUE}${BOLD}Reading environment variables from .env file...${NC}"
if [ -f "$SCRIPT_DIR/server/.env" ]; then
    MONGO_URI=$(grep "^MONGO_URI=" "$SCRIPT_DIR/server/.env" | cut -d= -f2-)
    JWT_SECRET=$(grep "^JWT_SECRET=" "$SCRIPT_DIR/server/.env" | cut -d= -f2-)
    PORT=$(grep "^PORT=" "$SCRIPT_DIR/server/.env" | cut -d= -f2-)
    
    if [ -z "$MONGO_URI" ]; then
        MONGO_URI="mongodb://localhost:27017/boxwise"
        echo -e "${YELLOW}MONGO_URI not found in .env, using default: $MONGO_URI${NC}"
    else
        echo -e "${GREEN}MONGO_URI found in .env: $MONGO_URI${NC}"
    fi
    
    if [ -z "$JWT_SECRET" ]; then
        JWT_SECRET="boxwise_jwt_secret_$(openssl rand -hex 12)"
        echo -e "${YELLOW}JWT_SECRET not found in .env, generating a new one${NC}"
    else
        echo -e "${GREEN}JWT_SECRET found in .env${NC}"
    fi
    
    if [ -z "$PORT" ]; then
        PORT=5001
        echo -e "${YELLOW}PORT not found in .env, using default: $PORT${NC}"
    else
        echo -e "${GREEN}PORT found in .env: $PORT${NC}"
    fi
else
    echo -e "${RED}server/.env file not found${NC}"
    MONGO_URI="mongodb://localhost:27017/boxwise"
    JWT_SECRET="boxwise_jwt_secret_$(openssl rand -hex 12)"
    PORT=5001
    echo -e "${YELLOW}Using default environment variables${NC}"
fi

# Update environment variables in PM2
echo -e "${BLUE}${BOLD}Updating environment variables in PM2...${NC}"
echo -e "${YELLOW}Setting MONGO_URI=$MONGO_URI${NC}"
echo -e "${YELLOW}Setting JWT_SECRET=[hidden]${NC}"
echo -e "${YELLOW}Setting PORT=$PORT${NC}"
echo -e "${YELLOW}Setting NODE_ENV=production${NC}"

# Set environment variables directly in PM2
pm2 set boxwise:MONGO_URI $MONGO_URI
pm2 set boxwise:JWT_SECRET $JWT_SECRET
pm2 set boxwise:PORT $PORT
pm2 set boxwise:NODE_ENV production

# Create a temporary script to update the ecosystem.config.js file
echo -e "${BLUE}${BOLD}Creating a new ecosystem.config.js file...${NC}"
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

echo -e "${GREEN}Created new ecosystem.config.js file${NC}"

# Restart the application with the new environment variables
echo -e "${BLUE}${BOLD}Restarting the application with the new environment variables...${NC}"
pm2 delete boxwise
pm2 start ecosystem.config.js --update-env
pm2 save

echo -e "${GREEN}Application restarted with new environment variables${NC}"

# Create a direct test script to verify environment variables
echo -e "${BLUE}${BOLD}Creating a test script to verify environment variables...${NC}"
TEMP_DIR=$(mktemp -d)
cat > "$TEMP_DIR/test-env.js" << EOF
// Test script to verify environment variables
console.log('Environment variables:');
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('PORT:', process.env.PORT);
console.log('MONGO_URI:', process.env.MONGO_URI);
console.log('JWT_SECRET:', process.env.JWT_SECRET ? '[set]' : '[not set]');

const mongoose = require('mongoose');

// Log the MongoDB URI
console.log('Attempting to connect to MongoDB at:', process.env.MONGO_URI);

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI, {
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
  "name": "boxwise-test-env",
  "version": "1.0.0",
  "description": "Script to test environment variables",
  "main": "test-env.js",
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

# Run the test script with PM2 environment variables
echo -e "${BLUE}${BOLD}Testing environment variables with PM2...${NC}"
cd "$SCRIPT_DIR"
pm2 start "$TEMP_DIR/test-env.js" --name test-env --env production
sleep 2
pm2 logs test-env --lines 20 --nostream
pm2 delete test-env

# Clean up
rm -rf "$TEMP_DIR"

# Wait for the application to start
echo -e "${BLUE}${BOLD}Waiting for the application to start...${NC}"
echo -e "${YELLOW}This may take a few seconds...${NC}"
sleep 5

# Test the API
echo -e "${BLUE}${BOLD}Testing the API...${NC}"
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

# Check logs if the backend server is not working
if [ "$BACKEND_WORKING" = false ]; then
    echo -e "${BLUE}${BOLD}Checking backend server logs...${NC}"
    pm2 logs boxwise --lines 20 --nostream
fi

# Summary
echo -e "${BLUE}${BOLD}=== Summary ===${NC}"
if [ "$BACKEND_WORKING" = true ] && [ "$AUTH_WORKING" = true ]; then
    echo -e "${GREEN}The environment variables have been successfully updated and the API is working!${NC}"
    echo -e "You should now be able to access the application and log in."
else
    echo -e "${RED}The API is still not working properly.${NC}"
    echo -e "Here are some additional things to try:"
    echo -e "1. Check the server code to see how it's accessing environment variables"
    echo -e "2. Try modifying the server code to directly use the MongoDB URI:"
    echo -e "   - Edit server/src/index.js or the file that connects to MongoDB"
    echo -e "   - Replace mongoose.connect(process.env.MONGO_URI, ...) with mongoose.connect('$MONGO_URI', ...)"
    echo -e "3. Try reinstalling server dependencies:"
    echo -e "   cd server && npm install && cd .."
    echo -e "4. Check if there are any other issues in the server logs:"
    echo -e "   pm2 logs boxwise"
fi

echo -e "${GREEN}${BOLD}Fix PM2 Environment Variables Script completed!${NC}"

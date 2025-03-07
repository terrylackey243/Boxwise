#!/bin/bash

# Boxwise Fix MongoDB Connection Script
# This script fixes the MongoDB connection issue in the production environment

# ANSI color codes
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Get the script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
cd "$SCRIPT_DIR"

# Default MongoDB URI
DEFAULT_MONGO_URI="mongodb://localhost:27017/boxwise"

# Display help
function show_help {
    echo "Boxwise Fix MongoDB Connection Script"
    echo "Usage: $0 [options]"
    echo ""
    echo "Options:"
    echo "  -u, --uri URI             MongoDB URI (default: $DEFAULT_MONGO_URI)"
    echo "  -h, --help                Show this help message"
    echo ""
    echo "Example:"
    echo "  $0 -u mongodb://localhost:27017/boxwise"
    exit 1
}

# Parse command line arguments
MONGO_URI="$DEFAULT_MONGO_URI"
while [[ $# -gt 0 ]]; do
    case "$1" in
        -u|--uri)
            MONGO_URI="$2"
            shift 2
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

echo -e "${BLUE}=== Boxwise Fix MongoDB Connection ===${NC}"
echo -e "MongoDB URI: ${GREEN}$MONGO_URI${NC}"
echo ""

# Check if the server environment file exists
if [ ! -f "$SCRIPT_DIR/server/.env" ]; then
    echo -e "${RED}Error: Server environment file not found at $SCRIPT_DIR/server/.env${NC}"
    echo -e "Creating a new environment file from .env.production..."
    
    if [ -f "$SCRIPT_DIR/server/.env.production" ]; then
        cp "$SCRIPT_DIR/server/.env.production" "$SCRIPT_DIR/server/.env"
        echo -e "${GREEN}Created server environment file from .env.production${NC}"
    else
        echo -e "${RED}Error: .env.production file not found${NC}"
        echo -e "Creating a new environment file with default values..."
        
        cat > "$SCRIPT_DIR/server/.env" << EOF
NODE_ENV=production
PORT=5001
MONGO_URI=$MONGO_URI
JWT_SECRET=boxwise_jwt_secret_$(openssl rand -hex 12)
EOF
        echo -e "${GREEN}Created new server environment file with default values${NC}"
    fi
else
    echo -e "${GREEN}Found server environment file at $SCRIPT_DIR/server/.env${NC}"
fi

# Check if MONGO_URI is already set in the environment file
if grep -q "^MONGO_URI=" "$SCRIPT_DIR/server/.env"; then
    echo -e "${YELLOW}MONGO_URI is already set in the environment file${NC}"
    CURRENT_URI=$(grep "^MONGO_URI=" "$SCRIPT_DIR/server/.env" | cut -d= -f2-)
    
    if [ "$CURRENT_URI" = "$MONGO_URI" ]; then
        echo -e "Current URI matches the provided URI: ${GREEN}$MONGO_URI${NC}"
    else
        echo -e "Current URI: ${RED}$CURRENT_URI${NC}"
        echo -e "Provided URI: ${GREEN}$MONGO_URI${NC}"
        
        read -p "Do you want to update the MONGO_URI? (y/n) " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            # Update the MONGO_URI in the environment file
            sed -i "s|^MONGO_URI=.*|MONGO_URI=$MONGO_URI|" "$SCRIPT_DIR/server/.env"
            echo -e "${GREEN}Updated MONGO_URI in the environment file${NC}"
        else
            echo -e "${YELLOW}Keeping the current MONGO_URI${NC}"
        fi
    fi
else
    echo -e "${RED}MONGO_URI is not set in the environment file${NC}"
    echo -e "Adding MONGO_URI to the environment file..."
    
    # Add MONGO_URI to the environment file
    echo "MONGO_URI=$MONGO_URI" >> "$SCRIPT_DIR/server/.env"
    echo -e "${GREEN}Added MONGO_URI to the environment file${NC}"
fi

# Check if JWT_SECRET is set in the environment file
if ! grep -q "^JWT_SECRET=" "$SCRIPT_DIR/server/.env"; then
    echo -e "${YELLOW}JWT_SECRET is not set in the environment file${NC}"
    echo -e "Adding JWT_SECRET to the environment file..."
    
    # Generate a random JWT secret
    JWT_SECRET="boxwise_jwt_secret_$(openssl rand -hex 12)"
    
    # Add JWT_SECRET to the environment file
    echo "JWT_SECRET=$JWT_SECRET" >> "$SCRIPT_DIR/server/.env"
    echo -e "${GREEN}Added JWT_SECRET to the environment file${NC}"
fi

# Check if NODE_ENV is set to production
if ! grep -q "^NODE_ENV=production" "$SCRIPT_DIR/server/.env"; then
    echo -e "${YELLOW}NODE_ENV is not set to production in the environment file${NC}"
    
    # Check if NODE_ENV is set to something else
    if grep -q "^NODE_ENV=" "$SCRIPT_DIR/server/.env"; then
        echo -e "Updating NODE_ENV to production..."
        sed -i "s|^NODE_ENV=.*|NODE_ENV=production|" "$SCRIPT_DIR/server/.env"
    else
        echo -e "Adding NODE_ENV=production to the environment file..."
        echo "NODE_ENV=production" >> "$SCRIPT_DIR/server/.env"
    fi
    
    echo -e "${GREEN}Set NODE_ENV to production in the environment file${NC}"
fi

# Check if PORT is set in the environment file
if ! grep -q "^PORT=" "$SCRIPT_DIR/server/.env"; then
    echo -e "${YELLOW}PORT is not set in the environment file${NC}"
    echo -e "Adding PORT=5001 to the environment file..."
    
    # Add PORT to the environment file
    echo "PORT=5001" >> "$SCRIPT_DIR/server/.env"
    echo -e "${GREEN}Added PORT=5001 to the environment file${NC}"
fi

echo -e "\n${BLUE}Environment file content:${NC}"
cat "$SCRIPT_DIR/server/.env" | sed 's/^/  /'

echo -e "\n${BLUE}Checking MongoDB connection...${NC}"
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
if [ $? -eq 0 ]; then
    echo -e "${GREEN}MongoDB connection test successful${NC}"
else
    echo -e "${RED}MongoDB connection test failed${NC}"
    echo -e "Please check if MongoDB is running and accessible at $MONGO_URI"
    echo -e "You can start MongoDB with: sudo systemctl start mongod"
fi

# Clean up
cd "$SCRIPT_DIR"
rm -rf "$TEMP_DIR"

echo -e "\n${BLUE}Restarting the application...${NC}"
if [ -f "$SCRIPT_DIR/restart-production.sh" ]; then
    read -p "Do you want to restart the application now? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        bash "$SCRIPT_DIR/restart-production.sh"
        echo -e "${GREEN}Application restarted${NC}"
    else
        echo -e "${YELLOW}Skipping application restart${NC}"
        echo -e "You should restart the application manually to apply the changes:"
        echo -e "  ./restart-production.sh"
    fi
else
    echo -e "${YELLOW}restart-production.sh script not found${NC}"
    echo -e "You should restart the application manually to apply the changes:"
    
    if command -v pm2 &> /dev/null && pm2 list | grep -q "boxwise"; then
        echo -e "  pm2 restart boxwise"
    else
        echo -e "  Stop and start the application using your preferred method"
    fi
fi

echo -e "\n${BLUE}=== MongoDB Connection Fix Completed ===${NC}"
echo -e "To verify that the fix worked, run:"
echo -e "  ./check-api.sh"
echo -e "  pm2 logs boxwise"
echo ""

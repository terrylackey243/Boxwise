#!/bin/bash

# Boxwise Get Database URL Script
# This script returns the MongoDB connection URL from the server's environment file

# ANSI color codes
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Get the script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
cd "$SCRIPT_DIR"

echo -e "${BLUE}=== Boxwise Database Connection Information ===${NC}"
echo ""

# Check which environment is being used
if [ -f "$SCRIPT_DIR/server/.env" ]; then
    ENV_FILE="$SCRIPT_DIR/server/.env"
    
    # Try to determine if it's production or development
    if grep -q "NODE_ENV=production" "$ENV_FILE"; then
        echo -e "Current environment: ${GREEN}Production${NC}"
    elif grep -q "NODE_ENV=development" "$ENV_FILE"; then
        echo -e "Current environment: ${YELLOW}Development${NC}"
    else
        echo -e "Current environment: ${YELLOW}Unknown${NC}"
    fi
else
    echo -e "${RED}Error: No .env file found in server directory${NC}"
    echo -e "Creating a temporary .env file from .env.production..."
    cp "$SCRIPT_DIR/server/.env.production" "$SCRIPT_DIR/server/.env.temp"
    ENV_FILE="$SCRIPT_DIR/server/.env.temp"
    echo -e "Current environment: ${YELLOW}Production (from template)${NC}"
fi

echo ""

# Extract MongoDB URI from the environment file
MONGO_URI=$(grep -E "^MONGO_URI=" "$ENV_FILE" | cut -d= -f2-)

if [ -z "$MONGO_URI" ]; then
    echo -e "${YELLOW}No MONGO_URI found in $ENV_FILE${NC}"
    echo -e "Using default MongoDB connection: ${GREEN}mongodb://localhost:27017/boxwise${NC}"
    MONGO_URI="mongodb://localhost:27017/boxwise"
else
    echo -e "MongoDB connection URL: ${GREEN}$MONGO_URI${NC}"
fi

echo ""

# Create a temporary directory for the script
TEMP_DIR=$(mktemp -d)
echo -e "${BLUE}Creating temporary directory for database check: $TEMP_DIR${NC}"

# Create a simple script to test the database connection
cat > "$TEMP_DIR/test-db-connection.js" << EOF
const mongoose = require('mongoose');

// MongoDB connection
const MONGO_URI = '$MONGO_URI';

console.log(\`Attempting to connect to MongoDB at: \${MONGO_URI}\`);

// Connect to MongoDB
mongoose.connect(MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(async () => {
  console.log('Successfully connected to MongoDB');
  
  // Get database information
  const db = mongoose.connection.db;
  const stats = await db.stats();
  const collections = await db.listCollections().toArray();
  
  console.log(\`\nDatabase name: \${db.databaseName}\`);
  console.log(\`Database size: \${(stats.dataSize / (1024 * 1024)).toFixed(2)} MB\`);
  console.log(\`Number of collections: \${collections.length}\`);
  
  console.log('\nCollections:');
  collections.forEach(collection => {
    console.log(\`- \${collection.name}\`);
  });
  
  // Close the connection
  mongoose.connection.close();
  console.log('\nDisconnected from MongoDB');
})
.catch(err => {
  console.error('MongoDB connection error:', err);
  process.exit(1);
});
EOF

# Create a package.json file in the temporary directory
cat > "$TEMP_DIR/package.json" << EOF
{
  "name": "boxwise-db-check",
  "version": "1.0.0",
  "description": "Script to check MongoDB connection",
  "main": "test-db-connection.js",
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
    
    # Clean up temporary .env file if it was created
    if [ "$ENV_FILE" = "$SCRIPT_DIR/server/.env.temp" ]; then
        rm -f "$ENV_FILE"
    fi
    
    exit 1
fi

# Run the test script
echo -e "${BLUE}Testing database connection...${NC}"
node test-db-connection.js

# Clean up
cd "$SCRIPT_DIR"
echo -e "${BLUE}Cleaning up temporary directory...${NC}"
rm -rf "$TEMP_DIR"

# Clean up temporary .env file if it was created
if [ "$ENV_FILE" = "$SCRIPT_DIR/server/.env.temp" ]; then
    rm -f "$ENV_FILE"
fi

echo ""
echo -e "${BLUE}=== Database Connection Check Completed ===${NC}"

#!/bin/bash

# Boxwise Database Reset Script
# This script resets the database by dropping all collections and reinitializing with seed data

# Set colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Resetting Boxwise Database...${NC}"

# Get the absolute path to the project root directory
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# Stop MongoDB if it's running
if pgrep -f "mongod" > /dev/null; then
    echo -e "${YELLOW}MongoDB is running. Stopping MongoDB...${NC}"
    # Kill the MongoDB process
    pkill -f mongod || true
    sleep 3
    
    # Make sure it's really stopped
    if pgrep -f "mongod" > /dev/null; then
        echo -e "${YELLOW}MongoDB still running. Trying again with force...${NC}"
        pkill -9 -f mongod || true
        sleep 2
    fi
fi

# Clean up any lock files
if [ -f "${PROJECT_ROOT}/data/db/mongod.lock" ]; then
    echo -e "${YELLOW}Removing MongoDB lock file...${NC}"
    rm -f "${PROJECT_ROOT}/data/db/mongod.lock"
fi

# Start MongoDB
echo -e "${YELLOW}Starting MongoDB...${NC}"
mkdir -p "${PROJECT_ROOT}/data/db"
mkdir -p "${PROJECT_ROOT}/data/log"
mongod --dbpath "${PROJECT_ROOT}/data/db" --logpath "${PROJECT_ROOT}/data/log/mongod.log" --fork

# Check if MongoDB started successfully
if [ $? -ne 0 ]; then
    echo -e "${RED}Failed to start MongoDB. Check if the port is in use.${NC}"
    exit 1
else
    echo -e "${GREEN}MongoDB started successfully.${NC}"
fi

# Wait for MongoDB to be ready
echo -e "${YELLOW}Waiting for MongoDB to be ready...${NC}"
sleep 10

# Verify MongoDB is running and accepting connections
echo -e "${YELLOW}Verifying MongoDB connection...${NC}"
mongosh --quiet --eval "db.stats()" > /dev/null 2>&1
if [ $? -ne 0 ]; then
    echo -e "${RED}MongoDB is not accepting connections. Trying again...${NC}"
    sleep 5
    mongosh --quiet --eval "db.stats()" > /dev/null 2>&1
    if [ $? -ne 0 ]; then
        # Try one more time with the older mongo command
        mongo --eval "db.stats()" > /dev/null 2>&1
        if [ $? -ne 0 ]; then
            echo -e "${RED}MongoDB is still not accepting connections. Please check MongoDB logs.${NC}"
            echo -e "${YELLOW}Continuing anyway...${NC}"
        fi
    fi
fi
echo -e "${GREEN}MongoDB is ready.${NC}"

# Install dependencies if needed
echo -e "${YELLOW}Checking for dependencies...${NC}"
if [ ! -d "${PROJECT_ROOT}/scripts/node_modules/mongoose" ]; then
    echo -e "${YELLOW}Installing script dependencies...${NC}"
    cd "${PROJECT_ROOT}/scripts"
    npm install
fi

# Run the database initialization script
echo -e "${YELLOW}Running database initialization script...${NC}"
cd "${PROJECT_ROOT}"
node "${PROJECT_ROOT}/scripts/init-db.js"

if [ $? -ne 0 ]; then
    echo -e "${RED}Failed to initialize database.${NC}"
    exit 1
else
    echo -e "${GREEN}Database reset and initialized successfully.${NC}"
fi

echo -e "\n${GREEN}Database reset complete!${NC}"
echo -e "You can now start the application with ${YELLOW}./scripts/start.sh${NC}"

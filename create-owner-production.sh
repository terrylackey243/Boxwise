#!/bin/bash

# Boxwise Create Owner Script for Production
# This script creates an owner user in the Boxwise application on the production server

# ANSI color codes
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Get the script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
cd "$SCRIPT_DIR"

# Default values
EMAIL="terry@jknelotions.com"
PASSWORD="cde3CDE#vfr4VFR\$"
NAME="Terry"

# Display help
function show_help {
    echo "Boxwise Create Owner Script for Production"
    echo "Usage: $0 [options]"
    echo ""
    echo "Options:"
    echo "  -e, --email EMAIL         Email for the owner user (default: $EMAIL)"
    echo "  -p, --password PASSWORD   Password for the owner user (default: [hidden])"
    echo "  -n, --name NAME           Name for the owner user (default: $NAME)"
    echo "  -h, --help                Show this help message"
    echo ""
    echo "Example:"
    echo "  $0 -e admin@example.com -p securepassword -n 'Admin User'"
    exit 1
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case "$1" in
        -e|--email)
            EMAIL="$2"
            shift 2
            ;;
        -p|--password)
            PASSWORD="$2"
            shift 2
            ;;
        -n|--name)
            NAME="$2"
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

echo -e "${BLUE}=== Creating Owner User in Production ===${NC}"
echo -e "Email: ${GREEN}$EMAIL${NC}"
echo -e "Name: ${GREEN}$NAME${NC}"
echo -e "Password: ${GREEN}[hidden]${NC}"
echo ""

# Ensure we're using the production environment
echo -e "${BLUE}Setting up production environment...${NC}"
cp "$SCRIPT_DIR/server/.env.production" "$SCRIPT_DIR/server/.env"

# Check if MongoDB is running
echo -e "${BLUE}Checking MongoDB status...${NC}"
if ! pgrep -x "mongod" > /dev/null && ! systemctl is-active --quiet mongod 2>/dev/null; then
    echo -e "${RED}MongoDB is not running. Starting MongoDB...${NC}"
    # Try to start MongoDB - this might need sudo depending on your setup
    if command -v systemctl &> /dev/null; then
        sudo systemctl start mongod || echo -e "${RED}Failed to start MongoDB with systemctl. You may need to start it manually.${NC}"
    else
        echo -e "${RED}Could not start MongoDB automatically. Please start it manually.${NC}"
        echo "Typically: sudo service mongod start"
        echo "Or: mongod --dbpath=/path/to/data/db"
        exit 1
    fi
fi

# Run the create-owner.js script
echo -e "${BLUE}Creating owner user...${NC}"
cd "$SCRIPT_DIR/scripts"

# Check if the script exists
if [ ! -f "create-owner.js" ]; then
    echo -e "${RED}Error: create-owner.js script not found in $SCRIPT_DIR/scripts${NC}"
    exit 1
fi

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo -e "${RED}Error: Node.js is not installed${NC}"
    exit 1
fi

# Create a temporary directory for the script
TEMP_DIR=$(mktemp -d)
echo -e "${BLUE}Creating temporary directory for script: $TEMP_DIR${NC}"

# Copy the create-owner.js script to the temporary directory
cp create-owner.js "$TEMP_DIR/"

# Create a package.json file in the temporary directory
echo -e "${BLUE}Creating package.json with required dependencies...${NC}"
cat > "$TEMP_DIR/package.json" << EOF
{
  "name": "boxwise-create-owner",
  "version": "1.0.0",
  "description": "Script to create an owner user in Boxwise",
  "main": "create-owner.js",
  "dependencies": {
    "mongoose": "^7.0.3",
    "bcryptjs": "^2.4.3",
    "jsonwebtoken": "^9.0.0"
  }
}
EOF

# Change to the temporary directory
cd "$TEMP_DIR"

# Install dependencies
echo -e "${BLUE}Installing dependencies...${NC}"
npm install
if [ $? -ne 0 ]; then
    echo -e "${RED}Failed to install dependencies. Please check npm error messages above.${NC}"
    cd "$SCRIPT_DIR"
    rm -rf "$TEMP_DIR"
    exit 1
fi
echo -e "${GREEN}Dependencies installed successfully${NC}"

# Set the MongoDB URI environment variable
export MONGO_URI="mongodb://localhost:27017/boxwise"

# Run the script
echo -e "${BLUE}Running create-owner.js script...${NC}"
node create-owner.js "$EMAIL" "$PASSWORD" "$NAME"

# Clean up
cd "$SCRIPT_DIR"
echo -e "${BLUE}Cleaning up temporary directory...${NC}"
rm -rf "$TEMP_DIR"

# Check if the script was successful
if [ $? -eq 0 ]; then
    echo -e "${GREEN}Owner user created successfully!${NC}"
    echo -e "You can now log in to the application with:"
    echo -e "Email: ${GREEN}$EMAIL${NC}"
    echo -e "Password: ${GREEN}[hidden]${NC}"
else
    echo -e "${RED}Failed to create owner user. See error message above.${NC}"
    exit 1
fi

echo ""
echo -e "${BLUE}=== Owner User Creation Completed ===${NC}"

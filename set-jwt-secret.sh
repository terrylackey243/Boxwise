#!/bin/bash

# Script to set the JWT secret for Boxwise application

# Check if running as root
if [ "$(id -u)" != "0" ]; then
   echo "This script must be run as root" 1>&2
   exit 1
fi

# Function to display usage
usage() {
  echo "Usage: $0 [-s jwt_secret]"
  echo "  -s  JWT secret (optional, will generate one if not provided)"
  exit 1
}

# Parse command line arguments
JWT_SECRET=""
while getopts "s:" opt; do
  case $opt in
    s) JWT_SECRET="$OPTARG" ;;
    *) usage ;;
  esac
done

# Generate a JWT secret if not provided
if [ -z "$JWT_SECRET" ]; then
  echo "Generating a secure JWT secret..."
  JWT_SECRET=$(openssl rand -base64 32)
  echo "Generated JWT secret: $JWT_SECRET"
else
  echo "Using provided JWT secret"
fi

# Create a .env file with the JWT secret
echo "Creating .env file with JWT secret..."
cat > .env << EOF
# Server Configuration
PORT=5001
NODE_ENV=production

# MongoDB Connection
MONGO_URI=mongodb://mongodb:27017/boxwise

# JWT Secret for Authentication
JWT_SECRET=$JWT_SECRET
JWT_EXPIRE=30d

# Asset ID Configuration
ASSET_ID_AUTO_INCREMENT=true
ASSET_ID_PREFIX=000-

# File Upload Limits
MAX_FILE_SIZE=5000000
EOF

echo "JWT secret has been set in .env file"

# Export the JWT_SECRET for docker-compose
export JWT_SECRET

echo "JWT_SECRET environment variable has been exported"
echo "You can now run docker-compose up -d --build to apply the changes"

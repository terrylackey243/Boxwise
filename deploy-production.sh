#!/bin/bash

# Boxwise Production Deployment Script

# Exit on error
set -e

# Check if running as root
if [ "$(id -u)" != "0" ]; then
   echo "This script must be run as root" 1>&2
   exit 1
fi

# Function to display usage
usage() {
  echo "Usage: $0 [-u UPC_API_KEY]"
  echo "  -u  UPC API key (optional - using free trial version for now)"
  exit 1
}

# Parse command line arguments
UPC_API_KEY=""
while getopts "u:" opt; do
  case $opt in
    u) UPC_API_KEY="$OPTARG" ;;
    *) usage ;;
  esac
done

# Inform user about UPC API key status
if [ -z "$UPC_API_KEY" ]; then
  echo "Note: No UPC API key provided. Using free trial version."
else
  echo "UPC API key provided. Will configure in environment."
fi

# Set working directory
cd "$(dirname "$0")"

echo "Starting Boxwise production deployment..."

# Step 1: Generate JWT secret if not already set
echo "Generating JWT secret..."
./set-jwt-secret.sh

# Step 2: Update environment files and switch to production
if [ ! -z "$UPC_API_KEY" ]; then
  echo "Updating environment files with UPC API key..."
  # Uncomment the UPC_API_KEY line and set the value
  sed -i "s/# UPC_API_KEY=your_api_key_here/UPC_API_KEY=$UPC_API_KEY/" server/.env.production
fi

# Switch to production environment
echo "Switching to production environment..."
./switch-env.sh prod

# Step 3: Check if SSL certificates exist
if [ ! -f "nginx/ssl/cert.pem" ] || [ ! -f "nginx/ssl/key.pem" ]; then
  echo "SSL certificates not found. Generating self-signed certificates..."
  mkdir -p nginx/ssl
  openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
    -keyout nginx/ssl/key.pem -out nginx/ssl/cert.pem \
    -subj "/C=US/ST=State/L=City/O=Organization/CN=boxwise.app"
  echo "Self-signed certificates generated. Replace with proper certificates before going live."
else
  echo "SSL certificates found."
fi

# Step 4: Build and start the application
echo "Building and starting the application..."
docker-compose down
docker-compose up -d --build

# Step 5: Initialize the database if needed
echo "Checking if database initialization is needed..."
sleep 10 # Wait for MongoDB to start

# Try to initialize the database, with error handling for missing modules
if ! docker-compose exec -T app node scripts/init-db.js; then
  echo "Database initialization failed. Attempting to fix common issues..."
  
  # Check if the error is related to missing mongodb module
  if docker-compose logs app | grep -q "Cannot find module 'mongodb'"; then
    echo "MongoDB module not found in scripts directory. Installing..."
    docker-compose exec -T app sh -c "cd scripts && npm install mongodb"
    
    echo "Retrying database initialization..."
    docker-compose exec -T app node scripts/init-db.js
  else
    echo "Unknown error during database initialization. Check the logs for details."
    docker-compose logs app
  fi
fi

# Step 6: Set up backup cron job
echo "Setting up backup cron job..."
(crontab -l 2>/dev/null || echo "") | grep -v "backup.sh" | { cat; echo "0 2 * * * $(pwd)/backup.sh > /var/log/boxwise-backup.log 2>&1"; } | crontab -

echo "Deployment completed successfully!"
echo "Boxwise is now running at https://boxwise.app"
echo ""
echo "Next steps:"
echo "1. Replace self-signed SSL certificates with proper ones"
echo "2. Configure remote backup server in backup.sh"
echo "3. Set up monitoring and logging"
echo ""
echo "To check the status of the application, run: docker-compose ps"

#!/bin/bash

# Comprehensive script to fix deployment issues in Boxwise

# Exit on error
set -e

# Check if running as root
if [ "$(id -u)" != "0" ]; then
   echo "This script must be run as root" 1>&2
   exit 1
fi

# Set working directory
cd "$(dirname "$0")"

echo "Starting comprehensive deployment fix for Boxwise..."

# Step 1: Check environment variables
echo "Checking environment variables..."
if [ -z "$JWT_SECRET" ]; then
  echo "JWT_SECRET is not set. Generating a new one..."
  export JWT_SECRET=$(openssl rand -base64 32)
  echo "JWT_SECRET=$JWT_SECRET" > .env
  echo "JWT secret generated and saved to .env file."
fi

# Step 2: Update Nginx configuration
echo "Updating Nginx configuration..."
if [ -f "nginx/nginx.conf" ]; then
  # Get the server IP
  SERVER_IP=$(curl -s ifconfig.me)
  
  # Backup the original file
  cp nginx/nginx.conf nginx/nginx.conf.bak
  
  # Update server_name in both server blocks
  sed -i "s/server_name .*/server_name boxwise.app www.boxwise.app $SERVER_IP;/" nginx/nginx.conf
  
  echo "Nginx configuration updated to include server IP: $SERVER_IP"
else
  echo "Error: nginx/nginx.conf not found."
  exit 1
fi

# Step 3: Ensure SSL certificates exist
echo "Checking SSL certificates..."
if [ ! -f "nginx/ssl/cert.pem" ] || [ ! -f "nginx/ssl/key.pem" ]; then
  echo "SSL certificates not found. Generating self-signed certificates..."
  mkdir -p nginx/ssl
  openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
    -keyout nginx/ssl/key.pem -out nginx/ssl/cert.pem \
    -subj "/C=US/ST=State/L=City/O=Organization/CN=boxwise.app"
  echo "Self-signed certificates generated."
fi

# Step 4: Check Node.js version
echo "Checking Node.js version..."
NODE_VERSION=$(node -v)
echo "Host Node.js version: $NODE_VERSION"

# Step 5: Rebuild the client (using Docker container instead of host)
echo "Rebuilding the client application using Docker container..."
if [ -d "client" ]; then
  echo "Building Docker image..."
  docker-compose build app
  
  echo "Building client inside Docker container..."
  docker-compose run --rm app sh -c "cd client && npm install && npm run build"
  
  # Ensure the build directory exists
  if [ ! -d "client/build" ]; then
    echo "Error: Build directory not created. Check for build errors."
    exit 1
  fi
  
  echo "Client rebuilt successfully."
else
  echo "Error: client directory not found."
  exit 1
fi

# Step 6: Rebuild and restart containers
echo "Rebuilding and restarting containers..."
docker-compose down
docker-compose build --no-cache
docker-compose up -d

# Step 7: Wait for containers to start
echo "Waiting for containers to start (30 seconds)..."
sleep 30

# Step 8: Check if MongoDB module is installed in scripts directory
echo "Checking if MongoDB module is installed in scripts directory..."
if ! docker-compose exec -T app sh -c "cd scripts && node -e 'require(\"mongodb\")'"; then
  echo "MongoDB module not found in scripts directory. Installing..."
  docker-compose exec -T app sh -c "cd scripts && npm install mongodb"
  echo "MongoDB module installed."
fi

# Step 9: Initialize the database
echo "Initializing the database..."
docker-compose exec -T app node scripts/init-db.js || {
  echo "Database initialization failed. This is normal if the database is already initialized."
}

# Step 10: Verify the deployment
echo "Verifying the deployment..."
echo "Checking if Nginx is serving the application..."
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://$SERVER_IP)
if [ "$HTTP_STATUS" = "301" ] || [ "$HTTP_STATUS" = "200" ]; then
  echo "Success! HTTP status code: $HTTP_STATUS"
  echo "The site should now be accessible at http://$SERVER_IP or https://$SERVER_IP"
else
  echo "Warning: Site returns HTTP status code: $HTTP_STATUS"
  
  # Additional debugging
  echo "Checking Nginx container logs..."
  docker-compose logs nginx
  
  echo "Checking if static files exist in Nginx container..."
  docker-compose exec -T nginx ls -la /usr/share/nginx/html || echo "Cannot access /usr/share/nginx/html"
  
  echo "Checking Nginx configuration in container..."
  docker-compose exec -T nginx cat /etc/nginx/conf.d/default.conf || echo "Cannot access Nginx configuration"
fi

echo "Fix completed. If you're still experiencing issues, please check the logs:"
echo "docker-compose logs nginx"
echo "docker-compose logs app"
echo ""
echo "You can also try accessing the site directly at:"
echo "http://$SERVER_IP"
echo "https://$SERVER_IP"

#!/bin/bash

# Script to fix 403 Forbidden errors in Boxwise deployment

# Exit on error
set -e

# Check if running as root
if [ "$(id -u)" != "0" ]; then
   echo "This script must be run as root" 1>&2
   exit 1
fi

# Set working directory
cd "$(dirname "$0")"

echo "Starting 403 Forbidden error fix for Boxwise..."

# Step 1: Check if the application is running
echo "Checking if containers are running..."
if ! docker-compose ps | grep -q "Up"; then
  echo "Error: Containers are not running. Please start them with 'docker-compose up -d' first."
  exit 1
fi

# Step 2: Check Nginx configuration
echo "Checking Nginx configuration..."
if [ -f "nginx/nginx.conf" ]; then
  # Get the server IP
  SERVER_IP=$(curl -s ifconfig.me)
  
  # Check if server_name includes the IP
  if ! grep -q "$SERVER_IP" nginx/nginx.conf; then
    echo "Updating server_name in nginx.conf to include server IP..."
    # Backup the original file
    cp nginx/nginx.conf nginx/nginx.conf.bak
    
    # Update server_name in both server blocks
    sed -i "s/server_name .*/server_name boxwise.app www.boxwise.app $SERVER_IP;/" nginx/nginx.conf
    
    echo "Nginx configuration updated to include server IP: $SERVER_IP"
  else
    echo "Nginx configuration already includes server IP."
  fi
else
  echo "Error: nginx/nginx.conf not found."
  exit 1
fi

# Step 3: Check static files
echo "Checking static files in Nginx container..."
if ! docker-compose exec -T nginx ls -la /usr/share/nginx/html/index.html; then
  echo "Error: index.html not found in Nginx container."
  echo "Rebuilding client..."
  
  # Rebuild the client
  docker-compose exec -T app sh -c "cd client && npm run build"
  
  # Copy the build files to the Nginx container
  docker-compose exec -T app sh -c "cp -r client/build/* /usr/share/nginx/html/"
  
  echo "Client rebuilt and files copied to Nginx container."
else
  echo "Static files exist in Nginx container."
fi

# Step 4: Fix permissions
echo "Fixing permissions on static files..."
docker-compose exec -T nginx chmod -R 755 /usr/share/nginx/html

# Step 5: Restart Nginx
echo "Restarting Nginx container..."
docker-compose restart nginx

# Step 6: Check firewall
echo "Checking firewall settings..."
if command -v ufw &> /dev/null; then
  if ! ufw status | grep -q "80/tcp.*ALLOW"; then
    echo "Opening port 80 in firewall..."
    ufw allow 80/tcp
  fi
  
  if ! ufw status | grep -q "443/tcp.*ALLOW"; then
    echo "Opening port 443 in firewall..."
    ufw allow 443/tcp
  fi
  
  echo "Firewall settings checked and updated if needed."
else
  echo "UFW not installed. Skipping firewall check."
fi

# Step 7: Verify the fix
echo "Verifying the fix..."
echo "Waiting for Nginx to restart (10 seconds)..."
sleep 10

# Try to access the site
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://$SERVER_IP)
if [ "$HTTP_STATUS" = "301" ] || [ "$HTTP_STATUS" = "200" ]; then
  echo "Success! HTTP status code: $HTTP_STATUS"
  echo "The site should now be accessible at http://$SERVER_IP or https://$SERVER_IP"
else
  echo "Warning: Site still returns HTTP status code: $HTTP_STATUS"
  echo "Additional troubleshooting may be needed."
fi

echo "Fix completed. If you're still experiencing issues, please check the logs:"
echo "docker-compose logs nginx"
echo "docker-compose logs app"

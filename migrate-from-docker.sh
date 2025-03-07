#!/bin/bash

# Boxwise Migration Script: Docker to Host Deployment
# This script helps migrate an existing Docker-based Boxwise deployment to a host-based deployment

# Exit on error
set -e

# Check if running as root
if [ "$(id -u)" != "0" ]; then
   echo "This script must be run as root" 1>&2
   exit 1
fi

# Set working directory
cd "$(dirname "$0")"

echo "Starting migration from Docker to host deployment..."

# Step 1: Backup existing data
echo "Backing up existing data..."
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/var/backups/boxwise_migration_${TIMESTAMP}"
mkdir -p $BACKUP_DIR

# Backup MongoDB data
echo "Backing up MongoDB data..."
if docker-compose ps | grep -q "boxwise-mongodb"; then
  echo "Exporting MongoDB data from Docker container..."
  docker-compose exec -T mongodb mongodump --out=/tmp/mongodb_backup
  docker cp $(docker-compose ps -q mongodb):/tmp/mongodb_backup $BACKUP_DIR/mongodb
  echo "MongoDB data backed up to $BACKUP_DIR/mongodb"
else
  echo "MongoDB container not running. Skipping database backup."
  echo "You may need to manually restore your data after migration."
fi

# Backup environment variables
echo "Backing up environment variables..."
if [ -f ".env" ]; then
  cp .env $BACKUP_DIR/
fi
if [ -f "server/.env" ]; then
  cp server/.env $BACKUP_DIR/server.env
fi
if [ -f "server/.env.production" ]; then
  cp server/.env.production $BACKUP_DIR/server.env.production
fi

echo "All data backed up to $BACKUP_DIR"

# Step 2: Stop Docker containers
echo "Stopping Docker containers..."
docker-compose down

# Step 3: Install host dependencies
echo "Installing host dependencies..."

# Update system packages
echo "Updating system packages..."
apt update && apt upgrade -y
apt install -y curl wget gnupg2 software-properties-common apt-transport-https ca-certificates lsb-release

# Install MongoDB
echo "Installing MongoDB..."

# Check if MongoDB is already installed
if command -v mongod &> /dev/null; then
  echo "MongoDB is already installed. Checking version..."
  MONGO_VERSION=$(mongod --version | head -n 1 | awk '{print $3}')
  echo "MongoDB version: $MONGO_VERSION"
else
  echo "Adding MongoDB repository..."
  # Import MongoDB public GPG key
  wget -qO - https://www.mongodb.org/static/pgp/server-6.0.asc | apt-key add -
  
  # Add MongoDB repository
  echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu $(lsb_release -cs)/mongodb-org/6.0 multiverse" | tee /etc/apt/sources.list.d/mongodb-org-6.0.list
  
  # Update package lists
  apt update
  
  # Install MongoDB packages
  echo "Installing MongoDB packages..."
  apt install -y mongodb-org
  
  if [ $? -ne 0 ]; then
    echo "Error: Failed to install MongoDB packages. Trying alternative method..."
    
    # Alternative installation method
    apt install -y gnupg
    wget -qO - https://www.mongodb.org/static/pgp/server-6.0.asc | sudo apt-key add -
    echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu $(lsb_release -cs)/mongodb-org/6.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-6.0.list
    apt update
    apt install -y mongodb-org
    
    if [ $? -ne 0 ]; then
      echo "Error: Failed to install MongoDB. Trying to install MongoDB Community Edition..."
      apt install -y mongodb
      
      if [ $? -ne 0 ]; then
        echo "Error: All MongoDB installation methods failed. Please install MongoDB manually."
        exit 1
      fi
    fi
  fi
fi

# Ensure MongoDB data directory exists with proper permissions
echo "Setting up MongoDB data directory..."
mkdir -p /var/lib/mongodb
chown -R mongodb:mongodb /var/lib/mongodb
chmod 755 /var/lib/mongodb

# Configure MongoDB to start on boot and start the service
echo "Starting MongoDB service..."
systemctl daemon-reload
systemctl enable mongod
systemctl start mongod

# Verify MongoDB is running
echo "Verifying MongoDB installation..."
sleep 5 # Give MongoDB time to start
if systemctl is-active --quiet mongod; then
  echo "MongoDB service is running."
else
  echo "Warning: MongoDB service is not running. Attempting to start..."
  systemctl start mongod
  sleep 5
  
  if systemctl is-active --quiet mongod; then
    echo "MongoDB service is now running."
  else
    echo "Error: Failed to start MongoDB service. Please check MongoDB installation."
    echo "You can try to start it manually with: sudo systemctl start mongod"
    echo "And check the status with: sudo systemctl status mongod"
  fi
fi

# Verify MongoDB connection
echo "Testing MongoDB connection..."
mongo --eval "db.adminCommand('ping')" || {
  echo "Warning: Could not connect to MongoDB. Checking alternative command..."
  mongosh --eval "db.adminCommand('ping')" || {
    echo "Error: Could not connect to MongoDB with either mongo or mongosh commands."
    echo "MongoDB may not be installed correctly or the service may not be running."
    echo "Please check MongoDB installation and try again."
  }
}

echo "MongoDB installation completed."

# Install Node.js 18.x
echo "Installing Node.js 18.x..."
if ! command -v node &> /dev/null || [[ $(node -v) != v18* ]]; then
  curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
  apt install -y nodejs
  echo "Node.js installed: $(node -v)"
else
  echo "Node.js already installed: $(node -v)"
fi

# Install Nginx
echo "Installing Nginx..."
if ! command -v nginx &> /dev/null; then
  apt install -y nginx
  echo "Nginx installed."
else
  echo "Nginx already installed."
fi

# Step 4: Restore environment variables
echo "Restoring environment variables..."

# Extract JWT_SECRET from backup or generate a new one
if [ -f "$BACKUP_DIR/.env" ] && grep -q "JWT_SECRET" "$BACKUP_DIR/.env"; then
  JWT_SECRET=$(grep "JWT_SECRET" "$BACKUP_DIR/.env" | cut -d '=' -f2)
  echo "Using existing JWT_SECRET from backup."
elif [ -f "$BACKUP_DIR/server.env" ] && grep -q "JWT_SECRET" "$BACKUP_DIR/server.env"; then
  JWT_SECRET=$(grep "JWT_SECRET" "$BACKUP_DIR/server.env" | cut -d '=' -f2)
  echo "Using existing JWT_SECRET from server.env backup."
else
  echo "JWT_SECRET not found in backup. Generating a new one..."
  JWT_SECRET=$(openssl rand -base64 32)
fi

# Create production environment file for the server
cat > server/.env.production << EOL
PORT=5001
NODE_ENV=production
MONGO_URI=mongodb://localhost:27017/boxwise
JWT_SECRET=${JWT_SECRET}
JWT_EXPIRE=30d
ASSET_ID_AUTO_INCREMENT=true
ASSET_ID_PREFIX=000-
MAX_FILE_SIZE=5000000
EOL

# Copy production environment to active .env
cp server/.env.production server/.env

echo "Environment variables configured."

# Step 5: Set up SSL certificates
echo "Setting up SSL certificates..."
if [ ! -d "/etc/nginx/ssl" ]; then
  mkdir -p /etc/nginx/ssl
fi

# Copy existing certificates from Docker setup if available
if [ -f "nginx/ssl/cert.pem" ] && [ -f "nginx/ssl/key.pem" ]; then
  echo "Using existing SSL certificates from Docker setup..."
  cp nginx/ssl/cert.pem /etc/nginx/ssl/
  cp nginx/ssl/key.pem /etc/nginx/ssl/
  chmod 600 /etc/nginx/ssl/key.pem
  chmod 644 /etc/nginx/ssl/cert.pem
else
  # Generate self-signed certificates if they don't exist
  echo "Generating self-signed SSL certificates..."
  openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
    -keyout /etc/nginx/ssl/key.pem -out /etc/nginx/ssl/cert.pem \
    -subj "/C=US/ST=State/L=City/O=Organization/CN=boxwise.app"
  echo "Self-signed certificates generated."
fi

# Step 6: Install application dependencies
echo "Installing server dependencies..."
cd server
npm install --production
cd ..

echo "Installing client dependencies..."
cd client
npm install
cd ..

echo "Installing scripts dependencies..."
cd scripts
npm install --production
cd ..

# Step 7: Build the client application
echo "Building client application..."
cd client
npm run build
cd ..

# Step 8: Configure Nginx
echo "Configuring Nginx..."

# Get the server IP
SERVER_IP=$(curl -s ifconfig.me)

# Create Nginx configuration
cat > /etc/nginx/sites-available/boxwise << EOL
server {
    listen 80;
    server_name boxwise.app www.boxwise.app ${SERVER_IP};
    
    # Redirect to HTTPS
    return 301 https://\$host\$request_uri;
}

server {
    listen 443 ssl;
    server_name boxwise.app www.boxwise.app ${SERVER_IP};
    
    ssl_certificate /etc/nginx/ssl/cert.pem;
    ssl_certificate_key /etc/nginx/ssl/key.pem;
    
    # SSL configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers on;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-SHA384;
    ssl_session_timeout 10m;
    ssl_session_cache shared:SSL:10m;
    ssl_session_tickets off;
    ssl_stapling on;
    ssl_stapling_verify on;
    
    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;
    
    # Serve static files
    location / {
        root $(pwd)/client/build;
        index index.html;
        try_files \$uri \$uri/ /index.html;
    }
    
    # Proxy API requests
    location /api {
        proxy_pass http://localhost:5001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
    
    # Gzip compression
    gzip on;
    gzip_comp_level 5;
    gzip_min_length 256;
    gzip_proxied any;
    gzip_vary on;
    gzip_types
        application/javascript
        application/json
        application/xml
        application/xml+rss
        text/css
        text/javascript
        text/plain
        text/xml;
}
EOL

# Enable the site
ln -sf /etc/nginx/sites-available/boxwise /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# Test Nginx configuration
nginx -t

# Restart Nginx
systemctl restart nginx
systemctl enable nginx

echo "Nginx configured and restarted."

# Step 9: Set up the application as a systemd service
echo "Setting up application as a systemd service..."

cat > /etc/systemd/system/boxwise.service << EOL
[Unit]
Description=Boxwise Application
After=network.target mongodb.service

[Service]
Type=simple
User=$(whoami)
WorkingDirectory=$(pwd)/server
ExecStart=/usr/bin/node src/index.js
Restart=on-failure
Environment=NODE_ENV=production
Environment=PORT=5001
Environment=MONGO_URI=mongodb://localhost:27017/boxwise
Environment=JWT_SECRET=${JWT_SECRET}
Environment=JWT_EXPIRE=30d
Environment=ASSET_ID_AUTO_INCREMENT=true
Environment=ASSET_ID_PREFIX=000-

[Install]
WantedBy=multi-user.target
EOL

# Reload systemd
systemctl daemon-reload

# Enable and start the service
systemctl enable boxwise
systemctl start boxwise

echo "Boxwise service started."

# Step 10: Restore MongoDB data
echo "Restoring MongoDB data..."
if [ -d "$BACKUP_DIR/mongodb" ]; then
  echo "Restoring MongoDB data from backup..."
  mongorestore --drop $BACKUP_DIR/mongodb
  echo "MongoDB data restored."
else
  echo "No MongoDB backup found. Initializing new database..."
  cd scripts
  node init-db.js || {
    echo "Database initialization failed. This is normal if the database is already initialized."
  }
  cd ..
fi

# Step 11: Set up firewall
echo "Configuring firewall..."
if command -v ufw &> /dev/null; then
  ufw allow OpenSSH
  ufw allow 80/tcp
  ufw allow 443/tcp
  
  # Only enable UFW if it's not already enabled
  if ! ufw status | grep -q "Status: active"; then
    echo "y" | ufw enable
  fi
  
  echo "Firewall configured."
else
  echo "UFW not installed. Skipping firewall configuration."
fi

# Step 12: Clean up Docker resources (optional)
echo "Do you want to clean up Docker resources? This will remove all Docker images, containers, and volumes related to Boxwise. (y/n)"
read -r cleanup_docker

if [[ "$cleanup_docker" =~ ^[Yy]$ ]]; then
  echo "Cleaning up Docker resources..."
  docker-compose down --rmi all --volumes --remove-orphans
  echo "Docker resources cleaned up."
else
  echo "Skipping Docker cleanup."
fi

# Step 13: Verify the deployment
echo "Verifying the deployment..."

# Check if MongoDB is running
if systemctl is-active --quiet mongod; then
  echo "MongoDB is running."
else
  echo "Warning: MongoDB is not running."
fi

# Check if Boxwise service is running
if systemctl is-active --quiet boxwise; then
  echo "Boxwise service is running."
else
  echo "Warning: Boxwise service is not running."
fi

# Check if Nginx is running
if systemctl is-active --quiet nginx; then
  echo "Nginx is running."
else
  echo "Warning: Nginx is not running."
fi

# Try to access the site
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://$SERVER_IP)
if [ "$HTTP_STATUS" = "301" ] || [ "$HTTP_STATUS" = "200" ]; then
  echo "Success! HTTP status code: $HTTP_STATUS"
  echo "The site should now be accessible at http://$SERVER_IP or https://$SERVER_IP"
else
  echo "Warning: Site returns HTTP status code: $HTTP_STATUS"
fi

echo "Migration completed successfully!"
echo ""
echo "Your Docker deployment has been migrated to a host-based deployment."
echo "A backup of your data was created at: $BACKUP_DIR"
echo ""
echo "You can access your Boxwise application at:"
echo "http://$SERVER_IP"
echo "https://$SERVER_IP"
echo ""
echo "Default login credentials (if using a fresh database):"
echo "Email: owner@example.com"
echo "Password: password123"

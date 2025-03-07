#!/bin/bash

# Boxwise Host Deployment Script
# This script installs and configures Boxwise directly on the host without Docker

# Exit on error
set -e

# Check if running as root
if [ "$(id -u)" != "0" ]; then
   echo "This script must be run as root" 1>&2
   exit 1
fi

# Set working directory
cd "$(dirname "$0")"

echo "Starting Boxwise host deployment..."

# Step 1: Update system packages
echo "Updating system packages..."
apt update && apt upgrade -y

# Step 2: Install required system dependencies
echo "Installing system dependencies..."
apt install -y curl wget gnupg2 software-properties-common apt-transport-https ca-certificates lsb-release

# Step 3: Install MongoDB
echo "Installing MongoDB..."

# Check if MongoDB is already installed
if command -v mongod &> /dev/null; then
  echo "MongoDB is already installed. Checking version..."
  MONGO_VERSION=$(mongod --version | head -n 1 | awk '{print $3}')
  echo "MongoDB version: $MONGO_VERSION"
else
  # Get Ubuntu version
  UBUNTU_VERSION=$(lsb_release -cs)
  echo "Detected Ubuntu version: $UBUNTU_VERSION"
  
  # For newer Ubuntu versions that might not have a MongoDB repository yet,
  # use the repository for Ubuntu 22.04 (jammy)
  if [ "$UBUNTU_VERSION" = "oracular" ] || [ "$UBUNTU_VERSION" = "noble" ]; then
    echo "Using MongoDB repository for Ubuntu 22.04 (jammy) for compatibility with $UBUNTU_VERSION..."
    REPO_UBUNTU_VERSION="jammy"
  else
    REPO_UBUNTU_VERSION=$UBUNTU_VERSION
  fi
  
  echo "Adding MongoDB repository for Ubuntu $REPO_UBUNTU_VERSION..."
  
  # Method 1: Try official MongoDB repository
  echo "Method 1: Using official MongoDB repository..."
  # Import MongoDB public GPG key
  wget -qO - https://www.mongodb.org/static/pgp/server-6.0.asc | apt-key add -
  
  # Add MongoDB repository
  echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu $REPO_UBUNTU_VERSION/mongodb-org/6.0 multiverse" | tee /etc/apt/sources.list.d/mongodb-org-6.0.list
  
  # Update package lists
  apt update || true
  
  # Install MongoDB packages
  echo "Installing MongoDB packages..."
  apt install -y mongodb-org
  
  # If Method 1 fails, try Method 2
  if [ $? -ne 0 ]; then
    echo "Method 1 failed. Trying Method 2: MongoDB 5.0 repository..."
    
    # Remove previous repository file
    rm -f /etc/apt/sources.list.d/mongodb-org-6.0.list
    
    # Try MongoDB 5.0 repository
    wget -qO - https://www.mongodb.org/static/pgp/server-5.0.asc | apt-key add -
    echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu $REPO_UBUNTU_VERSION/mongodb-org/5.0 multiverse" | tee /etc/apt/sources.list.d/mongodb-org-5.0.list
    apt update || true
    apt install -y mongodb-org
    
    # If Method 2 fails, try Method 3
    if [ $? -ne 0 ]; then
      echo "Method 2 failed. Trying Method 3: Ubuntu's mongodb package..."
      
      # Remove previous repository file
      rm -f /etc/apt/sources.list.d/mongodb-org-5.0.list
      
      # Try Ubuntu's mongodb package
      echo "Installing MongoDB from Ubuntu repository..."
      apt update
      apt install -y mongodb
      
      # If Method 3 fails, try Method 4
      if [ $? -ne 0 ]; then
        echo "Method 3 failed. Trying Method 4: Manual MongoDB installation..."
        
        # Create MongoDB service user if it doesn't exist
        if ! id -u mongodb &>/dev/null; then
          echo "Creating mongodb user..."
          useradd -r -d /var/lib/mongodb -s /usr/sbin/nologin mongodb
        fi
        
        # Create necessary directories
        mkdir -p /var/lib/mongodb /var/log/mongodb
        chown -R mongodb:mongodb /var/lib/mongodb /var/log/mongodb
        chmod 755 /var/lib/mongodb /var/log/mongodb
        
        # Download and install MongoDB binaries
        echo "Downloading MongoDB Community Server..."
        cd /tmp
        wget https://fastdl.mongodb.org/linux/mongodb-linux-x86_64-ubuntu2204-6.0.12.tgz
        
        echo "Extracting MongoDB binaries..."
        tar -zxvf mongodb-linux-x86_64-ubuntu2204-6.0.12.tgz
        
        echo "Installing MongoDB binaries..."
        cp mongodb-linux-x86_64-ubuntu2204-6.0.12/bin/* /usr/local/bin/
        
        # Create systemd service file
        echo "Creating systemd service file..."
        cat > /etc/systemd/system/mongod.service << EOL
[Unit]
Description=MongoDB Database Server
Documentation=https://docs.mongodb.org/manual
After=network.target

[Service]
User=mongodb
Group=mongodb
ExecStart=/usr/local/bin/mongod --dbpath /var/lib/mongodb --logpath /var/log/mongodb/mongod.log --bind_ip 127.0.0.1 --fork
PIDFile=/var/run/mongodb/mongod.pid
Type=forking
# file size
LimitFSIZE=infinity
# cpu time
LimitCPU=infinity
# virtual memory size
LimitAS=infinity
# open files
LimitNOFILE=64000
# processes/threads
LimitNPROC=64000
# locked memory
LimitMEMLOCK=infinity
# total threads (user+kernel)
TasksMax=infinity
TasksAccounting=false

[Install]
WantedBy=multi-user.target
EOL
        
        # Create MongoDB configuration file
        echo "Creating MongoDB configuration file..."
        mkdir -p /etc/mongodb
        cat > /etc/mongodb/mongod.conf << EOL
# mongod.conf

# for documentation of all options, see:
#   http://docs.mongodb.org/manual/reference/configuration-options/

# Where and how to store data.
storage:
  dbPath: /var/lib/mongodb
  journal:
    enabled: true

# where to write logging data.
systemLog:
  destination: file
  logAppend: true
  path: /var/log/mongodb/mongod.log

# network interfaces
net:
  port: 27017
  bindIp: 127.0.0.1
EOL
        
        # If all methods fail, exit with error
        if [ $? -ne 0 ]; then
          echo "Error: All MongoDB installation methods failed. Please install MongoDB manually."
          exit 1
        fi
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

# Step 4: Install Node.js 18.x
echo "Installing Node.js 18.x..."
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt install -y nodejs

# Verify Node.js and npm installation
echo "Node.js version: $(node -v)"
echo "npm version: $(npm -v)"

# Step 5: Install Nginx
echo "Installing Nginx..."
apt install -y nginx

# Step 6: Set up SSL certificates
echo "Setting up SSL certificates..."
if [ ! -d "/etc/nginx/ssl" ]; then
  mkdir -p /etc/nginx/ssl
fi

# Generate self-signed certificates if they don't exist
if [ ! -f "/etc/nginx/ssl/cert.pem" ] || [ ! -f "/etc/nginx/ssl/key.pem" ]; then
  echo "Generating self-signed SSL certificates..."
  openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
    -keyout /etc/nginx/ssl/key.pem -out /etc/nginx/ssl/cert.pem \
    -subj "/C=US/ST=State/L=City/O=Organization/CN=boxwise.app"
  echo "Self-signed certificates generated."
fi

# Step 7: Configure environment variables
echo "Configuring environment variables..."
if [ -z "$JWT_SECRET" ]; then
  echo "JWT_SECRET is not set. Generating a new one..."
  JWT_SECRET=$(openssl rand -base64 32)
  echo "JWT_SECRET=$JWT_SECRET" > .env
  echo "JWT secret generated and saved to .env file."
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

# Step 8: Install application dependencies
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

# Step 9: Build the client application
echo "Building client application..."
cd client
npm run build
cd ..

# Step 10: Configure Nginx
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

# Step 11: Set up the application as a systemd service
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

# Step 12: Initialize the database
echo "Initializing the database..."
cd scripts
node init-db.js || {
  echo "Database initialization failed. This is normal if the database is already initialized."
}
cd ..

# Step 13: Set up firewall
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

# Step 14: Set up automatic backups
echo "Setting up automatic backups..."

cat > /usr/local/bin/boxwise-backup.sh << EOL
#!/bin/bash

# Boxwise backup script
TIMESTAMP=\$(date +%Y%m%d_%H%M%S)
BACKUP_DIR=/var/backups/boxwise
MONGODB_HOST=localhost
MONGODB_PORT=27017
MONGODB_DB=boxwise

# Create backup directory if it doesn't exist
mkdir -p \$BACKUP_DIR

# Backup MongoDB
mongodump --host=\$MONGODB_HOST --port=\$MONGODB_PORT --db=\$MONGODB_DB --out=\$BACKUP_DIR/mongodb_\$TIMESTAMP

# Backup application files
tar -czf \$BACKUP_DIR/boxwise_files_\$TIMESTAMP.tar.gz $(pwd)

# Remove backups older than 30 days
find \$BACKUP_DIR -type d -name "mongodb_*" -mtime +30 -exec rm -rf {} \;
find \$BACKUP_DIR -type f -name "boxwise_files_*.tar.gz" -mtime +30 -exec rm -f {} \;

echo "Backup completed: \$TIMESTAMP"
EOL

chmod +x /usr/local/bin/boxwise-backup.sh

# Set up cron job for daily backups at 2 AM
(crontab -l 2>/dev/null || echo "") | { cat; echo "0 2 * * * /usr/local/bin/boxwise-backup.sh > /var/log/boxwise-backup.log 2>&1"; } | crontab -

echo "Automatic backups configured."

# Step 15: Verify the deployment
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

echo "Deployment completed successfully!"
echo ""
echo "You can access your Boxwise application at:"
echo "http://$SERVER_IP"
echo "https://$SERVER_IP"
echo ""
echo "Default login credentials:"
echo "Email: owner@example.com"
echo "Password: password123"

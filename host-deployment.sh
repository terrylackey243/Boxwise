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
wget -qO - https://www.mongodb.org/static/pgp/server-6.0.asc | apt-key add -
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu $(lsb_release -cs)/mongodb-org/6.0 multiverse" | tee /etc/apt/sources.list.d/mongodb-org-6.0.list
apt update
apt install -y mongodb-org

# Start and enable MongoDB service
systemctl start mongod
systemctl enable mongod

echo "MongoDB installed and started."

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

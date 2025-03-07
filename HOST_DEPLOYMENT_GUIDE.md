# Boxwise Host Deployment Guide

This guide provides step-by-step instructions for deploying the Boxwise application directly on a host server without using Docker. This approach installs all components (MongoDB, Node.js, and Nginx) directly on the host system.

## Prerequisites

- A server running Ubuntu 22.04 LTS (or similar Debian-based distribution)
- Root or sudo access to the server
- A domain name (optional but recommended)

## Deployment Options

### Option 1: Automated Deployment (Recommended)

The easiest way to deploy Boxwise is to use the provided `host-deployment.sh` script, which automates the entire installation process.

1. SSH into your server:
   ```bash
   ssh root@your_server_ip
   ```

2. Clone the repository:
   ```bash
   mkdir -p ~/projects
   cd ~/projects
   git clone https://github.com/yourusername/boxwise.git
   cd boxwise
   ```

3. Make the deployment script executable:
   ```bash
   chmod +x host-deployment.sh
   ```

4. Run the deployment script:
   ```bash
   sudo ./host-deployment.sh
   ```

5. The script will:
   - Install MongoDB, Node.js, and Nginx
   - Configure SSL certificates
   - Set up environment variables
   - Build the client application
   - Configure the application as a systemd service
   - Initialize the database
   - Set up automatic backups
   - Configure the firewall

6. Once completed, you can access your Boxwise application at:
   - `http://your_server_ip` or `https://your_server_ip`
   - If you have a domain: `http://yourdomain.com` or `https://yourdomain.com`

### Option 2: Manual Deployment

If you prefer to deploy the application manually or need to customize the installation, follow these steps:

#### Step 1: Update System Packages

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y curl wget gnupg2 software-properties-common apt-transport-https ca-certificates lsb-release
```

#### Step 2: Install MongoDB

```bash
# Import MongoDB public key
wget -qO - https://www.mongodb.org/static/pgp/server-6.0.asc | sudo apt-key add -

# Add MongoDB repository
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu $(lsb_release -cs)/mongodb-org/6.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-6.0.list

# Update package list and install MongoDB
sudo apt update
sudo apt install -y mongodb-org

# If the above fails, try the alternative method
if [ $? -ne 0 ]; then
  echo "Trying alternative MongoDB installation method..."
  sudo apt install -y gnupg
  wget -qO - https://www.mongodb.org/static/pgp/server-6.0.asc | sudo apt-key add -
  echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu $(lsb_release -cs)/mongodb-org/6.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-6.0.list
  sudo apt update
  sudo apt install -y mongodb-org
fi

# If MongoDB 6.0 installation fails, try the community edition
if [ $? -ne 0 ]; then
  echo "Trying MongoDB Community Edition..."
  sudo apt install -y mongodb
fi

# Ensure MongoDB data directory exists with proper permissions
sudo mkdir -p /var/lib/mongodb
sudo chown -R mongodb:mongodb /var/lib/mongodb
sudo chmod 755 /var/lib/mongodb

# Start and enable MongoDB service
sudo systemctl daemon-reload
sudo systemctl enable mongod
sudo systemctl start mongod

# Verify MongoDB is running
sleep 5 # Give MongoDB time to start
if ! systemctl is-active --quiet mongod; then
  echo "Attempting to start MongoDB again..."
  sudo systemctl start mongod
fi

# Test MongoDB connection
mongo --eval "db.adminCommand('ping')" || mongosh --eval "db.adminCommand('ping')"
```

#### Step 3: Install Node.js 18.x

```bash
# Add NodeSource repository
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo bash -

# Install Node.js
sudo apt install -y nodejs

# Verify installation
node -v
npm -v
```

#### Step 4: Install Nginx

```bash
sudo apt install -y nginx
```

#### Step 5: Clone and Configure the Repository

```bash
# Clone the repository
mkdir -p ~/projects
cd ~/projects
git clone https://github.com/yourusername/boxwise.git
cd boxwise

# Install dependencies
cd server
npm install --production
cd ../client
npm install
cd ../scripts
npm install --production
cd ..

# Build the client
cd client
npm run build
cd ..
```

#### Step 6: Set Up Environment Variables

```bash
# Generate JWT secret
JWT_SECRET=$(openssl rand -base64 32)

# Create production environment file
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

# Copy to active .env
cp server/.env.production server/.env
```

#### Step 7: Set Up SSL Certificates

```bash
# Create SSL directory
sudo mkdir -p /etc/nginx/ssl

# Generate self-signed certificates (for testing)
sudo openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout /etc/nginx/ssl/key.pem -out /etc/nginx/ssl/cert.pem \
  -subj "/C=US/ST=State/L=City/O=Organization/CN=boxwise.app"
```

For production with a real domain, use Let's Encrypt:

```bash
sudo apt install -y certbot
sudo certbot certonly --standalone -d yourdomain.com -d www.yourdomain.com

# Copy certificates to Nginx directory
sudo cp /etc/letsencrypt/live/yourdomain.com/fullchain.pem /etc/nginx/ssl/cert.pem
sudo cp /etc/letsencrypt/live/yourdomain.com/privkey.pem /etc/nginx/ssl/key.pem
```

#### Step 8: Configure Nginx

```bash
# Get server IP
SERVER_IP=$(curl -s ifconfig.me)

# Create Nginx configuration
sudo bash -c "cat > /etc/nginx/sites-available/boxwise << EOL
server {
    listen 80;
    server_name boxwise.app www.boxwise.app ${SERVER_IP};
    
    # Redirect to HTTPS
    return 301 https://\\\$host\\\$request_uri;
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
    add_header X-Frame-Options \"SAMEORIGIN\" always;
    add_header X-XSS-Protection \"1; mode=block\" always;
    add_header X-Content-Type-Options \"nosniff\" always;
    add_header Referrer-Policy \"strict-origin-when-cross-origin\" always;
    add_header Content-Security-Policy \"default-src 'self' http: https: data: blob: 'unsafe-inline'\" always;
    add_header Strict-Transport-Security \"max-age=31536000; includeSubDomains; preload\" always;
    
    # Serve static files
    location / {
        root $(pwd)/client/build;
        index index.html;
        try_files \\\$uri \\\$uri/ /index.html;
    }
    
    # Proxy API requests
    location /api {
        proxy_pass http://localhost:5001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \\\$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \\\$host;
        proxy_cache_bypass \\\$http_upgrade;
        proxy_set_header X-Real-IP \\\$remote_addr;
        proxy_set_header X-Forwarded-For \\\$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \\\$scheme;
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
EOL"

# Enable the site and disable default
sudo ln -sf /etc/nginx/sites-available/boxwise /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default

# Test and restart Nginx
sudo nginx -t
sudo systemctl restart nginx
sudo systemctl enable nginx
```

#### Step 9: Set Up Application as a Systemd Service

```bash
sudo bash -c "cat > /etc/systemd/system/boxwise.service << EOL
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
EOL"

# Reload systemd, enable and start the service
sudo systemctl daemon-reload
sudo systemctl enable boxwise
sudo systemctl start boxwise
```

#### Step 10: Initialize the Database

```bash
cd scripts
node init-db.js
cd ..
```

#### Step 11: Configure Firewall

```bash
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

#### Step 12: Set Up Automatic Backups

```bash
sudo bash -c "cat > /usr/local/bin/boxwise-backup.sh << EOL
#!/bin/bash

# Boxwise backup script
TIMESTAMP=\\\$(date +%Y%m%d_%H%M%S)
BACKUP_DIR=/var/backups/boxwise
MONGODB_HOST=localhost
MONGODB_PORT=27017
MONGODB_DB=boxwise

# Create backup directory if it doesn't exist
mkdir -p \\\$BACKUP_DIR

# Backup MongoDB
mongodump --host=\\\$MONGODB_HOST --port=\\\$MONGODB_PORT --db=\\\$MONGODB_DB --out=\\\$BACKUP_DIR/mongodb_\\\$TIMESTAMP

# Backup application files
tar -czf \\\$BACKUP_DIR/boxwise_files_\\\$TIMESTAMP.tar.gz $(pwd)

# Remove backups older than 30 days
find \\\$BACKUP_DIR -type d -name \"mongodb_*\" -mtime +30 -exec rm -rf {} \\\;
find \\\$BACKUP_DIR -type f -name \"boxwise_files_*.tar.gz\" -mtime +30 -exec rm -f {} \\\;

echo \"Backup completed: \\\$TIMESTAMP\"
EOL"

sudo chmod +x /usr/local/bin/boxwise-backup.sh

# Set up cron job for daily backups at 2 AM
(crontab -l 2>/dev/null || echo "") | { cat; echo "0 2 * * * /usr/local/bin/boxwise-backup.sh > /var/log/boxwise-backup.log 2>&1"; } | crontab -
```

## Maintenance and Management

### Checking Service Status

```bash
# Check MongoDB status
sudo systemctl status mongod

# Check Boxwise application status
sudo systemctl status boxwise

# Check Nginx status
sudo systemctl status nginx
```

### Viewing Logs

```bash
# View MongoDB logs
sudo journalctl -u mongod

# View Boxwise application logs
sudo journalctl -u boxwise

# View Nginx logs
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

### Restarting Services

```bash
# Restart MongoDB
sudo systemctl restart mongod

# Restart Boxwise application
sudo systemctl restart boxwise

# Restart Nginx
sudo systemctl restart nginx
```

### Updating the Application

To update the application to a new version:

1. Pull the latest changes:
   ```bash
   cd ~/projects/boxwise
   git pull
   ```

2. Install dependencies and rebuild:
   ```bash
   cd server
   npm install --production
   cd ../client
   npm install
   npm run build
   cd ..
   ```

3. Restart the application:
   ```bash
   sudo systemctl restart boxwise
   ```

## Troubleshooting

### Issue 1: MongoDB Connection Errors

**Solution:**
Check the MongoDB connection string in `server/.env`:
```bash
cat server/.env
```

Ensure it's set to:
```
MONGO_URI=mongodb://localhost:27017/boxwise
```

Verify MongoDB is running:
```bash
sudo systemctl status mongod
```

### Issue 2: Application Not Starting

**Solution:**
Check the application logs:
```bash
sudo journalctl -u boxwise
```

Verify the environment variables:
```bash
sudo systemctl show boxwise -p Environment
```

### Issue 3: Nginx 403 Forbidden Error

**Solution:**
Check file permissions:
```bash
ls -la client/build
```

Ensure Nginx can access the files:
```bash
sudo chmod -R 755 client/build
```

Verify the Nginx configuration:
```bash
sudo nginx -t
```

### Issue 4: SSL Certificate Issues

**Solution:**
Verify certificate paths and permissions:
```bash
ls -la /etc/nginx/ssl/
```

Regenerate certificates if needed:
```bash
# For self-signed certificates
sudo openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout /etc/nginx/ssl/key.pem -out /etc/nginx/ssl/cert.pem \
  -subj "/C=US/ST=State/L=City/O=Organization/CN=boxwise.app"

# For Let's Encrypt certificates
sudo certbot certonly --standalone -d yourdomain.com -d www.yourdomain.com
sudo cp /etc/letsencrypt/live/yourdomain.com/fullchain.pem /etc/nginx/ssl/cert.pem
sudo cp /etc/letsencrypt/live/yourdomain.com/privkey.pem /etc/nginx/ssl/key.pem
```

## Conclusion

By following this guide, you should have a fully functional Boxwise application deployed directly on your host server without using Docker. This approach provides better performance and easier management for single-server deployments.

If you encounter any issues during deployment, refer to the troubleshooting section or check the logs for specific error messages.

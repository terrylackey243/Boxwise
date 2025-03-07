#!/bin/bash

# Boxwise Let's Encrypt Installation Script
# This script installs Let's Encrypt certificates and configures Nginx to use them

# Exit on error
set -e

# Check if running as root
if [ "$(id -u)" != "0" ]; then
   echo "This script must be run as root" 1>&2
   exit 1
fi

# Set working directory
cd "$(dirname "$0")"

echo "Starting Let's Encrypt installation..."

# Step 1: Install certbot
echo "Installing certbot..."
apt update
apt install -y certbot python3-certbot-nginx

# Step 2: Ask for domain name
echo "Please enter your domain name (e.g., boxwise.app):"
read -r domain_name

# Validate domain name
if [ -z "$domain_name" ]; then
  echo "Error: Domain name cannot be empty."
  exit 1
fi

# Step 3: Stop Nginx temporarily to free up port 80
echo "Stopping Nginx temporarily..."
systemctl stop nginx

# Step 4: Obtain SSL certificate
echo "Obtaining Let's Encrypt certificate for $domain_name..."
certbot certonly --standalone -d "$domain_name" -d "www.$domain_name"

# Check if certificate was obtained successfully
if [ ! -d "/etc/letsencrypt/live/$domain_name" ]; then
  echo "Error: Failed to obtain Let's Encrypt certificate."
  echo "Restarting Nginx with the existing configuration..."
  systemctl start nginx
  exit 1
fi

# Step 5: Update Nginx configuration to use Let's Encrypt certificates
echo "Updating Nginx configuration..."

# Get the server IP
SERVER_IP=$(curl -s ifconfig.me)

# Create Nginx configuration with Let's Encrypt certificates
cat > /etc/nginx/sites-available/boxwise << EOL
server {
    listen 80;
    server_name $domain_name www.$domain_name ${SERVER_IP};
    
    # Redirect to HTTPS
    return 301 https://\$host\$request_uri;
}

server {
    listen 443 ssl;
    server_name $domain_name www.$domain_name ${SERVER_IP};
    
    ssl_certificate /etc/letsencrypt/live/$domain_name/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/$domain_name/privkey.pem;
    
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

# Step 6: Start Nginx
echo "Starting Nginx..."
systemctl start nginx

# Step 7: Set up automatic renewal
echo "Setting up automatic certificate renewal..."
echo "0 3 * * * certbot renew --quiet --post-hook 'systemctl reload nginx'" | crontab -

echo "Let's Encrypt installation completed successfully!"
echo ""
echo "Your site is now secured with Let's Encrypt SSL certificates."
echo "Certificates will automatically renew before they expire."
echo ""
echo "You can access your Boxwise application at:"
echo "https://$domain_name"
echo "https://www.$domain_name"
echo "https://$SERVER_IP"

#!/bin/bash

# Boxwise Deployment Script
# This script prepares the application for production deployment
# with Let's Encrypt SSL certificates

# Exit on error
set -e

# Default values
DOMAIN=""
EMAIL=""
INSTALL_DEPS=false
SETUP_LETSENCRYPT=false
SETUP_PM2=false
SETUP_NGINX=false
BACKUP_DB=false

# Display help
function show_help {
    echo "Boxwise Deployment Script"
    echo "Usage: $0 [options]"
    echo ""
    echo "Options:"
    echo "  -d, --domain DOMAIN       Domain name for the application (required)"
    echo "  -e, --email EMAIL         Email for Let's Encrypt registration (required)"
    echo "  -i, --install-deps        Install system dependencies"
    echo "  -l, --setup-letsencrypt   Set up Let's Encrypt SSL certificates"
    echo "  -p, --setup-pm2           Set up PM2 process manager"
    echo "  -n, --setup-nginx         Set up Nginx configuration"
    echo "  -b, --backup-db           Backup the MongoDB database"
    echo "  -h, --help                Show this help message"
    echo ""
    echo "Example:"
    echo "  $0 -d example.com -e admin@example.com -i -l -p -n -b"
    exit 1
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case "$1" in
        -d|--domain)
            DOMAIN="$2"
            shift 2
            ;;
        -e|--email)
            EMAIL="$2"
            shift 2
            ;;
        -i|--install-deps)
            INSTALL_DEPS=true
            shift
            ;;
        -l|--setup-letsencrypt)
            SETUP_LETSENCRYPT=true
            shift
            ;;
        -p|--setup-pm2)
            SETUP_PM2=true
            shift
            ;;
        -n|--setup-nginx)
            SETUP_NGINX=true
            shift
            ;;
        -b|--backup-db)
            BACKUP_DB=true
            shift
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

# Check required parameters
if [ -z "$DOMAIN" ]; then
    echo "Error: Domain name is required"
    show_help
fi

if [ "$SETUP_LETSENCRYPT" = true ] && [ -z "$EMAIL" ]; then
    echo "Error: Email is required for Let's Encrypt"
    show_help
fi

# Get the script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
cd "$SCRIPT_DIR"

echo "=== Boxwise Deployment Script ==="
echo "Domain: $DOMAIN"
if [ ! -z "$EMAIL" ]; then
    echo "Email: $EMAIL"
fi
echo "Install dependencies: $INSTALL_DEPS"
echo "Setup Let's Encrypt: $SETUP_LETSENCRYPT"
echo "Setup PM2: $SETUP_PM2"
echo "Setup Nginx: $SETUP_NGINX"
echo "Backup database: $BACKUP_DB"
echo ""

# Confirm before proceeding
read -p "Do you want to continue? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Deployment cancelled"
    exit 1
fi

# Install system dependencies
if [ "$INSTALL_DEPS" = true ]; then
    echo "=== Installing system dependencies ==="
    sudo apt-get update
    sudo apt-get install -y nginx certbot python3-certbot-nginx mongodb nodejs npm
    echo "System dependencies installed"
fi

# Backup the database
if [ "$BACKUP_DB" = true ]; then
    echo "=== Backing up MongoDB database ==="
    ./backup.sh
    echo "Database backup completed"
fi

# Build the client application
echo "=== Building client application ==="
cd "$SCRIPT_DIR/client"
npm ci
npm run build
echo "Client build completed"

# Install server dependencies
echo "=== Installing server dependencies ==="
cd "$SCRIPT_DIR/server"
npm ci
echo "Server dependencies installed"

# Set up PM2 process manager
if [ "$SETUP_PM2" = true ]; then
    echo "=== Setting up PM2 process manager ==="
    sudo npm install -g pm2
    
    # Create PM2 ecosystem file
    cat > "$SCRIPT_DIR/ecosystem.config.js" << EOF
module.exports = {
  apps: [{
    name: 'boxwise',
    script: './server/src/index.js',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 5001
    },
    watch: false,
    max_memory_restart: '500M'
  }]
};
EOF
    
    # Set up PM2 to start on boot
    sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u $USER --hp $HOME
    
    echo "PM2 setup completed"
fi

# Set up Nginx configuration
if [ "$SETUP_NGINX" = true ]; then
    echo "=== Setting up Nginx configuration ==="
    
    # Create Nginx configuration file
    sudo tee /etc/nginx/sites-available/$DOMAIN > /dev/null << EOF
server {
    listen 80;
    server_name $DOMAIN www.$DOMAIN;
    
    location / {
        root /var/www/boxwise;
        index index.html;
        try_files \$uri \$uri/ /index.html;
    }
    
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
EOF
    
    # Enable the site
    sudo ln -sf /etc/nginx/sites-available/$DOMAIN /etc/nginx/sites-enabled/
    
    # Remove default site if it exists
    sudo rm -f /etc/nginx/sites-enabled/default
    
    # Create directory for static files
    sudo mkdir -p /var/www/boxwise
    
    # Copy built client files to Nginx directory
    sudo cp -r "$SCRIPT_DIR/client/build/"* /var/www/boxwise/
    
    # Set proper permissions
    sudo chown -R www-data:www-data /var/www/boxwise
    
    # Test Nginx configuration
    sudo nginx -t
    
    # Reload Nginx
    sudo systemctl reload nginx
    
    echo "Nginx configuration completed"
fi

# Set up Let's Encrypt SSL certificates
if [ "$SETUP_LETSENCRYPT" = true ]; then
    echo "=== Setting up Let's Encrypt SSL certificates ==="
    
    # Obtain SSL certificates
    sudo certbot --nginx -d $DOMAIN -d www.$DOMAIN --non-interactive --agree-tos -m $EMAIL
    
    # Set up auto-renewal
    echo "0 3 * * * root certbot renew --quiet" | sudo tee -a /etc/crontab > /dev/null
    
    echo "Let's Encrypt SSL certificates installed"
fi

# Start the application with PM2
if [ "$SETUP_PM2" = true ]; then
    echo "=== Starting application with PM2 ==="
    cd "$SCRIPT_DIR"
    pm2 start ecosystem.config.js
    pm2 save
    echo "Application started with PM2"
fi

echo "=== Deployment completed successfully ==="
echo ""
echo "Next steps:"
echo "1. Make sure your domain ($DOMAIN) is pointing to this server's IP address"
echo "2. If you haven't set up Let's Encrypt, you can run this script again with the -l option"
echo "3. To check the application status, run: pm2 status"
echo "4. To view logs, run: pm2 logs boxwise"
echo ""
echo "To develop locally:"
echo "1. Stop the PM2 process: pm2 stop boxwise"
echo "2. Start the development servers:"
echo "   - Backend: cd server && npm run dev"
echo "   - Frontend: cd client && npm start"

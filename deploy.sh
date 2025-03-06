#!/bin/bash

# Boxwise deployment script for Digital Ocean

# Check if running as root
if [ "$(id -u)" != "0" ]; then
   echo "This script must be run as root" 1>&2
   exit 1
fi

# Set variables
APP_DIR=$(pwd)
NGINX_SSL_DIR="$APP_DIR/nginx/ssl"
ENV_FILE="$APP_DIR/.env"
DOMAIN=""

# Function to display usage
usage() {
  echo "Usage: $0 -d yourdomain.com [-e env_file]"
  echo "  -d  Domain name (required)"
  echo "  -e  Path to environment file (default: .env)"
  exit 1
}

# Parse command line arguments
while getopts "d:e:" opt; do
  case $opt in
    d) DOMAIN="$OPTARG" ;;
    e) ENV_FILE="$OPTARG" ;;
    *) usage ;;
  esac
done

# Check if domain is provided
if [ -z "$DOMAIN" ]; then
  usage
fi

echo "=== Boxwise Deployment to Digital Ocean ==="
echo "Domain: $DOMAIN"
echo "Environment file: $ENV_FILE"
echo

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
  echo "Docker is not installed. Installing Docker..."
  curl -fsSL https://get.docker.com -o get-docker.sh
  sh get-docker.sh
  rm get-docker.sh
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null; then
  echo "Docker Compose is not installed. Installing Docker Compose..."
  curl -L "https://github.com/docker/compose/releases/download/v2.20.3/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
  chmod +x /usr/local/bin/docker-compose
fi

# Check if Certbot is installed
if ! command -v certbot &> /dev/null; then
  echo "Certbot is not installed. Installing Certbot..."
  apt-get update
  apt-get install -y certbot
fi

# Create environment file if it doesn't exist
if [ ! -f "$ENV_FILE" ]; then
  echo "Creating environment file..."
  cp .env.production "$ENV_FILE"

# Generate a secure JWT secret if not provided
 if [ -z "$JWT_SECRET" ]; then
   echo "Generating a secure JWT secret..."
   JWT_SECRET=$(openssl rand -base64 32)
 fi
  
# Use the JWT_SECRET from .env.production
sed -i "s/__REPLACE_WITH_SECURE_JWT_SECRET__/$JWT_SECRET/g" "$ENV_FILE"
  
  echo "Environment file created. Please review and update if needed."
fi

# Update Nginx configuration with domain
echo "Updating Nginx configuration..."
mkdir -p nginx
if [ ! -f "nginx/nginx.conf" ]; then
  echo "Nginx configuration file not found. Creating..."
  mkdir -p nginx
  cat > nginx/nginx.conf << EOF
server {
    listen 80;
    server_name $DOMAIN www.$DOMAIN;
    
    # Redirect to HTTPS
    return 301 https://\$host\$request_uri;
}

server {
    listen 443 ssl;
    server_name $DOMAIN www.$DOMAIN;
    
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
        root /usr/share/nginx/html;
        index index.html;
        try_files \$uri \$uri/ /index.html;
    }
    
    # Proxy API requests
    location /api {
        proxy_pass http://app:5001;
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
else
  # Update existing Nginx configuration
  sed -i "s/server_name _;/server_name $DOMAIN www.$DOMAIN;/g" nginx/nginx.conf
  sed -i "s/server_name .*$/server_name $DOMAIN www.$DOMAIN;/g" nginx/nginx.conf
fi

# Generate SSL certificates
echo "Generating SSL certificates..."
mkdir -p "$NGINX_SSL_DIR"

# Stop any running containers that might be using port 80
docker-compose down 2>/dev/null || true

# Generate certificates using Certbot
certbot certonly --standalone --non-interactive --agree-tos --email admin@$DOMAIN -d $DOMAIN -d www.$DOMAIN

# Copy certificates to Nginx SSL directory
cp /etc/letsencrypt/live/$DOMAIN/fullchain.pem "$NGINX_SSL_DIR/cert.pem"
cp /etc/letsencrypt/live/$DOMAIN/privkey.pem "$NGINX_SSL_DIR/key.pem"

# Set up automatic certificate renewal
echo "Setting up automatic certificate renewal..."
crontab -l > /tmp/crontab.tmp || echo "" > /tmp/crontab.tmp
if ! grep -q "certbot renew" /tmp/crontab.tmp; then
  echo "0 3 * * * certbot renew --quiet && cp /etc/letsencrypt/live/$DOMAIN/fullchain.pem $NGINX_SSL_DIR/cert.pem && cp /etc/letsencrypt/live/$DOMAIN/privkey.pem $NGINX_SSL_DIR/key.pem && docker-compose restart nginx" >> /tmp/crontab.tmp
  crontab /tmp/crontab.tmp
fi
rm /tmp/crontab.tmp

# Set up backup script
echo "Setting up backup script..."
if [ ! -f "backup.sh" ]; then
  cat > backup.sh << 'EOF'
#!/bin/bash

# MongoDB backup script for Boxwise application

# Set variables
TIMESTAMP=$(date +"%Y%m%d%H%M%S")
BACKUP_DIR="/root/backups"
RETENTION_DAYS=7

# Create backup directory if it doesn't exist
mkdir -p $BACKUP_DIR

# Log start of backup
echo "Starting MongoDB backup at $(date)"

# Create MongoDB dump
docker-compose exec -T mongodb mongodump --out=/dump
if [ $? -ne 0 ]; then
    echo "Error: MongoDB dump failed"
    exit 1
fi

# Copy dump from container to host
docker cp boxwise-mongodb:/dump $BACKUP_DIR/mongodb_$TIMESTAMP
if [ $? -ne 0 ]; then
    echo "Error: Failed to copy dump from container"
    exit 1
fi

# Compress the backup
tar -czf $BACKUP_DIR/mongodb_$TIMESTAMP.tar.gz $BACKUP_DIR/mongodb_$TIMESTAMP
if [ $? -ne 0 ]; then
    echo "Error: Failed to compress backup"
    exit 1
fi

# Remove uncompressed backup
rm -rf $BACKUP_DIR/mongodb_$TIMESTAMP

# Remove backups older than RETENTION_DAYS days
find $BACKUP_DIR -name "mongodb_*.tar.gz" -type f -mtime +$RETENTION_DAYS -delete

# Log completion of backup
echo "MongoDB backup completed at $(date)"
echo "Backup saved to $BACKUP_DIR/mongodb_$TIMESTAMP.tar.gz"

echo "Backup process completed successfully"
EOF
  chmod +x backup.sh
fi

# Set up backup cron job
crontab -l > /tmp/crontab.tmp || echo "" > /tmp/crontab.tmp
if ! grep -q "backup.sh" /tmp/crontab.tmp; then
  echo "0 2 * * * $APP_DIR/backup.sh" >> /tmp/crontab.tmp
  crontab /tmp/crontab.tmp
fi
rm /tmp/crontab.tmp

# Set up firewall
echo "Setting up firewall..."
ufw allow ssh
ufw allow http
ufw allow https
ufw --force enable

# Build and start the application
echo "Building and starting the application..."
docker-compose up -d --build

# Initialize the database if needed
echo "Checking if database initialization is needed..."
sleep 10  # Wait for MongoDB to start
COLLECTIONS=$(docker-compose exec -T mongodb mongo --quiet --eval "db.getCollectionNames()" boxwise)
if [[ $COLLECTIONS == *"[]"* ]]; then
  echo "Initializing database with demo data..."
  docker-compose exec -T app node scripts/init-db.js
else
  echo "Database already initialized."
fi

echo
echo "=== Deployment Complete ==="
echo "Your Boxwise application is now running at https://$DOMAIN"
echo
echo "Default login credentials:"
echo "  Owner: owner@example.com / password123"
echo "  Admin: admin@example.com / password123"
echo "  User: user@example.com / password123"
echo
echo "IMPORTANT: Change these passwords immediately after first login!"
echo
echo "To view logs:"
echo "  docker-compose logs -f"
echo
echo "To restart the application:"
echo "  docker-compose restart"
echo
echo "To update the application:"
echo "  git pull"
echo "  docker-compose up -d --build"
echo

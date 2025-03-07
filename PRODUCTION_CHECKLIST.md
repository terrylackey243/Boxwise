# Boxwise Production Deployment Checklist

This checklist will guide you through the process of deploying the Boxwise application to a production environment using Let's Encrypt for SSL certificates.

## Prerequisites

- [ ] A server running Ubuntu 20.04 or later
- [ ] A domain name pointing to your server's IP address
- [ ] SSH access to your server
- [ ] Root or sudo privileges on your server

## Pre-Deployment Steps

- [ ] Back up any existing data if you're migrating from another system
- [ ] Ensure your domain's DNS records are properly configured to point to your server
- [ ] Make sure ports 80 and 443 are open on your server's firewall

## Deployment Process

### 1. Clone the Repository

- [ ] SSH into your server
- [ ] Clone the repository:
  ```
  git clone https://github.com/yourusername/boxwise.git
  cd boxwise
  ```

### 2. Make Scripts Executable

- [ ] Make the deployment and environment switching scripts executable:
  ```
  chmod +x deploy.sh switch-env.sh backup.sh
  ```

### 3. Run the Deployment Script

- [ ] Run the deployment script with the appropriate options:
  ```
  ./deploy.sh -d yourdomain.com -e your@email.com -i -l -p -n -b
  ```
  
  Options:
  - `-d, --domain`: Your domain name (required)
  - `-e, --email`: Your email for Let's Encrypt registration (required for SSL)
  - `-i, --install-deps`: Install system dependencies
  - `-l, --setup-letsencrypt`: Set up Let's Encrypt SSL certificates
  - `-p, --setup-pm2`: Set up PM2 process manager
  - `-n, --setup-nginx`: Set up Nginx configuration
  - `-b, --backup-db`: Backup the MongoDB database

### 4. Verify the Deployment

- [ ] Check that Nginx is running:
  ```
  sudo systemctl status nginx
  ```

- [ ] Check that PM2 is running your application:
  ```
  pm2 status
  ```

- [ ] Visit your domain in a web browser to ensure the application is working
- [ ] Test the SSL certificate by checking for the padlock icon in your browser

## Post-Deployment Steps

### 1. Set Up Regular Backups

- [ ] Configure the backup script to run regularly:
  ```
  crontab -e
  ```
  
  Add a line to run the backup script daily at 2 AM:
  ```
  0 2 * * * /path/to/boxwise/backup.sh
  ```

### 2. Set Up Monitoring

- [ ] Install and configure a monitoring solution like Prometheus, Grafana, or a simpler tool like Monit
- [ ] Set up alerts for server resource usage, application errors, and downtime

### 3. Security Hardening

- [ ] Set up a firewall (if not already done):
  ```
  sudo ufw allow 22
  sudo ufw allow 80
  sudo ufw allow 443
  sudo ufw enable
  ```

- [ ] Configure fail2ban to protect against brute force attacks:
  ```
  sudo apt-get install fail2ban
  sudo systemctl enable fail2ban
  sudo systemctl start fail2ban
  ```

- [ ] Regularly update your system:
  ```
  sudo apt-get update
  sudo apt-get upgrade
  ```

## Maintenance Tasks

### Updating the Application

1. Pull the latest changes:
   ```
   cd /path/to/boxwise
   git pull
   ```

2. Switch to production environment:
   ```
   ./switch-env.sh prod
   ```

### Switching Between Environments

- To switch to development environment:
  ```
  ./switch-env.sh dev
  ```

- To switch to production environment:
  ```
  ./switch-env.sh prod
  ```

### Monitoring Logs

- View application logs:
  ```
  pm2 logs boxwise
  ```

- View Nginx access logs:
  ```
  sudo tail -f /var/log/nginx/access.log
  ```

- View Nginx error logs:
  ```
  sudo tail -f /var/log/nginx/error.log
  ```

## Troubleshooting

### Application Not Starting

1. Check PM2 logs:
   ```
   pm2 logs boxwise
   ```

2. Verify the environment file:
   ```
   cat server/.env
   ```

3. Restart the application:
   ```
   pm2 restart boxwise
   ```

### SSL Certificate Issues

1. Check Certbot status:
   ```
   sudo certbot certificates
   ```

2. Renew certificates manually:
   ```
   sudo certbot renew --dry-run
   sudo certbot renew
   ```

### Nginx Issues

1. Test Nginx configuration:
   ```
   sudo nginx -t
   ```

2. Restart Nginx:
   ```
   sudo systemctl restart nginx
   ```

## Additional Resources

- [PM2 Documentation](https://pm2.keymetrics.io/docs/usage/quick-start/)
- [Nginx Documentation](https://nginx.org/en/docs/)
- [Let's Encrypt Documentation](https://letsencrypt.org/docs/)
- [MongoDB Documentation](https://docs.mongodb.com/)

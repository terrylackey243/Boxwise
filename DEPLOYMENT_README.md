# Boxwise Deployment Guide

This document provides instructions for deploying the Boxwise application to Digital Ocean using Docker and Docker Compose.

## Deployment Options

There are two ways to deploy Boxwise to Digital Ocean:

1. **Automated Deployment**: Using the provided `deploy.sh` script
2. **Manual Deployment**: Following the step-by-step instructions in `DIGITAL_OCEAN_DEPLOYMENT.md`

## Option 1: Automated Deployment

The `deploy.sh` script automates the entire deployment process, including:

- Installing required dependencies (Docker, Docker Compose, Certbot)
- Generating SSL certificates
- Configuring Nginx
- Setting up automatic certificate renewal
- Configuring the database
- Setting up automatic backups
- Starting the application

### Prerequisites

- A Digital Ocean Droplet with Ubuntu (recommended: at least 2GB RAM, 1 CPU)
- A domain name with DNS configured to point to your Droplet's IP address
- SSH access to your Droplet

### Deployment Steps

1. SSH into your Digital Ocean Droplet:
   ```bash
   ssh root@your_droplet_ip
   ```

2. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/boxwise.git
   cd boxwise
   ```

3. Make the deployment script executable:
   ```bash
   chmod +x deploy.sh
   ```

4. Run the deployment script with your domain name:
   ```bash
   ./deploy.sh -d yourdomain.com
   ```

5. Follow the on-screen instructions to complete the deployment.

6. Once the deployment is complete, visit your domain in a web browser:
   ```
   https://yourdomain.com
   ```

7. Log in with the default credentials:
   - Owner: owner@example.com / password123
   - Admin: admin@example.com / password123
   - User: user@example.com / password123

8. **IMPORTANT**: Change the default passwords immediately after logging in!

### Updating the Application

To update the application:

1. SSH into your Digital Ocean Droplet
2. Navigate to the application directory:
   ```bash
   cd boxwise
   ```
3. Pull the latest changes:
   ```bash
   git pull
   ```
4. Rebuild and restart the containers:
   ```bash
   docker-compose up -d --build
   ```

## Option 2: Manual Deployment

For more control over the deployment process, you can follow the step-by-step instructions in the `DIGITAL_OCEAN_DEPLOYMENT.md` file.

This approach is recommended if:
- You need to customize the deployment process
- You want to understand each step of the deployment
- You're deploying to a different environment than Digital Ocean

## Deployment Files

The following files are included for deployment:

- `Dockerfile`: Defines how to build the Boxwise application Docker image
- `docker-compose.yml`: Defines the services (MongoDB, Boxwise app, Nginx)
- `nginx/nginx.conf`: Nginx configuration for serving the application
- `.env.production`: Template for environment variables
- `backup.sh`: Script for backing up MongoDB data
- `deploy.sh`: Automated deployment script
- `DIGITAL_OCEAN_DEPLOYMENT.md`: Step-by-step manual deployment instructions

## Troubleshooting

### Container Logs

If you encounter issues, check the container logs:

```bash
docker-compose logs app
docker-compose logs mongodb
docker-compose logs nginx
```

### Restart Containers

If you need to restart the containers:

```bash
docker-compose restart
```

### SSL Certificate Issues

If you encounter SSL certificate issues:

1. Check if the certificates exist:
   ```bash
   ls -la nginx/ssl
   ```

2. Regenerate the certificates:
   ```bash
   certbot certonly --standalone -d yourdomain.com -d www.yourdomain.com
   cp /etc/letsencrypt/live/yourdomain.com/fullchain.pem nginx/ssl/cert.pem
   cp /etc/letsencrypt/live/yourdomain.com/privkey.pem nginx/ssl/key.pem
   docker-compose restart nginx
   ```

### Database Issues

If you encounter database issues:

1. Check if MongoDB is running:
   ```bash
   docker-compose ps mongodb
   ```

2. Check MongoDB logs:
   ```bash
   docker-compose logs mongodb
   ```

3. Reset the database (WARNING: This will delete all data):
   ```bash
   docker-compose down
   docker volume rm boxwise_mongodb_data
   docker-compose up -d
   docker-compose exec app node scripts/init-db.js
   ```

## Security Considerations

1. Change the default passwords for the demo accounts
2. Regularly update your Docker images and host system
3. Set up fail2ban to prevent brute force attacks
4. Consider using Digital Ocean's Cloud Firewall for additional protection
5. Enable automatic security updates for your Droplet

## Backups

The deployment includes an automatic backup system that:

1. Creates daily backups of the MongoDB database
2. Stores backups in the `/root/backups` directory
3. Keeps backups for 7 days (configurable in `backup.sh`)

To manually create a backup:

```bash
./backup.sh
```

To restore a backup:

```bash
# Extract the backup
tar -xzf /root/backups/mongodb_YYYYMMDDHHMMSS.tar.gz -C /tmp

# Restore the database
docker-compose exec -T mongodb mongorestore --drop /tmp/mongodb_YYYYMMDDHHMMSS/dump
```

## Support

If you encounter any issues with the deployment, please:

1. Check the troubleshooting section above
2. Review the logs for error messages
3. Consult the Digital Ocean documentation
4. Reach out to the Boxwise community for support

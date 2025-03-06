# Deploying Boxwise to Digital Ocean

This guide will walk you through deploying the Boxwise application to Digital Ocean using Docker and Docker Compose.

## Prerequisites

1. A Digital Ocean account
2. Domain name with DNS configured to point to your Digital Ocean Droplet
3. Basic knowledge of Docker, Docker Compose, and Linux commands

## Step 1: Create a Digital Ocean Droplet

1. Log in to your Digital Ocean account
2. Click on "Create" and select "Droplets"
3. Choose an image: Select the "Marketplace" tab and choose "Docker"
4. Choose a plan: Select a Standard plan with at least 2GB RAM and 1 CPU
5. Choose a datacenter region close to your target audience
6. Add your SSH key or create a password
7. Choose a hostname (e.g., boxwise-app)
8. Click "Create Droplet"

## Step 2: Connect to Your Droplet

Once your Droplet is created, connect to it via SSH:

```bash
ssh root@your_droplet_ip
```

## Step 3: Clone the Repository

Clone the Boxwise repository to your Droplet:

```bash
git clone https://github.com/yourusername/boxwise.git
cd boxwise
```

## Step 4: Configure Environment Variables

1. Create a `.env` file for Docker Compose:

```bash
cp .env.production .env
```

2. Edit the `.env` file to set your production values:

```bash
nano .env
```

Make sure to:
- Generate a secure random string for `JWT_SECRET`
- Add your UPC API key if you have one
- Update any other settings as needed

## Step 5: Generate SSL Certificates

You can use Let's Encrypt to generate free SSL certificates:

1. Install Certbot:

```bash
apt-get update
apt-get install certbot
```

2. Generate certificates:

```bash
mkdir -p nginx/ssl
certbot certonly --standalone -d yourdomain.com -d www.yourdomain.com
```

3. Copy the certificates to the Nginx SSL directory:

```bash
cp /etc/letsencrypt/live/yourdomain.com/fullchain.pem nginx/ssl/cert.pem
cp /etc/letsencrypt/live/yourdomain.com/privkey.pem nginx/ssl/key.pem
```

## Step 6: Update Nginx Configuration

Edit the Nginx configuration file to use your domain name:

```bash
nano nginx/nginx.conf
```

Replace the `server_name _` lines with your domain:

```
server_name yourdomain.com www.yourdomain.com;
```

## Step 7: Build and Start the Application

Build and start the Docker containers:

```bash
docker-compose up -d
```

This will:
1. Build the Boxwise application Docker image
2. Start MongoDB, the Boxwise application, and Nginx
3. Set up the network and volumes

## Step 8: Initialize the Database

If this is a fresh installation, you'll need to initialize the database with demo data:

```bash
docker-compose exec app node scripts/init-db.js
```

## Step 9: Set Up Automatic SSL Renewal

Create a cron job to automatically renew your SSL certificates:

```bash
crontab -e
```

Add the following line:

```
0 3 * * * certbot renew --quiet && cp /etc/letsencrypt/live/yourdomain.com/fullchain.pem /root/boxwise/nginx/ssl/cert.pem && cp /etc/letsencrypt/live/yourdomain.com/privkey.pem /root/boxwise/nginx/ssl/key.pem && docker-compose restart nginx
```

This will check for certificate renewal at 3 AM every day, and restart Nginx if the certificates are renewed.

## Step 10: Set Up Firewall

Configure the firewall to allow only necessary traffic:

```bash
ufw allow ssh
ufw allow http
ufw allow https
ufw enable
```

## Step 11: Set Up Monitoring (Optional)

You can set up monitoring for your application using Digital Ocean's monitoring tools or a third-party service like Datadog or New Relic.

## Step 12: Set Up Backups

Set up regular backups of your MongoDB data:

1. Create a backup script:

```bash
nano backup.sh
```

2. Add the following content:

```bash
#!/bin/bash
TIMESTAMP=$(date +"%Y%m%d%H%M%S")
BACKUP_DIR="/root/backups"
mkdir -p $BACKUP_DIR
docker-compose exec -T mongodb mongodump --out=/dump
docker cp boxwise-mongodb:/dump $BACKUP_DIR/mongodb_$TIMESTAMP
tar -czf $BACKUP_DIR/mongodb_$TIMESTAMP.tar.gz $BACKUP_DIR/mongodb_$TIMESTAMP
rm -rf $BACKUP_DIR/mongodb_$TIMESTAMP
```

3. Make the script executable:

```bash
chmod +x backup.sh
```

4. Set up a cron job to run the backup script daily:

```bash
crontab -e
```

Add the following line:

```
0 2 * * * /root/boxwise/backup.sh
```

## Step 13: Test Your Deployment

Visit your domain in a web browser to ensure everything is working correctly:

```
https://yourdomain.com
```

You should be able to log in with the demo accounts:

- Owner: owner@example.com / password123
- Admin: admin@example.com / password123
- User: user@example.com / password123

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

### Rebuild the Application

If you make changes to the application code:

```bash
git pull
docker-compose up -d --build
```

## Updating the Application

To update the application:

1. Pull the latest changes:

```bash
git pull
```

2. Rebuild and restart the containers:

```bash
docker-compose up -d --build
```

## Scaling (Optional)

If you need to scale the application, you can:

1. Upgrade your Droplet to a larger size
2. Set up a load balancer with multiple Droplets
3. Use Digital Ocean's managed MongoDB service instead of running MongoDB in a container

## Security Considerations

1. Change the default passwords for the demo accounts
2. Regularly update your Docker images and host system
3. Set up fail2ban to prevent brute force attacks
4. Consider using Digital Ocean's Cloud Firewall for additional protection
5. Enable automatic security updates for your Droplet

## Conclusion

Your Boxwise application should now be running on Digital Ocean. If you encounter any issues or need further assistance, refer to the Digital Ocean documentation or seek help from the community.

# Detailed Deployment Guide for Boxwise

This guide provides step-by-step instructions for deploying the Boxwise application on DigitalOcean, along with an alternative option using Linode/Akamai.

## DigitalOcean Deployment Guide

### Step 1: Create a DigitalOcean Droplet

1. Sign up or log in to [DigitalOcean](https://www.digitalocean.com/)
2. Click "Create" and select "Droplets"
3. Choose the following specifications:
   - **Distribution**: Ubuntu 22.04 LTS
   - **Plan**: Basic
   - **CPU options**: Regular Intel with SSD
   - **Size**: 4GB RAM / 2 CPUs / 80GB SSD ($24/month)
   - **Datacenter Region**: Choose the region closest to your users
   - **VPC Network**: Default
   - **Authentication**: SSH keys (recommended) or Password
     - If using SSH keys, follow DigitalOcean's guide to add your public key
   - **Hostname**: boxwise-production (or your preferred name)
   - **Backups**: Enable weekly backups (recommended, adds 20% to cost)
4. Click "Create Droplet"

### Step 2: Set Up Domain (Optional but Recommended)

1. In DigitalOcean, go to "Networking" > "Domains"
2. Add your domain and create the following DNS records:
   - A record: @ pointing to your Droplet's IP
   - A record: www pointing to your Droplet's IP
   - Alternatively, you can manage DNS through your domain registrar

### Step 3: Initial Server Setup

1. SSH into your Droplet:
   ```bash
   ssh root@your_droplet_ip
   ```

2. Update the system:
   ```bash
   apt update && apt upgrade -y
   ```

3. Create a non-root user with sudo privileges:
   ```bash
   adduser boxwise
   usermod -aG sudo boxwise
   ```

4. Set up basic firewall:
   ```bash
   ufw allow OpenSSH
   ufw allow 80/tcp
   ufw allow 443/tcp
   ufw enable
   ```

5. Switch to the new user:
   ```bash
   su - boxwise
   ```

### Step 4: Install Docker and Docker Compose

1. Install Docker:
   ```bash
   sudo apt install apt-transport-https ca-certificates curl software-properties-common -y
   curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo apt-key add -
   sudo add-apt-repository "deb [arch=amd64] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable"
   sudo apt update
   sudo apt install docker-ce -y
   ```

2. Add your user to the docker group:
   ```bash
   sudo usermod -aG docker ${USER}
   ```

3. Apply the group change (or log out and back in):
   ```bash
   newgrp docker
   ```

4. Install Docker Compose:
   ```bash
   sudo curl -L "https://github.com/docker/compose/releases/download/v2.18.1/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
   sudo chmod +x /usr/local/bin/docker-compose
   ```

5. Verify installations:
   ```bash
   docker --version
   docker-compose --version
   ```

### Step 5: Set Up SSL Certificates

1. Install Certbot:
   ```bash
   sudo apt install certbot -y
   ```

2. If you're using a domain, obtain SSL certificates:
   ```bash
   sudo certbot certonly --standalone -d yourdomain.com -d www.yourdomain.com
   ```
   
   If you don't have a domain yet, you can generate self-signed certificates:
   ```bash
   sudo openssl req -x509 -nodes -days 365 -newkey rsa:2048 -keyout /etc/ssl/private/nginx-selfsigned.key -out /etc/ssl/certs/nginx-selfsigned.crt
   ```

### Step 6: Clone and Configure the Repository

1. Install Git:
   ```bash
   sudo apt install git -y
   ```

2. Clone the repository:
   ```bash
   mkdir -p ~/projects
   cd ~/projects
   git clone https://github.com/yourusername/boxwise.git
   cd boxwise
   ```

3. Create the nginx/ssl directory:
   ```bash
   mkdir -p nginx/ssl
   ```

4. Copy SSL certificates:
   
   If using Let's Encrypt:
   ```bash
   sudo cp /etc/letsencrypt/live/yourdomain.com/fullchain.pem nginx/ssl/cert.pem
   sudo cp /etc/letsencrypt/live/yourdomain.com/privkey.pem nginx/ssl/key.pem
   sudo chown -R $USER:$USER nginx/ssl
   ```
   
   If using self-signed certificates:
   ```bash
   sudo cp /etc/ssl/certs/nginx-selfsigned.crt nginx/ssl/cert.pem
   sudo cp /etc/ssl/private/nginx-selfsigned.key nginx/ssl/key.pem
   sudo chown -R $USER:$USER nginx/ssl
   ```

5. Update Nginx configuration:
   ```bash
   # Edit the nginx.conf file to use your domain or IP
   nano nginx/nginx.conf
   ```
   
   Update the `server_name` directive to match your domain or IP:
   ```
   server_name yourdomain.com www.yourdomain.com;
   ```
   
   If you don't have a domain, use your Droplet's IP:
   ```
   server_name your_droplet_ip;
   ```

### Step 7: Configure Production Environment

1. Switch to production environment:
   ```bash
   chmod +x switch-env.sh
   ./switch-env.sh prod
   ```

2. Make the deployment script executable:
   ```bash
   chmod +x deploy-production.sh
   chmod +x backup.sh
   chmod +x set-jwt-secret.sh
   ```

### Step 8: Deploy the Application

1. Run the deployment script:
   ```bash
   sudo ./deploy-production.sh
   ```

2. Verify the deployment:
   ```bash
   docker-compose ps
   ```
   
   All services should be in the "Up" state.

3. Check the logs for any errors:
   ```bash
   docker-compose logs
   ```

### Step 9: Set Up Automatic Backups

1. Edit the backup script to configure remote storage:
   ```bash
   nano backup.sh
   ```

2. Test the backup script:
   ```bash
   sudo ./backup.sh
   ```

3. Set up a cron job for regular backups:
   ```bash
   (crontab -l 2>/dev/null || echo "") | { cat; echo "0 2 * * * $(pwd)/backup.sh > /var/log/boxwise-backup.log 2>&1"; } | crontab -
   ```

### Step 10: Access Your Application

1. Open your browser and navigate to:
   - If you have a domain: `https://yourdomain.com`
   - If you're using IP only: `https://your_droplet_ip`

2. You should see the Boxwise login page. Log in with the demo account:
   - Email: owner@example.com
   - Password: password123

## Common Issues and Troubleshooting

### Issue 1: Docker Compose Not Starting All Services

**Solution:**
```bash
docker-compose down
docker system prune -a --volumes
docker-compose up -d --build
```

### Issue 2: MongoDB Connection Errors

**Solution:**
Check the MongoDB connection string in `.env`:
```bash
cat server/.env
```

Ensure it's set to:
```
MONGO_URI=mongodb://mongodb:27017/boxwise
```

### Issue 3: Nginx SSL Certificate Issues

**Solution:**
Verify certificate paths and permissions:
```bash
ls -la nginx/ssl/
```

Regenerate certificates if needed:
```bash
sudo certbot certonly --standalone -d yourdomain.com -d www.yourdomain.com
```

### Issue 4: Permission Denied Errors

**Solution:**
```bash
sudo chown -R $USER:$USER .
chmod +x *.sh
```

### Issue 5: Port Already in Use

**Solution:**
Check what's using the ports:
```bash
sudo lsof -i :80
sudo lsof -i :443
```

Stop the conflicting service:
```bash
sudo systemctl stop nginx  # If Nginx is running outside Docker
```

## Alternative Deployment Option: Linode/Akamai

Linode (now part of Akamai) is an excellent alternative to DigitalOcean with similar pricing and features, but often with better performance and support.

### Step 1: Create a Linode

1. Sign up or log in to [Linode](https://www.linode.com/)
2. Click "Create" and select "Linode"
3. Choose the following specifications:
   - **Distribution**: Ubuntu 22.04 LTS
   - **Region**: Choose the region closest to your users
   - **Linode Plan**: Shared CPU, 4GB RAM ($24/month)
   - **Label**: boxwise-production
   - **Root Password**: Set a secure password
   - **SSH Keys**: Add your SSH key (recommended)
4. Click "Create Linode"

### Step 2: Follow the Same Setup Steps

Follow steps 2-10 from the DigitalOcean guide above. The commands are identical since both platforms use Ubuntu 22.04 LTS.

## Monitoring Your Deployment

### Basic Monitoring

1. Check container status:
   ```bash
   docker-compose ps
   ```

2. View logs:
   ```bash
   docker-compose logs -f
   ```

3. Check resource usage:
   ```bash
   docker stats
   ```

### Advanced Monitoring (Optional)

1. Install Netdata for real-time monitoring:
   ```bash
   bash <(curl -Ss https://my-netdata.io/kickstart.sh)
   ```

2. Access Netdata dashboard:
   ```
   http://your_droplet_ip:19999
   ```

## Conclusion

By following this guide, you should have a fully functional Boxwise application deployed on either DigitalOcean or Linode. Both platforms allow SSH access for monitoring and troubleshooting.

If you encounter any issues during deployment, refer to the troubleshooting section or check the logs for specific error messages.

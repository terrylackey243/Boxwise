# Boxwise Production Deployment Checklist

This document outlines the steps required to deploy the Boxwise application to a production environment.

## Prerequisites

- [ ] Server with Docker and Docker Compose installed
- [ ] Domain name configured to point to your server (e.g., boxwise.app)
- [ ] UPC API key (optional - using free trial version for now)
- [ ] SSL certificates (or ability to generate Let's Encrypt certificates)
- [ ] Remote backup server configured (optional but recommended)

## Pre-Deployment Steps

- [ ] Review and update environment variables in `server/.env`
- [ ] Ensure MongoDB connection string is set to `mongodb://mongodb:27017/boxwise`
- [ ] Set `NODE_ENV=production` in `server/.env`
- [ ] Configure UPC API key in `server/.env` (optional - using free trial version for now)
- [ ] Generate a secure JWT secret using `set-jwt-secret.sh`
- [ ] Obtain SSL certificates and place them in `nginx/ssl/` directory
- [ ] Configure remote backup server in `backup.sh`
- [ ] Review and update Nginx configuration in `nginx/nginx.conf` if needed
- [ ] Remove all console.log statements from client code

## Deployment Steps

1. Clone the repository to your production server
2. Navigate to the project directory
3. Run the deployment script (UPC API key is optional):
   ```
   # Without UPC API key (using free trial)
   sudo ./deploy-production.sh
   
   # Or with UPC API key if you have one
   sudo ./deploy-production.sh -u your_upc_api_key
   ```
4. Verify that all services are running:
   ```
   docker-compose ps
   ```
5. Check the logs for any errors:
   ```
   docker-compose logs
   ```

## Post-Deployment Steps

- [ ] Test the application by accessing it through your domain
- [ ] Verify that SSL is working correctly
- [ ] Test user authentication and authorization
- [ ] Test core functionality (items, locations, etc.)
- [ ] Verify that backups are working by checking the backup logs
- [ ] Set up monitoring and alerting
- [ ] Set up centralized logging
- [ ] Configure firewall rules to restrict access to necessary ports only
- [ ] Set up regular security updates for the server

## Maintenance Tasks

- [ ] Regularly check backup logs to ensure backups are running successfully
- [ ] Monitor disk space usage
- [ ] Set up a process for applying security updates
- [ ] Create a disaster recovery plan
- [ ] Document the deployment process for future reference

## Local Development After Production Deployment

To switch between production and development environments, use the provided `switch-env.sh` script:

1. Switch to development environment:
   ```
   ./switch-env.sh dev
   ```
   This will:
   - Copy `.env.development` to `.env`
   - Set the client proxy to `http://localhost:5001`

2. Start the development servers:
   ```
   # Terminal 1: Start the backend server
   cd server && npm run dev
   
   # Terminal 2: Start the frontend development server
   cd client && npm start
   ```

3. When you're ready to switch back to production:
   ```
   ./switch-env.sh prod
   ```
   This will:
   - Copy `.env.production` to `.env`
   - Set the client proxy to `http://app:5001`
   - You can then deploy using `docker-compose up -d --build`

## Security Considerations

- [ ] Use strong, unique passwords for all accounts
- [ ] Implement rate limiting for authentication endpoints
- [ ] Enable CSRF protection for sensitive operations
- [ ] Review and update Content-Security-Policy headers
- [ ] Regularly audit user accounts and permissions
- [ ] Keep all dependencies up to date
- [ ] Regularly scan for vulnerabilities

## Troubleshooting

If you encounter issues during deployment, check the following:

1. Docker container logs:
   ```
   docker-compose logs app
   docker-compose logs mongodb
   docker-compose logs nginx
   ```

2. Nginx error logs:
   ```
   docker-compose exec nginx cat /var/log/nginx/error.log
   ```

3. MongoDB connection:
   ```
   docker-compose exec mongodb mongo
   ```

4. Server environment variables:
   ```
   docker-compose exec app env
   ```

For additional help, refer to the project documentation or contact the development team.

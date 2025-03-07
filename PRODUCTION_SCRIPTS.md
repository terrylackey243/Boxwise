# Boxwise Production Scripts

This document explains how to use the production scripts to properly start and stop the Boxwise application in a production environment.

## Overview

The Boxwise application consists of three main components:

1. **MongoDB Database**: Stores all application data
2. **Backend Server**: Node.js/Express API server
3. **Frontend Client**: React application

For proper production deployment, the frontend should be built into static files and served by a web server like Nginx, while the backend should run as a service managed by a process manager like PM2.

## Scripts

### Start Production Script (`start-production.sh`)

This script starts all necessary services for running Boxwise in production mode:

1. Sets the server environment to production
2. Ensures MongoDB is running
3. Builds the client application if needed
4. Serves the client application (using Nginx if configured, or a simple HTTP server if not)
5. Starts the backend server (using PM2 if available, or directly if not)

#### Usage

```bash
./start-production.sh
```

#### What it does

- Copies the production environment file to the server directory
- Checks if MongoDB is running and tries to start it if not
- Builds the client application if it hasn't been built yet
- Checks for Nginx configuration and uses it if available
- Falls back to using the `serve` package if Nginx is not configured
- Starts the backend server using PM2 if available, or directly if not
- Creates log files and PID files for tracking the running processes

### Stop Production Script (`stop-production.sh`)

This script stops all services started by the start-production script:

1. Stops the backend server
2. Stops the frontend server (if started with `serve`)

#### Usage

```bash
./stop-production.sh
```

#### What it does

- Stops the backend server (using PM2 if it was started that way, or by killing the process if not)
- Stops the frontend server if it was started with `serve`
- Cleans up PID files
- Does NOT stop Nginx or MongoDB as they may be used by other applications

### Restart Production Script (`restart-production.sh`)

This script restarts all services by stopping them and then starting them again:

1. Stops all services using the stop-production.sh script
2. Waits a moment for processes to terminate
3. Starts all services again using the start-production.sh script

#### Usage

```bash
./restart-production.sh
```

#### What it does

- Calls the stop-production.sh script to stop all services
- Waits for processes to terminate
- Calls the start-production.sh script to start all services again

## Production Deployment

For a full production deployment, it's recommended to:

1. Run the `deploy.sh` script with appropriate options to set up the server environment
2. Use the `start-production.sh` script to start the application
3. Use the `stop-production.sh` script when you need to stop the application

### Example Full Deployment

```bash
# First-time setup
./deploy.sh -d yourdomain.com -e your@email.com -i -l -p -n -b

# Start the application
./start-production.sh

# When needed, stop the application
./stop-production.sh

# To restart the application
./restart-production.sh
```

## Copying Scripts to Production Server

Since these scripts need to be run on the production server, you'll need to copy them to that server. A helper script has been provided to make this process easier.

### Using the Copy to Production Script

The `copy-to-production.sh` script automates the process of copying all necessary files to your production server:

```bash
# From your local machine
./copy-to-production.sh -s user@your-production-server -p /path/to/boxwise/
```

Where:
- `-s` or `--server` specifies the server address (e.g., user@example.com)
- `-p` or `--path` specifies the path on the server (e.g., /var/www/boxwise)

The script will:
1. Copy all production scripts to the specified location on the server
2. Make the scripts executable on the server
3. Provide a summary of the copied files

### Manual Methods

If you prefer to copy the files manually, here are some alternative methods:

#### Using SCP (Secure Copy)

```bash
# From your local machine
scp start-production.sh stop-production.sh restart-production.sh PRODUCTION_SCRIPTS.md user@your-production-server:/path/to/boxwise/
```

#### Using SFTP

```bash
# From your local machine
sftp user@your-production-server
cd /path/to/boxwise
put start-production.sh
put stop-production.sh
put restart-production.sh
put PRODUCTION_SCRIPTS.md
exit
```

#### Using Git

If your production server has access to your Git repository:

```bash
# On your production server
cd /path/to/boxwise
git pull
chmod +x start-production.sh stop-production.sh restart-production.sh
```

After copying the scripts manually, make sure they are executable:

```bash
# On your production server
chmod +x start-production.sh stop-production.sh restart-production.sh
```

## Troubleshooting

### Logs

The scripts create log files that can be used for troubleshooting:

- Backend server log: `server.log`
- Frontend server log (if using `serve`): `client-serve.log`

If using PM2, you can view logs with:

```bash
pm2 logs boxwise
```

### Common Issues

1. **MongoDB not starting**: You may need to create the data directory or fix permissions
2. **Nginx configuration issues**: Check Nginx error logs at `/var/log/nginx/error.log`
3. **Port conflicts**: Ensure ports 3000 and 5001 are not being used by other applications

## Important Notes

- The scripts assume they are run from the Boxwise project root directory
- You may need sudo privileges for some operations (starting MongoDB, Nginx, etc.)
- For security in a real production environment, consider:
  - Using a firewall
  - Setting up HTTPS
  - Configuring proper database authentication
  - Running services with limited user privileges

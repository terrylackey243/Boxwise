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

### Status Production Script (`status-production.sh`)

This script checks the status of all Boxwise services in production mode:

1. Checks MongoDB status
2. Checks Nginx status and configuration
3. Checks frontend server status
4. Checks backend server status
5. Checks client build status

#### Usage

```bash
./status-production.sh
```

#### What it does

- Displays the status of MongoDB
- Checks if Nginx is running and properly configured for Boxwise
- Shows domain and SSL information if available
- Checks if the frontend is being served by Nginx or a separate server
- Displays PM2 status for the backend server
- Provides information about the client build

### Check Servers Script (`check-servers.sh`)

This script provides a simple, color-coded status check of all Boxwise services:

1. Checks and displays the status of MongoDB, Nginx, frontend, backend, and client build
2. Uses color coding to indicate status (green for up, yellow for warning, red for down)
3. Provides a summary of the overall system status

#### Usage

```bash
./check-servers.sh
```

#### What it does

- Uses color coding for easy status identification:
  - GREEN: Service is up and running
  - YELLOW: Service is running but with potential issues
  - RED: Service is down
- Provides concise details about each service
- Gives an overall summary of the system status
- Ideal for quick health checks of your production environment

### Check SSL Script (`check-ssl.sh`)

This script provides a comprehensive check of SSL certificate configuration:

1. Checks Nginx SSL configuration
2. Verifies SSL certificate existence and validity
3. Checks certificate expiration date
4. Verifies Let's Encrypt certificate status
5. Checks DNS resolution and server IP matching
6. Provides recommendations for fixing SSL issues

#### Usage

```bash
./check-ssl.sh
```

#### What it does

- Detects if SSL is properly configured in Nginx
- Checks certificate files and their expiration dates
- Verifies if Let's Encrypt certificates are installed and valid
- Checks if the domain is properly pointing to the server's IP
- Provides color-coded status for each check:
  - GREEN: Everything is properly configured
  - YELLOW: Warnings that need attention
  - RED: Critical issues that need to be fixed
- Gives specific recommendations for resolving SSL issues

### Create Owner Script (`create-owner-production.sh`)

This script creates an owner user in the Boxwise application on the production server:

1. Sets up the production environment
2. Ensures MongoDB is running
3. Creates an owner user with the specified email, password, and name

#### Usage

```bash
./create-owner-production.sh [options]
```

Options:
- `-e, --email EMAIL`: Email for the owner user (default: terry@jknelotions.com)
- `-p, --password PASSWORD`: Password for the owner user
- `-n, --name NAME`: Name for the owner user (default: Terry)
- `-h, --help`: Show help message

#### What it does

- Sets up the production environment
- Checks if MongoDB is running and starts it if needed
- Creates an owner user with admin privileges
- Provides color-coded output for easy status identification
- Confirms successful user creation with login details

### Get Database URL Script (`get-db-url.sh`)

This script retrieves and tests the MongoDB connection URL from the server's environment file:

1. Extracts the MongoDB connection URL from the environment file
2. Tests the connection to the database
3. Displays information about the database

#### Usage

```bash
./get-db-url.sh
```

#### What it does

- Determines which environment is being used (production or development)
- Extracts the MongoDB connection URL from the environment file
- Tests the connection to the database
- Displays database information including name, size, and collections
- Provides color-coded output for easy status identification

### Update from GitHub Script (`update-from-github.sh`)

This script pulls the latest changes from GitHub and updates the application:

1. Backs up the database (optional)
2. Pulls the latest changes from GitHub
3. Installs dependencies
4. Builds the client application
5. Restarts the application (optional)

#### Usage

```bash
./update-from-github.sh [options]
```

Options:
- `-b, --branch BRANCH`: Branch to pull from (default: main)
- `--no-backup`: Skip database backup before updating
- `--no-restart`: Skip restarting the application after updating
- `-h, --help`: Show help message

#### What it does

- Backs up the database before updating (can be skipped with --no-backup)
- Handles uncommitted changes by stashing them
- Pulls the latest changes from the specified branch
- Installs server and client dependencies
- Builds the client application
- Copies built files to the Nginx directory if it exists
- Restarts the application (can be skipped with --no-restart)
- Restores any stashed changes

### Check User Script (`check-user.sh`)

This script checks if a user exists in the MongoDB database and verifies its details:

1. Connects to the MongoDB database
2. Searches for a user with the specified email
3. Displays detailed information about the user if found
4. Provides troubleshooting steps for login issues

#### Usage

```bash
./check-user.sh [options]
```

Options:
- `-e, --email EMAIL`: Email of the user to check (default: terry@jknelotions.com)
- `-u, --uri URI`: MongoDB URI (default: mongodb://localhost:27017/boxwise)
- `-h, --help`: Show help message

#### What it does

- Connects to the specified MongoDB database
- Searches for a user with the given email address
- If the user is found, displays detailed information:
  - Name, role, password hash length, creation date
  - Group association and membership details
- If the user is not found, lists all existing users in the database
- Provides troubleshooting steps for login issues

### Check API Script (`check-api.sh`)

This script checks the API configuration and connectivity:

1. Checks Nginx configuration for API endpoints
2. Verifies backend server status
3. Tests API endpoints directly
4. Checks environment variables that might affect the API
5. Provides recommendations for fixing API issues

#### Usage

```bash
./check-api.sh
```

#### What it does

- Checks if Nginx is running and properly configured for API endpoints
- Looks for potential issues in the Nginx configuration, such as double API paths
- Verifies if the backend server is running and checks for errors in the logs
- Tests API endpoints directly to confirm they're accessible
- Checks environment variables that might affect the API configuration
- Provides detailed recommendations for fixing common API issues
- Especially useful for diagnosing 502 Bad Gateway errors and API connectivity problems

### Fix MongoDB Connection Script (`fix-mongodb-connection.sh`)

This script fixes MongoDB connection issues in the production environment:

1. Checks and updates the MongoDB connection URI in the server environment file
2. Ensures other required environment variables are set
3. Tests the MongoDB connection
4. Restarts the application to apply the changes

#### Usage

```bash
./fix-mongodb-connection.sh [options]
```

Options:
- `-u, --uri URI`: MongoDB URI (default: mongodb://localhost:27017/boxwise)
- `-h, --help`: Show help message

#### What it does

- Checks if the server environment file exists and creates it if needed
- Ensures MONGO_URI is properly set in the environment file
- Adds or updates other essential environment variables (NODE_ENV, PORT, JWT_SECRET)
- Tests the MongoDB connection to verify it works
- Offers to restart the application to apply the changes
- Provides detailed output and error messages for troubleshooting

### Boxwise Menu Script (`boxwise-menu.sh`)

This script provides a menu-driven interface for running all Boxwise production scripts:

1. Lists all available scripts organized by category
2. Displays a brief description of each script
3. Allows the user to select a script to run
4. Executes the selected script

#### Usage

```bash
./boxwise-menu.sh
```

#### What it does

- Displays a clear, organized menu of all available scripts
- Groups scripts by category:
  - Service Management
  - Status & Diagnostics
  - Maintenance & Fixes
  - Deployment
  - Other Scripts
- Provides a description for each script
- Allows running any script by selecting its number
- Returns to the menu after script execution
- Includes options to refresh the menu or quit

### Fix Production Script (`fix-production.sh`)

This script provides a comprehensive solution for diagnosing and fixing common production issues:

1. Checks and fixes MongoDB connection issues
2. Verifies and corrects Nginx configuration
3. Ensures PM2 is properly set up
4. Tests API connectivity
5. Provides a detailed summary and next steps

#### Usage

```bash
./fix-production.sh
```

#### What it does

- Checks if MongoDB, Nginx, and PM2 are installed and running
- Offers to install missing components if needed
- Fixes environment variables in server/.env and ecosystem.config.js
- Ensures MONGO_URI, JWT_SECRET, NODE_ENV, and PORT are properly set
- Detects and fixes double API path issues in Nginx configuration
- Restarts the application to apply changes
- Tests API connectivity to verify the fix worked
- Provides a detailed summary of the system status
- Suggests next steps for troubleshooting if issues persist

### Start Backend Script (`start-backend.sh`)

This script focuses specifically on getting the backend server running properly:

1. Ensures MongoDB is running and configured correctly
2. Sets up all required environment variables
3. Starts the backend server using PM2 or directly
4. Tests API connectivity to verify it's working
5. Provides detailed logs and troubleshooting steps

#### Usage

```bash
./start-backend.sh
```

#### What it does

- Checks if MongoDB is installed and running, offers to install if needed
- Ensures all required environment variables are set in server/.env
- Checks if the backend port is available or already in use
- Tests the MongoDB connection to verify it's working
- Starts the backend server using PM2 if available, or directly if not
- Creates or updates ecosystem.config.js with proper environment variables
- Waits for the server to start and tests API connectivity
- Displays backend server logs if there are issues
- Provides a detailed summary and specific troubleshooting steps

### Fix PM2 Environment Variables Script (`fix-pm2-env.sh`)

This script specifically addresses issues with environment variables in PM2:

1. Ensures environment variables are correctly passed to the application
2. Creates a new ecosystem.config.js file with explicit environment variables
3. Restarts the application with the updated configuration
4. Tests the environment variables and API connectivity

#### Usage

```bash
./fix-pm2-env.sh
```

#### What it does

- Checks if PM2 is installed and the application is running
- Reads environment variables from server/.env
- Sets environment variables directly in PM2 configuration
- Creates a new ecosystem.config.js file with explicit environment variables
- Restarts the application with the updated environment variables
- Runs a test script to verify environment variables are correctly passed
- Tests API connectivity to verify the fix worked
- Provides detailed logs and additional troubleshooting steps if needed

### Pull from GitHub Script (`pull-from-github.sh`)

This script pulls the latest changes from GitHub:

1. Switches to the specified branch
2. Handles uncommitted changes by offering to stash them
3. Pulls the latest changes from the remote repository
4. Shows the latest commits

#### Usage

```bash
./pull-from-github.sh [options]
```

Options:
- `-b, --branch BRANCH`: Branch to pull from (default: main)
- `-r, --remote REMOTE`: Remote to pull from (default: origin)
- `-h, --help`: Show help message

#### What it does

- Checks if the current directory is a git repository
- Verifies that the specified remote exists
- Checks if the specified branch exists and offers to create it if it doesn't
- Handles uncommitted changes by offering to stash them
- Pulls the latest changes from the specified remote and branch
- Offers to pop stashed changes after pulling
- Shows the latest commits to provide context about what was pulled

### Fix Nginx API Path Script (`fix-nginx-api.sh`)

This script fixes the double API path issue in Nginx configuration:

1. Locates Nginx configuration files with API settings
2. Identifies and fixes the double API path issue
3. Tests the updated configuration
4. Verifies API connectivity

#### Usage

```bash
./fix-nginx-api.sh
```

#### What it does

- Searches for Nginx configuration files with API settings
- Identifies configuration files with the double API path issue (/api/api)
- Creates backups of the original configuration files
- Fixes the proxy_pass directive to remove the double API path
- Tests the updated configuration to ensure it's valid
- Reloads Nginx to apply the changes
- Tests API connectivity to verify the fix worked
- Provides detailed logs and additional troubleshooting steps if needed

### Boxwise Doctor Script (`boxwise-doctor.sh`)

This script runs all checks and fixes only what's needed:

1. Performs comprehensive diagnostics of all system components
2. Identifies issues with MongoDB, Nginx, PM2, and API connectivity
3. Offers to fix each identified issue
4. Runs a final check to verify all issues have been resolved

#### Usage

```bash
./boxwise-doctor.sh [options]
```

Options:
- `-a, --auto-fix`: Automatically fix issues without prompting
- `-c, --check-only`: Only check for issues, don't fix anything
- `-h, --help`: Show help message

#### What it does

- Checks MongoDB status and connection
- Checks Nginx status and API path configuration
- Checks PM2 installation, application status, and environment variables
- Checks backend server status
- Tests API connectivity for both direct backend and Nginx endpoints
- Provides a detailed diagnosis summary with color-coded status indicators
- Offers to fix each identified issue using the appropriate fix script
- Runs a final check to verify all issues have been resolved
- Provides a final summary with recommendations for any remaining issues

### Fix Persistent Issues Script (`fix-persistent-issues.sh`)

This script specifically targets and fixes the most common persistent issues:

1. Focuses on PM2 environment variables and Nginx API connectivity
2. Provides more comprehensive fixes than individual fix scripts
3. Applies targeted solutions for specific issues
4. Runs a final check to verify the fixes worked

#### Usage

```bash
./fix-persistent-issues.sh [options]
```

Options:
- `-a, --auto-fix`: Automatically fix issues without prompting
- `-h, --help`: Show help message

#### What it does

- Checks and fixes PM2 environment variables to ensure they're properly set
- Tests Nginx API connectivity and applies comprehensive fixes:
  - Locates all Nginx configuration files with API settings
  - Fixes proxy_pass directives to ensure they point to the correct backend
  - Adds missing proxy_pass directives if needed
  - Tests the updated configuration before applying it
- Handles edge cases that other fix scripts might miss
- Runs a final check to verify all persistent issues have been resolved
- Provides detailed troubleshooting steps for any remaining issues

### Fix Critical Issues Script (`fix-critical-issues.sh`)

This script aggressively fixes critical issues that other scripts couldn't resolve:

1. Takes a more direct approach to fixing stubborn issues
2. Completely recreates configurations rather than patching them
3. Provides extensive debugging information
4. Offers manual intervention options when needed

#### Usage

```bash
./fix-critical-issues.sh [options]
```

Options:
- `-f, --force`: Force aggressive fixes without prompting
- `-h, --help`: Show help message

#### What it does

- Verifies and fixes backend server issues:
  - Checks if the backend server is running and listening on the correct port
  - Restarts or recreates the PM2 process if needed
  - Tests backend API connectivity directly
- Completely recreates PM2 environment with explicit environment variables:
  - Creates a new ecosystem.config.js file with all required variables
  - Deletes and recreates the PM2 process to ensure clean configuration
  - Tests environment variables to verify they're correctly passed
- Aggressively fixes Nginx configuration:
  - Completely replaces API location blocks rather than patching them
  - Tests connection between Nginx and backend server
  - Provides detailed error logs and debugging information
- Tests all endpoints to verify fixes worked
- Provides comprehensive troubleshooting steps for any remaining issues

### Fix Manual Script (`fix-manual.sh`)

This script provides a step-by-step interactive guide to manually fix persistent issues:

1. Walks you through each step of the troubleshooting process
2. Provides detailed explanations and instructions
3. Performs actions with your confirmation
4. Offers direct commands you can run manually if needed

#### Usage

```bash
./fix-manual.sh
```

#### What it does

- Gathers system information:
  - Checks if required software (PM2, Nginx, MongoDB) is installed
  - Offers to install missing components
- Verifies and fixes environment variables:
  - Checks if server/.env file exists and contains required variables
  - Adds missing environment variables with your confirmation
- Creates a proper ecosystem.config.js file:
  - Includes all necessary environment variables
  - Configures the application correctly
- Manages PM2 processes:
  - Stops existing processes if needed
  - Starts the application with the correct configuration
  - Provides detailed error logs if startup fails
- Fixes Nginx configuration:
  - Locates and modifies existing configuration files
  - Creates new configuration files if needed
  - Tests configuration before applying changes
- Tests API connectivity:
  - Verifies backend API is working directly
  - Tests Nginx API endpoints
  - Provides detailed troubleshooting steps for any issues
- Offers manual commands for advanced troubleshooting:
  - Direct PM2 environment variable settings
  - Minimal Nginx configuration examples
  - API endpoint testing commands

### DigitalOcean Troubleshoot Script (`digital-ocean-troubleshoot.sh`)

This script provides commands to run in the DigitalOcean terminal to diagnose and fix issues:

1. Provides a comprehensive set of commands to check system status
2. Includes commands to check and fix MongoDB, PM2, and Nginx
3. Tests API connectivity and provides troubleshooting steps
4. Offers solutions for common issues specific to DigitalOcean environments

#### Usage

```bash
./digital-ocean-troubleshoot.sh
```

#### What it does

- Provides commands to check system resources and running processes
- Includes commands to check MongoDB status and test connections
- Offers commands to check PM2 processes and environment variables
- Provides commands to check Nginx configuration and logs
- Includes commands to test API connectivity
- Offers solutions for common issues:
  - MongoDB not running
  - PM2 environment variables not set
  - Nginx API configuration incorrect
  - Invalid options object error in webpack
- Provides commands to restart all services
- Includes commands to verify fixes

### Fix Webpack Error Script (`fix-webpack-error.sh`)

This script fixes the "Invalid options object" error related to allowedHosts in webpack:

1. Finds webpack configuration files
2. Identifies and fixes the problematic allowedHosts configuration
3. Tests the fix and provides verification steps
4. Offers manual intervention options if needed

#### Usage

```bash
./fix-webpack-error.sh [options]
```

Options:
- `-f, --force`: Force fix without prompting
- `-h, --help`: Show help message

#### What it does

- Searches for webpack configuration files in the client directory
- Looks for webpack configuration files in node_modules
- Checks for allowedHosts configuration in the files
- Identifies problematic configurations (empty strings in allowedHosts array)
- Creates backups of original files before making changes
- Fixes the allowedHosts configuration by changing it to 'all'
- Checks react-scripts version to determine the appropriate fix
- Tests the fix and provides verification steps
- Offers manual intervention options if the automatic fix doesn't work

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

# To check the status of all services (detailed)
./status-production.sh

# To check the status of all services (color-coded summary)
./check-servers.sh

# To check SSL certificate status and configuration
./check-ssl.sh

# To create an owner user in production
./create-owner-production.sh

# To check the database connection
./get-db-url.sh

# To update the application from GitHub
./update-from-github.sh

# To check if a user exists in the database
./check-user.sh

# To check API configuration and connectivity
./check-api.sh

# To fix MongoDB connection issues
./fix-mongodb-connection.sh

# To access the interactive menu of all scripts
./boxwise-menu.sh

# To run the comprehensive production fix script
./fix-production.sh

# To focus specifically on starting the backend server
./start-backend.sh

# To fix PM2 environment variable issues
./fix-pm2-env.sh

# To pull the latest changes from GitHub
./pull-from-github.sh

# To fix Nginx API path issues
./fix-nginx-api.sh

# To run a comprehensive diagnostic and fix all issues
./boxwise-doctor.sh

# To fix persistent issues that boxwise-doctor.sh identifies but doesn't resolve
./fix-persistent-issues.sh

# To aggressively fix critical issues when other scripts don't work
./fix-critical-issues.sh

# To follow an interactive guide for manual troubleshooting
./fix-manual.sh

# To get commands for troubleshooting in DigitalOcean
./digital-ocean-troubleshoot.sh

# To fix webpack "Invalid options object" error
./fix-webpack-error.sh
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
scp start-production.sh stop-production.sh restart-production.sh status-production.sh check-servers.sh check-ssl.sh create-owner-production.sh get-db-url.sh update-from-github.sh check-user.sh check-api.sh fix-mongodb-connection.sh boxwise-menu.sh fix-production.sh start-backend.sh fix-pm2-env.sh pull-from-github.sh fix-nginx-api.sh boxwise-doctor.sh fix-persistent-issues.sh fix-critical-issues.sh fix-manual.sh digital-ocean-troubleshoot.sh fix-webpack-error.sh PRODUCTION_SCRIPTS.md user@your-production-server:/path/to/boxwise/
```

#### Using SFTP

```bash
# From your local machine
sftp user@your-production-server
cd /path/to/boxwise
put start-production.sh
put stop-production.sh
put restart-production.sh
put status-production.sh
put check-servers.sh
put check-ssl.sh
put create-owner-production.sh
put get-db-url.sh
put update-from-github.sh
put check-user.sh
put check-api.sh
put fix-mongodb-connection.sh
put boxwise-menu.sh
put fix-production.sh
put start-backend.sh
put fix-pm2-env.sh
put pull-from-github.sh
put fix-nginx-api.sh
put boxwise-doctor.sh
put fix-persistent-issues.sh
put fix-critical-issues.sh
put fix-manual.sh
put digital-ocean-troubleshoot.sh
put fix-webpack-error.sh
put PRODUCTION_SCRIPTS.md
exit
```

#### Using Git

If your production server has access to your Git repository:

```bash
# On your production server
cd /path/to/boxwise
git pull
chmod +x start-production.sh stop-production.sh restart-production.sh status-production.sh check-servers.sh check-ssl.sh create-owner-production.sh get-db-url.sh update-from-github.sh check-user.sh check-api.sh fix-mongodb-connection.sh boxwise-menu.sh fix-production.sh start-backend.sh fix-pm2-env.sh pull-from-github.sh fix-nginx-api.sh boxwise-doctor.sh fix-persistent-issues.sh fix-critical-issues.sh fix-manual.sh digital-ocean-troubleshoot.sh fix-webpack-error.sh
```

After copying the scripts manually, make sure they are executable:

```bash
# On your production server
chmod +x start-production.sh stop-production.sh restart-production.sh status-production.sh check-servers.sh check-ssl.sh create-owner-production.sh get-db-url.sh update-from-github.sh check-user.sh check-api.sh fix-mongodb-connection.sh boxwise-menu.sh fix-production.sh start-backend.sh fix-pm2-env.sh pull-from-github.sh fix-nginx-api.sh boxwise-doctor.sh fix-persistent-issues.sh fix-critical-issues.sh fix-manual.sh digital-ocean-troubleshoot.sh fix-webpack-error.sh
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
4. **Webpack "Invalid options object" error**: This is related to the allowedHosts configuration in webpack. Use the `fix-webpack-error.sh` script to fix it.

## Important Notes

- The scripts assume they are run from the Boxwise project root directory
- You may need sudo privileges for some operations (starting MongoDB, Nginx, etc.)
- For security in a real production environment, consider:
  - Using a firewall
  - Setting up HTTPS
  - Configuring proper database authentication
  - Running services with limited user privileges

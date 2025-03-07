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

This script starts all necessary services for running Boxwise in production mode.

#### Usage

```bash
./scripts/start-production.sh
```

### Stop Production Script (`stop-production.sh`)

This script stops all services started by the start-production script.

#### Usage

```bash
./scripts/stop-production.sh
```

### Restart Production Script (`restart-production.sh`)

This script restarts all services by stopping them and then starting them again.

#### Usage

```bash
./scripts/restart-production.sh
```

### Status Production Script (`status-production.sh`)

This script checks the status of all Boxwise services in production mode.

#### Usage

```bash
./scripts/status-production.sh
```

### Check Servers Script (`check-servers.sh`)

This script provides a simple, color-coded status check of all Boxwise services.

#### Usage

```bash
./scripts/check-servers.sh
```

### Check SSL Script (`check-ssl.sh`)

This script provides a comprehensive check of SSL certificate configuration.

#### Usage

```bash
./scripts/check-ssl.sh
```

### Create Owner Script (`create-owner-production.sh`)

This script creates an owner user in the Boxwise application on the production server.

#### Usage

```bash
./scripts/create-owner-production.sh [options]
```

### Get Database URL Script (`get-db-url.sh`)

This script retrieves and tests the MongoDB connection URL from the server's environment file.

#### Usage

```bash
./scripts/get-db-url.sh
```

### Update from GitHub Script (`update-from-github.sh`)

This script pulls the latest changes from GitHub and updates the application.

#### Usage

```bash
./scripts/update-from-github.sh [options]
```

### Check User Script (`check-user.sh`)

This script checks if a user exists in the MongoDB database and verifies its details.

#### Usage

```bash
./scripts/check-user.sh [options]
```

### Check API Script (`check-api.sh`)

This script checks the API configuration and connectivity.

#### Usage

```bash
./scripts/check-api.sh
```

### Boxwise Menu Script (`boxwise-menu.sh`)

This script provides a menu-driven interface for running all Boxwise production scripts.

#### Usage

```bash
./scripts/boxwise-menu.sh
```

### Start Backend Script (`start-backend.sh`)

This script focuses specifically on getting the backend server running properly.

#### Usage

```bash
./scripts/start-backend.sh
```

### Switch Environment Script (`switch-env.sh`)

This script switches between production and development environments.

#### Usage

```bash
./scripts/switch-env.sh [environment]
```

### Backup Script (`backup.sh`)

This script creates a backup of the MongoDB database.

#### Usage

```bash
./scripts/backup.sh
```

### Deploy Script (`deploy.sh`)

This script deploys the application to a production server.

#### Usage

```bash
./scripts/deploy.sh [options]
```

## Important Notes

- The scripts assume they are run from the Boxwise project root directory
- You may need sudo privileges for some operations (starting MongoDB, Nginx, etc.)
- For security in a real production environment, consider:
  - Using a firewall
  - Setting up HTTPS
  - Configuring proper database authentication
  - Running services with limited user privileges

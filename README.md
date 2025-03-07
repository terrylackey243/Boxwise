# Boxwise Inventory Management System

Boxwise is a comprehensive inventory management system designed to help organizations track and manage their inventory efficiently.

## Features

- Item tracking with QR codes
- Location management
- Category and label organization
- User management with role-based access control
- Reporting and analytics
- Import/export functionality
- Reminder system
- Achievements and gamification

## Tech Stack

- **Frontend**: React, Material-UI
- **Backend**: Node.js, Express
- **Database**: MongoDB
- **Authentication**: JWT
- **Web Server**: Nginx

## Development Setup

### Prerequisites

- Node.js (v16+)
- npm or yarn
- MongoDB (local installation)
- Git

### Installation

1. Clone the repository:
   ```
   git clone https://github.com/yourusername/boxwise.git
   cd boxwise
   ```

2. Switch to development environment:
   ```
   ./switch-env.sh dev
   ```

3. Install dependencies:
   ```
   # Install server dependencies
   cd server
   npm install
   
   # Install client dependencies
   cd ../client
   npm install
   ```

4. Start MongoDB:
   ```
   # Start MongoDB
   mongod --dbpath=/path/to/data/db
   ```

5. Start the development servers:
   ```
   # Terminal 1: Start the backend server
   cd server
   npm run dev
   
   # Terminal 2: Start the frontend development server
   cd client
   npm start
   ```

6. Access the application at http://localhost:3000

### Development Workflow

1. Make changes to the code
2. Test your changes locally
3. Commit your changes
4. Push to your repository
5. Create a pull request (if contributing to the main repository)

## Production Deployment

### Prerequisites

- Server running Ubuntu 20.04 or later
- Domain name pointing to your server's IP address
- SSH access to your server with root or sudo privileges
- Let's Encrypt will be used for SSL certificates (no need to obtain them separately)

### Deployment Steps

1. Clone the repository to your production server:
   ```
   git clone https://github.com/yourusername/boxwise.git
   cd boxwise
   ```

2. Make the deployment scripts executable:
   ```
   chmod +x deploy.sh switch-env.sh backup.sh
   ```

3. Run the deployment script with the appropriate options:
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

4. Follow the post-deployment steps in the [Production Checklist](./PRODUCTION_CHECKLIST.md) file.

### Switching Between Environments

To switch between production and development environments, use the provided `switch-env.sh` script:

```
# Switch to development environment
./switch-env.sh dev

# Switch to production environment
./switch-env.sh prod
```

The script will automatically:
- Update the environment configuration
- Stop/start the appropriate services
- Build the client application when switching to production

## Documentation

- [Production Checklist](./PRODUCTION_CHECKLIST.md) - Detailed steps for production deployment
- [API Documentation](./server/API.md) - API endpoints and usage
- [User Guide](./docs/USER_GUIDE.md) - Guide for end users

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

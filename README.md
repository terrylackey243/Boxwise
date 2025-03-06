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
- **Containerization**: Docker, Docker Compose
- **Web Server**: Nginx

## Development Setup

### Prerequisites

- Node.js (v16+)
- npm or yarn
- MongoDB (local installation or Docker)
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

4. Start MongoDB (if not using Docker):
   ```
   # Start MongoDB locally
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

- Server with Docker and Docker Compose installed
- Domain name configured to point to your server
- UPC API key (optional - using free trial version for now)
- SSL certificates (or ability to generate Let's Encrypt certificates)
- Remote backup server (optional but recommended)

### Deployment Steps

1. Clone the repository to your production server:
   ```
   git clone https://github.com/yourusername/boxwise.git
   cd boxwise
   ```

2. Run the deployment script:
   ```
   # Without UPC API key (using free trial)
   sudo ./deploy-production.sh
   
   # Or with UPC API key if you have one
   sudo ./deploy-production.sh -u your_upc_api_key
   ```

3. Follow the post-deployment steps in the PRODUCTION_CHECKLIST.md file.

### Switching Between Environments

To switch between production and development environments, use the provided `switch-env.sh` script:

```
# Switch to development environment
./switch-env.sh dev

# Switch to production environment
./switch-env.sh prod
```

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

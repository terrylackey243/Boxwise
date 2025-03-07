# Boxwise Inventory Management System (Local Development Version)

Boxwise is a comprehensive inventory management system designed to help organizations track and manage their inventory efficiently. This version is configured for local development only.

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

## Local Development Setup

### Prerequisites

- Node.js (v16+)
- npm or yarn
- MongoDB (local installation)
- Git

### Installation

1. Install dependencies:
   ```
   # Install server dependencies
   cd server
   npm install
   
   # Install client dependencies
   cd ../client
   npm install
   ```

2. Start MongoDB:
   ```
   # Start MongoDB
   mongod --dbpath=/path/to/data/db
   ```

3. Start the development servers:
   ```
   # Terminal 1: Start the backend server
   cd server
   npm run dev
   
   # Terminal 2: Start the frontend development server
   cd client
   npm start
   ```

4. Access the application at http://localhost:3001

### Development Workflow

1. Make changes to the code
2. Test your changes locally

## License

This project is licensed under the MIT License - see the LICENSE file for details.

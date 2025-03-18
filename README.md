# xBoxwise Inventory Management System (Local Development Version)

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
   # Install all dependencies at once
   npm run install:all
   
   # Or install dependencies individually
   cd server
   npm install
   
   cd ../client
   npm install
   
   cd ../scripts
   npm install
   ```

2. Start MongoDB:
   ```
   # Start MongoDB
   mongod --dbpath=/path/to/data/db
   ```

3. Start the development servers:
   ```
   # Start both frontend and backend servers with one command
   npm start
   
   # Or start servers individually
   # Terminal 1: Start the backend server
   npm run start:server
   
   # Terminal 2: Start the frontend development server
   npm run start:client
   ```

4. Access the application at http://localhost:3001

### Development Workflow

1. Make changes to the code
2. Test your changes locally

## Deployment

This project includes configuration files for deploying to various platforms:

### Database Setup
1. Create a MongoDB Atlas account at https://www.mongodb.com/cloud/atlas
2. Set up a free tier cluster
3. Create a database user and get your connection string
4. Use this connection string in your deployment environment variables

### Deployment Options

#### Option 1: Render (Recommended for Full-Stack)
The project includes a `render.yaml` file for easy deployment to Render:

1. Create a Render account at https://render.com
2. Connect your GitHub repository
3. Use the "Blueprint" deployment option and select the render.yaml file
4. Set the required environment variables:
   - MONGO_URI (from MongoDB Atlas)
   - JWT_SECRET (generate a secure random string)

#### Option 2: Vercel (Frontend) + Render (Backend)
For frontend deployment to Vercel:
1. Create a Vercel account at https://vercel.com
2. Import your GitHub repository
3. Set the root directory to "client"
4. Update the API URL in `client/vercel.json` to point to your backend

For backend deployment to Render:
1. Follow the Render backend setup steps above
2. The included Procfile will help with deployment

#### Option 3: Netlify (Frontend) + Render (Backend)
For frontend deployment to Netlify:
1. Create a Netlify account at https://netlify.com
2. Import your GitHub repository
3. Set the build command to "cd client && npm run build"
4. Set the publish directory to "client/build"
5. Update the API URL in `client/netlify.toml` to point to your backend

For backend deployment to Render:
1. Follow the Render backend setup steps above

### Environment Variables
Make sure to set these environment variables in your deployment platform:

- NODE_ENV=production
- PORT=5001 (or as provided by the platform)
- MONGO_URI=your_mongodb_atlas_connection_string
- JWT_SECRET=your_secure_random_string
- UPC_API_URL=https://api.upcitemdb.com/prod/trial/lookup

## License

This project is licensed under the Boxwise Proprietary License - see the LICENSE file for details. This license restricts redistribution, commercial use, and selling of the software while allowing personal, non-commercial use only.

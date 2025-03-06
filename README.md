# Boxwise

Boxwise is the inventory and organization system built for the Home User! With a focus on simplicity and ease of use, Boxwise is the perfect solution for your home inventory, organization, and management needs.

![Boxwise](https://boxwise.app/logo.png)

## Features

- **Add/Update/Delete Items**: You can add, update and delete your own items in inventory simply
- **Optional Details**: Optional extra details like warranty information, and item identifications
- **CSV Import/Export**: Import a CSV file to quickly get started with existing information, or export to save information
- **Custom Reports**: Export bill of materials, or generate QR codes for items
- **Custom Labeling, Categories and Locations**: Use custom labels, categories and locations to organize items
- **Multi-Tenant Support**: All users are in a group, and can only see what's in the group. Invite family members or share an instance with friends.
- **UPC Scanning**: Scan a UPC code and fill in all of the relevant data that the UPC code returns for that item
- **Fuzzy Logic Search**: Easily find items with powerful search capabilities
- **Dark Mode**: Switch between light and dark themes based on your preference
- **Gamification**: Achievements and fun features to make inventory management enjoyable
- **User Roles & Admin Dashboard**: Different user roles (owner, admin, user) with varying permissions and an admin dashboard for user management

## User Roles

Boxwise supports three user roles with different permissions:

- **Owner**: Has full access to all features, including billing and subscription management. Can create and manage admin users.
- **Admin**: Can manage all users, items, locations, labels, and categories. Cannot manage billing or change the owner's role.
- **User**: Can manage their own items, locations, labels, and categories within their group.

## Subscription Plans

- **Free**: Limited to 5 items
- **Pro**: Full access for a single user
- **Family**: Full access for up to 5 family members

## Requirements

To run Boxwise, you'll need:

- Node.js (v14 or higher)
- MongoDB (v4.4 or higher)
- npm or yarn

## Installation

1. Clone the repository:
   ```
   git clone https://github.com/yourusername/boxwise.git
   cd boxwise
   ```

2. Install dependencies for both the server and client:
   ```
   # Install server dependencies
   cd server
   npm install

   # Install client dependencies
   cd ../client
   npm install
   ```

3. Create a `.env` file in the server directory with the following variables:
   ```
   PORT=5000
   NODE_ENV=development
   MONGO_URI=mongodb://localhost:27017/boxwise
   JWT_SECRET=your_jwt_secret_key
   JWT_EXPIRE=30d
   ASSET_ID_AUTO_INCREMENT=true
   ASSET_ID_PREFIX=000-
   UPC_API_KEY=your_upc_api_key  # Optional - for UPC lookup functionality
   ```

   Note: For UPC lookup functionality, the application uses the UPC Item DB API. In the development environment, it uses the trial API which has limited requests. For production, you should sign up for an API key at [UPC Item DB](https://www.upcitemdb.com/api/signup) and add it to your environment variables.

## Running the Application

You can start all services (MongoDB, backend, and frontend) with a single command:

```
cd scripts
chmod +x start.sh  # Make sure the script is executable
./start.sh
```

By default, the frontend runs on port 3000. If that port is already in use, you can specify a different port:

```
./start.sh 3001  # Use port 3001 for the frontend
```

This script will:
1. Check if MongoDB is already running, and start it if needed
2. Initialize the database with demo data if it's empty
3. Start the backend server using nodemon (via npx)
4. Start the frontend development server on the specified port (default: 3000)
5. Set up proper cleanup when you press Ctrl+C

The script includes error handling and will provide feedback on the status of each service.

### Demo Accounts

When you run the application for the first time, the database will be initialized with the following demo accounts:

- **Owner Account**
  - Email: owner@example.com
  - Password: password123
  - Role: Owner (full access to all features)

- **Admin Account**
  - Email: admin@example.com
  - Password: password123
  - Role: Admin (can manage users and content, but not billing)

- **User Account**
  - Email: user@example.com
  - Password: password123
  - Role: Regular user

All accounts are part of the same group and have access to sample data (locations, categories, labels, and items) to help you get started.

### Manual Setup

Alternatively, you can start each service individually:

```
# Start MongoDB (in a separate terminal)
mkdir -p data/db
mongod --dbpath ./data/db

# Initialize the database with demo data (only needed once)
cd scripts
node init-db.js

# Start the backend server (in a separate terminal)
cd server
npx nodemon src/index.js
# or
npm run dev

# Start the frontend development server (in a separate terminal)
cd client
npm start
```

### Database Management

The application automatically initializes the database with demo data when you first run it. If you want to reset the database to its initial state, you can use the reset-db.sh script:

```
cd scripts
chmod +x reset-db.sh  # Make sure the script is executable
./reset-db.sh
```

This script will:
1. Check if MongoDB is running, and start it if needed
2. Drop all collections in the database
3. Reinitialize the database with demo data

### Troubleshooting

If you encounter issues with the start script:

1. **MongoDB already running**: The script will detect this and continue with starting the other services.

2. **Port conflicts**: If MongoDB or one of the servers fails to start due to port conflicts, check if you have other services using ports 27017 (MongoDB), 5000 (backend), or 3000 (frontend).

3. **Permission issues**: Make sure the scripts are executable with `chmod +x scripts/start.sh` and `chmod +x scripts/reset-db.sh`.

4. **Database issues**: If you encounter database-related errors, try resetting the database with `./scripts/reset-db.sh`.

## Deployment Requirements

For production deployment, you'll need:

1. A server with:
   - Node.js (v14 or higher)
   - MongoDB (v4.4 or higher)
   - npm or yarn
   - At least 1GB RAM
   - At least 10GB storage

2. Domain name (e.g., boxwise.app) with DNS configured

3. SSL certificate for secure HTTPS connections

4. Environment variables set for production:
   ```
   NODE_ENV=production
   MONGO_URI=your_production_mongodb_uri
   JWT_SECRET=your_secure_jwt_secret
   ```

## Deployment Steps

### Manual Deployment

1. Build the client:
   ```
   cd client
   npm run build
   ```

2. Set up a process manager like PM2:
   ```
   npm install -g pm2
   cd ../server
   pm2 start src/index.js --name boxwise-server
   ```

3. Set up a web server like Nginx to serve the static files and proxy API requests:
   ```nginx
   server {
       listen 80;
       server_name boxwise.app;
       
       # Redirect to HTTPS
       return 301 https://$host$request_uri;
   }

   server {
       listen 443 ssl;
       server_name boxwise.app;
       
       ssl_certificate /path/to/cert.pem;
       ssl_certificate_key /path/to/key.pem;
       
       # Serve static files
       location / {
           root /path/to/boxwise/client/build;
           index index.html;
           try_files $uri $uri/ /index.html;
       }
       
       # Proxy API requests
       location /api {
           proxy_pass http://localhost:5000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```

### Docker Deployment (Recommended)

For production deployment, we recommend using Docker and the provided deployment scripts:

1. Clone the repository on your server:
   ```
   git clone https://github.com/yourusername/boxwise.git
   cd boxwise
   ```

2. Set up the JWT secret securely (never commit this to the repository):
   ```
   # Generate a new JWT secret
   ./set-jwt-secret.sh
   
   # Or use an existing JWT secret
   ./set-jwt-secret.sh -s "your-secure-jwt-secret"
   ```

3. Deploy the application with the provided script:
   ```
   ./deploy.sh -d yourdomain.com
   ```

This will:
- Install Docker and Docker Compose if needed
- Set up SSL certificates using Certbot
- Configure Nginx with proper security headers
- Start all services (MongoDB, backend, frontend)
- Initialize the database if needed

### Security Considerations

1. **Environment Variables**: Never commit sensitive environment variables like JWT_SECRET to your repository. Use the provided scripts to set these securely on your production server.

2. **SSL/TLS**: Always use HTTPS in production. The deploy.sh script sets this up automatically.

3. **Database Backups**: Regular backups are essential. The deployment includes an automatic backup script that runs daily.

4. **Updates**: Regularly update dependencies and apply security patches.

## License

MIT

## Contact

For more information, visit [boxwise.app](https://boxwise.app)

#!/usr/bin/env node
const path = require('path');
const { MongoClient } = require('mongodb');
const { spawn } = require('child_process');
const dotenv = require('dotenv');

// Load environment variables from .env file if available
dotenv.config({ path: path.resolve(__dirname, '../server/.env') });

// MongoDB connection string
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/boxwise';

async function checkAndInitDb() {
  console.log('Checking if database needs initialization...');
  console.log(`Connecting to MongoDB at ${MONGO_URI.replace(/\/\/([^:]+):[^@]+@/, '//***:***@')}...`);
  
  const client = new MongoClient(MONGO_URI, {
    serverSelectionTimeoutMS: 60000,
    socketTimeoutMS: 90000,
    connectTimeoutMS: 60000
  });
  
  try {
    await client.connect();
    console.log('Connected to MongoDB successfully');
    
    const db = client.db();
    const collections = await db.listCollections().toArray();
    
    if (collections.length === 0) {
      console.log('Database is empty, initializing...');
      await client.close();
      
      // Run the init-db.js script
      console.log('Running database initialization script...');
      const initScript = spawn('node', ['init-db.js'], {
        stdio: 'inherit',
        cwd: __dirname
      });
      
      return new Promise((resolve, reject) => {
        initScript.on('close', (code) => {
          if (code === 0) {
            console.log('Database initialization completed successfully');
            resolve();
          } else {
            console.error(`Database initialization failed with code ${code}`);
            reject(new Error(`Database initialization failed with code ${code}`));
          }
        });
      });
    } else {
      console.log(`Database already contains ${collections.length} collections, skipping initialization`);
      await client.close();
    }
  } catch (err) {
    console.error('Error checking database:', err);
    if (client) {
      await client.close();
    }
    throw err;
  }
}

// Run the function if this script is executed directly
if (require.main === module) {
  checkAndInitDb()
    .then(() => {
      console.log('Database check completed');
      process.exit(0);
    })
    .catch((err) => {
      console.error('Database check failed:', err);
      process.exit(1);
    });
}

module.exports = checkAndInitDb;

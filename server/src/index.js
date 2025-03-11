const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const fileUpload = require('express-fileupload');
const compression = require('compression');

// Load environment variables
dotenv.config();

// Import routes
const authRoutes = require('./routes/auth');
const itemRoutes = require('./routes/items');
const locationRoutes = require('./routes/locations');
const labelRoutes = require('./routes/labels');
const categoryRoutes = require('./routes/categories');
const userRoutes = require('./routes/users');
const reportRoutes = require('./routes/reports');
const upcRoutes = require('./routes/upc');
const urlRoutes = require('./routes/url');
const dashboardRoutes = require('./routes/dashboard');
const adminRoutes = require('./routes/admin');
const achievementRoutes = require('./routes/achievements');
const reminderRoutes = require('./routes/reminders');
const groupRoutes = require('./routes/groups');

// Create Express app
const app = express();

// Middleware
app.use(cors());
app.use(compression()); // Add compression middleware to reduce payload size
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(fileUpload({
  useTempFiles: true,
  tempFileDir: '/tmp/',
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB max file size
  abortOnLimit: true
}));

// Set up static files directory for uploads
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/items', itemRoutes);
app.use('/api/locations', locationRoutes);
app.use('/api/labels', labelRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/users', userRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/upc', upcRoutes);
app.use('/api/url', urlRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/achievements', achievementRoutes);
app.use('/api/reminders', reminderRoutes);
app.use('/api/groups', groupRoutes);

// Local development only - no production asset serving

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    message: 'Something went wrong!',
    error: process.env.NODE_ENV === 'development' ? err.message : {}
  });
});

// Connect to MongoDB
mongoose
  .connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    bufferCommands: false, // Disable buffering to prevent timeout
    maxPoolSize: 50, // Increase from default 5
    socketTimeoutMS: 45000, // Increase socket timeout
    family: 4, // Use IPv4, skip trying IPv6
    serverSelectionTimeoutMS: 30000, // Timeout after 30 seconds instead of 30s
    heartbeatFrequencyMS: 10000, // Check server health more frequently
    autoIndex: process.env.NODE_ENV !== 'production' // Don't auto-build indexes in production
  })
  .then(() => {
    console.log('Connected to MongoDB');
    
    // Start server
    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error('MongoDB connection error:', err.message);
    process.exit(1);
  });

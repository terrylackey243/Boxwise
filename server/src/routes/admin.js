const express = require('express');
const router = express.Router();

// Import middleware
const { protect, authorize } = require('../middleware/auth');

// Import controllers
const { executeQuery, getStats } = require('../controllers/admin');

// Import models
const User = require('../models/User');
const Item = require('../models/Item');
const Location = require('../models/Location');
const Label = require('../models/Label');
const Category = require('../models/Category');

// Database admin routes
router.post('/database/execute', protect, authorize('admin', 'owner'), executeQuery);

// Add a simple test route
router.get('/test', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Admin API is working'
  });
});

// Admin routes
router.get('/stats', protect, authorize('admin', 'owner'), getStats);

module.exports = router;

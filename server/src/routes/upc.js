const express = require('express');
const { lookupUPC } = require('../controllers/upc');

const router = express.Router();

// Import middleware
const { protect } = require('../middleware/auth');

// Test route (no authentication required) - must be defined before the protected route
router.get('/test/:code', lookupUPC);

// Protected route
router.get('/:code', protect, lookupUPC);

module.exports = router;

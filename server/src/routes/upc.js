const express = require('express');
const { lookupUPC } = require('../controllers/upc');

const router = express.Router();

// Import middleware
const { protect } = require('../middleware/auth');

// Define routes
router.route('/:code').get(protect, lookupUPC);

module.exports = router;

const express = require('express');
const { scrapeUrl, lookupUrl } = require('../controllers/url');
const { protect } = require('../middleware/auth');

const router = express.Router();

// Protect all routes
router.use(protect);

// URL scraping routes
router.get('/scrape', scrapeUrl);
router.post('/lookup', lookupUrl);

module.exports = router;

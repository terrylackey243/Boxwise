const express = require('express');
const { scrapeUrl, lookupUrl } = require('../controllers/url');
const { protect } = require('../middleware/auth');

const router = express.Router();

// Protect all routes except test routes
router.use((req, res, next) => {
  if (req.path.includes('/test-')) {
    return next();
  }
  protect(req, res, next);
});

// URL scraping routes
router.get('/scrape', scrapeUrl);
router.post('/lookup', lookupUrl);

// Test routes (no authentication required)
router.get('/test-scrape', scrapeUrl);
router.post('/test-lookup', lookupUrl);

module.exports = router;

const express = require('express');
const {
  register,
  login,
  getMe,
  logout,
  updateDetails,
  updatePassword,
  updatePreferences
} = require('../controllers/auth');

const router = express.Router();

// Import middleware
const { protect } = require('../middleware/auth');

// Define routes
router.post('/register', register);
router.post('/login', login);
router.get('/me', protect, getMe);
router.get('/logout', protect, logout);
router.put('/updatedetails', protect, updateDetails);
router.put('/updatepassword', protect, updatePassword);
router.put('/preferences', protect, updatePreferences);

module.exports = router;

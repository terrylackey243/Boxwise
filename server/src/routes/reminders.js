const express = require('express');
const {
  getReminders,
  getReminder,
  createReminder,
  updateReminder,
  deleteReminder,
  getUpcomingReminders,
  createWarrantyReminder,
  createMaintenanceReminder
} = require('../controllers/reminders');

const router = express.Router();

const { protect } = require('../middleware/auth');

// Apply auth middleware to all routes
router.use(protect);

// Routes for general reminder operations
router.route('/')
  .get(getReminders)
  .post(createReminder);

// Route for upcoming reminders (for dashboard)
router.route('/upcoming')
  .get(getUpcomingReminders);

// Routes for creating specific types of reminders from items
router.route('/warranty/:itemId')
  .post(createWarrantyReminder);

router.route('/maintenance/:itemId')
  .post(createMaintenanceReminder);

// Routes for specific reminder operations
router.route('/:id')
  .get(getReminder)
  .put(updateReminder)
  .delete(deleteReminder);

module.exports = router;

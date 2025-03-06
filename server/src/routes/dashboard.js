const express = require('express');
const router = express.Router();

// Import middleware
const { protect } = require('../middleware/auth');

// Import models
const Item = require('../models/Item');
const Location = require('../models/Location');
const Label = require('../models/Label');
const Category = require('../models/Category');
const Reminder = require('../models/Reminder');

// @desc    Get dashboard data
// @route   GET /api/dashboard
// @access  Private
router.get('/', protect, async (req, res) => {
  try {
    // Get user's group ID from the authenticated user
    const groupId = req.user.group;
    
    // Get counts for each collection
    const itemCount = await Item.countDocuments({ group: groupId });
    const locationCount = await Location.countDocuments({ group: groupId });
    const labelCount = await Label.countDocuments({ group: groupId });
    const categoryCount = await Category.countDocuments({ group: groupId });
    
    // Get recent items
    const recentItems = await Item.find({ group: groupId })
      .sort({ updatedAt: -1 })
      .limit(5)
      .populate('location', 'name')
      .populate('category', 'name')
      .populate('labels', 'name color');
    
    // Get upcoming reminders (due in the next 30 days)
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
    
    const upcomingReminders = await Reminder.find({
      group: groupId,
      isCompleted: false,
      reminderDate: {
        $gte: new Date(),
        $lte: thirtyDaysFromNow
      }
    })
      .sort('reminderDate')
      .limit(5)
      .populate({
        path: 'item',
        select: 'name assetId'
      });
    
    res.status(200).json({
      success: true,
      data: {
        stats: {
          itemCount,
          locationCount,
          labelCount,
          categoryCount
        },
        recentItems,
        upcomingReminders
      }
    });
  } catch (err) {
    console.error('Dashboard error:', err);
    res.status(500).json({
      success: false,
      message: 'Error fetching dashboard data'
    });
  }
});

module.exports = router;

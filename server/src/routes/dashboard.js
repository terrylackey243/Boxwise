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
    
    // Run queries in parallel for better performance
    const [
      itemCount,
      locationCount,
      labelCount,
      categoryCount,
      recentItems
    ] = await Promise.all([
      // Get counts for each collection
      Item.countDocuments({ group: groupId }),
      Location.countDocuments({ group: groupId }),
      Label.countDocuments({ group: groupId }),
      Category.countDocuments({ group: groupId }),
      
      // Get recent items with lean() for better performance
      Item.find({ group: groupId })
        .sort({ updatedAt: -1 })
        .limit(5)
        .select('name location category labels updatedAt')
        .populate('location', 'name')
        .populate('category', 'name')
        .populate('labels', 'name color')
        .lean()
    ]);
    
    res.status(200).json({
      success: true,
      data: {
        stats: {
          itemCount,
          locationCount,
          labelCount,
          categoryCount
        },
        recentItems
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

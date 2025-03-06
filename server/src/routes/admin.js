const express = require('express');
const router = express.Router();

// Import middleware
const { protect, authorize } = require('../middleware/auth');

// Import models
const User = require('../models/User');
const Item = require('../models/Item');
const Location = require('../models/Location');
const Label = require('../models/Label');
const Category = require('../models/Category');

// @desc    Get admin stats
// @route   GET /api/admin/stats
// @access  Private/Admin
router.get('/stats', protect, authorize('admin', 'owner'), async (req, res) => {
  try {
    // Get user's group ID from the authenticated user
    const groupId = req.user.group;
    
    // Get counts for each collection
    const totalItems = await Item.countDocuments({ group: groupId });
    const totalLocations = await Location.countDocuments({ group: groupId });
    const totalLabels = await Label.countDocuments({ group: groupId });
    const totalCategories = await Category.countDocuments({ group: groupId });
    
    // Get users by role
    const users = await User.find({ group: groupId });
    const totalUsers = users.length;
    
    // Count users by role
    const usersByRole = {
      owner: users.filter(user => user.role === 'owner').length,
      admin: users.filter(user => user.role === 'admin').length,
      user: users.filter(user => user.role === 'user').length
    };
    
    // Get subscription info
    const subscription = await require('../models/Subscription').findOne({ group: groupId });
    const subscriptionPlan = subscription ? subscription.plan : 'free';
    
    // Count users by subscription plan
    const usersByPlan = {
      free: subscriptionPlan === 'free' ? totalUsers : 0,
      pro: subscriptionPlan === 'pro' ? totalUsers : 0,
      business: subscriptionPlan === 'business' ? totalUsers : 0
    };
    
    // Get items by category
    const categories = await Category.find({ group: groupId });
    const itemsByCategory = {};
    
    for (const category of categories) {
      const count = await Item.countDocuments({ 
        group: groupId, 
        category: category._id 
      });
      itemsByCategory[category.name] = count;
    }
    
    // Get recent activity (simplified version)
    // In a real implementation, this would query an activity log collection
    const recentItems = await Item.find({ group: groupId })
      .sort({ updatedAt: -1 })
      .limit(5)
      .populate('createdBy', 'name');
    
    const recentActivity = recentItems.map(item => ({
      type: 'item_created',
      user: item.createdBy ? item.createdBy.name : 'Unknown User',
      item: item.name,
      date: item.createdAt
    }));
    
    // Get all subscriptions for the group
    const subscriptions = await require('../models/Subscription').find({ group: groupId });
    
    res.status(200).json({
      success: true,
      data: {
        totalUsers,
        totalItems,
        totalLocations,
        totalCategories,
        totalLabels,
        usersByRole,
        usersByPlan,
        itemsByCategory,
        recentActivity,
        subscriptions
      }
    });
  } catch (err) {
    console.error('Admin stats error:', err);
    res.status(500).json({
      success: false,
      message: 'Error fetching admin stats'
    });
  }
});

module.exports = router;

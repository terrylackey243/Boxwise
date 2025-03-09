const mongoose = require('mongoose');
const ErrorResponse = require('../utils/errorResponse');
const asyncHandler = require('../middleware/async');

// @desc    Execute MongoDB query
// @route   POST /api/admin/database/execute
// @access  Private/Admin
exports.executeQuery = async (req, res) => {
  try {
    console.log('Execute query request received');
    const { query } = req.body;

    if (!query) {
      return res.status(400).json({
        success: false,
        message: 'Query is required'
      });
    }

    // Only allow admin or owner to execute queries
    if (req.user.role !== 'admin' && req.user.role !== 'owner') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to execute database queries'
      });
    }

    // Use the existing database connection from mongoose
    const db = mongoose.connection.db;
    
    // Create a sandbox function to execute the query safely
    const sandbox = new Function('db', `
      try {
        return ${query};
      } catch (error) {
        return { error: error.message };
      }
    `);

    // Execute the query in the sandbox
    const result = await sandbox(db);

    // Check if there was an error in the sandbox
    if (result && result.error) {
      return res.status(400).json({
        success: false,
        message: `Query execution error: ${result.error}`
      });
    }

    return res.status(200).json({
      success: true,
      data: result
    });
    
  } catch (error) {
    console.error('Database query execution error:', error);
    return res.status(500).json({
      success: false,
      message: `Error executing query: ${error.message}`
    });
  }
};

// @desc    Get admin statistics
// @route   GET /api/admin/stats
// @access  Private/Admin
exports.getStats = asyncHandler(async (req, res, next) => {
  // Only allow admin or owner to get stats
  if (req.user.role !== 'admin' && req.user.role !== 'owner') {
    return next(new ErrorResponse('Not authorized to access admin statistics', 403));
  }

  try {
    // Use the existing database connection from mongoose
    const db = mongoose.connection.db;
    
    // Get user statistics
    const totalUsers = await db.collection('users').countDocuments();
    
    // Get users by role
    const usersByRole = {
      owner: await db.collection('users').countDocuments({ role: 'owner' }),
      admin: await db.collection('users').countDocuments({ role: 'admin' }),
      user: await db.collection('users').countDocuments({ role: 'user' }),
    };
    
    // Get users by subscription plan
    const usersByPlan = {
      free: await db.collection('users').countDocuments({ 'subscription.plan': 'free' }),
      pro: await db.collection('users').countDocuments({ 'subscription.plan': 'pro' }),
      business: await db.collection('users').countDocuments({ 'subscription.plan': 'business' }),
    };
    
    // Get item statistics
    const totalItems = await db.collection('items').countDocuments();
    
    // Get items by category
    const categories = await db.collection('categories').find().toArray();
    const itemsByCategory = {};
    
    for (const category of categories) {
      const count = await db.collection('items').countDocuments({ category: category._id });
      itemsByCategory[category.name] = count;
    }
    
    // Get location and label statistics
    const totalLocations = await db.collection('locations').countDocuments();
    const totalLabels = await db.collection('labels').countDocuments();
    const totalCategories = await db.collection('categories').countDocuments();
    
    // Get recent activity
    const recentActivity = [];
    
    // Get recent items
    const recentItems = await db.collection('items')
      .find()
      .sort({ createdAt: -1 })
      .limit(5)
      .toArray();
    
    for (const item of recentItems) {
      const user = await db.collection('users').findOne({ _id: item.createdBy });
      
      recentActivity.push({
        type: 'item_created',
        user: user ? user.name : 'Unknown User',
        item: item.name,
        date: item.createdAt,
      });
    }
    
    // Get subscriptions
    const subscriptions = await db.collection('subscriptions').find().toArray();
    
    // Get groups
    const groups = await db.collection('groups').find().toArray();
    
    res.status(200).json({
      success: true,
      data: {
        totalUsers,
        usersByRole,
        usersByPlan,
        totalItems,
        itemsByCategory,
        totalLocations,
        totalLabels,
        totalCategories,
        recentActivity,
        subscriptions,
        groups,
      },
    });
  } catch (error) {
    console.error('Admin stats error:', error);
    return next(new ErrorResponse(`Error fetching admin stats: ${error.message}`, 500));
  }
});

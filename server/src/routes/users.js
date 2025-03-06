const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const User = require('../models/User');

// @route   GET api/users
// @desc    Get all users
// @access  Private/Admin
router.get('/', protect, authorize('admin', 'owner'), async (req, res) => {
  try {
    // Get user's group ID from the authenticated user
    const groupId = req.user.group;
    
    // Find all users in the same group
    const users = await User.find({ group: groupId })
      .select('-password')
      .sort({ createdAt: -1 });
    
    res.status(200).json({
      success: true,
      count: users.length,
      data: users
    });
  } catch (err) {
    console.error('Error fetching users:', err);
    res.status(500).json({
      success: false,
      message: 'Error fetching users'
    });
  }
});

// @route   GET api/users/:id
// @desc    Get user by ID
// @access  Private/Admin
router.get('/:id', protect, authorize('admin', 'owner'), async (req, res) => {
  try {
    // Get user's group ID from the authenticated user
    const groupId = req.user.group;
    
    // Find user by ID and ensure they're in the same group
    const user = await User.findOne({ 
      _id: req.params.id,
      group: groupId
    }).select('-password');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    res.status(200).json({
      success: true,
      data: user
    });
  } catch (err) {
    console.error('Error fetching user:', err);
    res.status(500).json({
      success: false,
      message: 'Error fetching user'
    });
  }
});

// @route   POST api/users
// @desc    Create a user
// @access  Private/Admin
router.post('/', protect, authorize('admin', 'owner'), async (req, res) => {
  try {
    const { name, email, password, role, subscription } = req.body;
    
    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User with this email already exists'
      });
    }
    
    // Get user's group ID from the authenticated user
    const groupId = req.user.group;
    
    // Create new user
    const newUser = new User({
      name,
      email,
      password, // This will be hashed by the pre-save hook in the User model
      role: role || 'user', // Default to 'user' if not specified
      group: groupId,
      preferences: {
        theme: 'light',
        notifications: true
      }
    });
    
    // Save user to database
    await newUser.save();
    
    res.status(201).json({
      success: true,
      message: 'User created successfully',
      data: {
        _id: newUser._id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role
      }
    });
  } catch (err) {
    console.error('Error creating user:', err);
    res.status(500).json({
      success: false,
      message: 'Error creating user'
    });
  }
});

// @route   PUT api/users/:id
// @desc    Update a user
// @access  Private/Admin
router.put('/:id', protect, authorize('admin', 'owner'), async (req, res) => {
  try {
    const { name, email, role, subscription, preferences } = req.body;
    
    // Get user's group ID from the authenticated user
    const groupId = req.user.group;
    
    // Find user by ID and ensure they're in the same group
    const user = await User.findOne({ 
      _id: req.params.id,
      group: groupId
    });
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    // Don't allow changing the owner's role
    if (user.role === 'owner' && role && role !== 'owner') {
      return res.status(403).json({
        success: false,
        message: 'Cannot change the role of the owner'
      });
    }
    
    // Update user fields
    if (name) user.name = name;
    if (email) user.email = email;
    if (role) user.role = role;
    if (preferences) user.preferences = { ...user.preferences, ...preferences };
    
    // If subscription info was provided, update the group's subscription
    if (subscription && req.user.role === 'owner') {
      const Subscription = require('../models/Subscription');
      let groupSubscription = await Subscription.findOne({ group: groupId });
      
      if (!groupSubscription) {
        // Create a new subscription if one doesn't exist
        groupSubscription = new Subscription({
          group: groupId,
          plan: subscription.plan || 'free',
          status: subscription.status || 'active',
          createdBy: req.user.id
        });
      } else {
        // Update existing subscription
        if (subscription.plan) groupSubscription.plan = subscription.plan;
        if (subscription.status) groupSubscription.status = subscription.status;
        groupSubscription.updatedBy = req.user.id;
      }
      
      await groupSubscription.save();
    }
    
    // Save updated user
    await user.save();
    
    res.status(200).json({
      success: true,
      message: 'User updated successfully',
      data: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        preferences: user.preferences
      }
    });
  } catch (err) {
    console.error('Error updating user:', err);
    res.status(500).json({
      success: false,
      message: 'Error updating user'
    });
  }
});

// @route   DELETE api/users/:id
// @desc    Delete a user
// @access  Private/Admin
router.delete('/:id', protect, authorize('admin', 'owner'), async (req, res) => {
  try {
    // Get user's group ID from the authenticated user
    const groupId = req.user.group;
    
    // Find user by ID and ensure they're in the same group
    const user = await User.findOne({ 
      _id: req.params.id,
      group: groupId
    });
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    // Don't allow deleting the owner
    if (user.role === 'owner') {
      return res.status(403).json({
        success: false,
        message: 'Cannot delete the owner account'
      });
    }
    
    // Don't allow users to delete themselves
    if (user._id.toString() === req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Cannot delete your own account'
      });
    }
    
    // Delete user
    await User.findByIdAndDelete(req.params.id);
    
    res.status(200).json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (err) {
    console.error('Error deleting user:', err);
    res.status(500).json({
      success: false,
      message: 'Error deleting user'
    });
  }
});

// @route   GET api/users/me
// @desc    Get current user profile
// @access  Private
router.get('/me', protect, async (req, res) => {
  try {
    // Get the current user from the database
    const user = await User.findById(req.user.id).select('-password');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    res.status(200).json({
      success: true,
      data: user
    });
  } catch (err) {
    console.error('Error fetching user profile:', err);
    res.status(500).json({
      success: false,
      message: 'Error fetching user profile'
    });
  }
});

module.exports = router;

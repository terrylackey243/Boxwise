const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const Group = require('../models/Group');

// @route   GET api/groups
// @desc    Get all groups
// @access  Private/Owner
router.get('/', protect, authorize('owner'), async (req, res) => {
  try {
    // Find all groups
    const groups = await Group.find()
      .sort({ name: 1 });
    
    res.status(200).json({
      success: true,
      count: groups.length,
      data: groups
    });
  } catch (err) {
    console.error('Error fetching groups:', err);
    res.status(500).json({
      success: false,
      message: 'Error fetching groups'
    });
  }
});

// @route   GET api/groups/:id
// @desc    Get group by ID
// @access  Private/Owner
router.get('/:id', protect, authorize('owner'), async (req, res) => {
  try {
    const group = await Group.findById(req.params.id);
    
    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'Group not found'
      });
    }
    
    res.status(200).json({
      success: true,
      data: group
    });
  } catch (err) {
    console.error('Error fetching group:', err);
    res.status(500).json({
      success: false,
      message: 'Error fetching group'
    });
  }
});

// @route   POST api/groups
// @desc    Create a new group
// @access  Private/Owner
router.post('/', protect, authorize('owner'), async (req, res) => {
  try {
    const { name, description } = req.body;
    
    // Create new group
    const group = await Group.create({
      name,
      description: description || `Group for ${name}`,
      owner: req.user.id,
      subscription: {
        plan: 'free',
        maxMembers: 1
      }
    });
    
    res.status(201).json({
      success: true,
      message: 'Group created successfully',
      data: group
    });
  } catch (err) {
    console.error('Error creating group:', err);
    res.status(500).json({
      success: false,
      message: 'Error creating group'
    });
  }
});

// @route   PUT api/groups/:id
// @desc    Update a group
// @access  Private/Owner
router.put('/:id', protect, authorize('owner'), async (req, res) => {
  try {
    const { name, description, subscription } = req.body;
    
    // Find group by ID
    let group = await Group.findById(req.params.id);
    
    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'Group not found'
      });
    }
    
    // Update group fields
    if (name) group.name = name;
    if (description) group.description = description;
    if (subscription) {
      if (subscription.plan) group.subscription.plan = subscription.plan;
      if (subscription.maxMembers) group.subscription.maxMembers = subscription.maxMembers;
    }
    
    // Save updated group
    await group.save();
    
    res.status(200).json({
      success: true,
      message: 'Group updated successfully',
      data: group
    });
  } catch (err) {
    console.error('Error updating group:', err);
    res.status(500).json({
      success: false,
      message: 'Error updating group'
    });
  }
});

// @route   DELETE api/groups/:id
// @desc    Delete a group
// @access  Private/Owner
router.delete('/:id', protect, authorize('owner'), async (req, res) => {
  try {
    // Find group by ID
    const group = await Group.findById(req.params.id);
    
    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'Group not found'
      });
    }
    
    // Check if there are users in the group
    const User = require('../models/User');
    const usersInGroup = await User.countDocuments({ group: req.params.id });
    
    if (usersInGroup > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete group with users. Please remove all users from the group first.'
      });
    }
    
    // Delete group
    await Group.findByIdAndDelete(req.params.id);
    
    res.status(200).json({
      success: true,
      message: 'Group deleted successfully'
    });
  } catch (err) {
    console.error('Error deleting group:', err);
    res.status(500).json({
      success: false,
      message: 'Error deleting group'
    });
  }
});

module.exports = router;

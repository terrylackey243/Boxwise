const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { restrictViewers } = require('../middleware/viewerRestriction');
const Label = require('../models/Label');
const Item = require('../models/Item');
const achievementService = require('../services/achievementService');
const { bulkAddLabels } = require('../controllers/bulk');

// @route   POST api/labels/bulk
// @desc    Bulk add labels
// @access  Private
router.post('/bulk', protect, restrictViewers, bulkAddLabels);

// @route   GET api/labels/count
// @desc    Get count of labels
// @access  Private
router.get('/count', protect, async (req, res) => {
  try {
    // Count labels for the user's group
    const count = await Label.countDocuments({ group: req.user.group });
    
    res.status(200).json({
      success: true,
      count
    });
  } catch (err) {
    console.error('Error counting labels:', err);
    res.status(500).json({
      success: false,
      message: 'Error counting labels'
    });
  }
});

// @route   GET api/labels
// @desc    Get all labels
// @access  Private
router.get('/', protect, async (req, res) => {
  try {
    // Fetch all labels for the user's group
    const labels = await Label.find({ group: req.user.group })
      .sort({ createdAt: -1 });
    
    res.json({
      success: true,
      count: labels.length,
      data: labels
    });
  } catch (err) {
    console.error('Error fetching labels:', err.message);
    res.status(500).json({
      success: false,
      message: 'Server Error'
    });
  }
});

// @route   GET api/labels/counts
// @desc    Get item counts for each label
// @access  Private
router.get('/counts', protect, async (req, res) => {
  try {
    // Get all labels for the user's group
    const labels = await Label.find({ group: req.user.group });
    
    // Create an array to store label counts
    const labelCounts = [];
    
    // For each label, count the number of items that have this label
    for (const label of labels) {
      const count = await Item.countDocuments({
        group: req.user.group,
        labels: label._id
      });
      
      labelCounts.push({
        labelId: label._id,
        count
      });
    }
    
    res.json({
      success: true,
      data: labelCounts
    });
  } catch (err) {
    console.error('Error fetching label counts:', err.message);
    res.status(500).json({
      success: false,
      message: 'Server Error'
    });
  }
});

// @route   GET api/labels/:id
// @desc    Get label by ID
// @access  Private
router.get('/:id', protect, async (req, res) => {
  try {
    const label = await Label.findOne({
      _id: req.params.id,
      group: req.user.group
    });
    
    if (!label) {
      return res.status(404).json({
        success: false,
        message: 'Label not found'
      });
    }
    
    res.json({
      success: true,
      data: label
    });
  } catch (err) {
    console.error('Error fetching label:', err.message);
    res.status(500).json({
      success: false,
      message: 'Server Error'
    });
  }
});

// @route   POST api/labels
// @desc    Create a label
// @access  Private
router.post('/', protect, async (req, res) => {
  try {
    console.log('POST /api/labels - Request received');
    console.log('Headers:', req.headers);
    console.log('Body:', req.body);
    console.log('User:', req.user);
    
    const { name, description, color } = req.body;
    
    // Validate required fields
    if (!name) {
      console.log('Validation failed: Name is required');
      return res.status(400).json({ 
        success: false,
        message: 'Name is required' 
      });
    }
    
    // Validate color format
    const hexColorRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
    if (color && !hexColorRegex.test(color)) {
      console.log('Validation failed: Invalid color format');
      return res.status(400).json({ 
        success: false,
        message: 'Invalid color format' 
      });
    }
    
    // Create a new label in the database
    const labelData = {
      name,
      description: description || '',
      color: color || '#6B46C1',
      group: req.user.group,
      createdBy: req.user.id
    };
    
    console.log('Creating label:', labelData);
    
    const label = await Label.create(labelData);
    
    // Check for label count achievements
    const labelCount = await Label.countDocuments({ 
      group: req.user.group,
      createdBy: req.user.id
    });
    
    // Update achievements
    await achievementService.checkAndAwardAchievements(req.user.id, 'label_count', labelCount);
    
    // Return success response with the created label data
    const response = { 
      success: true,
      message: 'Label created successfully',
      data: {
        id: label._id,
        name: label.name,
        description: label.description,
        color: label.color,
        createdAt: label.createdAt
      }
    };
    
    console.log('Response:', response);
    res.status(201).json(response);
  } catch (err) {
    console.error('Error creating label:', err);
    res.status(500).json({
      success: false,
      message: 'Server Error: ' + err.message
    });
  }
});

// @route   PUT api/labels/:id
// @desc    Update a label
// @access  Private
router.put('/:id', protect, async (req, res) => {
  try {
    const { name, description, color } = req.body;
    
    // Validate required fields
    if (!name) {
      return res.status(400).json({
        success: false,
        message: 'Name is required'
      });
    }
    
    // Validate color format
    const hexColorRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
    if (color && !hexColorRegex.test(color)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid color format'
      });
    }
    
    // Find the label
    let label = await Label.findOne({
      _id: req.params.id,
      group: req.user.group
    });
    
    if (!label) {
      return res.status(404).json({
        success: false,
        message: 'Label not found'
      });
    }
    
    // Update the label
    label.name = name;
    label.description = description || '';
    label.color = color || '#6B46C1';
    label.updatedBy = req.user.id;
    
    await label.save();
    
    res.json({
      success: true,
      message: 'Label updated successfully',
      data: label
    });
  } catch (err) {
    console.error('Error updating label:', err.message);
    res.status(500).json({
      success: false,
      message: 'Server Error'
    });
  }
});

// @route   DELETE api/labels/:id
// @desc    Delete a label
// @access  Private
router.delete('/:id', protect, async (req, res) => {
  try {
    // Find the label
    const label = await Label.findOne({
      _id: req.params.id,
      group: req.user.group
    });
    
    if (!label) {
      return res.status(404).json({
        success: false,
        message: 'Label not found'
      });
    }
    
    // Delete the label
    await Label.deleteOne({ _id: req.params.id, group: req.user.group });
    
    res.json({
      success: true,
      message: 'Label deleted successfully'
    });
  } catch (err) {
    console.error('Error deleting label:', err.message);
    res.status(500).json({
      success: false,
      message: 'Server Error'
    });
  }
});

module.exports = router;

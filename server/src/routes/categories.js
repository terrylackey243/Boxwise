const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { restrictViewers } = require('../middleware/viewerRestriction');
const Category = require('../models/Category');
const Item = require('../models/Item');
const achievementService = require('../services/achievementService');
const { bulkAddCategories } = require('../controllers/bulk');

// @route   POST api/categories/bulk
// @desc    Bulk add categories
// @access  Private
router.post('/bulk', protect, restrictViewers, bulkAddCategories);

// @route   GET api/categories/count
// @desc    Get count of categories
// @access  Private
router.get('/count', protect, async (req, res) => {
  try {
    // Count categories for the user's group
    const count = await Category.countDocuments({ group: req.user.group });
    
    res.status(200).json({
      success: true,
      count
    });
  } catch (err) {
    console.error('Error counting categories:', err);
    res.status(500).json({
      success: false,
      message: 'Error counting categories'
    });
  }
});

// @route   GET api/categories
// @desc    Get all categories
// @access  Private
router.get('/', protect, async (req, res) => {
  try {
    // Get all categories for the user's group
    const categories = await Category.find({ group: req.user.group })
      .sort({ name: 1 });
    
    // Get item counts for each category
    const categoriesWithCounts = await Promise.all(
      categories.map(async (category) => {
        const itemCount = await Item.countDocuments({
          group: req.user.group,
          category: category._id
        });
        
        return {
          ...category.toObject(),
          itemCount
        };
      })
    );
    
    res.json({
      success: true,
      count: categoriesWithCounts.length,
      data: categoriesWithCounts
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({
      success: false,
      message: 'Server Error'
    });
  }
});

// @route   GET api/categories/:id
// @desc    Get category by ID
// @access  Private
router.get('/:id', protect, async (req, res) => {
  try {
    // Find the category
    const category = await Category.findOne({
      _id: req.params.id,
      group: req.user.group
    });
    
    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }
    
    // Get item count for this category
    const itemCount = await Item.countDocuments({
      group: req.user.group,
      category: category._id
    });
    
    const categoryWithCount = {
      ...category.toObject(),
      itemCount
    };
    
    res.json({
      success: true,
      data: categoryWithCount
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({
      success: false,
      message: 'Server Error'
    });
  }
});

// @route   POST api/categories
// @desc    Create a category
// @access  Private
router.post('/', protect, async (req, res) => {
  try {
    const { name, description, icon, color } = req.body;
    
    if (!name) {
      return res.status(400).json({
        success: false,
        message: 'Name is required'
      });
    }
    
    // Create a new category
    const newCategory = new Category({
      name,
      description: description || '',
      icon: icon || 'category',
      color: color || '#6B46C1',
      group: req.user.group,
      createdBy: req.user.id
    });
    
    await newCategory.save();
    
    // Check for category count achievements
    const categoryCount = await Category.countDocuments({ 
      group: req.user.group,
      createdBy: req.user.id
    });
    
    // Update achievements
    await achievementService.checkAndAwardAchievements(req.user.id, 'category_count', categoryCount);
    
    // Return the new category with item count (which will be 0)
    const categoryWithCount = {
      ...newCategory.toObject(),
      itemCount: 0
    };
    
    res.status(201).json({
      success: true,
      message: 'Category created successfully',
      data: categoryWithCount
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({
      success: false,
      message: 'Server Error'
    });
  }
});

// @route   PUT api/categories/:id
// @desc    Update a category
// @access  Private
router.put('/:id', protect, async (req, res) => {
  try {
    const { name, description, icon, color } = req.body;
    
    if (!name) {
      return res.status(400).json({
        success: false,
        message: 'Name is required'
      });
    }
    
    // Find the category
    let category = await Category.findOne({
      _id: req.params.id,
      group: req.user.group
    });
    
    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }
    
    // Update category fields
    category.name = name;
    category.description = description || '';
    if (icon) category.icon = icon;
    if (color) category.color = color;
    category.updatedBy = req.user.id;
    
    await category.save();
    
    // Get item count for this category
    const itemCount = await Item.countDocuments({
      group: req.user.group,
      category: category._id
    });
    
    const categoryWithCount = {
      ...category.toObject(),
      itemCount
    };
    
    res.json({
      success: true,
      message: 'Category updated successfully',
      data: categoryWithCount
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({
      success: false,
      message: 'Server Error'
    });
  }
});

// @route   DELETE api/categories/:id
// @desc    Delete a category
// @access  Private
router.delete('/:id', protect, async (req, res) => {
  try {
    // Find the category
    const category = await Category.findOne({
      _id: req.params.id,
      group: req.user.group
    });
    
    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }
    
    // Check if there are items using this category
    const itemCount = await Item.countDocuments({
      group: req.user.group,
      category: category._id
    });
    
    if (itemCount > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete category. It is used by ${itemCount} items.`
      });
    }
    
    // Delete the category
    await Category.deleteOne({ _id: req.params.id, group: req.user.group });
    
    res.json({
      success: true,
      message: `Category ${category.name} deleted successfully`
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({
      success: false,
      message: 'Server Error'
    });
  }
});

module.exports = router;

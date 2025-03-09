const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const Achievement = require('../models/Achievement');
const Item = require('../models/Item');
const Location = require('../models/Location');
const Label = require('../models/Label');
const Category = require('../models/Category');
const User = require('../models/User');
const achievementService = require('../services/achievementService');

// @route   GET api/achievements
// @desc    Get all achievements with progress for the current user
// @access  Private
router.get('/', protect, async (req, res) => {
  try {
    console.log('GET /api/achievements - Request received');
    console.log('User ID:', req.user._id);
    
    // Get all achievements
    console.log('Fetching all active achievements...');
    const achievements = await Achievement.find({ isActive: true });
    console.log(`Found ${achievements.length} active achievements`);
    
    // Get counts for different achievement types
    console.log('Counting items created by user...');
    const itemCount = await Item.countDocuments({ 
      group: req.user.group,
      createdBy: req.user._id
    });
    console.log(`User has created ${itemCount} items`);
    
    console.log('Counting locations created by user...');
    const locationCount = await Location.countDocuments({ 
      group: req.user.group,
      createdBy: req.user._id
    });
    console.log(`User has created ${locationCount} locations`);
    
    console.log('Counting labels created by user...');
    const labelCount = await Label.countDocuments({ 
      group: req.user.group,
      createdBy: req.user._id
    });
    console.log(`User has created ${labelCount} labels`);
    
    console.log('Counting categories created by user...');
    const categoryCount = await Category.countDocuments({ 
      group: req.user.group,
      createdBy: req.user._id
    });
    console.log(`User has created ${categoryCount} categories`);
    
    // Get group counts
    console.log('Getting group counts...');
    const groupItemCount = await Item.countDocuments({ group: req.user.group });
    const groupMemberCount = await User.countDocuments({ group: req.user.group });
    const groupLocationCount = await Location.countDocuments({ group: req.user.group });
    const groupLabelCount = await Label.countDocuments({ group: req.user.group });
    const groupCategoryCount = await Category.countDocuments({ group: req.user.group });
    const groupActivityCount = groupItemCount + groupLocationCount + groupLabelCount + groupCategoryCount;
    
    console.log(`Group stats - Items: ${groupItemCount}, Members: ${groupMemberCount}, Activity: ${groupActivityCount}`);
    
    // Get user with achievements
    console.log('Fetching user data...');
    const user = await User.findById(req.user._id);
    if (!user) {
      console.log('User not found');
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    const loginStreak = user.loginStreak || 0;
    console.log(`User login streak: ${loginStreak}`);
    
    // Make sure achievements are up to date
    console.log('Updating achievements...');
    await achievementService.checkAndAwardAchievements(req.user._id, 'item_count', itemCount);
    await achievementService.checkAndAwardAchievements(req.user._id, 'location_count', locationCount);
    await achievementService.checkAndAwardAchievements(req.user._id, 'label_count', labelCount);
    await achievementService.checkAndAwardAchievements(req.user._id, 'category_count', categoryCount);
    await achievementService.checkAndAwardAchievements(req.user._id, 'login_streak', loginStreak);
    
    // Check for group achievements
    console.log('Checking group achievements...');
    await achievementService.checkAndAwardGroupAchievements(req.user._id, req.user.group);
    
    // Refresh user data after updating achievements
    console.log('Refreshing user data after achievement updates...');
    const updatedUser = await User.findById(req.user._id);
    if (!updatedUser) {
      console.log('Updated user not found');
      return res.status(404).json({
        success: false,
        message: 'User not found after achievement update'
      });
    }
    
    // Calculate progress for each achievement
    const achievementsWithProgress = achievements.map(achievement => {
      let currentValue = 0;
      let completed = false;
      let completedAt = null;
      
      // Check if user has earned this achievement
      const userAchievement = updatedUser.achievements.find(a => a.name === achievement.name);
      completed = !!userAchievement;
      
      if (completed) {
        completedAt = userAchievement.dateEarned;
      }
      
      // Set current value based on achievement type
      switch (achievement.type) {
        case 'item_count':
          currentValue = itemCount;
          break;
        case 'location_count':
          currentValue = locationCount;
          break;
        case 'label_count':
          currentValue = labelCount;
          break;
        case 'category_count':
          currentValue = categoryCount;
          break;
        case 'login_streak':
          currentValue = loginStreak;
          break;
        case 'group_item_count':
          currentValue = groupItemCount;
          break;
        case 'group_member_count':
          currentValue = groupMemberCount;
          break;
        case 'group_activity':
          currentValue = groupActivityCount;
          break;
        default:
          // For custom achievements, we'd need a different approach
          break;
      }
      
      return {
        id: achievement._id,
        name: achievement.name,
        description: achievement.description,
        icon: achievement.icon,
        type: achievement.type,
        threshold: achievement.threshold,
        currentValue,
        completed,
        completedAt,
        points: achievement.points,
        color: getColorForAchievement(achievement.type)
      };
    });
    
    // Calculate stats
    const completedAchievements = achievementsWithProgress.filter(a => a.completed);
    const totalPoints = completedAchievements.reduce((sum, a) => sum + a.points, 0);
    const level = Math.floor(totalPoints / 100) + 1;
    
    res.json({
      success: true,
      data: {
        achievements: achievementsWithProgress,
        stats: {
          totalPoints,
          completedAchievements: completedAchievements.length,
          level
        }
      }
    });
  } catch (err) {
    console.error('Error fetching achievements:', err.message);
    res.status(500).json({
      success: false,
      message: 'Server Error'
    });
  }
});

// Helper function to get color for achievement type
function getColorForAchievement(type) {
  const colors = {
    'item_count': '#6B46C1', // Purple
    'location_count': '#38A169', // Green
    'label_count': '#DD6B20', // Orange
    'category_count': '#E53E3E', // Red
    'login_streak': '#805AD5', // Indigo
    'group_item_count': '#2B6CB0', // Blue
    'group_member_count': '#00A3C4', // Cyan
    'group_activity': '#319795', // Teal
    'custom': '#D69E2E' // Yellow
  };
  
  return colors[type] || '#3182CE'; // Default to blue
}

module.exports = router;

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
    // Get all achievements
    const achievements = await Achievement.find({ isActive: true });
    
    // Get counts for different achievement types
    const itemCount = await Item.countDocuments({ 
      group: req.user.group,
      createdBy: req.user._id
    });
    
    const locationCount = await Location.countDocuments({ 
      group: req.user.group,
      createdBy: req.user._id
    });
    
    const labelCount = await Label.countDocuments({ 
      group: req.user.group,
      createdBy: req.user._id
    });
    
    const categoryCount = await Category.countDocuments({ 
      group: req.user.group,
      createdBy: req.user._id
    });
    
    // Get user with achievements
    const user = await User.findById(req.user._id);
    const loginStreak = user.loginStreak || 0;
    
    // Make sure achievements are up to date
    await achievementService.checkAndAwardAchievements(req.user._id, 'item_count', itemCount);
    await achievementService.checkAndAwardAchievements(req.user._id, 'location_count', locationCount);
    await achievementService.checkAndAwardAchievements(req.user._id, 'label_count', labelCount);
    await achievementService.checkAndAwardAchievements(req.user._id, 'category_count', categoryCount);
    await achievementService.checkAndAwardAchievements(req.user._id, 'login_streak', loginStreak);
    
    // Refresh user data after updating achievements
    const updatedUser = await User.findById(req.user._id);
    
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
    'custom': '#D69E2E' // Yellow
  };
  
  return colors[type] || '#3182CE'; // Default to blue
}

module.exports = router;

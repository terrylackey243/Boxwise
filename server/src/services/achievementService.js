const Achievement = require('../models/Achievement');
const User = require('../models/User');

/**
 * Check and award achievements for a user
 * @param {string} userId - The user ID
 * @param {string} type - The achievement type (e.g., 'item_count', 'location_count')
 * @param {number} value - The current value for the achievement type
 */
exports.checkAndAwardAchievements = async (userId, type, value) => {
  try {
    // Get all achievements of the specified type
    const achievements = await Achievement.find({ 
      type, 
      isActive: true,
      threshold: { $lte: value } // Only get achievements where the threshold is less than or equal to the current value
    });

    if (!achievements || achievements.length === 0) {
      return;
    }

    // Get the user
    const user = await User.findById(userId);
    if (!user) {
      return;
    }

    // Initialize achievements array if it doesn't exist
    if (!user.achievements) {
      user.achievements = [];
    }

    // Check each achievement
    for (const achievement of achievements) {
      // Check if the user already has this achievement
      const hasAchievement = user.achievements.some(a => a.name === achievement.name);
      
      if (!hasAchievement) {
        // Add the achievement to the user
        user.achievements.push({
          name: achievement.name,
          description: achievement.description,
          dateEarned: new Date()
        });
        
        console.log(`User ${userId} earned achievement: ${achievement.name}`);
      }
    }

    // Save the user
    await user.save();
  } catch (error) {
    console.error('Error checking and awarding achievements:', error);
  }
};

/**
 * Update login streak for a user
 * @param {string} userId - The user ID
 */
exports.updateLoginStreak = async (userId) => {
  try {
    const user = await User.findById(userId);
    if (!user) {
      return;
    }

    // Initialize loginStreak if it doesn't exist
    if (!user.loginStreak) {
      user.loginStreak = 0;
    }

    // Initialize lastLogin if it doesn't exist
    if (!user.lastLogin) {
      user.lastLogin = new Date();
      user.loginStreak = 1;
    } else {
      const now = new Date();
      const lastLogin = new Date(user.lastLogin);
      
      // Calculate days between last login and now
      const daysSinceLastLogin = Math.floor((now - lastLogin) / (1000 * 60 * 60 * 24));
      
      if (daysSinceLastLogin === 0) {
        // Already logged in today, don't update streak
        return;
      } else if (daysSinceLastLogin === 1) {
        // Consecutive day, increment streak
        user.loginStreak += 1;
      } else {
        // Streak broken, reset to 1
        user.loginStreak = 1;
      }
      
      // Update last login date
      user.lastLogin = now;
    }

    // Save the user
    await user.save();
    
    // Check for login streak achievements
    await exports.checkAndAwardAchievements(userId, 'login_streak', user.loginStreak);
  } catch (error) {
    console.error('Error updating login streak:', error);
  }
};

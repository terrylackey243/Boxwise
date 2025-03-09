const Achievement = require('../models/Achievement');
const User = require('../models/User');
const Item = require('../models/Item');
const Location = require('../models/Location');
const Label = require('../models/Label');
const Category = require('../models/Category');

/**
 * Check and award achievements for a user
 * @param {string} userId - The user ID
 * @param {string} type - The achievement type (e.g., 'item_count', 'location_count')
 * @param {number} value - The current value for the achievement type
 */
exports.checkAndAwardAchievements = async (userId, type, value) => {
  try {
    console.log(`Checking achievements for user ${userId}, type: ${type}, value: ${value}`);
    
    // Get all achievements of the specified type
    const achievements = await Achievement.find({ 
      type, 
      isActive: true,
      threshold: { $lte: value } // Only get achievements where the threshold is less than or equal to the current value
    });

    console.log(`Found ${achievements.length} eligible achievements`);

    if (!achievements || achievements.length === 0) {
      return;
    }

    // Get the user
    const user = await User.findById(userId);
    if (!user) {
      console.log(`User ${userId} not found`);
      return;
    }

    // Initialize achievements array if it doesn't exist
    if (!user.achievements) {
      console.log(`Initializing achievements array for user ${userId}`);
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
      } else {
        console.log(`User ${userId} already has achievement: ${achievement.name}`);
      }
    }

    // Save the user
    console.log(`Saving user ${userId} with updated achievements`);
    await user.save();
    console.log(`User ${userId} saved successfully`);
  } catch (error) {
    console.error('Error checking and awarding achievements:', error);
  }
};

/**
 * Check and award group achievements for a user
 * @param {string} userId - The user ID
 * @param {string} groupId - The group ID
 */
exports.checkAndAwardGroupAchievements = async (userId, groupId) => {
  try {
    console.log(`Checking group achievements for user ${userId}, group ${groupId}`);
    
    // Get all group achievements
    const achievements = await Achievement.find({ 
      type: { $in: ['group_item_count', 'group_member_count', 'group_activity'] },
      isActive: true
    });

    console.log(`Found ${achievements.length} eligible group achievements`);

    if (!achievements || achievements.length === 0) {
      return;
    }

    // Get the user
    const user = await User.findById(userId);
    if (!user) {
      console.log(`User ${userId} not found`);
      return;
    }

    // Get group stats
    const itemCount = await Item.countDocuments({ group: groupId });
    const memberCount = await User.countDocuments({ group: groupId });
    
    // Get activity count (sum of all items, locations, labels, categories)
    const locationCount = await Location.countDocuments({ group: groupId });
    const labelCount = await Label.countDocuments({ group: groupId });
    const categoryCount = await Category.countDocuments({ group: groupId });
    const activityCount = itemCount + locationCount + labelCount + categoryCount;
    
    console.log(`Group stats - Items: ${itemCount}, Members: ${memberCount}, Activity: ${activityCount}`);

    // Initialize achievements array if it doesn't exist
    if (!user.achievements) {
      console.log(`Initializing achievements array for user ${userId}`);
      user.achievements = [];
    }

    // Check each achievement
    for (const achievement of achievements) {
      // Check if the user already has this achievement
      const hasAchievement = user.achievements.some(a => a.name === achievement.name);
      
      if (hasAchievement) {
        console.log(`User ${userId} already has achievement: ${achievement.name}`);
        continue;
      }
      
      // Check if the threshold is met based on achievement type
      let thresholdMet = false;
      
      switch (achievement.type) {
        case 'group_item_count':
          thresholdMet = itemCount >= achievement.threshold;
          break;
        case 'group_member_count':
          thresholdMet = memberCount >= achievement.threshold;
          break;
        case 'group_activity':
          thresholdMet = activityCount >= achievement.threshold;
          break;
      }
      
      if (thresholdMet) {
        // Add the achievement to the user
        user.achievements.push({
          name: achievement.name,
          description: achievement.description,
          dateEarned: new Date()
        });
        
        console.log(`User ${userId} earned group achievement: ${achievement.name}`);
      }
    }

    // Save the user
    console.log(`Saving user ${userId} with updated group achievements`);
    await user.save();
    console.log(`User ${userId} saved successfully`);
  } catch (error) {
    console.error('Error checking and awarding group achievements:', error);
  }
};

/**
 * Update login streak for a user
 * @param {string} userId - The user ID
 */
exports.updateLoginStreak = async (userId) => {
  try {
    console.log(`Updating login streak for user ${userId}`);
    
    const user = await User.findById(userId);
    if (!user) {
      console.log(`User ${userId} not found`);
      return;
    }

    // Initialize loginStreak if it doesn't exist
    if (!user.loginStreak) {
      console.log(`Initializing login streak for user ${userId}`);
      user.loginStreak = 0;
    }

    // Initialize lastLogin if it doesn't exist
    if (!user.lastLogin) {
      console.log(`First login for user ${userId}`);
      user.lastLogin = new Date();
      user.loginStreak = 1;
    } else {
      const now = new Date();
      const lastLogin = new Date(user.lastLogin);
      
      // Calculate days between last login and now
      const daysSinceLastLogin = Math.floor((now - lastLogin) / (1000 * 60 * 60 * 24));
      console.log(`Days since last login: ${daysSinceLastLogin}`);
      
      if (daysSinceLastLogin === 0) {
        // Already logged in today, don't update streak
        console.log(`User ${userId} already logged in today, streak remains at ${user.loginStreak}`);
        return;
      } else if (daysSinceLastLogin === 1) {
        // Consecutive day, increment streak
        user.loginStreak += 1;
        console.log(`User ${userId} logged in on consecutive day, streak increased to ${user.loginStreak}`);
      } else {
        // Streak broken, reset to 1
        console.log(`User ${userId} streak broken (${daysSinceLastLogin} days since last login), resetting to 1`);
        user.loginStreak = 1;
      }
      
      // Update last login date
      user.lastLogin = now;
    }

    // Save the user
    console.log(`Saving user ${userId} with updated login streak: ${user.loginStreak}`);
    await user.save();
    console.log(`User ${userId} saved successfully`);
    
    // Check for login streak achievements
    console.log(`Checking login streak achievements for user ${userId}`);
    await exports.checkAndAwardAchievements(userId, 'login_streak', user.loginStreak);
  } catch (error) {
    console.error('Error updating login streak:', error);
  }
};

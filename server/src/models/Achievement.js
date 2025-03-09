const mongoose = require('mongoose');

const AchievementSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please add an achievement name'],
    trim: true,
    maxlength: [50, 'Achievement name cannot be more than 50 characters']
  },
  description: {
    type: String,
    required: [true, 'Please add an achievement description'],
    maxlength: [200, 'Description cannot be more than 200 characters']
  },
  icon: {
    type: String,
    default: 'emoji_events' // Default Material UI icon name
  },
  type: {
    type: String,
    enum: ['item_count', 'location_count', 'label_count', 'login_streak', 'group_item_count', 'group_member_count', 'group_activity', 'custom'],
    required: true
  },
  threshold: {
    type: Number,
    required: function() {
      return ['item_count', 'location_count', 'label_count', 'login_streak', 'group_item_count', 'group_member_count', 'group_activity'].includes(this.type);
    }
  },
  points: {
    type: Number,
    default: 10
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Create index for faster searching
AchievementSchema.index({ name: 'text', description: 'text' });
AchievementSchema.index({ type: 1 });

module.exports = mongoose.model('Achievement', AchievementSchema);

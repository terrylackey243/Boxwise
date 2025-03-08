const mongoose = require('mongoose');

const GroupSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please add a group name'],
    trim: true,
    maxlength: [50, 'Group name cannot be more than 50 characters']
  },
  description: {
    type: String,
    maxlength: [500, 'Description cannot be more than 500 characters']
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  members: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    role: {
      type: String,
      enum: ['user', 'admin'],
      default: 'user'
    },
    joinedAt: {
      type: Date,
      default: Date.now
    }
  }],
  invites: [{
    email: {
      type: String,
      required: true
    },
    token: {
      type: String,
      required: true
    },
    expiresAt: {
      type: Date,
      required: true
    }
  }],
  settings: {
    assetIdPrefix: {
      type: String,
      default: '000-'
    },
    autoIncrementAssetId: {
      type: Boolean,
      default: true
    },
    nextAssetId: {
      type: Number,
      default: 1
    }
  },
  subscription: {
    plan: {
      type: String,
      enum: ['free', 'pro', 'family'],
      default: 'free'
    },
    maxMembers: {
      type: Number,
      default: 1
    }
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Get next asset ID and increment
GroupSchema.methods.getNextAssetId = async function() {
  if (!this.settings.autoIncrementAssetId) {
    return null;
  }
  
  const nextId = this.settings.nextAssetId;
  this.settings.nextAssetId += 1;
  await this.save();
  
  // Format with leading zeros (e.g., 001)
  const formattedId = String(nextId).padStart(3, '0');
  return `${this.settings.assetIdPrefix}${formattedId}`;
};

// Check if group has reached member limit based on subscription
GroupSchema.methods.hasReachedMemberLimit = function() {
  // Always return false to remove all limits
  return false;
  
  /* Original implementation with limits:
  if (this.subscription.plan === 'free') {
    return this.members.length >= 1;
  } else if (this.subscription.plan === 'family') {
    return this.members.length >= 5;
  }
  return false;
  */
};

module.exports = mongoose.model('Group', GroupSchema);

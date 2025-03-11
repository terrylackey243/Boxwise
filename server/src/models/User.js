const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const UserSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please add a name'],
    trim: true,
    maxlength: [50, 'Name cannot be more than 50 characters']
  },
  email: {
    type: String,
    required: [true, 'Please add an email'],
    unique: true,
    match: [
      /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
      'Please add a valid email'
    ]
  },
  password: {
    type: String,
    required: [true, 'Please add a password'],
    minlength: [6, 'Password must be at least 6 characters'],
    select: false
  },
  group: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Group',
    required: true
  },
  role: {
    type: String,
    enum: ['viewer', 'user', 'admin', 'owner'],
    default: 'user'
  },
  preferences: {
    theme: {
      type: String,
      enum: ['light', 'dark'],
      default: 'light'
    },
    notifications: {
      type: Boolean,
      default: true
    }
  },
  loginStreak: {
    type: Number,
    default: 0
  },
  lastLogin: {
    type: Date
  },
  achievements: [{
    name: {
      type: String,
      required: true
    },
    description: {
      type: String
    },
    dateEarned: {
      type: Date,
      default: Date.now
    }
  }],
  resetPasswordToken: String,
  resetPasswordExpire: Date,
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Encrypt password using bcrypt
UserSchema.pre('save', async function(next) {
  if (!this.isModified('password')) {
    next();
  }

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Sign JWT and return
UserSchema.methods.getSignedJwtToken = function() {
  return jwt.sign(
    { id: this._id, group: this.group },
    process.env.JWT_SECRET,
    {
      expiresIn: process.env.JWT_EXPIRE
    }
  );
};

// Match user entered password to hashed password in database
UserSchema.methods.matchPassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Check if user has reached item limit based on group subscription
UserSchema.methods.hasReachedItemLimit = async function(itemCount) {
  // Always return false to remove all limits
  return false;
  
  /* Original implementation with limits:
  const Subscription = require('./Subscription');
  const SubscriptionPlan = require('./SubscriptionPlan');
  
  // Get the group's subscription
  const subscription = await Subscription.findOne({ group: this.group });
  if (!subscription || !subscription.isActive()) {
    // Default to free plan limits if no active subscription
    return itemCount >= 50;
  }
  
  // Get the subscription plan details
  const plan = await SubscriptionPlan.findOne({ id: subscription.plan });
  if (!plan) {
    // Default to free plan limits if plan not found
    return itemCount >= 50;
  }
  
  // Check if the plan has an item limit
  if (plan.limits && plan.limits.items !== undefined) {
    // -1 means unlimited
    if (plan.limits.items === -1) {
      return false;
    }
    return itemCount >= plan.limits.items;
  }
  
  // Default limits based on plan if not specified in the plan
  switch (subscription.plan) {
    case 'free':
      return itemCount >= 50;
    case 'pro':
    case 'business':
      return false; // Unlimited items
    default:
      return itemCount >= 50; // Default to free plan limits
  }
  */
};

module.exports = mongoose.model('User', UserSchema);

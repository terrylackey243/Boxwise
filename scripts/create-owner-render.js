#!/usr/bin/env node

/**
 * Script to create a new owner user in the Boxwise application on Render.com
 * 
 * This script is designed to be run on Render.com to create a new owner user
 * with the specified email, password, and name.
 * 
 * Usage: node create-owner-render.js <email> <password> <name>
 * Example: node create-owner-render.js owner@example.com password123 "John Doe"
 */

// Import required modules
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Get command line arguments
const email = process.argv[2] || 'terry@jknelotions.com';
const password = process.argv[3] || 'cde3CDE#vfr4VFR$';
const name = process.argv[4] || 'Terry';

// MongoDB connection
const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) {
  console.error('MONGO_URI environment variable is required');
  process.exit(1);
}

console.log(`Using MongoDB URI: ${MONGO_URI.replace(/\/\/([^:]+):[^@]+@/, '//***:***@')}`);
console.log(`Creating owner user with email: ${email}, name: ${name}`);

// Connect to MongoDB
mongoose.connect(MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('Connected to MongoDB'))
.catch(err => {
  console.error('MongoDB connection error:', err);
  process.exit(1);
});

// Define schemas (simplified versions of the actual models)
const GroupSchema = new mongoose.Schema({
  name: String,
  description: String,
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  members: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    role: String,
    joinedAt: Date
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
    plan: String,
    maxMembers: Number
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const UserSchema = new mongoose.Schema({
  name: String,
  email: String,
  password: String,
  group: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Group'
  },
  role: String,
  preferences: {
    theme: String,
    notifications: Boolean
  },
  loginStreak: Number,
  lastLogin: Date,
  achievements: [{
    name: String,
    description: String,
    dateEarned: Date
  }],
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Hash password before saving
UserSchema.pre('save', async function(next) {
  if (!this.isModified('password')) {
    next();
  }

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Create models
const Group = mongoose.model('Group', GroupSchema);
const User = mongoose.model('User', UserSchema);

async function createOwner() {
  try {
    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      console.log(`User with email ${email} already exists`);
      process.exit(0);
    }

    // Create a new group
    const group = new Group({
      name: `${name}'s Group`,
      description: 'Default group',
      settings: {
        assetIdPrefix: '000-',
        autoIncrementAssetId: true,
        nextAssetId: 1
      },
      subscription: {
        plan: 'pro', // Set to pro to remove limits
        maxMembers: 100
      }
    });
    await group.save();
    console.log('Group created:', group._id);

    // Create the owner user
    const user = new User({
      name,
      email,
      password,
      group: group._id,
      role: 'owner',
      preferences: {
        theme: 'light',
        notifications: true
      },
      loginStreak: 0
    });
    await user.save();
    console.log('User created:', user._id);

    // Update group with owner
    group.owner = user._id;
    group.members.push({
      user: user._id,
      role: 'admin',
      joinedAt: Date.now()
    });
    await group.save();
    console.log('Group updated with owner');

    console.log(`Owner user created successfully:`);
    console.log(`- Email: ${email}`);
    console.log(`- Name: ${name}`);
    console.log(`- Group: ${group.name}`);
    console.log(`- Role: owner`);

    process.exit(0);
  } catch (err) {
    console.error('Error creating owner:', err);
    process.exit(1);
  }
}

createOwner();

#!/usr/bin/env node

/**
 * Script to create a new owner user in the Boxwise application
 * 
 * Usage: node create-owner.js <email> <password> <name>
 * Example: node create-owner.js owner@example.com password123 "John Doe"
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Get command line arguments
const email = process.argv[2];
const password = process.argv[3];
const name = process.argv[4] || email.split('@')[0]; // Use part of email as name if not provided

if (!email || !password) {
  console.error('Usage: node create-owner.js <email> <password> <name>');
  process.exit(1);
}

// MongoDB connection
const MONGO_URI = process.env.MONGO_URI || 'mongodb://mongodb:27017/boxwise';

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
      console.error(`User with email ${email} already exists`);
      process.exit(1);
    }

    // Create a new group
    const group = new Group({
      name: `${name}'s Group`,
      description: 'Default group',
      subscription: {
        plan: 'free',
        maxMembers: 1
      }
    });
    await group.save();

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

    // Update group with owner
    group.owner = user._id;
    group.members.push({
      user: user._id,
      role: 'admin',
      joinedAt: Date.now()
    });
    await group.save();

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

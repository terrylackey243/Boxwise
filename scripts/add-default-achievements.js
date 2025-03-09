const mongoose = require('mongoose');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config({ path: '../server/.env' });

// Set default MongoDB URI if not provided in .env
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/boxwise';
console.log('Using MongoDB URI:', MONGO_URI);

// Import Achievement model
const Achievement = require('../server/src/models/Achievement');

// Default achievements
const defaultAchievements = [
  {
    name: 'Item Collector I',
    description: 'Add 5 items to your inventory',
    type: 'item_count',
    threshold: 5,
    points: 10,
    isActive: true
  },
  {
    name: 'Item Collector II',
    description: 'Add 25 items to your inventory',
    type: 'item_count',
    threshold: 25,
    points: 20,
    isActive: true
  },
  {
    name: 'Item Collector III',
    description: 'Add 100 items to your inventory',
    type: 'item_count',
    threshold: 100,
    points: 50,
    isActive: true
  },
  {
    name: 'Location Master I',
    description: 'Create 3 locations',
    type: 'location_count',
    threshold: 3,
    points: 10,
    isActive: true
  },
  {
    name: 'Location Master II',
    description: 'Create 10 locations',
    type: 'location_count',
    threshold: 10,
    points: 20,
    isActive: true
  },
  {
    name: 'Label Creator I',
    description: 'Create 3 labels',
    type: 'label_count',
    threshold: 3,
    points: 10,
    isActive: true
  },
  {
    name: 'Label Creator II',
    description: 'Create 10 labels',
    type: 'label_count',
    threshold: 10,
    points: 20,
    isActive: true
  },
  {
    name: 'Category Organizer I',
    description: 'Create 3 categories',
    type: 'category_count',
    threshold: 3,
    points: 10,
    isActive: true
  },
  {
    name: 'Category Organizer II',
    description: 'Create 10 categories',
    type: 'category_count',
    threshold: 10,
    points: 20,
    isActive: true
  },
  {
    name: 'Regular User I',
    description: 'Log in for 3 consecutive days',
    type: 'login_streak',
    threshold: 3,
    points: 10,
    isActive: true
  },
  {
    name: 'Regular User II',
    description: 'Log in for 7 consecutive days',
    type: 'login_streak',
    threshold: 7,
    points: 20,
    isActive: true
  },
  {
    name: 'Regular User III',
    description: 'Log in for 30 consecutive days',
    type: 'login_streak',
    threshold: 30,
    points: 50,
    isActive: true
  }
];

// Add more logging
console.log('Starting script...');
console.log('Connecting to MongoDB...');

// Connect to MongoDB
mongoose
  .connect(MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    serverSelectionTimeoutMS: 30000, // Increase timeout to 30 seconds
    socketTimeoutMS: 45000, // Increase socket timeout to 45 seconds
  })
  .then(async () => {
    console.log('Connected to MongoDB');
    
    try {
      // Check if achievements already exist
      const count = await Achievement.countDocuments();
      console.log(`Found ${count} achievements in the database`);
      
      if (count === 0) {
        // Add default achievements
        await Achievement.insertMany(defaultAchievements);
        console.log(`Added ${defaultAchievements.length} default achievements`);
      } else {
        console.log('Achievements already exist, skipping...');
      }
      
      // Disconnect from MongoDB
      mongoose.disconnect();
      console.log('Disconnected from MongoDB');
    } catch (error) {
      console.error('Error:', error);
      mongoose.disconnect();
    }
  })
  .catch((err) => {
    console.error('MongoDB connection error:', err.message);
    process.exit(1);
  });

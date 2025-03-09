const { MongoClient } = require('mongodb');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config({ path: '../server/.env' });

// MongoDB connection string
const uri = process.env.MONGO_URI || 'mongodb://localhost:27017/boxwise';
console.log('Using MongoDB URI:', uri);

// Default achievements
const defaultAchievements = [
  {
    name: 'Item Collector I',
    description: 'Add 5 items to your inventory',
    type: 'item_count',
    threshold: 5,
    points: 10,
    isActive: true,
    createdAt: new Date()
  },
  {
    name: 'Item Collector II',
    description: 'Add 25 items to your inventory',
    type: 'item_count',
    threshold: 25,
    points: 20,
    isActive: true,
    createdAt: new Date()
  },
  {
    name: 'Item Collector III',
    description: 'Add 100 items to your inventory',
    type: 'item_count',
    threshold: 100,
    points: 50,
    isActive: true,
    createdAt: new Date()
  },
  {
    name: 'Location Master I',
    description: 'Create 3 locations',
    type: 'location_count',
    threshold: 3,
    points: 10,
    isActive: true,
    createdAt: new Date()
  },
  {
    name: 'Location Master II',
    description: 'Create 10 locations',
    type: 'location_count',
    threshold: 10,
    points: 20,
    isActive: true,
    createdAt: new Date()
  },
  {
    name: 'Label Creator I',
    description: 'Create 3 labels',
    type: 'label_count',
    threshold: 3,
    points: 10,
    isActive: true,
    createdAt: new Date()
  },
  {
    name: 'Label Creator II',
    description: 'Create 10 labels',
    type: 'label_count',
    threshold: 10,
    points: 20,
    isActive: true,
    createdAt: new Date()
  },
  {
    name: 'Category Organizer I',
    description: 'Create 3 categories',
    type: 'category_count',
    threshold: 3,
    points: 10,
    isActive: true,
    createdAt: new Date()
  },
  {
    name: 'Category Organizer II',
    description: 'Create 10 categories',
    type: 'category_count',
    threshold: 10,
    points: 20,
    isActive: true,
    createdAt: new Date()
  },
  {
    name: 'Regular User I',
    description: 'Log in for 3 consecutive days',
    type: 'login_streak',
    threshold: 3,
    points: 10,
    isActive: true,
    createdAt: new Date()
  },
  {
    name: 'Regular User II',
    description: 'Log in for 7 consecutive days',
    type: 'login_streak',
    threshold: 7,
    points: 20,
    isActive: true,
    createdAt: new Date()
  },
  {
    name: 'Regular User III',
    description: 'Log in for 30 consecutive days',
    type: 'login_streak',
    threshold: 30,
    points: 50,
    isActive: true,
    createdAt: new Date()
  }
];

async function run() {
  console.log('Starting script...');
  console.log('Default achievements to check:');
  defaultAchievements.forEach(achievement => {
    console.log(`- ${achievement.name} (${achievement.type}, threshold: ${achievement.threshold})`);
  });
  
  const client = new MongoClient(uri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    serverSelectionTimeoutMS: 30000, // Increase timeout to 30 seconds
    socketTimeoutMS: 45000, // Increase socket timeout to 45 seconds
  });

  try {
    console.log('Connecting to MongoDB...');
    await client.connect();
    console.log('Connected to MongoDB');

    const database = client.db();
    const achievementsCollection = database.collection('achievements');

    // Check if achievements already exist
    const count = await achievementsCollection.countDocuments();
    console.log(`Found ${count} achievements in the database`);

    // Get existing achievement types
    const existingTypes = {};
    const existingAchievements = await achievementsCollection.find({}).toArray();
    console.log('Existing achievements:');
    existingAchievements.forEach(achievement => {
      console.log(`- ${achievement.name} (${achievement.type}, threshold: ${achievement.threshold})`);
      if (!existingTypes[achievement.type]) {
        existingTypes[achievement.type] = [];
      }
      existingTypes[achievement.type].push(achievement.threshold);
    });

    // Filter out achievements that already exist
    const achievementsToInsert = defaultAchievements.filter(achievement => {
      const typeExists = existingTypes[achievement.type];
      if (!typeExists) {
        return true; // No achievements of this type exist
      }
      return !typeExists.includes(achievement.threshold); // Check if threshold already exists for this type
    });

    if (achievementsToInsert.length > 0) {
      // Add missing achievements
      const result = await achievementsCollection.insertMany(achievementsToInsert);
      console.log(`${result.insertedCount} new achievements inserted:`);
      achievementsToInsert.forEach(achievement => {
        console.log(`- ${achievement.name} (${achievement.type}, threshold: ${achievement.threshold})`);
      });
    } else {
      console.log('All necessary achievements already exist, nothing to insert.');
    }
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await client.close();
    console.log('Disconnected from MongoDB');
  }
}

run().catch(console.error);

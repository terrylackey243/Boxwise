const { MongoClient } = require('mongodb');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config({ path: '../server/.env' });

// MongoDB connection string
const uri = process.env.MONGO_URI || 'mongodb://localhost:27017/boxwise';
console.log('Using MongoDB URI:', uri);

// Group achievements to add
const groupAchievements = [
  {
    name: 'Group Collection I',
    description: 'Your group has collected 50 items',
    type: 'group_item_count',
    threshold: 50,
    points: 15,
    isActive: true,
    createdAt: new Date()
  },
  {
    name: 'Group Collection II',
    description: 'Your group has collected 200 items',
    type: 'group_item_count',
    threshold: 200,
    points: 30,
    isActive: true,
    createdAt: new Date()
  },
  {
    name: 'Group Collection III',
    description: 'Your group has collected 500 items',
    type: 'group_item_count',
    threshold: 500,
    points: 50,
    isActive: true,
    createdAt: new Date()
  },
  {
    name: 'Growing Team I',
    description: 'Your group has 3 members',
    type: 'group_member_count',
    threshold: 3,
    points: 15,
    isActive: true,
    createdAt: new Date()
  },
  {
    name: 'Growing Team II',
    description: 'Your group has 5 members',
    type: 'group_member_count',
    threshold: 5,
    points: 30,
    isActive: true,
    createdAt: new Date()
  },
  {
    name: 'Active Group I',
    description: 'Your group has created 100 total items, locations, labels, and categories',
    type: 'group_activity',
    threshold: 100,
    points: 20,
    isActive: true,
    createdAt: new Date()
  },
  {
    name: 'Active Group II',
    description: 'Your group has created 500 total items, locations, labels, and categories',
    type: 'group_activity',
    threshold: 500,
    points: 40,
    isActive: true,
    createdAt: new Date()
  },
  {
    name: 'Active Group III',
    description: 'Your group has created 1000 total items, locations, labels, and categories',
    type: 'group_activity',
    threshold: 1000,
    points: 60,
    isActive: true,
    createdAt: new Date()
  }
];

async function run() {
  console.log('Starting script...');
  
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

    // Check if group achievements already exist
    const existingGroupAchievements = await achievementsCollection.find({
      type: { $in: ['group_item_count', 'group_member_count', 'group_activity'] }
    }).toArray();
    
    console.log(`Found ${existingGroupAchievements.length} existing group achievements`);
    
    if (existingGroupAchievements.length > 0) {
      console.log('Existing group achievements:');
      existingGroupAchievements.forEach(achievement => {
        console.log(`- ${achievement.name} (${achievement.type}, threshold: ${achievement.threshold})`);
      });
    }

    // Filter out achievements that already exist
    const existingNames = existingGroupAchievements.map(a => a.name);
    const achievementsToInsert = groupAchievements.filter(a => !existingNames.includes(a.name));

    if (achievementsToInsert.length > 0) {
      // Add new group achievements
      const result = await achievementsCollection.insertMany(achievementsToInsert);
      console.log(`${result.insertedCount} new group achievements inserted:`);
      achievementsToInsert.forEach(achievement => {
        console.log(`- ${achievement.name} (${achievement.type}, threshold: ${achievement.threshold})`);
      });
    } else {
      console.log('All group achievements already exist, nothing to insert.');
    }
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await client.close();
    console.log('Disconnected from MongoDB');
  }
}

run().catch(console.error);

const path = require('path');
const { MongoClient } = require('mongodb');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');

// Load environment variables from .env file
dotenv.config({ path: path.resolve(__dirname, '../server/.env') });

// MongoDB connection string
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/boxwise';

// Connect directly to MongoDB using the native driver
console.log(`Connecting to MongoDB at ${MONGO_URI}...`);

let client;
let db;

// Function to connect to MongoDB
const connectToMongoDB = async () => {
  try {
    client = new MongoClient(MONGO_URI, {
      serverSelectionTimeoutMS: 60000,
      socketTimeoutMS: 90000,
      connectTimeoutMS: 60000,
      maxPoolSize: 10
    });
    
    await client.connect();
    console.log('MongoDB connected successfully');
    
    // Ping the database to verify connection
    await client.db().admin().ping();
    console.log('MongoDB connection verified with ping');
    
    // Get the database
    db = client.db();
    
    return db;
  } catch (err) {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  }
};

// Clear existing data
const clearCollections = async () => {
  console.log('Clearing existing collections...');
  
  const collections = [
    'users',
    'groups',
    'items',
    'locations',
    'labels',
    'categories',
    'achievements'
  ];
  
  for (const collectionName of collections) {
    try {
      console.log(`Clearing ${collectionName}...`);
      
      // Check if collection exists before attempting to delete
      const collectionExists = await db.listCollections({ name: collectionName }).hasNext();
      
      if (collectionExists) {
        // Drop the collection instead of using deleteMany
        // This is faster and less prone to timeouts
        await db.collection(collectionName).drop();
        console.log(`${collectionName} dropped successfully`);
      } else {
        console.log(`Collection ${collectionName} does not exist, skipping`);
      }
    } catch (error) {
      console.error(`Error clearing ${collectionName}:`, error.message);
      // Continue with other collections even if one fails
    }
  }
  
  console.log('Collections cleared');
};

// Helper function to get next asset ID
const getNextAssetId = async (groupId) => {
  const group = await db.collection('groups').findOne({ _id: groupId });
  const prefix = group.settings.assetIdPrefix || '';
  const nextId = group.settings.nextAssetId || 1;
  
  // Update the nextAssetId in the group
  await db.collection('groups').updateOne(
    { _id: groupId },
    { $set: { 'settings.nextAssetId': nextId + 1 } }
  );
  
  return `${prefix}${nextId}`;
};

// Create demo data
const createDemoData = async () => {
  console.log('Creating demo data...');
  
  // Generate ObjectIds for references
  const { ObjectId } = require('mongodb');
  const demoGroupId = new ObjectId();
  const ownerUserId = new ObjectId();
  const adminUserId = new ObjectId();
  const regularUserId = new ObjectId();
  
  // Create achievements
  const achievementsData = [
    {
      name: 'First Item',
      description: 'Added your first item to inventory',
      points: 10,
      icon: 'inventory',
      type: 'item_count',
      threshold: 1
    },
    {
      name: 'Organized',
      description: 'Created 5 locations',
      points: 20,
      icon: 'location_on',
      type: 'location_count',
      threshold: 5
    },
    {
      name: 'Categorized',
      description: 'Used 3 different categories',
      points: 15,
      icon: 'category',
      type: 'custom',
      threshold: 3
    },
    {
      name: 'Labeled',
      description: 'Created 3 custom labels',
      points: 15,
      icon: 'label',
      type: 'label_count',
      threshold: 3
    },
    {
      name: 'Inventory Master',
      description: 'Added 50 items to inventory',
      points: 50,
      icon: 'star',
      type: 'item_count',
      threshold: 50
    }
  ];
  
  try {
    const achievementsResult = await db.collection('achievements').insertMany(achievementsData);
    console.log(`${achievementsResult.insertedCount} achievements created`);
  } catch (error) {
    console.error('Error creating achievements:', error.message);
  }
  
  // Create demo group
  const demoGroupData = {
    _id: demoGroupId,
    name: 'Demo Group',
    description: 'A demo group for testing',
    subscription: {
      plan: 'pro',
      maxMembers: 10
    },
    settings: {
      assetIdPrefix: '000-',
      autoIncrementAssetId: true,
      nextAssetId: 1
    },
    members: []
  };
  
  try {
    await db.collection('groups').insertOne(demoGroupData);
    console.log('Demo group created');
  } catch (error) {
    console.error('Error creating demo group:', error.message);
  }
  
  // Create users with different roles
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash('password123', salt);
  
  // Create owner user
  const ownerUserData = {
    _id: ownerUserId,
    name: 'Demo Owner',
    email: 'owner@example.com',
    password: hashedPassword,
    group: demoGroupId,
    role: 'owner',
    subscription: {
      plan: 'family',
      status: 'active',
      startDate: new Date(),
      endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) // 1 year from now
    },
    preferences: {
      theme: 'light',
      notifications: true
    },
    achievements: [
      {
        name: 'First Item',
        description: 'Added your first item to inventory',
        dateEarned: new Date()
      }
    ]
  };
  
  try {
    await db.collection('users').insertOne(ownerUserData);
    console.log('Owner user created');
  } catch (error) {
    console.error('Error creating owner user:', error.message);
  }
  
  // Create admin user
  const adminUserData = {
    _id: adminUserId,
    name: 'Demo Admin',
    email: 'admin@example.com',
    password: hashedPassword,
    group: demoGroupId,
    role: 'admin',
    subscription: {
      plan: 'family',
      status: 'active',
      startDate: new Date(),
      endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
    },
    preferences: {
      theme: 'dark',
      notifications: true
    }
  };
  
  try {
    await db.collection('users').insertOne(adminUserData);
    console.log('Admin user created');
  } catch (error) {
    console.error('Error creating admin user:', error.message);
  }
  
  // Create regular user
  const regularUserData = {
    _id: regularUserId,
    name: 'Demo User',
    email: 'user@example.com',
    password: hashedPassword,
    group: demoGroupId,
    role: 'user',
    subscription: {
      plan: 'family',
      status: 'active',
      startDate: new Date(),
      endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
    },
    preferences: {
      theme: 'light',
      notifications: false
    }
  };
  
  try {
    await db.collection('users').insertOne(regularUserData);
    console.log('Regular user created');
  } catch (error) {
    console.error('Error creating regular user:', error.message);
  }
  
  // Update group with owner and members
  try {
    await db.collection('groups').updateOne(
      { _id: demoGroupId },
      {
        $set: { owner: ownerUserId },
        $push: {
          members: {
            $each: [
              {
                user: ownerUserId,
                role: 'admin',
                joinedAt: new Date()
              },
              {
                user: adminUserId,
                role: 'admin',
                joinedAt: new Date()
              },
              {
                user: regularUserId,
                role: 'user',
                joinedAt: new Date()
              }
            ]
          }
        }
      }
    );
    console.log('Demo group updated with owner and members');
  } catch (error) {
    console.error('Error updating demo group:', error.message);
  }
  
  // Create categories
  const categoriesData = [
    {
      _id: new ObjectId(),
      name: 'Electronics',
      description: 'Electronic devices and accessories',
      group: demoGroupId,
      createdBy: ownerUserId
    },
    {
      _id: new ObjectId(),
      name: 'Clothing',
      description: 'Clothes, shoes, and accessories',
      group: demoGroupId,
      createdBy: ownerUserId
    },
    {
      _id: new ObjectId(),
      name: 'Furniture',
      description: 'Home and office furniture',
      group: demoGroupId,
      createdBy: ownerUserId
    },
    {
      _id: new ObjectId(),
      name: 'Kitchen',
      description: 'Kitchen appliances and utensils',
      group: demoGroupId,
      createdBy: ownerUserId
    },
    {
      _id: new ObjectId(),
      name: 'Tools',
      description: 'Hand and power tools',
      group: demoGroupId,
      createdBy: ownerUserId
    }
  ];
  
  try {
    const categoriesResult = await db.collection('categories').insertMany(categoriesData);
    console.log(`${categoriesResult.insertedCount} categories created`);
  } catch (error) {
    console.error('Error creating categories:', error.message);
  }
  
  // Create labels
  const labelsData = [
    {
      _id: new ObjectId(),
      name: 'Important',
      description: 'Important items',
      color: '#E53E3E',
      group: demoGroupId,
      createdBy: ownerUserId
    },
    {
      _id: new ObjectId(),
      name: 'Fragile',
      description: 'Handle with care',
      color: '#DD6B20',
      group: demoGroupId,
      createdBy: ownerUserId
    },
    {
      _id: new ObjectId(),
      name: 'Seasonal',
      description: 'Used during specific seasons',
      color: '#3182CE',
      group: demoGroupId,
      createdBy: ownerUserId
    },
    {
      _id: new ObjectId(),
      name: 'Valuable',
      description: 'High-value items',
      color: '#D69E2E',
      group: demoGroupId,
      createdBy: ownerUserId
    }
  ];
  
  try {
    const labelsResult = await db.collection('labels').insertMany(labelsData);
    console.log(`${labelsResult.insertedCount} labels created`);
  } catch (error) {
    console.error('Error creating labels:', error.message);
  }
  
  // Create locations
  const homeLocationId = new ObjectId();
  const homeLocationData = {
    _id: homeLocationId,
    name: 'Home',
    description: 'Main home location',
    group: demoGroupId,
    createdBy: ownerUserId
  };
  
  try {
    await db.collection('locations').insertOne(homeLocationData);
    console.log('Home location created');
  } catch (error) {
    console.error('Error creating home location:', error.message);
  }
  
  const locationsData = [
    {
      _id: new ObjectId(),
      name: 'Living Room',
      description: 'Living room area',
      parent: homeLocationId,
      group: demoGroupId,
      createdBy: ownerUserId
    },
    {
      _id: new ObjectId(),
      name: 'Kitchen',
      description: 'Kitchen area',
      parent: homeLocationId,
      group: demoGroupId,
      createdBy: ownerUserId
    },
    {
      _id: new ObjectId(),
      name: 'Bedroom',
      description: 'Main bedroom',
      parent: homeLocationId,
      group: demoGroupId,
      createdBy: ownerUserId
    },
    {
      _id: new ObjectId(),
      name: 'Garage',
      description: 'Garage storage',
      group: demoGroupId,
      createdBy: ownerUserId
    },
    {
      _id: new ObjectId(),
      name: 'Office',
      description: 'Home office',
      group: demoGroupId,
      createdBy: ownerUserId
    }
  ];
  
  try {
    const locationsResult = await db.collection('locations').insertMany(locationsData);
    console.log(`${locationsResult.insertedCount} additional locations created`);
  } catch (error) {
    console.error('Error creating locations:', error.message);
  }
  
  // Create items
  console.log('Creating demo items...');
  
  // Get category IDs for reference
  const categories = await db.collection('categories').find({ group: demoGroupId }).toArray();
  const categoryMap = categories.reduce((map, category) => {
    map[category.name] = category._id;
    return map;
  }, {});
  
  // Get label IDs for reference
  const labels = await db.collection('labels').find({ group: demoGroupId }).toArray();
  const labelMap = labels.reduce((map, label) => {
    map[label.name] = label._id;
    return map;
  }, {});
  
  // Get location IDs for reference
  const locations = await db.collection('locations').find({ group: demoGroupId }).toArray();
  const locationMap = locations.reduce((map, location) => {
    map[location.name] = location._id;
    return map;
  }, {});
  
  // Create items with different properties
  const itemsData = [
    // Electronics category items
    {
      name: 'MacBook Pro',
      description: 'Apple MacBook Pro 16-inch, 2023 model',
      group: demoGroupId,
      location: locationMap['Office'],
      category: categoryMap['Electronics'],
      labels: [labelMap['Important'], labelMap['Valuable']],
      quantity: 1,
      serialNumber: 'FVFXC123456789',
      modelNumber: 'A2141',
      manufacturer: 'Apple',
      notes: 'Work laptop, keep charged',
      isInsured: true,
      purchaseDetails: {
        purchasedFrom: 'Apple Store',
        purchasePrice: 2499.99,
        purchaseDate: new Date('2023-06-15')
      },
      warrantyDetails: {
        hasLifetimeWarranty: false,
        warrantyExpires: new Date('2025-06-15'),
        warrantyNotes: 'AppleCare+ coverage'
      },
      customFields: [
        {
          name: 'RAM',
          type: 'text',
          value: '32GB'
        },
        {
          name: 'Storage',
          type: 'text',
          value: '1TB SSD'
        }
      ],
      upcCode: '123456789012',
      createdBy: ownerUserId,
      createdAt: new Date('2023-06-16')
    },
    {
      name: 'Sony WH-1000XM4 Headphones',
      description: 'Wireless noise-cancelling headphones',
      group: demoGroupId,
      location: locationMap['Living Room'],
      category: categoryMap['Electronics'],
      labels: [labelMap['Fragile']],
      quantity: 1,
      serialNumber: 'SNY45678901',
      modelNumber: 'WH-1000XM4',
      manufacturer: 'Sony',
      isInsured: false,
      purchaseDetails: {
        purchasedFrom: 'Amazon',
        purchasePrice: 349.99,
        purchaseDate: new Date('2023-08-10')
      },
      warrantyDetails: {
        hasLifetimeWarranty: false,
        warrantyExpires: new Date('2024-08-10')
      },
      createdBy: ownerUserId,
      createdAt: new Date('2023-08-11')
    },
    
    // Furniture category items
    {
      name: 'Standing Desk',
      description: 'Adjustable height standing desk',
      group: demoGroupId,
      location: locationMap['Office'],
      category: categoryMap['Furniture'],
      quantity: 1,
      modelNumber: 'SD-200',
      manufacturer: 'Uplift',
      notes: 'Electric height adjustment, bamboo top',
      purchaseDetails: {
        purchasedFrom: 'Uplift Desk',
        purchasePrice: 699.99,
        purchaseDate: new Date('2022-11-20')
      },
      warrantyDetails: {
        hasLifetimeWarranty: false,
        warrantyExpires: new Date('2032-11-20'),
        warrantyNotes: '10-year warranty on frame'
      },
      customFields: [
        {
          name: 'Dimensions',
          type: 'text',
          value: '60" x 30"'
        }
      ],
      createdBy: ownerUserId,
      createdAt: new Date('2022-11-25')
    },
    
    // Kitchen category items
    {
      name: 'KitchenAid Mixer',
      description: 'Professional 5 Plus Series 5 Quart Bowl-Lift Stand Mixer',
      group: demoGroupId,
      location: locationMap['Kitchen'],
      category: categoryMap['Kitchen'],
      labels: [labelMap['Valuable']],
      quantity: 1,
      serialNumber: 'KSM123456',
      modelNumber: 'KV25G0X',
      manufacturer: 'KitchenAid',
      purchaseDetails: {
        purchasedFrom: 'Williams Sonoma',
        purchasePrice: 449.99,
        purchaseDate: new Date('2021-12-10')
      },
      warrantyDetails: {
        hasLifetimeWarranty: false,
        warrantyExpires: new Date('2022-12-10'),
        warrantyNotes: 'Extended warranty available'
      },
      createdBy: adminUserId,
      createdAt: new Date('2021-12-15')
    },
    
    // Tools category items
    {
      name: 'Cordless Drill Set',
      description: 'DeWalt 20V MAX Cordless Drill Combo Kit',
      group: demoGroupId,
      location: locationMap['Garage'],
      category: categoryMap['Tools'],
      labels: [labelMap['Important']],
      quantity: 1,
      modelNumber: 'DCK240C2',
      manufacturer: 'DeWalt',
      notes: 'Includes drill, impact driver, two batteries, charger, and case',
      purchaseDetails: {
        purchasedFrom: 'Home Depot',
        purchasePrice: 199.99,
        purchaseDate: new Date('2023-03-15')
      },
      warrantyDetails: {
        hasLifetimeWarranty: false,
        warrantyExpires: new Date('2026-03-15'),
        warrantyNotes: '3-year manufacturer warranty'
      },
      createdBy: regularUserId,
      createdAt: new Date('2023-03-16')
    },
    
    // Clothing category items
    {
      name: 'Winter Coat Collection',
      description: 'Collection of winter coats and jackets',
      group: demoGroupId,
      location: locationMap['Bedroom'],
      category: categoryMap['Clothing'],
      labels: [labelMap['Seasonal']],
      quantity: 5,
      notes: 'Stored in vacuum bags during summer',
      createdBy: adminUserId,
      createdAt: new Date('2023-09-20')
    },
    
    // Archived item
    {
      name: 'Old Television',
      description: '42" LCD TV, no longer working',
      group: demoGroupId,
      location: locationMap['Garage'],
      category: categoryMap['Electronics'],
      quantity: 1,
      manufacturer: 'Samsung',
      notes: 'Power issue, kept for parts',
      isArchived: true,
      purchaseDetails: {
        purchasedFrom: 'Best Buy',
        purchasePrice: 499.99,
        purchaseDate: new Date('2015-01-10')
      },
      createdBy: ownerUserId,
      createdAt: new Date('2015-01-15')
    },
    
    // Sold item
    {
      name: 'Mountain Bike',
      description: 'Trek Marlin 7 Mountain Bike',
      group: demoGroupId,
      location: locationMap['Garage'],
      category: categoryMap['Sports'],
      quantity: 1,
      serialNumber: 'TK789012345',
      manufacturer: 'Trek',
      notes: 'Sold due to upgrade',
      purchaseDetails: {
        purchasedFrom: 'Trek Store',
        purchasePrice: 899.99,
        purchaseDate: new Date('2020-05-20')
      },
      soldDetails: {
        soldTo: 'John Smith',
        soldPrice: 600.00,
        soldDate: new Date('2023-04-15')
      },
      createdBy: ownerUserId,
      createdAt: new Date('2020-05-25')
    }
  ];
  
  // Add assetIds to items
  for (const item of itemsData) {
    if (!item.assetId) {
      item.assetId = await getNextAssetId(demoGroupId);
    }
  }
  
  try {
    const itemsResult = await db.collection('items').insertMany(itemsData);
    console.log(`${itemsResult.insertedCount} items created`);
  } catch (error) {
    console.error('Error creating items:', error.message);
  }
  
  console.log('Demo data creation completed');
};

// Main function
const initDb = async () => {
  try {
    // Connect to MongoDB
    await connectToMongoDB();
    
    // Clear existing data
    await clearCollections();
    
    // Create demo data
    await createDemoData();
    
    // Close the connection
    if (client) {
      await client.close();
    }
    
    console.log('Database initialization completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('Error initializing database:', error);
    
    // Close the connection
    if (client) {
      await client.close();
    }
    
    process.exit(1);
  }
};

// Run the initialization
initDb();

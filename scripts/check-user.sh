#!/bin/bash

# Boxwise Check User Script
# This script checks if a user exists in the MongoDB database and verifies its details

# ANSI color codes
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Get the script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
cd "$SCRIPT_DIR"

# Default values
EMAIL="terry@jknelotions.com"
MONGO_URI="mongodb://localhost:27017/boxwise"

# Display help
function show_help {
    echo "Boxwise Check User Script"
    echo "Usage: $0 [options]"
    echo ""
    echo "Options:"
    echo "  -e, --email EMAIL         Email of the user to check (default: $EMAIL)"
    echo "  -u, --uri URI             MongoDB URI (default: $MONGO_URI)"
    echo "  -h, --help                Show this help message"
    echo ""
    echo "Example:"
    echo "  $0 -e admin@example.com"
    exit 1
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case "$1" in
        -e|--email)
            EMAIL="$2"
            shift 2
            ;;
        -u|--uri)
            MONGO_URI="$2"
            shift 2
            ;;
        -h|--help)
            show_help
            ;;
        *)
            echo "Unknown option: $1"
            show_help
            ;;
    esac
done

echo -e "${BLUE}=== Boxwise User Check ===${NC}"
echo -e "Email: ${GREEN}$EMAIL${NC}"
echo -e "MongoDB URI: ${GREEN}$MONGO_URI${NC}"
echo ""

# Create a temporary directory for the script
TEMP_DIR=$(mktemp -d)
echo -e "${BLUE}Creating temporary directory for script: $TEMP_DIR${NC}"

# Create a script to check the user
cat > "$TEMP_DIR/check-user.js" << EOF
const mongoose = require('mongoose');

// MongoDB connection
const MONGO_URI = '$MONGO_URI';

// Connect to MongoDB
mongoose.connect(MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(async () => {
  console.log('Connected to MongoDB');
  
  // Define schemas (simplified versions of the actual models)
  const UserSchema = new mongoose.Schema({
    name: String,
    email: String,
    password: String,
    group: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Group'
    },
    role: String,
    createdAt: Date
  });

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
    }]
  });
  
  // Create models
  const User = mongoose.model('User', UserSchema);
  const Group = mongoose.model('Group', GroupSchema);
  
  // Find the user
  const user = await User.findOne({ email: '$EMAIL' });
  
  if (!user) {
    console.log('\\n${RED}User not found${NC}');
    console.log('\\nNo user with email $EMAIL exists in the database.');
    
    // List all users
    console.log('\\nExisting users in the database:');
    const users = await User.find({}, 'name email role');
    if (users.length === 0) {
      console.log('No users found in the database');
    } else {
      users.forEach(user => {
        console.log(\`- \${user.name} (\${user.email}) - Role: \${user.role}\`);
      });
    }
  } else {
    console.log('\\n${GREEN}User found${NC}');
    console.log(\`\\nUser details for \${user.email}:\`);
    console.log(\`- Name: \${user.name}\`);
    console.log(\`- Role: \${user.role}\`);
    console.log(\`- Password hash length: \${user.password ? user.password.length : 'No password'}\`);
    console.log(\`- Created at: \${user.createdAt}\`);
    
    // Find the user's group
    if (user.group) {
      const group = await Group.findById(user.group);
      if (group) {
        console.log(\`\\nGroup details:\`);
        console.log(\`- Name: \${group.name}\`);
        console.log(\`- Description: \${group.description}\`);
        
        // Check if user is the owner of the group
        if (group.owner && group.owner.toString() === user._id.toString()) {
          console.log(\`- User is the owner of this group\`);
        } else {
          console.log(\`- User is NOT the owner of this group\`);
        }
        
        // Check if user is a member of the group
        const isMember = group.members.some(member => 
          member.user && member.user.toString() === user._id.toString()
        );
        
        if (isMember) {
          const member = group.members.find(m => 
            m.user && m.user.toString() === user._id.toString()
          );
          console.log(\`- User is a member of this group with role: \${member.role}\`);
          console.log(\`- Joined at: \${member.joinedAt}\`);
        } else {
          console.log(\`- User is NOT a member of this group\`);
        }
      } else {
        console.log(\`\\nGroup not found (ID: \${user.group})\`);
      }
    } else {
      console.log(\`\\nUser is not associated with any group\`);
    }
    
    console.log('\\n${YELLOW}Login Troubleshooting${NC}');
    console.log('If you cannot log in with this user, try these steps:');
    console.log('1. Verify the application is using the same MongoDB database');
    console.log('2. Check if the application is running in production mode');
    console.log('3. Try restarting the application: ./restart-production.sh');
    console.log('4. Create a new user with a simple password: ./create-owner-production.sh -p "Password123"');
    console.log('5. Check the application logs for authentication errors: pm2 logs boxwise');
  }
  
  // Close the connection
  mongoose.connection.close();
  console.log('\\nDisconnected from MongoDB');
})
.catch(err => {
  console.error('MongoDB connection error:', err);
  process.exit(1);
});
EOF

# Create a package.json file in the temporary directory
cat > "$TEMP_DIR/package.json" << EOF
{
  "name": "boxwise-check-user",
  "version": "1.0.0",
  "description": "Script to check if a user exists in the MongoDB database",
  "main": "check-user.js",
  "dependencies": {
    "mongoose": "^7.0.3"
  }
}
EOF

# Change to the temporary directory
cd "$TEMP_DIR"

# Install dependencies
echo -e "${BLUE}Installing dependencies...${NC}"
npm install --quiet
if [ $? -ne 0 ]; then
    echo -e "${RED}Failed to install dependencies. Please check npm error messages above.${NC}"
    cd "$SCRIPT_DIR"
    rm -rf "$TEMP_DIR"
    exit 1
fi
echo -e "${GREEN}Dependencies installed successfully${NC}"

# Run the script
echo -e "${BLUE}Checking user in database...${NC}"
node check-user.js

# Clean up
cd "$SCRIPT_DIR"
echo -e "${BLUE}Cleaning up temporary directory...${NC}"
rm -rf "$TEMP_DIR"

echo ""
echo -e "${BLUE}=== User Check Completed ===${NC}"

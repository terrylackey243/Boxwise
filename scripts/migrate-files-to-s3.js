/**
 * S3 Migration Script
 * This script migrates existing item attachments from local filesystem to S3
 * 
 * Usage:
 * 1. Set up AWS credentials in environment variables or .env file
 * 2. Run with: node migrate-files-to-s3.js
 */

require('dotenv').config({ path: '../server/.env' });
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const AWS = require('aws-sdk');
const crypto = require('crypto');

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

// Import Item model
const Item = require('../server/src/models/Item');

// Configure AWS SDK
AWS.config.update({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION
});

// Create S3 service object
const s3 = new AWS.S3();

// Path to uploads directory
const UPLOADS_DIR = path.join(__dirname, '../server/uploads');

// Statistics tracking
const stats = {
  totalItems: 0,
  itemsWithAttachments: 0,
  totalAttachments: 0,
  successfulUploads: 0,
  failedUploads: 0,
  missingFiles: 0
};

// Check if S3 bucket exists, create if it doesn't
async function ensureBucketExists() {
  try {
    await s3.headBucket({ Bucket: process.env.AWS_BUCKET_NAME }).promise();
    console.log(`Bucket ${process.env.AWS_BUCKET_NAME} exists`);
  } catch (error) {
    if (error.code === 'NotFound' || error.code === 'NoSuchBucket') {
      console.log(`Creating bucket ${process.env.AWS_BUCKET_NAME}...`);
      await s3.createBucket({ 
        Bucket: process.env.AWS_BUCKET_NAME,
        ACL: 'private'
      }).promise();
      
      // Configure CORS for the bucket
      await s3.putBucketCors({
        Bucket: process.env.AWS_BUCKET_NAME,
        CORSConfiguration: {
          CORSRules: [
            {
              AllowedHeaders: ['*'],
              AllowedMethods: ['GET', 'PUT', 'POST', 'DELETE', 'HEAD'],
              AllowedOrigins: ['*'],
              ExposeHeaders: ['ETag'],
              MaxAgeSeconds: 3000
            }
          ]
        }
      }).promise();
      
      console.log('Bucket created and CORS configured');
    } else {
      throw error;
    }
  }
}

// Upload a file to S3
async function uploadFileToS3(localFilePath, fileName, groupId) {
  try {
    // Generate a unique file key
    const uniqueId = crypto.randomBytes(8).toString('hex');
    const fileExtension = path.extname(fileName);
    const sanitizedFileName = path.basename(fileName, fileExtension)
      .replace(/[^a-zA-Z0-9]/g, '-')
      .toLowerCase();
    
    // Create a structured key that organizes files by group
    const fileKey = `${groupId}/item-attachments/${sanitizedFileName}-${uniqueId}${fileExtension}`;
    
    // Read the file
    const fileContent = fs.readFileSync(localFilePath);
    
    // Get file MIME type based on extension
    const fileType = getFileMimeType(fileExtension);
    
    // Upload to S3
    await s3.putObject({
      Bucket: process.env.AWS_BUCKET_NAME,
      Key: fileKey,
      Body: fileContent,
      ContentType: fileType,
      ACL: 'private'
    }).promise();
    
    return fileKey;
  } catch (error) {
    console.error(`Error uploading file ${localFilePath}:`, error);
    throw error;
  }
}

// Helper to determine MIME type from extension
function getFileMimeType(extension) {
  const mimeTypes = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.pdf': 'application/pdf',
    '.doc': 'application/msword',
    '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    '.xls': 'application/vnd.ms-excel',
    '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    '.txt': 'text/plain'
  };
  
  return mimeTypes[extension.toLowerCase()] || 'application/octet-stream';
}

// Main migration function
async function migrateFilesToS3() {
  try {
    console.log('Starting migration of files to S3...');
    
    // Ensure bucket exists
    await ensureBucketExists();
    
    // Get all items with attachments
    const items = await Item.find({ 'attachments.0': { $exists: true } });
    
    stats.totalItems = await Item.countDocuments();
    stats.itemsWithAttachments = items.length;
    
    console.log(`Found ${items.length} items with attachments out of ${stats.totalItems} total items`);
    
    // Process each item
    for (const item of items) {
      console.log(`Processing item: ${item._id} (${item.name})`);
      
      // Track if we need to update this item
      let itemUpdated = false;
      
      // Process each attachment
      for (let i = 0; i < item.attachments.length; i++) {
        const attachment = item.attachments[i];
        stats.totalAttachments++;
        
        // Check if this attachment is already migrated (starts with the group ID)
        if (attachment.filePath.startsWith(item.group.toString())) {
          console.log(`  Attachment ${attachment._id} already migrated`);
          continue;
        }
        
        // Build the local file path
        const localFilePath = path.join(UPLOADS_DIR, attachment.filePath);
        
        // Check if file exists locally
        if (!fs.existsSync(localFilePath)) {
          console.log(`  ERROR: File not found: ${localFilePath}`);
          stats.missingFiles++;
          continue;
        }
        
        try {
          // Upload file to S3
          console.log(`  Uploading ${attachment.name}...`);
          const fileKey = await uploadFileToS3(localFilePath, attachment.name, item.group.toString());
          
          // Update attachment record
          item.attachments[i].filePath = fileKey;
          itemUpdated = true;
          stats.successfulUploads++;
          
          console.log(`  Uploaded successfully. New path: ${fileKey}`);
        } catch (error) {
          console.error(`  Failed to upload ${attachment.name}:`, error);
          stats.failedUploads++;
        }
      }
      
      // Save the item if any attachments were updated
      if (itemUpdated) {
        await item.save();
        console.log(`  Updated item ${item._id} in database`);
      }
    }
    
    // Print summary
    console.log('\nMigration Summary:');
    console.log('------------------');
    console.log(`Total items: ${stats.totalItems}`);
    console.log(`Items with attachments: ${stats.itemsWithAttachments}`);
    console.log(`Total attachments: ${stats.totalAttachments}`);
    console.log(`Successfully uploaded: ${stats.successfulUploads}`);
    console.log(`Failed uploads: ${stats.failedUploads}`);
    console.log(`Missing files: ${stats.missingFiles}`);
    
    if (stats.failedUploads === 0 && stats.missingFiles === 0) {
      console.log('\nMigration completed successfully!');
    } else {
      console.log('\nMigration completed with issues. See logs above.');
    }
    
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    // Close MongoDB connection
    mongoose.connection.close();
  }
}

// Run migration
migrateFilesToS3();

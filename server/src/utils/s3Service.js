const AWS = require('aws-sdk');
const path = require('path');
const crypto = require('crypto');

// Configure AWS SDK
AWS.config.update({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION
});

// Create S3 service object
const s3 = new AWS.S3();

/**
 * Generate a presigned URL for uploading a file directly to S3
 * 
 * @param {string} fileName - The name of the file to be uploaded
 * @param {string} fileType - The MIME type of the file
 * @param {string} folder - The subfolder in the bucket to store the file in
 * @param {string} groupId - The group ID to use in the file path
 * @returns {object} - Object containing the uploadUrl and fileKey
 */
const generatePresignedUploadUrl = async (fileName, fileType, folder, groupId) => {
  // Generate a unique file name to prevent collisions
  const uniqueId = crypto.randomBytes(8).toString('hex');
  const fileExtension = path.extname(fileName);
  const sanitizedFileName = path.basename(fileName, fileExtension)
    .replace(/[^a-zA-Z0-9]/g, '-') // Replace non-alphanumeric chars with hyphens
    .toLowerCase();
  
  // Create a structured key that organizes files by group and type
  const fileKey = `${groupId}/${folder}/${sanitizedFileName}-${uniqueId}${fileExtension}`;
  
  const params = {
    Bucket: process.env.AWS_BUCKET_NAME,
    Key: fileKey,
    ContentType: fileType,
    Expires: 3600, // URL expires in 1 hour
    ACL: 'private' // Keep file private, we'll generate signed URLs for access
  };
  
  try {
    const uploadUrl = await s3.getSignedUrlPromise('putObject', params);
    return {
      uploadUrl,
      fileKey
    };
  } catch (error) {
    console.error('Error generating presigned URL:', error);
    throw error;
  }
};

/**
 * Generate a presigned URL for viewing/downloading a file from S3
 * 
 * @param {string} fileKey - The S3 key of the file
 * @param {number} expiresIn - URL expiration time in seconds (default: 1 hour)
 * @returns {string} - Presigned URL for accessing the file
 */
const generatePresignedDownloadUrl = async (fileKey, expiresIn = 3600) => {
  const params = {
    Bucket: process.env.AWS_BUCKET_NAME,
    Key: fileKey,
    Expires: expiresIn
  };
  
  try {
    return await s3.getSignedUrlPromise('getObject', params);
  } catch (error) {
    console.error('Error generating download URL:', error);
    throw error;
  }
};

/**
 * Delete a file from S3
 * 
 * @param {string} fileKey - The S3 key of the file to delete
 * @returns {object} - S3 deletion result
 */
const deleteFile = async (fileKey) => {
  const params = {
    Bucket: process.env.AWS_BUCKET_NAME,
    Key: fileKey
  };
  
  try {
    return await s3.deleteObject(params).promise();
  } catch (error) {
    console.error('Error deleting file from S3:', error);
    throw error;
  }
};

/**
 * Check if a file exists in S3
 * 
 * @param {string} fileKey - The S3 key of the file
 * @returns {boolean} - True if file exists, false otherwise
 * @note This uses headObject API which authorizes against the s3:GetObject permission
 */
const fileExists = async (fileKey) => {
  const params = {
    Bucket: process.env.AWS_BUCKET_NAME,
    Key: fileKey
  };
  
  try {
    await s3.headObject(params).promise();
    return true;
  } catch (error) {
    if (error.code === 'NotFound') {
      return false;
    }
    throw error;
  }
};

/**
 * Create a new bucket (for initialization)
 * 
 * @param {string} bucketName - The name of the bucket to create
 * @returns {object} - S3 creation result
 */
const createBucket = async (bucketName) => {
  const params = {
    Bucket: bucketName,
    ACL: 'private'
  };
  
  try {
    return await s3.createBucket(params).promise();
  } catch (error) {
    console.error('Error creating bucket:', error);
    throw error;
  }
};

/**
 * Configure CORS for a bucket
 * 
 * @param {string} bucketName - The name of the bucket to configure
 * @param {array} allowedOrigins - List of allowed origins
 * @returns {object} - S3 CORS configuration result
 */
const configureBucketCors = async (bucketName, allowedOrigins = ['*']) => {
  const params = {
    Bucket: bucketName,
    CORSConfiguration: {
      CORSRules: [
        {
          AllowedHeaders: ['*'],
          AllowedMethods: ['GET', 'PUT', 'POST', 'DELETE', 'HEAD'],
          AllowedOrigins: allowedOrigins,
          ExposeHeaders: ['ETag', 'x-amz-server-side-encryption'],
          MaxAgeSeconds: 3000
        }
      ]
    }
  };
  
  try {
    return await s3.putBucketCors(params).promise();
  } catch (error) {
    console.error('Error configuring bucket CORS:', error);
    throw error;
  }
};

module.exports = {
  generatePresignedUploadUrl,
  generatePresignedDownloadUrl,
  deleteFile,
  fileExists,
  createBucket,
  configureBucketCors
};

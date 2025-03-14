# Cloud Storage Strategy for Boxwise SaaS

## Current Situation

Currently, Boxwise stores uploaded files in a directory called `uploads` under the server directory. While this works for a single-instance application, it's not optimal for a SaaS deployment for several reasons:

- **Storage limitations**: Server disk space is finite and managing growth is difficult
- **Backup complexity**: Backing up large amounts of user media alongside application code becomes unwieldy
- **Performance issues**: Serving media files directly from the application server can impact performance
- **Multi-server deployments**: When scaling to multiple servers, file access becomes inconsistent

## Recommended Solutions

### 1. Cloud Object Storage (Recommended)

- **Amazon S3**: Industry standard for object storage
- **Google Cloud Storage**: Similar to S3 with good performance
- **Azure Blob Storage**: Microsoft's equivalent offering
- **Cloudflare R2**: Compatible with S3 API but with reduced egress costs

Benefits:
- Virtually unlimited storage
- Pay only for what you use
- Built-in CDN integration options
- High durability and availability
- Automatic scaling

### 2. Dedicated Storage Services

- **Cloudinary**: Specialized in media (images/videos) with transformation capabilities
- **Uploadcare**: Handles uploads, storage, and delivery with easy integration
- **ImageKit**: Focused on image optimization and delivery

Benefits:
- Purpose-built for media
- Built-in image/video processing
- Optimization features
- Simplified integration

### 3. Database Storage (for smaller files only)

- **MongoDB GridFS**: For storing larger files within MongoDB
- **PostgreSQL with Large Objects**: If you're using PostgreSQL

## Implementation Approach

For Boxwise as a SaaS application, implementing a cloud storage solution like AWS S3 is recommended. Here's how the architecture would work:

1. **Browser-based uploads**: 
   - Users still upload through the Boxwise interface
   - Behind the scenes, files go directly to cloud storage without passing through your server
   - This is achieved using pre-signed URLs

2. **Implementation flow**:
   - User selects a file in the Boxwise interface
   - Boxwise frontend requests a pre-signed URL from the Boxwise server
   - Server generates this temporary URL with permission to upload to S3
   - Frontend JavaScript then uploads the file directly to S3 using this pre-signed URL
   - Once complete, frontend notifies the server about the successful upload
   - Server stores the file reference in the database

3. **Benefits of this approach**:
   - Reduces load on your application server
   - Allows for larger file uploads without timeout issues
   - Enables resumable uploads for better user experience
   - Can show upload progress more reliably

## Prerequisites for Implementation

Before implementing the S3 integration, complete these prerequisite steps:

### 1. Set Up Cloud Storage Account
- Create an AWS account if you don't already have one
- Set up an S3 bucket specifically for your application
- Configure the appropriate region (choose one close to your users for better performance)
- Set up proper CORS configuration on the bucket to allow uploads from your application domains

### 2. Security Setup
- Create an IAM user with limited permissions (only what's needed for S3 operations)
- Generate access keys for this user
- Consider setting up a bucket policy that restricts access appropriately
- Plan your file organization strategy (folders/prefixes by tenant, user, etc.)

### 3. Environment Configuration
- Add environment variables to store AWS credentials securely
- Update your `.env` files and deployment configurations
- Never commit AWS credentials to your repository

### 4. Planning
- Decide on file size limits
- Plan how to handle file naming to avoid collisions (using UUIDs or other unique identifiers)
- Determine how to store file metadata in your database (references to S3 objects)
- Consider how to handle file access permissions in your application

### 5. Migration Strategy
- Develop a plan for migrating existing files from your server to S3
- Decide if you'll migrate all at once or gradually
- Consider how to handle in-flight uploads during the transition

### 6. Testing Environment
- Set up a separate test bucket for development
- Create test cases for various file types and sizes
- Plan for error handling and edge cases

### 7. Cost Estimation
- Estimate storage and bandwidth costs based on your expected usage
- Consider setting up budget alerts in AWS to monitor costs

### 8. Backup Strategy
- Decide if you need additional backup beyond S3's durability
- Consider versioning settings on your S3 bucket
- Plan for disaster recovery scenarios

## Implementation Steps

Once prerequisites are complete, the implementation would involve:

1. **Server-side changes**:
   - Add AWS SDK to your Node.js server
   - Create endpoints for generating pre-signed URLs
   - Update your data models to store file references (S3 URLs) instead of local paths

2. **Frontend changes**:
   - Update upload components to use the new flow (request signed URL, then upload directly)
   - Add progress indicators and error handling
   - Update file display/download to use the new S3 URLs

3. **Migration**:
   - Write a script to migrate existing files to S3
   - Update database references to point to new S3 locations

## Temporary Measures Implemented

As a precautionary step to prevent accumulation of files in the server's local storage while the cloud storage solution is being implemented, the following changes have been temporarily made:

1. **Disabled file uploads**: The `uploadItemAttachment` endpoint now returns a 503 Service Unavailable response with a message explaining that uploads are temporarily disabled.

2. **Disabled file deletions**: The `deleteItemAttachment` endpoint similarly returns a 503 error to prevent inconsistent states during the transition.

3. **Existing files**: All existing files remain viewable but cannot be modified until the cloud storage implementation is complete.

These temporary measures prevent the system from storing additional files locally while maintaining the functionality of viewing existing attachments, ensuring a smoother transition to the cloud storage solution.

## Additional Considerations

- **Access control**: Implement fine-grained permissions to ensure users only access files they should
- **Caching strategy**: Consider using a CDN for frequently accessed files
- **Lifecycle policies**: Set up rules to move older files to cheaper storage tiers
- **Image processing**: Consider server-side or on-the-fly image resizing/optimization

## Resources

- [AWS S3 Documentation](https://docs.aws.amazon.com/s3/)
- [Browser-Based Upload to S3](https://docs.aws.amazon.com/AmazonS3/latest/API/sigv4-post-example.html)
- [S3 CORS Configuration](https://docs.aws.amazon.com/AmazonS3/latest/userguide/enabling-cors-examples.html)

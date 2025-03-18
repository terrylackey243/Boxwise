# Amazon S3 Cloud Storage Implementation Guide

This guide provides step-by-step instructions for implementing the cloud storage solution for Boxwise using Amazon S3. Follow these steps to set up S3 storage, migrate existing files, and test the new upload functionality.

## Prerequisites

- AWS account (or create one)
- AWS CLI (optional, for testing)
- Node.js installed on your system

## Step 1: Set Up AWS Account and S3 Bucket

1. **Create or log in to an AWS account**
   - Navigate to [aws.amazon.com](https://aws.amazon.com/)
   - Sign up for a new account or log in to an existing one

2. **Create an S3 bucket**
   - Navigate to S3 in the AWS Management Console
   - Click "Create bucket"
   - Name the bucket (e.g., `boxwise-uploads` or similar)
   - Choose a region closest to your primary users for better performance
   - Configure options:
     - Keep "Block all public access" enabled for security
     - Enable versioning (optional but recommended)
     - Enable server-side encryption (recommended)
   - Complete the bucket creation

3. **Configure CORS for the bucket**
   - Select your newly created bucket
   - Go to the "Permissions" tab
   - Scroll down to "Cross-origin resource sharing (CORS)"
   - Click "Edit" and add the following configuration:

   ```json
   [
     {
       "AllowedHeaders": ["*"],
       "AllowedMethods": ["GET", "PUT", "POST", "DELETE", "HEAD"],
       "AllowedOrigins": ["*"],  // Restrict to your domains in production
       "ExposeHeaders": ["ETag", "x-amz-server-side-encryption"],
       "MaxAgeSeconds": 3000
     }
   ]
   ```
   - Click "Save changes"

## Step 2: Create IAM User and Credentials

1. **Create a new IAM user for Boxwise**
   - Navigate to IAM in the AWS Management Console
   - Click "Users" then "Add user"
   - Set a name (e.g., `boxwise-app`)
   - Select "Programmatic access"
   - Click "Next: Permissions"

2. **Create a custom IAM policy**
   - In the AWS Management Console, go to IAM
   - In the left sidebar, click on "Policies"
   - Click "Create policy"
   - On the "Specify permissions" page, you'll see options:
     - Choose "Service"
     - In the service dropdown, select "S3"
     - Then, under "Access level", select these specific permissions:
       - Under "Read": check "GetObject" and "ListBucket"
       - Under "Write": check "DeleteObject" and "PutObject"
   - Then click "Add ARN" to specify your bucket
   - Enter your bucket name and optionally specify an object path
   - Alternatively, you can use the JSON tab directly:
   - Select the "JSON" tab
   - Paste the following JSON (replacing `your-bucket-name` with your actual bucket name):

   ```json
   {
     "Version": "2012-10-17",
     "Statement": [
       {
         "Sid": "BoxwiseS3Access",
         "Effect": "Allow",
         "Action": [
           "s3:PutObject",
           "s3:GetObject",
           "s3:DeleteObject",
           "s3:ListBucket"
         ],
         "Resource": [
           "arn:aws:s3:::your-bucket-name/*",
           "arn:aws:s3:::your-bucket-name"
         ]
       }
     ]
   }
   ```
   - Click "Next" to proceed to the tags page (you can skip adding tags if not needed)
   - Click "Next: Review"
   - Name the policy (e.g., "BoxwiseS3Access")
   - Add a description (e.g., "Access policy for Boxwise S3 bucket operations")
   - Click "Create policy"

3. **Attach the policy to your IAM user**
   - Return to the "Users" section in IAM
   - Continue with your user creation process or select your existing user
   - On the "Set permissions" page, choose "Attach existing policies directly"
   - In the search box, type the name of the policy you just created (e.g., "BoxwiseS3Access")
   - Check the box next to your policy to select it
   - Click "Next: Tags" (you can skip adding tags if not needed)
   - Click "Next: Review" 
   - Review the user details and permissions
   - Click "Create user" to complete the process

4. **Save your access keys**
   - After creating the user, you'll be provided with an Access Key ID and Secret Access Key
   - **IMPORTANT**: Download the CSV file or copy these keys somewhere secure
   - You will need these keys for the next step and won't be able to retrieve the Secret Access Key again

## Step 3: Configure Environment Variables

1. **Update the server's environment variables**
   - Open the `.env` file in your server directory
   - Add the following environment variables with your AWS credentials:

   ```
   AWS_ACCESS_KEY_ID=your_access_key_here
   AWS_SECRET_ACCESS_KEY=your_secret_key_here
   AWS_REGION=us-east-1  # use your chosen region
   AWS_BUCKET_NAME=boxwise-uploads  # use your bucket name
   ```

## Step 4: Migrate Existing Files to S3

The project includes a migration script that will:
- Check for existing files in the local uploads directory
- Upload each file to S3
- Update the database references to point to the S3 locations

To run the migration:

1. **Install the AWS SDK in the scripts directory**
   ```bash
   cd boxwise/scripts
   npm install aws-sdk
   ```

2. **Run the migration script**
   ```bash
   node migrate-files-to-s3.js
   ```

3. **Monitor the output**
   - The script will log the progress of the migration
   - Note any errors for manual investigation
   - At the end, it will provide a summary of the migration status

## Step 5: Test the Implementation

1. **Start the server**
   ```bash
   cd boxwise/server
   npm run dev
   ```

2. **Start the client**
   ```bash
   cd boxwise/client
   npm start
   ```

3. **Test file uploads**
   - Navigate to an item detail page
   - Click to add an attachment
   - Select a file to upload
   - Verify that the upload completes successfully and the file appears in the attachments list

4. **Test file viewing and downloading**
   - Click on the view icon for an uploaded attachment
   - Verify that the file opens correctly in a new tab
   - Click on the download icon and verify that the file downloads correctly

5. **Test file deletion**
   - Click on the delete icon for an uploaded attachment
   - Confirm the deletion
   - Verify that the file is removed from the attachments list

## Troubleshooting

### Common Issues

1. **Upload fails with "Access Denied"**
   - Check that your AWS credentials are correctly configured in the `.env` file
   - Verify that the IAM user has the correct permissions on the bucket

2. **CORS errors in the browser console**
   - Verify that the CORS configuration for your S3 bucket is set correctly
   - Ensure that the origins in your CORS configuration include your application's domain

3. **Files upload but don't appear in the list**
   - Check the browser console for errors
   - Verify that the S3 URL generation is working correctly
   - Check that the database is being updated with the correct S3 file paths

### Verifying Files in S3

You can verify that files are being uploaded to S3 by:

1. **Using the AWS Management Console**
   - Navigate to your S3 bucket in the AWS Management Console
   - Browse through the folder structure to locate your files

2. **Using the AWS CLI**
   ```bash
   aws s3 ls s3://your-bucket-name/ --recursive
   ```

## Security Considerations

1. **Environment Variables**
   - Never commit your AWS credentials to version control
   - Consider using a secure environment variable management solution

2. **Access Control**
   - Implement proper user authentication and authorization in your application
   - Ensure users can only access files they are authorized to see

3. **Bucket Policies**
   - Regularly review and update your bucket policies
   - Consider implementing lifecycle policies to manage old files

## Production Deployment

When deploying to production, consider:

1. **CDN Integration**
   - Set up Amazon CloudFront or another CDN to serve your files more efficiently

2. **Lifecycle Rules**
   - Implement S3 lifecycle rules to move older files to cheaper storage tiers
   - Set up expiration rules for temporary files

3. **Monitoring and Alerts**
   - Set up CloudWatch alerts for unusual activity or high costs
   - Implement S3 access logging for security monitoring

## Maintenance

Regularly:

1. **Check for unused files**
   - Implement a cleanup process for files that are no longer referenced
   
2. **Monitor storage costs**
   - Set up AWS budgets to track S3 costs
   - Optimize storage classes based on access patterns

3. **Back up important files**
   - While S3 is highly durable, consider additional backup strategies for critical data

---

By following this guide, you should have a fully functioning S3-based cloud storage solution integrated with your Boxwise application. This implementation provides scalable, reliable, and secure file storage that can grow with your user base.

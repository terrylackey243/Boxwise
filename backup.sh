#!/bin/bash

# MongoDB backup script for Boxwise application

# Set variables
TIMESTAMP=$(date +"%Y%m%d%H%M%S")
BACKUP_DIR="/root/backups"
RETENTION_DAYS=7

# Create backup directory if it doesn't exist
mkdir -p $BACKUP_DIR

# Log start of backup
echo "Starting MongoDB backup at $(date)"

# Create MongoDB dump
docker-compose exec -T mongodb mongodump --out=/dump
if [ $? -ne 0 ]; then
    echo "Error: MongoDB dump failed"
    exit 1
fi

# Copy dump from container to host
docker cp boxwise-mongodb:/dump $BACKUP_DIR/mongodb_$TIMESTAMP
if [ $? -ne 0 ]; then
    echo "Error: Failed to copy dump from container"
    exit 1
fi

# Compress the backup
tar -czf $BACKUP_DIR/mongodb_$TIMESTAMP.tar.gz $BACKUP_DIR/mongodb_$TIMESTAMP
if [ $? -ne 0 ]; then
    echo "Error: Failed to compress backup"
    exit 1
fi

# Remove uncompressed backup
rm -rf $BACKUP_DIR/mongodb_$TIMESTAMP

# Remove backups older than RETENTION_DAYS days
find $BACKUP_DIR -name "mongodb_*.tar.gz" -type f -mtime +$RETENTION_DAYS -delete

# Log completion of backup
echo "MongoDB backup completed at $(date)"
echo "Backup saved to $BACKUP_DIR/mongodb_$TIMESTAMP.tar.gz"

# Optional: Copy backup to remote storage (uncomment and configure as needed)
# scp $BACKUP_DIR/mongodb_$TIMESTAMP.tar.gz user@remote-server:/path/to/backup/directory/

# Optional: Copy to Digital Ocean Spaces (uncomment and configure as needed)
# s3cmd put $BACKUP_DIR/mongodb_$TIMESTAMP.tar.gz s3://your-space-name/mongodb-backups/

echo "Backup process completed successfully"

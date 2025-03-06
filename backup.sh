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

# Copy backup to remote storage
# Replace with your actual remote server details
scp $BACKUP_DIR/mongodb_$TIMESTAMP.tar.gz backup-user@backup-server.example.com:/backups/boxwise/

# Log remote backup status
if [ $? -eq 0 ]; then
    echo "Remote backup successful"
else
    echo "Warning: Remote backup failed, but local backup is available"
fi

echo "Backup process completed successfully"

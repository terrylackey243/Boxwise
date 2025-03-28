# Boxwise Features

This document provides an overview of the features available in the Boxwise inventory management system.

## Core Features

### Items Management
- **Item Tracking**: Track items with detailed information including name, description, location, category, and more
- **Asset IDs**: Unique identifiers for each item, automatically generated
- **Bulk Item Addition**: Add multiple items at once through a spreadsheet-like interface
- **UPC Lookup**: Automatically populate item details by looking up UPC codes
- **Multi-field Search**: Find items by name, description, or other attributes
- **Item States**: Track different states of items (active, archived, etc.)
- **Item History**: View the complete history of an item

### Location Management
- **Hierarchical Locations**: Create and manage nested location structures (buildings, rooms, cabinets, shelves, etc.)
- **Location Tree View**: Visual representation of your location hierarchy
- **Bulk Location Addition**: Add multiple locations at once using a spreadsheet interface
- **Sequential Location Generator**: Create numbered location sequences (e.g., Shelf 1-5) with customizable options:
  - Parent location selection
  - Base name
  - Custom count
  - Start number configuration
  - Zero padding for numbers
  - Custom separator between name and number
- **Location Search**: Find locations using fuzzy search across names and hierarchical paths
- **Items Per Location**: See counts of items in each location
- **QR Code Generation**: Generate QR codes for locations to facilitate scanning
- **Batch QR Printing**: Print multiple location QR codes at once with customizable label sizes and layouts

### Category Management
- **Category System**: Organize items by customizable categories
- **Category Icons & Colors**: Visual identifiers for categories
- **Bulk Category Addition**: Add multiple categories at once through a spreadsheet-like interface

### Label Management
- **Custom Labels**: Create and manage labels to tag items
- **Label Colors**: Assign colors to labels for visual organization
- **Bulk Label Addition**: Add multiple labels at once through a spreadsheet-like interface
- **Multi-label Support**: Assign multiple labels to items

## Additional Features

### User & Access Management
- **User Accounts**: Individual accounts for team members
- **Role-based Permissions**: Control access based on user roles
- **Group Support**: Organize users into groups

### Subscription & Plans
- **Subscription Management**: Manage organization subscriptions
- **Plan Features**: Different features available based on subscription plan

### Administration
- **System Administration**: Tools for system administrators
- **Data Management**: Tools for managing system data

### Reports
- **Inventory Reports**: Generate reports on inventory status
- **Item Reports**: Reports on item status and history

### Achievements
- **User Achievements**: Track and reward user participation
- **Achievement Tracking**: System for monitoring achievement progress

## Interface Features

### Responsive Design
- **Mobile Friendly**: Access from mobile devices
- **Desktop Optimized**: Full-featured desktop experience

### Bulk Operations
- **Spreadsheet-like Interface**: Familiar interface for bulk operations on items, locations, categories, and labels
- **Data Validation**: Validation of bulk data before submission
- **Multi-selection**: Select multiple entities (like locations) for batch operations
- **Preview**: Preview effects of bulk operations before committing

### Search Capabilities
- **Global Search**: Search across all entity types
- **Fuzzy Search**: Find items and locations even with partial or slightly incorrect search terms
- **Hierarchical Search**: Search within nested location structures using full path context
- **Advanced Filters**: Filter search results by various attributes

## Technical Features

### Cloud Storage
- **Amazon S3 Integration**: Secure cloud storage for all file attachments
- **Direct Upload**: File uploads go directly to cloud storage for improved performance
- **Thumbnail Generation**: Automatic thumbnail display for primary photos in list views
- **Secure Access Control**: Files are securely stored with proper access controls
- **Scalable Storage**: Virtually unlimited storage capacity for growing organizations
- **File Size Limits**: Maximum file size enforced to ensure optimal performance (5MB)
- **Attachment Quantity Limits**: Maximum of 5 attachments per item to prevent overuse
- **File Type Restrictions**: Support for common document and image formats only
- **Image Compression**: Automatic compression of oversized images to meet size limits

### API
- **RESTful API**: Well-structured API for programmatic access
- **Authentication**: Secure API authentication

### Data Management
- **Data Import/Export**: Import and export data in various formats
- **Backup System**: Regular data backups
- **Sync Capabilities**: Sync data across devices

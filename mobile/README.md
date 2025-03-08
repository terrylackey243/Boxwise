# Boxwise Mobile App

Mobile application for Boxwise inventory management system.

## Features

- Scan UPC codes directly with the phone camera
- Take photos of items and upload them immediately
- Check inventory while shopping to avoid duplicate purchases
- Add items to inventory right when they're purchased
- Access to all core Boxwise functionality on the go

## Getting Started

### Prerequisites

- Node.js (v16 or newer)
- npm or yarn
- React Native development environment set up
- iOS: XCode and CocoaPods (for Mac users)
- Android: Android Studio and Android SDK

### Installation

1. Clone the repository (if you haven't already)
2. Navigate to the mobile directory:
   ```
   cd boxwise/mobile
   ```
3. Install dependencies:
   ```
   npm install
   ```
   or
   ```
   yarn install
   ```
4. Start the development server:
   ```
   npm start
   ```
   or
   ```
   yarn start
   ```

### Running on Devices/Emulators

#### iOS
```
npm run ios
```

#### Android
```
npm run android
```

## Development

This mobile app is built with React Native and communicates with the Boxwise backend API.

## Project Structure

- `/src` - Main source code
  - `/api` - API service and configuration
  - `/components` - Reusable UI components
  - `/context` - React context providers
  - `/hooks` - Custom React hooks
  - `/navigation` - Navigation configuration
  - `/screens` - App screens
  - `/utils` - Utility functions
  - `/assets` - Static assets like images and fonts

# Boxwise Mobile App

The Boxwise Mobile App is a companion application to the Boxwise web platform, allowing users to manage their inventory on the go.

## Features

- **UPC Code Scanning**: Scan UPC codes directly with your phone camera
- **Photo Capture**: Take photos of items and upload them immediately
- **Inventory Checking**: Check your inventory while shopping to avoid duplicate purchases
- **Quick Add**: Add items to your inventory right when they're purchased

## Prerequisites

- Node.js (v18 or newer)
- npm or yarn
- Expo CLI
- iOS Simulator (for iOS development) or Android Emulator (for Android development)
- Expo Go app on your physical device for testing

## Installation

1. Clone the repository:
   ```
   git clone https://github.com/your-username/boxwise.git
   cd boxwise/mobile
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Set up environment variables:
   Create a `.env` file in the mobile directory with the following variables:
   ```
   API_URL=http://localhost:5001
   ```

## Development

### Running the app locally

```
npm start
```

This will start the Expo development server. You can then:
- Press `i` to open in iOS Simulator
- Press `a` to open in Android Emulator
- Scan the QR code with your phone's camera to open in Expo Go app

### Running on specific platforms

```
npm run ios     # Run on iOS Simulator
npm run android # Run on Android Emulator
npm run web     # Run in web browser
```

## Building for Production

### Prerequisites for building

1. Create an Expo account at https://expo.dev/signup
2. Install EAS CLI:
   ```
   npm install -g eas-cli
   ```
3. Log in to your Expo account:
   ```
   eas login
   ```

### Building the app

The build process requires authentication with Expo, so it must be run locally rather than on the Render server:

```
# Build for both platforms
npx eas-cli build --platform all

# Build for iOS only
npx eas-cli build --platform ios

# Build for Android only
npx eas-cli build --platform android
```

You can also use the npm scripts, which will provide instructions:

```
npm run build
npm run build:ios
npm run build:android
```

### Local Development Builds

For testing on your device without going through the app stores:

```
# Create a local development build
npm run build:local

# Create a preview build with development client
npm run build:preview
```

### Submitting to App Stores

```
# Submit to App Store
npx eas-cli submit --platform ios

# Submit to Google Play Store
npx eas-cli submit --platform android
```

Or use the npm scripts for guidance:

```
npm run submit:ios
npm run submit:android
```

## Project Structure

```
mobile/
├── assets/              # Static assets like images and fonts
├── src/
│   ├── api/             # API service files
│   ├── components/      # Reusable UI components
│   ├── context/         # React Context providers
│   ├── navigation/      # Navigation configuration
│   └── screens/         # Screen components
│       ├── auth/        # Authentication screens
│       ├── camera/      # Camera functionality
│       ├── items/       # Item management screens
│       └── scanner/     # UPC scanner screens
├── App.js               # Main application component
├── app.json             # Expo configuration
├── babel.config.js      # Babel configuration
└── eas.json             # EAS Build configuration
```

## Troubleshooting

### Common Issues

1. **Build fails with "eas: command not found"**
   - Make sure you have installed eas-cli globally: `npm install -g eas-cli`
   - Or use npx: `npx eas-cli build --platform all`

2. **Camera or barcode scanner not working**
   - Ensure you have granted camera permissions
   - On physical devices, make sure the camera is not being used by another app

3. **API connection issues**
   - Verify the API_URL in your .env file is correct
   - Check that the backend server is running

## Contributing

1. Fork the repository
2. Create your feature branch: `git checkout -b feature/my-new-feature`
3. Commit your changes: `git commit -am 'Add some feature'`
4. Push to the branch: `git push origin feature/my-new-feature`
5. Submit a pull request

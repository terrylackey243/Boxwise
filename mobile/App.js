import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Provider as PaperProvider, DefaultTheme } from 'react-native-paper';
import { StatusBar } from 'expo-status-bar';
import { registerRootComponent } from 'expo';

// Import providers
import { AuthProvider } from './src/context/AuthContext';

// Import navigation
import AppNavigator from './src/navigation/AppNavigator';

// Create theme with light purple primary color (matching web app)
const theme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: '#6B46C1', // Light purple
    accent: '#38B2AC', // Teal
    background: '#f7fafc',
    surface: '#fff',
    text: '#1a202c',
    error: '#f44336',
  },
};

const App = () => {
  return (
    <SafeAreaProvider>
      <StatusBar style="dark" backgroundColor="#fff" />
      <PaperProvider theme={theme}>
        <AuthProvider>
          <AppNavigator />
        </AuthProvider>
      </PaperProvider>
    </SafeAreaProvider>
  );
};

export default registerRootComponent(App);

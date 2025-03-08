import React, { useContext } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { ActivityIndicator, View } from 'react-native';
import { MaterialIcons } from 'react-native-vector-icons';

// Import context
import AuthContext from '../context/AuthContext';

// Import screens (to be created)
import LoginScreen from '../screens/auth/LoginScreen';
import RegisterScreen from '../screens/auth/RegisterScreen';
import DashboardScreen from '../screens/DashboardScreen';
import ItemsListScreen from '../screens/items/ItemsListScreen';
import ItemDetailScreen from '../screens/items/ItemDetailScreen';
import CreateItemScreen from '../screens/items/CreateItemScreen';
import EditItemScreen from '../screens/items/EditItemScreen';
import ScannerScreen from '../screens/scanner/ScannerScreen';
import CameraScreen from '../screens/camera/CameraScreen';
import ProfileScreen from '../screens/profile/ProfileScreen';
import SettingsScreen from '../screens/settings/SettingsScreen';
import QuickAddScreen from '../screens/items/QuickAddScreen';

// Create navigators
const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();
const Drawer = createDrawerNavigator();

// Auth Navigator (Login/Register)
const AuthNavigator = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="Login" component={LoginScreen} />
    <Stack.Screen name="Register" component={RegisterScreen} />
  </Stack.Navigator>
);

// Items Stack Navigator
const ItemsNavigator = () => (
  <Stack.Navigator>
    <Stack.Screen name="ItemsList" component={ItemsListScreen} options={{ title: 'Items' }} />
    <Stack.Screen name="ItemDetail" component={ItemDetailScreen} options={{ title: 'Item Details' }} />
    <Stack.Screen name="CreateItem" component={CreateItemScreen} options={{ title: 'Add Item' }} />
    <Stack.Screen name="EditItem" component={EditItemScreen} options={{ title: 'Edit Item' }} />
    <Stack.Screen name="QuickAdd" component={QuickAddScreen} options={{ title: 'Quick Add Item' }} />
  </Stack.Navigator>
);

// Scanner Stack Navigator
const ScannerNavigator = () => (
  <Stack.Navigator>
    <Stack.Screen name="Scanner" component={ScannerScreen} options={{ title: 'Scan UPC' }} />
    <Stack.Screen name="QuickAdd" component={QuickAddScreen} options={{ title: 'Quick Add Item' }} />
  </Stack.Navigator>
);

// Camera Stack Navigator
const CameraNavigator = () => (
  <Stack.Navigator>
    <Stack.Screen name="Camera" component={CameraScreen} options={{ title: 'Take Photo' }} />
  </Stack.Navigator>
);

// Profile Stack Navigator
const ProfileNavigator = () => (
  <Stack.Navigator>
    <Stack.Screen name="Profile" component={ProfileScreen} options={{ title: 'Profile' }} />
    <Stack.Screen name="Settings" component={SettingsScreen} options={{ title: 'Settings' }} />
  </Stack.Navigator>
);

// Main Tab Navigator (Bottom Tabs)
const TabNavigator = () => (
  <Tab.Navigator
    screenOptions={({ route }) => ({
      tabBarIcon: ({ focused, color, size }) => {
        let iconName;

        if (route.name === 'Dashboard') {
          iconName = 'dashboard';
        } else if (route.name === 'Items') {
          iconName = 'inventory';
        } else if (route.name === 'Scanner') {
          iconName = 'qr-code-scanner';
        } else if (route.name === 'Camera') {
          iconName = 'camera-alt';
        } else if (route.name === 'Profile') {
          iconName = 'person';
        }

        return <MaterialIcons name={iconName} size={size} color={color} />;
      },
    })}
  >
    <Tab.Screen name="Dashboard" component={DashboardScreen} />
    <Tab.Screen name="Items" component={ItemsNavigator} options={{ headerShown: false }} />
    <Tab.Screen name="Scanner" component={ScannerNavigator} options={{ headerShown: false }} />
    <Tab.Screen name="Camera" component={CameraNavigator} options={{ headerShown: false }} />
    <Tab.Screen name="Profile" component={ProfileNavigator} options={{ headerShown: false }} />
  </Tab.Navigator>
);

// Main App Navigator
const AppNavigator = () => {
  const { isAuthenticated, loading } = useContext(AuthContext);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#6B46C1" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      {isAuthenticated() ? <TabNavigator /> : <AuthNavigator />}
    </NavigationContainer>
  );
};

export default AppNavigator;

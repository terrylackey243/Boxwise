import React, { useState, useEffect, useContext } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import {
  Text,
  Card,
  Title,
  Paragraph,
  Button,
  Divider,
  List,
  Avatar,
  Surface,
  ActivityIndicator,
  useTheme,
} from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import axios from '../api/axiosConfig';
import AuthContext from '../context/AuthContext';

const DashboardScreen = () => {
  const navigation = useNavigation();
  const theme = useTheme();
  const { user } = useContext(AuthContext);
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [dashboardData, setDashboardData] = useState({
    totalItems: 0,
    recentItems: [],
    itemsByCategory: [],
    itemsByLocation: [],
  });
  
  // Fetch dashboard data
  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      // Make API call to get dashboard data
      const response = await axios.get('/api/dashboard');
      
      if (response.data.success) {
        setDashboardData(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };
  
  // Initial data fetch
  useEffect(() => {
    fetchDashboardData();
  }, []);
  
  // Handle refresh
  const onRefresh = () => {
    setRefreshing(true);
    fetchDashboardData();
  };
  
  // Navigate to items list with filter
  const navigateToItems = (filter) => {
    navigation.navigate('Items', { screen: 'ItemsList', params: filter });
  };
  
  // Navigate to scanner
  const navigateToScanner = () => {
    navigation.navigate('Scanner');
  };
  
  // Navigate to camera
  const navigateToCamera = () => {
    navigation.navigate('Camera');
  };
  
  // Navigate to quick add
  const navigateToQuickAdd = () => {
    navigation.navigate('Items', { screen: 'QuickAdd' });
  };
  
  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.loadingText}>Loading dashboard...</Text>
      </View>
    );
  }
  
  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* Welcome Card */}
      <Card style={styles.welcomeCard}>
        <Card.Content>
          <Title>Welcome, {user?.name || 'User'}</Title>
          <Paragraph>
            You have {dashboardData.totalItems} items in your inventory
          </Paragraph>
        </Card.Content>
      </Card>
      
      {/* Quick Actions */}
      <Surface style={styles.quickActions}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={navigateToScanner}
          >
            <Avatar.Icon
              size={50}
              icon="qr-code-scanner"
              color="#fff"
              style={{ backgroundColor: theme.colors.primary }}
            />
            <Text style={styles.actionText}>Scan UPC</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.actionButton}
            onPress={navigateToCamera}
          >
            <Avatar.Icon
              size={50}
              icon="camera"
              color="#fff"
              style={{ backgroundColor: theme.colors.primary }}
            />
            <Text style={styles.actionText}>Take Photo</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.actionButton}
            onPress={navigateToQuickAdd}
          >
            <Avatar.Icon
              size={50}
              icon="plus"
              color="#fff"
              style={{ backgroundColor: theme.colors.primary }}
            />
            <Text style={styles.actionText}>Quick Add</Text>
          </TouchableOpacity>
        </View>
      </Surface>
      
      {/* Recent Items */}
      <Surface style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recent Items</Text>
          <Button
            mode="text"
            onPress={() => navigateToItems({})}
            labelStyle={{ color: theme.colors.primary }}
          >
            View All
          </Button>
        </View>
        
        {dashboardData.recentItems.length === 0 ? (
          <Text style={styles.emptyText}>No recent items</Text>
        ) : (
          dashboardData.recentItems.map((item) => (
            <TouchableOpacity
              key={item._id}
              onPress={() => navigation.navigate('Items', {
                screen: 'ItemDetail',
                params: { id: item._id }
              })}
            >
              <List.Item
                title={item.name}
                description={`${item.location?.name || 'No location'} • ${
                  item.category?.name || 'No category'
                }`}
                left={(props) => (
                  <List.Icon
                    {...props}
                    icon={item.category?.icon || 'package-variant-closed'}
                  />
                )}
                right={(props) => (
                  <Text {...props} style={{ alignSelf: 'center' }}>
                    {new Date(item.updatedAt || item.createdAt).toLocaleDateString()}
                  </Text>
                )}
              />
              <Divider />
            </TouchableOpacity>
          ))
        )}
      </Surface>
      
      {/* Items by Location */}
      <Surface style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Items by Location</Text>
        </View>
        
        {dashboardData.itemsByLocation.length === 0 ? (
          <Text style={styles.emptyText}>No locations</Text>
        ) : (
          dashboardData.itemsByLocation.map((location) => (
            <TouchableOpacity
              key={location._id}
              onPress={() => navigateToItems({ location: location._id })}
            >
              <List.Item
                title={location.name}
                description={`${location.count} items`}
                left={(props) => <List.Icon {...props} icon="map-marker" />}
                right={(props) => (
                  <Text {...props} style={{ alignSelf: 'center' }}>
                    {Math.round((location.count / dashboardData.totalItems) * 100)}%
                  </Text>
                )}
              />
              <Divider />
            </TouchableOpacity>
          ))
        )}
      </Surface>
      
      {/* Items by Category */}
      <Surface style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Items by Category</Text>
        </View>
        
        {dashboardData.itemsByCategory.length === 0 ? (
          <Text style={styles.emptyText}>No categories</Text>
        ) : (
          dashboardData.itemsByCategory.map((category) => (
            <TouchableOpacity
              key={category._id}
              onPress={() => navigateToItems({ category: category._id })}
            >
              <List.Item
                title={category.name}
                description={`${category.count} items`}
                left={(props) => (
                  <List.Icon
                    {...props}
                    icon={category.icon || 'shape-outline'}
                  />
                )}
                right={(props) => (
                  <Text {...props} style={{ alignSelf: 'center' }}>
                    {Math.round((category.count / dashboardData.totalItems) * 100)}%
                  </Text>
                )}
              />
              <Divider />
            </TouchableOpacity>
          ))
        )}
      </Surface>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f7fafc',
  },
  contentContainer: {
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
  welcomeCard: {
    marginBottom: 16,
    elevation: 2,
  },
  quickActions: {
    padding: 16,
    marginBottom: 16,
    borderRadius: 8,
    elevation: 2,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 16,
  },
  actionButton: {
    alignItems: 'center',
  },
  actionText: {
    marginTop: 8,
    fontSize: 12,
  },
  section: {
    marginBottom: 16,
    borderRadius: 8,
    overflow: 'hidden',
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  emptyText: {
    textAlign: 'center',
    padding: 16,
    color: '#666',
  },
});

export default DashboardScreen;

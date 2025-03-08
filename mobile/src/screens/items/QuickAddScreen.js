import React, { useState, useEffect, useContext } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Image,
} from 'react-native';
import {
  TextInput,
  Button,
  Text,
  Headline,
  Divider,
  Chip,
  HelperText,
  ActivityIndicator,
  IconButton,
  Menu,
  Surface,
} from 'react-native-paper';
import { useNavigation, useRoute } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { createItem, uploadItemImage } from '../../api/itemsApi';
import AuthContext from '../../context/AuthContext';

const QuickAddScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { user } = useContext(AuthContext);
  
  // Get UPC data from route params if available
  const { upcCode, upcData, photoUri: initialPhotoUri } = route.params || {};
  
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [photoUri, setPhotoUri] = useState(initialPhotoUri || null);
  const [locationMenuVisible, setLocationMenuVisible] = useState(false);
  const [categoryMenuVisible, setCategoryMenuVisible] = useState(false);
  
  // Form data
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    location: '',
    category: '',
    quantity: 1,
    notes: '',
    upcCode: upcCode || '',
  });
  
  // Mock data for locations and categories (in a real app, these would be fetched from the API)
  const [locations, setLocations] = useState([
    { _id: 'loc1', name: 'Kitchen' },
    { _id: 'loc2', name: 'Garage' },
    { _id: 'loc3', name: 'Bedroom' },
    { _id: 'loc4', name: 'Living Room' },
  ]);
  
  const [categories, setCategories] = useState([
    { _id: 'cat1', name: 'Electronics' },
    { _id: 'cat2', name: 'Tools' },
    { _id: 'cat3', name: 'Clothing' },
    { _id: 'cat4', name: 'Food' },
  ]);
  
  // Errors
  const [errors, setErrors] = useState({});
  
  // Pre-fill form with UPC data if available
  useEffect(() => {
    if (upcData) {
      setFormData(prevData => ({
        ...prevData,
        name: upcData.name || prevData.name,
        description: upcData.description || prevData.description,
        category: findCategoryByName(upcData.category) || prevData.category,
      }));
    }
  }, [upcData]);
  
  // Helper function to find category ID by name
  const findCategoryByName = (categoryName) => {
    if (!categoryName) return '';
    
    const category = categories.find(
      cat => cat.name.toLowerCase() === categoryName.toLowerCase()
    );
    
    return category ? category._id : '';
  };
  
  // Handle form input changes
  const handleChange = (name, value) => {
    setFormData(prevData => ({
      ...prevData,
      [name]: value,
    }));
    
    // Clear error for this field if it exists
    if (errors[name]) {
      setErrors(prevErrors => ({
        ...prevErrors,
        [name]: null,
      }));
    }
  };
  
  // Take a photo
  const handleTakePhoto = async () => {
    try {
      // Request camera permissions
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Camera permission is required to take photos');
        return;
      }
      
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });
      
      if (!result.canceled && result.assets && result.assets.length > 0) {
        setPhotoUri(result.assets[0].uri);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to take photo');
      console.error(error);
    }
  };
  
  // Validate form
  const validateForm = () => {
    const newErrors = {};
    
    // Required fields
    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }
    
    if (!formData.location) {
      newErrors.location = 'Location is required';
    }
    
    // Quantity must be a positive number
    if (formData.quantity <= 0) {
      newErrors.quantity = 'Quantity must be greater than 0';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  // Submit form
  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }
    
    setSubmitting(true);
    
    try {
      // Prepare data for API
      const itemData = {
        ...formData,
        group: user.group, // Assuming user has a group property
        createdBy: user.id,
      };
      
      // Create item
      const response = await createItem(itemData);
      
      if (response.success) {
        // If photo was taken, upload it
        if (photoUri) {
          await uploadItemImage(response.data._id, photoUri, true);
        }
        
        Alert.alert(
          'Success',
          'Item added successfully',
          [
            {
              text: 'OK',
              onPress: () => navigation.navigate('ItemsList'),
            },
          ]
        );
      } else {
        Alert.alert('Error', response.message || 'Failed to add item');
      }
    } catch (error) {
      Alert.alert('Error', error.response?.data?.message || 'Failed to add item');
      console.error(error);
    } finally {
      setSubmitting(false);
    }
  };
  
  // Get location name by ID
  const getLocationName = (locationId) => {
    const location = locations.find(loc => loc._id === locationId);
    return location ? location.name : 'Select Location';
  };
  
  // Get category name by ID
  const getCategoryName = (categoryId) => {
    const category = categories.find(cat => cat._id === categoryId);
    return category ? category.name : 'Select Category';
  };
  
  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <Surface style={styles.formContainer}>
          <Headline style={styles.headline}>Quick Add Item</Headline>
          
          {upcCode ? (
            <Chip icon="barcode" style={styles.upcChip}>
              UPC: {upcCode}
            </Chip>
          ) : null}
          
          <TextInput
            label="Item Name"
            value={formData.name}
            onChangeText={(text) => handleChange('name', text)}
            mode="outlined"
            error={!!errors.name}
            style={styles.input}
          />
          {errors.name ? <HelperText type="error">{errors.name}</HelperText> : null}
          
          <TextInput
            label="Description (Optional)"
            value={formData.description}
            onChangeText={(text) => handleChange('description', text)}
            mode="outlined"
            multiline
            numberOfLines={3}
            style={styles.input}
          />
          
          <View style={styles.row}>
            <View style={styles.menuContainer}>
              <Text style={styles.label}>Location *</Text>
              <Button
                mode="outlined"
                onPress={() => setLocationMenuVisible(true)}
                style={[styles.dropdown, errors.location && styles.errorBorder]}
              >
                {getLocationName(formData.location)}
              </Button>
              {errors.location ? (
                <HelperText type="error">{errors.location}</HelperText>
              ) : null}
              
              <Menu
                visible={locationMenuVisible}
                onDismiss={() => setLocationMenuVisible(false)}
                anchor={<View />}
                style={styles.menu}
              >
                {locations.map((location) => (
                  <Menu.Item
                    key={location._id}
                    title={location.name}
                    onPress={() => {
                      handleChange('location', location._id);
                      setLocationMenuVisible(false);
                    }}
                  />
                ))}
              </Menu>
            </View>
            
            <View style={styles.menuContainer}>
              <Text style={styles.label}>Category (Optional)</Text>
              <Button
                mode="outlined"
                onPress={() => setCategoryMenuVisible(true)}
                style={styles.dropdown}
              >
                {getCategoryName(formData.category)}
              </Button>
              
              <Menu
                visible={categoryMenuVisible}
                onDismiss={() => setCategoryMenuVisible(false)}
                anchor={<View />}
                style={styles.menu}
              >
                {categories.map((category) => (
                  <Menu.Item
                    key={category._id}
                    title={category.name}
                    onPress={() => {
                      handleChange('category', category._id);
                      setCategoryMenuVisible(false);
                    }}
                  />
                ))}
              </Menu>
            </View>
          </View>
          
          <TextInput
            label="Quantity"
            value={formData.quantity.toString()}
            onChangeText={(text) => handleChange('quantity', parseInt(text) || 0)}
            mode="outlined"
            keyboardType="numeric"
            error={!!errors.quantity}
            style={styles.input}
          />
          {errors.quantity ? (
            <HelperText type="error">{errors.quantity}</HelperText>
          ) : null}
          
          <TextInput
            label="Notes (Optional)"
            value={formData.notes}
            onChangeText={(text) => handleChange('notes', text)}
            mode="outlined"
            multiline
            numberOfLines={2}
            style={styles.input}
          />
          
          <Divider style={styles.divider} />
          
          <View style={styles.photoSection}>
            <Text style={styles.photoTitle}>Add Photo (Optional)</Text>
            
            {photoUri ? (
              <View style={styles.photoPreviewContainer}>
                <Image source={{ uri: photoUri }} style={styles.photoPreview} />
                <IconButton
                  icon="close"
                  size={20}
                  onPress={() => setPhotoUri(null)}
                  style={styles.removePhotoButton}
                />
              </View>
            ) : (
              <Button
                mode="outlined"
                icon="camera"
                onPress={handleTakePhoto}
                style={styles.photoButton}
              >
                Take Photo
              </Button>
            )}
          </View>
          
          <View style={styles.buttonContainer}>
            <Button
              mode="contained"
              onPress={handleSubmit}
              loading={submitting}
              disabled={submitting}
              style={styles.submitButton}
            >
              Add to Inventory
            </Button>
            
            <Button
              mode="outlined"
              onPress={() => navigation.goBack()}
              disabled={submitting}
              style={styles.cancelButton}
            >
              Cancel
            </Button>
          </View>
        </Surface>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f7fafc',
  },
  scrollContainer: {
    flexGrow: 1,
    padding: 16,
  },
  formContainer: {
    padding: 16,
    borderRadius: 8,
    elevation: 4,
  },
  headline: {
    fontSize: 24,
    marginBottom: 16,
    color: '#6B46C1',
  },
  upcChip: {
    marginBottom: 16,
    backgroundColor: '#EBF4FF',
  },
  input: {
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  menuContainer: {
    flex: 1,
    marginHorizontal: 4,
  },
  label: {
    fontSize: 12,
    marginBottom: 4,
    color: '#4A5568',
  },
  dropdown: {
    width: '100%',
    height: 50,
    justifyContent: 'center',
  },
  errorBorder: {
    borderColor: '#f44336',
  },
  menu: {
    width: '80%',
  },
  divider: {
    marginVertical: 16,
  },
  photoSection: {
    marginBottom: 16,
  },
  photoTitle: {
    fontSize: 16,
    marginBottom: 8,
    color: '#4A5568',
  },
  photoButton: {
    marginTop: 8,
  },
  photoPreviewContainer: {
    position: 'relative',
    alignItems: 'center',
    marginTop: 8,
  },
  photoPreview: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    resizeMode: 'cover',
  },
  removePhotoButton: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  buttonContainer: {
    marginTop: 16,
  },
  submitButton: {
    marginBottom: 12,
    paddingVertical: 8,
    backgroundColor: '#6B46C1',
  },
  cancelButton: {
    paddingVertical: 8,
  },
});

export default QuickAddScreen;

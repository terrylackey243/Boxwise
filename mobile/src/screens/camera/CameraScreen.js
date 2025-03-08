import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  Alert,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  ScrollView,
} from 'react-native';
import { Camera } from 'expo-camera';
import * as MediaLibrary from 'expo-media-library';
import * as FileSystem from 'expo-file-system';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Button, Text, IconButton, Surface, TextInput, Chip } from 'react-native-paper';
import { uploadItemImage } from '../../api/itemsApi';

const CameraScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { itemId } = route.params || {};
  
  const [hasPermission, setHasPermission] = useState(null);
  const [photo, setPhoto] = useState(null);
  const [torch, setTorch] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [photoNote, setPhotoNote] = useState('');
  const [isPrimary, setIsPrimary] = useState(false);
  
  const cameraRef = useRef(null);

  // Request camera permissions
  useEffect(() => {
    const getPermissions = async () => {
      const { status: cameraStatus } = await Camera.requestCameraPermissionsAsync();
      const { status: mediaStatus } = await MediaLibrary.requestPermissionsAsync();
      setHasPermission(cameraStatus === 'granted' && mediaStatus === 'granted');
    };
    
    getPermissions();
  }, []);

  // Take a photo
  const takePhoto = async () => {
    if (cameraRef.current) {
      try {
        const photo = await cameraRef.current.takePictureAsync({
          quality: 0.9,
          skipProcessing: false,
        });
        
        setPhoto(photo);
        setShowPreview(true);
      } catch (error) {
        Alert.alert('Error', 'Failed to take photo');
        console.error(error);
      }
    }
  };

  // Upload photo to item
  const uploadPhoto = async () => {
    if (!photo) return;
    
    // If no itemId was provided, just return to previous screen with the photo
    if (!itemId) {
      navigation.navigate('QuickAdd', { photoUri: photo.uri });
      return;
    }
    
    setUploading(true);
    
    try {
      await uploadItemImage(itemId, photo.uri, isPrimary);
      
      Alert.alert(
        'Success',
        'Photo uploaded successfully',
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack(),
          },
        ]
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to upload photo');
      console.error(error);
    } finally {
      setUploading(false);
    }
  };

  // Toggle flashlight
  const toggleTorch = () => {
    setTorch(!torch);
  };

  // Discard photo and return to camera
  const discardPhoto = () => {
    setPhoto(null);
    setShowPreview(false);
    setPhotoNote('');
    setIsPrimary(false);
  };

  // If permissions not determined yet
  if (hasPermission === null) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#6B46C1" />
        <Text style={styles.text}>Requesting camera permission...</Text>
      </View>
    );
  }

  // If permissions denied
  if (hasPermission === false) {
    return (
      <View style={styles.container}>
        <Text style={styles.text}>No access to camera</Text>
        <Text style={styles.subText}>
          Camera permission is required to take photos.
        </Text>
        <Button 
          mode="contained" 
          onPress={() => Camera.requestCameraPermissionsAsync()}
          style={styles.button}
        >
          Request Permission
        </Button>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {!showPreview ? (
        <>
          <Camera
            ref={cameraRef}
            style={styles.camera}
            type={Camera.Constants.Type.back}
            flashMode={torch ? Camera.Constants.FlashMode.torch : Camera.Constants.FlashMode.off}
            ratio="16:9"
          />
          
          <View style={styles.controls}>
            <IconButton
              icon="flashlight"
              size={30}
              iconColor={torch ? '#FFD700' : '#FFFFFF'}
              onPress={toggleTorch}
              style={styles.torchButton}
            />
            
            <TouchableOpacity
              style={styles.captureButton}
              onPress={takePhoto}
            >
              <View style={styles.captureButtonInner} />
            </TouchableOpacity>
            
            <IconButton
              icon="close"
              size={30}
              iconColor="#FFFFFF"
              onPress={() => navigation.goBack()}
              style={styles.closeButton}
            />
          </View>
          
          <Surface style={styles.instructions}>
            <Text style={styles.instructionText}>
              Take a photo of your item
            </Text>
          </Surface>
        </>
      ) : (
        <Modal visible={showPreview} animationType="slide">
          <ScrollView contentContainerStyle={styles.previewContainer}>
            <Image
              source={{ uri: photo.uri }}
              style={styles.previewImage}
            />
            
            <Surface style={styles.previewControls}>
              <Text style={styles.previewTitle}>Photo Preview</Text>
              
              <TextInput
                label="Add a note to this photo (optional)"
                value={photoNote}
                onChangeText={setPhotoNote}
                mode="outlined"
                multiline
                numberOfLines={2}
                style={styles.noteInput}
              />
              
              <TouchableOpacity
                style={styles.primaryToggle}
                onPress={() => setIsPrimary(!isPrimary)}
              >
                <Chip
                  selected={isPrimary}
                  selectedColor="#6B46C1"
                  onPress={() => setIsPrimary(!isPrimary)}
                  style={isPrimary ? styles.primaryChipSelected : styles.primaryChip}
                >
                  Set as primary photo
                </Chip>
              </TouchableOpacity>
              
              <View style={styles.previewButtons}>
                <Button
                  mode="outlined"
                  icon="close"
                  onPress={discardPhoto}
                  style={styles.discardButton}
                >
                  Discard
                </Button>
                
                <Button
                  mode="contained"
                  icon="check"
                  onPress={uploadPhoto}
                  loading={uploading}
                  disabled={uploading}
                  style={styles.useButton}
                >
                  {uploading ? 'Uploading...' : 'Use Photo'}
                </Button>
              </View>
            </Surface>
          </ScrollView>
        </Modal>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  camera: {
    flex: 1,
  },
  controls: {
    position: 'absolute',
    bottom: 100,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  torchButton: {
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  closeButton: {
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  captureButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: 'rgba(255,255,255,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  captureButtonInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#fff',
  },
  instructions: {
    position: 'absolute',
    bottom: 30,
    left: 20,
    right: 20,
    padding: 15,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.9)',
  },
  instructionText: {
    textAlign: 'center',
    color: '#333',
  },
  previewContainer: {
    flexGrow: 1,
    backgroundColor: '#f7fafc',
  },
  previewImage: {
    width: '100%',
    height: 400,
    resizeMode: 'cover',
  },
  previewControls: {
    padding: 20,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    marginTop: -20,
    backgroundColor: '#fff',
    flex: 1,
  },
  previewTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#333',
  },
  noteInput: {
    marginBottom: 16,
  },
  primaryToggle: {
    marginBottom: 16,
  },
  primaryChip: {
    backgroundColor: '#f0f0f0',
  },
  primaryChipSelected: {
    backgroundColor: '#EBF4FF',
  },
  previewButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  discardButton: {
    flex: 1,
    marginRight: 8,
  },
  useButton: {
    flex: 1,
    marginLeft: 8,
    backgroundColor: '#6B46C1',
  },
  text: {
    fontSize: 18,
    fontWeight: 'bold',
    marginVertical: 10,
    textAlign: 'center',
    color: '#fff',
  },
  subText: {
    fontSize: 14,
    marginBottom: 20,
    textAlign: 'center',
    color: '#ccc',
  },
  button: {
    marginTop: 20,
    backgroundColor: '#6B46C1',
  },
});

export default CameraScreen;

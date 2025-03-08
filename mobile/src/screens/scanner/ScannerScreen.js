import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { Camera, BarCodeScanner } from 'expo-camera';
import { useNavigation } from '@react-navigation/native';
import { Button, Text, Surface, IconButton } from 'react-native-paper';
import { lookupUPC } from '../../api/itemsApi';

const ScannerScreen = () => {
  const navigation = useNavigation();
  const [hasPermission, setHasPermission] = useState(null);
  const [scanning, setScanning] = useState(true);
  const [scannedCode, setScannedCode] = useState(null);
  const [loading, setLoading] = useState(false);
  const [torch, setTorch] = useState(false);
  const cameraRef = useRef(null);

  // Request camera permissions
  useEffect(() => {
    const getPermissions = async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === 'granted');
    };
    
    getPermissions();
  }, []);

  // Function to handle barcode detection
  const onBarcodeScanned = async ({ type, data }) => {
    if (scanning && data) {
      setScanning(false);
      setScannedCode(data);
      
      try {
        setLoading(true);
        // Lookup UPC code
        const result = await lookupUPC(data);
        
        if (result.success) {
          // Navigate to quick add screen with the product data
          navigation.navigate('QuickAdd', { 
            upcData: result.data,
            upcCode: data
          });
        } else {
          // If no product found, still navigate but with just the UPC code
          navigation.navigate('QuickAdd', { 
            upcCode: data 
          });
        }
      } catch (error) {
        Alert.alert(
          'Error',
          'Failed to lookup UPC code. Please try again or enter item details manually.',
          [
            { 
              text: 'Try Again', 
              onPress: () => {
                setScanning(true);
                setScannedCode(null);
              } 
            },
            { 
              text: 'Enter Manually', 
              onPress: () => navigation.navigate('QuickAdd', { upcCode: data }) 
            }
          ]
        );
      } finally {
        setLoading(false);
      }
    }
  };

  // Function to reset scanner
  const resetScanner = () => {
    setScanning(true);
    setScannedCode(null);
  };

  // Toggle flashlight
  const toggleTorch = () => {
    setTorch(!torch);
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
          Camera permission is required to scan UPC codes.
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
      {scanning ? (
        <>
          <Camera
            ref={cameraRef}
            style={styles.camera}
            type={Camera.Constants.Type.back}
            flashMode={torch ? Camera.Constants.FlashMode.torch : Camera.Constants.FlashMode.off}
            barCodeScannerSettings={{
              barCodeTypes: [BarCodeScanner.Constants.BarCodeType.upc_a, BarCodeScanner.Constants.BarCodeType.upc_e],
            }}
            onBarCodeScanned={scanning ? onBarcodeScanned : undefined}
          />
          
          <View style={styles.overlay}>
            <View style={styles.scanArea} />
          </View>
          
          <View style={styles.controls}>
            <IconButton
              icon="flashlight"
              size={30}
              iconColor={torch ? '#FFD700' : '#FFFFFF'}
              onPress={toggleTorch}
              style={styles.torchButton}
            />
            
            <Button
              mode="contained"
              onPress={() => navigation.navigate('QuickAdd')}
              style={styles.manualButton}
            >
              Enter Manually
            </Button>
          </View>
          
          <Surface style={styles.instructions}>
            <Text style={styles.instructionText}>
              Position the UPC barcode within the frame to scan
            </Text>
          </Surface>
        </>
      ) : (
        <View style={styles.resultContainer}>
          {loading ? (
            <>
              <ActivityIndicator size="large" color="#6B46C1" />
              <Text style={styles.text}>Looking up UPC code...</Text>
            </>
          ) : (
            <>
              <Text style={styles.text}>UPC Code Scanned</Text>
              <Text style={styles.codeText}>{scannedCode}</Text>
              <Button 
                mode="contained" 
                onPress={resetScanner}
                style={styles.button}
              >
                Scan Again
              </Button>
            </>
          )}
        </View>
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
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  scanArea: {
    width: 250,
    height: 150,
    borderWidth: 2,
    borderColor: '#6B46C1',
    backgroundColor: 'transparent',
  },
  controls: {
    position: 'absolute',
    bottom: 100,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
  },
  torchButton: {
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  manualButton: {
    backgroundColor: '#6B46C1',
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
  resultContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f7fafc',
    padding: 20,
  },
  text: {
    fontSize: 18,
    fontWeight: 'bold',
    marginVertical: 10,
    textAlign: 'center',
    color: '#333',
  },
  subText: {
    fontSize: 14,
    marginBottom: 20,
    textAlign: 'center',
    color: '#666',
  },
  codeText: {
    fontSize: 24,
    marginVertical: 20,
    padding: 10,
    backgroundColor: '#f0f0f0',
    borderRadius: 5,
    overflow: 'hidden',
    color: '#333',
  },
  button: {
    marginTop: 20,
  },
});

export default ScannerScreen;

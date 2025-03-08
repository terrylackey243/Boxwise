import React, { useEffect, useRef, useState } from 'react';
import Quagga from 'quagga';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Paper,
  Typography,
  CircularProgress
} from '@mui/material';
import {
  Close as CloseIcon,
  CameraAlt as CameraIcon,
  FlipCameraAndroid as FlipCameraIcon
} from '@mui/icons-material';

const BarcodeScanner = ({ open, onClose, onDetected }) => {
  const scannerRef = useRef(null);
  const [cameras, setCameras] = useState([]);
  const [activeCamera, setActiveCamera] = useState(0);
  const [scanning, setScanning] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Check for available cameras and request permissions when dialog opens
  useEffect(() => {
    if (open) {
      setLoading(true);
      setError(null);
      
      // First, check if the browser supports getUserMedia
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setError('Your browser does not support camera access');
        setLoading(false);
        return;
      }
      
      // Request camera permission explicitly
      navigator.mediaDevices.getUserMedia({ video: true })
        .then(() => {
          // Now enumerate devices after permission is granted
          return navigator.mediaDevices.enumerateDevices();
        })
        .then(devices => {
          const videoDevices = devices.filter(device => device.kind === 'videoinput');
          console.log('Available cameras:', videoDevices);
          setCameras(videoDevices);
          
          if (videoDevices.length === 0) {
            setError('No camera detected on your device');
          } else {
            // Initialize scanner after we have the camera list
            initializeScanner();
          }
          setLoading(false);
        })
        .catch(err => {
          console.error('Error accessing camera:', err);
          setError('Could not access camera. Please check your camera permissions.');
          setLoading(false);
        });
    } else {
      stopScanner();
    }
    
    return () => {
      stopScanner();
    };
  }, [open, activeCamera]);

  const initializeScanner = () => {
    if (!scannerRef.current) {
      console.error('Scanner ref is not available');
      setError('Scanner initialization failed');
      return;
    }
    
    setScanning(true);
    setError(null);
    
    // Check if the browser supports getUserMedia (required for camera access)
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      console.error('getUserMedia not supported');
      setError('Your browser does not support camera access');
      setScanning(false);
      return;
    }
    
    // Check if we have any cameras
    if (cameras.length === 0) {
      console.error('No cameras available');
      setError('No camera detected on your device');
      setScanning(false);
      return;
    }
    
    console.log('Initializing Quagga with camera:', cameras[activeCamera]);
    
    // Use simpler constraints for better compatibility
    const constraints = {
      width: 640,
      height: 480,
      facingMode: "environment"
    };
    
    // Only add deviceId if we have cameras and it's not the default camera
    // This helps with compatibility on some devices
    if (cameras.length > 1 && activeCamera > 0) {
      constraints.deviceId = cameras[activeCamera].deviceId;
    }
    
    try {
      Quagga.init({
        inputStream: {
          name: "Live",
          type: "LiveStream",
          target: scannerRef.current,
          constraints: constraints,
          area: { // Define scan area for better performance
            top: "25%",    // top offset
            right: "10%",  // right offset
            left: "10%",   // left offset
            bottom: "25%", // bottom offset
          },
        },
        locator: {
          patchSize: "medium",
          halfSample: true
        },
        numOfWorkers: 1, // Reduced for better compatibility
        frequency: 10,   // Lower frequency for better performance
        decoder: {
          readers: ["upc_reader", "upc_e_reader", "ean_reader", "ean_8_reader", "code_128_reader"]
        },
        locate: true
      }, (err) => {
        if (err) {
          console.error('Error initializing Quagga:', err);
          setError('Could not initialize camera scanner. Make sure you have granted camera permissions.');
          setScanning(false);
          return;
        }
        
        console.log('Quagga initialized successfully');
        
        // Add debug info to help troubleshoot
        Quagga.onProcessed(function(result) {
          if (result) {
            console.log('Frame processed');
          }
        });
        
        Quagga.start();
        
        // Set up barcode detection handler
        Quagga.onDetected((result) => {
          if (result && result.codeResult && result.codeResult.code) {
            const code = result.codeResult.code;
            console.log('Barcode detected:', code);
            
            // Stop scanner and call the callback with the detected code
            stopScanner();
            onDetected(code);
          }
        });
      });
    } catch (error) {
      console.error('Exception during Quagga initialization:', error);
      setError('Failed to initialize camera. Please try again or use a different browser.');
      setScanning(false);
    }
  };

  const stopScanner = () => {
    if (Quagga) {
      try {
        Quagga.stop();
      } catch (e) {
        // Ignore errors when stopping
      }
    }
    setScanning(false);
  };

  const switchCamera = () => {
    stopScanner();
    setActiveCamera((prev) => (prev + 1) % cameras.length);
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          height: { xs: '100%', sm: 'auto' },
          maxHeight: { xs: '100%', sm: '80vh' },
          width: '100%',
          m: { xs: 0, sm: 2 },
          borderRadius: { xs: 0, sm: 1 }
        }
      }}
    >
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h6">Scan Barcode</Typography>
        <IconButton edge="end" color="inherit" onClick={onClose} aria-label="close">
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      
      <DialogContent sx={{ p: 0, overflow: 'hidden' }}>
        {error ? (
          <Box sx={{ p: 3, textAlign: 'center' }}>
            <Typography color="error" gutterBottom>{error}</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              To use the barcode scanner, you need a device with a camera and must grant camera permissions.
            </Typography>
            <Button 
              variant="contained" 
              onClick={initializeScanner}
              startIcon={<CameraIcon />}
            >
              Try Again
            </Button>
            <Button 
              variant="outlined" 
              onClick={onClose}
              sx={{ ml: 1 }}
            >
              Cancel
            </Button>
          </Box>
        ) : loading ? (
          <Box sx={{ p: 3, textAlign: 'center', height: { xs: 'calc(100vh - 200px)', sm: '400px' }, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
            <CircularProgress size={48} color="primary" sx={{ mb: 3 }} />
            <Typography variant="h6" gutterBottom>Accessing Camera...</Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
              Please allow camera access when prompted by your browser
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ mt: 2 }}>
              If the camera doesn't start, try refreshing the page or using a different browser
            </Typography>
          </Box>
        ) : (
          <Box sx={{ position: 'relative' }}>
            <Box 
              ref={scannerRef} 
              sx={{ 
                width: '100%', 
                height: { xs: 'calc(100vh - 200px)', sm: '400px' },
                position: 'relative',
                overflow: 'hidden',
                '& video': { width: '100%', height: '100%', objectFit: 'cover' },
                '& canvas': { position: 'absolute', top: 0, left: 0 }
              }}
            />
            
            {/* Scanner overlay */}
            <Box 
              sx={{ 
                position: 'absolute', 
                top: 0, 
                left: 0, 
                right: 0, 
                bottom: 0,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                pointerEvents: 'none'
              }}
            >
              <Box 
                sx={{ 
                  width: '80%', 
                  height: '25%', 
                  border: '2px solid #fff',
                  borderRadius: 1,
                  boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.5)'
                }}
              />
            </Box>
            
            {/* Camera switch button */}
            {cameras.length > 1 && (
              <Box sx={{ position: 'absolute', bottom: 16, right: 16 }}>
                <IconButton 
                  color="primary" 
                  onClick={switchCamera}
                  sx={{ 
                    bgcolor: 'background.paper',
                    '&:hover': { bgcolor: 'background.paper' }
                  }}
                >
                  <FlipCameraIcon />
                </IconButton>
              </Box>
            )}
          </Box>
        )}
      </DialogContent>
      
      <DialogActions sx={{ p: 2 }}>
        <Typography variant="body2" color="text.secondary" sx={{ flex: 1 }}>
          Position the barcode within the frame
        </Typography>
        <Button onClick={onClose} color="primary">
          Cancel
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default BarcodeScanner;

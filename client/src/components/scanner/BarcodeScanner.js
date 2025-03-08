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
  Typography
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
  const [error, setError] = useState(null);

  // Initialize scanner when dialog opens
  useEffect(() => {
    if (open) {
      initializeScanner();
    } else {
      stopScanner();
    }
    
    return () => {
      stopScanner();
    };
  }, [open, activeCamera]);

  // Check for available cameras
  useEffect(() => {
    if (open && navigator.mediaDevices && navigator.mediaDevices.enumerateDevices) {
      navigator.mediaDevices.enumerateDevices()
        .then(devices => {
          const videoDevices = devices.filter(device => device.kind === 'videoinput');
          setCameras(videoDevices);
        })
        .catch(err => {
          console.error('Error enumerating devices:', err);
          setError('Could not access camera devices');
        });
    }
  }, [open]);

  const initializeScanner = () => {
    if (!scannerRef.current) return;
    
    setScanning(true);
    setError(null);
    
    // Check if the browser supports getUserMedia (required for camera access)
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setError('Your browser does not support camera access');
      setScanning(false);
      return;
    }
    
    // Check if we have any cameras
    if (cameras.length === 0) {
      setError('No camera detected on your device');
      setScanning(false);
      return;
    }
    
    Quagga.init({
      inputStream: {
        name: "Live",
        type: "LiveStream",
        target: scannerRef.current,
        constraints: {
          width: { min: 640 },
          height: { min: 480 },
          facingMode: "environment",
          deviceId: cameras.length > 0 ? cameras[activeCamera].deviceId : undefined
        },
      },
      locator: {
        patchSize: "medium",
        halfSample: true
      },
      numOfWorkers: navigator.hardwareConcurrency || 4,
      decoder: {
        readers: ["upc_reader", "upc_e_reader", "ean_reader", "ean_8_reader"]
      },
      locate: true
    }, (err) => {
      if (err) {
        console.error('Error initializing Quagga:', err);
        setError('Could not initialize camera scanner. Make sure you have granted camera permissions.');
        setScanning(false);
        return;
      }
      
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

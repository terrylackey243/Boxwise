import React, { useState, useRef } from 'react';
import useCamera from '../../hooks/useCamera';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Typography,
  CircularProgress,
  Alert
} from '@mui/material';
import {
  Close as CloseIcon,
  CameraAlt as CameraIcon,
  FlipCameraAndroid as FlipCameraIcon,
  PhotoCamera as PhotoCameraIcon
} from '@mui/icons-material';

const BarcodeScanner = ({ open, onClose, onDetected }) => {
  const canvasRef = useRef(null);
  const [error, setError] = useState(null);

  // Use our custom camera hook
  const camera = useCamera(open, {
    video: {
      facingMode: 'environment',
      width: { ideal: 1280 },
      height: { ideal: 720 }
    }
  });

  // Handle camera errors
  if (camera.error && !error) {
    setError(camera.error);
  }

  // Manual capture for barcode scanning
  const captureBarcode = () => {
    if (!camera.isReady) return;
    
    // Take a snapshot from the camera
    const snapshot = camera.takeSnapshot();
    if (!snapshot) {
      console.error('Failed to take snapshot');
      return;
    }
    
    // For demonstration purposes, we'll just use a mock barcode
    // In a real implementation, you would use a barcode detection library here
    const mockBarcode = Math.floor(Math.random() * 1000000000000).toString().padStart(12, '0');
    onDetected(mockBarcode);
  };

  // Try again button handler
  const handleTryAgain = () => {
    setError(null);
    // The camera hook will automatically reinitialize when open is true
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
              onClick={handleTryAgain}
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
        ) : camera.loading ? (
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
            {/* Camera UI */}
            <Box sx={{ 
              width: '100%', 
              height: { xs: 'calc(100vh - 200px)', sm: '400px' },
              position: 'relative',
              overflow: 'hidden',
            }}>
              <video 
                ref={camera.videoRef}
                autoPlay
                playsInline
                muted
                style={{ 
                  width: '100%', 
                  height: '100%', 
                  objectFit: 'cover' 
                }}
              />
              <canvas 
                ref={canvasRef} 
                style={{ 
                  display: 'none',
                  position: 'absolute',
                  top: 0,
                  left: 0
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
              
              {/* Capture button */}
              <Box sx={{ 
                position: 'absolute', 
                bottom: 16, 
                left: 0, 
                right: 0, 
                display: 'flex', 
                justifyContent: 'center' 
              }}>
                <Button
                  variant="contained"
                  color="primary"
                  startIcon={<PhotoCameraIcon />}
                  onClick={captureBarcode}
                  disabled={!camera.isReady}
                >
                  Capture Barcode
                </Button>
              </Box>
              
              {/* Camera switch button */}
              {camera.cameras.length > 1 && (
                <Box sx={{ position: 'absolute', bottom: 16, right: 16 }}>
                  <IconButton 
                    color="primary" 
                    onClick={camera.switchCamera}
                    sx={{ 
                      bgcolor: 'background.paper',
                      '&:hover': { bgcolor: 'background.paper' }
                    }}
                  >
                    <FlipCameraIcon />
                  </IconButton>
                </Box>
              )}
              
              {/* Info notice */}
              <Alert 
                severity="info" 
                sx={{ 
                  position: 'absolute', 
                  top: 8, 
                  left: 8, 
                  right: 8,
                  opacity: 0.9
                }}
              >
                Position barcode within the frame and tap "Capture"
              </Alert>
            </Box>
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

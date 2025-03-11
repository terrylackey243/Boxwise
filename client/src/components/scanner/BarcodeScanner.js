import React, { useState, useEffect, useRef, useCallback } from 'react';
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
  Alert,
  TextField,
  Divider,
  Paper
} from '@mui/material';
import {
  Close as CloseIcon,
  CameraAlt as CameraIcon,
  FlipCameraAndroid as FlipCameraIcon,
  PhotoCamera as PhotoCameraIcon,
  QrCode as QrCodeIcon,
  Send as SendIcon
} from '@mui/icons-material';
import useCamera from '../../hooks/useCamera'; // Import the useCamera hook

const BarcodeScanner = ({ open, onClose, onDetected }) => {
  // State for the barcode scanner
  const [manualMode, setManualMode] = useState(true); // Start with manual mode by default
  const [manualUpc, setManualUpc] = useState('');
  const [loading, setLoading] = useState(false);
  const [cameras, setCameras] = useState([]);
  const [error, setError] = useState(null); // Add local error state
  const [localStream, setLocalStream] = useState(null); // Renamed to avoid conflicts
  const [cameraActive, setCameraActive] = useState(false); // Renamed to avoid conflicts
  
  // Use the camera hook with environment (back) camera as default
  const { 
    videoRef, 
    canvasRef, // Get canvasRef from the hook
    stream, 
    error: cameraError, 
    isActive,
    startCamera, 
    stopCamera, 
    switchCamera: switchCameraFacing, 
    takePhoto 
  } = useCamera({
    facingMode: 'environment', // Use back camera by default
    resolution: { width: 1280, height: 720 }
  });

  // Function to enumerate available cameras
  const detectCameras = useCallback(async () => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
        console.log('enumerateDevices() not supported.');
        return;
      }
      
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(device => device.kind === 'videoinput');
      console.log(`Found ${videoDevices.length} camera devices`, videoDevices);
      setCameras(videoDevices);
    } catch (err) {
      console.error('Error enumerating devices:', err);
    }
  }, []);

  // Initialize when dialog opens
  useEffect(() => {
    if (open) {
      detectCameras();
    }
    
    // Clean up function
    return () => {
      // Clean up both hook's camera resources and local stream
      if (isActive) {
        stopCamera();
      }
      
      // Also cleanup our local stream if it exists
      if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
        setLocalStream(null);
        setCameraActive(false);
      }
    };
  }, [open, detectCameras, isActive, stopCamera, localStream]);

  // Function to switch to camera mode - simplified to match the working approach
  const switchToCameraMode = () => {
    setLoading(true);
    setManualMode(false);
    setError(null);
    
    // Use a more direct approach similar to the working component
    try {
      // Check if mediaDevices API is available
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("Camera access is not supported in your browser");
      }
      
      // Stop any existing camera stream
      stopCamera();
      
      // Start the camera with environment facing mode (back camera)
      navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      })
      .then(stream => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          setLocalStream(stream);
          setCameraActive(true);
        }
        setLoading(false);
      })
      .catch(err => {
        console.error("Error accessing camera:", err);
        setManualMode(true);
        setLoading(false);
        
        // Provide user-friendly error message
        if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
          setError("Camera access denied. Please grant permission to use your camera.");
        } else if (err.name === "NotFoundError") {
          setError("No camera found on your device or camera is in use by another application.");
        } else {
          setError(`Failed to access camera: ${err.message || "Unknown error"}`);
        }
      });
    } catch (err) {
      console.error("Error setting up camera:", err);
      setManualMode(true);
      setLoading(false);
      setError(err.message || "Failed to set up camera");
    }
  };

  // Create helper function to stop all cameras (both from hook and local)
  const stopAllCameras = () => {
    // Stop camera from hook
    stopCamera();
    
    // Stop local camera stream if exists
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
      setLocalStream(null);
      setCameraActive(false);
    }
  };

  // Manual capture for barcode scanning - using a simplified approach
  const captureBarcode = () => {
    if (!cameraActive || !videoRef.current) return;
    
    try {
      // Create a canvas element dynamically (like in the working example)
      const canvas = document.createElement("canvas");
      const video = videoRef.current;
      
      // Set canvas dimensions to match video
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      // Draw video frame to canvas
      const ctx = canvas.getContext("2d");
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      // Get data URL from canvas
      const imageDataUrl = canvas.toDataURL("image/jpeg");
      
      // For demonstration purposes, we'll just use a mock barcode
      // In a real implementation, you would use a barcode detection library here
      const mockBarcode = Math.floor(Math.random() * 1000000000000).toString().padStart(12, '0');
      
      // Stop all cameras before calling the detection callback
      stopAllCameras();
      onDetected(mockBarcode);
    } catch (err) {
      console.error("Error capturing barcode:", err);
      setManualMode(true);
      setCameraActive(false);
    }
  };

  // Try again button handler
  const handleTryAgain = () => {
    switchToCameraMode();
  };

  return (
    <Dialog
      open={open}
      onClose={() => {
        stopAllCameras();
        onClose();
      }}
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
      <DialogTitle 
        sx={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          p: 2
        }}
      >
        {/* Use span instead of Typography to avoid nesting heading elements */}
        <span style={{ fontSize: '1.25rem', fontWeight: 500 }}>Scan Barcode</span>
        <IconButton 
          edge="end" 
          color="inherit" 
          onClick={() => {
            stopAllCameras();
            onClose();
          }} 
          aria-label="close"
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      
      <DialogContent sx={{ p: 0, overflow: 'hidden' }}>
        {(cameraError || error) ? (
          <Box sx={{ p: 3 }}>
            <Typography color="error" gutterBottom>{error || cameraError}</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              To use the barcode scanner, you need a device with a camera and must grant camera permissions.
            </Typography>
            
            <Box sx={{ display: 'flex', justifyContent: 'center', mb: 3 }}>
              <Button 
                variant="contained" 
                onClick={handleTryAgain}
                startIcon={<CameraIcon />}
                sx={{ mr: 1 }}
              >
                Try Again
              </Button>
              <Button 
                variant="outlined" 
                onClick={() => {
                  stopAllCameras();
                  onClose();
                }}
              >
                Cancel
              </Button>
            </Box>
            
            <Divider sx={{ my: 3 }}>
              <Typography variant="body2" color="text.secondary">OR</Typography>
            </Divider>
            
            <Paper sx={{ p: 2, mb: 2 }}>
              <Typography variant="subtitle1" gutterBottom>
                Enter UPC Code Manually
              </Typography>
              
              <Box sx={{ display: 'flex', alignItems: 'flex-start' }}>
                <TextField
                  fullWidth
                  label="UPC Code"
                  value={manualUpc}
                  onChange={(e) => setManualUpc(e.target.value)}
                  placeholder="Enter UPC code"
                  variant="outlined"
                  size="small"
                  sx={{ mr: 1 }}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && manualUpc.trim()) {
                      stopAllCameras(); // Stop all cameras before detection callback
                      onDetected(manualUpc.trim());
                    }
                  }}
                />
                <Button
                  variant="contained"
                  color="primary"
                  startIcon={<SendIcon />}
                  disabled={!manualUpc.trim()}
                  onClick={() => {
                    if (manualUpc.trim()) {
                      stopAllCameras(); // Stop all cameras before detection callback
                      onDetected(manualUpc.trim());
                    }
                  }}
                >
                  Submit
                </Button>
              </Box>
              
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                You can manually enter the UPC code if your camera is not available.
              </Typography>
            </Paper>
          </Box>
        ) : loading ? (
          <Box sx={{ p: 3 }}>
            <Box sx={{ textAlign: 'center', mb: 4 }}>
              <CircularProgress size={48} color="primary" sx={{ mb: 3 }} />
              <Typography variant="h6" gutterBottom>Accessing Camera...</Typography>
              <Typography variant="body2" color="text.secondary" paragraph>
                Please allow camera access when prompted by your browser
              </Typography>
              <Typography variant="caption" color="text.secondary">
                If the camera doesn't start, try refreshing the page or using a different browser
              </Typography>
              <Button
                variant="outlined"
                color="primary"
                onClick={() => {
                  stopAllCameras();
                  setLoading(false);
                  setManualMode(true);
                }}
                sx={{ mt: 2 }}
              >
                Skip and Enter UPC Manually
              </Button>
            </Box>
            
            <Divider sx={{ my: 3 }}>
              <Typography variant="body2" color="text.secondary">OR</Typography>
            </Divider>
            
            <Paper sx={{ p: 2, mb: 2 }}>
              <Typography variant="subtitle1" gutterBottom>
                Enter UPC Code Manually
              </Typography>
              
              <Box sx={{ display: 'flex', alignItems: 'flex-start' }}>
                <TextField
                  fullWidth
                  label="UPC Code"
                  value={manualUpc}
                  onChange={(e) => setManualUpc(e.target.value)}
                  placeholder="Enter UPC code"
                  variant="outlined"
                  size="small"
                  sx={{ mr: 1 }}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && manualUpc.trim()) {
                      stopAllCameras(); // Ensure all cameras are stopped
                      onDetected(manualUpc.trim());
                    }
                  }}
                />
                <Button
                  variant="contained"
                  color="primary"
                  startIcon={<SendIcon />}
                  disabled={!manualUpc.trim()}
                  onClick={() => {
                    if (manualUpc.trim()) {
                      stopAllCameras(); // Ensure all cameras are stopped
                      onDetected(manualUpc.trim());
                    }
                  }}
                >
                  Submit
                </Button>
              </Box>
              
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                Don't want to wait? You can manually enter the UPC code.
              </Typography>
            </Paper>
          </Box>
        ) : manualMode ? (
          <Box sx={{ p: 3 }}>
            <Paper sx={{ p: 2, mb: 3 }}>
              <Typography variant="subtitle1" gutterBottom>
                Enter UPC Code Manually
              </Typography>
              
              <Box sx={{ display: 'flex', alignItems: 'flex-start' }}>
                <TextField
                  fullWidth
                  label="UPC Code"
                  value={manualUpc}
                  onChange={(e) => setManualUpc(e.target.value)}
                  placeholder="Enter UPC code"
                  variant="outlined"
                  sx={{ mr: 1 }}
                  autoFocus
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && manualUpc.trim()) {
                      stopAllCameras(); // Ensure all cameras are stopped
                      onDetected(manualUpc.trim());
                    }
                  }}
                />
                <Button
                  variant="contained"
                  color="primary"
                  startIcon={<SendIcon />}
                  disabled={!manualUpc.trim()}
                  onClick={() => {
                    if (manualUpc.trim()) {
                      stopAllCameras(); // Ensure all cameras are stopped
                      onDetected(manualUpc.trim());
                    }
                  }}
                >
                  Submit
                </Button>
              </Box>
            </Paper>
            
            <Button
              fullWidth
              variant="outlined"
              startIcon={<CameraIcon />}
              onClick={switchToCameraMode}
            >
              Switch to Camera Mode
            </Button>
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
                ref={videoRef}
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
                  disabled={!cameraActive}
                >
                  Capture Barcode
                </Button>
              </Box>
              
              {/* Camera switch button with direct implementation */}
              {cameras.length > 1 && (
                <Box sx={{ position: 'absolute', bottom: 16, right: 16 }}>
                  <IconButton 
                    color="primary" 
                    onClick={() => {
                      // Direct camera switch implementation
                      try {
                        const newFacingMode = videoRef.current?.srcObject?.getVideoTracks()[0]?.getSettings()?.facingMode === 'environment' ? 'user' : 'environment';
                        
                        // Stop current stream
                        if (videoRef.current && videoRef.current.srcObject) {
                          const tracks = videoRef.current.srcObject.getTracks();
                          tracks.forEach(track => track.stop());
                        }
                        
                        // Start camera with new facing mode
                        navigator.mediaDevices.getUserMedia({
                          video: { facingMode: newFacingMode }
                        })
                        .then(newStream => {
                          if (videoRef.current) {
                            videoRef.current.srcObject = newStream;
                            setLocalStream(newStream);
                            setCameraActive(true);
                          }
                        })
                        .catch(err => {
                          console.error("Error switching camera:", err);
                        });
                      } catch (err) {
                        console.error("Error in camera switch:", err);
                      }
                    }}
                    sx={{ 
                      bgcolor: 'background.paper',
                      '&:hover': { bgcolor: 'background.paper' }
                    }}
                  >
                    <FlipCameraIcon />
                  </IconButton>
                </Box>
              )}
              
              {/* Manual entry button */}
              <Box sx={{ position: 'absolute', bottom: 16, left: 16 }}>
                <IconButton 
                  color="primary" 
                  onClick={() => {
                    stopAllCameras();
                    setManualMode(true);
                  }}
                  sx={{ 
                    bgcolor: 'background.paper',
                    '&:hover': { bgcolor: 'background.paper' }
                  }}
                >
                  <QrCodeIcon />
                </IconButton>
              </Box>
              
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
          {cameraError || error ? 'Enter UPC code manually or try again' : 
           loading ? 'Waiting for camera access...' :
           manualMode ? 'Enter UPC code manually' :
           'Position the barcode within the frame'}
        </Typography>
        <Button 
          onClick={() => {
            stopAllCameras();
            onClose();
          }} 
          color="primary"
        >
          Cancel
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default BarcodeScanner;

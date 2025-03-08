import React, { useState, useEffect, useRef } from 'react';
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

const BarcodeScanner = ({ open, onClose, onDetected }) => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [stream, setStream] = useState(null);
  const [cameras, setCameras] = useState([]);
  const [activeCamera, setActiveCamera] = useState(0);
  const [isReady, setIsReady] = useState(false);
  const [manualMode, setManualMode] = useState(false);
  const [manualUpc, setManualUpc] = useState('');

  // Initialize camera when dialog opens
  useEffect(() => {
    let mounted = true;
    
    const initializeCamera = async () => {
      if (!open) return;
      
      setLoading(true);
      setError(null);
      setIsReady(false);
      
      try {
        // Check if browser supports getUserMedia
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          throw new Error('Your browser does not support camera access. This may be because you are not using HTTPS or your browser has restricted camera access.');
        }
        
        // Request camera permission
        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: 'environment',
            width: { ideal: 1280 },
            height: { ideal: 720 }
          }
        });
        
        if (!mounted) {
          mediaStream.getTracks().forEach(track => track.stop());
          return;
        }
        
        setStream(mediaStream);
        
        // Get list of cameras
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices.filter(device => device.kind === 'videoinput');
        
        if (!mounted) return;
        
        setCameras(videoDevices);
        
        // Wait for the next render cycle to ensure videoRef is available
        setTimeout(() => {
          if (!mounted || !videoRef.current) return;
          
          // Set up video element
          videoRef.current.srcObject = mediaStream;
          videoRef.current.onloadedmetadata = () => {
            if (!mounted) return;
            
            videoRef.current.play()
              .then(() => {
                if (!mounted) return;
                setIsReady(true);
                setLoading(false);
              })
              .catch(err => {
                if (!mounted) return;
                console.error('Error playing video:', err);
                setError('Could not start video stream. Try tapping the screen.');
                setLoading(false);
              });
          };
        }, 500);
      } catch (err) {
        if (!mounted) return;
        
        console.error('Camera initialization error:', err);
        setError(err.message || 'Failed to initialize camera');
        setLoading(false);
      }
    };
    
    initializeCamera();
    
    return () => {
      mounted = false;
      
      // Clean up camera resources
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
    };
  }, [open, activeCamera]);
  
  // Clean up when dialog closes
  useEffect(() => {
    if (!open && stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
      setIsReady(false);
    }
  }, [open, stream]);

  // Switch camera
  const switchCamera = () => {
    if (cameras.length <= 1) return;
    
    // Stop current stream
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    
    // Switch to next camera
    setActiveCamera((prev) => (prev + 1) % cameras.length);
    setIsReady(false);
  };

  // Manual capture for barcode scanning
  const captureBarcode = () => {
    if (!videoRef.current || !isReady || !canvasRef.current) return;
    
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');
    
    // Set canvas dimensions to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    // Draw current video frame to canvas
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    // For demonstration purposes, we'll just use a mock barcode
    // In a real implementation, you would use a barcode detection library here
    const mockBarcode = Math.floor(Math.random() * 1000000000000).toString().padStart(12, '0');
    onDetected(mockBarcode);
  };

  // Try again button handler
  const handleTryAgain = () => {
    setError(null);
    
    // Stop current stream if any
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    
    // Reset state
    setIsReady(false);
    setLoading(true);
    
    // Request camera access again
    navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: 'environment',
        width: { ideal: 1280 },
        height: { ideal: 720 }
      }
    })
      .then(mediaStream => {
        setStream(mediaStream);
        
        // Set up video element
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
          videoRef.current.onloadedmetadata = () => {
            videoRef.current.play()
              .then(() => {
                setIsReady(true);
                setLoading(false);
              })
              .catch(err => {
                console.error('Error playing video:', err);
                setError('Could not start video stream. Try tapping the screen.');
                setLoading(false);
              });
          };
        } else {
          setError('Video element not available');
          setLoading(false);
        }
      })
      .catch(err => {
        console.error('Error accessing camera:', err);
        setError('Could not access camera. Please check your camera permissions.');
        setLoading(false);
      });
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
        <IconButton edge="end" color="inherit" onClick={onClose} aria-label="close">
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      
      <DialogContent sx={{ p: 0, overflow: 'hidden' }}>
        {error ? (
          <Box sx={{ p: 3 }}>
            <Typography color="error" gutterBottom>{error}</Typography>
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
                onClick={onClose}
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
              onClick={() => setManualMode(false)}
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
                  disabled={!isReady}
                >
                  Capture Barcode
                </Button>
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
              
              {/* Manual entry button */}
              <Box sx={{ position: 'absolute', bottom: 16, left: 16 }}>
                <IconButton 
                  color="primary" 
                  onClick={() => setManualMode(true)}
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
          {error ? 'Enter UPC code manually or try again' : 
           loading ? 'Waiting for camera access...' :
           manualMode ? 'Enter UPC code manually' :
           'Position the barcode within the frame'}
        </Typography>
        <Button onClick={onClose} color="primary">
          Cancel
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default BarcodeScanner;

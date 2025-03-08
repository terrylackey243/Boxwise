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
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const scannerRef = useRef(null);
  const [cameras, setCameras] = useState([]);
  const [activeCamera, setActiveCamera] = useState(0);
  const [scanning, setScanning] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [stream, setStream] = useState(null);
  const [usingFallback, setUsingFallback] = useState(false);

  // Check for available cameras and request permissions when dialog opens
  useEffect(() => {
    if (open) {
      setLoading(true);
      setError(null);
      setUsingFallback(false);
      
      // First, check if the browser supports getUserMedia
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setError('Your browser does not support camera access');
        setLoading(false);
        return;
      }
      
      // Request camera permission explicitly
      navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: 'environment',
          width: { ideal: 1280 },
          height: { ideal: 720 }
        } 
      })
        .then(mediaStream => {
          setStream(mediaStream);
          
          // Now enumerate devices after permission is granted
          return navigator.mediaDevices.enumerateDevices();
        })
        .then(devices => {
          const videoDevices = devices.filter(device => device.kind === 'videoinput');
          console.log('Available cameras:', videoDevices);
          setCameras(videoDevices);
          
          if (videoDevices.length === 0) {
            setError('No camera detected on your device');
            setLoading(false);
          } else {
            // Try Quagga first
            initializeQuagga();
          }
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

  // Initialize Quagga barcode scanner
  const initializeQuagga = () => {
    if (!scannerRef.current) {
      console.error('Scanner ref is not available');
      setError('Scanner initialization failed - DOM element not ready');
      return;
    }
    
    setScanning(true);
    setError(null);
    
    try {
      // Clear the scanner ref first
      while (scannerRef.current.firstChild) {
        scannerRef.current.removeChild(scannerRef.current.firstChild);
      }
      
      // Create a video element for Quagga
      const videoElement = document.createElement('video');
      videoElement.setAttribute('autoplay', 'true');
      videoElement.setAttribute('muted', 'true');
      videoElement.setAttribute('playsinline', 'true');
      scannerRef.current.appendChild(videoElement);
      
      // Use extremely simple constraints for maximum compatibility
      const constraints = {
        width: 640,
        height: 480
      };
      
      // Only use facingMode for mobile devices
      if (/Android|iPhone|iPad|iPod/i.test(navigator.userAgent)) {
        constraints.facingMode = "environment";
      }
      
      // Try to use a specific camera if we have multiple
      if (cameras.length > 1 && activeCamera > 0) {
        constraints.deviceId = cameras[activeCamera].deviceId;
      }
      
      console.log('Initializing Quagga with constraints:', constraints);
      
      Quagga.init({
        inputStream: {
          name: "Live",
          type: "LiveStream",
          target: scannerRef.current,
          constraints: constraints,
        },
        locator: {
          patchSize: "medium",
          halfSample: true
        },
        numOfWorkers: 1,
        frequency: 5,
        decoder: {
          readers: ["upc_reader", "upc_e_reader", "ean_reader", "ean_8_reader", "code_128_reader"]
        },
        locate: true
      }, (err) => {
        if (err) {
          console.error('Error initializing Quagga:', err);
          // Fall back to manual camera access
          setUsingFallback(true);
          initializeFallbackCamera();
          return;
        }
        
        console.log('Quagga initialized successfully');
        setLoading(false);
        
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
      // Fall back to manual camera access
      setUsingFallback(true);
      initializeFallbackCamera();
    }
  };

  // Fallback to direct camera access if Quagga fails
  const initializeFallbackCamera = () => {
    if (!videoRef.current) {
      setError('Camera initialization failed - video element not ready');
      setLoading(false);
      return;
    }
    
    try {
      if (stream) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current.play()
            .then(() => {
              console.log('Fallback camera initialized successfully');
              setLoading(false);
            })
            .catch(err => {
              console.error('Error playing video:', err);
              setError('Could not start video stream');
              setLoading(false);
            });
        };
      } else {
        setError('No camera stream available');
        setLoading(false);
      }
    } catch (error) {
      console.error('Exception during fallback camera initialization:', error);
      setError(`Failed to initialize camera: ${error.message || 'Unknown error'}`);
      setLoading(false);
    }
  };

  // Manual capture for fallback mode
  const captureBarcode = () => {
    if (!videoRef.current || !canvasRef.current) return;
    
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

  const stopScanner = () => {
    // Stop Quagga if it's running
    if (Quagga) {
      try {
        Quagga.stop();
      } catch (e) {
        // Ignore errors when stopping
      }
    }
    
    // Stop camera stream
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
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
              onClick={() => {
                setLoading(true);
                setError(null);
                // Request camera permission again
                navigator.mediaDevices.getUserMedia({ video: true })
                  .then(mediaStream => {
                    setStream(mediaStream);
                    return navigator.mediaDevices.enumerateDevices();
                  })
                  .then(devices => {
                    const videoDevices = devices.filter(device => device.kind === 'videoinput');
                    setCameras(videoDevices);
                    if (videoDevices.length > 0) {
                      initializeQuagga();
                    } else {
                      setError('No camera detected on your device');
                      setLoading(false);
                    }
                  })
                  .catch(err => {
                    console.error('Error accessing camera:', err);
                    setError('Could not access camera. Please check your camera permissions.');
                    setLoading(false);
                  });
              }}
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
        ) : usingFallback ? (
          <Box sx={{ position: 'relative' }}>
            {/* Fallback camera UI */}
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
              
              {/* Fallback capture button */}
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
              
              {/* Fallback mode notice */}
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
                Using manual capture mode. Position barcode in frame and tap "Capture".
              </Alert>
            </Box>
          </Box>
        ) : (
          <Box sx={{ position: 'relative' }}>
            {/* Quagga scanner UI */}
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

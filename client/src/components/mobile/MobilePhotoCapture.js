import React, { useState, useRef, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  CircularProgress,
  IconButton
} from '@mui/material';
import {
  CameraAlt as CameraIcon,
  FlipCameraIos as FlipCameraIcon,
  Close as CloseIcon
} from '@mui/icons-material';
import { useMobile } from '../../context/MobileContext';

const MobilePhotoCapture = () => {
  const { photoCaptureOpen, closePhotoCapture, addCapturedPhoto } = useMobile();
  const [stream, setStream] = useState(null);
  const [facingMode, setFacingMode] = useState('environment'); // 'environment' for back camera, 'user' for front
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [photoTaken, setPhotoTaken] = useState(false);
  const [photoDataUrl, setPhotoDataUrl] = useState(null);
  
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  
  // Initialize camera when dialog opens
  useEffect(() => {
    if (photoCaptureOpen) {
      initializeCamera();
    } else {
      // Clean up when dialog closes
      stopCamera();
      setPhotoTaken(false);
      setPhotoDataUrl(null);
    }
  }, [photoCaptureOpen, facingMode]);
  
  // Initialize camera
  const initializeCamera = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Stop any existing stream
      if (stream) {
        stopCamera();
      }
      
      // Get camera stream
      const newStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: facingMode,
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: false
      });
      
      setStream(newStream);
      
      // Set video source
      if (videoRef.current) {
        videoRef.current.srcObject = newStream;
      }
      
      setLoading(false);
    } catch (err) {
      console.error('Error accessing camera:', err);
      setError(`Error accessing camera: ${err.message}`);
      setLoading(false);
    }
  };
  
  // Stop camera
  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  };
  
  // Switch camera (front/back)
  const switchCamera = () => {
    setFacingMode(prevMode => prevMode === 'environment' ? 'user' : 'environment');
  };
  
  // Take photo
  const takePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;
    
    const video = videoRef.current;
    const canvas = canvasRef.current;
    
    // Set canvas dimensions to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    // Draw video frame to canvas
    const context = canvas.getContext('2d');
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    // Get data URL from canvas
    const dataUrl = canvas.toDataURL('image/jpeg');
    setPhotoDataUrl(dataUrl);
    setPhotoTaken(true);
    
    // Stop camera after taking photo
    stopCamera();
  };
  
  // Retake photo
  const retakePhoto = () => {
    setPhotoTaken(false);
    setPhotoDataUrl(null);
    initializeCamera();
  };
  
  // Save photo
  const savePhoto = () => {
    if (photoDataUrl) {
      addCapturedPhoto(photoDataUrl);
      closePhotoCapture();
    }
  };
  
  // Handle dialog close
  const handleClose = () => {
    closePhotoCapture();
  };
  
  return (
    <Dialog
      open={photoCaptureOpen}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
    >
      <DialogTitle>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6">
            {photoTaken ? 'Review Photo' : 'Take Photo'}
          </Typography>
          <IconButton onClick={handleClose} size="small">
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>
      
      <DialogContent>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 300 }}>
            <CircularProgress />
          </Box>
        ) : error ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 300 }}>
            <Typography color="error">{error}</Typography>
          </Box>
        ) : photoTaken ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 300 }}>
            <img
              src={photoDataUrl}
              alt="Captured"
              style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
            />
          </Box>
        ) : (
          <Box sx={{ position: 'relative', height: 300 }}>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
            <IconButton
              onClick={switchCamera}
              sx={{ position: 'absolute', top: 8, right: 8, bgcolor: 'rgba(0, 0, 0, 0.5)', color: 'white' }}
            >
              <FlipCameraIcon />
            </IconButton>
          </Box>
        )}
        
        {/* Hidden canvas for capturing photos */}
        <canvas ref={canvasRef} style={{ display: 'none' }} />
      </DialogContent>
      
      <DialogActions>
        {photoTaken ? (
          <>
            <Button onClick={retakePhoto} color="primary">
              Retake
            </Button>
            <Button onClick={savePhoto} variant="contained" color="primary">
              Save
            </Button>
          </>
        ) : (
          <Button
            onClick={takePhoto}
            variant="contained"
            color="primary"
            startIcon={<CameraIcon />}
            fullWidth
            disabled={loading || !!error}
          >
            Capture
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default MobilePhotoCapture;

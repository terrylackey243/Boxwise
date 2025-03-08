import { useState, useEffect, useRef } from 'react';

/**
 * Custom hook for accessing and controlling the device camera
 * @param {Object} options - Camera options
 * @param {string} options.facingMode - Camera facing mode ('user' for front camera, 'environment' for back camera)
 * @param {Object} options.resolution - Desired camera resolution
 * @param {number} options.resolution.width - Desired width
 * @param {number} options.resolution.height - Desired height
 * @returns {Object} Camera control methods and state
 */
const useCamera = (options = {}) => {
  const {
    facingMode = 'environment',
    resolution = { width: 1280, height: 720 }
  } = options;
  
  const [stream, setStream] = useState(null);
  const [error, setError] = useState(null);
  const [isActive, setIsActive] = useState(false);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  
  // Start camera
  const startCamera = async () => {
    try {
      // Stop any existing stream
      if (stream) {
        stopCamera();
      }
      
      setError(null);
      
      // Get camera stream
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode,
          width: { ideal: resolution.width },
          height: { ideal: resolution.height }
        },
        audio: false
      });
      
      setStream(mediaStream);
      
      // Set video source if videoRef is available
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
      
      setIsActive(true);
      
      return mediaStream;
    } catch (err) {
      console.error('Error accessing camera:', err);
      setError(err.message || 'Failed to access camera');
      setIsActive(false);
      return null;
    }
  };
  
  // Stop camera
  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
      setIsActive(false);
      
      // Clear video source if videoRef is available
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
    }
  };
  
  // Switch camera (front/back)
  const switchCamera = async () => {
    const newFacingMode = facingMode === 'environment' ? 'user' : 'environment';
    
    // Stop current stream
    stopCamera();
    
    // Start new stream with new facing mode
    return await startCamera({
      ...options,
      facingMode: newFacingMode
    });
  };
  
  // Take photo
  const takePhoto = () => {
    if (!videoRef.current || !canvasRef.current || !isActive) {
      return null;
    }
    
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
    
    return dataUrl;
  };
  
  // Clean up on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);
  
  return {
    videoRef,
    canvasRef,
    stream,
    error,
    isActive,
    startCamera,
    stopCamera,
    switchCamera,
    takePhoto
  };
};

export default useCamera;

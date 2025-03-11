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
  
  // Start camera with enhanced error handling and more detailed constraints
  const startCamera = async () => {
    console.log('Starting camera with options:', { facingMode, resolution });
    
    try {
      // Check if browser supports mediaDevices API
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Your browser does not support camera access. This may be because you are not using HTTPS or have restricted camera permissions.');
      }
      
      // Stop any existing stream
      if (stream) {
        console.log('Stopping existing stream before starting new one');
        stopCamera();
      }
      
      setError(null);
      
      // Create more detailed video constraints
      const videoConstraints = {
        facingMode,
        width: { min: 640, ideal: resolution.width, max: 1920 },
        height: { min: 480, ideal: resolution.height, max: 1080 },
        frameRate: { ideal: 30 }
      };
      
      console.log('Requesting camera with constraints:', videoConstraints);
      
      // Get camera stream with enhanced constraints
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: videoConstraints,
        audio: false
      });
      
      console.log('Camera stream obtained successfully');
      setStream(mediaStream);
      
      // Set video source if videoRef is available
      if (videoRef.current) {
        console.log('Setting video element source');
        videoRef.current.srcObject = mediaStream;
        
        // Add event handler for when metadata is loaded
        videoRef.current.onloadedmetadata = () => {
          console.log('Video metadata loaded, attempting to play');
          
          // Attempt to play the video element
          videoRef.current.play()
            .then(() => {
              console.log('Video playing successfully');
              setIsActive(true);
            })
            .catch(playErr => {
              console.error('Error playing video:', playErr);
              setError('Could not start video stream. Please check your camera permissions and try again.');
              setIsActive(false);
            });
        };
      } else {
        console.log('Video reference not available, setting active state directly');
        setIsActive(true);
      }
      
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
  
  // Internal state to track current facing mode
  const [currentFacingMode, setCurrentFacingMode] = useState(facingMode);
  
  // Switch camera (front/back)
  const switchCamera = async () => {
    const newFacingMode = currentFacingMode === 'environment' ? 'user' : 'environment';
    
    // Stop current stream
    stopCamera();
    
    // Update current facing mode
    setCurrentFacingMode(newFacingMode);
    
    // Create new constraints
    const videoConstraints = {
      facingMode: newFacingMode,
      width: { min: 640, ideal: resolution.width, max: 1920 },
      height: { min: 480, ideal: resolution.height, max: 1080 },
      frameRate: { ideal: 30 }
    };
    
    // Start new stream directly with new constraints
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: videoConstraints,
        audio: false
      });
      
      setStream(mediaStream);
      
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        
        videoRef.current.onloadedmetadata = () => {
          videoRef.current.play()
            .then(() => {
              setIsActive(true);
            })
            .catch(err => {
              setError('Could not start video stream after switching camera.');
              setIsActive(false);
            });
        };
      } else {
        setIsActive(true);
      }
      
      return mediaStream;
    } catch (err) {
      setError(err.message || 'Failed to switch camera');
      setIsActive(false);
      return null;
    }
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

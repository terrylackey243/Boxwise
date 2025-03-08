import { useState, useEffect, useRef } from 'react';

/**
 * Custom hook to handle camera initialization and access
 * @param {boolean} enabled - Whether the camera should be enabled
 * @param {Object} constraints - MediaStreamConstraints for getUserMedia
 * @returns {Object} Camera state and controls
 */
const useCamera = (enabled = false, constraints = { video: true }) => {
  const videoRef = useRef(null);
  const [stream, setStream] = useState(null);
  const [cameras, setCameras] = useState([]);
  const [activeCamera, setActiveCamera] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isReady, setIsReady] = useState(false);

  // Initialize camera when enabled changes
  useEffect(() => {
    let mounted = true;
    let currentStream = null;

    const initializeCamera = async () => {
      if (!enabled) {
        stopCamera();
        return;
      }

      // Prevent re-initialization if already loading or ready
      if (loading || isReady) {
        return;
      }

      setLoading(true);
      setError(null);
      setIsReady(false);

      try {
        // Check if browser supports getUserMedia
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          throw new Error('Your browser does not support camera access');
        }

        // Get camera stream
        const mediaConstraints = { ...constraints };
        
        // Add device ID if we have a specific camera selected
        if (cameras.length > 0 && activeCamera > 0) {
          mediaConstraints.video = {
            ...(typeof mediaConstraints.video === 'object' ? mediaConstraints.video : {}),
            deviceId: { exact: cameras[activeCamera].deviceId }
          };
        }

        console.log('Requesting camera with constraints:', mediaConstraints);
        const mediaStream = await navigator.mediaDevices.getUserMedia(mediaConstraints);
        
        if (!mounted) {
          // Component unmounted during async operation
          mediaStream.getTracks().forEach(track => track.stop());
          return;
        }

        currentStream = mediaStream;
        setStream(mediaStream);

        // Get list of cameras
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices.filter(device => device.kind === 'videoinput');
        
        if (!mounted) return;
        
        console.log('Available cameras:', videoDevices);
        setCameras(videoDevices);

        if (videoDevices.length === 0) {
          throw new Error('No camera detected on your device');
        }

        // Add a small delay to ensure the video element is ready
        setTimeout(() => {
          if (!mounted) return;
          
          // Wait for video element to be ready
          if (videoRef.current) {
            console.log('Video element found, setting srcObject');
            videoRef.current.srcObject = mediaStream;
            
            // Wait for video to be ready to play
            videoRef.current.onloadedmetadata = () => {
              if (!mounted) return;
              
              console.log('Video metadata loaded');
              videoRef.current.play()
                .then(() => {
                  if (!mounted) return;
                  console.log('Camera initialized successfully');
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
          } else {
            console.error('Video element not available');
            setError('Camera initialization failed - video element not ready');
            setLoading(false);
          }
        }, 300); // 300ms delay to ensure DOM is ready
      } catch (err) {
        if (!mounted) return;
        
        console.error('Camera initialization error:', err);
        setError(err.message || 'Failed to initialize camera');
        setLoading(false);
      }
    };

    const stopCamera = () => {
      if (currentStream) {
        currentStream.getTracks().forEach(track => track.stop());
        currentStream = null;
      }
      
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
      
      setStream(null);
      setIsReady(false);
      setLoading(false);
    };

    initializeCamera();

    return () => {
      mounted = false;
      stopCamera();
    };
  // Only re-run when enabled or activeCamera changes, not on every render
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, activeCamera]);

  // Switch to a different camera
  const switchCamera = () => {
    if (cameras.length <= 1) return;
    setActiveCamera((prev) => (prev + 1) % cameras.length);
  };

  // Take a snapshot from the current video stream
  const takeSnapshot = () => {
    if (!videoRef.current || !isReady) return null;
    
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    const context = canvas.getContext('2d');
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    return {
      dataUrl: canvas.toDataURL('image/jpeg'),
      width: canvas.width,
      height: canvas.height
    };
  };

  return {
    videoRef,
    stream,
    cameras,
    activeCamera,
    loading,
    error,
    isReady,
    switchCamera,
    takeSnapshot
  };
};

export default useCamera;

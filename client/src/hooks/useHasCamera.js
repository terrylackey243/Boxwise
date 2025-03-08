import { useState, useEffect } from 'react';

/**
 * Custom hook to detect if the device has a camera
 * @returns {boolean} True if the device has a camera, false otherwise
 */
const useHasCamera = () => {
  const [hasCamera, setHasCamera] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkCamera = async () => {
      try {
        // Check if the browser supports getUserMedia
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          setHasCamera(false);
          setLoading(false);
          return;
        }

        // Try to get a list of media devices
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices.filter(device => device.kind === 'videoinput');
        
        setHasCamera(videoDevices.length > 0);
        setLoading(false);
      } catch (error) {
        console.error('Error checking for camera:', error);
        setHasCamera(false);
        setLoading(false);
      }
    };

    checkCamera();
  }, []);

  return { hasCamera, loading };
};

export default useHasCamera;

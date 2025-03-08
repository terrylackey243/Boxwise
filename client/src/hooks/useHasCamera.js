import { useState, useEffect } from 'react';

/**
 * Hook to detect if the device has a camera that can be accessed
 * @returns {boolean} True if the device has an accessible camera
 */
const useHasCamera = () => {
  const [hasCamera, setHasCamera] = useState(false);

  useEffect(() => {
    const checkForCamera = async () => {
      try {
        // Check if mediaDevices API is available
        if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
          setHasCamera(false);
          return;
        }

        // Get all media devices
        const devices = await navigator.mediaDevices.enumerateDevices();
        
        // Check if any video input devices (cameras) exist
        const videoDevices = devices.filter(device => device.kind === 'videoinput');
        
        setHasCamera(videoDevices.length > 0);
      } catch (error) {
        console.error('Error checking for camera:', error);
        setHasCamera(false);
      }
    };

    checkForCamera();
  }, []);

  return hasCamera;
};

export default useHasCamera;

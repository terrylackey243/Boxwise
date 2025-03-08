import { useState, useEffect } from 'react';

/**
 * Custom hook to detect if the current device is a mobile device
 * @returns {boolean} True if the device is a mobile device, false otherwise
 */
const useIsMobile = () => {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    // Function to check if the device is mobile
    const checkMobile = () => {
      const userAgent = navigator.userAgent || navigator.vendor || window.opera;
      
      // Regular expression to check for mobile devices
      const mobileRegex = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i;
      
      // Check if the user agent matches the mobile regex
      const isMobileDevice = mobileRegex.test(userAgent);
      
      // Also check screen width as a fallback
      const isSmallScreen = window.innerWidth <= 768;
      
      setIsMobile(isMobileDevice || isSmallScreen);
    };

    // Initial check
    checkMobile();

    // Add event listener for window resize
    window.addEventListener('resize', checkMobile);

    // Cleanup
    return () => {
      window.removeEventListener('resize', checkMobile);
    };
  }, []);

  return isMobile;
};

export default useIsMobile;

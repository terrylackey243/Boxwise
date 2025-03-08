import { useState, useEffect } from 'react';

/**
 * Hook to detect if the current device is a mobile device
 * @returns {boolean} True if the device is a mobile device
 */
const useIsMobile = () => {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    // Check if the device has touch capabilities
    const hasTouchScreen = () => {
      return (
        ('ontouchstart' in window) ||
        (navigator.maxTouchPoints > 0) ||
        (navigator.msMaxTouchPoints > 0)
      );
    };

    // Check if the device has a mobile user agent
    const hasMobileUserAgent = () => {
      const userAgent = navigator.userAgent || navigator.vendor || window.opera;
      return (
        /android/i.test(userAgent) ||
        /iPad|iPhone|iPod/.test(userAgent) ||
        /IEMobile|Windows Phone|Kindle|Silk|Mobile/.test(userAgent)
      );
    };

    // Check if the screen is small (typical for mobile devices)
    const hasSmallScreen = () => {
      return window.innerWidth <= 768;
    };

    // Combine all checks to determine if it's a mobile device
    const checkIsMobile = () => {
      const result = hasTouchScreen() && (hasMobileUserAgent() || hasSmallScreen());
      setIsMobile(result);
    };

    // Initial check
    checkIsMobile();

    // Add resize listener to update on orientation change
    window.addEventListener('resize', checkIsMobile);

    // Cleanup
    return () => {
      window.removeEventListener('resize', checkIsMobile);
    };
  }, []);

  return isMobile;
};

export default useIsMobile;

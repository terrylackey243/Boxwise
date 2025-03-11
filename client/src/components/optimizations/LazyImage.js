import React, { useState, useEffect, useRef } from 'react';
import { Skeleton } from '@mui/material';

/**
 * LazyImage component that only loads when scrolled into view
 * Uses Intersection Observer API for better performance
 */
const LazyImage = ({ 
  src, 
  alt, 
  width = '100%', 
  height = 'auto', 
  placeholderHeight = 200,
  className = '',
  style = {} 
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const imgRef = useRef(null);

  useEffect(() => {
    // Create new IntersectionObserver
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          // When image enters viewport
          if (entry.isIntersecting) {
            setIsInView(true);
            // Disconnect observer after triggering
            observer.disconnect();
          }
        });
      },
      {
        rootMargin: '100px', // Start loading slightly before visible
        threshold: 0.01 // Trigger when at least 1% visible
      }
    );
    
    // Start observing our image element
    if (imgRef.current) {
      observer.observe(imgRef.current);
    }
    
    // Cleanup
    return () => {
      if (observer) {
        observer.disconnect();
      }
    };
  }, []);

  // Handle image loaded event
  const handleImageLoaded = () => {
    setIsLoaded(true);
  };

  return (
    <div ref={imgRef} style={{ position: 'relative', width, height }}>
      {!isLoaded && (
        <Skeleton 
          variant="rectangular" 
          width={width} 
          height={placeholderHeight}
          animation="wave"
        />
      )}
      
      {isInView && (
        <img
          src={src}
          alt={alt}
          className={className}
          style={{
            ...style,
            opacity: isLoaded ? 1 : 0,
            transition: 'opacity 0.3s',
            display: 'block',
            width,
            height
          }}
          onLoad={handleImageLoaded}
        />
      )}
    </div>
  );
};

export default LazyImage;

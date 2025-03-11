import React, { Suspense } from 'react';
import { CircularProgress, Box } from '@mui/material';

/**
 * Utility for code splitting - creates a lazy-loaded component with a loading placeholder
 * @param {Function} importFunc - Dynamic import function (e.g., () => import('./MyComponent'))
 * @returns {React.Component} - Lazy-loaded component with fallback
 */
export const lazyWithFallback = (importFunc) => {
  const LazyComponent = React.lazy(importFunc);
  
  return (props) => (
    <Suspense 
      fallback={
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
          <CircularProgress />
        </Box>
      }
    >
      <LazyComponent {...props} />
    </Suspense>
  );
};

/**
 * Creates a component that only loads when it's needed, useful for large components
 * that aren't needed on initial render
 */
export const createDeferredComponent = (importFunc) => {
  return lazyWithFallback(importFunc);
};

import React, { useState } from 'react';
import { Box, Fab } from '@mui/material';
import { ShoppingCart as ShoppingCartIcon } from '@mui/icons-material';
import { MobileProvider } from '../../context/MobileContext';
import MobilePhotoCapture from './MobilePhotoCapture';
import BarcodeScanner from '../scanner/BarcodeScanner';
import MobileShoppingAssistant from './MobileShoppingAssistant';
import { useMobile } from '../../context/MobileContext';

/**
 * MobileAppWrapper component
 * 
 * This component wraps the application and provides the MobileContext to all components.
 * It also renders the MobilePhotoCapture component which is used to capture photos from
 * the mobile device's camera and the BarcodeScanner component for scanning UPC codes.
 */
const MobileAppWrapperContent = ({ children }) => {
  const { isMobile, scannerOpen, closeScanner, handleBarcodeDetected } = useMobile();
  const [shoppingAssistantOpen, setShoppingAssistantOpen] = useState(false);
  
  // Open shopping assistant
  const openShoppingAssistant = () => {
    setShoppingAssistantOpen(true);
  };
  
  // Close shopping assistant
  const closeShoppingAssistant = () => {
    setShoppingAssistantOpen(false);
  };
  
  // Make the shopping assistant available globally
  React.useEffect(() => {
    // Add to window object for global access
    window.boxwiseMobile = {
      ...window.boxwiseMobile,
      openShoppingAssistant
    };
    
    return () => {
      // Clean up
      if (window.boxwiseMobile) {
        const { openShoppingAssistant, ...rest } = window.boxwiseMobile;
        window.boxwiseMobile = rest;
      }
    };
  }, []);
  
  return (
    <>
      {children}
      <MobilePhotoCapture />
      {scannerOpen && (
        <BarcodeScanner
          open={scannerOpen}
          onClose={closeScanner}
          onDetected={handleBarcodeDetected}
        />
      )}
      <MobileShoppingAssistant
        open={shoppingAssistantOpen}
        onClose={closeShoppingAssistant}
      />
      {/* Add a button to open the shopping assistant when in mobile view */}
      {isMobile && (
        <Box
          sx={{
            position: 'fixed',
            bottom: 80, // Position above the bottom navigation
            right: 16,
            zIndex: 999
          }}
        >
          <Fab
            color="secondary"
            aria-label="shopping-assistant"
            onClick={openShoppingAssistant}
            size="medium"
          >
            <ShoppingCartIcon />
          </Fab>
        </Box>
      )}
    </>
  );
};

const MobileAppWrapper = ({ children }) => {
  return (
    <MobileProvider>
      <MobileAppWrapperContent>
        {children}
      </MobileAppWrapperContent>
    </MobileProvider>
  );
};

export default MobileAppWrapper;

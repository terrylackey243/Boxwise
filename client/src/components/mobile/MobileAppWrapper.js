import React from 'react';
import { MobileProvider } from '../../context/MobileContext';
import MobilePhotoCapture from './MobilePhotoCapture';

/**
 * MobileAppWrapper component
 * 
 * This component wraps the application and provides the MobileContext to all components.
 * It also renders the MobilePhotoCapture component which is used to capture photos from
 * the mobile device's camera.
 */
const MobileAppWrapper = ({ children }) => {
  return (
    <MobileProvider>
      {children}
      <MobilePhotoCapture />
    </MobileProvider>
  );
};

export default MobileAppWrapper;

import React, { createContext, useState, useContext, useEffect } from 'react';
import useHasCamera from '../hooks/useHasCamera';
import useIsMobile from '../hooks/useIsMobile';

// Create context
const MobileContext = createContext();

// Custom hook to use the mobile context
export const useMobile = () => useContext(MobileContext);

export const MobileProvider = ({ children }) => {
  const hasCamera = useHasCamera();
  const isMobile = useIsMobile();
  
  // State for photo capture
  const [photoCaptureOpen, setPhotoCaptureOpen] = useState(false);
  const [capturedPhotos, setCapturedPhotos] = useState([]);
  
  // State for barcode scanner
  const [scannerOpen, setScannerOpen] = useState(false);
  const [lastScannedCode, setLastScannedCode] = useState(null);
  
  // State for shopping assistant
  const [shoppingAssistantOpen, setShoppingAssistantOpen] = useState(false);
  
  // Open photo capture
  const openPhotoCapture = () => {
    setPhotoCaptureOpen(true);
  };
  
  // Close photo capture
  const closePhotoCapture = () => {
    setPhotoCaptureOpen(false);
  };
  
  // Add a captured photo
  const addCapturedPhoto = (photoData) => {
    const newPhoto = {
      id: Date.now().toString(),
      dataUrl: photoData,
      timestamp: new Date().toISOString()
    };
    
    setCapturedPhotos(prev => [...prev, newPhoto]);
    return newPhoto;
  };
  
  // Remove a captured photo
  const removeCapturedPhoto = (photoId) => {
    setCapturedPhotos(prev => prev.filter(photo => photo.id !== photoId));
  };
  
  // Get all captured photos
  const getCapturedPhotos = () => {
    return capturedPhotos;
  };
  
  // Clear all captured photos
  const clearCapturedPhotos = () => {
    setCapturedPhotos([]);
  };
  
  // Open barcode scanner
  const openScanner = () => {
    setScannerOpen(true);
  };
  
  // Close barcode scanner
  const closeScanner = () => {
    setScannerOpen(false);
  };
  
  // Handle barcode detection
  const handleBarcodeDetected = (code) => {
    setLastScannedCode(code);
    closeScanner();
    return code;
  };
  
  // Get the last scanned code
  const getLastScannedCode = () => {
    return lastScannedCode;
  };
  
  // Clear the last scanned code
  const clearLastScannedCode = () => {
    setLastScannedCode(null);
  };
  
  // Open shopping assistant
  const openShoppingAssistant = () => {
    setShoppingAssistantOpen(true);
  };
  
  // Close shopping assistant
  const closeShoppingAssistant = () => {
    setShoppingAssistantOpen(false);
  };
  
  // Value object to be provided to consumers
  const value = {
    // Device capabilities
    hasCamera,
    isMobile,
    
    // Photo capture
    photoCaptureOpen,
    openPhotoCapture,
    closePhotoCapture,
    addCapturedPhoto,
    removeCapturedPhoto,
    getCapturedPhotos,
    clearCapturedPhotos,
    capturedPhotos,
    
    // Barcode scanner
    scannerOpen,
    openScanner,
    closeScanner,
    handleBarcodeDetected,
    getLastScannedCode,
    clearLastScannedCode,
    lastScannedCode,
    
    // Shopping assistant
    shoppingAssistantOpen,
    openShoppingAssistant,
    closeShoppingAssistant
  };
  
  return (
    <MobileContext.Provider value={value}>
      {children}
    </MobileContext.Provider>
  );
};

export default MobileContext;

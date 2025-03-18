import { useState, useContext } from 'react';
import axios from '../utils/axiosConfig';
import { AlertContext } from '../context/AlertContext';

/**
 * Custom hook for product lookup functionality (UPC, URL)
 * @param {Object} options - Configuration options
 * @param {string} options.type - The type of lookup ('upc' or 'url')
 * @param {function} options.onDataFound - Callback when product data is found
 * @returns {Object} Lookup state and handlers
 */
const useLookupService = ({ type = 'upc', onDataFound }) => {
  const { setSuccessAlert, setErrorAlert } = useContext(AlertContext);
  
  const [lookupValue, setLookupValue] = useState('');
  const [isLookingUp, setIsLookingUp] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);
  
  // Handle lookup input value change
  const handleValueChange = (e) => {
    const value = e.target.value;
    setLookupValue(value);
  };
  
  // Handle barcode scanner
  const handleOpenScanner = () => {
    setScannerOpen(true);
  };

  const handleCloseScanner = () => {
    setScannerOpen(false);
  };

  const handleBarcodeDetected = (code) => {
    // Close the scanner
    setScannerOpen(false);
    
    // Set the lookup value
    setLookupValue(code);
    
    // Automatically trigger lookup
    setTimeout(() => {
      handleLookup(code);
    }, 500);
  };
  
  // Perform UPC lookup
  const handleUpcLookup = async (upcValue = lookupValue) => {
    if (!upcValue || typeof upcValue !== 'string' || !upcValue.trim()) {
      setErrorAlert('Please enter a UPC code');
      return;
    }
    
    setIsLookingUp(true);
    
    try {
      // Try the test endpoint first (doesn't require authentication)
      const response = await axios.get(`/api/upc/test/${upcValue.trim()}`);
      
      if (response.data.success) {
        const productData = response.data.data;
        const source = response.data.source || 'unknown';
        
          // Call the callback with the product data and source information
          if (onDataFound) {
            onDataFound({...productData, source: source || 'rapid-api'});
          }
        
        // Success is indicated by the form auto-populating, no need for explicit alert
      } else {
        setErrorAlert('No product found for this UPC code');
      }
    } catch (err) {
      console.error('UPC lookup error:', err);
      
      // If the test endpoint fails, try the authenticated endpoint
      try {
        const response = await axios.get(`/api/upc/${upcValue.trim()}`);
        
        if (response.data.success) {
          const productData = response.data.data;
          const source = response.data.source || 'unknown';
          
          // Call the callback with the product data and source information
          if (onDataFound) {
            onDataFound({...productData, source});
          }
        
        // Success is indicated by the form auto-populating, no need for explicit alert
        } else {
          setErrorAlert('No product found for this UPC code');
        }
      } catch (authErr) {
        setErrorAlert('Error looking up UPC code: ' + (authErr.response?.data?.message || authErr.message));
        console.error('Authenticated UPC lookup error:', authErr);
      }
    } finally {
      setIsLookingUp(false);
    }
  };
  
  // Perform URL lookup
  const handleUrlLookup = async (urlValue = lookupValue) => {
    if (!urlValue || typeof urlValue !== 'string' || !urlValue.trim()) {
      setErrorAlert('Please enter a product URL');
      return;
    }
    
    // Validate URL format
    let url = urlValue.trim();
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = 'https://' + url;
      setLookupValue(url);
    }
    
    setIsLookingUp(true);
    
    try {
      // Use the URL lookup service
      const response = await axios.get(`/api/url/lookup?url=${encodeURIComponent(url)}`);
      
      if (response.data.success) {
        const productData = response.data.data;
        const source = response.data.source || 'url-lookup';
        
        // Call the callback with the product data and source information
        if (onDataFound) {
          onDataFound({...productData, source});
        }
        
        // No success message needed - the UI update speaks for itself
      } else {
        setErrorAlert('No product found for this URL');
      }
    } catch (err) {
      console.error('Error looking up URL:', err);
      
      // Provide a more user-friendly error message
      if (err.response?.status === 500) {
        setErrorAlert('Unable to retrieve product information. The website may be blocking our request or the URL may be invalid.');
      } else {
        setErrorAlert('Error looking up URL: ' + (err.response?.data?.message || err.message));
      }
      
      // Still update the URL in the callback
      if (onDataFound) {
        onDataFound({ itemUrl: url });
      }
    } finally {
      setIsLookingUp(false);
    }
  };
  
  // Generic handler that routes to the specific lookup type
  const handleLookup = (value = lookupValue) => {
    if (type === 'upc') {
      return handleUpcLookup(value);
    } else if (type === 'url') {
      return handleUrlLookup(value);
    }
  };
  
  return {
    lookupValue,
    setLookupValue,
    isLookingUp,
    scannerOpen,
    setScannerOpen,
    handleValueChange,
    handleLookup,
    handleOpenScanner,
    handleCloseScanner,
    handleBarcodeDetected
  };
};

export default useLookupService;

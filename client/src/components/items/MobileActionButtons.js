import React from 'react';
import {
  Tooltip,
  Fab
} from '@mui/material';
import {
  QrCodeScanner as QrCodeScannerIcon,
  ShoppingCart as ShoppingCartIcon
} from '@mui/icons-material';

/**
 * Component for displaying the mobile action buttons
 * @param {Object} props - Component props
 * @param {Function} props.onScanBarcode - Function to call when the barcode scanner is opened
 * @param {Function} props.onOpenShoppingAssistant - Function to call when the shopping assistant is opened
 * @returns {JSX.Element} - Rendered component
 */
const MobileActionButtons = ({ onScanBarcode, onOpenShoppingAssistant }) => {
  return (
    <>
      {/* Scan Button */}
      <Tooltip title="Scan Barcode">
        <Fab
          color="primary"
          aria-label="scan"
          onClick={onScanBarcode}
          sx={{
            position: 'fixed',
            bottom: 16,
            right: 16,
            zIndex: 1000
          }}
        >
          <QrCodeScannerIcon />
        </Fab>
      </Tooltip>
      
      {/* Shopping Assistant Button */}
      <Tooltip title="Shopping Assistant">
        <Fab
          color="secondary"
          aria-label="shopping-assistant"
          onClick={onOpenShoppingAssistant}
          sx={{
            position: 'fixed',
            bottom: 16,
            right: 80, // Position to the left of the scan button
            zIndex: 1000
          }}
        >
          <ShoppingCartIcon />
        </Fab>
      </Tooltip>
    </>
  );
};

export default MobileActionButtons;

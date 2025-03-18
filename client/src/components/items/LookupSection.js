import React, { useState } from 'react';
import {
  Paper,
  Typography,
  Grid,
  TextField,
  Button,
  InputAdornment,
  IconButton,
  Tooltip,
  CircularProgress,
  Chip,
  Box
} from '@mui/material';
import {
  Search as SearchIcon,
  QrCodeScanner as QrCodeScannerIcon
} from '@mui/icons-material';
import BarcodeScanner from '../scanner/BarcodeScanner';
import useHasCamera from '../../hooks/useHasCamera';

/**
 * Reusable lookup section component for UPC or URL lookups
 * @param {Object} props - Component props
 * @param {string} props.type - Type of lookup ('upc' or 'url')
 * @param {string} props.value - Current lookup value
 * @param {function} props.onChange - Handler for lookup value changes
 * @param {function} props.onLookup - Handler for lookup button click
 * @param {boolean} props.isLookingUp - Whether a lookup is in progress
 * @param {boolean} props.scannerOpen - Whether the barcode scanner is open
 * @param {function} props.onScannerOpen - Handler for opening the scanner
 * @param {function} props.onScannerClose - Handler for closing the scanner
 * @param {function} props.onBarcodeDetected - Handler for barcode detection
 * @returns {JSX.Element} LookupSection component
 */
const LookupSection = ({
  type = 'upc',
  value = '',
  onChange,
  onLookup,
  isLookingUp = false,
  scannerOpen = false,
  onScannerOpen,
  onScannerClose,
  onBarcodeDetected,
  source
}) => {
  const hasCamera = useHasCamera();

  const isUpc = type === 'upc';
  const label = isUpc ? 'UPC Code' : 'URL';
  const placeholder = isUpc 
    ? 'Enter UPC code to lookup product information'
    : 'Enter product URL to lookup information';
  const lookupButtonText = isLookingUp ? 'Looking Up...' : 'Lookup';
  const sectionTitle = isUpc ? 'UPC Lookup' : 'URL Lookup';

  return (
    <>
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          {sectionTitle}
        </Typography>
        
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={8}>
            <TextField
              fullWidth
              label={label}
              value={value}
              onChange={onChange}
              placeholder={placeholder}
              onKeyDown={(e) => {
                // Trigger lookup when Enter is pressed
                if (e.key === 'Enter') {
                  e.preventDefault();
                  if (value.trim()) {
                    onLookup();
                  }
                }
              }}
              InputProps={{
                endAdornment: isUpc && hasCamera ? (
                  <InputAdornment position="end">
                    <Tooltip title="Scan Barcode">
                      <IconButton 
                        color="primary" 
                        onClick={onScannerOpen}
                        size="small"
                      >
                        <QrCodeScannerIcon />
                      </IconButton>
                    </Tooltip>
                  </InputAdornment>
                ) : null
              }}
            />
          </Grid>
          <Grid item xs={4}>
            <Button
              fullWidth
              variant="contained"
              color="primary"
              startIcon={isLookingUp ? <CircularProgress size={24} color="inherit" /> : <SearchIcon />}
              onClick={onLookup}
              disabled={isLookingUp || !value.trim()}
            >
              {lookupButtonText}
            </Button>
          </Grid>
          
          {/* Source Information - Displayed AFTER a successful lookup */}
          {source && type === 'upc' && (
            <Grid item xs={12}>
              <Box sx={{ mt: 2, p: 1, bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1 }}>
                  Source: 
                  <Chip 
                    label={source === 'rapid-api' ? 'RAPID' : 'UPCitemDB'} 
                    color={source === 'rapid-api' ? 'primary' : 'secondary'}
                    size="small"
                    sx={{ ml: 1, fontWeight: 'bold' }}
                  />
                </Typography>
                <Typography variant="body2">
                  Data lookup provided by {source === 'rapid-api' ? 'RapidAPI' : 'UPCitemDB'}
                </Typography>
              </Box>
            </Grid>
          )}
        </Grid>
      </Paper>
      
      {/* Barcode Scanner Dialog */}
      {isUpc && scannerOpen && (
        <BarcodeScanner
          open={scannerOpen}
          onClose={onScannerClose}
          onDetected={onBarcodeDetected}
        />
      )}
    </>
  );
};

export default LookupSection;

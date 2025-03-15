import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Paper,
  Typography,
  FormControl,
  TextField,
  Button,
  Chip,
  Checkbox,
  ListItemText,
  Grid,
  Divider,
  Card,
  CardContent,
  CircularProgress,
  Tooltip,
  Autocomplete
} from '@mui/material';
import {
  Print as PrintIcon,
  Preview as PreviewIcon,
  CheckBox as CheckBoxIcon,
  CheckBoxOutlineBlank as CheckBoxOutlineBlankIcon
} from '@mui/icons-material';
import QRCode from 'react-qr-code';

/**
 * Component for batch printing location QR codes
 */
const BatchLocationQR = ({ locations }) => {
  const [selectedLocations, setSelectedLocations] = useState([]);
  const [qrSize, setQrSize] = useState(150);
  const [columns, setColumns] = useState(2);
  const [labelWidth, setLabelWidth] = useState(40); // Width in mm
  const [labelHeight, setLabelHeight] = useState(25); // Height in mm
  const [showPreview, setShowPreview] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const [loadingLocations, setLoadingLocations] = useState(false);
  const [flattenedLocations, setFlattenedLocations] = useState([]);
  
  // Function to flatten the hierarchical locations data for display
  useEffect(() => {
    setLoadingLocations(true);
    
    const flattenLocations = (locationArray, result = [], parentPath = '') => {
      if (!locationArray || !Array.isArray(locationArray)) return result;
      
      locationArray.forEach(location => {
        if (!location) return;
        
        const path = parentPath ? `${parentPath} > ${location.name}` : location.name;
        result.push({
          ...location,
          hierarchyPath: path
        });
        
        if (location.children && location.children.length > 0) {
          flattenLocations(location.children, result, path);
        }
      });
      return result;
    };
    
    // Reset selections when locations change
    setSelectedLocations([]);
    
    // Debugging
    console.log('Received locations:', locations);
    
    const flattened = flattenLocations(locations || []);
    setFlattenedLocations(flattened);
    setLoadingLocations(false);
    
    console.log('Flattened locations:', flattened);
  }, [locations]);
  
  const handleBatchPrint = () => {
    if (selectedLocations.length === 0) return;
    
    setIsPrinting(true);
    
    // Get selected location objects
    const locationsToRender = selectedLocations.map(locId => 
      flattenedLocations.find(loc => loc._id === locId)
    ).filter(Boolean);
    
    // Create a new window for printing
    const printWindow = window.open('', '_blank');
    
    // Base URL for QR codes
    const baseUrl = window.location.origin;
    
    printWindow.document.write(`
      <html>
        <head>
          <title>Boxwise QR Codes</title>
          <style>
            body {
              display: flex;
              flex-direction: column;
              margin: 0;
              padding: 20px;
              box-sizing: border-box;
              font-family: Arial, sans-serif;
            }
            .title {
              text-align: center;
              margin-bottom: 20px;
              font-size: 18px;
              font-weight: bold;
            }
            .qr-grid {
              display: grid;
              grid-template-columns: repeat(${columns}, 1fr);
              gap: 20px;
              width: 100%;
            }
            .qr-container {
              display: flex;
              flex-direction: column;
              align-items: center;
              padding: 10px;
              border: 1px solid #ccc;
              border-radius: 8px;
              page-break-inside: avoid;
            }
            .qr-subtitle {
              margin: 12px 0 8px 0;
              font-size: 18px;
              color: #000;
              text-align: center;
              font-weight: 700;
              max-width: 100%;
              overflow: hidden;
              text-overflow: ellipsis;
              letter-spacing: 0.02em;
            }
            @media print {
              @page {
                size: auto;
                margin: 0.5cm;
              }
              body {
                padding: 0;
              }
            }
          </style>
        </head>
        <body>
          <div class="qr-grid">
            ${locationsToRender.map(location => `
              <div class="qr-container">
                <div>
                  <img 
                    src="https://api.qrserver.com/v1/create-qr-code/?size=${qrSize}x${qrSize}&data=${encodeURIComponent(`${baseUrl}/locations/${location._id}`)}"
                    width="${qrSize}" 
                    height="${qrSize}"
                    alt="${location.name}"
                  />
                </div>
                <div class="qr-subtitle">${location.name}</div>
              </div>
            `).join('')}
          </div>
          <script>
            window.onload = function() {
              // Print after a delay to ensure all QR codes are loaded
              setTimeout(function() {
                window.print();
                // window.close();
              }, 1000);
            };
          </script>
        </body>
      </html>
    `);
    
    printWindow.document.close();
    
    // Reset printing state after a delay
    setTimeout(() => {
      setIsPrinting(false);
    }, 1000);
  };
  
  const generatePreview = () => {
    if (!showPreview || selectedLocations.length === 0) return null;
    
    const previewLocations = selectedLocations.slice(0, 6); // Show max 6 locations in preview
    const baseUrl = window.location.origin;
    
    return (
      <Box sx={{ mt: 3 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>
          <PreviewIcon sx={{ verticalAlign: 'middle', mr: 1 }} />
          Layout Preview ({Math.min(selectedLocations.length, 6)} of {selectedLocations.length})
        </Typography>
        
        <Paper sx={{ p: 2, bgcolor: '#f5f5f5', overflow: 'auto' }}>
          <Grid container spacing={1} sx={{ width: '100%' }}>
            {previewLocations.map(locId => {
              const location = flattenedLocations.find(loc => loc._id === locId);
              if (!location) return null;
              
              return (
                <Grid item key={locId} xs={12 / columns}>
                  <Card sx={{ 
                    height: '100%', 
                    display: 'flex', 
                    flexDirection: 'column', 
                    alignItems: 'center',
                    p: 1,
                    border: '1px dashed #ccc'
                  }}>
                    <CardContent sx={{ 
                      display: 'flex', 
                      flexDirection: 'column', 
                      alignItems: 'center',
                      width: '100%',
                      pt: 1,
                      pb: 1,
                      "&:last-child": { pb: 1 }
                    }}>
                      <Box sx={{ 
                        p: 1, 
                        bgcolor: 'white',
                        border: '1px solid #eee',
                        borderRadius: 1
                      }}>
                        <QRCode
                          value={`${baseUrl}/locations/${location._id}`}
                          size={qrSize}
                          level="M"
                        />
                      </Box>
                      <Typography 
                        variant="body2" 
                        sx={{ 
                          mt: 1.5, 
                          fontWeight: 700,
                          textAlign: 'center',
                          maxWidth: qrSize,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          letterSpacing: '0.02em',
                          color: '#000'
                        }}
                      >
                        {location.name}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              );
            })}
          </Grid>
        </Paper>
      </Box>
    );
  };

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Batch QR Code Printing for Locations
      </Typography>
      <Typography variant="body2" color="text.secondary" paragraph>
        Select multiple locations to print QR code labels in a batch. Useful for printing labels for shelves, cabinets, and other storage locations.
      </Typography>
      
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Autocomplete
            multiple
            disableCloseOnSelect
            options={flattenedLocations}
            getOptionLabel={(option) => option.hierarchyPath || option.name}
            value={flattenedLocations.filter(loc => 
              selectedLocations.includes(loc._id)
            )}
            onChange={(event, newValues) => {
              setSelectedLocations(newValues.map(value => value._id));
            }}
            renderInput={(params) => (
              <TextField 
                {...params} 
                label="Select Locations" 
                placeholder="Search locations..."
                fullWidth
                sx={{ mb: 2 }}
              />
            )}
            renderOption={(props, option, { selected }) => (
              <Box component="li" {...props}>
                <Checkbox
                  icon={<CheckBoxOutlineBlankIcon fontSize="small" />}
                  checkedIcon={<CheckBoxIcon fontSize="small" />}
                  style={{ marginRight: 8 }}
                  checked={selected}
                />
                <Box>
                  <Typography variant="body1">{option.name}</Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                    {option.hierarchyPath}
                  </Typography>
                </Box>
              </Box>
            )}
            renderTags={(value, getTagProps) =>
              value.map((option, index) => (
                <Chip
                  label={option.name}
                  size="small"
                  {...getTagProps({ index })}
                />
              ))
            }
            isOptionEqualToValue={(option, value) => option._id === value._id}
            filterOptions={(options, state) => {
              // Simple fuzzy search matching name or hierarchyPath
              const inputValue = state.inputValue.toLowerCase().trim();
              if (!inputValue) return options;
              
              return options.filter(option => 
                option.name.toLowerCase().includes(inputValue) ||
                (option.hierarchyPath && 
                 option.hierarchyPath.toLowerCase().includes(inputValue))
              );
            }}
            loading={loadingLocations}
            loadingText="Loading locations..."
            noOptionsText="No locations found"
            sx={{ mb: 2 }}
          />
          
          <Grid container spacing={2}>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="QR Code Size (px)"
                type="number"
                value={qrSize}
                onChange={(e) => setQrSize(Math.max(50, Math.min(300, Number(e.target.value))))}
                inputProps={{ min: 50, max: 300, step: 10 }}
                sx={{ mb: 2 }}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="Columns"
                type="number"
                value={columns}
                onChange={(e) => setColumns(Math.max(1, Math.min(4, Number(e.target.value))))}
                inputProps={{ min: 1, max: 4, step: 1 }}
                sx={{ mb: 2 }}
                helperText="Labels per row"
              />
            </Grid>
          </Grid>
          
          <Divider sx={{ my: 2 }}>Label Size (mm)</Divider>
          
          <Grid container spacing={2}>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="Width"
                type="number"
                value={labelWidth}
                onChange={(e) => setLabelWidth(Math.max(20, Math.min(100, Number(e.target.value))))}
                inputProps={{ min: 20, max: 100, step: 5 }}
                sx={{ mb: 2 }}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="Height"
                type="number"
                value={labelHeight}
                onChange={(e) => setLabelHeight(Math.max(10, Math.min(100, Number(e.target.value))))}
                inputProps={{ min: 10, max: 100, step: 5 }}
                sx={{ mb: 2 }}
              />
            </Grid>
          </Grid>
          
          <Box sx={{ mt: 2, display: 'flex', justifyContent: 'space-between' }}>
            <Button
              variant="outlined"
              onClick={() => setShowPreview(!showPreview)}
              disabled={selectedLocations.length === 0}
            >
              {showPreview ? 'Hide Preview' : 'Show Preview'}
            </Button>
            
            <Tooltip title={selectedLocations.length === 0 ? "Select at least one location" : ""}>
              <span> {/* Tooltip needs a wrapper when child is disabled */}
                <Button
                  variant="contained"
                  startIcon={isPrinting ? <CircularProgress size={20} color="inherit" /> : <PrintIcon />}
                  onClick={handleBatchPrint}
                  disabled={selectedLocations.length === 0 || isPrinting}
                >
                  {isPrinting ? 'Preparing...' : `Print ${selectedLocations.length} Labels`}
                </Button>
              </span>
            </Tooltip>
          </Box>
        </Grid>
        
        <Grid item xs={12} md={6}>
          {generatePreview()}
          
          {!showPreview && (
            <Paper sx={{ p: 3, height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: '#f5f5f5' }}>
              <Box sx={{ textAlign: 'center' }}>
                <PreviewIcon sx={{ fontSize: 60, color: 'text.disabled', mb: 2 }} />
                <Typography variant="body1" color="text.secondary">
                  {selectedLocations.length === 0 
                    ? 'Select locations to see a preview' 
                    : 'Click "Show Preview" to see how your labels will look'}
                </Typography>
                {selectedLocations.length > 0 && (
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                    {selectedLocations.length} locations selected
                  </Typography>
                )}
              </Box>
            </Paper>
          )}
        </Grid>
      </Grid>
    </Box>
  );
};

export default BatchLocationQR;

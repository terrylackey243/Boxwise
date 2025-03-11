import React, { useState, useEffect, useContext, useRef } from 'react';
import axios from '../../utils/axiosConfig';
import {
  Container,
  Grid,
  Paper,
  Typography,
  Box,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Divider,
  CircularProgress,
  Card,
  CardContent,
  CardActions,
  Tooltip
} from '@mui/material';
import {
  QrCode as QrCodeIcon,
  Download as DownloadIcon,
  Print as PrintIcon,
  ContentCopy as CopyIcon
} from '@mui/icons-material';
import QRCode from 'react-qr-code';
import { AlertContext } from '../../context/AlertContext';

const QRGenerator = () => {
  const { setSuccessAlert, setErrorAlert } = useContext(AlertContext);
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState([]);
  const [locations, setLocations] = useState([]);
  const [labels, setLabels] = useState([]);
  
  const [qrType, setQrType] = useState('item');
  const [selectedId, setSelectedId] = useState('');
  const [qrValue, setQrValue] = useState('');
  const [qrSize, setQrSize] = useState(200);
  
  const qrRef = useRef(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Fetch data from the API
        const [itemsRes, locationsRes, labelsRes] = await Promise.all([
          axios.get('/api/items?limit=100'),
          axios.get('/api/locations?flat=true'),
          axios.get('/api/labels')
        ]);
        
        if (itemsRes.data.success && locationsRes.data.success && labelsRes.data.success) {
          setItems(itemsRes.data.data || []);
          setLocations(locationsRes.data.data || []);
          setLabels(labelsRes.data.data || []);
        } else {
          setErrorAlert('Error loading data');
        }
        
        setLoading(false);
      } catch (err) {
        setErrorAlert('Error loading data');
        setLoading(false);
        console.error(err);
      }
    };
    
    fetchData();
  }, [setErrorAlert]);

  useEffect(() => {
    // Generate QR code value based on selected type and ID
    if (selectedId) {
      let selectedItem;
      
      // Generate a URL that points to the appropriate page in the application
      const baseUrl = window.location.origin;
      
      switch (qrType) {
        case 'item':
          selectedItem = items.find(item => item._id === selectedId);
          if (selectedItem) {
            // URL to the item detail page
            setQrValue(`${baseUrl}/items/${selectedId}`);
          }
          break;
        case 'location':
          selectedItem = locations.find(location => location._id === selectedId);
          if (selectedItem) {
            // URL to the location detail page
            setQrValue(`${baseUrl}/locations/${selectedId}`);
          }
          break;
        case 'label':
          selectedItem = labels.find(label => label._id === selectedId);
          if (selectedItem) {
            // URL to filter items by this label
            setQrValue(`${baseUrl}/items?label=${selectedId}`);
          }
          break;
        default:
          setQrValue('');
      }
    } else {
      setQrValue('');
    }
  }, [qrType, selectedId, items, locations, labels]);

  const handleTypeChange = (e) => {
    setQrType(e.target.value);
    setSelectedId('');
  };

  const handleIdChange = (e) => {
    setSelectedId(e.target.value);
  };

  const handleSizeChange = (e) => {
    setQrSize(Number(e.target.value));
  };

  const downloadQRCode = () => {
    if (!qrRef.current) return;
    
    const svg = qrRef.current.querySelector('svg');
    const svgData = new XMLSerializer().serializeToString(svg);
    const img = new Image();
    
    img.onload = () => {
      // Get the name and location of the selected item/location/label
      let name = '';
      let locationName = '';
      
      if (qrType === 'item') {
        const selectedItem = items.find(item => item._id === selectedId);
        name = selectedItem?.name || '';
        // Get location name if available
        if (selectedItem?.location && typeof selectedItem.location === 'object') {
          locationName = selectedItem.location.name || '';
        }
      } else if (qrType === 'location') {
        const selectedLocation = locations.find(location => location._id === selectedId);
        name = selectedLocation?.name || '';
      } else if (qrType === 'label') {
        const selectedLabel = labels.find(label => label._id === selectedId);
        name = selectedLabel?.name || '';
      }
      
      // Create a canvas with extra height to accommodate the text
      const canvas = document.createElement('canvas');
      const padding = 20; // Padding around the QR code
      const textHeight = locationName ? 60 : 30; // Height for text area
      
      canvas.width = qrSize + (padding * 2);
      canvas.height = qrSize + (padding * 2) + textHeight;
      
      const ctx = canvas.getContext('2d');
      
      // Fill the background
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // Draw the QR code
      ctx.drawImage(img, padding, padding, qrSize, qrSize);
      
      // Add the item name (without the type prefix)
      ctx.fillStyle = '#333333';
      ctx.font = 'bold 16px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(
        name, 
        canvas.width / 2, 
        qrSize + padding + 20
      );
      
      // Add the location name if available (without the "Location:" prefix)
      if (locationName) {
        ctx.font = 'bold 14px Arial';
        ctx.fillStyle = '#666666';
        ctx.fillText(
          locationName, 
          canvas.width / 2, 
          qrSize + padding + 45
        );
      }
      
      // Clean the name for use in a filename (remove special characters)
      const cleanName = (locationName ? `${name}-${locationName}` : name).replace(/[^a-z0-9]/gi, '-').toLowerCase();
      
      // Create download link
      const link = document.createElement('a');
      link.download = cleanName ? `boxwise-qr-${qrType}-${cleanName}.png` : `boxwise-qr-${qrType}-${selectedId}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
      
      setSuccessAlert('QR code downloaded successfully');
    };
    
    img.src = `data:image/svg+xml;base64,${btoa(svgData)}`;
  };

  const printQRCode = () => {
    if (!qrRef.current) return;
    
    const printWindow = window.open('', '_blank');
    const svg = qrRef.current.querySelector('svg');
    const svgData = new XMLSerializer().serializeToString(svg);
    
    // Get item details for the print
    let itemName = '';
    let locationName = '';
    
    if (qrType === 'item') {
      const selectedItem = items.find(item => item._id === selectedId);
      itemName = selectedItem?.name || '';
      // Get location name if available
      if (selectedItem?.location && typeof selectedItem.location === 'object') {
        locationName = selectedItem.location.name || '';
      }
    } else if (qrType === 'location') {
      const selectedLocation = locations.find(location => location._id === selectedId);
      itemName = selectedLocation?.name || '';
    } else if (qrType === 'label') {
      const selectedLabel = labels.find(label => label._id === selectedId);
      itemName = selectedLabel?.name || '';
    }
    
    printWindow.document.write(`
      <html>
        <head>
          <title>Boxwise QR Code</title>
          <style>
            body {
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              height: 100vh;
              margin: 0;
              padding: 20px;
              box-sizing: border-box;
              font-family: Arial, sans-serif;
            }
            .qr-container {
              display: flex;
              flex-direction: column;
              align-items: center;
              padding: 20px;
              border: 1px solid #ccc;
              border-radius: 8px;
            }
            .qr-title {
              margin-bottom: 10px;
              font-size: 16px;
              font-weight: bold;
            }
            .qr-subtitle {
              margin-bottom: 5px;
              font-size: 14px;
              color: #666;
            }
            .qr-location {
              margin-bottom: 20px;
              font-size: 14px;
              color: #666;
              font-weight: bold;
            }
            @media print {
              @page {
                size: auto;
                margin: 0;
              }
              body {
                padding: 40px;
              }
            }
          </style>
        </head>
        <body>
          <div class="qr-container">
            <div class="qr-title">Boxwise QR Code</div>
            <div class="qr-subtitle">
              ${itemName}
            </div>
            ${locationName ? `<div class="qr-location">${locationName}</div>` : ''}
            <div>
              ${svgData}
            </div>
          </div>
          <script>
            window.onload = function() {
              setTimeout(function() {
                window.print();
                window.close();
              }, 500);
            };
          </script>
        </body>
      </html>
    `);
    
    printWindow.document.close();
    setSuccessAlert('QR code sent to printer');
  };

  const copyQRCodeValue = () => {
    navigator.clipboard.writeText(qrValue)
      .then(() => {
        setSuccessAlert('QR code value copied to clipboard');
      })
      .catch(() => {
        setErrorAlert('Failed to copy QR code value');
      });
  };

  const copyQRCodeToClipboard = () => {
    if (!qrRef.current) return;
    
    const svg = qrRef.current.querySelector('svg');
    const svgData = new XMLSerializer().serializeToString(svg);
    const img = new Image();
    
    img.onload = () => {
      // Get the name and location of the selected item/location/label
      let name = '';
      let locationName = '';
      
      if (qrType === 'item') {
        const selectedItem = items.find(item => item._id === selectedId);
        name = selectedItem?.name || '';
        // Get location name if available
        if (selectedItem?.location && typeof selectedItem.location === 'object') {
          locationName = selectedItem.location.name || '';
        }
      } else if (qrType === 'location') {
        const selectedLocation = locations.find(location => location._id === selectedId);
        name = selectedLocation?.name || '';
      } else if (qrType === 'label') {
        const selectedLabel = labels.find(label => label._id === selectedId);
        name = selectedLabel?.name || '';
      }
      
      // Create a canvas with extra height to accommodate the text
      const canvas = document.createElement('canvas');
      const padding = 20; // Padding around the QR code
      const textHeight = locationName ? 60 : 30; // Height for text area
      
      canvas.width = qrSize + (padding * 2);
      canvas.height = qrSize + (padding * 2) + textHeight;
      
      const ctx = canvas.getContext('2d');
      
      // Fill the background
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // Draw the QR code
      ctx.drawImage(img, padding, padding, qrSize, qrSize);
      
      // Add the item name (without the type prefix)
      ctx.fillStyle = '#333333';
      ctx.font = 'bold 16px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(
        name, 
        canvas.width / 2, 
        qrSize + padding + 20
      );
      
      // Add the location name if available (without the "Location:" prefix)
      if (locationName) {
        ctx.font = 'bold 14px Arial';
        ctx.fillStyle = '#666666';
        ctx.fillText(
          locationName, 
          canvas.width / 2, 
          qrSize + padding + 45
        );
      }
      
      // Convert canvas to blob
      canvas.toBlob((blob) => {
        try {
          // Create a ClipboardItem
          const item = new ClipboardItem({ 'image/png': blob });
          
          // Write to clipboard
          navigator.clipboard.write([item])
            .then(() => {
              setSuccessAlert('QR code image copied to clipboard');
            })
            .catch((err) => {
              console.error('Error copying image to clipboard:', err);
              setErrorAlert('Failed to copy QR code image to clipboard');
            });
        } catch (err) {
          console.error('Error creating clipboard item:', err);
          setErrorAlert('Your browser does not support copying images to clipboard');
        }
      });
    };
    
    img.src = `data:image/svg+xml;base64,${btoa(svgData)}`;
  };

  if (loading) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: 'calc(100vh - 64px)',
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Paper sx={{ p: 3, mb: 4, borderRadius: 2 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          QR Code Generator
        </Typography>
        <Typography variant="body1" paragraph>
          Generate QR codes for your items, locations, and labels. These QR codes can be scanned to quickly access information.
        </Typography>
        
        <Divider sx={{ my: 3 }} />
        
        <Grid container spacing={4}>
          <Grid item xs={12} md={6}>
            <Box sx={{ mb: 3 }}>
              <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel id="qr-type-label">QR Code Type</InputLabel>
                <Select
                  labelId="qr-type-label"
                  id="qr-type"
                  value={qrType}
                  label="QR Code Type"
                  onChange={handleTypeChange}
                >
                  <MenuItem value="item">Item</MenuItem>
                  <MenuItem value="location">Location</MenuItem>
                  <MenuItem value="label">Label</MenuItem>
                </Select>
              </FormControl>
              
              <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel id="qr-id-label">
                  {qrType === 'item' ? 'Item' : qrType === 'location' ? 'Location' : 'Label'}
                </InputLabel>
                <Select
                  labelId="qr-id-label"
                  id="qr-id"
                  value={selectedId}
                  label={qrType === 'item' ? 'Item' : qrType === 'location' ? 'Location' : 'Label'}
                  onChange={handleIdChange}
                  disabled={!qrType}
                >
                  {qrType === 'item' && items.map(item => (
                    <MenuItem key={item._id} value={item._id}>
                      {item.name} ({item.assetId})
                    </MenuItem>
                  ))}
                  
                  {qrType === 'location' && locations.map(location => (
                    <MenuItem key={location._id} value={location._id}>
                      {location.name}
                    </MenuItem>
                  ))}
                  
                  {qrType === 'label' && labels.map(label => (
                    <MenuItem key={label._id} value={label._id}>
                      {label.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              
              <FormControl fullWidth>
                <TextField
                  label="QR Code Size (px)"
                  type="number"
                  value={qrSize}
                  onChange={handleSizeChange}
                  inputProps={{ min: 100, max: 500, step: 10 }}
                />
              </FormControl>
            </Box>
            
            <Box sx={{ mb: 3 }}>
              <Typography variant="h6" gutterBottom>
                QR Code Value
              </Typography>
              <TextField
                fullWidth
                multiline
                rows={4}
                value={qrValue}
                InputProps={{
                  readOnly: true,
                }}
                variant="outlined"
              />
              <Button
                variant="outlined"
                startIcon={<CopyIcon />}
                onClick={copyQRCodeValue}
                disabled={!qrValue}
                sx={{ mt: 1 }}
              >
                Copy Value
              </Button>
            </Box>
          </Grid>
          
          <Grid item xs={12} md={6}>
            <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', p: 3 }}>
              <CardContent sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <Typography variant="h6" gutterBottom>
                  Preview
                </Typography>
                
                <Tooltip title={qrValue ? "Click to copy QR code to clipboard" : ""} arrow>
                  <Box
                    ref={qrRef}
                    sx={{
                      display: 'flex',
                      justifyContent: 'center',
                      alignItems: 'center',
                      width: qrSize,
                      height: qrSize,
                      bgcolor: 'white',
                      p: 2,
                      borderRadius: 2,
                      border: '1px solid #ddd',
                      mb: 2,
                      cursor: qrValue ? 'pointer' : 'default',
                      transition: 'all 0.2s',
                      '&:hover': {
                        boxShadow: qrValue ? '0 0 8px rgba(0,0,0,0.2)' : 'none',
                      }
                    }}
                    onClick={qrValue ? copyQRCodeToClipboard : undefined}
                  >
                    {qrValue ? (
                      <QRCode
                        value={qrValue}
                        size={qrSize - 32} // Adjust for padding
                        level="H" // High error correction
                      />
                    ) : (
                      <QrCodeIcon sx={{ fontSize: 80, color: 'text.disabled' }} />
                    )}
                  </Box>
                </Tooltip>
                
                <Box sx={{ textAlign: 'center' }}>
                  {qrValue ? (
                    <>
                      <Typography variant="body2" color="text.secondary">
                        {qrType === 'item' 
                          ? items.find(item => item._id === selectedId)?.name
                          : qrType === 'location'
                            ? locations.find(location => location._id === selectedId)?.name
                            : labels.find(label => label._id === selectedId)?.name
                        }
                      </Typography>
                      
                      {/* Display location for items */}
                      {qrType === 'item' && (() => {
                        const selectedItem = items.find(item => item._id === selectedId);
                        if (selectedItem?.location && typeof selectedItem.location === 'object') {
                          return (
                            <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 'bold', mt: 0.5 }}>
                              {selectedItem.location.name}
                            </Typography>
                          );
                        }
                        return null;
                      })()}
                    </>
                  ) : (
                    <Typography variant="body2" color="text.secondary">
                      Select a type and item to generate a QR code
                    </Typography>
                  )}
                </Box>
              </CardContent>
              
              <CardActions>
                <Button
                  variant="contained"
                  startIcon={<DownloadIcon />}
                  onClick={downloadQRCode}
                  disabled={!qrValue}
                >
                  Download
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<PrintIcon />}
                  onClick={printQRCode}
                  disabled={!qrValue}
                >
                  Print
                </Button>
              </CardActions>
            </Card>
          </Grid>
        </Grid>
      </Paper>
    </Container>
  );
};

export default QRGenerator;

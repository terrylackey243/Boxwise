import React, { useState, useEffect, useContext, useRef } from 'react';
import axios from '../../utils/axiosConfig';
import {
  Container,
  Grid,
  Paper,
  Typography,
  Box,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Divider,
  CircularProgress,
  Card,
  CardContent,
  Slider,
  FormControlLabel,
  Checkbox,
  RadioGroup,
  Radio,
  Tooltip
} from '@mui/material';
import {
  Print as PrintIcon,
  Preview as PreviewIcon,
  Settings as SettingsIcon,
  Label as LabelIcon,
  QrCode as QrCodeIcon
} from '@mui/icons-material';
import QRCode from 'react-qr-code';
import { AlertContext } from '../../context/AlertContext';

const LabelGenerator = () => {
  const { setSuccessAlert, setErrorAlert } = useContext(AlertContext);
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState([]);
  
  const [selectedItems, setSelectedItems] = useState([]);
  const [labelSettings, setLabelSettings] = useState({
    size: 'medium', // small, medium, large
    includeQR: true,
    includeAssetId: true,
    includeDescription: true,
    labelPerPage: 30,
    fontSize: 12,
    padding: 10,
    template: 'standard' // standard, compact, detailed
  });
  
  const previewRef = useRef(null);

  useEffect(() => {
    const fetchItems = async () => {
      try {
        setLoading(true);
        
        // Fetch items from the API
        const response = await axios.get('/api/items?limit=100');
        
        if (response.data.success) {
          setItems(response.data.data || []);
        } else {
          setErrorAlert('Error loading items: ' + response.data.message);
        }
        
        setLoading(false);
      } catch (err) {
        setErrorAlert('Error loading items');
        setLoading(false);
        console.error(err);
      }
    };
    
    fetchItems();
  }, [setErrorAlert]);

  const handleItemSelect = (e) => {
    setSelectedItems(e.target.value);
  };

  const handleSettingChange = (setting, value) => {
    setLabelSettings({
      ...labelSettings,
      [setting]: value
    });
  };

  const handlePrint = () => {
    if (!previewRef.current || selectedItems.length === 0) return;
    
    const printWindow = window.open('', '_blank');
    const content = previewRef.current.innerHTML;
    
    printWindow.document.write(`
      <html>
        <head>
          <title>Boxwise Labels</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              margin: 0;
              padding: 20px;
            }
            .label-container {
              display: flex;
              flex-wrap: wrap;
              gap: ${labelSettings.padding}px;
              justify-content: flex-start;
            }
            .label {
              border: 1px solid #ccc;
              border-radius: 4px;
              padding: ${labelSettings.padding}px;
              margin-bottom: ${labelSettings.padding}px;
              page-break-inside: avoid;
              background-color: white;
            }
            .label-small {
              width: calc(33.33% - ${labelSettings.padding * 2}px);
            }
            .label-medium {
              width: calc(50% - ${labelSettings.padding * 2}px);
            }
            .label-large {
              width: calc(100% - ${labelSettings.padding * 2}px);
            }
            .label-title {
              font-weight: bold;
              font-size: ${labelSettings.fontSize}px;
              margin-bottom: 4px;
            }
            .label-asset-id {
              font-size: ${labelSettings.fontSize - 2}px;
              color: #666;
              margin-bottom: 4px;
            }
            .label-description {
              font-size: ${labelSettings.fontSize - 2}px;
              margin-bottom: 4px;
            }
            .label-qr {
              display: flex;
              justify-content: center;
              margin-top: 8px;
            }
            @media print {
              @page {
                size: auto;
                margin: 0.5cm;
              }
              body {
                padding: 0;
              }
              .label {
                box-shadow: none;
                border: 1px solid #ccc;
              }
            }
          </style>
        </head>
        <body>
          ${content}
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
    setSuccessAlert('Labels sent to printer');
  };

  const renderLabelPreview = () => {
    if (selectedItems.length === 0) {
      return (
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <LabelIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
          <Typography variant="body1" color="text.secondary">
            Select items to generate labels
          </Typography>
        </Box>
      );
    }
    
    const selectedItemsData = items.filter(item => selectedItems.includes(item._id));
    
    return (
      <Box 
        ref={previewRef}
        sx={{ 
          mt: 2,
          maxHeight: 400,
          overflowY: 'auto',
          p: 2,
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: 1
        }}
      >
        <Box className="label-container" sx={{ display: 'flex', flexWrap: 'wrap', gap: `${labelSettings.padding}px` }}>
          {selectedItemsData.map((item) => (
            <Box 
              key={item._id}
              className={`label label-${labelSettings.size}`}
              sx={{ 
                border: '1px solid #ccc',
                borderRadius: 1,
                p: `${labelSettings.padding}px`,
                mb: `${labelSettings.padding}px`,
                width: labelSettings.size === 'small' 
                  ? `calc(33.33% - ${labelSettings.padding * 2}px)`
                  : labelSettings.size === 'medium'
                    ? `calc(50% - ${labelSettings.padding * 2}px)`
                    : `calc(100% - ${labelSettings.padding * 2}px)`,
                bgcolor: 'background.paper'
              }}
            >
              <Typography 
                className="label-title"
                sx={{ 
                  fontWeight: 'bold',
                  fontSize: `${labelSettings.fontSize}px`,
                  mb: 0.5
                }}
              >
                {item.name}
              </Typography>
              
              {labelSettings.includeAssetId && (
                <Typography 
                  className="label-asset-id"
                  sx={{ 
                    fontSize: `${labelSettings.fontSize - 2}px`,
                    color: 'text.secondary',
                    mb: 0.5
                  }}
                >
                  ID: {item.assetId}
                </Typography>
              )}
              
              {labelSettings.includeDescription && labelSettings.template !== 'compact' && (
                <Typography 
                  className="label-description"
                  sx={{ 
                    fontSize: `${labelSettings.fontSize - 2}px`,
                    mb: 0.5
                  }}
                >
                  {item.description}
                </Typography>
              )}
              
              {labelSettings.template === 'detailed' && (
                <Typography 
                  sx={{ 
                    fontSize: `${labelSettings.fontSize - 2}px`,
                    mb: 0.5
                  }}
                >
                  Location: {item.location.name}
                </Typography>
              )}
              
              {labelSettings.includeQR && (
                <Box 
                  className="label-qr"
                  sx={{ 
                    display: 'flex',
                    justifyContent: 'center',
                    mt: 1
                  }}
                >
                  <QRCode
                    value={`${window.location.origin}/items/${item._id}`}
                    size={labelSettings.size === 'small' ? 60 : labelSettings.size === 'medium' ? 80 : 100}
                    level="M"
                  />
                </Box>
              )}
            </Box>
          ))}
        </Box>
      </Box>
    );
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
          Label Generator
        </Typography>
        <Typography variant="body1" paragraph>
          Generate and print labels for your items. Customize the label format and content to fit your needs.
        </Typography>
        
        <Divider sx={{ my: 3 }} />
        
        <Grid container spacing={4}>
          <Grid item xs={12} md={4}>
            <Typography variant="h6" gutterBottom>
              Select Items
            </Typography>
            
            <FormControl fullWidth sx={{ mb: 3 }}>
              <InputLabel id="items-select-label">Items</InputLabel>
              <Select
                labelId="items-select-label"
                id="items-select"
                multiple
                value={selectedItems}
                onChange={handleItemSelect}
                label="Items"
                renderValue={(selected) => `${selected.length} items selected`}
              >
                {items.map((item) => (
                  <MenuItem key={item._id} value={item._id}>
                    {item.name} ({item.assetId})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            
            <Typography variant="h6" gutterBottom>
              Label Settings
            </Typography>
            
            <Card sx={{ mb: 2 }}>
              <CardContent>
                <Typography variant="subtitle2" gutterBottom>
                  Label Size
                </Typography>
                <RadioGroup
                  value={labelSettings.size}
                  onChange={(e) => handleSettingChange('size', e.target.value)}
                  row
                >
                  <FormControlLabel value="small" control={<Radio />} label="Small" />
                  <FormControlLabel value="medium" control={<Radio />} label="Medium" />
                  <FormControlLabel value="large" control={<Radio />} label="Large" />
                </RadioGroup>
              </CardContent>
            </Card>
            
            <Card sx={{ mb: 2 }}>
              <CardContent>
                <Typography variant="subtitle2" gutterBottom>
                  Label Template
                </Typography>
                <RadioGroup
                  value={labelSettings.template}
                  onChange={(e) => handleSettingChange('template', e.target.value)}
                >
                  <FormControlLabel value="standard" control={<Radio />} label="Standard" />
                  <FormControlLabel value="compact" control={<Radio />} label="Compact" />
                  <FormControlLabel value="detailed" control={<Radio />} label="Detailed" />
                </RadioGroup>
              </CardContent>
            </Card>
            
            <Card sx={{ mb: 2 }}>
              <CardContent>
                <Typography variant="subtitle2" gutterBottom>
                  Content Options
                </Typography>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={labelSettings.includeQR}
                      onChange={(e) => handleSettingChange('includeQR', e.target.checked)}
                    />
                  }
                  label="Include QR Code"
                />
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={labelSettings.includeAssetId}
                      onChange={(e) => handleSettingChange('includeAssetId', e.target.checked)}
                    />
                  }
                  label="Include Asset ID"
                />
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={labelSettings.includeDescription}
                      onChange={(e) => handleSettingChange('includeDescription', e.target.checked)}
                    />
                  }
                  label="Include Description"
                />
              </CardContent>
            </Card>
            
            <Card>
              <CardContent>
                <Typography variant="subtitle2" gutterBottom>
                  Advanced Settings
                </Typography>
                
                <Typography variant="body2" gutterBottom>
                  Font Size: {labelSettings.fontSize}px
                </Typography>
                <Slider
                  value={labelSettings.fontSize}
                  onChange={(e, newValue) => handleSettingChange('fontSize', newValue)}
                  min={8}
                  max={16}
                  step={1}
                  marks
                  sx={{ mb: 2 }}
                />
                
                <Typography variant="body2" gutterBottom>
                  Padding: {labelSettings.padding}px
                </Typography>
                <Slider
                  value={labelSettings.padding}
                  onChange={(e, newValue) => handleSettingChange('padding', newValue)}
                  min={5}
                  max={20}
                  step={1}
                  marks
                  sx={{ mb: 2 }}
                />
                
                <Typography variant="body2" gutterBottom>
                  Labels Per Page: {labelSettings.labelPerPage}
                </Typography>
                <Slider
                  value={labelSettings.labelPerPage}
                  onChange={(e, newValue) => handleSettingChange('labelPerPage', newValue)}
                  min={10}
                  max={50}
                  step={5}
                  marks
                />
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} md={8}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6">
                Preview
              </Typography>
              
              <Button
                variant="contained"
                startIcon={<PrintIcon />}
                onClick={handlePrint}
                disabled={selectedItems.length === 0}
              >
                Print Labels
              </Button>
            </Box>
            
            <Paper 
              elevation={0} 
              variant="outlined" 
              sx={{ 
                p: 2, 
                minHeight: 400,
                display: 'flex',
                flexDirection: 'column'
              }}
            >
              {renderLabelPreview()}
            </Paper>
            
            <Box sx={{ mt: 2, textAlign: 'center' }}>
              <Typography variant="body2" color="text.secondary">
                {selectedItems.length > 0 
                  ? `${selectedItems.length} labels will be generated. Adjust settings as needed before printing.`
                  : 'Select items to generate labels.'
                }
              </Typography>
            </Box>
          </Grid>
        </Grid>
      </Paper>
    </Container>
  );
};

export default LabelGenerator;

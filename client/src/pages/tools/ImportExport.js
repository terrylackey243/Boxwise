import React, { useState, useContext } from 'react';
import axios from '../../utils/axiosConfig';
import {
  Container,
  Grid,
  Paper,
  Typography,
  Box,
  Button,
  Divider,
  CircularProgress,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  AlertTitle,
  Stepper,
  Step,
  StepLabel,
  StepContent
} from '@mui/material';
import {
  CloudUpload as UploadIcon,
  CloudDownload as DownloadIcon,
  CheckCircle as SuccessIcon,
  Error as ErrorIcon,
  Description as FileIcon,
  Info as InfoIcon
} from '@mui/icons-material';
import { useDropzone } from 'react-dropzone';
import { AlertContext } from '../../context/AlertContext';

const ImportExport = () => {
  const { setSuccessAlert, setErrorAlert } = useContext(AlertContext);
  const [exportLoading, setExportLoading] = useState(false);
  const [exportType, setExportType] = useState('all');
  const [referenceDataLoading, setReferenceDataLoading] = useState(false);
  
  const [importStep, setImportStep] = useState(0);
  const [importFile, setImportFile] = useState(null);
  const [importPreview, setImportPreview] = useState(null);
  const [importLoading, setImportLoading] = useState(false);
  const [importResult, setImportResult] = useState(null);

  // Dropzone configuration
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: {
      'text/csv': ['.csv'],
      'application/vnd.ms-excel': ['.csv'],
      'application/csv': ['.csv']
    },
    maxFiles: 1,
    onDrop: (acceptedFiles) => {
      if (acceptedFiles.length > 0) {
        const file = acceptedFiles[0];
        setImportFile(file);
        
        // Read file preview
        const reader = new FileReader();
        reader.onload = () => {
          const content = reader.result;
          const lines = content.split('\n').slice(0, 6); // Get first 5 lines + header
          setImportPreview(lines);
        };
        reader.readAsText(file);
        
        // Move to next step
        setImportStep(1);
      }
    }
  });

  const handleExportTypeChange = (e) => {
    setExportType(e.target.value);
  };

  const handleExport = async () => {
    setExportLoading(true);
    
    try {
      // Make API call to export data
      let url = '/api/items/export';
      
      // Add appropriate query parameters based on export type
      switch (exportType) {
        case 'active':
          url += '?archived=false';
          break;
        case 'archived':
          url += '?archived=true';
          break;
        case 'locations':
          url += '?dataType=locations';
          break;
        case 'labels':
          url += '?dataType=labels';
          break;
        case 'categories':
          url += '?dataType=categories';
          break;
        default: // 'all'
          // No query parameter needed
          break;
      }
      
      const response = await axios.get(url, {
        responseType: 'blob' // Important for handling file downloads
      });
      
      // Create and download the file
      const blob = new Blob([response.data], { type: 'text/csv;charset=utf-8;' });
      const fileUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = fileUrl;
      link.setAttribute('download', `boxwise-export-${exportType}-${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      setSuccessAlert('Data exported successfully');
    } catch (err) {
      setErrorAlert('Error exporting data: ' + (err.response?.data?.message || err.message));
      console.error(err);
    } finally {
      setExportLoading(false);
    }
  };

  const handleDownloadReferenceData = async () => {
    setReferenceDataLoading(true);
    
    try {
      // Create a combined reference data file with locations, categories, and labels
      const locationsResponse = await axios.get('/api/items/export?dataType=locations', {
        responseType: 'blob'
      });
      
      const categoriesResponse = await axios.get('/api/items/export?dataType=categories', {
        responseType: 'blob'
      });
      
      const labelsResponse = await axios.get('/api/items/export?dataType=labels', {
        responseType: 'blob'
      });
      
      // Convert blobs to text
      const locationsText = await locationsResponse.data.text();
      const categoriesText = await categoriesResponse.data.text();
      const labelsText = await labelsResponse.data.text();
      
      // Combine the data with headers
      const combinedData = 
        "LOCATIONS\n" + 
        locationsText + 
        "\n\nCATEGORIES\n" + 
        categoriesText + 
        "\n\nLABELS\n" + 
        labelsText;
      
      // Create and download the combined file
      const blob = new Blob([combinedData], { type: 'text/csv;charset=utf-8;' });
      const fileUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = fileUrl;
      link.setAttribute('download', `boxwise-reference-data-${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      setSuccessAlert('Reference data downloaded successfully');
    } catch (err) {
      setErrorAlert('Error downloading reference data: ' + (err.response?.data?.message || err.message));
      console.error(err);
    } finally {
      setReferenceDataLoading(false);
    }
  };

  const handleImport = async () => {
    if (!importFile) return;
    
    setImportLoading(true);
    
    try {
      // Create form data to send the file
      const formData = new FormData();
      formData.append('csv', importFile);
      
      // Make API call to import data
      const response = await axios.post('/api/items/import', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      
      if (response.data.success) {
        setImportResult({
          success: true,
          totalRows: response.data.totalRows || 0,
          importedRows: response.data.importedRows || 0,
          errors: response.data.errors || []
        });
        setSuccessAlert('Data imported successfully');
      } else {
        setImportResult({
          success: false,
          totalRows: response.data.totalRows || 0,
          importedRows: response.data.importedRows || 0,
          errors: response.data.errors || [{ row: 0, message: response.data.message || 'Unknown error' }]
        });
        setErrorAlert('Error importing data: ' + response.data.message);
      }
      
      setImportStep(2);
    } catch (err) {
      // Extract error information from the API response if available
      const errorResponse = err.response?.data;
      
      setImportResult({
        success: false,
        totalRows: errorResponse?.totalRows || 0,
        importedRows: errorResponse?.importedRows || 0,
        errors: errorResponse?.errors || [{ row: 0, message: errorResponse?.message || 'Unknown error occurred' }]
      });
      
      setErrorAlert('Error importing data: ' + (errorResponse?.message || err.message));
      console.error(err);
      setImportStep(2);
    } finally {
      setImportLoading(false);
    }
  };

  const resetImport = () => {
    setImportStep(0);
    setImportFile(null);
    setImportPreview(null);
    setImportResult(null);
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Grid container spacing={4}>
        {/* Export Section */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3, borderRadius: 2, height: '100%' }}>
            <Typography variant="h5" component="h2" gutterBottom>
              Export Data
            </Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
              Export your inventory data as a CSV file that you can open in Excel or other spreadsheet applications.
            </Typography>
            
            <Divider sx={{ my: 2 }} />
            
            <Box sx={{ mb: 3 }}>
              <FormControl fullWidth sx={{ mb: 3 }}>
                <InputLabel id="export-type-label">Export Type</InputLabel>
                <Select
                  labelId="export-type-label"
                  id="export-type"
                  value={exportType}
                  label="Export Type"
                  onChange={handleExportTypeChange}
                >
                  <MenuItem value="all">All Items</MenuItem>
                  <MenuItem value="active">Active Items Only</MenuItem>
                  <MenuItem value="archived">Archived Items Only</MenuItem>
                  <MenuItem value="locations">Locations</MenuItem>
                  <MenuItem value="labels">Labels</MenuItem>
                  <MenuItem value="categories">Categories</MenuItem>
                </Select>
              </FormControl>
              
              <Button
                fullWidth
                variant="contained"
                startIcon={exportLoading ? <CircularProgress size={24} color="inherit" /> : <DownloadIcon />}
                onClick={handleExport}
                disabled={exportLoading}
              >
                {exportLoading ? 'Exporting...' : 'Export CSV'}
              </Button>
            </Box>
            
            <Alert severity="info" sx={{ mt: 2 }}>
              <AlertTitle>CSV Format Information</AlertTitle>
              <Typography variant="body2">
                The exported CSV file will include all relevant fields for the selected export type. You can open this file in Excel or Google Sheets.
              </Typography>
            </Alert>
          </Paper>
        </Grid>
        
        {/* Import Section */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3, borderRadius: 2, height: '100%' }}>
            <Typography variant="h5" component="h2" gutterBottom>
              Import Data
            </Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
              Import inventory data from a CSV file. Make sure your CSV file follows the required format.
            </Typography>
            
            <Divider sx={{ my: 2 }} />
            
            <Stepper activeStep={importStep} orientation="vertical">
              <Step>
                <StepLabel>Select CSV File</StepLabel>
                <StepContent>
                  <Box 
                    {...getRootProps()} 
                    sx={{
                      border: '2px dashed',
                      borderColor: isDragActive ? 'primary.main' : 'divider',
                      borderRadius: 2,
                      p: 3,
                      textAlign: 'center',
                      cursor: 'pointer',
                      bgcolor: isDragActive ? 'action.hover' : 'background.paper',
                      '&:hover': {
                        bgcolor: 'action.hover'
                      }
                    }}
                  >
                    <input {...getInputProps()} />
                    <UploadIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
                    <Typography variant="body1" gutterBottom>
                      {isDragActive ? 'Drop the CSV file here' : 'Drag & drop a CSV file here, or click to select'}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Only CSV files are accepted
                    </Typography>
                  </Box>
                  
                  <Box sx={{ mt: 2, display: 'flex', gap: 2 }}>
                    <Button
                      variant="outlined"
                      href="/sample-import-template.csv"
                      download
                      startIcon={<FileIcon />}
                    >
                      Download Template
                    </Button>
                    <Button
                      variant="outlined"
                      onClick={handleDownloadReferenceData}
                      disabled={referenceDataLoading}
                      startIcon={referenceDataLoading ? <CircularProgress size={20} /> : <InfoIcon />}
                    >
                      {referenceDataLoading ? 'Downloading...' : 'Download Reference Data'}
                    </Button>
                  </Box>
                </StepContent>
              </Step>
              
              <Step>
                <StepLabel>Review & Import</StepLabel>
                <StepContent>
                  {importFile && (
                    <Box>
                      <Typography variant="body2" gutterBottom>
                        File: {importFile.name} ({(importFile.size / 1024).toFixed(2)} KB)
                      </Typography>
                      
                      <Typography variant="body2" gutterBottom sx={{ mt: 2 }}>
                        Preview:
                      </Typography>
                      
                      <Box 
                        sx={{ 
                          p: 2, 
                          bgcolor: 'background.default', 
                          borderRadius: 1,
                          overflowX: 'auto',
                          mb: 2
                        }}
                      >
                        <pre style={{ margin: 0, fontFamily: 'monospace', fontSize: '0.875rem' }}>
                          {importPreview?.join('\n')}
                          {importPreview && importPreview.length > 5 && '\n...'}
                        </pre>
                      </Box>
                      
                      <Alert severity="info" sx={{ mb: 2 }}>
                        <Typography variant="body2">
                          Please review the file before importing. Make sure it follows the required format.
                        </Typography>
                      </Alert>
                      
                      <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
                        <Button
                          variant="contained"
                          onClick={handleImport}
                          disabled={importLoading}
                          startIcon={importLoading ? <CircularProgress size={24} color="inherit" /> : <UploadIcon />}
                        >
                          {importLoading ? 'Importing...' : 'Import Data'}
                        </Button>
                        
                        <Button
                          variant="outlined"
                          onClick={resetImport}
                          disabled={importLoading}
                        >
                          Cancel
                        </Button>
                      </Box>
                    </Box>
                  )}
                </StepContent>
              </Step>
              
              <Step>
                <StepLabel>Results</StepLabel>
                <StepContent>
                  {importResult && (
                    <Box>
                      <Alert 
                        severity={importResult.success ? 'success' : 'warning'}
                        icon={importResult.success ? <SuccessIcon /> : <ErrorIcon />}
                        sx={{ mb: 2 }}
                      >
                        <Typography variant="body1" fontWeight="bold">
                          {importResult.success 
                            ? 'Import completed successfully' 
                            : 'Import completed with errors'}
                        </Typography>
                        <Typography variant="body2">
                          Imported {importResult.importedRows} of {importResult.totalRows} rows
                        </Typography>
                      </Alert>
                      
                      {importResult.errors && importResult.errors.length > 0 && (
                        <Box sx={{ mt: 2 }}>
                          <Typography variant="body2" fontWeight="bold" gutterBottom>
                            Errors:
                          </Typography>
                          <List dense>
                            {importResult.errors.map((error, index) => (
                              <ListItem key={index}>
                                <ListItemIcon sx={{ minWidth: 36 }}>
                                  <ErrorIcon color="error" fontSize="small" />
                                </ListItemIcon>
                                <ListItemText 
                                  primary={`Row ${error.row}: ${error.message}`}
                                />
                              </ListItem>
                            ))}
                          </List>
                        </Box>
                      )}
                      
                      <Box sx={{ mt: 3 }}>
                        <Button
                          variant="contained"
                          onClick={resetImport}
                        >
                          Import Another File
                        </Button>
                      </Box>
                    </Box>
                  )}
                </StepContent>
              </Step>
            </Stepper>
          </Paper>
        </Grid>
      </Grid>
    </Container>
  );
};

export default ImportExport;

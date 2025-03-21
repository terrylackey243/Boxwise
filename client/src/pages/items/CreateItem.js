import React, { useState, useEffect, useContext } from 'react';
import axios from '../../utils/axiosConfig';
import { validateItemForm, submitItemForm } from '../../utils/itemFormUtils';
import { useNavigate, useLocation, Link as RouterLink } from 'react-router-dom';
import { useMobile } from '../../context/MobileContext';
import MobilePhotoSection from './MobilePhotoSection';
import {
  Container,
  Grid,
  Paper,
  Typography,
  Box,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  Checkbox,
  Divider,
  CircularProgress,
  Breadcrumbs,
  Link,
  Autocomplete,
  Chip,
  InputAdornment,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material';
import {
  Save as SaveIcon,
  ArrowBack as ArrowBackIcon,
  Add as AddIcon,
  Search as SearchIcon,
  QrCode as QrCodeIcon,
  QrCodeScanner as QrCodeScannerIcon,
  Delete as DeleteIcon,
  OpenInNew as OpenInNewIcon
} from '@mui/icons-material';
import { AlertContext } from '../../context/AlertContext';
import BarcodeScanner from '../../components/scanner/BarcodeScanner';
import useHasCamera from '../../hooks/useHasCamera';

// Function to get the full location hierarchy path
const getLocationHierarchy = (location, allLocations) => {
  if (!location) return '';
  
  // Start with the current location name
  let path = location.name;
  let currentLocation = location;
  
  // Traverse up the parent hierarchy
  while (currentLocation.parent) {
    // Find the parent location
    const parentLocation = allLocations.find(loc => loc._id === currentLocation.parent);
    
    // If parent not found, break the loop
    if (!parentLocation) break;
    
    // Add parent name to the path
    path = `${parentLocation.name} > ${path}`;
    
    // Move up to the parent
    currentLocation = parentLocation;
  }
  
  return path;
};

const CreateItem = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { setSuccessAlert, setErrorAlert } = useContext(AlertContext);
  const { isMobile } = useMobile();
  
  // Get location ID from URL query parameters if it exists
  const queryParams = new URLSearchParams(location.search);
  const locationId = queryParams.get('location');
  
  // Check for pre-filled data from shopping assistant or other sources
  const prefillData = location.state?.prefillData || {};
  
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [locations, setLocations] = useState([]);
  const [categories, setCategories] = useState([]);
  const [labels, setLabels] = useState([]);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [nextAssetId, setNextAssetId] = useState('');
  const hasCamera = useHasCamera();
  
  // State for quick add dialogs
  const [newLocationDialog, setNewLocationDialog] = useState(false);
  const [newCategoryDialog, setNewCategoryDialog] = useState(false);
  const [newLabelDialog, setNewLabelDialog] = useState(false);
  
  // Track newly created entities to ensure they're properly saved
  const [recentlyCreatedEntities, setRecentlyCreatedEntities] = useState({
    location: null,
    category: null,
    labels: []
  });
  
  // State for new entities
  const [newLocation, setNewLocation] = useState({ name: '', description: '', parent: '' });
  const [newCategory, setNewCategory] = useState({ name: '', description: '' });
  const [newLabel, setNewLabel] = useState({ name: '', description: '', color: '#3f51b5' });
  
  const [formData, setFormData] = useState({
    name: prefillData.name || '',
    description: prefillData.description || '',
    location: locationId || '',
    category: '',
    labels: [],
    quantity: 1,
    serialNumber: '',
    modelNumber: prefillData.modelNumber || '',
    manufacturer: prefillData.manufacturer || '',
    notes: '',
    isInsured: false,
    isArchived: false,
    purchasedFrom: '',
    purchasePrice: '',
    purchaseDate: new Date().toISOString().split('T')[0], // Default to today for mobile purchases
    hasLifetimeWarranty: false,
    warrantyExpires: '',
    warrantyNotes: '',
    customFields: [],
    upcCode: prefillData.upcCode || '',
    itemUrl: '',
    manualUrl: ''
  });
  
  
  const [errors, setErrors] = useState({});

  // Function to flatten the hierarchical locations data
  const flattenLocations = (locationArray, result = []) => {
    locationArray.forEach(location => {
      result.push(location);
      if (location.children && location.children.length > 0) {
        flattenLocations(location.children, result);
      }
    });
    return result;
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Make API calls to fetch locations, categories, labels, and next asset ID
        const [locationsRes, categoriesRes, labelsRes, nextAssetIdRes] = await Promise.all([
          axios.get('/api/locations'),
          axios.get('/api/categories'),
          axios.get('/api/labels'),
          axios.get('/api/items/next-asset-id')
        ]);
        
        if (locationsRes.data.success) {
          // Flatten the hierarchical locations data
          const flatLocations = flattenLocations(locationsRes.data.data || []);
          setLocations(flatLocations);
        }
        
        if (categoriesRes.data.success) {
          setCategories(categoriesRes.data.data || []);
        }
        
        if (labelsRes.data.success) {
          setLabels(labelsRes.data.data || []);
        }
        
        if (nextAssetIdRes.data.success) {
          setNextAssetId(nextAssetIdRes.data.data);
          
          // Set the asset ID in the form data
          setFormData(prevData => ({
            ...prevData,
            assetId: nextAssetIdRes.data.data
          }));
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

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    setFormData(prevData => ({
      ...prevData,
      [name]: type === 'checkbox' ? checked : value
    }));
    
    // Clear error for this field if it exists
    if (errors[name]) {
      setErrors(prevErrors => ({
        ...prevErrors,
        [name]: null
      }));
    }
  };
  
  // Handle barcode scanner
  const handleOpenScanner = () => {
    setScannerOpen(true);
  };

  const handleCloseScanner = () => {
    setScannerOpen(false);
  };

  const handleBarcodeDetected = (code) => {
    console.log('Barcode detected:', code);
    
    // Close the scanner
    setScannerOpen(false);
    
    // Update the formData with the UPC code
    setFormData(prevData => ({
      ...prevData,
      upcCode: code
    }));
  };

  const handleLabelChange = (event, newValue) => {
    setFormData(prevData => ({
      ...prevData,
      labels: newValue
    }));
  };

  const handleAddCustomField = () => {
    setFormData(prevData => ({
      ...prevData,
      customFields: [
        ...prevData.customFields,
        { name: '', value: '', type: 'text' }
      ]
    }));
  };
  
  // Function to detect the type of input based on its value
  const detectFieldType = (value) => {
    // Check if it's a URL or email
    if (/^(https?:\/\/)?(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)$/.test(value)) {
      return 'url';
    }
    
    if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      return 'email';
    }
    
    // Check if it's a date
    if (/^\d{4}-\d{2}-\d{2}$/.test(value) || /^\d{1,2}\/\d{1,2}\/\d{4}$/.test(value)) {
      return 'timestamp';
    }
    
    // Check if it's a number/integer
    if (/^-?\d+(\.\d+)?$/.test(value)) {
      return 'integer';
    }
    
    // Check if it's a boolean
    if (/^(true|false|yes|no)$/i.test(value)) {
      return 'boolean';
    }
    
    // Default to text
    return 'text';
  };
  
  // Function to map UI field types to database field types
  const mapFieldTypeToDbType = (uiType) => {
    // The database only supports 'text', 'integer', 'boolean', 'timestamp'
    switch (uiType) {
      case 'url':
      case 'email':
        return 'text';
      case 'integer':
      case 'boolean':
      case 'timestamp':
      case 'text':
        return uiType;
      default:
        return 'text';
    }
  };
  
  const handleCustomFieldChange = (index, field, value) => {
    const updatedCustomFields = [...formData.customFields];
    
    // Update the field with the new value
    updatedCustomFields[index] = {
      ...updatedCustomFields[index],
      [field]: value
    };
    
    // If the field being changed is the value, detect and update the type
    if (field === 'value') {
      updatedCustomFields[index].type = detectFieldType(value);
    }
    
    setFormData(prevData => ({
      ...prevData,
      customFields: updatedCustomFields
    }));
  };
  
  const handleRemoveCustomField = (index) => {
    const updatedCustomFields = formData.customFields.filter((_, i) => i !== index);
    
    setFormData(prevData => ({
      ...prevData,
      customFields: updatedCustomFields
    }));
  };

  // Use the shared form validation function with recently created entities
  const validateForm = () => {
    // Reset recently created labels to avoid validation issues
    setRecentlyCreatedEntities(prev => ({
      ...prev,
      labels: []
    }));
    
    return validateItemForm(formData, setErrors, locations, categories, recentlyCreatedEntities);
  };
  
  // Use the shared form submission function
  const handleSubmit = async (e) => {
    e.preventDefault();
    console.log('Form submission started');
    
    if (!validateForm()) {
      console.log('Form validation failed, aborting submission');
      return;
    }
    
    console.log('Form validation passed, proceeding with submission');
    await submitItemForm(formData, setSubmitting, setErrorAlert, setErrors, navigate);
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
      {/* Breadcrumbs */}
      <Breadcrumbs sx={{ mb: 2 }}>
        <Link component={RouterLink} to="/dashboard" underline="hover" color="inherit">
          Dashboard
        </Link>
        <Link component={RouterLink} to="/items" underline="hover" color="inherit">
          Items
        </Link>
        <Typography color="text.primary">Create Item</Typography>
      </Breadcrumbs>
      
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <Button
          component={RouterLink}
          to="/items"
          startIcon={<ArrowBackIcon />}
          sx={{ mr: 2 }}
        >
          Back
        </Button>
        
        <Typography variant="h4" component="h1">
          Create Item
        </Typography>
      </Box>
      
      <form id="createItemForm" onSubmit={handleSubmit}>
        <Grid container spacing={3}>
          {/* Main Form */}
          <Grid item xs={12} md={8}>
            
            <Paper sx={{ p: 3, mb: 3 }}>
              <Box sx={{ mb: 2 }}>
                <Typography variant="h6">
                  Basic Information
                </Typography>
              </Box>
              
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Name"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    error={!!errors.name}
                    helperText={errors.name || `${formData.name.length} of 100 characters used`}
                    required
                    inputProps={{ maxLength: 100 }}
                  />
                </Grid>
                
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Description"
                    name="description"
                    value={formData.description}
                    onChange={handleChange}
                    multiline
                    rows={3}
                    error={!!errors.description}
                    helperText={errors.description || `${formData.description.length} of 1000 characters used`}
                    inputProps={{ maxLength: 1000 }}
                  />
                </Grid>
                
                <Grid item xs={12}>
                  <Box sx={{ display: 'flex', alignItems: 'flex-start' }}>
                    <Autocomplete
                      options={locations}
                      getOptionLabel={(option) => {
                        // Handle both objects and string IDs
                        if (typeof option === 'string') {
                          const locationObj = locations.find(loc => loc._id === option);
                          if (locationObj) {
                            return getLocationHierarchy(locationObj, locations);
                          }
                          return '';
                        }
                        return getLocationHierarchy(option, locations);
                      }}
                      value={formData.location ? locations.find(loc => loc._id === formData.location) || null : null}
                      onChange={(event, newValue) => {
                        setFormData(prevData => ({
                          ...prevData,
                          location: newValue ? newValue._id : ''
                        }));
                        
                        // Clear error for this field if it exists
                        if (errors.location) {
                          setErrors(prevErrors => ({
                            ...prevErrors,
                            location: null
                          }));
                        }
                      }}
                      isOptionEqualToValue={(option, value) => {
                        // Handle both _id and id properties for compatibility
                        const optionId = option._id || option.id;
                        const valueId = value._id || value.id;
                        return optionId === valueId;
                      }}
                      renderInput={(params) => (
                        <TextField
                          {...params}
                          label="Location"
                          required
                          error={!!errors.location}
                          helperText={errors.location}
                        />
                      )}
                      disablePortal={false}
                      sx={{ flex: 1 }}
                    />
                    <Tooltip title="Add New Location">
                      <IconButton 
                        color="primary"
                        onClick={() => setNewLocationDialog(true)}
                        sx={{ ml: 1, mt: 1 }}
                      >
                        <AddIcon />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </Grid>
                
                <Grid item xs={12}>
                  <Box sx={{ display: 'flex', alignItems: 'flex-start' }}>
                    <Autocomplete
                      options={categories}
                      getOptionLabel={(option) => {
                        // Handle both objects and string IDs
                        if (typeof option === 'string') {
                          const categoryObj = categories.find(cat => cat._id === option);
                          return categoryObj ? categoryObj.name : '';
                        }
                        return option.name;
                      }}
                      value={formData.category ? categories.find(cat => cat._id === formData.category) || null : null}
                      onChange={(event, newValue) => {
                        setFormData(prevData => ({
                          ...prevData,
                          category: newValue ? newValue._id : ''
                        }));
                        
                        // Clear error for this field if it exists
                        if (errors.category) {
                          setErrors(prevErrors => ({
                            ...prevErrors,
                            category: null
                          }));
                        }
                      }}
                      isOptionEqualToValue={(option, value) => {
                        // Handle both _id and id properties for compatibility
                        const optionId = option._id || option.id;
                        const valueId = value._id || value.id;
                        return optionId === valueId;
                      }}
                      renderInput={(params) => (
                        <TextField
                          {...params}
                          label="Category"
                          required
                          error={!!errors.category}
                          helperText={errors.category}
                        />
                      )}
                      disablePortal={false}
                      sx={{ flex: 1 }}
                    />
                    <Tooltip title="Add New Category">
                      <IconButton 
                        color="primary"
                        onClick={() => setNewCategoryDialog(true)}
                        sx={{ ml: 1, mt: 1 }}
                      >
                        <AddIcon />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </Grid>
                
                <Grid item xs={12}>
                  <Box sx={{ display: 'flex', alignItems: 'flex-start' }}>
                    <Autocomplete
                      multiple
                      options={labels}
                      getOptionLabel={(option) => option.name}
                      value={formData.labels}
                      onChange={handleLabelChange}
                      isOptionEqualToValue={(option, value) => {
                        // Handle both _id and id properties for compatibility
                        const optionId = option._id || option.id;
                        const valueId = value._id || value.id;
                        return optionId === valueId;
                      }}
                      renderInput={(params) => (
                        <TextField
                          {...params}
                          label="Labels"
                          placeholder="Select labels"
                        />
                      )}
                      renderTags={(value, getTagProps) =>
                        value.map((option, index) => {
                          const props = getTagProps({ index });
                          // Extract key from props to avoid React warning
                          const { key, ...chipProps } = props;
                          return (
                            <Chip
                              key={key}
                              label={option.name}
                              {...chipProps}
                              sx={{
                                bgcolor: option.color,
                                color: 'white',
                              }}
                            />
                          );
                        })
                      }
                      disablePortal={false}
                      sx={{ flex: 1 }}
                    />
                    <Tooltip title="Add New Label">
                      <IconButton 
                        color="primary"
                        onClick={() => setNewLabelDialog(true)}
                        sx={{ ml: 1, mt: 1 }}
                      >
                        <AddIcon />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </Grid>
              </Grid>
            </Paper>
            
            <Paper sx={{ p: 3, mb: 3 }}>
              <Typography variant="h6" gutterBottom>
                Details
              </Typography>
              
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Asset ID"
                    name="assetId"
                    value={formData.assetId || nextAssetId}
                    InputProps={{ readOnly: true }}
                    helperText="Auto-generated ID"
                  />
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Quantity"
                    name="quantity"
                    type="number"
                    value={formData.quantity}
                    onChange={handleChange}
                    error={!!errors.quantity}
                    helperText={errors.quantity}
                    InputProps={{ inputProps: { min: 1 } }}
                  />
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Serial Number"
                    name="serialNumber"
                    value={formData.serialNumber}
                    onChange={handleChange}
                  />
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Model Number"
                    name="modelNumber"
                    value={formData.modelNumber}
                    onChange={handleChange}
                  />
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Manufacturer"
                    name="manufacturer"
                    value={formData.manufacturer}
                    onChange={handleChange}
                  />
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Item URL"
                    name="itemUrl"
                    value={formData.itemUrl || ''}
                    onChange={handleChange}
                    placeholder="https://example.com/product"
                    InputProps={{
                      endAdornment: formData.itemUrl ? (
                        <InputAdornment position="end">
                          <IconButton
                            onClick={() => window.open(formData.itemUrl, '_blank')}
                            edge="end"
                            size="small"
                          >
                            <OpenInNewIcon />
                          </IconButton>
                        </InputAdornment>
                      ) : null
                    }}
                  />
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Manual URL"
                    name="manualUrl"
                    value={formData.manualUrl || ''}
                    onChange={handleChange}
                    placeholder="https://example.com/manual"
                    InputProps={{
                      endAdornment: formData.manualUrl ? (
                        <InputAdornment position="end">
                          <IconButton
                            onClick={() => window.open(formData.manualUrl, '_blank')}
                            edge="end"
                            size="small"
                          >
                            <OpenInNewIcon />
                          </IconButton>
                        </InputAdornment>
                      ) : null
                    }}
                  />
                </Grid>
                
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Notes"
                    name="notes"
                    value={formData.notes}
                    onChange={handleChange}
                    multiline
                    rows={2}
                  />
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <FormControlLabel
                    control={
                      <Checkbox
                        name="isInsured"
                        checked={formData.isInsured}
                        onChange={handleChange}
                      />
                    }
                    label="Insured"
                  />
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <FormControlLabel
                    control={
                      <Checkbox
                        name="isArchived"
                        checked={formData.isArchived}
                        onChange={handleChange}
                      />
                    }
                    label="Archived"
                  />
                </Grid>
              </Grid>
            </Paper>
            
            <Paper sx={{ p: 3, mb: 3 }}>
              <Typography variant="h6" gutterBottom>
                Purchase Details
              </Typography>
              
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Purchased From"
                    name="purchasedFrom"
                    value={formData.purchasedFrom}
                    onChange={handleChange}
                  />
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Purchase Price"
                    name="purchasePrice"
                    type="number"
                    value={formData.purchasePrice}
                    onChange={handleChange}
                    error={!!errors.purchasePrice}
                    helperText={errors.purchasePrice}
                    InputProps={{
                      startAdornment: <Box component="span" sx={{ mr: 1 }}>$</Box>,
                      inputProps: { step: 0.01, min: 0 }
                    }}
                  />
                </Grid>
                
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Purchase Date"
                    name="purchaseDate"
                    type="date"
                    value={formData.purchaseDate}
                    onChange={handleChange}
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>
              </Grid>
            </Paper>
            
            <Paper sx={{ p: 3, mb: 3 }}>
              <Typography variant="h6" gutterBottom>
                Warranty Details
              </Typography>
              
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <FormControlLabel
                    control={
                      <Checkbox
                        name="hasLifetimeWarranty"
                        checked={formData.hasLifetimeWarranty}
                        onChange={handleChange}
                      />
                    }
                    label="Lifetime Warranty"
                  />
                </Grid>
                
                {!formData.hasLifetimeWarranty && (
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Warranty Expires"
                      name="warrantyExpires"
                      type="date"
                      value={formData.warrantyExpires}
                      onChange={handleChange}
                      error={!!errors.warrantyExpires}
                      helperText={errors.warrantyExpires}
                      InputLabelProps={{ shrink: true }}
                    />
                  </Grid>
                )}
                
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Warranty Notes"
                    name="warrantyNotes"
                    value={formData.warrantyNotes}
                    onChange={handleChange}
                    multiline
                    rows={2}
                  />
                </Grid>
              </Grid>
            </Paper>
            
            <Paper sx={{ p: 3, mb: 3 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">
                  Custom Fields
                </Typography>
                
                <Button
                  startIcon={<AddIcon />}
                  onClick={handleAddCustomField}
                >
                  Add Field
                </Button>
              </Box>
              
              {formData.customFields.length === 0 ? (
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  No custom fields added yet. Click "Add Field" to create one.
                </Typography>
              ) : (
                <Grid container spacing={2}>
                  {formData.customFields.map((field, index) => (
                    <React.Fragment key={index}>
                      <Grid item xs={5}>
                        <TextField
                          fullWidth
                          label="Field Name"
                          value={field.name}
                          onChange={(e) => handleCustomFieldChange(index, 'name', e.target.value)}
                          size="small"
                        />
                      </Grid>
                      
                      <Grid item xs={5}>
                        <TextField
                          fullWidth
                          label="Field Value"
                          value={field.value}
                          onChange={(e) => handleCustomFieldChange(index, 'value', e.target.value)}
                          size="small"
                        />
                      </Grid>
                      
                      <Grid item xs={2}>
                        <IconButton 
                          color="error" 
                          onClick={() => handleRemoveCustomField(index)}
                          sx={{ mt: 1 }}
                        >
                          <DeleteIcon />
                        </IconButton>
                      </Grid>
                    </React.Fragment>
                  ))}
                </Grid>
              )}
            </Paper>
            
            <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
              <Button
                type="submit"
                variant="contained"
                color="primary"
                startIcon={<SaveIcon />}
                disabled={submitting}
                sx={{ minWidth: 120 }}
              >
                {submitting ? <CircularProgress size={24} /> : 'Save'}
              </Button>
            </Box>
          </Grid>
          
          {/* Sidebar */}
          <Grid item xs={12} md={4}>
            {/* Mobile Photo Section */}
            <MobilePhotoSection />
            
            {/* Other sidebar sections would go here */}
          </Grid>
        </Grid>
      </form>
      
      {/* Barcode Scanner Dialog */}
      {scannerOpen && (
        <BarcodeScanner
          open={scannerOpen}
          onClose={handleCloseScanner}
          onDetected={handleBarcodeDetected}
        />
      )}
      
      {/* Add Location Dialog */}
      <Dialog open={newLocationDialog} onClose={() => setNewLocationDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Add New Location</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1 }}>
            <TextField
              fullWidth
              label="Name"
              value={newLocation.name}
              onChange={(e) => setNewLocation({ ...newLocation, name: e.target.value })}
              margin="normal"
              required
            />
            <TextField
              fullWidth
              label="Description"
              value={newLocation.description}
              onChange={(e) => setNewLocation({ ...newLocation, description: e.target.value })}
              margin="normal"
              multiline
              rows={3}
            />
            <Autocomplete
              options={[{ _id: '', name: 'None (Top Level)' }, ...locations]}
              getOptionLabel={(option) => {
                if (option._id === '') return 'None (Top Level)';
                return getLocationHierarchy(option, locations);
              }}
              value={newLocation.parent ? locations.find(loc => loc._id === newLocation.parent) || null : { _id: '', name: 'None (Top Level)' }}
              onChange={(event, newValue) => {
                setNewLocation({ 
                  ...newLocation, 
                  parent: newValue && newValue._id !== '' ? newValue._id : '' 
                });
              }}
              isOptionEqualToValue={(option, value) => {
                if (option._id === '' && (!value || value._id === '')) return true;
                return option._id === value._id;
              }}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Parent Location"
                  margin="normal"
                  fullWidth
                />
              )}
              disablePortal={false}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setNewLocationDialog(false)}>Cancel</Button>
          <Button 
            variant="contained" 
            onClick={async () => {
              if (!newLocation.name.trim()) {
                setErrorAlert('Location name is required');
                return;
              }
              
              try {
                const response = await axios.post('/api/locations', {
                  name: newLocation.name,
                  description: newLocation.description,
                  parent: newLocation.parent || null
                });
                
                if (response.data.success) {
                  // Add the new location to the locations array
                  const newLoc = response.data.data;
                  setLocations([...locations, newLoc]);
                  
                  // Select the new location in the form
                  setFormData(prevData => ({
                    ...prevData,
                    location: newLoc._id
                  }));
                  
                  // Track the newly created location
                  setRecentlyCreatedEntities(prev => ({
                    ...prev,
                    location: newLoc
                  }));
                  
                  // Reset the new location form
                  setNewLocation({ name: '', description: '', parent: '' });
                  
                  // Close the dialog
                  setNewLocationDialog(false);
                  
                  // No success message needed - the UI update speaks for itself
                } else {
                  setErrorAlert('Error creating location: ' + response.data.message);
                }
              } catch (err) {
                setErrorAlert('Error creating location: ' + (err.response?.data?.message || err.message));
                console.error(err);
              }
            }}
          >
            Create
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Add Category Dialog */}
      <Dialog open={newCategoryDialog} onClose={() => setNewCategoryDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Add New Category</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1 }}>
            <TextField
              fullWidth
              label="Name"
              value={newCategory.name}
              onChange={(e) => setNewCategory({ ...newCategory, name: e.target.value })}
              margin="normal"
              required
            />
            <TextField
              fullWidth
              label="Description"
              value={newCategory.description}
              onChange={(e) => setNewCategory({ ...newCategory, description: e.target.value })}
              margin="normal"
              multiline
              rows={3}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setNewCategoryDialog(false)}>Cancel</Button>
          <Button 
            variant="contained" 
            onClick={async () => {
              if (!newCategory.name.trim()) {
                setErrorAlert('Category name is required');
                return;
              }
              
              try {
                const response = await axios.post('/api/categories', {
                  name: newCategory.name,
                  description: newCategory.description
                });
                
                if (response.data.success) {
                  // Add the new category to the categories array
                  const newCat = response.data.data;
                  setCategories([...categories, newCat]);
                  
                  // Select the new category in the form
                  setFormData(prevData => ({
                    ...prevData,
                    category: newCat._id
                  }));
                  
                  // Track the newly created category
                  setRecentlyCreatedEntities(prev => ({
                    ...prev,
                    category: newCat
                  }));
                  
                  // Reset the new category form
                  setNewCategory({ name: '', description: '' });
                  
                  // Close the dialog
                  setNewCategoryDialog(false);
                  
                  // No success message needed - the UI update speaks for itself
                } else {
                  setErrorAlert('Error creating category: ' + response.data.message);
                }
              } catch (err) {
                setErrorAlert('Error creating category: ' + (err.response?.data?.message || err.message));
                console.error(err);
              }
            }}
          >
            Create
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Add Label Dialog */}
      <Dialog open={newLabelDialog} onClose={() => setNewLabelDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Add New Label</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1 }}>
            <TextField
              fullWidth
              label="Name"
              value={newLabel.name}
              onChange={(e) => setNewLabel({ ...newLabel, name: e.target.value })}
              margin="normal"
              required
            />
            <TextField
              fullWidth
              label="Description"
              value={newLabel.description}
              onChange={(e) => setNewLabel({ ...newLabel, description: e.target.value })}
              margin="normal"
              multiline
              rows={3}
            />
            <TextField
              fullWidth
              label="Color"
              type="color"
              value={newLabel.color}
              onChange={(e) => setNewLabel({ ...newLabel, color: e.target.value })}
              margin="normal"
              InputProps={{
                startAdornment: (
                  <Box 
                    sx={{ 
                      width: 24, 
                      height: 24, 
                      borderRadius: '50%', 
                      backgroundColor: newLabel.color,
                      mr: 1,
                      border: '1px solid rgba(0, 0, 0, 0.23)'
                    }} 
                  />
                )
              }}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setNewLabelDialog(false)}>Cancel</Button>
          <Button 
            variant="contained" 
            onClick={async () => {
              if (!newLabel.name.trim()) {
                setErrorAlert('Label name is required');
                return;
              }
              
              try {
                const response = await axios.post('/api/labels', {
                  name: newLabel.name,
                  description: newLabel.description,
                  color: newLabel.color
                });
                
                if (response.data.success) {
                  // Add the new label to the labels array
                  const newLab = response.data.data;
                  setLabels([...labels, newLab]);
                  
                  // Add the new label to the selected labels in the form
                  setFormData(prevData => ({
                    ...prevData,
                    labels: [...prevData.labels, newLab]
                  }));
                  
                  // Don't track the newly created label to avoid validation issues
                  // Instead, just add it to the labels array
                  setLabels(prevLabels => [...prevLabels, newLab]);
                  
                  // Reset the new label form
                  setNewLabel({ name: '', description: '', color: '#3f51b5' });
                  
                  // Close the dialog
                  setNewLabelDialog(false);
                  
                  // No success message needed - the UI update speaks for itself
                } else {
                  setErrorAlert('Error creating label: ' + response.data.message);
                }
              } catch (err) {
                setErrorAlert('Error creating label: ' + (err.response?.data?.message || err.message));
                console.error(err);
              }
            }}
          >
            Create
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default CreateItem;

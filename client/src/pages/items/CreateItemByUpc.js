import React, { useState, useEffect, useContext, useMemo, useCallback } from 'react';
import axios from '../../utils/axiosConfig';
import { submitItemForm } from '../../utils/itemFormUtils';
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
import useItemForm from '../../hooks/useItemForm';
import useLookupService from '../../hooks/useLookupService';
import LookupSection from '../../components/items/LookupSection';
import { getLocationHierarchy } from '../../utils/locationUtils';

const CreateItemByUpc = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { setSuccessAlert, setErrorAlert } = useContext(AlertContext);
  const { isMobile, clearCapturedPhotos } = useMobile();
  const hasCamera = useHasCamera();
  
  // State for form submission
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Get location ID from URL query parameters if it exists
  const queryParams = new URLSearchParams(location.search);
  const locationId = queryParams.get('location');
  
  // Check for pre-filled data from shopping assistant or other sources
  const prefillData = location.state?.prefillData || {};
  
  // Memoize the initialData to prevent re-renders
  const initialFormData = useMemo(() => ({
    name: prefillData.name || '',
    description: prefillData.description || '',
    location: locationId || '',
    category: '',
    quantity: 1,
    serialNumber: '',
    modelNumber: prefillData.modelNumber || '',
    manufacturer: prefillData.manufacturer || '',
    notes: '',
    isInsured: false,
    isArchived: false,
    purchasedFrom: '',
    purchasePrice: '',
    purchaseDate: new Date().toISOString().split('T')[0], // Default to today
    hasLifetimeWarranty: false,
    warrantyExpires: '',
    warrantyNotes: '',
    customFields: [],
    upcCode: prefillData.upcCode || '',
    itemUrl: '',
    manualUrl: '',
    labels: [] // Ensure labels array is initialized
  }), [prefillData.name, prefillData.description, locationId, prefillData.modelNumber, prefillData.manufacturer, prefillData.upcCode]);
  
  // Memoize the onSuccess callback
  const handleSuccess = useCallback((item) => {
    // Clear any captured photos after successful submission
    if (clearCapturedPhotos) {
      clearCapturedPhotos();
    }
    navigate('/items');
  }, [navigate, clearCapturedPhotos]);
  
  // Initialize form
  const {
    formData, 
    setFormData,
    loading, 
    submitting,
    errors,
    setErrors,
    locations,
    categories,
    labels,
    nextAssetId,
    newLocationDialog,
    setNewLocationDialog,
    newCategoryDialog,
    setNewCategoryDialog,
    newLabelDialog,
    setNewLabelDialog,
    handleChange,
    handleLabelChange,
    handleSubmit,
    handleCreateLocation,
    handleCreateCategory,
    handleCreateLabel,
    newLocation,
    setNewLocation,
    newCategory,
    setNewCategory,
    newLabel,
    setNewLabel,
    handleAddCustomField,
    handleRemoveCustomField,
    handleCustomFieldChange
  } = useItemForm({
    initialData: initialFormData,
    mode: 'create',
    onSuccess: handleSuccess
  });
  
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
  
  // Memoize the onDataFound callback for UPC lookup
  const handleProductDataFound = useCallback((productData) => {
    // Update form data with product information
    setFormData(prevData => ({
      ...prevData,
      name: productData.name || prevData.name,
      description: productData.description || prevData.description,
      manufacturer: productData.manufacturer || prevData.manufacturer,
      modelNumber: productData.modelNumber || prevData.modelNumber,
      upcCode: productData.upcCode || prevData.upcCode
    }));
    
    // Try to match category if available
    if (productData.category && categories.length > 0) {
      const matchedCategory = categories.find(
        cat => cat.name.toLowerCase() === productData.category.toLowerCase()
      );
      
      if (matchedCategory) {
        setFormData(prevData => ({ ...prevData, category: matchedCategory._id }));
      }
    }
  }, [setFormData, categories]);
  
  // Setup UPC lookup functionality
  const {
    lookupValue: upcCode,
    isLookingUp: lookingUpUPC,
    scannerOpen,
    handleValueChange: handleUpcChange,
    handleLookup: handleUpcLookup,
    handleOpenScanner,
    handleCloseScanner,
    handleBarcodeDetected
  } = useLookupService({
    type: 'upc',
    onDataFound: handleProductDataFound
  });
  
  // Sync UPC code from lookup component to form data
  useEffect(() => {
    if (upcCode) {
      // If it's a URL, extract it properly for the form
      if (/^https?:\/\//.test(upcCode)) {
        setFormData(prev => ({ 
          ...prev, 
          itemUrl: upcCode,
          // Make sure we don't submit a URL as a UPC code
          upcCode: '' 
        }));
      } else {
        // It's a valid UPC code
        setFormData(prev => ({ ...prev, upcCode }));
      }
    }
  }, [upcCode, setFormData]);
  
  // We no longer need a custom validateForm or handleFormSubmit as we're using the hook's implementation
  
  if (loading) {
    return (
      <Box 
        sx={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center', 
          height: 'calc(100vh - 64px)' 
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
        <Typography color="text.primary">Create Item by UPC</Typography>
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
          Create Item by UPC Lookup
        </Typography>
      </Box>
      
      <form onSubmit={handleSubmit}>
        <Grid container spacing={3}>
          {/* Main Form */}
          <Grid item xs={12} md={8}>
            {/* UPC Lookup Section */}
            <LookupSection
              type="upc"
              value={upcCode}
              onChange={handleUpcChange}
              onLookup={handleUpcLookup}
              isLookingUp={lookingUpUPC}
              scannerOpen={scannerOpen}
              onScannerOpen={handleOpenScanner}
              onScannerClose={handleCloseScanner}
              onBarcodeDetected={handleBarcodeDetected}
            />
            
            {/* Basic Information */}
            <Paper sx={{ p: 3, mb: 3 }}>
              <Typography variant="h6" gutterBottom>Basic Information</Typography>
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
                        if (typeof option === 'string') {
                          const locationObj = locations.find(loc => loc._id === option);
                          if (locationObj) return getLocationHierarchy(locationObj, locations);
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
                      }}
                      isOptionEqualToValue={(option, value) => option._id === value._id}
                      renderInput={(params) => (
                        <TextField
                          {...params}
                          label="Location"
                          required
                          error={!!errors.location}
                          helperText={errors.location}
                        />
                      )}
                      sx={{ flex: 1 }}
                    />
                    <Button 
                      color="primary"
                      onClick={() => setNewLocationDialog(true)}
                      sx={{ ml: 1, mt: 1, minWidth: 0 }}
                    >
                      <AddIcon />
                    </Button>
                  </Box>
                </Grid>
                
                <Grid item xs={12}>
                  <Box sx={{ display: 'flex', alignItems: 'flex-start' }}>
                    <Autocomplete
                      options={categories}
                      getOptionLabel={(option) => {
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
                      }}
                      isOptionEqualToValue={(option, value) => option._id === value._id}
                      renderInput={(params) => (
                        <TextField
                          {...params}
                          label="Category"
                          required
                          error={!!errors.category}
                          helperText={errors.category}
                        />
                      )}
                      sx={{ flex: 1 }}
                    />
                    <Button 
                      color="primary"
                      onClick={() => setNewCategoryDialog(true)}
                      sx={{ ml: 1, mt: 1, minWidth: 0 }}
                    >
                      <AddIcon />
                    </Button>
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
                      isOptionEqualToValue={(option, value) => option._id === value._id}
                      renderInput={(params) => (
                        <TextField {...params} label="Labels" placeholder="Select labels" />
                      )}
                      renderTags={(value, getTagProps) =>
                        value.map((option, index) => {
                          const { key, ...chipProps } = getTagProps({ index });
                          return (
                            <Chip
                              key={key}
                              label={option.name}
                              {...chipProps}
                              sx={{ bgcolor: option.color, color: 'white' }}
                            />
                          );
                        })
                      }
                      sx={{ flex: 1 }}
                    />
                    <Button 
                      color="primary"
                      onClick={() => setNewLabelDialog(true)}
                      sx={{ ml: 1, mt: 1, minWidth: 0 }}
                    >
                      <AddIcon />
                    </Button>
                  </Box>
                </Grid>
              </Grid>
            </Paper>
            
            {/* Details */}
            <Paper sx={{ p: 3, mb: 3 }}>
              <Typography variant="h6" gutterBottom>Details</Typography>
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
                    control={<Checkbox name="isInsured" checked={formData.isInsured} onChange={handleChange} />}
                    label="Insured"
                  />
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <FormControlLabel
                    control={<Checkbox name="isArchived" checked={formData.isArchived} onChange={handleChange} />}
                    label="Archived"
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
              </Grid>
            </Paper>
            
            {/* Purchase Details */}
            <Paper sx={{ p: 3, mb: 3 }}>
              <Typography variant="h6" gutterBottom>Purchase Details</Typography>
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
            
            {/* Warranty Details */}
            <Paper sx={{ p: 3, mb: 3 }}>
              <Typography variant="h6" gutterBottom>Warranty Details</Typography>
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <FormControlLabel
                    control={<Checkbox name="hasLifetimeWarranty" checked={formData.hasLifetimeWarranty} onChange={handleChange} />}
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
            
            {/* Custom Fields */}
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
            
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 3 }}>
              <Button
                type="submit"
                variant="contained"
                color="primary"
                startIcon={submitting || isSubmitting ? <CircularProgress size={24} /> : <SaveIcon />}
                disabled={submitting || isSubmitting}
              >
                Save Item
              </Button>
            </Box>
          </Grid>
          
          {/* Sidebar */}
          <Grid item xs={12} md={4}>
            <MobilePhotoSection />
          </Grid>
        </Grid>
      </form>
      
      {/* Barcode Scanner */}
      <BarcodeScanner
        open={scannerOpen}
        onClose={handleCloseScanner}
        onDetected={handleBarcodeDetected}
      />
      
      {/* New Location Dialog */}
      <Dialog open={newLocationDialog} onClose={() => setNewLocationDialog(false)}>
        <DialogTitle>Add New Location</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Name"
                value={newLocation.name}
                onChange={(e) => setNewLocation({ ...newLocation, name: e.target.value })}
                required
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Description"
                value={newLocation.description}
                onChange={(e) => setNewLocation({ ...newLocation, description: e.target.value })}
                multiline
                rows={2}
              />
            </Grid>
            <Grid item xs={12}>
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
                    fullWidth
                  />
                )}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setNewLocationDialog(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleCreateLocation}
          >
            Create
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* New Category Dialog */}
      <Dialog open={newCategoryDialog} onClose={() => setNewCategoryDialog(false)}>
        <DialogTitle>Add New Category</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Name"
                value={newCategory.name}
                onChange={(e) => setNewCategory({ ...newCategory, name: e.target.value })}
                required
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Description"
                value={newCategory.description}
                onChange={(e) => setNewCategory({ ...newCategory, description: e.target.value })}
                multiline
                rows={2}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setNewCategoryDialog(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleCreateCategory}
          >
            Create
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* New Label Dialog */}
      <Dialog open={newLabelDialog} onClose={() => setNewLabelDialog(false)}>
        <DialogTitle>Add New Label</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Name"
                value={newLabel.name}
                onChange={(e) => setNewLabel({ ...newLabel, name: e.target.value })}
                required
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Description"
                value={newLabel.description}
                onChange={(e) => setNewLabel({ ...newLabel, description: e.target.value })}
                multiline
                rows={2}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Color"
                value={newLabel.color}
                onChange={(e) => setNewLabel({ ...newLabel, color: e.target.value })}
                type="color"
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setNewLabelDialog(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleCreateLabel}
          >
            Create
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default CreateItemByUpc;

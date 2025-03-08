import React, { useState, useEffect, useContext } from 'react';
import axios from '../../utils/axiosConfig';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
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
  Tooltip
} from '@mui/material';
import {
  Save as SaveIcon,
  ArrowBack as ArrowBackIcon,
  Add as AddIcon,
  Search as SearchIcon,
  QrCode as QrCodeIcon,
  QrCodeScanner as QrCodeScannerIcon
} from '@mui/icons-material';
import { AlertContext } from '../../context/AlertContext';
import BarcodeScanner from '../../components/scanner/BarcodeScanner';
import useHasCamera from '../../hooks/useHasCamera';

const CreateItem = () => {
  const navigate = useNavigate();
  const { setSuccessAlert, setErrorAlert } = useContext(AlertContext);
  
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [lookingUpUPC, setLookingUpUPC] = useState(false);
  const [showUpcLookup, setShowUpcLookup] = useState(true);
  const [locations, setLocations] = useState([]);
  const [categories, setCategories] = useState([]);
  const [labels, setLabels] = useState([]);
  const [upcCode, setUpcCode] = useState('');
  const [scannerOpen, setScannerOpen] = useState(false);
  const hasCamera = useHasCamera();
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    location: '',
    category: '',
    labels: [],
    quantity: 1,
    serialNumber: '',
    modelNumber: '',
    manufacturer: '',
    notes: '',
    isInsured: false,
    isArchived: false,
    purchasedFrom: '',
    purchasePrice: '',
    purchaseDate: '',
    hasLifetimeWarranty: false,
    warrantyExpires: '',
    warrantyNotes: '',
    customFields: [],
    upcCode: ''
  });
  
  const [errors, setErrors] = useState({});

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Make API calls to fetch locations, categories, and labels
        const [locationsRes, categoriesRes, labelsRes] = await Promise.all([
          axios.get('/api/locations?flat=true'),
          axios.get('/api/categories'),
          axios.get('/api/labels')
        ]);
        
        if (locationsRes.data.success) {
          setLocations(locationsRes.data.data || []);
        }
        
        if (categoriesRes.data.success) {
          setCategories(categoriesRes.data.data || []);
        }
        
        if (labelsRes.data.success) {
          setLabels(labelsRes.data.data || []);
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
  
  const handleUpcChange = (e) => {
    const value = e.target.value;
    setUpcCode(value);
    
    // Also update the formData with the UPC code
    setFormData(prevData => ({
      ...prevData,
      upcCode: value
    }));
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
    
    // Set the UPC code
    setUpcCode(code);
    
    // Also update the formData with the UPC code
    setFormData(prevData => ({
      ...prevData,
      upcCode: code
    }));
    
    // Automatically trigger UPC lookup
    setTimeout(() => {
      handleUpcLookup();
    }, 500);
  };
  
  const handleUpcLookup = async () => {
    if (!upcCode.trim()) {
      setErrorAlert('Please enter a UPC code');
      return;
    }
    
    setLookingUpUPC(true);
    
    try {
      const response = await axios.get(`/api/upc/${upcCode.trim()}`);
      
      if (response.data.success) {
        const productData = response.data.data;
        
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
            setFormData(prevData => ({
              ...prevData,
              category: matchedCategory._id
            }));
          }
        }
        
        setSuccessAlert('Product information retrieved successfully');
      } else {
        setErrorAlert('No product found for this UPC code');
      }
    } catch (err) {
      setErrorAlert('Error looking up UPC code: ' + (err.response?.data?.message || err.message));
      console.error(err);
    } finally {
      setLookingUpUPC(false);
    }
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
        { name: '', value: '' }
      ]
    }));
  };

  // Function to detect the type of input based on its value
  const detectFieldType = (value) => {
    // Check if it's a URL or email - both will be stored as text in the database
    // but displayed differently in the UI
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

  const validateForm = () => {
    const newErrors = {};
    
    // Required fields
    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }
    
    // Check name length
    if (formData.name && formData.name.length > 100) {
      newErrors.name = 'Name cannot exceed 100 characters';
    }
    
    if (!formData.location) {
      newErrors.location = 'Location is required';
    }
    
    if (!formData.category) {
      newErrors.category = 'Category is required';
    }
    
    // Check description length
    if (formData.description && formData.description.length > 1000) {
      newErrors.description = 'Description cannot exceed 1000 characters';
    }
    
    // Quantity must be a positive number
    if (formData.quantity <= 0) {
      newErrors.quantity = 'Quantity must be greater than 0';
    }
    
    // Purchase price must be a valid number if provided
    if (formData.purchasePrice && isNaN(parseFloat(formData.purchasePrice))) {
      newErrors.purchasePrice = 'Purchase price must be a valid number';
    }
    
    // Warranty expiration date must be in the future if provided and not lifetime warranty
    if (!formData.hasLifetimeWarranty && formData.warrantyExpires) {
      const warrantyDate = new Date(formData.warrantyExpires);
      const today = new Date();
      
      if (warrantyDate <= today) {
        newErrors.warrantyExpires = 'Warranty expiration date must be in the future';
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setSubmitting(true);
    
    try {
      // Map UI field types to database field types before submitting
      const submissionData = {
        ...formData,
        customFields: formData.customFields.map(field => ({
          ...field,
          type: mapFieldTypeToDbType(field.type)
        }))
      };
      
      // Make API call to create the item
      const response = await axios.post('/api/items', submissionData);
      
      if (response.data.success) {
        setSuccessAlert('Item created successfully');
        navigate('/items');
      } else {
        setErrorAlert('Error creating item: ' + response.data.message);
      }
    } catch (err) {
      if (err.response && err.response.data && err.response.data.message) {
        if (err.response.data.message.includes('description')) {
          setErrors(prev => ({
            ...prev,
            description: 'Description cannot exceed 1000 characters'
          }));
          setErrorAlert('Error creating item: Description is too long');
        } else if (err.response.data.message.includes('name')) {
          setErrors(prev => ({
            ...prev,
            name: 'Name cannot exceed 100 characters'
          }));
          setErrorAlert('Error creating item: Name is too long');
        } else {
          setErrorAlert('Error creating item: ' + err.response.data.message);
        }
      } else {
        setErrorAlert('Error creating item: ' + (err.message || 'Unknown error'));
      }
      console.error(err);
    } finally {
      setSubmitting(false);
    }
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
      
      <form onSubmit={handleSubmit}>
        <Grid container spacing={3}>
          {/* Main Form */}
          <Grid item xs={12} md={8}>
            {showUpcLookup && (
              <Paper sx={{ p: 3, mb: 3 }}>
                <Typography variant="h6" gutterBottom>
                  UPC Lookup
                </Typography>
                
                <Grid container spacing={2} alignItems="center">
                  <Grid item xs={8}>
                    <TextField
                      fullWidth
                      label="UPC Code"
                      value={upcCode}
                      onChange={handleUpcChange}
                      placeholder="Enter UPC code to lookup product information"
                      InputProps={{
                        endAdornment: (
                          <InputAdornment position="end">
                            <Tooltip title="Scan Barcode">
                              <IconButton 
                                color="primary" 
                                onClick={handleOpenScanner}
                                size="small"
                              >
                                <QrCodeScannerIcon />
                              </IconButton>
                            </Tooltip>
                          </InputAdornment>
                        )
                      }}
                    />
                  </Grid>
                  <Grid item xs={4}>
                    <Button
                      fullWidth
                      variant="contained"
                      color="primary"
                      startIcon={lookingUpUPC ? <CircularProgress size={24} color="inherit" /> : <SearchIcon />}
                      onClick={handleUpcLookup}
                      disabled={lookingUpUPC || !upcCode.trim()}
                    >
                      {lookingUpUPC ? 'Looking Up...' : 'Lookup'}
                    </Button>
                  </Grid>
                </Grid>
              </Paper>
            )}
            
            <Paper sx={{ p: 3, mb: 3 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">
                  Basic Information
                </Typography>
                
                <Button
                  startIcon={<QrCodeIcon />}
                  onClick={() => setShowUpcLookup(!showUpcLookup)}
                  color={showUpcLookup ? "primary" : "inherit"}
                  variant={showUpcLookup ? "contained" : "outlined"}
                  size="small"
                >
                  {showUpcLookup ? "Hide UPC Lookup" : "UPC Lookup"}
                </Button>
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
                
                <Grid item xs={12} sm={6}>
                  <Autocomplete
                    options={locations}
                    getOptionLabel={(option) => {
                      // Handle both objects and string IDs
                      if (typeof option === 'string') {
                        const locationObj = locations.find(loc => loc._id === option);
                        return locationObj ? locationObj.name : '';
                      }
                      return option.name;
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
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label="Location"
                        required
                        error={!!errors.location}
                        helperText={errors.location}
                      />
                    )}
                  />
                </Grid>
                
                <Grid item xs={12} sm={6}>
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
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label="Category"
                        required
                        error={!!errors.category}
                        helperText={errors.category}
                      />
                    )}
                  />
                </Grid>
                
                <Grid item xs={12}>
                  <Autocomplete
                    multiple
                    options={labels}
                    getOptionLabel={(option) => option.name}
                    value={formData.labels}
                    onChange={handleLabelChange}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label="Labels"
                        placeholder="Select labels"
                      />
                    )}
                    renderTags={(value, getTagProps) =>
                      value.map((option, index) => (
                        <Chip
                          label={option.name}
                          {...getTagProps({ index })}
                          sx={{
                            bgcolor: option.color,
                            color: 'white',
                          }}
                        />
                      ))
                    }
                  />
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
            
            <Paper sx={{ p: 3 }}>
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
                      <Grid item xs={4}>
                        <TextField
                          fullWidth
                          label="Field Name"
                          value={field.name}
                          onChange={(e) => handleCustomFieldChange(index, 'name', e.target.value)}
                          size="small"
                        />
                      </Grid>
                      
                      <Grid item xs={4}>
                        {field.type === 'integer' ? (
                          <TextField
                            fullWidth
                            label="Field Value (Number)"
                            value={field.value}
                            onChange={(e) => handleCustomFieldChange(index, 'value', e.target.value)}
                            size="small"
                            type="number"
                            inputProps={{ step: 1 }}
                            helperText="Enter a whole number"
                          />
                        ) : field.type === 'boolean' ? (
                          <FormControl fullWidth size="small">
                            <InputLabel id={`custom-field-${index}-boolean-label`}>Field Value (Yes/No)</InputLabel>
                            <Select
                              labelId={`custom-field-${index}-boolean-label`}
                              value={field.value === 'true' ? 'true' : field.value === 'false' ? 'false' : ''}
                              onChange={(e) => handleCustomFieldChange(index, 'value', e.target.value)}
                              label="Field Value (Yes/No)"
                            >
                              <MenuItem value="true">Yes</MenuItem>
                              <MenuItem value="false">No</MenuItem>
                            </Select>
                          </FormControl>
                        ) : field.type === 'timestamp' ? (
                          <TextField
                            fullWidth
                            label="Field Value (Date)"
                            value={field.value}
                            onChange={(e) => handleCustomFieldChange(index, 'value', e.target.value)}
                            size="small"
                            type="date"
                            InputLabelProps={{ shrink: true }}
                          />
                        ) : (
                          <TextField
                            fullWidth
                            label="Field Value"
                            value={field.value}
                            onChange={(e) => handleCustomFieldChange(index, 'value', e.target.value)}
                            size="small"
                            helperText={field.type ? `Detected as: ${field.type}` : ''}
                          />
                        )}
                      </Grid>
                      
                      <Grid item xs={2}>
                        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                          <Chip 
                            label={field.type || 'text'} 
                            size="small"
                            color={
                              field.type === 'url' ? 'primary' :
                              field.type === 'email' ? 'secondary' :
                              field.type === 'timestamp' ? 'success' :
                              field.type === 'integer' ? 'info' :
                              field.type === 'boolean' ? 'warning' :
                              'default'
                            }
                            sx={{ mb: 1 }}
                          />
                          <FormControl size="small">
                            <Select
                              value={field.type || 'text'}
                              onChange={(e) => {
                                // Update the field type and convert the value if needed
                                const newType = e.target.value;
                                let newValue = field.value;
                                
                                // Convert value based on new type
                                if (newType === 'boolean') {
                                  newValue = newValue ? 'true' : 'false';
                                } else if (newType === 'integer') {
                                  newValue = isNaN(parseInt(newValue)) ? '0' : parseInt(newValue).toString();
                                } else if (newType === 'timestamp' && !newValue.match(/^\d{4}-\d{2}-\d{2}$/)) {
                                  newValue = new Date().toISOString().split('T')[0];
                                }
                                
                                // Update both type and value
                                const updatedCustomFields = [...formData.customFields];
                                updatedCustomFields[index] = {
                                  ...updatedCustomFields[index],
                                  type: newType,
                                  value: newValue
                                };
                                
                                setFormData(prevData => ({
                                  ...prevData,
                                  customFields: updatedCustomFields
                                }));
                              }}
                              displayEmpty
                              size="small"
                              sx={{ minWidth: 100 }}
                            >
                              <MenuItem value="text">Text</MenuItem>
                              <MenuItem value="integer">Integer</MenuItem>
                              <MenuItem value="boolean">Boolean</MenuItem>
                              <MenuItem value="timestamp">Timestamp</MenuItem>
                            </Select>
                          </FormControl>
                        </Box>
                      </Grid>
                      
                      <Grid item xs={2}>
                        <Button
                          color="error"
                          onClick={() => handleRemoveCustomField(index)}
                          sx={{ height: '100%' }}
                        >
                          Remove
                        </Button>
                      </Grid>
                    </React.Fragment>
                  ))}
                </Grid>
              )}
            </Paper>
          </Grid>
          
          {/* Sidebar */}
          <Grid item xs={12} md={4}>
            <Paper sx={{ p: 3, position: 'sticky', top: 20 }}>
              <Typography variant="h6" gutterBottom>
                Actions
              </Typography>
              
              <Button
                fullWidth
                variant="contained"
                color="primary"
                startIcon={submitting ? <CircularProgress size={24} color="inherit" /> : <SaveIcon />}
                type="submit"
                disabled={submitting}
                sx={{ mb: 2 }}
              >
                {submitting ? 'Creating...' : 'Create Item'}
              </Button>
              
              <Button
                fullWidth
                component={RouterLink}
                to="/items"
                disabled={submitting}
              >
                Cancel
              </Button>
              
              <Divider sx={{ my: 3 }} />
              
              <Typography variant="body2" color="text.secondary" paragraph>
                Required fields are marked with an asterisk (*).
              </Typography>
              
              <Typography variant="body2" color="text.secondary">
                After creating this item, you'll be able to add attachments like photos, receipts, and manuals.
              </Typography>
            </Paper>
          </Grid>
        </Grid>
      </form>
      
      {/* Barcode Scanner */}
      <BarcodeScanner
        open={scannerOpen}
        onClose={handleCloseScanner}
        onDetected={handleBarcodeDetected}
      />
    </Container>
  );
};

export default CreateItem;

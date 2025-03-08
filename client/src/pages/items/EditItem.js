import React, { useState, useEffect, useContext } from 'react';
import axios from '../../utils/axiosConfig';
import { useParams, useNavigate, Link as RouterLink } from 'react-router-dom';
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
  QrCodeScanner as QrCodeScannerIcon
} from '@mui/icons-material';
import { AlertContext } from '../../context/AlertContext';
import BarcodeScanner from '../../components/scanner/BarcodeScanner';
import useHasCamera from '../../hooks/useHasCamera';

const EditItem = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { setSuccessAlert, setErrorAlert } = useContext(AlertContext);
  
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [locations, setLocations] = useState([]);
  const [categories, setCategories] = useState([]);
  const [labels, setLabels] = useState([]);
  const [item, setItem] = useState(null);
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
        
        // Make API calls to fetch the item, locations, categories, and labels
        const [itemRes, locationsRes, categoriesRes, labelsRes] = await Promise.all([
          axios.get(`/api/items/${id}`),
          axios.get('/api/locations?flat=true'),
          axios.get('/api/categories'),
          axios.get('/api/labels')
        ]);
        
        if (itemRes.data.success) {
          const item = itemRes.data.data;
          setItem(item);
          
          // Set form data from item
          setFormData({
            name: item.name,
            description: item.description || '',
            location: item.location._id,
            category: item.category._id,
            labels: item.labels || [],
            quantity: item.quantity,
            serialNumber: item.serialNumber || '',
            modelNumber: item.modelNumber || '',
            manufacturer: item.manufacturer || '',
            notes: item.notes || '',
            isInsured: item.isInsured,
            isArchived: item.isArchived,
            purchasedFrom: item.purchasedFrom || '',
            purchasePrice: item.purchasePrice || '',
            purchaseDate: item.purchaseDate || '',
            hasLifetimeWarranty: item.hasLifetimeWarranty,
            warrantyExpires: item.warrantyExpires || '',
            warrantyNotes: item.warrantyNotes || '',
            customFields: item.customFields || [],
            upcCode: item.upcCode || ''
          });
        } else {
          setErrorAlert('Error loading item: ' + itemRes.data.message);
        }
        
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
        setErrorAlert('Error loading item data');
        setLoading(false);
        console.error(err);
      }
    };
    
    fetchData();
  }, [id, setErrorAlert]);

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
    
    // Set the UPC code
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
      
      // Make API call to update the item
      const response = await axios.put(`/api/items/${id}`, submissionData);
      
      if (response.data.success) {
        setSuccessAlert('Item updated successfully');
        navigate(`/items/${id}`);
      } else {
        setErrorAlert('Error updating item: ' + response.data.message);
      }
    } catch (err) {
      if (err.response && err.response.data && err.response.data.message) {
        if (err.response.data.message.includes('description')) {
          setErrors(prev => ({
            ...prev,
            description: 'Description cannot exceed 1000 characters'
          }));
          setErrorAlert('Error updating item: Description is too long');
        } else if (err.response.data.message.includes('name')) {
          setErrors(prev => ({
            ...prev,
            name: 'Name cannot exceed 100 characters'
          }));
          setErrorAlert('Error updating item: Name is too long');
        } else {
          setErrorAlert('Error updating item: ' + err.response.data.message);
        }
      } else {
        setErrorAlert('Error updating item: ' + (err.message || 'Unknown error'));
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

  if (!item) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant="h5" color="text.secondary">
            Item not found
          </Typography>
          <Button
            variant="contained"
            component={RouterLink}
            to="/items"
            sx={{ mt: 2 }}
          >
            Back to Items
          </Button>
        </Paper>
      </Container>
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
        <Link component={RouterLink} to={`/items/${id}`} underline="hover" color="inherit">
          {item.name}
        </Link>
        <Typography color="text.primary">Edit</Typography>
      </Breadcrumbs>
      
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <Button
          component={RouterLink}
          to={`/items/${id}`}
          startIcon={<ArrowBackIcon />}
          sx={{ mr: 2 }}
        >
          Back
        </Button>
        
        <Typography variant="h4" component="h1">
          Edit Item: {item.name}
        </Typography>
      </Box>
      
      <form onSubmit={handleSubmit}>
        <Grid container spacing={3}>
          {/* Main Form */}
          <Grid item xs={12} md={8}>
            <Paper sx={{ p: 3, mb: 3 }}>
              <Typography variant="h6" gutterBottom>
                Basic Information
              </Typography>
              
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
                  <FormControl fullWidth error={!!errors.location} required>
                    <InputLabel id="location-label">Location</InputLabel>
                    <Select
                      labelId="location-label"
                      name="location"
                      value={formData.location}
                      onChange={handleChange}
                      label="Location"
                    >
                      {locations.map(location => (
                        <MenuItem key={location._id} value={location._id}>
                          {location.name}
                        </MenuItem>
                      ))}
                    </Select>
                    {errors.location && (
                      <Typography variant="caption" color="error">
                        {errors.location}
                      </Typography>
                    )}
                  </FormControl>
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth error={!!errors.category} required>
                    <InputLabel id="category-label">Category</InputLabel>
                    <Select
                      labelId="category-label"
                      name="category"
                      value={formData.category}
                      onChange={handleChange}
                      label="Category"
                    >
                      {categories.map(category => (
                        <MenuItem key={category._id} value={category._id}>
                          {category.name}
                        </MenuItem>
                      ))}
                    </Select>
                    {errors.category && (
                      <Typography variant="caption" color="error">
                        {errors.category}
                      </Typography>
                    )}
                  </FormControl>
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
                    label="Asset ID"
                    value={item.assetId}
                    InputProps={{ readOnly: true }}
                    disabled
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
                    label="UPC Code"
                    name="upcCode"
                    value={formData.upcCode}
                    onChange={handleChange}
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
                {submitting ? 'Saving...' : 'Save Changes'}
              </Button>
              
              <Button
                fullWidth
                component={RouterLink}
                to={`/items/${id}`}
                disabled={submitting}
              >
                Cancel
              </Button>
              
              <Divider sx={{ my: 3 }} />
              
              <Typography variant="body2" color="text.secondary" paragraph>
                Required fields are marked with an asterisk (*).
              </Typography>
              
              <Typography variant="body2" color="text.secondary">
                Asset ID cannot be changed after creation.
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

export default EditItem;

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
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions
} from '@mui/material';
import {
  Save as SaveIcon,
  ArrowBack as ArrowBackIcon,
  Add as AddIcon,
  QrCodeScanner as QrCodeScannerIcon,
  Search as SearchIcon,
  OpenInNew as OpenInNewIcon,
  Delete as DeleteIcon
} from '@mui/icons-material';
import { AlertContext } from '../../context/AlertContext';
import BarcodeScanner from '../../components/scanner/BarcodeScanner';
import useHasCamera from '../../hooks/useHasCamera';
import { useMobile } from '../../context/MobileContext';
import MobilePhotoSection from './MobilePhotoSection';

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

const EditItem = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { setSuccessAlert, setErrorAlert } = useContext(AlertContext);
  const { isMobile } = useMobile();
  
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [lookingUpUPC, setLookingUpUPC] = useState(false);
  const [locations, setLocations] = useState([]);
  const [categories, setCategories] = useState([]);
  const [labels, setLabels] = useState([]);
  const [item, setItem] = useState(null);
  const [scannerOpen, setScannerOpen] = useState(false);
  const hasCamera = useHasCamera();
  
  // State for quick add dialogs
  const [newLocationDialog, setNewLocationDialog] = useState(false);
  const [newCategoryDialog, setNewCategoryDialog] = useState(false);
  const [newLabelDialog, setNewLabelDialog] = useState(false);
  
  // State for new entities
  const [newLocation, setNewLocation] = useState({ name: '', description: '', parent: '' });
  const [newCategory, setNewCategory] = useState({ name: '', description: '' });
  const [newLabel, setNewLabel] = useState({ name: '', description: '', color: '#3f51b5' });
  
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
    upcCode: '',
    itemUrl: '',
    manualUrl: ''
  });
  
  const [errors, setErrors] = useState({});
  const [calculatorOpen, setCalculatorOpen] = useState(false);
  const [calculatorValue, setCalculatorValue] = useState('');

  const handleCalculatorOpen = () => {
    setCalculatorValue('');
    setCalculatorOpen(true);
  };

  const handleCalculatorClose = () => {
    setCalculatorOpen(false);
  };

  const handleCalculatorChange = (e) => {
    setCalculatorValue(e.target.value);
  };

  const handleQuantityCalculation = (operation) => {
    if (!calculatorValue || isNaN(Number(calculatorValue))) {
      return;
    }

    const changeAmount = Number(calculatorValue);
    if (changeAmount <= 0) {
      return;
    }

    // Calculate new quantity based on operation
    let newQuantity;
    if (operation === 'add') {
      newQuantity = (formData.quantity || 0) + changeAmount;
    } else if (operation === 'subtract') {
      newQuantity = Math.max(0, (formData.quantity || 0) - changeAmount);
    } else {
      return;
    }

    // Update form data with new quantity
    setFormData(prevData => ({
      ...prevData,
      quantity: newQuantity
    }));

    // Clear any quantity errors
    if (errors.quantity) {
      setErrors(prevErrors => ({
        ...prevErrors,
        quantity: null
      }));
    }

    // Close the calculator dialog
    handleCalculatorClose();
  };

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
        
        // Make API calls to fetch the item, locations, categories, and labels
        const [itemRes, locationsRes, categoriesRes, labelsRes] = await Promise.all([
          axios.get(`/api/items/${id}`),
          axios.get('/api/locations'),
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
            // Extract purchase details from nested object
            purchasedFrom: item.purchaseDetails?.purchasedFrom || '',
            purchasePrice: item.purchaseDetails?.purchasePrice || '',
            purchaseDate: item.purchaseDetails?.purchaseDate ? new Date(item.purchaseDetails.purchaseDate).toISOString().split('T')[0] : '',
            // Extract warranty details from nested object
            hasLifetimeWarranty: item.warrantyDetails?.hasLifetimeWarranty || false,
            warrantyExpires: item.warrantyDetails?.warrantyExpires ? new Date(item.warrantyDetails.warrantyExpires).toISOString().split('T')[0] : '',
            warrantyNotes: item.warrantyDetails?.warrantyNotes || '',
            customFields: item.customFields || [],
            upcCode: item.upcCode || '',
            itemUrl: item.itemUrl || '',
            manualUrl: item.manualUrl || ''
          });
        } else {
          setErrorAlert('Error loading item: ' + itemRes.data.message);
        }
        
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
    
    // Automatically trigger UPC lookup
    setTimeout(() => {
      handleUpcLookup();
    }, 500);
  };
  
  const handleUpcLookup = async () => {
    if (!formData.upcCode.trim()) {
      setErrorAlert('Please enter a UPC code');
      return;
    }
    
    setLookingUpUPC(true);
    
    try {
      const response = await axios.get(`/api/upc/${formData.upcCode.trim()}`);
      
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
        
        // No success message needed - UI update is clear from the form
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
      // Prepare data for submission - only include the structure expected by the database model
      const submissionData = {
        name: formData.name,
        description: formData.description,
        location: formData.location,
        category: formData.category,
        labels: formData.labels,
        quantity: formData.quantity,
        serialNumber: formData.serialNumber,
        modelNumber: formData.modelNumber,
        manufacturer: formData.manufacturer,
        notes: formData.notes,
        isInsured: formData.isInsured,
        isArchived: formData.isArchived,
        upcCode: formData.upcCode,
        itemUrl: formData.itemUrl,
        manualUrl: formData.manualUrl,
        
        // Include properly nested purchase details
        purchaseDetails: {
          purchasedFrom: formData.purchasedFrom,
          purchasePrice: formData.purchasePrice ? parseFloat(formData.purchasePrice) : undefined,
          purchaseDate: formData.purchaseDate || undefined
        },
        
        // Include properly nested warranty details
        warrantyDetails: {
          hasLifetimeWarranty: formData.hasLifetimeWarranty,
          warrantyExpires: formData.warrantyExpires || undefined,
          warrantyNotes: formData.warrantyNotes
        },
        
        // Map UI field types to database field types for custom fields
        // Ensure each field has a name
        customFields: formData.customFields
          .filter(field => field.name.trim() !== '') // Only include fields with names
          .map(field => ({
            name: field.name,
            value: field.value,
            type: mapFieldTypeToDbType(field.type || detectFieldType(field.value))
          }))
      };
      
      // Make API call to update the item
      const response = await axios.put(`/api/items/${id}`, submissionData);
      
      if (response.data.success) {
        // Navigate directly to item detail page without showing a success message
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
                      disablePortal={false}
                      PopperProps={{ placement: 'bottom-start' }}
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
                      disablePortal={false}
                      PopperProps={{ placement: 'bottom-start' }}
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
                      isOptionEqualToValue={(option, value) => option._id === value._id}
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
                      PopperProps={{ placement: 'bottom-start' }}
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
            
            {/* Details Section */}
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
                    value={formData.assetId || ''}
                    onChange={handleChange}
                    helperText="You can edit the asset ID here"
                  />
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
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
                    <Button 
                      size="small" 
                      variant="contained" 
                      color="primary"
                      sx={{ ml: 2, height: 40 }}
                      onClick={handleCalculatorOpen}
                    >
                      Calculator
                    </Button>
                  </Box>
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
                    onKeyDown={(e) => {
                      // Prevent default behavior for Enter to avoid form submission
                      if (e.key === 'Enter') {
                        e.preventDefault();
                      }
                      
                      // Only trigger lookup when Tab is pressed, not Enter
                      if (e.key === 'Tab' && formData.upcCode.trim()) {
                        handleUpcLookup();
                      }
                    }}
                    InputProps={{
                      endAdornment: (
                        <InputAdornment position="end">
                          {lookingUpUPC ? (
                            <CircularProgress size={20} />
                          ) : (
                            <>
                              <Tooltip title="Lookup UPC">
                                <IconButton 
                                  color="primary" 
                                  onClick={handleUpcLookup}
                                  size="small"
                                  disabled={!formData.upcCode.trim()}
                                >
                                  <SearchIcon />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="Scan Barcode">
                                <IconButton 
                                  color="primary" 
                                  onClick={handleOpenScanner}
                                  size="small"
                                >
                                  <QrCodeScannerIcon />
                                </IconButton>
                              </Tooltip>
                            </>
                          )}
                        </InputAdornment>
                      )
                    }}
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
            
            {/* Purchase Details Section */}
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
                      startAdornment: <InputAdornment position="start">$</InputAdornment>,
                    }}
                  />
                </Grid>
                
                <Grid item xs={12} sm={6}>
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
                
                <Grid item xs={12} sm={6}>
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={formData.isInsured}
                        onChange={handleChange}
                        name="isInsured"
                        color="primary"
                      />
                    }
                    label="Item is Insured"
                  />
                </Grid>
              </Grid>
            </Paper>
            
            {/* Warranty Details Section */}
            <Paper sx={{ p: 3, mb: 3 }}>
              <Typography variant="h6" gutterBottom>
                Warranty Details
              </Typography>
              
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={formData.hasLifetimeWarranty}
                        onChange={handleChange}
                        name="hasLifetimeWarranty"
                        color="primary"
                      />
                    }
                    label="Lifetime Warranty"
                  />
                </Grid>
                
                {!formData.hasLifetimeWarranty && (
                  <Grid item xs={12} sm={6}>
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
            
            {/* Notes Section */}
            <Paper sx={{ p: 3, mb: 3 }}>
              <Typography variant="h6" gutterBottom>
                Notes
              </Typography>
              
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Notes"
                    name="notes"
                    value={formData.notes}
                    onChange={handleChange}
                    multiline
                    rows={4}
                  />
                </Grid>
              </Grid>
            </Paper>
            
            {/* Custom Fields Section */}
            <Paper sx={{ p: 3, mb: 3 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">
                  Custom Fields
                </Typography>
                <Button
                  variant="outlined"
                  startIcon={<AddIcon />}
                  onClick={handleAddCustomField}
                  size="small"
                >
                  Add Field
                </Button>
              </Box>
              
              {formData.customFields.length === 0 ? (
                <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                  No custom fields added yet. Click "Add Field" to create one.
                </Typography>
              ) : (
                <Grid container spacing={2}>
                  {formData.customFields.map((field, index) => (
                    <Grid item xs={12} key={index}>
                      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                        <TextField
                          label="Field Name"
                          value={field.name}
                          onChange={(e) => handleCustomFieldChange(index, 'name', e.target.value)}
                          sx={{ flex: 1 }}
                        />
                        <TextField
                          label="Value"
                          value={field.value}
                          onChange={(e) => handleCustomFieldChange(index, 'value', e.target.value)}
                          sx={{ flex: 1 }}
                        />
                        <IconButton
                          color="error"
                          onClick={() => handleRemoveCustomField(index)}
                          sx={{ mt: 1 }}
                        >
                          <DeleteIcon />
                        </IconButton>
                      </Box>
                    </Grid>
                  ))}
                </Grid>
              )}
            </Paper>
            
            {/* Status Section */}
            <Paper sx={{ p: 3, mb: 3 }}>
              <Typography variant="h6" gutterBottom>
                Status
              </Typography>
              
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={formData.isArchived}
                        onChange={handleChange}
                        name="isArchived"
                        color="primary"
                      />
                    }
                    label="Archive this item"
                  />
                </Grid>
              </Grid>
            </Paper>
            
            <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
              <Button
                type="submit"
                variant="contained"
                color="primary"
                startIcon={<SaveIcon />}
                disabled={submitting}
              >
                {submitting ? <CircularProgress size={24} /> : 'Save'}
              </Button>
            </Box>
          </Grid>
          
          {/* Sidebar */}
          <Grid item xs={12} md={4}>
            {/* Mobile Photo Section */}
            {isMobile && <MobilePhotoSection />}
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
                disablePortal={false}
                PopperProps={{ placement: 'bottom-start' }}
                fullWidth
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setNewLocationDialog(false)}>Cancel</Button>
          <Button
            variant="contained"
            color="primary"
            onClick={async () => {
              try {
                if (!newLocation.name.trim()) {
                  setErrorAlert('Location name is required');
                  return;
                }
                
                const response = await axios.post('/api/locations', newLocation);
                
                if (response.data.success) {
                  // Add the new location to the locations list
                  const createdLocation = response.data.data;
                  setLocations([...locations, createdLocation]);
                  
                  // Select the new location
                  setFormData(prevData => ({
                    ...prevData,
                    location: createdLocation._id
                  }));
                  
                  // Reset the new location form
                  setNewLocation({ name: '', description: '', parent: '' });
                  
                  // Close the dialog
                  setNewLocationDialog(false);
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
            color="primary"
            onClick={async () => {
              try {
                if (!newCategory.name.trim()) {
                  setErrorAlert('Category name is required');
                  return;
                }
                
                const response = await axios.post('/api/categories', newCategory);
                
                if (response.data.success) {
                  // Add the new category to the categories list
                  const createdCategory = response.data.data;
                  setCategories([...categories, createdCategory]);
                  
                  // Select the new category
                  setFormData(prevData => ({
                    ...prevData,
                    category: createdCategory._id
                  }));
                  
                  // Reset the new category form
                  setNewCategory({ name: '', description: '' });
                  
                  // Close the dialog
                  setNewCategoryDialog(false);
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
            color="primary"
            onClick={async () => {
              try {
                if (!newLabel.name.trim()) {
                  setErrorAlert('Label name is required');
                  return;
                }
                
                const response = await axios.post('/api/labels', newLabel);
                
                if (response.data.success) {
                  // Add the new label to the labels list
                  const createdLabel = response.data.data;
                  setLabels([...labels, createdLabel]);
                  
                  // Add the new label to the selected labels
                  setFormData(prevData => ({
                    ...prevData,
                    labels: [...prevData.labels, createdLabel]
                  }));
                  
                  // Reset the new label form
                  setNewLabel({ name: '', description: '', color: '#3f51b5' });
                  
                  // Close the dialog
                  setNewLabelDialog(false);
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

      {/* Quantity Calculator Dialog */}
      <Dialog
        open={calculatorOpen}
        onClose={handleCalculatorClose}
      >
        <DialogTitle>Update Quantity</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Current quantity: <strong>{formData.quantity || 0}</strong>
          </DialogContentText>
          
          <Box sx={{ mt: 2, mb: 1 }}>
            <TextField
              label="Amount to change"
              type="number"
              fullWidth
              value={calculatorValue}
              onChange={handleCalculatorChange}
              InputProps={{ inputProps: { min: 1 } }}
            />
          </Box>
          
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 3 }}>
            <Button 
              variant="contained" 
              color="primary"
              onClick={() => handleQuantityCalculation('add')}
              disabled={!calculatorValue || isNaN(Number(calculatorValue)) || Number(calculatorValue) <= 0}
            >
              Add ({calculatorValue ? `= ${(formData.quantity || 0) + Number(calculatorValue)}` : ''})
            </Button>
            
            <Button 
              variant="contained" 
              color="secondary"
              onClick={() => handleQuantityCalculation('subtract')}
              disabled={!calculatorValue || isNaN(Number(calculatorValue)) || Number(calculatorValue) <= 0}
            >
              Subtract ({calculatorValue ? `= ${Math.max(0, (formData.quantity || 0) - Number(calculatorValue))}` : ''})
            </Button>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCalculatorClose}>Cancel</Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default EditItem;

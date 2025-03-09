import React, { useState, useEffect, useContext } from 'react';
import { useNavigate, useLocation, Link as RouterLink } from 'react-router-dom';
import axios from '../../utils/axiosConfig';
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
  Divider,
  CircularProgress,
  Breadcrumbs,
  Link,
  Autocomplete
} from '@mui/material';
import {
  Save as SaveIcon,
  ArrowBack as ArrowBackIcon
} from '@mui/icons-material';
import { AlertContext } from '../../context/AlertContext';

const CreateLocation = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { setSuccessAlert, setErrorAlert } = useContext(AlertContext);
  
  // Get parent location ID from URL query parameters if it exists
  const queryParams = new URLSearchParams(location.search);
  const parentLocationId = queryParams.get('parent');
  
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [locations, setLocations] = useState([]);
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    parentLocation: parentLocationId || ''
  });
  
  const [errors, setErrors] = useState({});

  useEffect(() => {
    const fetchLocations = async () => {
      try {
        setLoading(true);
        
        // Make API call to fetch locations
        const response = await axios.get('/api/locations');
        
        if (response.data.success) {
          // Add a "None" option for top-level locations
          const locationsWithNone = [
            {
              _id: '',
              name: 'None (Top Level)',
            },
            ...response.data.data
          ];
          
          setLocations(locationsWithNone);
        } else {
          setErrorAlert('Error loading locations: ' + response.data.message);
        }
        
        setLoading(false);
      } catch (err) {
        setErrorAlert('Error loading locations');
        setLoading(false);
        console.error(err);
      }
    };
    
    fetchLocations();
  }, [setErrorAlert]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    setFormData(prevData => ({
      ...prevData,
      [name]: value
    }));
    
    // Clear error for this field if it exists
    if (errors[name]) {
      setErrors(prevErrors => ({
        ...prevErrors,
        [name]: null
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    // Required fields
    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
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
      // Make API call to create the location
      const response = await axios.post('/api/locations', {
        name: formData.name,
        description: formData.description,
        parent: formData.parentLocation || null
      });
      
      if (response.data.success) {
        setSuccessAlert('Location created successfully');
        navigate('/locations');
      } else {
        setErrorAlert('Error creating location: ' + response.data.message);
      }
    } catch (err) {
      setErrorAlert('Error creating location');
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  // Recursive function to flatten location hierarchy for select dropdown
  const flattenLocations = (locationArray, level = 0, result = []) => {
    locationArray.forEach(location => {
      if (location._id !== '') {
        result.push({
          _id: location._id,
          name: location.name,
          level
        });
      } else {
        result.push(location);
      }
      
      if (location.children && location.children.length > 0) {
        flattenLocations(location.children, level + 1, result);
      }
    });
    
    return result;
  };

  const flattenedLocations = flattenLocations(locations);

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
        <Link component={RouterLink} to="/locations" underline="hover" color="inherit">
          Locations
        </Link>
        <Typography color="text.primary">Create Location</Typography>
      </Breadcrumbs>
      
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <Button
          component={RouterLink}
          to="/locations"
          startIcon={<ArrowBackIcon />}
          sx={{ mr: 2 }}
        >
          Back
        </Button>
        
        <Typography variant="h4" component="h1">
          Create Location
        </Typography>
      </Box>
      
      <form onSubmit={handleSubmit}>
        <Grid container spacing={3}>
          {/* Main Form */}
          <Grid item xs={12} md={8}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Location Information
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
                    helperText={errors.name}
                    required
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
                  />
                </Grid>
                
                <Grid item xs={12}>
                  <Autocomplete
                    options={flattenedLocations}
                    getOptionLabel={(option) => {
                      if (typeof option === 'string') {
                        const locationObj = flattenedLocations.find(loc => loc._id === option);
                        return locationObj ? locationObj.name : '';
                      }
                      return option.name;
                    }}
                    value={formData.parentLocation ? flattenedLocations.find(loc => loc._id === formData.parentLocation) || null : null}
                    onChange={(event, newValue) => {
                      setFormData(prevData => ({
                        ...prevData,
                        parentLocation: newValue ? newValue._id : ''
                      }));
                    }}
                    isOptionEqualToValue={(option, value) => option._id === value._id}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label="Parent Location"
                        fullWidth
                      />
                    )}
                    renderOption={(props, option) => (
                      <li 
                        {...props} 
                        style={{ 
                          paddingLeft: option.level ? option.level * 16 + 16 : 16,
                          fontWeight: option._id === '' ? 'bold' : 'normal'
                        }}
                      >
                        {option.name}
                      </li>
                    )}
                    disablePortal={false}
                    PopperProps={{ placement: 'bottom-start' }}
                  />
                </Grid>
              </Grid>
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
                {submitting ? 'Creating...' : 'Create Location'}
              </Button>
              
              <Button
                fullWidth
                component={RouterLink}
                to="/locations"
                disabled={submitting}
              >
                Cancel
              </Button>
              
              <Divider sx={{ my: 3 }} />
              
              <Typography variant="body2" color="text.secondary" paragraph>
                Required fields are marked with an asterisk (*).
              </Typography>
              
              <Typography variant="body2" color="text.secondary">
                If no parent location is selected, this will be a top-level location.
              </Typography>
            </Paper>
          </Grid>
        </Grid>
      </form>
    </Container>
  );
};

export default CreateLocation;

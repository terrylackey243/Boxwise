import React, { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate, Link as RouterLink } from 'react-router-dom';
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
  Alert
} from '@mui/material';
import {
  Save as SaveIcon,
  ArrowBack as ArrowBackIcon
} from '@mui/icons-material';
import { AlertContext } from '../../context/AlertContext';

const EditLocation = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { setSuccessAlert, setErrorAlert } = useContext(AlertContext);
  
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [locations, setLocations] = useState([]);
  const [location, setLocation] = useState(null);
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    parentLocation: ''
  });
  
  const [errors, setErrors] = useState({});

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Fetch the location data and all locations from the API
        const [locationResponse, locationsResponse] = await Promise.all([
          axios.get(`/api/locations/${id}`),
          axios.get('/api/locations')
        ]);
        
        if (locationResponse.data.success && locationsResponse.data.success) {
          const locationData = locationResponse.data.data;
          const allLocations = locationsResponse.data.data;
          
          // Add a "None" option for top-level locations
          const locationsWithNone = [
            {
              _id: '',
              name: 'None (Top Level)',
            },
            ...allLocations
          ];
          
          setLocation(locationData);
          setLocations(locationsWithNone);
          
          // Set form data from location
          setFormData({
            name: locationData.name,
            description: locationData.description || '',
            parentLocation: locationData.parent || ''
          });
        } else {
          setErrorAlert('Error loading location data');
        }
        
        setLoading(false);
      } catch (err) {
        setErrorAlert('Error loading location data');
        setLoading(false);
        console.error(err);
      }
    };
    
    fetchData();
  }, [id, setErrorAlert]);

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
    
    // Check for circular reference in parent location
    if (formData.parentLocation === id) {
      newErrors.parentLocation = 'A location cannot be its own parent';
    }
    
    // Check if selected parent is a descendant of this location
    const isDescendant = (locationId, potentialAncestorId) => {
      if (!locationId) return false;
      
      const findLocation = (locationsArray, id) => {
        for (const loc of locationsArray) {
          if (loc._id === id) {
            return loc;
          }
          
          if (loc.children && loc.children.length > 0) {
            const found = findLocation(loc.children, id);
            if (found) return found;
          }
        }
        
        return null;
      };
      
      const findDescendants = (locationId, descendants = []) => {
        const location = findLocation(locations, locationId);
        
        if (location && location.children && location.children.length > 0) {
          for (const child of location.children) {
            descendants.push(child._id);
            findDescendants(child._id, descendants);
          }
        }
        
        return descendants;
      };
      
      const descendants = findDescendants(potentialAncestorId);
      return descendants.includes(locationId);
    };
    
    if (isDescendant(formData.parentLocation, id)) {
      newErrors.parentLocation = 'Cannot select a descendant as parent';
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
      // Make API call to update the location
      const response = await axios.put(`/api/locations/${id}`, {
        name: formData.name,
        description: formData.description,
        parent: formData.parentLocation || null
      });
      
      if (response.data.success) {
        setSuccessAlert('Location updated successfully');
        navigate('/locations');
      } else {
        setErrorAlert('Error updating location: ' + response.data.message);
      }
    } catch (err) {
      setErrorAlert('Error updating location');
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  // Recursive function to flatten location hierarchy for select dropdown
  const flattenLocations = (locationArray, level = 0, result = []) => {
    locationArray.forEach(location => {
      if (location._id !== '') {
        // Skip the current location to prevent self-selection
        if (location._id !== id) {
          result.push({
            _id: location._id,
            name: location.name,
            level
          });
        }
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

  if (!location) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant="h5" color="text.secondary">
            Location not found
          </Typography>
          <Button
            variant="contained"
            component={RouterLink}
            to="/locations"
            sx={{ mt: 2 }}
          >
            Back to Locations
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
        <Link component={RouterLink} to="/locations" underline="hover" color="inherit">
          Locations
        </Link>
        <Typography color="text.primary">Edit {location.name}</Typography>
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
          Edit Location: {location.name}
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
                  <FormControl fullWidth error={!!errors.parentLocation}>
                    <InputLabel id="parent-location-label">Parent Location</InputLabel>
                    <Select
                      labelId="parent-location-label"
                      name="parentLocation"
                      value={formData.parentLocation}
                      onChange={handleChange}
                      label="Parent Location"
                    >
                      {flattenedLocations.map(location => (
                        <MenuItem 
                          key={location._id} 
                          value={location._id}
                          sx={{ 
                            pl: location.level ? location.level * 2 + 2 : 2,
                            fontWeight: location._id === '' ? 'bold' : 'normal'
                          }}
                        >
                          {location.name}
                        </MenuItem>
                      ))}
                    </Select>
                    {errors.parentLocation && (
                      <Typography variant="caption" color="error">
                        {errors.parentLocation}
                      </Typography>
                    )}
                  </FormControl>
                </Grid>
              </Grid>
              
              {formData.parentLocation !== location.parentLocation && (
                <Alert severity="warning" sx={{ mt: 2 }}>
                  Changing the parent location will move this location and all its contents to a new position in the hierarchy.
                </Alert>
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

export default EditLocation;

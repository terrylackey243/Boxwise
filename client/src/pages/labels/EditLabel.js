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
  Divider,
  CircularProgress,
  Breadcrumbs,
  Link,
  FormControl,
  FormHelperText,
  Chip
} from '@mui/material';
import {
  Save as SaveIcon,
  ArrowBack as ArrowBackIcon,
  Label as LabelIcon
} from '@mui/icons-material';
import { AlertContext } from '../../context/AlertContext';
import { HexColorPicker } from 'react-colorful';

const EditLabel = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { setSuccessAlert, setErrorAlert } = useContext(AlertContext);
  
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [label, setLabel] = useState(null);
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    color: '#6B46C1'
  });
  
  const [errors, setErrors] = useState({});

  useEffect(() => {
    const fetchLabel = async () => {
      try {
        setLoading(true);
        
        // Fetch the label data from the API
        const labelResponse = await axios.get(`/api/labels/${id}`);
        
        // Fetch label item count
        const countsResponse = await axios.get('/api/labels/counts');
        
        if (labelResponse.data.success && countsResponse.data.success) {
          const labelData = labelResponse.data.data;
          
          // Find the item count for this label
          const countData = countsResponse.data.data.find(
            item => item.labelId === id
          );
          
          const labelWithCount = {
            ...labelData,
            itemCount: countData ? countData.count : 0
          };
          
          setLabel(labelWithCount);
          
          // Set form data from label
          setFormData({
            name: labelWithCount.name,
            description: labelWithCount.description || '',
            color: labelWithCount.color
          });
        } else {
          setErrorAlert('Error loading label data');
        }
        
        setLoading(false);
      } catch (err) {
        setErrorAlert('Error loading label');
        setLoading(false);
        console.error(err);
      }
    };
    
    fetchLabel();
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

  const handleColorChange = (color) => {
    setFormData(prevData => ({
      ...prevData,
      color
    }));
  };

  const validateForm = () => {
    const newErrors = {};
    
    // Required fields
    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }
    
    // Validate color format
    const hexColorRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
    if (!hexColorRegex.test(formData.color)) {
      newErrors.color = 'Invalid color format';
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
      // Make API call to update the label
      const response = await axios.put(`/api/labels/${id}`, formData);
      
      if (response.data.success) {
        // Navigate immediately without showing a success message
        navigate('/labels');
      } else {
        setErrorAlert('Error updating label: ' + response.data.message);
      }
    } catch (err) {
      setErrorAlert('Error updating label');
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  // Predefined colors for quick selection
  const predefinedColors = [
    '#6B46C1', // Purple
    '#38A169', // Green
    '#E53E3E', // Red
    '#3182CE', // Blue
    '#DD6B20', // Orange
    '#D69E2E', // Yellow
    '#805AD5', // Indigo
    '#00B5D8', // Cyan
    '#F56565', // Pink
    '#718096'  // Gray
  ];

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

  if (!label) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant="h5" color="text.secondary">
            Label not found
          </Typography>
          <Button
            variant="contained"
            component={RouterLink}
            to="/labels"
            sx={{ mt: 2 }}
          >
            Back to Labels
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
        <Link component={RouterLink} to="/labels" underline="hover" color="inherit">
          Labels
        </Link>
        <Typography color="text.primary">Edit {label.name}</Typography>
      </Breadcrumbs>
      
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <Button
          component={RouterLink}
          to="/labels"
          startIcon={<ArrowBackIcon />}
          sx={{ mr: 2 }}
        >
          Back
        </Button>
        
        <Typography variant="h4" component="h1">
          Edit Label: {label.name}
        </Typography>
      </Box>
      
      <form onSubmit={handleSubmit}>
        <Grid container spacing={3}>
          {/* Main Form */}
          <Grid item xs={12} md={8}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Label Information
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
                  <Typography variant="subtitle1" gutterBottom>
                    Label Color
                  </Typography>
                  
                  <Box sx={{ mb: 2 }}>
                    <FormControl fullWidth error={!!errors.color}>
                      <HexColorPicker 
                        color={formData.color} 
                        onChange={handleColorChange} 
                        style={{ width: '100%', height: 200 }}
                      />
                      {errors.color && (
                        <FormHelperText>{errors.color}</FormHelperText>
                      )}
                    </FormControl>
                  </Box>
                  
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
                    {predefinedColors.map((color) => (
                      <Box
                        key={color}
                        onClick={() => handleColorChange(color)}
                        sx={{
                          width: 36,
                          height: 36,
                          bgcolor: color,
                          borderRadius: 1,
                          cursor: 'pointer',
                          border: formData.color === color ? '2px solid black' : '1px solid #e0e0e0',
                          '&:hover': {
                            opacity: 0.8
                          }
                        }}
                      />
                    ))}
                  </Box>
                  
                  <TextField
                    fullWidth
                    label="Color Code"
                    name="color"
                    value={formData.color}
                    onChange={handleChange}
                    error={!!errors.color}
                    helperText={errors.color || 'Hexadecimal color code (e.g., #6B46C1)'}
                    InputProps={{
                      startAdornment: (
                        <Box 
                          component="span" 
                          sx={{ 
                            width: 24, 
                            height: 24, 
                            borderRadius: '50%', 
                            bgcolor: formData.color,
                            mr: 1,
                            border: '1px solid #e0e0e0'
                          }} 
                        />
                      )
                    }}
                  />
                </Grid>
              </Grid>
            </Paper>
          </Grid>
          
          {/* Sidebar */}
          <Grid item xs={12} md={4}>
            <Paper sx={{ p: 3, position: 'sticky', top: 20 }}>
              <Typography variant="h6" gutterBottom>
                Preview
              </Typography>
              
              <Box 
                sx={{ 
                  p: 2, 
                  border: '1px solid #e0e0e0', 
                  borderRadius: 1,
                  mb: 3
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <LabelIcon 
                    sx={{ 
                      color: formData.color, 
                      mr: 1,
                      transform: 'rotate(180deg)',
                      fontSize: 32
                    }} 
                  />
                  <Typography variant="h6">
                    {formData.name || 'Label Name'}
                  </Typography>
                </Box>
                
                <Chip
                  label={`${label.itemCount} items`}
                  size="small"
                  sx={{ 
                    bgcolor: formData.color,
                    color: 'white'
                  }}
                />
                
                <Typography variant="body2" sx={{ mt: 2 }}>
                  {formData.description || 'No description provided'}
                </Typography>
              </Box>
              
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
                to="/labels"
                disabled={submitting}
              >
                Cancel
              </Button>
              
              <Divider sx={{ my: 3 }} />
              
              <Typography variant="body2" color="text.secondary" paragraph>
                Required fields are marked with an asterisk (*).
              </Typography>
              
              <Typography variant="body2" color="text.secondary">
                This label is currently used by {label.itemCount} items.
              </Typography>
            </Paper>
          </Grid>
        </Grid>
      </form>
    </Container>
  );
};

export default EditLabel;

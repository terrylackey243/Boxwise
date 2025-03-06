import React, { useState, useContext } from 'react';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
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

const CreateLabel = () => {
  const navigate = useNavigate();
  const { setSuccessAlert, setErrorAlert } = useContext(AlertContext);
  
  const [submitting, setSubmitting] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    color: '#6B46C1' // Default purple color
  });
  
  const [errors, setErrors] = useState({});

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
      // Make an API call to create the label using axios
      console.log('Submitting label data:', formData);
      
      const response = await axios.post('/api/labels', formData);
      
      console.log('Label created:', response.data);
      
      setSuccessAlert('Label created successfully');
      navigate('/labels');
    } catch (err) {
      const errorMessage = err.response?.data?.message || err.message;
      setErrorAlert(`Error creating label: ${errorMessage}`);
      console.error('Error creating label:', err);
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
        <Typography color="text.primary">Create Label</Typography>
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
          Create Label
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
                  label="Label Preview"
                  size="small"
                  sx={{ 
                    bgcolor: formData.color,
                    color: 'white'
                  }}
                />
                
                <Typography variant="body2" sx={{ mt: 2 }}>
                  {formData.description || 'Label description will appear here'}
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
                {submitting ? 'Creating...' : 'Create Label'}
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
                Labels help you organize items across different locations.
              </Typography>
            </Paper>
          </Grid>
        </Grid>
      </form>
    </Container>
  );
};

export default CreateLabel;

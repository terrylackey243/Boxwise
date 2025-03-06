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
  Divider,
  CircularProgress,
  Breadcrumbs,
  Link,
  Chip
} from '@mui/material';
import {
  Save as SaveIcon,
  ArrowBack as ArrowBackIcon,
  Category as CategoryIcon
} from '@mui/icons-material';
import { AlertContext } from '../../context/AlertContext';

const EditCategory = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { setSuccessAlert, setErrorAlert } = useContext(AlertContext);
  
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [category, setCategory] = useState(null);
  
  const [formData, setFormData] = useState({
    name: '',
    description: ''
  });
  
  const [errors, setErrors] = useState({});

  useEffect(() => {
    const fetchCategory = async () => {
      try {
        setLoading(true);
        
        // Make an API call to fetch the category using axios
        const response = await axios.get(`/api/categories/${id}`);
        
        if (response.data.success) {
          const categoryData = response.data.data;
          setCategory(categoryData);
          
          // Set form data from category
          setFormData({
            name: categoryData.name,
            description: categoryData.description || ''
          });
        } else {
          setErrorAlert('Error loading category: ' + response.data.message);
        }
        
        setLoading(false);
      } catch (err) {
        setErrorAlert('Error loading category');
        setLoading(false);
        console.error(err);
      }
    };
    
    fetchCategory();
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
      // Make an API call to update the category using axios
      const response = await axios.put(`/api/categories/${id}`, formData);
      
      if (response.data.success) {
        setSuccessAlert(response.data.message || 'Category updated successfully');
        navigate('/categories');
      } else {
        setErrorAlert(response.data.message || 'Error updating category');
      }
    } catch (err) {
      setErrorAlert('Error updating category');
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

  if (!category) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant="h5" color="text.secondary">
            Category not found
          </Typography>
          <Button
            variant="contained"
            component={RouterLink}
            to="/categories"
            sx={{ mt: 2 }}
          >
            Back to Categories
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
        <Link component={RouterLink} to="/categories" underline="hover" color="inherit">
          Categories
        </Link>
        <Typography color="text.primary">Edit {category.name}</Typography>
      </Breadcrumbs>
      
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <Button
          component={RouterLink}
          to="/categories"
          startIcon={<ArrowBackIcon />}
          sx={{ mr: 2 }}
        >
          Back
        </Button>
        
        <Typography variant="h4" component="h1">
          Edit Category: {category.name}
        </Typography>
      </Box>
      
      <form onSubmit={handleSubmit}>
        <Grid container spacing={3}>
          {/* Main Form */}
          <Grid item xs={12} md={8}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Category Information
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
                    placeholder="Provide a description of this category"
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
                  <CategoryIcon 
                    sx={{ 
                      color: 'primary.main', 
                      mr: 1,
                      fontSize: 32
                    }} 
                  />
                  <Typography variant="h6">
                    {formData.name || 'Category Name'}
                  </Typography>
                </Box>
                
                <Chip
                  label={`${category.itemCount} items`}
                  size="small"
                  sx={{ mb: 2 }}
                />
                
                <Typography variant="body2">
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
                to="/categories"
                disabled={submitting}
              >
                Cancel
              </Button>
              
              <Divider sx={{ my: 3 }} />
              
              <Typography variant="body2" color="text.secondary" paragraph>
                Required fields are marked with an asterisk (*).
              </Typography>
              
              <Typography variant="body2" color="text.secondary">
                This category is currently used by {category.itemCount} items.
              </Typography>
            </Paper>
          </Grid>
        </Grid>
      </form>
    </Container>
  );
};

export default EditCategory;

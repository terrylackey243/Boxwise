import React, { useState, useContext } from 'react';
import { useNavigate, Link as RouterLink, Navigate } from 'react-router-dom';
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
  FormHelperText,
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
import { AuthContext } from '../../context/AuthContext';
import { AlertContext } from '../../context/AlertContext';

const CreateUser = () => {
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);
  const { setSuccessAlert, setErrorAlert } = useContext(AlertContext);
  
  const [submitting, setSubmitting] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'user',
    subscriptionPlan: 'free'
  });
  
  const [errors, setErrors] = useState({});
  
  // Check if current user is admin or owner
  const isAdminOrOwner = user && (user.role === 'admin' || user.role === 'owner');
  // Only owner can create admin users
  const canCreateAdmin = user && user.role === 'owner';

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
    
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^\S+@\S+\.\S+$/.test(formData.email)) {
      newErrors.email = 'Email is invalid';
    }
    
    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }
    
    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }
    
    // Role validation - only owner can create admin users
    if (formData.role === 'admin' && !canCreateAdmin) {
      newErrors.role = 'You do not have permission to create admin users';
    }
    
    // Owner role can only be assigned by the system, not manually
    if (formData.role === 'owner') {
      newErrors.role = 'Owner role cannot be assigned manually';
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
      // Prepare user data for API
      const userData = {
        name: formData.name,
        email: formData.email,
        password: formData.password,
        role: formData.role,
        subscription: {
          plan: formData.subscriptionPlan,
          status: 'active'
        }
      };
      
      // Make API call to create user
      const response = await axios.post('/api/users', userData);
      
      if (response.data.success) {
        setSuccessAlert(`User ${formData.name} created successfully`);
        navigate('/admin/dashboard');
      } else {
        setErrorAlert('Error creating user: ' + response.data.message);
      }
    } catch (err) {
      setErrorAlert('Error creating user: ' + (err.response?.data?.message || err.message));
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  // If user is not admin or owner, redirect to dashboard
  if (!isAdminOrOwner) {
    return <Navigate to="/dashboard" />;
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      {/* Breadcrumbs */}
      <Breadcrumbs sx={{ mb: 2 }}>
        <Link component={RouterLink} to="/dashboard" underline="hover" color="inherit">
          Dashboard
        </Link>
        <Link component={RouterLink} to="/admin/dashboard" underline="hover" color="inherit">
          Admin
        </Link>
        <Typography color="text.primary">Create User</Typography>
      </Breadcrumbs>
      
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <Button
          component={RouterLink}
          to="/admin/dashboard"
          startIcon={<ArrowBackIcon />}
          sx={{ mr: 2 }}
        >
          Back
        </Button>
        
        <Typography variant="h4" component="h1">
          Create User
        </Typography>
      </Box>
      
      <form onSubmit={handleSubmit}>
        <Grid container spacing={3}>
          {/* Main Form */}
          <Grid item xs={12} md={8}>
            <Paper sx={{ p: 3, mb: 3 }}>
              <Typography variant="h6" gutterBottom>
                User Information
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
                    label="Email"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleChange}
                    error={!!errors.email}
                    helperText={errors.email}
                    required
                  />
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Password"
                    name="password"
                    type="password"
                    value={formData.password}
                    onChange={handleChange}
                    error={!!errors.password}
                    helperText={errors.password}
                    required
                  />
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Confirm Password"
                    name="confirmPassword"
                    type="password"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    error={!!errors.confirmPassword}
                    helperText={errors.confirmPassword}
                    required
                  />
                </Grid>
              </Grid>
            </Paper>
            
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Role & Subscription
              </Typography>
              
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth error={!!errors.role}>
                    <InputLabel id="role-label">Role</InputLabel>
                    <Select
                      labelId="role-label"
                      name="role"
                      value={formData.role}
                      onChange={handleChange}
                      label="Role"
                    >
                      <MenuItem value="user">User</MenuItem>
                      {canCreateAdmin && (
                        <MenuItem value="admin">Admin</MenuItem>
                      )}
                    </Select>
                    {errors.role && (
                      <FormHelperText>{errors.role}</FormHelperText>
                    )}
                  </FormControl>
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth>
                    <InputLabel id="subscription-plan-label">Subscription Plan</InputLabel>
                    <Select
                      labelId="subscription-plan-label"
                      name="subscriptionPlan"
                      value={formData.subscriptionPlan}
                      onChange={handleChange}
                      label="Subscription Plan"
                    >
                      <MenuItem value="free">Free</MenuItem>
                      <MenuItem value="pro">Pro</MenuItem>
                      <MenuItem value="family">Family</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                
                <Grid item xs={12}>
                  <Alert severity="info">
                    <Typography variant="body2">
                      <strong>Role Permissions:</strong>
                    </Typography>
                    <ul style={{ margin: '8px 0', paddingLeft: '20px' }}>
                      <li><strong>User:</strong> Can manage their own items, locations, labels, and categories.</li>
                      <li><strong>Admin:</strong> Can manage all users, items, locations, labels, and categories. Cannot manage billing.</li>
                      <li><strong>Owner:</strong> Has full access to all features, including billing and subscription management.</li>
                    </ul>
                  </Alert>
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
                {submitting ? 'Creating...' : 'Create User'}
              </Button>
              
              <Button
                fullWidth
                component={RouterLink}
                to="/admin/dashboard"
                disabled={submitting}
              >
                Cancel
              </Button>
              
              <Divider sx={{ my: 3 }} />
              
              <Typography variant="body2" color="text.secondary" paragraph>
                Required fields are marked with an asterisk (*).
              </Typography>
              
              <Typography variant="body2" color="text.secondary">
                New users will be added to your group automatically.
              </Typography>
            </Paper>
          </Grid>
        </Grid>
      </form>
    </Container>
  );
};

export default CreateUser;

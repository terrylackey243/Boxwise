import React, { useState, useEffect, useContext } from 'react';
import { useNavigate, Link as RouterLink, Navigate } from 'react-router-dom';
import axios from '../../utils/axiosConfig';
import Fuse from 'fuse.js';
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
  Alert,
  RadioGroup,
  Radio,
  FormControlLabel,
  InputAdornment,
  Autocomplete
} from '@mui/material';
import {
  Save as SaveIcon,
  ArrowBack as ArrowBackIcon,
  Search as SearchIcon
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
    subscriptionPlan: 'free',
    groupOption: 'current', // 'current', 'new', or 'existing'
    newGroupName: '',
    selectedGroup: ''
  });
  
  // State for available groups
  const [groups, setGroups] = useState([]);
  const [loadingGroups, setLoadingGroups] = useState(false);
  const [searchGroupTerm, setSearchGroupTerm] = useState('');
  const [filteredGroups, setFilteredGroups] = useState([]);
  
  const [errors, setErrors] = useState({});
  
  // Check if current user is admin or owner
  const isAdminOrOwner = user && (user.role === 'admin' || user.role === 'owner');
  // Only owner can create admin users
  const canCreateAdmin = user && user.role === 'owner';

  // Fetch groups if user is owner
  useEffect(() => {
    const fetchGroups = async () => {
      if (user && user.role === 'owner') {
        setLoadingGroups(true);
        try {
          const response = await axios.get('/api/groups');
          if (response.data.success) {
            setGroups(response.data.data);
            setFilteredGroups(response.data.data);
          } else {
            console.error('Error fetching groups:', response.data.message);
          }
        } catch (err) {
          console.error('Error fetching groups:', err);
        } finally {
          setLoadingGroups(false);
        }
      }
    };
    
    fetchGroups();
  }, [user]);

  // Filter groups based on search term
  useEffect(() => {
    if (groups.length > 0) {
      if (searchGroupTerm.trim() === '') {
        setFilteredGroups(groups);
      } else {
        // Configure Fuse.js options
        const fuseOptions = {
          keys: ['name', 'description'],
          threshold: 0.4, // Lower threshold means more strict matching
          includeScore: true
        };
        
        // Create a Fuse instance
        const fuse = new Fuse(groups, fuseOptions);
        const results = fuse.search(searchGroupTerm);
        
        // Extract the matched items
        const matchedGroups = results.map(result => result.item);
        setFilteredGroups(matchedGroups);
      }
    }
  }, [groups, searchGroupTerm]);

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

  const handleSearchGroupChange = (e) => {
    setSearchGroupTerm(e.target.value);
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
    
    // Group validation
    if (canCreateAdmin) {
      if (formData.groupOption === 'new' && !formData.newGroupName.trim()) {
        newErrors.newGroupName = 'Group name is required';
      } else if (formData.groupOption === 'existing' && !formData.selectedGroup) {
        newErrors.selectedGroup = 'Please select a group';
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
      
      // Add group information if user is owner
      if (canCreateAdmin) {
        if (formData.groupOption === 'new') {
          userData.createNewGroup = true;
          userData.newGroupName = formData.newGroupName;
        } else if (formData.groupOption === 'existing') {
          userData.group = formData.selectedGroup;
        }
      }
      
      // Make API call to create user
      const response = await axios.post('/api/users', userData);
      
      if (response.data.success) {
        // Set success alert with a delay before navigation
        const alertId = setSuccessAlert(`User ${formData.name} created successfully`, 1500);
        
        // Navigate after a short delay to allow the alert to be shown
        setTimeout(() => {
          navigate('/admin/dashboard');
        }, 1500);
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
            
            <Paper sx={{ p: 3, mb: 3 }}>
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
                      <MenuItem value="viewer">Viewer (Read-only)</MenuItem>
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
                      <li><strong>Viewer:</strong> Can only view items, locations, labels, and categories. Cannot make any changes.</li>
                      <li><strong>User:</strong> Can manage their own items, locations, labels, and categories.</li>
                      <li><strong>Admin:</strong> Can manage all users, items, locations, labels, and categories. Cannot manage billing.</li>
                      <li><strong>Owner:</strong> Has full access to all features, including billing and subscription management.</li>
                    </ul>
                  </Alert>
                </Grid>
              </Grid>
            </Paper>
            
            {/* Group Assignment (Only for owners) */}
            {canCreateAdmin && (
              <Paper sx={{ p: 3 }}>
                <Typography variant="h6" gutterBottom>
                  Group Assignment
                </Typography>
                
                <FormControl component="fieldset" sx={{ mb: 2 }}>
                  <RadioGroup
                    name="groupOption"
                    value={formData.groupOption}
                    onChange={handleChange}
                  >
                    <FormControlLabel 
                      value="current" 
                      control={<Radio />} 
                      label="Add to your current group" 
                    />
                    <FormControlLabel 
                      value="new" 
                      control={<Radio />} 
                      label="Create a new group for this user" 
                    />
                    <FormControlLabel 
                      value="existing" 
                      control={<Radio />} 
                      label="Assign to an existing group" 
                    />
                  </RadioGroup>
                </FormControl>
                
                {formData.groupOption === 'new' && (
                  <TextField
                    fullWidth
                    label="New Group Name"
                    name="newGroupName"
                    value={formData.newGroupName}
                    onChange={handleChange}
                    error={!!errors.newGroupName}
                    helperText={errors.newGroupName}
                    sx={{ mb: 2 }}
                  />
                )}
                
                {formData.groupOption === 'existing' && (
                  <Box>
                    <Autocomplete
                      options={groups}
                      getOptionLabel={(option) => option.name}
                      value={formData.selectedGroup ? groups.find(g => g._id === formData.selectedGroup) || null : null}
                      onChange={(event, newValue) => {
                        setFormData(prevData => ({
                          ...prevData,
                          selectedGroup: newValue ? newValue._id : ''
                        }));
                        
                        // Clear error for this field if it exists
                        if (errors.selectedGroup) {
                          setErrors(prevErrors => ({
                            ...prevErrors,
                            selectedGroup: null
                          }));
                        }
                      }}
                      isOptionEqualToValue={(option, value) => option._id === value._id}
                      renderInput={(params) => (
                        <TextField
                          {...params}
                          label="Select Group"
                          error={!!errors.selectedGroup}
                          helperText={errors.selectedGroup}
                          InputProps={{
                            ...params.InputProps,
                            endAdornment: (
                              <>
                                {loadingGroups ? <CircularProgress color="inherit" size={20} /> : null}
                                {params.InputProps.endAdornment}
                              </>
                            ),
                          }}
                        />
                      )}
                      disabled={loadingGroups}
                      loading={loadingGroups}
                      loadingText="Loading groups..."
                      noOptionsText="No groups found"
                      fullWidth
                    />
                  </Box>
                )}
                
                <Alert severity="info" sx={{ mt: 2 }}>
                  <Typography variant="body2">
                    <strong>Group Assignment:</strong>
                  </Typography>
                  <ul style={{ margin: '8px 0', paddingLeft: '20px' }}>
                    <li>Users in the same group can see and manage each other's data.</li>
                    <li>Each group has its own subscription plan and limits.</li>
                    <li>As an owner, you can create and manage multiple groups.</li>
                  </ul>
                </Alert>
              </Paper>
            )}
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
              
              {!canCreateAdmin && (
                <Typography variant="body2" color="text.secondary">
                  New users will be added to your group automatically.
                </Typography>
              )}
            </Paper>
          </Grid>
        </Grid>
      </form>
    </Container>
  );
};

export default CreateUser;

import React, { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate, Link as RouterLink, Navigate } from 'react-router-dom';
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
  Alert,
  Switch,
  FormControlLabel,
  RadioGroup,
  Radio,
  Autocomplete
} from '@mui/material';
import {
  Save as SaveIcon,
  ArrowBack as ArrowBackIcon
} from '@mui/icons-material';
import { AuthContext } from '../../context/AuthContext';
import { AlertContext } from '../../context/AlertContext';

const EditUser = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);
  const { setSuccessAlert, setErrorAlert } = useContext(AlertContext);
  
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [userData, setUserData] = useState(null);
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    role: 'user',
    subscriptionPlan: 'free',
    subscriptionStatus: 'active',
    resetPassword: false,
    newPassword: '',
    confirmPassword: '',
    groupOption: 'current', // 'current', 'new', or 'existing'
    newGroupName: '',
    selectedGroup: ''
  });
  
  // State for available groups
  const [groups, setGroups] = useState([]);
  const [loadingGroups, setLoadingGroups] = useState(false);
  
  const [errors, setErrors] = useState({});
  
  // Check if current user is admin or owner
  const isAdminOrOwner = user && (user.role === 'admin' || user.role === 'owner');
  // Only owner can edit admin users or change roles
  const canEditAdmin = user && user.role === 'owner';
  // Check if editing self
  const isEditingSelf = user && user._id === id;

  // Fetch groups if user is owner
  useEffect(() => {
    const fetchGroups = async () => {
      if (user && user.role === 'owner') {
        setLoadingGroups(true);
        try {
          const response = await axios.get('/api/groups');
          if (response.data.success) {
            setGroups(response.data.data);
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

  useEffect(() => {
    const fetchUser = async () => {
      try {
        setLoading(true);
        
        // Make API call to fetch the user
        const response = await axios.get(`/api/users/${id}`);
        
        if (response.data.success) {
          const userData = response.data.data;
          
          setUserData(userData);
          
          // Set form data from user
          setFormData({
            name: userData.name,
            email: userData.email,
            role: userData.role,
            subscriptionPlan: userData.subscription?.plan || 'free',
            subscriptionStatus: userData.subscription?.status || 'active',
            resetPassword: false,
            newPassword: '',
            confirmPassword: '',
            groupOption: 'current',
            newGroupName: '',
            selectedGroup: userData.group || ''
          });
        } else {
          setErrorAlert('Error loading user data: ' + response.data.message);
        }
        
        setLoading(false);
      } catch (err) {
        setErrorAlert('Error loading user data: ' + (err.response?.data?.message || err.message));
        setLoading(false);
        console.error(err);
      }
    };
    
    if (isAdminOrOwner) {
      fetchUser();
    }
  }, [id, isAdminOrOwner, setErrorAlert]);

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
    
    // Password validation if resetting password
    if (formData.resetPassword) {
      if (!formData.newPassword) {
        newErrors.newPassword = 'New password is required';
      } else if (formData.newPassword.length < 6) {
        newErrors.newPassword = 'Password must be at least 6 characters';
      }
      
      if (formData.newPassword !== formData.confirmPassword) {
        newErrors.confirmPassword = 'Passwords do not match';
      }
    }
    
    // Role validation
    if (userData.role === 'owner' && formData.role !== 'owner') {
      newErrors.role = 'Cannot change the role of the owner';
    }
    
    if (userData.role === 'admin' && formData.role !== 'admin' && !canEditAdmin) {
      newErrors.role = 'You do not have permission to change admin roles';
    }
    
    if (formData.role === 'admin' && userData.role !== 'admin' && !canEditAdmin) {
      newErrors.role = 'You do not have permission to assign admin role';
    }
    
    if (formData.role === 'owner') {
      newErrors.role = 'Owner role cannot be assigned manually';
    }
    
    // Group validation
    if (canEditAdmin) {
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
      const updateData = {
        name: formData.name,
        email: formData.email,
        role: formData.role
      };
      
      // Add subscription data with fallback values to prevent undefined errors
      updateData.subscription = {
        plan: formData.subscriptionPlan || 'free',
        status: formData.subscriptionStatus || 'active'
      };
      
      // Log the update data for debugging
      console.log('Updating user with data:', updateData);
      
      // Add password if resetting
      if (formData.resetPassword) {
        updateData.password = formData.newPassword;
      }
      
      // Add group information if user is owner
      if (canEditAdmin) {
        if (formData.groupOption === 'new') {
          updateData.createNewGroup = true;
          updateData.newGroupName = formData.newGroupName;
        } else if (formData.groupOption === 'existing') {
          updateData.group = formData.selectedGroup;
        }
      }
      
      // Make API call to update user
      const response = await axios.put(`/api/users/${id}`, updateData);
      
      if (response.data.success) {
        setSuccessAlert(`User ${formData.name} updated successfully`);
        navigate('/admin/dashboard');
      } else {
        setErrorAlert('Error updating user: ' + response.data.message);
      }
    } catch (err) {
      setErrorAlert('Error updating user: ' + (err.response?.data?.message || err.message));
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  // If user is not admin or owner, redirect to dashboard
  if (!isAdminOrOwner) {
    return <Navigate to="/dashboard" />;
  }

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

  if (!userData) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant="h5" color="text.secondary">
            User not found
          </Typography>
          <Button
            variant="contained"
            component={RouterLink}
            to="/admin/dashboard"
            sx={{ mt: 2 }}
          >
            Back to Admin Dashboard
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
        <Link component={RouterLink} to="/admin/dashboard" underline="hover" color="inherit">
          Admin
        </Link>
        <Typography color="text.primary">Edit User</Typography>
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
          Edit User: {userData.name}
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
                
                <Grid item xs={12}>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    Member since: {new Date(userData.createdAt).toLocaleDateString()}
                  </Typography>
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
                      disabled={userData.role === 'owner' || (userData.role === 'admin' && !canEditAdmin) || (!canEditAdmin && formData.role === 'admin')}
                    >
                      <MenuItem value="user">User</MenuItem>
                      {canEditAdmin && (
                        <MenuItem value="admin">Admin</MenuItem>
                      )}
                      {userData.role === 'owner' && (
                        <MenuItem value="owner">Owner</MenuItem>
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
                      disabled={!canEditAdmin && userData.role === 'admin'}
                    >
                      <MenuItem value="free">Free</MenuItem>
                      <MenuItem value="pro">Pro</MenuItem>
                      <MenuItem value="family">Family</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth>
                    <InputLabel id="subscription-status-label">Subscription Status</InputLabel>
                    <Select
                      labelId="subscription-status-label"
                      name="subscriptionStatus"
                      value={formData.subscriptionStatus}
                      onChange={handleChange}
                      label="Subscription Status"
                      disabled={!canEditAdmin && userData.role === 'admin'}
                    >
                      <MenuItem value="active">Active</MenuItem>
                      <MenuItem value="inactive">Inactive</MenuItem>
                      <MenuItem value="cancelled">Cancelled</MenuItem>
                      <MenuItem value="past_due">Past Due</MenuItem>
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
            
            {/* Group Assignment (Only for owners) */}
            {canEditAdmin && (
              <Paper sx={{ p: 3, mb: 3 }}>
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
                      label="Keep in current group" 
                    />
                    <FormControlLabel 
                      value="new" 
                      control={<Radio />} 
                      label="Create a new group for this user" 
                    />
                    <FormControlLabel 
                      value="existing" 
                      control={<Radio />} 
                      label="Assign to a different group" 
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
                    <li>Moving a user to a different group will restrict their access to data from their previous group.</li>
                  </ul>
                </Alert>
              </Paper>
            )}
            
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Password
              </Typography>
              
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <FormControlLabel
                    control={
                      <Switch
                        name="resetPassword"
                        checked={formData.resetPassword}
                        onChange={handleChange}
                      />
                    }
                    label="Reset Password"
                  />
                </Grid>
                
                {formData.resetPassword && (
                  <>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        label="New Password"
                        name="newPassword"
                        type="password"
                        value={formData.newPassword}
                        onChange={handleChange}
                        error={!!errors.newPassword}
                        helperText={errors.newPassword}
                        required
                      />
                    </Grid>
                    
                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        label="Confirm New Password"
                        name="confirmPassword"
                        type="password"
                        value={formData.confirmPassword}
                        onChange={handleChange}
                        error={!!errors.confirmPassword}
                        helperText={errors.confirmPassword}
                        required
                      />
                    </Grid>
                  </>
                )}
                
                <Grid item xs={12}>
                  <Alert severity="warning">
                    Resetting a user's password will force them to log in again with the new password.
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
                {submitting ? 'Saving...' : 'Save Changes'}
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
              
              {isEditingSelf && (
                <Alert severity="info" sx={{ mt: 2 }}>
                  You are editing your own account. Some options may be restricted.
                </Alert>
              )}
              
              {userData.role === 'owner' && (
                <Alert severity="warning" sx={{ mt: 2 }}>
                  This is the owner account. Role cannot be changed.
                </Alert>
              )}
            </Paper>
          </Grid>
        </Grid>
      </form>
    </Container>
  );
};

export default EditUser;

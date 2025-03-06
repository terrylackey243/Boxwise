import React, { useState, useContext } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import {
  Container,
  Grid,
  Paper,
  Typography,
  Box,
  TextField,
  Button,
  Divider,
  Avatar,
  Switch,
  FormControlLabel,
  CircularProgress,
  Alert,
  Card,
  CardContent,
  CardActions
} from '@mui/material';
import {
  Person as PersonIcon,
  Save as SaveIcon,
  DarkMode as DarkModeIcon,
  LightMode as LightModeIcon,
  EmojiEvents as AchievementIcon
} from '@mui/icons-material';
import { AuthContext } from '../../context/AuthContext';
import { AlertContext } from '../../context/AlertContext';

const Profile = () => {
  const { user, updateUser, updatePassword, updatePreferences } = useContext(AuthContext);
  const { setSuccessAlert, setErrorAlert } = useContext(AlertContext);
  
  const [profileData, setProfileData] = useState({
    name: user?.name || '',
    email: user?.email || ''
  });
  
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  
  const [preferences, setPreferences] = useState({
    theme: user?.preferences?.theme || 'light',
    notifications: user?.preferences?.notifications !== false
  });
  
  const [loading, setLoading] = useState({
    profile: false,
    password: false,
    preferences: false
  });
  
  const [errors, setErrors] = useState({
    profile: null,
    password: null,
    preferences: null
  });

  const handleProfileChange = (e) => {
    setProfileData({
      ...profileData,
      [e.target.name]: e.target.value
    });
  };

  const handlePasswordChange = (e) => {
    setPasswordData({
      ...passwordData,
      [e.target.name]: e.target.value
    });
  };

  const handlePreferenceChange = (e) => {
    setPreferences({
      ...preferences,
      [e.target.name]: e.target.type === 'checkbox' ? e.target.checked : e.target.value
    });
  };

  const validatePasswordForm = () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setErrors({
        ...errors,
        password: 'New passwords do not match'
      });
      return false;
    }
    
    if (passwordData.newPassword.length < 6) {
      setErrors({
        ...errors,
        password: 'Password must be at least 6 characters'
      });
      return false;
    }
    
    setErrors({
      ...errors,
      password: null
    });
    return true;
  };

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setLoading({ ...loading, profile: true });
    
    try {
      // Make API call to update user profile
      await updateUser(profileData);
      
      setSuccessAlert('Profile updated successfully');
      setErrors({ ...errors, profile: null });
    } catch (err) {
      setErrors({
        ...errors,
        profile: err.message || 'Error updating profile'
      });
      setErrorAlert('Error updating profile');
    } finally {
      setLoading({ ...loading, profile: false });
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    
    if (!validatePasswordForm()) {
      return;
    }
    
    setLoading({ ...loading, password: true });
    
    try {
      // Make API call to update password
      await updatePassword(passwordData);
      
      setSuccessAlert('Password updated successfully');
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
      setErrors({ ...errors, password: null });
    } catch (err) {
      setErrors({
        ...errors,
        password: err.message || 'Error updating password'
      });
      setErrorAlert('Error updating password');
    } finally {
      setLoading({ ...loading, password: false });
    }
  };

  const handlePreferencesSubmit = async (e) => {
    e.preventDefault();
    setLoading({ ...loading, preferences: true });
    
    try {
      // Make API call to update preferences
      await updatePreferences(preferences);
      
      setSuccessAlert('Preferences updated successfully');
      setErrors({ ...errors, preferences: null });
    } catch (err) {
      setErrors({
        ...errors,
        preferences: err.message || 'Error updating preferences'
      });
      setErrorAlert('Error updating preferences');
    } finally {
      setLoading({ ...loading, preferences: false });
    }
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Grid container spacing={4}>
        {/* Achievements Card */}
        <Grid item xs={12}>
          <Card sx={{ borderRadius: 2, mb: 4 }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Avatar
                  sx={{
                    bgcolor: 'primary.main',
                    width: 56,
                    height: 56,
                    mr: 2
                  }}
                >
                  <AchievementIcon />
                </Avatar>
                <Box>
                  <Typography variant="h5" component="h2">
                    Achievements
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Track your progress and earn rewards
                  </Typography>
                </Box>
              </Box>
              
              <Typography variant="body1" paragraph>
                Complete tasks and earn achievements as you use Boxwise. View your achievements to see your progress and unlock rewards.
              </Typography>
            </CardContent>
            <CardActions>
              <Button 
                component={RouterLink} 
                to="/achievements" 
                variant="contained" 
                startIcon={<AchievementIcon />}
              >
                View Achievements
              </Button>
            </CardActions>
          </Card>
        </Grid>
        {/* Profile Information */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3, borderRadius: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
              <Avatar
                sx={{
                  bgcolor: 'primary.main',
                  width: 56,
                  height: 56,
                  mr: 2
                }}
              >
                {user?.name?.charAt(0) || <PersonIcon />}
              </Avatar>
              <Box>
                <Typography variant="h5" component="h1">
                  Profile Information
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Update your personal details
                </Typography>
              </Box>
            </Box>
            
            {errors.profile && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {errors.profile}
              </Alert>
            )}
            
            <Box component="form" onSubmit={handleProfileSubmit}>
              <TextField
                fullWidth
                margin="normal"
                label="Name"
                name="name"
                value={profileData.name}
                onChange={handleProfileChange}
                required
              />
              
              <TextField
                fullWidth
                margin="normal"
                label="Email"
                name="email"
                type="email"
                value={profileData.email}
                onChange={handleProfileChange}
                required
              />
              
              <Button
                type="submit"
                variant="contained"
                startIcon={loading.profile ? <CircularProgress size={20} color="inherit" /> : <SaveIcon />}
                disabled={loading.profile}
                sx={{ mt: 3 }}
              >
                Save Changes
              </Button>
            </Box>
          </Paper>
        </Grid>
        
        {/* Password */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3, borderRadius: 2 }}>
            <Typography variant="h5" component="h2" gutterBottom>
              Change Password
            </Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
              Update your password to keep your account secure
            </Typography>
            
            {errors.password && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {errors.password}
              </Alert>
            )}
            
            <Box component="form" onSubmit={handlePasswordSubmit}>
              <TextField
                fullWidth
                margin="normal"
                label="Current Password"
                name="currentPassword"
                type="password"
                value={passwordData.currentPassword}
                onChange={handlePasswordChange}
                required
              />
              
              <TextField
                fullWidth
                margin="normal"
                label="New Password"
                name="newPassword"
                type="password"
                value={passwordData.newPassword}
                onChange={handlePasswordChange}
                required
                helperText="Password must be at least 6 characters"
              />
              
              <TextField
                fullWidth
                margin="normal"
                label="Confirm New Password"
                name="confirmPassword"
                type="password"
                value={passwordData.confirmPassword}
                onChange={handlePasswordChange}
                required
              />
              
              <Button
                type="submit"
                variant="contained"
                startIcon={loading.password ? <CircularProgress size={20} color="inherit" /> : <SaveIcon />}
                disabled={loading.password}
                sx={{ mt: 3 }}
              >
                Update Password
              </Button>
            </Box>
          </Paper>
        </Grid>
        
        {/* Preferences */}
        <Grid item xs={12}>
          <Paper sx={{ p: 3, borderRadius: 2 }}>
            <Typography variant="h5" component="h2" gutterBottom>
              Preferences
            </Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
              Customize your experience
            </Typography>
            
            {errors.preferences && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {errors.preferences}
              </Alert>
            )}
            
            <Box component="form" onSubmit={handlePreferencesSubmit}>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <Box sx={{ mr: 2 }}>
                      {preferences.theme === 'dark' ? (
                        <DarkModeIcon color="primary" />
                      ) : (
                        <LightModeIcon color="primary" />
                      )}
                    </Box>
                    <Box>
                      <Typography variant="body1">
                        Theme Mode
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Choose between light and dark theme
                      </Typography>
                    </Box>
                  </Box>
                  
                  <FormControlLabel
                    control={
                      <Switch
                        checked={preferences.theme === 'dark'}
                        onChange={(e) => setPreferences({
                          ...preferences,
                          theme: e.target.checked ? 'dark' : 'light'
                        })}
                        name="theme"
                        color="primary"
                      />
                    }
                    label={preferences.theme === 'dark' ? 'Dark Mode' : 'Light Mode'}
                  />
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body1">
                      Notifications
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Receive notifications about your inventory
                    </Typography>
                  </Box>
                  
                  <FormControlLabel
                    control={
                      <Switch
                        checked={preferences.notifications}
                        onChange={handlePreferenceChange}
                        name="notifications"
                        color="primary"
                      />
                    }
                    label={preferences.notifications ? 'Enabled' : 'Disabled'}
                  />
                </Grid>
              </Grid>
              
              <Divider sx={{ my: 3 }} />
              
              <Button
                type="submit"
                variant="contained"
                startIcon={loading.preferences ? <CircularProgress size={20} color="inherit" /> : <SaveIcon />}
                disabled={loading.preferences}
              >
                Save Preferences
              </Button>
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Container>
  );
};

export default Profile;

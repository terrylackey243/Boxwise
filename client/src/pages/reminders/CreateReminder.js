import React, { useState, useEffect, useContext } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
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
  FormControlLabel,
  Switch,
  Divider,
  CircularProgress,
  Alert,
  FormHelperText
} from '@mui/material';
// Removed DatePicker import
import {
  ArrowBack as ArrowBackIcon,
  Save as SaveIcon,
  Alarm as AlarmIcon
} from '@mui/icons-material';
import { AlertContext } from '../../context/AlertContext';

const CreateReminder = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { setSuccessAlert, setErrorAlert } = useContext(AlertContext);
  
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [items, setItems] = useState([]);
  const [selectedItem, setSelectedItem] = useState(null);
  
  // Get pre-filled data from location state (if navigating from item detail)
  const prefilledItemId = location.state?.itemId;
  const prefilledReminderType = location.state?.reminderType || 'maintenance';
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    item: prefilledItemId || '',
    reminderDate: new Date(),
    reminderType: prefilledReminderType,
    isRecurring: false,
    recurringInterval: 'monthly'
  });
  
  const [errors, setErrors] = useState({});
  
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Fetch items from the API
        const response = await axios.get('/api/items?limit=100&archived=false');
        
        if (response.data.success) {
          setItems(response.data.data || []);
          
          // If we have a prefilled item ID, fetch the item details
          if (prefilledItemId) {
            try {
              const itemResponse = await axios.get(`/api/items/${prefilledItemId}`);
              if (itemResponse.data.success) {
                const item = itemResponse.data.data;
                setSelectedItem(item);
                
                // Pre-fill title and description based on reminder type
                if (prefilledReminderType === 'warranty' && item.warrantyDetails && item.warrantyDetails.warrantyExpires) {
                  const warrantyDate = new Date(item.warrantyDetails.warrantyExpires);
                  setFormData(prev => ({
                    ...prev,
                    title: `Warranty Expiring: ${item.name}`,
                    description: `The warranty for ${item.name} expires on ${warrantyDate.toLocaleDateString()}. Take action if needed.`
                  }));
                } else if (prefilledReminderType === 'maintenance') {
                  setFormData(prev => ({
                    ...prev,
                    title: `Maintenance: ${item.name}`,
                    description: `Regular maintenance for ${item.name}`
                  }));
                }
              }
            } catch (err) {
              console.error('Error fetching item details:', err);
            }
          }
        } else {
          setErrorAlert('Error loading items');
        }
        
        setLoading(false);
      } catch (err) {
        setErrorAlert('Error loading items');
        setLoading(false);
        console.error(err);
      }
    };
    
    fetchData();
  }, [prefilledItemId, prefilledReminderType, setErrorAlert]);
  
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
    
    // Clear error for this field
    if (errors[name]) {
      setErrors({
        ...errors,
        [name]: ''
      });
    }
  };
  
  const handleSwitchChange = (e) => {
    const { name, checked } = e.target;
    setFormData({
      ...formData,
      [name]: checked
    });
  };
  
  const handleDateChange = (date) => {
    setFormData({
      ...formData,
      reminderDate: date
    });
    
    // Clear error for this field
    if (errors.reminderDate) {
      setErrors({
        ...errors,
        reminderDate: ''
      });
    }
  };
  
  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.title.trim()) {
      newErrors.title = 'Title is required';
    }
    
    if (!formData.item) {
      newErrors.item = 'Item is required';
    }
    
    if (!formData.reminderDate) {
      newErrors.reminderDate = 'Reminder date is required';
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
      // Make sure the date is properly formatted
      const dataToSubmit = {
        ...formData,
        reminderDate: formData.reminderDate instanceof Date 
          ? formData.reminderDate 
          : new Date(formData.reminderDate)
      };
      
      console.log('Submitting reminder data:', dataToSubmit);
      
      const response = await axios.post('/api/reminders', dataToSubmit);
      
      if (response.data.success) {
        console.log('Reminder created successfully:', response.data);
        setSuccessAlert('Reminder created successfully');
        navigate('/reminders');
      } else {
        setErrorAlert('Error creating reminder');
        setSubmitting(false);
      }
    } catch (err) {
      console.error('Error creating reminder:', err);
      console.error('Error response:', err.response?.data);
      setErrorAlert('Error creating reminder: ' + (err.response?.data?.message || err.message));
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
  
  return (
    <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
      <Paper sx={{ p: 3, borderRadius: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
          <Button
            startIcon={<ArrowBackIcon />}
            onClick={() => navigate('/reminders')}
            sx={{ mr: 2 }}
          >
            Back
          </Button>
          <Typography variant="h4" component="h1">
            Create Reminder
          </Typography>
        </Box>
        
        <Divider sx={{ mb: 4 }} />
        
        {items.length === 0 ? (
          <Alert severity="warning" sx={{ mb: 3 }}>
            You need to have at least one item to create a reminder. Please add an item first.
          </Alert>
        ) : (
          <form onSubmit={handleSubmit}>
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Reminder Title"
                  name="title"
                  value={formData.title}
                  onChange={handleChange}
                  error={!!errors.title}
                  helperText={errors.title}
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
              
              <Grid item xs={12} md={6}>
                <FormControl fullWidth error={!!errors.item} required>
                  <InputLabel id="item-label">Item</InputLabel>
                  <Select
                    labelId="item-label"
                    name="item"
                    value={formData.item}
                    label="Item"
                    onChange={handleChange}
                  >
                    {items.map((item) => (
                      <MenuItem key={item._id} value={item._id}>
                        {item.name} {item.assetId ? `(${item.assetId})` : ''}
                      </MenuItem>
                    ))}
                  </Select>
                  {errors.item && <FormHelperText>{errors.item}</FormHelperText>}
                </FormControl>
              </Grid>
              
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel id="reminder-type-label">Reminder Type</InputLabel>
                  <Select
                    labelId="reminder-type-label"
                    name="reminderType"
                    value={formData.reminderType}
                    label="Reminder Type"
                    onChange={handleChange}
                  >
                    <MenuItem value="maintenance">Maintenance</MenuItem>
                    <MenuItem value="warranty">Warranty</MenuItem>
                    <MenuItem value="service">Service</MenuItem>
                    <MenuItem value="replacement">Replacement</MenuItem>
                    <MenuItem value="other">Other</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Reminder Date"
                  type="date"
                  name="reminderDate"
                  value={formData.reminderDate instanceof Date ? formData.reminderDate.toISOString().split('T')[0] : ''}
                  onChange={(e) => {
                    const date = new Date(e.target.value);
                    handleDateChange(date);
                  }}
                  required
                  error={!!errors.reminderDate}
                  helperText={errors.reminderDate}
                  InputLabelProps={{
                    shrink: true,
                  }}
                />
              </Grid>
              
              <Grid item xs={12} md={6}>
                <Box sx={{ display: 'flex', alignItems: 'center', height: '100%' }}>
                  <FormControlLabel
                    control={
                      <Switch
                        name="isRecurring"
                        checked={formData.isRecurring}
                        onChange={handleSwitchChange}
                      />
                    }
                    label="Recurring Reminder"
                  />
                </Box>
              </Grid>
              
              {formData.isRecurring && (
                <Grid item xs={12} md={6}>
                  <FormControl fullWidth>
                    <InputLabel id="recurring-interval-label">Recurring Interval</InputLabel>
                    <Select
                      labelId="recurring-interval-label"
                      name="recurringInterval"
                      value={formData.recurringInterval}
                      label="Recurring Interval"
                      onChange={handleChange}
                    >
                      <MenuItem value="daily">Daily</MenuItem>
                      <MenuItem value="weekly">Weekly</MenuItem>
                      <MenuItem value="monthly">Monthly</MenuItem>
                      <MenuItem value="quarterly">Quarterly</MenuItem>
                      <MenuItem value="yearly">Yearly</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
              )}
              
              <Grid item xs={12}>
                <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
                  <Button
                    variant="outlined"
                    onClick={() => navigate('/reminders')}
                    sx={{ mr: 2 }}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    variant="contained"
                    startIcon={submitting ? <CircularProgress size={24} color="inherit" /> : <SaveIcon />}
                    disabled={submitting}
                  >
                    {submitting ? 'Creating...' : 'Create Reminder'}
                  </Button>
                </Box>
              </Grid>
            </Grid>
          </form>
        )}
      </Paper>
    </Container>
  );
};

export default CreateReminder;

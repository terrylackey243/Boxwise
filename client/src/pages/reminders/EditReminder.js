import React, { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
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

const EditReminder = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { setSuccessAlert, setErrorAlert } = useContext(AlertContext);
  
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [items, setItems] = useState([]);
  const [reminder, setReminder] = useState(null);
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    item: '',
    reminderDate: new Date(),
    reminderType: 'maintenance',
    isRecurring: false,
    recurringInterval: 'monthly'
  });
  
  const [errors, setErrors] = useState({});
  
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Fetch reminder and items in parallel
        const [reminderRes, itemsRes] = await Promise.all([
          axios.get(`/api/reminders/${id}`),
          axios.get('/api/items?limit=100&archived=false')
        ]);
        
        if (reminderRes.data.success && itemsRes.data.success) {
          const reminderData = reminderRes.data.data;
          setReminder(reminderData);
          
          // Set form data from reminder
          setFormData({
            title: reminderData.title || '',
            description: reminderData.description || '',
            item: reminderData.item._id || '',
            reminderDate: new Date(reminderData.reminderDate) || new Date(),
            reminderType: reminderData.reminderType || 'maintenance',
            isRecurring: reminderData.isRecurring || false,
            recurringInterval: reminderData.recurringInterval || 'monthly'
          });
          
          setItems(itemsRes.data.data || []);
        } else {
          setErrorAlert('Error loading data');
          navigate('/reminders');
        }
        
        setLoading(false);
      } catch (err) {
        setErrorAlert('Error loading data');
        navigate('/reminders');
        setLoading(false);
        console.error(err);
      }
    };
    
    fetchData();
  }, [id, navigate, setErrorAlert]);
  
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
      
      const response = await axios.put(`/api/reminders/${id}`, dataToSubmit);
      
      if (response.data.success) {
        console.log('Reminder updated successfully:', response.data);
        setSuccessAlert('Reminder updated successfully');
        navigate(`/reminders/${id}`);
      } else {
        setErrorAlert('Error updating reminder');
        setSubmitting(false);
      }
    } catch (err) {
      console.error('Error updating reminder:', err);
      console.error('Error response:', err.response?.data);
      setErrorAlert('Error updating reminder: ' + (err.response?.data?.message || err.message));
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
  
  if (!reminder) {
    return (
      <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
        <Paper sx={{ p: 3, borderRadius: 2 }}>
          <Typography variant="h5" color="error">
            Reminder not found
          </Typography>
          <Button
            variant="contained"
            startIcon={<ArrowBackIcon />}
            onClick={() => navigate('/reminders')}
            sx={{ mt: 2 }}
          >
            Back to Reminders
          </Button>
        </Paper>
      </Container>
    );
  }
  
  return (
    <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
      <Paper sx={{ p: 3, borderRadius: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
          <Button
            startIcon={<ArrowBackIcon />}
            onClick={() => navigate(`/reminders/${id}`)}
            sx={{ mr: 2 }}
          >
            Back
          </Button>
          <Typography variant="h4" component="h1">
            Edit Reminder
          </Typography>
        </Box>
        
        <Divider sx={{ mb: 4 }} />
        
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
                  onClick={() => navigate(`/reminders/${id}`)}
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
                  {submitting ? 'Saving...' : 'Save Changes'}
                </Button>
              </Box>
            </Grid>
          </Grid>
        </form>
      </Paper>
    </Container>
  );
};

export default EditReminder;

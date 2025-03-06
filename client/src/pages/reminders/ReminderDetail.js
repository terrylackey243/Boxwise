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
  Divider,
  CircularProgress,
  Chip,
  Card,
  CardContent,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  CheckCircle as CheckCircleIcon,
  Alarm as AlarmIcon,
  Build as BuildIcon,
  VerifiedUser as WarrantyIcon,
  Settings as ServiceIcon,
  Label as OtherIcon,
  CalendarToday as CalendarIcon,
  Repeat as RepeatIcon,
  Person as PersonIcon,
  Info as InfoIcon,
  Inventory as InventoryIcon
} from '@mui/icons-material';
import { AlertContext } from '../../context/AlertContext';
// Removed date-fns import

const ReminderDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { setSuccessAlert, setErrorAlert } = useContext(AlertContext);
  
  const [loading, setLoading] = useState(true);
  const [reminder, setReminder] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  
  useEffect(() => {
    const fetchReminder = async () => {
      try {
        setLoading(true);
        
        const response = await axios.get(`/api/reminders/${id}`);
        
        if (response.data.success) {
          setReminder(response.data.data);
        } else {
          setErrorAlert('Error loading reminder');
          navigate('/reminders');
        }
        
        setLoading(false);
      } catch (err) {
        setErrorAlert('Error loading reminder');
        navigate('/reminders');
        console.error(err);
      }
    };
    
    fetchReminder();
  }, [id, navigate, setErrorAlert]);
  
  const handleDeleteDialogOpen = () => {
    setDeleteDialogOpen(true);
  };
  
  const handleDeleteDialogClose = () => {
    setDeleteDialogOpen(false);
  };
  
  const handleDeleteReminder = async () => {
    try {
      const response = await axios.delete(`/api/reminders/${id}`);
      
      if (response.data.success) {
        setSuccessAlert('Reminder deleted successfully');
        navigate('/reminders');
      } else {
        setErrorAlert('Error deleting reminder');
      }
    } catch (err) {
      setErrorAlert('Error deleting reminder');
      console.error(err);
    }
    
    handleDeleteDialogClose();
  };
  
  const handleMarkComplete = async () => {
    try {
      const response = await axios.put(`/api/reminders/${id}`, {
        isCompleted: true
      });
      
      if (response.data.success) {
        setSuccessAlert('Reminder marked as complete');
        // Refresh the reminder data
        setReminder(response.data.data);
      } else {
        setErrorAlert('Error updating reminder');
      }
    } catch (err) {
      setErrorAlert('Error updating reminder');
      console.error(err);
    }
  };
  
  const getReminderTypeIcon = (type) => {
    switch (type) {
      case 'maintenance':
        return <BuildIcon fontSize="large" />;
      case 'warranty':
        return <WarrantyIcon fontSize="large" />;
      case 'service':
        return <ServiceIcon fontSize="large" />;
      case 'replacement':
        return <AlarmIcon fontSize="large" />;
      default:
        return <OtherIcon fontSize="large" />;
    }
  };
  
  const getReminderTypeText = (type) => {
    switch (type) {
      case 'maintenance':
        return 'Maintenance';
      case 'warranty':
        return 'Warranty';
      case 'service':
        return 'Service';
      case 'replacement':
        return 'Replacement';
      default:
        return 'Other';
    }
  };
  
  const getRecurringIntervalText = (interval) => {
    switch (interval) {
      case 'daily':
        return 'Daily';
      case 'weekly':
        return 'Weekly';
      case 'monthly':
        return 'Monthly';
      case 'quarterly':
        return 'Quarterly';
      case 'yearly':
        return 'Yearly';
      default:
        return interval;
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
            onClick={() => navigate('/reminders')}
            sx={{ mr: 2 }}
          >
            Back
          </Button>
          <Typography variant="h4" component="h1">
            Reminder Details
          </Typography>
        </Box>
        
        <Divider sx={{ mb: 4 }} />
        
        <Grid container spacing={4}>
          <Grid item xs={12} md={8}>
            <Box sx={{ mb: 3 }}>
              <Typography variant="h5" gutterBottom>
                {reminder.title}
              </Typography>
              
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Chip
                  icon={reminder.isCompleted ? <CheckCircleIcon /> : getReminderTypeIcon(reminder.reminderType)}
                  label={reminder.isCompleted ? 'Completed' : getReminderTypeText(reminder.reminderType)}
                  color={reminder.isCompleted ? 'success' : 'primary'}
                  sx={{ mr: 1 }}
                />
                
                {reminder.isRecurring && (
                  <Chip
                    icon={<RepeatIcon />}
                    label={`Recurring (${getRecurringIntervalText(reminder.recurringInterval)})`}
                    sx={{ mr: 1 }}
                  />
                )}
              </Box>
              
              {reminder.description && (
                <Typography variant="body1" paragraph>
                  {reminder.description}
                </Typography>
              )}
            </Box>
            
            <Card variant="outlined" sx={{ mb: 3 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Details
                </Typography>
                
                <List dense>
                  <ListItem>
                    <ListItemIcon>
                      <CalendarIcon />
                    </ListItemIcon>
                    <ListItemText
                      primary="Reminder Date"
                      secondary={new Date(reminder.reminderDate).toLocaleDateString('en-US', { 
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric' 
                      })}
                    />
                  </ListItem>
                  
                  {reminder.isCompleted && reminder.completedDate && (
                    <ListItem>
                      <ListItemIcon>
                        <CheckCircleIcon />
                      </ListItemIcon>
                      <ListItemText
                        primary="Completed On"
                        secondary={new Date(reminder.completedDate).toLocaleDateString('en-US', { 
                          year: 'numeric', 
                          month: 'long', 
                          day: 'numeric' 
                        })}
                      />
                    </ListItem>
                  )}
                  
                  <ListItem>
                    <ListItemIcon>
                      <InventoryIcon />
                    </ListItemIcon>
                    <ListItemText
                      primary="Item"
                      secondary={
                        <RouterLink to={`/items/${reminder.item._id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                          {reminder.item.name} {reminder.item.assetId ? `(${reminder.item.assetId})` : ''}
                        </RouterLink>
                      }
                    />
                  </ListItem>
                  
                  <ListItem>
                    <ListItemIcon>
                      <PersonIcon />
                    </ListItemIcon>
                    <ListItemText
                      primary="Created By"
                      secondary={reminder.createdBy?.name || 'Unknown'}
                    />
                  </ListItem>
                  
                  <ListItem>
                    <ListItemIcon>
                      <InfoIcon />
                    </ListItemIcon>
                    <ListItemText
                      primary="Created On"
                      secondary={new Date(reminder.createdAt).toLocaleDateString('en-US', { 
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric' 
                      })}
                    />
                  </ListItem>
                </List>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} md={4}>
            <Box sx={{ mb: 3 }}>
              <Typography variant="h6" gutterBottom>
                Actions
              </Typography>
              
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {!reminder.isCompleted && (
                  <Button
                    variant="contained"
                    color="success"
                    startIcon={<CheckCircleIcon />}
                    onClick={handleMarkComplete}
                    fullWidth
                  >
                    Mark as Complete
                  </Button>
                )}
                
                <Button
                  variant="outlined"
                  startIcon={<EditIcon />}
                  component={RouterLink}
                  to={`/reminders/edit/${reminder._id}`}
                  fullWidth
                >
                  Edit Reminder
                </Button>
                
                <Button
                  variant="outlined"
                  color="error"
                  startIcon={<DeleteIcon />}
                  onClick={handleDeleteDialogOpen}
                  fullWidth
                >
                  Delete Reminder
                </Button>
              </Box>
            </Box>
          </Grid>
        </Grid>
      </Paper>
      
      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={handleDeleteDialogClose}
      >
        <DialogTitle>Delete Reminder</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete this reminder? This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDeleteDialogClose}>Cancel</Button>
          <Button onClick={handleDeleteReminder} color="error">
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default ReminderDetail;

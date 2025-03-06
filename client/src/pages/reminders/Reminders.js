import React, { useState, useEffect, useContext } from 'react';
import { Link as RouterLink } from 'react-router-dom';
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
  Tabs,
  Tab,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Chip,
  Menu,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Tooltip,
  Pagination
} from '@mui/material';
import {
  Add as AddIcon,
  MoreVert as MoreIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  CheckCircle as CheckCircleIcon,
  Alarm as AlarmIcon,
  Build as BuildIcon,
  VerifiedUser as WarrantyIcon,
  Settings as ServiceIcon,
  Label as OtherIcon
} from '@mui/icons-material';
import { AlertContext } from '../../context/AlertContext';
// Removed date-fns import

const Reminders = () => {
  const { setSuccessAlert, setErrorAlert } = useContext(AlertContext);
  const [loading, setLoading] = useState(true);
  const [reminders, setReminders] = useState([]);
  const [tabValue, setTabValue] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedReminder, setSelectedReminder] = useState(null);
  const [menuAnchorEl, setMenuAnchorEl] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  
  useEffect(() => {
    fetchReminders();
  }, [tabValue, page]);
  
  const fetchReminders = async () => {
    try {
      setLoading(true);
      
      // Build query parameters based on selected tab
      const params = new URLSearchParams();
      params.append('page', page);
      params.append('limit', 10);
      
      if (tabValue === 0) {
        // Upcoming reminders
        params.append('completed', 'false');
        params.append('sort', 'reminderDate');
        params.append('order', 'asc');
      } else if (tabValue === 1) {
        // Completed reminders
        params.append('completed', 'true');
        params.append('sort', 'completedDate');
        params.append('order', 'desc');
      }
      
      console.log('Fetching reminders with params:', params.toString());
      const response = await axios.get(`/api/reminders?${params.toString()}`);
      
      console.log('Reminders API response:', response.data);
      
      if (response.data.success) {
        console.log('Setting reminders:', response.data.data);
        setReminders(response.data.data);
        
        // Calculate total pages
        if (response.data.pagination) {
          const total = Math.ceil(response.data.count / 10);
          setTotalPages(total > 0 ? total : 1);
        }
      } else {
        console.error('API returned success: false');
        setErrorAlert('Error loading reminders');
      }
      
      setLoading(false);
    } catch (err) {
      console.error('Error fetching reminders:', err);
      console.error('Error response:', err.response?.data);
      setErrorAlert('Error loading reminders');
      setLoading(false);
    }
  };
  
  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
    setPage(1); // Reset to first page when changing tabs
  };
  
  const handlePageChange = (event, value) => {
    setPage(value);
  };
  
  const handleMenuOpen = (event, reminder) => {
    setMenuAnchorEl(event.currentTarget);
    setSelectedReminder(reminder);
  };
  
  const handleMenuClose = () => {
    setMenuAnchorEl(null);
  };
  
  const handleDeleteDialogOpen = () => {
    setDeleteDialogOpen(true);
    handleMenuClose();
  };
  
  const handleDeleteDialogClose = () => {
    setDeleteDialogOpen(false);
  };
  
  const handleMarkComplete = async () => {
    if (!selectedReminder) return;
    
    try {
      const response = await axios.put(`/api/reminders/${selectedReminder._id}`, {
        isCompleted: true
      });
      
      if (response.data.success) {
        setSuccessAlert('Reminder marked as complete');
        fetchReminders();
      } else {
        setErrorAlert('Error updating reminder');
      }
    } catch (err) {
      setErrorAlert('Error updating reminder');
      console.error(err);
    }
    
    handleMenuClose();
  };
  
  const handleDeleteReminder = async () => {
    if (!selectedReminder) return;
    
    try {
      const response = await axios.delete(`/api/reminders/${selectedReminder._id}`);
      
      if (response.data.success) {
        setSuccessAlert('Reminder deleted successfully');
        fetchReminders();
      } else {
        setErrorAlert('Error deleting reminder');
      }
    } catch (err) {
      setErrorAlert('Error deleting reminder');
      console.error(err);
    }
    
    handleDeleteDialogClose();
  };
  
  const getReminderTypeIcon = (type) => {
    switch (type) {
      case 'maintenance':
        return <BuildIcon />;
      case 'warranty':
        return <WarrantyIcon />;
      case 'service':
        return <ServiceIcon />;
      case 'replacement':
        return <AlarmIcon />;
      default:
        return <OtherIcon />;
    }
  };
  
  const formatReminderDate = (date) => {
    const reminderDate = new Date(date);
    const today = new Date();
    const tomorrow = new Date();
    tomorrow.setDate(today.getDate() + 1);
    
    // Check if date is today
    const isToday = reminderDate.getDate() === today.getDate() &&
                    reminderDate.getMonth() === today.getMonth() &&
                    reminderDate.getFullYear() === today.getFullYear();
    
    // Check if date is tomorrow
    const isTomorrow = reminderDate.getDate() === tomorrow.getDate() &&
                       reminderDate.getMonth() === tomorrow.getMonth() &&
                       reminderDate.getFullYear() === tomorrow.getFullYear();
    
    // Check if date is in the past
    const isPast = reminderDate < today;
    
    // Check if date is within the next 7 days
    const nextWeek = new Date();
    nextWeek.setDate(today.getDate() + 7);
    const isWithinWeek = reminderDate > today && reminderDate < nextWeek;
    
    if (isToday) {
      return 'Today';
    } else if (isTomorrow) {
      return 'Tomorrow';
    } else if (isPast) {
      return `${reminderDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} (Overdue)`;
    } else if (isWithinWeek) {
      return reminderDate.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
    } else {
      return reminderDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    }
  };
  
  const getChipColor = (date, isCompleted) => {
    if (isCompleted) {
      return 'success';
    }
    
    const reminderDate = new Date(date);
    const today = new Date();
    const tomorrow = new Date();
    tomorrow.setDate(today.getDate() + 1);
    
    // Check if date is today
    const isToday = reminderDate.getDate() === today.getDate() &&
                    reminderDate.getMonth() === today.getMonth() &&
                    reminderDate.getFullYear() === today.getFullYear();
    
    // Check if date is tomorrow
    const isTomorrow = reminderDate.getDate() === tomorrow.getDate() &&
                       reminderDate.getMonth() === tomorrow.getMonth() &&
                       reminderDate.getFullYear() === tomorrow.getFullYear();
    
    // Check if date is in the past
    const isPast = reminderDate < today;
    
    if (isPast) {
      return 'error';
    } else if (isToday) {
      return 'warning';
    } else if (isTomorrow) {
      return 'info';
    } else {
      return 'default';
    }
  };
  
  if (loading && reminders.length === 0) {
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
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Paper sx={{ p: 3, mb: 4, borderRadius: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h4" component="h1">
            Reminders
          </Typography>
          
          <Button
            variant="contained"
            color="primary"
            startIcon={<AddIcon />}
            component={RouterLink}
            to="/reminders/create"
          >
            New Reminder
          </Button>
        </Box>
        
        <Typography variant="body1" paragraph>
          Keep track of maintenance schedules, warranty expirations, and other important dates for your items.
        </Typography>
        
        <Divider sx={{ my: 3 }} />
        
        <Box sx={{ width: '100%' }}>
          <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
            <Tabs
              value={tabValue}
              onChange={handleTabChange}
              aria-label="reminder tabs"
            >
              <Tab label="Upcoming" />
              <Tab label="Completed" />
            </Tabs>
          </Box>
          
          {reminders.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <AlarmIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
              <Typography variant="body1" color="text.secondary">
                {tabValue === 0
                  ? "You don't have any upcoming reminders"
                  : "You don't have any completed reminders"}
              </Typography>
              {tabValue === 0 && (
                <Button
                  variant="outlined"
                  startIcon={<AddIcon />}
                  component={RouterLink}
                  to="/reminders/create"
                  sx={{ mt: 2 }}
                >
                  Create Your First Reminder
                </Button>
              )}
            </Box>
          ) : (
            <>
              <List>
                {reminders.map((reminder) => (
                  <ListItem
                    key={reminder._id}
                    component={Paper}
                    variant="outlined"
                    sx={{
                      mb: 2,
                      borderRadius: 2,
                      p: 2,
                      '&:hover': {
                        bgcolor: 'action.hover',
                      },
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', mr: 2 }}>
                      {reminder.isCompleted ? (
                        <CheckCircleIcon color="success" />
                      ) : (
                        getReminderTypeIcon(reminder.reminderType)
                      )}
                    </Box>
                    
                    <ListItemText
                      primary={
                        <Typography variant="subtitle1" component={RouterLink} to={`/reminders/${reminder._id}`} sx={{ textDecoration: 'none', color: 'inherit' }}>
                          {reminder.title}
                        </Typography>
                      }
                      secondary={
                        <Box sx={{ mt: 1 }}>
                          <Typography variant="body2" color="text.secondary">
                            Item: {reminder.item.name}
                          </Typography>
                          <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                            <Chip
                              label={formatReminderDate(reminder.reminderDate)}
                              size="small"
                              color={getChipColor(reminder.reminderDate, reminder.isCompleted)}
                              sx={{ mr: 1 }}
                            />
                            {reminder.isRecurring && (
                              <Chip
                                label={`Recurring (${reminder.recurringInterval})`}
                                size="small"
                                sx={{ mr: 1 }}
                              />
                            )}
                            <Chip
                              label={reminder.reminderType.charAt(0).toUpperCase() + reminder.reminderType.slice(1)}
                              size="small"
                              sx={{ mr: 1 }}
                            />
                          </Box>
                        </Box>
                      }
                    />
                    
                    <ListItemSecondaryAction>
                      <Tooltip title="Actions">
                        <IconButton
                          edge="end"
                          aria-label="actions"
                          onClick={(e) => handleMenuOpen(e, reminder)}
                        >
                          <MoreIcon />
                        </IconButton>
                      </Tooltip>
                    </ListItemSecondaryAction>
                  </ListItem>
                ))}
              </List>
              
              {totalPages > 1 && (
                <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
                  <Pagination
                    count={totalPages}
                    page={page}
                    onChange={handlePageChange}
                    color="primary"
                  />
                </Box>
              )}
            </>
          )}
        </Box>
      </Paper>
      
      {/* Actions Menu */}
      <Menu
        anchorEl={menuAnchorEl}
        open={Boolean(menuAnchorEl)}
        onClose={handleMenuClose}
      >
        {selectedReminder && !selectedReminder.isCompleted && (
          <MenuItem onClick={handleMarkComplete}>
            <CheckCircleIcon fontSize="small" sx={{ mr: 1 }} />
            Mark as Complete
          </MenuItem>
        )}
        <MenuItem
          component={RouterLink}
          to={selectedReminder ? `/reminders/edit/${selectedReminder._id}` : '#'}
          onClick={handleMenuClose}
        >
          <EditIcon fontSize="small" sx={{ mr: 1 }} />
          Edit
        </MenuItem>
        <MenuItem onClick={handleDeleteDialogOpen}>
          <DeleteIcon fontSize="small" sx={{ mr: 1 }} />
          Delete
        </MenuItem>
      </Menu>
      
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

export default Reminders;

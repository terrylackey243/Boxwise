import React, { useState, useEffect, useContext } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import axios from '../utils/axiosConfig';
import {
  Container,
  Grid,
  Paper,
  Typography,
  Box,
  Button,
  Card,
  CardContent,
  CardActions,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  ListItemIcon,
  Avatar,
  CircularProgress,
  Chip
} from '@mui/material';
import {
  Inventory as InventoryIcon,
  LocationOn as LocationIcon,
  Label as LabelIcon,
  Category as CategoryIcon,
  Add as AddIcon,
  Search as SearchIcon,
  Alarm as AlarmIcon,
  Build as BuildIcon,
  VerifiedUser as WarrantyIcon,
  Settings as ServiceIcon,
  Notifications as NotificationIcon
} from '@mui/icons-material';
import { AuthContext } from '../context/AuthContext';
import { AlertContext } from '../context/AlertContext';

const Dashboard = () => {
  const { user } = useContext(AuthContext);
  const { setErrorAlert } = useContext(AlertContext);
  
  const [stats, setStats] = useState({
    itemCount: 0,
    locationCount: 0,
    labelCount: 0,
    categoryCount: 0
  });
  
  const [recentItems, setRecentItems] = useState([]);
  const [upcomingReminders, setUpcomingReminders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        
        // Configure longer timeout for dashboard requests (30 seconds)
        const axiosOptions = {
          timeout: 30000 // 30 seconds
        };
        
        // Fetch dashboard data and upcoming reminders separately to handle partial failures
        try {
          const dashboardRes = await axios.get('/api/dashboard', axiosOptions);
          if (dashboardRes.data.success) {
            setStats(dashboardRes.data.data.stats);
            setRecentItems(dashboardRes.data.data.recentItems);
          }
        } catch (dashboardErr) {
          console.error('Dashboard stats error:', dashboardErr);
          setErrorAlert('Error loading dashboard stats. Some data may be unavailable.');
          // Set default stats
          setStats({
            itemCount: 0,
            locationCount: 0,
            labelCount: 0,
            categoryCount: 0
          });
          setRecentItems([]);
        }
        
        try {
          const remindersRes = await axios.get('/api/reminders/upcoming', axiosOptions);
          if (remindersRes.data.success) {
            setUpcomingReminders(remindersRes.data.data);
          }
        } catch (remindersErr) {
          console.error('Reminders error:', remindersErr);
          setErrorAlert('Error loading reminders. Some data may be unavailable.');
          setUpcomingReminders([]);
        }
        
        setLoading(false);
      } catch (err) {
        console.error('Dashboard error:', err);
        
        // Set empty data when API call fails
        setStats({
          itemCount: 0,
          locationCount: 0,
          labelCount: 0,
          categoryCount: 0
        });
        setRecentItems([]);
        setUpcomingReminders([]);
        
        setLoading(false);
        setErrorAlert('Error loading dashboard data: ' + (err.response?.data?.message || err.message));
      }
    };
    
    fetchDashboardData();
  }, [setErrorAlert]);

  // Format date to relative time (e.g., "2 days ago")
  const formatRelativeTime = (date) => {
    if (!date) return '';
    
    const now = new Date();
    const diffInSeconds = Math.floor((now - new Date(date)) / 1000);
    
    if (diffInSeconds < 60) {
      return 'just now';
    }
    
    const diffInMinutes = Math.floor(diffInSeconds / 60);
    if (diffInMinutes < 60) {
      return `${diffInMinutes} minute${diffInMinutes > 1 ? 's' : ''} ago`;
    }
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) {
      return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`;
    }
    
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 30) {
      return `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`;
    }
    
    const diffInMonths = Math.floor(diffInDays / 30);
    return `${diffInMonths} month${diffInMonths > 1 ? 's' : ''} ago`;
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
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      {/* Welcome Section */}
      <Paper
        sx={{
          p: 3,
          mb: 4,
          display: 'flex',
          flexDirection: { xs: 'column', sm: 'row' },
          alignItems: 'center',
          justifyContent: 'space-between',
          borderRadius: 2,
          background: 'linear-gradient(45deg, #6B46C1 30%, #9F7AEA 90%)',
          color: 'white',
        }}
      >
        <Box>
          <Typography variant="h4" component="h1" gutterBottom>
            Welcome, {user?.name || 'User'}!
          </Typography>
          <Typography variant="body1">
            Manage your inventory with ease. What would you like to do today?
          </Typography>
        </Box>
        <Box sx={{ mt: { xs: 2, sm: 0 }, display: 'flex', gap: 1 }}>
          <Button
            variant="contained"
            color="secondary"
            startIcon={<AddIcon />}
            component={RouterLink}
            to="/items/create"
            sx={{ color: 'white' }}
          >
            Add Item
          </Button>
          <Button
            variant="outlined"
            startIcon={<SearchIcon />}
            component={RouterLink}
            to="/items"
            sx={{ color: 'white', borderColor: 'white' }}
          >
            Search
          </Button>
        </Box>
      </Paper>

      {/* Stats Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={6} sm={3}>
          <Card sx={{ height: '100%', borderRadius: 2 }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <Avatar sx={{ bgcolor: 'primary.main', mr: 1 }}>
                  <InventoryIcon />
                </Avatar>
                <Typography variant="h6" component="div">
                  Items
                </Typography>
              </Box>
              <Typography variant="h3" component="div" sx={{ fontWeight: 'bold' }}>
                {stats.itemCount}
              </Typography>
            </CardContent>
            <CardActions>
              <Button size="small" component={RouterLink} to="/items">View All</Button>
            </CardActions>
          </Card>
        </Grid>
        
        <Grid item xs={6} sm={3}>
          <Card sx={{ height: '100%', borderRadius: 2 }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <Avatar sx={{ bgcolor: 'primary.main', mr: 1 }}>
                  <LocationIcon />
                </Avatar>
                <Typography variant="h6" component="div">
                  Locations
                </Typography>
              </Box>
              <Typography variant="h3" component="div" sx={{ fontWeight: 'bold' }}>
                {stats.locationCount}
              </Typography>
            </CardContent>
            <CardActions>
              <Button size="small" component={RouterLink} to="/locations">View All</Button>
            </CardActions>
          </Card>
        </Grid>
        
        <Grid item xs={6} sm={3}>
          <Card sx={{ height: '100%', borderRadius: 2 }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <Avatar sx={{ bgcolor: 'primary.main', mr: 1 }}>
                  <LabelIcon />
                </Avatar>
                <Typography variant="h6" component="div">
                  Labels
                </Typography>
              </Box>
              <Typography variant="h3" component="div" sx={{ fontWeight: 'bold' }}>
                {stats.labelCount}
              </Typography>
            </CardContent>
            <CardActions>
              <Button size="small" component={RouterLink} to="/labels">View All</Button>
            </CardActions>
          </Card>
        </Grid>
        
        <Grid item xs={6} sm={3}>
          <Card sx={{ height: '100%', borderRadius: 2 }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <Avatar sx={{ bgcolor: 'primary.main', mr: 1 }}>
                  <CategoryIcon />
                </Avatar>
                <Typography variant="h6" component="div">
                  Categories
                </Typography>
              </Box>
              <Typography variant="h3" component="div" sx={{ fontWeight: 'bold' }}>
                {stats.categoryCount}
              </Typography>
            </CardContent>
            <CardActions>
              <Button size="small" component={RouterLink} to="/categories">View All</Button>
            </CardActions>
          </Card>
        </Grid>
      </Grid>

      {/* Recent Items */}
      <Paper sx={{ p: 3, borderRadius: 2, mb: 4 }}>
        <Typography variant="h5" component="h2" gutterBottom>
          Recent Items
        </Typography>
        <Divider sx={{ mb: 2 }} />
        
        {recentItems.length > 0 ? (
          <List>
            {recentItems.map((item) => (
              <React.Fragment key={item._id}>
                <ListItem
                  alignItems="flex-start"
                  component={RouterLink}
                  to={`/items/${item._id}`}
                  sx={{
                    textDecoration: 'none',
                    color: 'inherit',
                    '&:hover': {
                      bgcolor: 'action.hover',
                      borderRadius: 1,
                    },
                  }}
                >
                  <ListItemAvatar>
                    <Avatar sx={{ bgcolor: 'primary.main' }}>
                      <InventoryIcon />
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary={item.name}
                    secondary={
                      <React.Fragment>
                        <Typography
                          sx={{ display: 'inline' }}
                          component="span"
                          variant="body2"
                          color="text.primary"
                        >
                          {item.location.name}
                        </Typography>
                        {` — ${item.category.name} — `}
                        {formatRelativeTime(item.updatedAt)}
                        <Box sx={{ mt: 1 }}>
                          {item.labels.map((label) => (
                            <Chip
                              key={label.name}
                              label={label.name}
                              size="small"
                              sx={{
                                mr: 0.5,
                                bgcolor: label.color,
                                color: 'white',
                              }}
                            />
                          ))}
                        </Box>
                      </React.Fragment>
                    }
                  />
                </ListItem>
                <Divider variant="inset" component="li" />
              </React.Fragment>
            ))}
          </List>
        ) : (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Typography variant="body1" color="text.secondary" gutterBottom>
              No items found
            </Typography>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              component={RouterLink}
              to="/items/create"
              sx={{ mt: 2 }}
            >
              Add Your First Item
            </Button>
          </Box>
        )}
        
        {recentItems.length > 0 && (
          <Box sx={{ mt: 2, textAlign: 'center' }}>
            <Button
              variant="outlined"
              component={RouterLink}
              to="/items"
            >
              View All Items
            </Button>
          </Box>
        )}
      </Paper>
      
      {/* Upcoming Reminders */}
      <Paper sx={{ p: 3, borderRadius: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h5" component="h2">
            Upcoming Reminders
          </Typography>
          <Button
            variant="outlined"
            startIcon={<AlarmIcon />}
            component={RouterLink}
            to="/reminders"
            size="small"
          >
            View All
          </Button>
        </Box>
        <Divider sx={{ mb: 2 }} />
        
        {upcomingReminders.length > 0 ? (
          <List>
            {upcomingReminders.map((reminder) => (
              <React.Fragment key={reminder._id}>
                <ListItem
                  alignItems="flex-start"
                  component={RouterLink}
                  to={`/reminders/${reminder._id}`}
                  sx={{
                    textDecoration: 'none',
                    color: 'inherit',
                    '&:hover': {
                      bgcolor: 'action.hover',
                      borderRadius: 1,
                    },
                  }}
                >
                  <ListItemIcon>
                    {reminder.reminderType === 'maintenance' ? (
                      <BuildIcon color="primary" />
                    ) : reminder.reminderType === 'warranty' ? (
                      <WarrantyIcon color="secondary" />
                    ) : reminder.reminderType === 'service' ? (
                      <ServiceIcon color="info" />
                    ) : (
                      <AlarmIcon color="warning" />
                    )}
                  </ListItemIcon>
                  <ListItemText
                    primary={reminder.title}
                    secondary={
                      <React.Fragment>
                        <Typography
                          sx={{ display: 'inline' }}
                          component="span"
                          variant="body2"
                          color="text.primary"
                        >
                          {reminder.item.name}
                        </Typography>
                        {` — Due: ${new Date(reminder.reminderDate).toLocaleDateString()}`}
                        {reminder.isRecurring && ' (Recurring)'}
                      </React.Fragment>
                    }
                  />
                  <Chip
                    label={reminder.reminderType.charAt(0).toUpperCase() + reminder.reminderType.slice(1)}
                    size="small"
                    color={
                      reminder.reminderType === 'maintenance' ? 'primary' :
                      reminder.reminderType === 'warranty' ? 'secondary' :
                      reminder.reminderType === 'service' ? 'info' : 'warning'
                    }
                    sx={{ ml: 1 }}
                  />
                </ListItem>
                <Divider variant="inset" component="li" />
              </React.Fragment>
            ))}
          </List>
        ) : (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <NotificationIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
            <Typography variant="body1" color="text.secondary" gutterBottom>
              No upcoming reminders
            </Typography>
            <Button
              variant="contained"
              startIcon={<AlarmIcon />}
              component={RouterLink}
              to="/reminders/create"
              sx={{ mt: 2 }}
            >
              Create Reminder
            </Button>
          </Box>
        )}
      </Paper>
    </Container>
  );
};

export default Dashboard;

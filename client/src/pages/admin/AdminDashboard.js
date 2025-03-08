import React, { useState, useEffect, useContext } from 'react';
import { Link as RouterLink, Navigate } from 'react-router-dom';
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
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  ListItemSecondaryAction,
  Avatar,
  IconButton,
  Chip,
  Card,
  CardContent,
  Tabs,
  Tab,
  TextField,
  InputAdornment,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Alert
} from '@mui/material';
import {
  Person as PersonIcon,
  Group as GroupIcon,
  Category as CategoryIcon,
  Label as LabelIcon,
  LocationOn as LocationIcon,
  Inventory as InventoryIcon,
  Search as SearchIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Add as AddIcon,
  Email as EmailIcon,
  AdminPanelSettings as AdminIcon,
  SupervisorAccount as OwnerIcon,
  Person as UserIcon,
  CheckCircle as ActiveIcon,
  Cancel as InactiveIcon
} from '@mui/icons-material';
import { AuthContext } from '../../context/AuthContext';
import { AlertContext } from '../../context/AlertContext';

// Chart components
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  PointElement,
  LineElement
} from 'chart.js';
import { Bar, Pie, Line } from 'react-chartjs-2';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  PointElement,
  LineElement
);

const AdminDashboard = () => {
  const { user, isAuthenticated, loading } = useContext(AuthContext);
  const { setSuccessAlert, setErrorAlert } = useContext(AlertContext);
  
  const [tabValue, setTabValue] = useState(0);
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [stats, setStats] = useState(null);
  const [loadingData, setLoadingData] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  
  // Check if user is admin or owner
  const isAdminOrOwner = user && (user.role === 'admin' || user.role === 'owner');
  
  useEffect(() => {
    // Only fetch data if user is authenticated and is admin or owner
    if (isAuthenticated && isAdminOrOwner) {
      fetchData();
    }
  }, [isAuthenticated, isAdminOrOwner]);
  
  useEffect(() => {
    // Filter users based on search term
    if (users.length > 0 && searchTerm) {
      const filtered = users.filter(user => 
        user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.role.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredUsers(filtered);
    } else {
      setFilteredUsers(users);
    }
  }, [users, searchTerm]);
  
  const fetchData = async () => {
    setLoadingData(true);
    
    try {
      // Fetch users from the API
      const usersResponse = await axios.get('/api/users');
      
      // Fetch admin stats from the API
      const statsResponse = await axios.get('/api/admin/stats');
      
      if (usersResponse.data.success && statsResponse.data.success) {
        setUsers(usersResponse.data.data);
        setFilteredUsers(usersResponse.data.data);
        setStats(statsResponse.data.data);
      } else {
        setErrorAlert('Error loading admin data');
      }
      
      setLoadingData(false);
    } catch (err) {
      setErrorAlert('Error loading admin data');
      setLoadingData(false);
      console.error(err);
    }
  };
  
  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };
  
  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
  };
  
  const handleDeleteClick = (user) => {
    setSelectedUser(user);
    setDeleteDialogOpen(true);
  };
  
  const handleDeleteConfirm = async () => {
    if (!selectedUser) return;
    
    try {
      // Make API call to delete the user
      const response = await axios.delete(`/api/users/${selectedUser._id}`);
      
      if (response.data.success) {
        // Refresh data after successful deletion
        fetchData();
        setSuccessAlert(`${selectedUser.name} deleted successfully`);
      } else {
        setErrorAlert('Error deleting user: ' + response.data.message);
      }
      
      setDeleteDialogOpen(false);
      setSelectedUser(null);
    } catch (err) {
      setErrorAlert('Error deleting user: ' + (err.response?.data?.message || err.message));
      console.error(err);
      setDeleteDialogOpen(false);
      setSelectedUser(null);
    }
  };
  
  const handleDeleteCancel = () => {
    setDeleteDialogOpen(false);
    setSelectedUser(null);
  };
  
  // If user is not authenticated or loading, show loading spinner
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
  
  // If user is not admin or owner, redirect to dashboard
  if (!isAdminOrOwner) {
    return <Navigate to="/dashboard" />;
  }
  
  // Prepare chart data
  const userRoleChartData = {
    labels: ['Owner', 'Admin', 'User'],
    datasets: [
      {
        label: 'Users by Role',
        data: stats ? [stats.usersByRole.owner, stats.usersByRole.admin, stats.usersByRole.user] : [0, 0, 0],
        backgroundColor: [
          'rgba(255, 99, 132, 0.6)',
          'rgba(54, 162, 235, 0.6)',
          'rgba(75, 192, 192, 0.6)'
        ],
        borderColor: [
          'rgba(255, 99, 132, 1)',
          'rgba(54, 162, 235, 1)',
          'rgba(75, 192, 192, 1)'
        ],
        borderWidth: 1,
      },
    ],
  };
  
  const userPlanChartData = {
    labels: ['Free', 'Pro', 'Business'],
    datasets: [
      {
        label: 'Users by Plan',
        data: stats ? [stats.usersByPlan.free, stats.usersByPlan.pro, stats.usersByPlan.business] : [0, 0, 0],
        backgroundColor: [
          'rgba(255, 206, 86, 0.6)',
          'rgba(153, 102, 255, 0.6)',
          'rgba(255, 159, 64, 0.6)'
        ],
        borderColor: [
          'rgba(255, 206, 86, 1)',
          'rgba(153, 102, 255, 1)',
          'rgba(255, 159, 64, 1)'
        ],
        borderWidth: 1,
      },
    ],
  };
  
  const itemsByCategoryChartData = {
    labels: stats ? Object.keys(stats.itemsByCategory) : [],
    datasets: [
      {
        label: 'Items by Category',
        data: stats ? Object.values(stats.itemsByCategory) : [],
        backgroundColor: 'rgba(75, 192, 192, 0.6)',
        borderColor: 'rgba(75, 192, 192, 1)',
        borderWidth: 1,
      },
    ],
  };
  
  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Admin Dashboard
        </Typography>
        <Typography variant="subtitle1" color="text.secondary">
          Manage users, view statistics, and monitor system activity
        </Typography>
      </Box>
      
      <Tabs
        value={tabValue}
        onChange={handleTabChange}
        indicatorColor="primary"
        textColor="primary"
        variant="fullWidth"
        sx={{ mb: 3 }}
      >
        <Tab label="Overview" />
        <Tab label="Users" />
        <Tab label="Activity" />
        <Tab 
          label="Database" 
          component={RouterLink} 
          to="/admin/database" 
          onClick={(e) => e.stopPropagation()} 
        />
        <Tab 
          label="System" 
          component={RouterLink} 
          to="/admin/system" 
          onClick={(e) => e.stopPropagation()} 
        />
      </Tabs>
      
      {/* Overview Tab */}
      {tabValue === 0 && (
        <div>
          {loadingData ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
              <CircularProgress />
            </Box>
          ) : (
            <>
              {/* Stats Cards */}
              <Grid container spacing={3} sx={{ mb: 4 }}>
                <Grid item xs={12} sm={6} md={4}>
                  <Paper sx={{ p: 2, display: 'flex', flexDirection: 'column', height: 180 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                      <PersonIcon color="primary" sx={{ mr: 1 }} />
                      <Typography variant="h6" component="div">
                        Users
                      </Typography>
                    </Box>
                    <Typography variant="h3" component="div" sx={{ fontWeight: 'bold', mb: 1 }}>
                      {stats?.totalUsers || 0}
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <Chip 
                        size="small" 
                        label={`${stats?.usersByRole.admin || 0} Admins`} 
                        color="primary" 
                        variant="outlined" 
                      />
                      <Chip 
                        size="small" 
                        label={`${stats?.usersByRole.user || 0} Users`} 
                        color="secondary" 
                        variant="outlined" 
                      />
                    </Box>
                  </Paper>
                </Grid>
                
                <Grid item xs={12} sm={6} md={4}>
                  <Paper sx={{ p: 2, display: 'flex', flexDirection: 'column', height: 180 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                      <InventoryIcon color="primary" sx={{ mr: 1 }} />
                      <Typography variant="h6" component="div">
                        Items
                      </Typography>
                    </Box>
                    <Typography variant="h3" component="div" sx={{ fontWeight: 'bold', mb: 1 }}>
                      {stats?.totalItems || 0}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Across {stats?.totalCategories || 0} categories
                    </Typography>
                  </Paper>
                </Grid>
                
                <Grid item xs={12} sm={6} md={4}>
                  <Paper sx={{ p: 2, display: 'flex', flexDirection: 'column', height: 180 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                      <LocationIcon color="primary" sx={{ mr: 1 }} />
                      <Typography variant="h6" component="div">
                        Locations
                      </Typography>
                    </Box>
                    <Typography variant="h3" component="div" sx={{ fontWeight: 'bold', mb: 1 }}>
                      {stats?.totalLocations || 0}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      With {stats?.totalLabels || 0} custom labels
                    </Typography>
                  </Paper>
                </Grid>
              </Grid>
              
              {/* Mobile App Card */}
              <Paper sx={{ p: 3, mb: 4 }}>
                <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                  <Box>
                    <Typography variant="h6" gutterBottom>
                      Mobile Application Now Available
                    </Typography>
                    <Typography variant="body1" paragraph>
                      The Boxwise mobile app is now available for iOS and Android devices. Users can scan UPC codes, take photos of items, check inventory while shopping, and add items on the go.
                    </Typography>
                    <Grid container spacing={2} sx={{ mt: 1 }}>
                      <Grid item>
                        <Button 
                          variant="contained" 
                          color="primary"
                          href="https://apps.apple.com/app/boxwise-inventory"
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          Download for iOS
                        </Button>
                      </Grid>
                      <Grid item>
                        <Button 
                          variant="contained" 
                          color="primary"
                          href="https://play.google.com/store/apps/details?id=com.boxwise.inventory"
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          Download for Android
                        </Button>
                      </Grid>
                    </Grid>
                  </Box>
                  <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', ml: 2 }}>
                    <Box 
                      sx={{ 
                        width: 120, 
                        height: 120, 
                        border: '1px solid #eee',
                        borderRadius: 1,
                        mb: 1,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        bgcolor: '#f5f5f5'
                      }}
                    >
                      <Typography variant="caption" align="center" sx={{ p: 1 }}>
                        QR Code<br />Coming Soon
                      </Typography>
                    </Box>
                    <Typography variant="caption" align="center">
                      Use download links
                    </Typography>
                  </Box>
                </Box>
                <Box sx={{ mt: 2 }}>
                  <Typography variant="subtitle1" gutterBottom>
                    Key Features:
                  </Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={6} md={3}>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <Box sx={{ 
                          bgcolor: 'primary.light', 
                          color: 'white', 
                          borderRadius: '50%',
                          width: 36,
                          height: 36,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          mr: 1
                        }}>
                          1
                        </Box>
                        <Typography variant="body2">
                          Scan UPC codes with camera
                        </Typography>
                      </Box>
                    </Grid>
                    <Grid item xs={12} sm={6} md={3}>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <Box sx={{ 
                          bgcolor: 'primary.light', 
                          color: 'white', 
                          borderRadius: '50%',
                          width: 36,
                          height: 36,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          mr: 1
                        }}>
                          2
                        </Box>
                        <Typography variant="body2">
                          Take photos and upload instantly
                        </Typography>
                      </Box>
                    </Grid>
                    <Grid item xs={12} sm={6} md={3}>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <Box sx={{ 
                          bgcolor: 'primary.light', 
                          color: 'white', 
                          borderRadius: '50%',
                          width: 36,
                          height: 36,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          mr: 1
                        }}>
                          3
                        </Box>
                        <Typography variant="body2">
                          Check inventory while shopping
                        </Typography>
                      </Box>
                    </Grid>
                    <Grid item xs={12} sm={6} md={3}>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <Box sx={{ 
                          bgcolor: 'primary.light', 
                          color: 'white', 
                          borderRadius: '50%',
                          width: 36,
                          height: 36,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          mr: 1
                        }}>
                          4
                        </Box>
                        <Typography variant="body2">
                          Add items right when purchased
                        </Typography>
                      </Box>
                    </Grid>
                  </Grid>
                </Box>
              </Paper>
              
              {/* Charts */}
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <Paper sx={{ p: 3 }}>
                    <Typography variant="h6" gutterBottom>
                      Users by Role
                    </Typography>
                    <Box sx={{ height: 300 }}>
                      <Pie data={userRoleChartData} options={{ maintainAspectRatio: false }} />
                    </Box>
                  </Paper>
                </Grid>
                
                <Grid item xs={12} md={6}>
                  <Paper sx={{ p: 3 }}>
                    <Typography variant="h6" gutterBottom>
                      Users by Subscription Plan
                    </Typography>
                    <Box sx={{ height: 300 }}>
                      <Pie data={userPlanChartData} options={{ maintainAspectRatio: false }} />
                    </Box>
                  </Paper>
                </Grid>
                
                <Grid item xs={12}>
                  <Paper sx={{ p: 3 }}>
                    <Typography variant="h6" gutterBottom>
                      Items by Category
                    </Typography>
                    <Box sx={{ height: 300 }}>
                      <Bar 
                        data={itemsByCategoryChartData} 
                        options={{ 
                          maintainAspectRatio: false,
                          scales: {
                            y: {
                              beginAtZero: true
                            }
                          }
                        }} 
                      />
                    </Box>
                  </Paper>
                </Grid>
              </Grid>
            </>
          )}
        </div>
      )}
      
      {/* Users Tab */}
      {tabValue === 1 && (
        <div>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <TextField
              placeholder="Search users..."
              value={searchTerm}
              onChange={handleSearchChange}
              variant="outlined"
              size="small"
              sx={{ width: 300 }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                )
              }}
            />
            
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              component={RouterLink}
              to="/admin/users/create"
            >
              Add User
            </Button>
          </Box>
          
          {loadingData ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
              <CircularProgress />
            </Box>
          ) : (
            <Paper>
              <List>
                {filteredUsers.length === 0 ? (
                  <ListItem>
                    <ListItemText
                      primary="No users found"
                      secondary="Try adjusting your search criteria"
                    />
                  </ListItem>
                ) : (
                  filteredUsers.map((user) => (
                    <React.Fragment key={user._id}>
                      <ListItem>
                        <ListItemAvatar>
                          <Avatar>
                            {user.role === 'owner' ? (
                              <OwnerIcon />
                            ) : user.role === 'admin' ? (
                              <AdminIcon />
                            ) : (
                              <UserIcon />
                            )}
                          </Avatar>
                        </ListItemAvatar>
                        
                        <ListItemText
                          primary={
                            <Typography variant="body1" component="div">
                              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                {user.name}
                                <Chip
                                  size="small"
                                  label={user.role.toUpperCase()}
                                  color={
                                    user.role === 'owner'
                                      ? 'error'
                                      : user.role === 'admin'
                                      ? 'primary'
                                      : 'default'
                                  }
                                  sx={{ ml: 1 }}
                                />
                                {/* Get subscription info from the API */}
                                {(() => {
                                  // Find the subscription for this user's group
                                  const subscription = stats?.subscriptions?.find(sub => 
                                    sub.group.toString() === user.group.toString()
                                  );
                                  
                                  if (subscription) {
                                    return (
                                      <>
                                        <Chip
                                          size="small"
                                          label={subscription.plan.toUpperCase()}
                                          color={
                                            subscription.plan === 'business'
                                              ? 'success'
                                              : subscription.plan === 'pro'
                                              ? 'info'
                                              : 'default'
                                          }
                                          sx={{ ml: 1 }}
                                        />
                                        <Chip
                                          size="small"
                                          icon={subscription.status === 'active' ? <ActiveIcon /> : <InactiveIcon />}
                                          label={subscription.status.toUpperCase()}
                                          color={subscription.status === 'active' ? 'success' : 'error'}
                                          variant="outlined"
                                          sx={{ ml: 1 }}
                                        />
                                      </>
                                    );
                                  }
                                  return null;
                                })()}
                              </Box>
                            </Typography>
                          }
                          secondary={
                            <Typography variant="body2" component="div">
                              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                <EmailIcon fontSize="small" sx={{ mr: 0.5, fontSize: 16 }} />
                                {user.email}
                                <Box component="span" sx={{ mx: 1 }}>•</Box>
                                Joined {new Date(user.createdAt).toLocaleDateString()}
                              </Box>
                            </Typography>
                          }
                        />
                        
                        <ListItemSecondaryAction>
                          <IconButton
                            edge="end"
                            aria-label="edit"
                            component={RouterLink}
                            to={`/admin/users/edit/${user._id}`}
                            sx={{ mr: 1 }}
                          >
                            <EditIcon />
                          </IconButton>
                          
                          {/* Don't allow deleting the owner or yourself */}
                          {user.role !== 'owner' && user._id !== '1' && (
                            <IconButton
                              edge="end"
                              aria-label="delete"
                              onClick={() => handleDeleteClick(user)}
                            >
                              <DeleteIcon />
                            </IconButton>
                          )}
                        </ListItemSecondaryAction>
                      </ListItem>
                      <Divider variant="inset" component="li" />
                    </React.Fragment>
                  ))
                )}
              </List>
            </Paper>
          )}
          
          {/* Delete Confirmation Dialog */}
          <Dialog
            open={deleteDialogOpen}
            onClose={handleDeleteCancel}
          >
            <DialogTitle>Delete User</DialogTitle>
            <DialogContent>
              <DialogContentText>
                Are you sure you want to delete {selectedUser?.name}? This action cannot be undone.
              </DialogContentText>
              <Alert severity="warning" sx={{ mt: 2 }}>
                All data associated with this user will be permanently deleted.
              </Alert>
            </DialogContent>
            <DialogActions>
              <Button onClick={handleDeleteCancel}>Cancel</Button>
              <Button onClick={handleDeleteConfirm} color="error">Delete</Button>
            </DialogActions>
          </Dialog>
        </div>
      )}
      
      {/* Activity Tab */}
      {tabValue === 2 && (
        <div>
          {loadingData ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
              <CircularProgress />
            </Box>
          ) : (
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Recent Activity
              </Typography>
              
              <List>
                {stats?.recentActivity.map((activity, index) => (
                  <React.Fragment key={index}>
                    <ListItem>
                      <ListItemText
                        primary={
                          <Typography variant="body1" component="div">
                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                              <Typography variant="subtitle1" component="span">
                                {activity.user}
                              </Typography>
                              <Typography variant="body2" component="span" sx={{ mx: 1 }}>
                                {activity.type === 'item_created'
                                  ? 'created item'
                                  : activity.type === 'item_updated'
                                  ? 'updated item'
                                  : activity.type === 'location_created'
                                  ? 'created location'
                                  : activity.type === 'label_created'
                                  ? 'created label'
                                  : 'created category'}
                              </Typography>
                              <Typography variant="subtitle1" component="span">
                                {activity.item}
                              </Typography>
                            </Box>
                          </Typography>
                        }
                        secondary={
                          <Typography variant="body2" component="div" color="text.secondary">
                            {new Date(activity.date).toLocaleString()}
                          </Typography>
                        }
                      />
                    </ListItem>
                    {index < stats.recentActivity.length - 1 && (
                      <Divider component="li" />
                    )}
                  </React.Fragment>
                ))}
              </List>
            </Paper>
          )}
        </div>
      )}
    </Container>
  );
};

export default AdminDashboard;

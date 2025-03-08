import React, { useContext } from 'react';
import { Link as RouterLink } from 'react-router-dom';
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
  Avatar,
} from '@mui/material';
import {
  Inventory as InventoryIcon,
  LocationOn as LocationIcon,
  Label as LabelIcon,
  Category as CategoryIcon,
  Add as AddIcon,
  Search as SearchIcon,
  Alarm as AlarmIcon,
  Settings as SettingsIcon,
  Info as InfoIcon,
  Dashboard as DashboardIcon,
} from '@mui/icons-material';
import { AuthContext } from '../context/AuthContext';

// Simplified Dashboard component that doesn't rely on API calls
const Dashboard = () => {
  const { user } = useContext(AuthContext);

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

      {/* Quick Access Cards */}
      <Typography variant="h5" component="h2" gutterBottom>
        Quick Access
      </Typography>
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
              <Typography variant="body2" color="text.secondary">
                Manage your inventory items
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
              <Typography variant="body2" color="text.secondary">
                Organize items by location
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
              <Typography variant="body2" color="text.secondary">
                Categorize with custom labels
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
              <Typography variant="body2" color="text.secondary">
                Manage item categories
              </Typography>
            </CardContent>
            <CardActions>
              <Button size="small" component={RouterLink} to="/categories">View All</Button>
            </CardActions>
          </Card>
        </Grid>
      </Grid>

      {/* Tools Section */}
      <Paper sx={{ p: 3, borderRadius: 2, mb: 4 }}>
        <Typography variant="h5" component="h2" gutterBottom>
          Tools
        </Typography>
        <Divider sx={{ mb: 2 }} />
        
        <Grid container spacing={3}>
          <Grid item xs={12} sm={6} md={4}>
            <Card sx={{ height: '100%', borderRadius: 2 }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <Avatar sx={{ bgcolor: 'secondary.main', mr: 1 }}>
                    <AlarmIcon />
                  </Avatar>
                  <Typography variant="h6" component="div">
                    Reminders
                  </Typography>
                </Box>
                <Typography variant="body2" color="text.secondary">
                  Set up maintenance and warranty reminders for your items
                </Typography>
              </CardContent>
              <CardActions>
                <Button size="small" component={RouterLink} to="/reminders">Manage Reminders</Button>
              </CardActions>
            </Card>
          </Grid>
          
          <Grid item xs={12} sm={6} md={4}>
            <Card sx={{ height: '100%', borderRadius: 2 }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <Avatar sx={{ bgcolor: 'secondary.main', mr: 1 }}>
                    <DashboardIcon />
                  </Avatar>
                  <Typography variant="h6" component="div">
                    Reports
                  </Typography>
                </Box>
                <Typography variant="body2" color="text.secondary">
                  Generate reports and analytics about your inventory
                </Typography>
              </CardContent>
              <CardActions>
                <Button size="small" component={RouterLink} to="/reports">View Reports</Button>
              </CardActions>
            </Card>
          </Grid>
          
          <Grid item xs={12} sm={6} md={4}>
            <Card sx={{ height: '100%', borderRadius: 2 }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <Avatar sx={{ bgcolor: 'secondary.main', mr: 1 }}>
                    <SettingsIcon />
                  </Avatar>
                  <Typography variant="h6" component="div">
                    Settings
                  </Typography>
                </Box>
                <Typography variant="body2" color="text.secondary">
                  Customize your account and application preferences
                </Typography>
              </CardContent>
              <CardActions>
                <Button size="small" component={RouterLink} to="/profile">Profile Settings</Button>
              </CardActions>
            </Card>
          </Grid>
        </Grid>
      </Paper>
      
      {/* Getting Started */}
      <Paper sx={{ p: 3, borderRadius: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <InfoIcon sx={{ mr: 1, color: 'info.main' }} />
          <Typography variant="h5" component="h2">
            Getting Started
          </Typography>
        </Box>
        <Divider sx={{ mb: 2 }} />
        
        <Typography variant="body1" paragraph>
          Welcome to Boxwise, your complete inventory management solution. Here are some quick steps to get started:
        </Typography>
        
        <Grid container spacing={2} sx={{ mb: 2 }}>
          <Grid item xs={12} md={4}>
            <Box sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
              <Typography variant="h6" gutterBottom>1. Add Locations</Typography>
              <Typography variant="body2" color="text.secondary" paragraph>
                Create locations to organize where your items are stored.
              </Typography>
              <Button variant="outlined" size="small" component={RouterLink} to="/locations/create">
                Add Location
              </Button>
            </Box>
          </Grid>
          
          <Grid item xs={12} md={4}>
            <Box sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
              <Typography variant="h6" gutterBottom>2. Create Categories</Typography>
              <Typography variant="body2" color="text.secondary" paragraph>
                Set up categories to classify your items by type.
              </Typography>
              <Button variant="outlined" size="small" component={RouterLink} to="/categories/create">
                Add Category
              </Button>
            </Box>
          </Grid>
          
          <Grid item xs={12} md={4}>
            <Box sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
              <Typography variant="h6" gutterBottom>3. Add Items</Typography>
              <Typography variant="body2" color="text.secondary" paragraph>
                Start adding your items to your inventory.
              </Typography>
              <Button variant="outlined" size="small" component={RouterLink} to="/items/create">
                Add Item
              </Button>
            </Box>
          </Grid>
        </Grid>
        
        <Box sx={{ textAlign: 'center', mt: 3 }}>
          <Button 
            variant="contained" 
            color="primary"
            component={RouterLink}
            to="/items"
            startIcon={<InventoryIcon />}
          >
            Go to Inventory
          </Button>
        </Box>
      </Paper>
    </Container>
  );
};

export default Dashboard;

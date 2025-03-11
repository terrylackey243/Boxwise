import React, { useState, useEffect, useContext, useCallback } from 'react';
import axios from '../../utils/axiosConfig';
import { useParams, useNavigate, Link as RouterLink } from 'react-router-dom';
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
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableRow,
  Breadcrumbs,
  Link,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Collapse,
  Card,
  CardContent,
  CardActions,
  Tooltip,
  Tab,
  Tabs
} from '@mui/material';
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  Add as AddIcon,
  ArrowBack as ArrowBackIcon,
  Folder as FolderIcon,
  FolderOpen as FolderOpenIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Inventory as InventoryIcon,
  MoreVert as MoreVertIcon,
  NavigateNext as NavigateNextIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';
import { AlertContext } from '../../context/AlertContext';

const LocationDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { setSuccessAlert, setErrorAlert } = useContext(AlertContext);
  
  const [loading, setLoading] = useState(true);
  const [locationData, setLocationData] = useState(null);
  const [locationHierarchy, setLocationHierarchy] = useState([]);
  const [childLocations, setChildLocations] = useState([]);
  const [items, setItems] = useState([]);
  const [tabValue, setTabValue] = useState(0);
  const [expandedLocations, setExpandedLocations] = useState({});
  const [lastRefreshed, setLastRefreshed] = useState(Date.now());
  
  // Memoize fetchLocationData to use it as a dependency in useEffect
  const fetchLocationData = useCallback(async () => {
    try {
      setLoading(true);
      
      // Make API call to fetch the location
      const response = await axios.get(`/api/locations/${id}`);
      
      if (response.data.success) {
        setLocationData(response.data.data);
        
        // Get child locations
        if (response.data.data.children) {
          const childrenWithCounts = await Promise.all(
            response.data.data.children.map(async (child) => {
              // Fetch item count for each child location
              const itemsResponse = await axios.get(`/api/items?location=${child._id}&limit=1&page=1`);
              
              // Add itemCount property to child location
              return {
                ...child,
                itemCount: itemsResponse.data.total || 0
              };
            })
          );
          
          setChildLocations(childrenWithCounts);
        }
        
        // Get all locations to build the hierarchy
        const locationsResponse = await axios.get('/api/locations?flat=true');
        
        if (locationsResponse.data.success) {
          const allLocations = locationsResponse.data.data;
          const locationMap = {};
          
          // Create a map of all locations by ID
          allLocations.forEach(loc => {
            locationMap[loc._id] = loc;
          });
          
          // Build the hierarchy starting from the current location
          const currentLocation = response.data.data;
          const hierarchyLocations = [];
          
          // Add the current location
          hierarchyLocations.push(currentLocation);
          
          // Add all parent locations by traversing up the tree
          let parentId = currentLocation.parent;
          while (parentId) {
            const parentLocation = locationMap[parentId];
            if (parentLocation) {
              hierarchyLocations.unshift(parentLocation); // Add to the beginning
              parentId = parentLocation.parent;
            } else {
              break;
            }
          }
          
          setLocationHierarchy(hierarchyLocations);
        }
        
        // Fetch items in this location with a higher limit to ensure all items are shown
        const itemsResponse = await axios.get(`/api/items?location=${id}&limit=100&page=1`);
        
        if (itemsResponse.data.success) {
          setItems(itemsResponse.data.data || []);
        }
      } else {
        setErrorAlert('Error loading location: ' + response.data.message);
      }
      
      setLoading(false);
      setLastRefreshed(Date.now());
    } catch (err) {
      setErrorAlert('Error loading location data');
      setLoading(false);
      console.error(err);
    }
  }, [id, setErrorAlert]);
  
  // Load data when component mounts or the location ID changes
  useEffect(() => {
    fetchLocationData();
  }, [fetchLocationData]);

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  const handleRefresh = () => {
    fetchLocationData();
  };

  const handleToggleExpand = (locationId) => {
    setExpandedLocations(prev => ({
      ...prev,
      [locationId]: !prev[locationId]
    }));
  };

  // Recursive function to render location tree
  const renderLocationTree = (locationArray, level = 0) => {
    return locationArray.map(location => {
      const hasChildren = location.children && location.children.length > 0;
      const isExpanded = expandedLocations[location._id];
      
      return (
        <React.Fragment key={location._id}>
          <ListItem
            sx={{
              pl: level * 3,
              borderLeft: level > 0 ? '1px dashed rgba(0, 0, 0, 0.1)' : 'none',
              ml: level > 0 ? 2 : 0
            }}
            secondaryAction={
              <IconButton
                edge="end"
                aria-label="more options"
                component={RouterLink}
                to={`/locations/${location._id}`}
              >
                <NavigateNextIcon />
              </IconButton>
            }
          >
            <ListItemIcon onClick={() => hasChildren && handleToggleExpand(location._id)} sx={{ cursor: hasChildren ? 'pointer' : 'default' }}>
              {hasChildren ? (
                isExpanded ? <FolderOpenIcon color="primary" /> : <FolderIcon color="primary" />
              ) : (
                <FolderIcon color="primary" />
              )}
            </ListItemIcon>
            
            <ListItemText
              primary={
                <Box component="span" sx={{ fontWeight: 'medium' }}>
                  {location.name}
                  <Typography component="span" variant="body2" color="text.secondary" sx={{ ml: 1 }}>
                    ({location.itemCount || 0} items)
                  </Typography>
                </Box>
              }
              secondary={location.description}
              onClick={() => hasChildren && handleToggleExpand(location._id)}
              sx={{ cursor: hasChildren ? 'pointer' : 'default' }}
            />
            
            {hasChildren && (
              <IconButton size="small" onClick={() => handleToggleExpand(location._id)}>
                {isExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
              </IconButton>
            )}
          </ListItem>
          
          {hasChildren && (
            <Collapse in={isExpanded} timeout="auto" unmountOnExit>
              {renderLocationTree(location.children, level + 1)}
            </Collapse>
          )}
        </React.Fragment>
      );
    });
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

  if (!locationData) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant="h5" color="text.secondary">
            Location not found
          </Typography>
          <Button
            variant="contained"
            component={RouterLink}
            to="/locations"
            sx={{ mt: 2 }}
          >
            Back to Locations
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
        <Link component={RouterLink} to="/locations" underline="hover" color="inherit">
          Locations
        </Link>
        {locationHierarchy.length > 0 && locationHierarchy.slice(0, -1).map((loc) => (
          <Link key={loc._id} component={RouterLink} to={`/locations/${loc._id}`} underline="hover" color="inherit">
            {loc.name}
          </Link>
        ))}
        <Typography color="text.primary">{locationData.name}</Typography>
      </Breadcrumbs>
      
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <Button
            component={RouterLink}
            to="/locations"
            startIcon={<ArrowBackIcon />}
            sx={{ mr: 2 }}
          >
            Back
          </Button>
          
          <Typography variant="h4" component="h1">
            {locationData.name}
          </Typography>
        </Box>
        
        <Box>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={handleRefresh}
            sx={{ mr: 1 }}
          >
            Refresh
          </Button>
          <Button
            variant="outlined"
            startIcon={<EditIcon />}
            component={RouterLink}
            to={`/locations/edit/${locationData._id}`}
            sx={{ mr: 1 }}
          >
            Edit
          </Button>
          
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            component={RouterLink}
            to={`/locations/create?parent=${locationData._id}`}
          >
            Add Sub-location
          </Button>
        </Box>
      </Box>
      
      {/* Location Details */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Location Details
        </Typography>
        
        <TableContainer>
          <Table size="small">
            <TableBody>
              <TableRow>
                <TableCell component="th" scope="row" sx={{ width: '30%', fontWeight: 'bold' }}>
                  Name
                </TableCell>
                <TableCell>{locationData.name}</TableCell>
              </TableRow>
              
              {locationData.description && (
                <TableRow>
                  <TableCell component="th" scope="row" sx={{ fontWeight: 'bold' }}>
                    Description
                  </TableCell>
                  <TableCell>{locationData.description}</TableCell>
                </TableRow>
              )}
              
              <TableRow>
                <TableCell component="th" scope="row" sx={{ fontWeight: 'bold' }}>
                  Full Path
                </TableCell>
                <TableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap' }}>
                    {locationHierarchy.map((loc, index) => (
                      <React.Fragment key={loc._id}>
                        <Link component={RouterLink} to={`/locations/${loc._id}`}>
                          {loc.name}
                        </Link>
                        {index < locationHierarchy.length - 1 && (
                          <NavigateNextIcon fontSize="small" sx={{ mx: 0.5 }} />
                        )}
                      </React.Fragment>
                    ))}
                  </Box>
                </TableCell>
              </TableRow>
              
              <TableRow>
                <TableCell component="th" scope="row" sx={{ fontWeight: 'bold' }}>
                  Item Count
                </TableCell>
                <TableCell>{locationData.itemCount || 0}</TableCell>
              </TableRow>
              
              <TableRow>
                <TableCell component="th" scope="row" sx={{ fontWeight: 'bold' }}>
                  Created
                </TableCell>
                <TableCell>{new Date(locationData.createdAt).toLocaleString()}</TableCell>
              </TableRow>
              
              {locationData.updatedAt && (
                <TableRow>
                  <TableCell component="th" scope="row" sx={{ fontWeight: 'bold' }}>
                    Last Updated
                  </TableCell>
                  <TableCell>{new Date(locationData.updatedAt).toLocaleString()}</TableCell>
                </TableRow>
              )}
              
              <TableRow>
                <TableCell component="th" scope="row" sx={{ fontWeight: 'bold' }}>
                  Last Refreshed
                </TableCell>
                <TableCell>{new Date(lastRefreshed).toLocaleString()}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
      
      {/* Tabs for Sub-locations and Items */}
      <Box sx={{ mb: 3 }}>
        <Tabs value={tabValue} onChange={handleTabChange} aria-label="location tabs">
          <Tab label="Items" id="tab-0" />
          <Tab label="Sub-locations" id="tab-1" />
        </Tabs>
      </Box>
      
      {/* Sub-locations Tab */}
      {tabValue === 1 && (
        <Paper sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">
              Sub-locations
            </Typography>
            
            <Button
              variant="outlined"
              startIcon={<AddIcon />}
              component={RouterLink}
              to={`/locations/create?parent=${locationData._id}`}
            >
              Add Sub-location
            </Button>
          </Box>
          
          {childLocations.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              No sub-locations found. Add a sub-location to organize your items further.
            </Typography>
          ) : (
            <List>
              {renderLocationTree(childLocations)}
            </List>
          )}
        </Paper>
      )}
      
      {/* Items Tab */}
      {tabValue === 0 && (
        <Paper sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">
              Items in this Location ({items.length})
            </Typography>
            
            <Button
              variant="outlined"
              startIcon={<AddIcon />}
              component={RouterLink}
              to={`/items/create?location=${locationData._id}`}
            >
              Add Item
            </Button>
          </Box>
          
          {items.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              No items found in this location. Add an item to get started.
            </Typography>
          ) : (
            <Grid container spacing={2}>
              {items.map(item => (
                <Grid item xs={12} sm={6} md={4} key={item._id}>
                  <Card>
                    <CardContent>
                      <Typography variant="h6" component="div" noWrap>
                        {item.name}
                      </Typography>
                      
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                        {item.category && item.category.name}
                      </Typography>
                      
                      {item.description && (
                        <Typography variant="body2" sx={{ mb: 1 }} noWrap>
                          {item.description}
                        </Typography>
                      )}
                      
                      <Box sx={{ mt: 1 }}>
                        {item.labels && item.labels.map(label => (
                          <Chip
                            key={label._id}
                            label={label.name}
                            size="small"
                            sx={{
                              mr: 0.5,
                              mb: 0.5,
                              bgcolor: label.color,
                              color: 'white',
                            }}
                          />
                        ))}
                      </Box>
                    </CardContent>
                    
                    <CardActions>
                      <Button 
                        size="small" 
                        component={RouterLink} 
                        to={`/items/${item._id}`}
                      >
                        View Details
                      </Button>
                      
                      <Button 
                        size="small" 
                        component={RouterLink} 
                        to={`/items/edit/${item._id}`}
                      >
                        Edit
                      </Button>
                    </CardActions>
                  </Card>
                </Grid>
              ))}
            </Grid>
          )}
        </Paper>
      )}
    </Container>
  );
};

export default LocationDetail;

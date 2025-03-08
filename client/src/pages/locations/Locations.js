import React, { useState, useEffect, useContext } from 'react';
import axios from '../../utils/axiosConfig';
import bulkService from '../../services/bulkService';
import { Link as RouterLink } from 'react-router-dom';
import {
  Container,
  Grid,
  Paper,
  Typography,
  Box,
  Button,
  TextField,
  InputAdornment,
  CircularProgress,
  Card,
  CardContent,
  CardActions,
  Divider,
  IconButton,
  Menu,
  MenuItem,
  Tooltip,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Collapse,
  Link
} from '@mui/material';
import {
  Search as SearchIcon,
  Add as AddIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  MoreVert as MoreVertIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Folder as FolderIcon,
  FolderOpen as FolderOpenIcon
} from '@mui/icons-material';
import { AlertContext } from '../../context/AlertContext';
import BulkAddDialog from '../../components/bulk/BulkAddDialog';

const Locations = () => {
  const { setSuccessAlert, setErrorAlert } = useContext(AlertContext);
  const [loading, setLoading] = useState(true);
  const [locations, setLocations] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [expandedLocations, setExpandedLocations] = useState({});
  const [bulkAddOpen, setBulkAddOpen] = useState(false);

  useEffect(() => {
    const fetchLocations = async () => {
      try {
        setLoading(true);
        
        // Make API call to fetch locations
        const response = await axios.get('/api/locations');
        
        if (response.data.success) {
          setLocations(response.data.data || []);
        } else {
          setErrorAlert('Error loading locations: ' + response.data.message);
        }
        
        setLoading(false);
      } catch (err) {
        setErrorAlert('Error loading locations');
        setLoading(false);
        console.error(err);
      }
    };
    
    fetchLocations();
  }, [setErrorAlert]);

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
  };

  const handleMenuOpen = (event, location) => {
    setAnchorEl(event.currentTarget);
    setSelectedLocation(location);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedLocation(null);
  };

  const handleDeleteLocation = async () => {
    if (!selectedLocation) return;
    
    try {
      // Make API call to delete the location
      const response = await axios.delete(`/api/locations/${selectedLocation._id}`);
      
      if (response.data.success) {
        // Refresh the locations list
        const locationsResponse = await axios.get('/api/locations');
        if (locationsResponse.data.success) {
          setLocations(locationsResponse.data.data || []);
        }
        
        setSuccessAlert(`${selectedLocation.name} deleted successfully`);
      } else {
        setErrorAlert('Error deleting location: ' + response.data.message);
      }
    } catch (err) {
      setErrorAlert('Error deleting location: ' + (err.response?.data?.message || err.message));
      console.error(err);
    } finally {
      handleMenuClose();
    }
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
                onClick={(e) => handleMenuOpen(e, location)}
              >
                <MoreVertIcon />
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
                  <Link 
                    component={RouterLink} 
                    to={`/locations/${location._id}`}
                    underline="hover"
                    sx={{ color: 'inherit' }}
                  >
                    {location.name}
                  </Link>
                  <Typography component="span" variant="body2" color="text.secondary" sx={{ ml: 1 }}>
                    ({location.itemCount} items)
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

  // Filter locations based on search term
  const filterLocations = (locationsArray, term) => {
    if (!term) return locationsArray;
    
    return locationsArray.filter(location => {
      const matchesSearch = 
        location.name.toLowerCase().includes(term.toLowerCase()) ||
        (location.description && location.description.toLowerCase().includes(term.toLowerCase()));
      
      if (matchesSearch) return true;
      
      if (location.children && location.children.length > 0) {
        const filteredChildren = filterLocations(location.children, term);
        if (filteredChildren.length > 0) {
          location.children = filteredChildren;
          return true;
        }
      }
      
      return false;
    });
  };

  const filteredLocations = filterLocations([...locations], searchTerm);

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
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          Locations
        </Typography>
        
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            color="primary"
            startIcon={<AddIcon />}
            onClick={() => setBulkAddOpen(true)}
          >
            Bulk Add
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            component={RouterLink}
            to="/locations/create"
          >
            Add Location
          </Button>
        </Box>
      </Box>
      
      <Paper sx={{ p: 2, mb: 3 }}>
        <TextField
          fullWidth
          placeholder="Search locations by name or description"
          value={searchTerm}
          onChange={handleSearchChange}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            )
          }}
        />
      </Paper>
      
      {filteredLocations.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant="h6" color="text.secondary">
            No locations found
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Try adjusting your search or add a new location
          </Typography>
        </Paper>
      ) : (
        <Paper sx={{ p: 2 }}>
          <List>
            {renderLocationTree(filteredLocations)}
          </List>
        </Paper>
      )}
      
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem 
          component={RouterLink} 
          to={selectedLocation ? `/locations/${selectedLocation._id}` : '#'}
          onClick={handleMenuClose}
        >
          <FolderOpenIcon fontSize="small" sx={{ mr: 1 }} />
          View Details
        </MenuItem>
        
        <MenuItem 
          component={RouterLink} 
          to={selectedLocation ? `/locations/edit/${selectedLocation._id}` : '#'}
          onClick={handleMenuClose}
        >
          <EditIcon fontSize="small" sx={{ mr: 1 }} />
          Edit
        </MenuItem>
        
        <MenuItem 
          component={RouterLink} 
          to={selectedLocation ? `/items?location=${selectedLocation._id}` : '#'}
          onClick={handleMenuClose}
        >
          <FolderOpenIcon fontSize="small" sx={{ mr: 1 }} />
          View Items
        </MenuItem>
        
        <Divider />
        
        <MenuItem onClick={handleDeleteLocation} sx={{ color: 'error.main' }}>
          <DeleteIcon fontSize="small" sx={{ mr: 1 }} />
          Delete
        </MenuItem>
      </Menu>
      
      {/* Bulk Add Dialog */}
      <BulkAddDialog
        open={bulkAddOpen}
        onClose={() => setBulkAddOpen(false)}
        onSubmit={async (locations) => {
          try {
            const result = await bulkService.bulkAdd('locations', locations);
            setSuccessAlert(`Successfully added ${result.count} locations`);
            
            // Refresh the locations list
            const response = await axios.get('/api/locations');
            if (response.data.success) {
              setLocations(response.data.data || []);
            }
            
            return result;
          } catch (err) {
            setErrorAlert('Error adding locations: ' + (err.message || 'Unknown error'));
            throw err;
          }
        }}
        entityType="locations"
        fields={{
          name: {
            label: 'Name',
            required: true
          },
          description: {
            label: 'Description',
            multiline: true,
            rows: 2
          },
          parentId: {
            label: 'Parent Location',
            helperText: 'Leave blank for top-level location'
          }
        }}
        defaultValues={{
          name: '',
          description: '',
          parentId: ''
        }}
      />
    </Container>
  );
};

export default Locations;

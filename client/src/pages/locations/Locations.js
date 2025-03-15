import React, { useState, useEffect, useContext } from 'react';
import axios from '../../utils/axiosConfig';
import bulkService from '../../services/bulkService';
import { Link as RouterLink } from 'react-router-dom';
import Fuse from 'fuse.js';
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
import SpreadsheetBulkAddDialog from '../../components/bulk/SpreadsheetBulkAddDialog';
import SequentialLocationsDialog from '../../components/bulk/SequentialLocationsDialog';

const Locations = () => {
  const { setSuccessAlert, setErrorAlert } = useContext(AlertContext);
  const [loading, setLoading] = useState(true);
  const [locations, setLocations] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [expandedLocations, setExpandedLocations] = useState({});
  const [bulkAddOpen, setBulkAddOpen] = useState(false);
  const [sequentialAddOpen, setSequentialAddOpen] = useState(false);

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
    const value = e.target.value;
    setSearchTerm(value);
    
    // Auto-expand all locations when searching
    if (value.trim() !== '') {
      handleExpandAll();
    } else {
      // Collapse all when search is cleared
      handleCollapseAll();
    }
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
        // Refresh the locations list immediately without showing a success message
        const locationsResponse = await axios.get('/api/locations');
        if (locationsResponse.data.success) {
          setLocations(locationsResponse.data.data || []);
        }
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

  // Function to expand all locations
  const handleExpandAll = () => {
    const allExpanded = {};
    const expandAllLocations = (locationArray) => {
      locationArray.forEach(location => {
        if (location.children && location.children.length > 0) {
          allExpanded[location._id] = true;
          expandAllLocations(location.children);
        }
      });
    };
    expandAllLocations(locations);
    setExpandedLocations(allExpanded);
  };

  // Function to collapse all locations
  const handleCollapseAll = () => {
    setExpandedLocations({});
  };
  
  // Function to flatten the hierarchical locations data for dropdowns
  const flattenLocations = (locationArray, result = [], level = 0, parentPath = '') => {
    locationArray.forEach(location => {
      const path = parentPath ? `${parentPath} > ${location.name}` : location.name;
      result.push({
        ...location,
        hierarchyPath: path,
        level
      });
      
      if (location.children && location.children.length > 0) {
        flattenLocations(location.children, result, level + 1, path);
      }
    });
    return result;
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

  // Filter locations based on search term using fuzzy search
  const filterLocations = (locationsArray, term) => {
    if (!term) return locationsArray;
    
    // Recursive function to apply fuzzy search to a location and its children
    const fuzzyFilterLocation = (location) => {
      // Configure Fuse.js options for this location
      const fuseOptions = {
        keys: ['name', 'description'],
        threshold: 0.4, // Lower threshold means more strict matching (0.0 is exact match)
        includeScore: true
      };
      
      // Create a Fuse instance for this location
      const fuse = new Fuse([location], fuseOptions);
      const result = fuse.search(term);
      
      // Check if this location matches
      const matchesSearch = result.length > 0;
      
      // Check children if they exist
      let matchingChildren = [];
      if (location.children && location.children.length > 0) {
        // Apply fuzzy search to each child
        matchingChildren = location.children
          .map(fuzzyFilterLocation)
          .filter(child => child !== null);
      }
      
      // Return the location if it matches or has matching children
      if (matchesSearch) {
        return {
          ...location,
          children: matchingChildren
        };
      } else if (matchingChildren.length > 0) {
        return {
          ...location,
          children: matchingChildren
        };
      }
      
      // No match for this location or its children
      return null;
    };
    
    // Apply fuzzy filter to each top-level location
    return locationsArray
      .map(fuzzyFilterLocation)
      .filter(location => location !== null);
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
            variant="outlined"
            color="primary"
            startIcon={<AddIcon />}
            onClick={() => setSequentialAddOpen(true)}
          >
            Sequential Add
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
      
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1, mb: 2 }}>
        <Button 
          variant="outlined" 
          size="small" 
          onClick={handleExpandAll}
          startIcon={<ExpandMoreIcon />}
        >
          Expand All
        </Button>
        <Button 
          variant="outlined" 
          size="small" 
          onClick={handleCollapseAll}
          startIcon={<ExpandLessIcon />}
        >
          Collapse All
        </Button>
      </Box>
      
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
      
      {/* Spreadsheet Bulk Add Dialog */}
      <SpreadsheetBulkAddDialog
        open={bulkAddOpen}
        onClose={() => setBulkAddOpen(false)}
        onSubmit={async (locations) => {
          try {
            const result = await bulkService.bulkAdd('locations', locations);
            
            // Refresh the locations list immediately without showing a success message
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
          parent: {
            label: 'Parent Location',
            type: 'location',
            required: false
          }
        }}
        defaultValues={{
          name: '',
          description: '',
          parent: ''
        }}
      />
      
      {/* Sequential Locations Dialog */}
      <SequentialLocationsDialog
        open={sequentialAddOpen}
        onClose={() => setSequentialAddOpen(false)}
        onSubmit={async (locations) => {
          try {
            const result = await bulkService.bulkAdd('locations', locations);
            
            // Refresh the locations list immediately without showing a success message
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
      />
    </Container>
  );
};

export default Locations;

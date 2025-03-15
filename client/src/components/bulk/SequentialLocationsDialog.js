import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  IconButton,
  Alert,
  CircularProgress,
  Divider,
  TextField,
  FormControl,
  FormControlLabel,
  Checkbox,
  Paper,
  List,
  ListItem,
  ListItemText,
  Autocomplete
} from '@mui/material';
import {
  Close as CloseIcon,
  Preview as PreviewIcon
} from '@mui/icons-material';
import axios from '../../utils/axiosConfig';

/**
 * A dialog for bulk adding sequential locations under a parent
 * 
 * @param {Object} props
 * @param {boolean} props.open - Whether the dialog is open
 * @param {Function} props.onClose - Function to call when the dialog is closed
 * @param {Function} props.onSubmit - Function to call when the form is submitted
 */
const SequentialLocationsDialog = ({ open, onClose, onSubmit }) => {
  const [parent, setParent] = useState(null);
  const [baseName, setBaseName] = useState('');
  const [count, setCount] = useState(5);
  const [startNumber, setStartNumber] = useState(1);
  const [includeNumber, setIncludeNumber] = useState(true);
  const [zeroPadding, setZeroPadding] = useState(0);
  const [separator, setSeparator] = useState(' ');
  const [description, setDescription] = useState('');
  
  const [preview, setPreview] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  
  // State for parent location options
  const [locations, setLocations] = useState([]);
  const [loadingLocations, setLoadingLocations] = useState(false);

  // Fetch locations when the dialog opens
  useEffect(() => {
    if (open) {
      fetchLocations();
    }
  }, [open]);

  // Function to flatten the hierarchical locations data
  const flattenLocations = (locationArray, result = []) => {
    locationArray.forEach(location => {
      result.push(location);
      if (location.children && location.children.length > 0) {
        flattenLocations(location.children, result);
      }
    });
    return result;
  };

  // Fetch locations for dropdown
  const fetchLocations = async () => {
    setLoadingLocations(true);
    try {
      const response = await axios.get('/api/locations');
      
      if (response.data.success) {
        // Flatten the hierarchical locations data
        const flatLocations = flattenLocations(response.data.data || []);
        setLocations(flatLocations);
      } else {
        setError('Error loading locations: ' + response.data.message);
      }
    } catch (err) {
      console.error('Error fetching locations:', err);
      setError('Failed to load locations');
    } finally {
      setLoadingLocations(false);
    }
  };

  // Update preview whenever any of the parameters change
  useEffect(() => {
    generatePreview();
  }, [baseName, count, startNumber, includeNumber, zeroPadding, separator]);

  // Generate a preview of the locations that will be created
  const generatePreview = () => {
    const names = [];
    const end = startNumber + parseInt(count, 10);
    
    for (let i = startNumber; i < end; i++) {
      if (includeNumber) {
        // Format the number with zero padding if needed
        const num = zeroPadding > 0 ? 
          i.toString().padStart(zeroPadding, '0') : i.toString();
        
        // Combine the base name and number with the separator
        names.push(`${baseName}${separator}${num}`);
      } else {
        names.push(baseName);
      }
    }
    
    setPreview(names);
  };

  // Get the full location hierarchy path
  const getLocationHierarchy = (loc) => {
    if (!loc) return '';
    
    // Start with the current location name
    let path = loc.name;
    let currentLoc = loc;
    
    // Traverse up the parent hierarchy
    while (currentLoc.parent) {
      // Find the parent location
      const parentLocation = locations.find(l => l._id === currentLoc.parent);
      
      // If parent not found, break the loop
      if (!parentLocation) break;
      
      // Add parent name to the path
      path = `${parentLocation.name} > ${path}`;
      
      // Move up to the parent
      currentLoc = parentLocation;
    }
    
    return path;
  };

  // Handle form submission
  const handleSubmit = async () => {
    try {
      setIsSubmitting(true);
      setError(null);
      
      // Validate inputs
      if (!baseName) {
        setError('Please enter a base name');
        setIsSubmitting(false);
        return;
      }
      
      if (parseInt(count, 10) <= 0) {
        setError('Count must be greater than 0');
        setIsSubmitting(false);
        return;
      }
      
      // Create location objects
      const locationsToCreate = preview.map(name => ({
        name,
        description,
        parent: parent ? parent._id : null
      }));
      
      // Call the onSubmit function with the locations
      await onSubmit(locationsToCreate);
      
      // Show success message
      setSuccess(`Successfully added ${locationsToCreate.length} locations`);
      
      // Reset the form
      setTimeout(() => {
        onClose();
        setSuccess(null);
      }, 2000);
    } catch (err) {
      setError(err.message || 'Failed to add locations');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog 
      open={open} 
      onClose={onClose} 
      maxWidth="md" 
      fullWidth
      PaperProps={{
        sx: {
          maxHeight: '80vh'
        }
      }}
    >
      <DialogTitle 
        sx={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          fontWeight: 'medium'
        }}
      >
        Add Sequential Locations
        <IconButton edge="end" color="inherit" onClick={onClose} aria-label="close">
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      
      <DialogContent dividers>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        
        {success && (
          <Alert severity="success" sx={{ mb: 2 }}>
            {success}
          </Alert>
        )}
        
        <Typography variant="body2" color="text.secondary" paragraph>
          Create multiple sequential locations under the same parent. For example, create "Shelf 1" through "Shelf 5" under "Cabinet A".
        </Typography>
        
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mb: 3 }}>
          <FormControl fullWidth>
            <Autocomplete
              options={locations}
              loading={loadingLocations}
              getOptionLabel={(option) => getLocationHierarchy(option)}
              value={parent}
              onChange={(event, newValue) => {
                setParent(newValue);
              }}
              isOptionEqualToValue={(option, value) => option._id === value._id}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Parent Location"
                  placeholder="Select parent location"
                  InputProps={{
                    ...params.InputProps,
                    endAdornment: (
                      <>
                        {loadingLocations ? <CircularProgress color="inherit" size={20} /> : null}
                        {params.InputProps.endAdornment}
                      </>
                    ),
                  }}
                />
              )}
            />
          </FormControl>
          
          <Box sx={{ display: 'flex', gap: 2 }}>
            <TextField
              label="Base Name"
              value={baseName}
              onChange={(e) => setBaseName(e.target.value)}
              required
              fullWidth
              placeholder="e.g., Shelf"
              helperText="The base name for all locations"
            />
            
            <TextField
              label="Count"
              value={count}
              onChange={(e) => setCount(e.target.value)}
              type="number"
              required
              inputProps={{ min: 1 }}
              sx={{ width: '120px' }}
              helperText="How many to create"
            />
          </Box>
          
          <Divider sx={{ my: 1 }}>Numbering Options</Divider>
          
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'flex-start' }}>
            <Box sx={{ width: '160px', mt: 1 }}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={includeNumber}
                    onChange={(e) => setIncludeNumber(e.target.checked)}
                  />
                }
                label="Include Numbers"
                sx={{ mt: 1 }}
              />
            </Box>
            
            <TextField
              label="Start Number"
              value={startNumber}
              onChange={(e) => setStartNumber(parseInt(e.target.value, 10))}
              type="number"
              inputProps={{ min: 0 }}
              sx={{ width: '120px' }}
              disabled={!includeNumber}
              helperText="First number"
            />
            
            <TextField
              label="Zero Padding"
              value={zeroPadding}
              onChange={(e) => setZeroPadding(parseInt(e.target.value, 10))}
              type="number"
              inputProps={{ min: 0, max: 5 }}
              sx={{ width: '120px' }}
              disabled={!includeNumber}
              helperText="e.g., 2 = '01'"
            />
            
            <TextField
              label="Separator"
              value={separator}
              onChange={(e) => setSeparator(e.target.value)}
              sx={{ width: '120px' }}
              disabled={!includeNumber}
              helperText="Between name & number"
            />
          </Box>
          
          <TextField
            label="Description (optional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            fullWidth
            multiline
            rows={2}
            helperText="This description will be used for all created locations"
          />
        </Box>
        
        <Box sx={{ mt: 3 }}>
          <Typography variant="subtitle1" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <PreviewIcon color="primary" />
            Preview ({preview.length} locations)
          </Typography>
          
          <Paper sx={{ maxHeight: '200px', overflow: 'auto', mt: 1 }}>
            <List dense>
              {preview.map((name, index) => (
                <ListItem key={index}>
                  <ListItemText 
                    primary={name} 
                    secondary={parent ? `Parent: ${getLocationHierarchy(parent)}` : 'No parent'}
                  />
                </ListItem>
              ))}
              {preview.length === 0 && (
                <ListItem>
                  <ListItemText primary="No locations to create. Please enter a base name and count." />
                </ListItem>
              )}
            </List>
          </Paper>
        </Box>
      </DialogContent>
      
      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button 
          variant="contained" 
          color="primary" 
          onClick={handleSubmit}
          disabled={isSubmitting || preview.length === 0}
          startIcon={isSubmitting ? <CircularProgress size={20} /> : null}
        >
          {isSubmitting ? 'Creating...' : `Create ${preview.length} Locations`}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default SequentialLocationsDialog;

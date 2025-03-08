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
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  TextField,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Chip
} from '@mui/material';
import {
  Close as CloseIcon,
  Add as AddIcon,
  Delete as DeleteIcon
} from '@mui/icons-material';
import axios from '../../utils/axiosConfig';

/**
 * A spreadsheet-like dialog component for bulk adding items
 * 
 * @param {Object} props
 * @param {boolean} props.open - Whether the dialog is open
 * @param {Function} props.onClose - Function to call when the dialog is closed
 * @param {Function} props.onSubmit - Function to call when the form is submitted
 * @param {string} props.entityType - The type of entity being added ('items', 'locations', 'labels', 'categories')
 * @param {Object} props.fields - The fields to display in the form
 * @param {Object} props.defaultValues - Default values for the fields
 */
const SpreadsheetBulkAddDialog = ({ 
  open, 
  onClose, 
  onSubmit, 
  entityType, 
  fields = {}, 
  defaultValues = {} 
}) => {
  const [rows, setRows] = useState([{ ...defaultValues, id: Date.now() }]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  
  // State for dropdown options
  const [locations, setLocations] = useState([]);
  const [categories, setCategories] = useState([]);
  const [labels, setLabels] = useState([]);
  const [loadingOptions, setLoadingOptions] = useState(false);
  const [lookingUpUpc, setLookingUpUpc] = useState(false);
  const [fetchingAssetId, setFetchingAssetId] = useState(false);
  const [nextAssetId, setNextAssetId] = useState('');

  // Get the singular form of the entity type for display
  const entityName = {
    'items': 'Item',
    'locations': 'Location',
    'labels': 'Label',
    'categories': 'Category'
  }[entityType] || 'Entity';

  // Fetch dropdown options and first asset ID when the dialog opens
  useEffect(() => {
    if (open) {
      fetchOptions();
      if (entityType === 'items') {
        fetchNextAssetId();
      }
    }
  }, [open, entityType]);

  // Fetch the next available asset ID
  const fetchNextAssetId = async () => {
    try {
      setFetchingAssetId(true);
      const response = await axios.get('/api/items/next-asset-id');
      
      if (response.data.success) {
        const assetId = response.data.data;
        setNextAssetId(assetId);
        
        // Update the first row with the asset ID
        setRows(prevRows => prevRows.map((row, index) => 
          index === 0 ? { ...row, assetId } : row
        ));
      }
    } catch (err) {
      console.error('Error fetching next asset ID:', err);
    } finally {
      setFetchingAssetId(false);
    }
  };

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

  // Fetch locations, categories, and labels for dropdowns
  const fetchOptions = async () => {
    setLoadingOptions(true);
    try {
      const [locationsRes, categoriesRes, labelsRes] = await Promise.all([
        axios.get('/api/locations'),
        axios.get('/api/categories'),
        axios.get('/api/labels')
      ]);
      
      if (locationsRes.data.success) {
        // Flatten the hierarchical locations data
        const flatLocations = flattenLocations(locationsRes.data.data || []);
        setLocations(flatLocations);
      }
      
      if (categoriesRes.data.success) {
        setCategories(categoriesRes.data.data);
      }
      
      if (labelsRes.data.success) {
        setLabels(labelsRes.data.data);
      }
    } catch (err) {
      console.error('Error fetching options:', err);
      setError('Failed to load dropdown options');
    } finally {
      setLoadingOptions(false);
    }
  };

  // Handle adding a new row to the spreadsheet
  const handleAddRow = async () => {
    const newRow = { ...defaultValues, id: Date.now() };
    
    // If this is an item, fetch a new asset ID for the new row
    if (entityType === 'items') {
      try {
        setFetchingAssetId(true);
        const response = await axios.get('/api/items/next-asset-id');
        
        if (response.data.success) {
          const assetId = response.data.data;
          newRow.assetId = assetId;
        }
      } catch (err) {
        console.error('Error fetching next asset ID for new row:', err);
      } finally {
        setFetchingAssetId(false);
      }
    }
    
    setRows([...rows, newRow]);
  };

  // Handle removing a row from the spreadsheet
  const handleRemoveRow = (id) => {
    setRows(rows.filter(row => row.id !== id));
  };

  // Handle field change for a specific row
  const handleFieldChange = (id, field, value) => {
    setRows(rows.map(row => 
      row.id === id ? { ...row, [field]: value } : row
    ));
  };

  // Handle UPC lookup
  const handleUpcLookup = async (id, upc) => {
    if (!upc) return;
    
    try {
      setLookingUpUpc(true);
      
      // Make API call to look up UPC
      const response = await axios.get(`/api/upc/${upc}`);
      
      if (response.data.success && response.data.data) {
        const item = response.data.data;
        
        // Update the row with the item data
        setRows(rows.map(row => {
          if (row.id === id) {
            const updatedRow = { ...row };
            
            // Update basic fields
            if (item.name) updatedRow.name = item.name;
            if (item.description) updatedRow.description = item.description;
            if (item.category) updatedRow.category = item.category._id;
            if (item.location) updatedRow.location = item.location._id;
            if (item.labels) updatedRow.labels = item.labels.map(label => label._id);
            if (item.upcCode) updatedRow.upcCode = item.upcCode;
            if (item.quantity) updatedRow.quantity = item.quantity;
            if (item.serialNumber) updatedRow.serialNumber = item.serialNumber;
            if (item.modelNumber) updatedRow.modelNumber = item.modelNumber;
            if (item.manufacturer) updatedRow.manufacturer = item.manufacturer;
            if (item.isInsured !== undefined) updatedRow.isInsured = item.isInsured;
            if (item.notes) updatedRow.notes = item.notes;
            
            // Update nested fields
            if (item.purchaseDetails) {
              updatedRow.purchaseDetails = {
                ...updatedRow.purchaseDetails,
                ...item.purchaseDetails
              };
            }
            
            if (item.warrantyDetails) {
              updatedRow.warrantyDetails = {
                ...updatedRow.warrantyDetails,
                ...item.warrantyDetails
              };
            }
            
            return updatedRow;
          }
          return row;
        }));
      }
    } catch (err) {
      console.error('Error looking up UPC:', err);
    } finally {
      setLookingUpUpc(false);
    }
  };

  // Handle form submission
  const handleSubmit = async () => {
    try {
      setIsSubmitting(true);
      setError(null);
      
      // Filter out any rows with empty required fields
      const validRows = rows.filter(row => {
        // Check if all required fields have values
        return Object.entries(fields).every(([field, config]) => {
          return !config.required || row[field];
        });
      });
      
      if (validRows.length === 0) {
        setError('Please fill in at least one row with all required fields');
        setIsSubmitting(false);
        return;
      }
      
      // Remove the temporary id and upcLookup properties before submitting
      const rowsToSubmit = validRows.map(({ id, upcLookup, ...rest }) => rest);
      
      // Call the onSubmit function with the rows
      await onSubmit(rowsToSubmit);
      
      // Show success message
      setSuccess(`Successfully added ${validRows.length} ${entityType}`);
      
      // Reset the form
      setRows([{ ...defaultValues, id: Date.now() }]);
      
      // Close the dialog after a delay
      setTimeout(() => {
        onClose();
        setSuccess(null);
      }, 2000);
    } catch (err) {
      setError(err.message || `Failed to add ${entityType}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Define a consistent height for all input fields
  const inputHeight = 56; // Standard height for TextField with size="small"
  
  // Render a cell based on field configuration
  const renderCell = (row, field, config) => {
    // Handle nested fields (e.g., purchaseDetails.purchasedFrom)
    if (field.includes('.')) {
      const [parent, child] = field.split('.');
      // Initialize the parent object if it doesn't exist
      if (!row[parent]) {
        handleFieldChange(row.id, parent, {});
      }
      
      const value = row[parent] ? row[parent][child] || '' : '';
      const handleNestedChange = (newValue) => {
        handleFieldChange(row.id, parent, {
          ...row[parent],
          [child]: newValue
        });
      };
      
      // Render the appropriate input based on the field type
      if (config.type === 'number') {
        return (
          <TextField
            type="number"
            value={value}
            onChange={(e) => handleNestedChange(e.target.value)}
            required={config.required}
            fullWidth
            size="small"
            variant="outlined"
            sx={{ height: inputHeight }}
            InputProps={{ sx: { height: inputHeight } }}
          />
        );
      } else if (config.type === 'date') {
        return (
          <TextField
            type="date"
            value={value || ''}
            onChange={(e) => handleNestedChange(e.target.value)}
            required={config.required}
            fullWidth
            size="small"
            variant="outlined"
            InputLabelProps={{ shrink: true }}
            sx={{ height: inputHeight }}
            InputProps={{ sx: { height: inputHeight } }}
          />
        );
      } else if (config.type === 'boolean') {
        return (
          <FormControl fullWidth size="small" sx={{ height: inputHeight }}>
            <Select
              value={value === '' ? 'false' : value ? 'true' : 'false'}
              onChange={(e) => handleNestedChange(e.target.value === 'true')}
              displayEmpty
              required={config.required}
              sx={{ height: inputHeight }}
            >
              <MenuItem value="">
                <em>Select</em>
              </MenuItem>
              <MenuItem value="true">Yes</MenuItem>
              <MenuItem value="false">No</MenuItem>
            </Select>
          </FormControl>
        );
      } else {
        return (
          <TextField
            value={value}
            onChange={(e) => handleNestedChange(e.target.value)}
            required={config.required}
            fullWidth
            size="small"
            variant="outlined"
            multiline={config.multiline}
            rows={config.rows}
            sx={{ height: config.multiline ? 'auto' : inputHeight }}
            InputProps={{ sx: { height: config.multiline ? 'auto' : inputHeight } }}
          />
        );
      }
    }
    
    // Handle regular fields
    if (field === 'location') {
      return (
        <FormControl fullWidth size="small" sx={{ height: inputHeight }}>
          <Select
            value={row[field] || ''}
            onChange={(e) => handleFieldChange(row.id, field, e.target.value)}
            displayEmpty
            required={config.required}
            sx={{ height: inputHeight }}
          >
                <MenuItem value="">
                  <em>Select Location</em>
                </MenuItem>
                {locations.map((location) => {
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
                  
                  const hierarchyPath = getLocationHierarchy(location);
                  
                  return (
                    <MenuItem key={location._id} value={location._id}>
                      {hierarchyPath}
                    </MenuItem>
                  );
                })}
          </Select>
        </FormControl>
      );
    } else if (field === 'category') {
      return (
        <FormControl fullWidth size="small" sx={{ height: inputHeight }}>
          <Select
            value={row[field] || ''}
            onChange={(e) => handleFieldChange(row.id, field, e.target.value)}
            displayEmpty
            required={config.required}
            sx={{ height: inputHeight }}
          >
            <MenuItem value="">
              <em>Select Category</em>
            </MenuItem>
            {categories.map((category) => (
              <MenuItem key={category._id} value={category._id}>
                {category.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      );
    } else if (field === 'labels') {
      return (
        <FormControl fullWidth size="small" sx={{ height: inputHeight }}>
          <Select
            multiple
            value={row[field] || []}
            onChange={(e) => handleFieldChange(row.id, field, e.target.value)}
            sx={{ height: inputHeight }}
            renderValue={(selected) => (
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                {selected.map((value) => {
                  const label = labels.find(l => l._id === value);
                  return (
                    <Chip 
                      key={value} 
                      label={label ? label.name : value}
                      size="small"
                      sx={{
                        bgcolor: label ? label.color : undefined,
                        color: 'white',
                      }}
                    />
                  );
                })}
              </Box>
            )}
          >
            {labels.map((label) => (
              <MenuItem key={label._id} value={label._id}>
                {label.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      );
    } else if (config.type === 'number') {
      return (
        <TextField
          type="number"
          value={row[field] || ''}
          onChange={(e) => handleFieldChange(row.id, field, e.target.value)}
          required={config.required}
          fullWidth
          size="small"
          variant="outlined"
          sx={{ height: inputHeight }}
          InputProps={{ sx: { height: inputHeight } }}
        />
      );
    } else if (config.type === 'date') {
      return (
        <TextField
          type="date"
          value={row[field] || ''}
          onChange={(e) => handleFieldChange(row.id, field, e.target.value)}
          required={config.required}
          fullWidth
          size="small"
          variant="outlined"
          InputLabelProps={{ shrink: true }}
          sx={{ height: inputHeight }}
          InputProps={{ sx: { height: inputHeight } }}
        />
      );
    } else if (config.type === 'boolean') {
      return (
        <FormControl fullWidth size="small" sx={{ height: inputHeight }}>
          <Select
            value={row[field] === undefined ? '' : row[field] ? 'true' : 'false'}
            onChange={(e) => handleFieldChange(row.id, field, e.target.value === 'true')}
            displayEmpty
            required={config.required}
            sx={{ height: inputHeight }}
          >
            <MenuItem value="">
              <em>Select</em>
            </MenuItem>
            <MenuItem value="true">Yes</MenuItem>
            <MenuItem value="false">No</MenuItem>
          </Select>
        </FormControl>
      );
    } else {
      return (
        <TextField
          value={row[field] || ''}
          onChange={(e) => handleFieldChange(row.id, field, e.target.value)}
          required={config.required}
          fullWidth
          size="small"
          variant="outlined"
          multiline={config.multiline}
          rows={config.rows}
          sx={{ height: config.multiline ? 'auto' : inputHeight }}
          InputProps={{ sx: { height: config.multiline ? 'auto' : inputHeight } }}
        />
      );
    }
  };

  return (
    <Dialog 
      open={open} 
      onClose={onClose} 
      maxWidth="lg" 
      fullWidth
      PaperProps={{
        sx: {
          maxHeight: '80vh',
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
        Bulk Add {entityName}s (Spreadsheet View)
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
          Add multiple {entityName.toLowerCase()}s at once using this spreadsheet-like interface. Each row represents one {entityName.toLowerCase()}.
        </Typography>
        
        {loadingOptions ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
            <CircularProgress />
          </Box>
        ) : (
          <TableContainer component={Paper} sx={{ mb: 2, maxWidth: '100%', overflowX: 'auto' }}>
            <Table size="small" stickyHeader sx={{ minWidth: 1200 }}>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 'bold', minWidth: '144px' }}>
                    UPC Lookup
                  </TableCell>
                  {entityType === 'items' && (
                    <TableCell sx={{ fontWeight: 'bold', minWidth: '144px' }}>
                      Asset ID
                    </TableCell>
                  )}
                  {Object.entries(fields).map(([field, config]) => (
                    <TableCell key={field} sx={{ fontWeight: 'bold', minWidth: '144px' }}>
                      {config.label} {config.required && <span style={{ color: 'red' }}>*</span>}
                    </TableCell>
                  ))}
                  <TableCell align="center" sx={{ width: 60 }}>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell>
                      <TextField
                        value={row.upcLookup || ''}
                        onChange={(e) => handleFieldChange(row.id, 'upcLookup', e.target.value)}
                        onBlur={(e) => handleUpcLookup(row.id, e.target.value)}
                        placeholder="Enter UPC"
                        fullWidth
                        size="small"
                        variant="outlined"
                        sx={{ height: inputHeight }}
                        InputProps={{ 
                          sx: { height: inputHeight },
                          endAdornment: lookingUpUpc && (
                            <CircularProgress size={20} color="inherit" />
                          )
                        }}
                      />
                    </TableCell>
                    {entityType === 'items' && (
                      <TableCell>
                        <TextField
                          value={row.assetId || ''}
                          onChange={(e) => handleFieldChange(row.id, 'assetId', e.target.value)}
                          placeholder="Asset ID"
                          fullWidth
                          size="small"
                          variant="outlined"
                          sx={{ height: inputHeight }}
                          InputProps={{ 
                            sx: { height: inputHeight },
                            readOnly: true
                          }}
                          helperText="Auto-generated"
                        />
                      </TableCell>
                    )}
                    {Object.entries(fields).map(([field, config]) => (
                      <TableCell key={`${row.id}-${field}`}>
                        {renderCell(row, field, config)}
                      </TableCell>
                    ))}
                    <TableCell align="center">
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => handleRemoveRow(row.id)}
                        disabled={rows.length <= 1}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
        
        <Button
          variant="outlined"
          startIcon={<AddIcon />}
          onClick={handleAddRow}
          fullWidth
          sx={{ mt: 1 }}
        >
          Add Row
        </Button>
      </DialogContent>
      
      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button 
          variant="contained" 
          color="primary" 
          onClick={handleSubmit}
          disabled={isSubmitting || loadingOptions}
          startIcon={isSubmitting ? <CircularProgress size={20} /> : null}
        >
          {isSubmitting ? 'Saving...' : `Save ${rows.length} ${entityName}${rows.length !== 1 ? 's' : ''}`}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default SpreadsheetBulkAddDialog;

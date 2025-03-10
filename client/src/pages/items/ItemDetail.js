import React, { useState, useEffect, useContext, useRef } from 'react';
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
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Breadcrumbs,
  Link,
  TextField,
  Alert
} from '@mui/material';
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  Archive as ArchiveIcon,
  Unarchive as UnarchiveIcon,
  QrCode as QrCodeIcon,
  Print as PrintIcon,
  ArrowBack as ArrowBackIcon,
  Person as PersonIcon,
  CheckCircle as CheckCircleIcon,
  NavigateNext as NavigateNextIcon,
  Alarm as AlarmIcon,
  Build as BuildIcon,
  VerifiedUser as WarrantyIcon,
  ContentCopy as DuplicateIcon
} from '@mui/icons-material';
import { AlertContext } from '../../context/AlertContext';

// Function to get the full location hierarchy path
const getLocationHierarchy = (location, allLocations) => {
  if (!location) return '';
  
  // Start with the current location name
  let path = location.name;
  let currentLocation = location;
  
  // Traverse up the parent hierarchy
  while (currentLocation.parent) {
    // Find the parent location
    const parentLocation = allLocations.find(loc => loc._id === currentLocation.parent);
    
    // If parent not found, break the loop
    if (!parentLocation) break;
    
    // Add parent name to the path
    path = `${parentLocation.name} > ${path}`;
    
    // Move up to the parent
    currentLocation = parentLocation;
  }
  
  return path;
};

const ItemDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { setSuccessAlert, setErrorAlert } = useContext(AlertContext);
  
  const [loading, setLoading] = useState(true);
  const [item, setItem] = useState(null);
  const [locationHierarchy, setLocationHierarchy] = useState([]);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [archiveDialogOpen, setArchiveDialogOpen] = useState(false);
  const [loanDialogOpen, setLoanDialogOpen] = useState(false);
  const [returnDialogOpen, setReturnDialogOpen] = useState(false);
  const [reminderDialogOpen, setReminderDialogOpen] = useState(false);
  const [reminderType, setReminderType] = useState('');
  const [duplicateDialogOpen, setDuplicateDialogOpen] = useState(false);
  const [loanFormData, setLoanFormData] = useState({
    loanedTo: '',
    notes: ''
  });
  const [loanFormError, setLoanFormError] = useState('');
  const [submittingLoan, setSubmittingLoan] = useState(false);

  useEffect(() => {
    const fetchItem = async () => {
      try {
        setLoading(true);
        
        // Make API call to fetch the item
        const response = await axios.get(`/api/items/${id}`);
        
        if (response.data.success) {
          setItem(response.data.data);
          
          // Fetch location details if the item has a location
          if (response.data.data.location && response.data.data.location._id) {
            try {
              // First, get the current location details
              const locationResponse = await axios.get(`/api/locations/${response.data.data.location._id}`);
              
              if (locationResponse.data.success) {
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
                  const currentLocation = locationResponse.data.data;
                  const hierarchyLocations = [];
                  
                  // Add the current location
                  hierarchyLocations.push(currentLocation);
                  
                  // Build the complete hierarchy by traversing up the tree
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
                  
                  console.log('Location hierarchy:', hierarchyLocations.map(loc => loc.name));
                  setLocationHierarchy(hierarchyLocations);
                }
              }
            } catch (err) {
              console.error('Error fetching location hierarchy:', err);
            }
          }
        } else {
          setErrorAlert('Error loading item: ' + response.data.message);
        }
        
        setLoading(false);
      } catch (err) {
        setErrorAlert('Error loading item');
        setLoading(false);
        console.error(err);
      }
    };
    
    fetchItem();
  }, [id, setErrorAlert]);

  const handleDeleteDialogOpen = () => {
    setDeleteDialogOpen(true);
  };

  const handleDeleteDialogClose = () => {
    setDeleteDialogOpen(false);
  };

  const handleArchiveDialogOpen = () => {
    setArchiveDialogOpen(true);
  };

  const handleArchiveDialogClose = () => {
    setArchiveDialogOpen(false);
  };

  const handleLoanDialogOpen = () => {
    setLoanFormData({
      loanedTo: '',
      notes: ''
    });
    setLoanFormError('');
    setLoanDialogOpen(true);
  };

  const handleLoanDialogClose = () => {
    setLoanDialogOpen(false);
  };

  const handleReturnDialogOpen = () => {
    setReturnDialogOpen(true);
  };

  const handleReturnDialogClose = () => {
    setReturnDialogOpen(false);
  };
  
  const handleReminderDialogOpen = (type) => {
    setReminderType(type);
    setReminderDialogOpen(true);
  };
  
  const handleReminderDialogClose = () => {
    setReminderDialogOpen(false);
  };
  
  const handleCreateReminder = () => {
    // Navigate to create reminder page with pre-filled information
    navigate(`/reminders/create`, { 
      state: { 
        itemId: item._id,
        reminderType: reminderType
      }
    });
    handleReminderDialogClose();
  };

  const handleLoanFormChange = (e) => {
    const { name, value } = e.target;
    setLoanFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleLoanItem = async () => {
    // Validate form
    if (!loanFormData.loanedTo.trim()) {
      setLoanFormError('Please enter who the item is loaned to');
      return;
    }

    setSubmittingLoan(true);
    setLoanFormError('');

    try {
      // Make API call to loan the item
      const response = await axios.post(`/api/items/${id}/loan`, loanFormData);
      
      if (response.data.success) {
        setItem(response.data.data);
        setSuccessAlert('Item loaned successfully');
        handleLoanDialogClose();
      } else {
        setLoanFormError('Error loaning item: ' + response.data.message);
      }
    } catch (err) {
      setLoanFormError('Error loaning item: ' + (err.response?.data?.message || err.message));
      console.error(err);
    } finally {
      setSubmittingLoan(false);
    }
  };

  const handleReturnItem = async () => {
    try {
      // Make API call to return the item
      const response = await axios.post(`/api/items/${id}/return`);
      
      if (response.data.success) {
        setItem(response.data.data);
        setSuccessAlert('Item returned successfully');
        handleReturnDialogClose();
      } else {
        setErrorAlert('Error returning item: ' + response.data.message);
      }
    } catch (err) {
      setErrorAlert('Error returning item: ' + (err.response?.data?.message || err.message));
      console.error(err);
    }
  };

  const handleDelete = async () => {
    try {
      // Make API call to delete the item
      const response = await axios.delete(`/api/items/${id}`);
      
      if (response.data.success) {
        setSuccessAlert('Item deleted successfully');
        navigate('/items');
      } else {
        setErrorAlert('Error deleting item: ' + response.data.message);
      }
    } catch (err) {
      setErrorAlert('Error deleting item');
      console.error(err);
    } finally {
      handleDeleteDialogClose();
    }
  };

  const handleArchiveToggle = async () => {
    try {
      // Make API call to archive/unarchive the item
      const response = await axios.put(`/api/items/${id}`, {
        ...item,
        isArchived: !item.isArchived
      });
      
      if (response.data.success) {
        setItem(response.data.data);
        setSuccessAlert(`Item ${item.isArchived ? 'unarchived' : 'archived'} successfully`);
      } else {
        setErrorAlert(`Error ${item.isArchived ? 'unarchiving' : 'archiving'} item: ${response.data.message}`);
      }
    } catch (err) {
      setErrorAlert(`Error ${item.isArchived ? 'unarchiving' : 'archiving'} item`);
      console.error(err);
    } finally {
      handleArchiveDialogClose();
    }
  };

  const handleDuplicateItem = async () => {
    try {
      // Create a controlled copy with only the necessary fields
      const itemCopy = {
        name: `${item.name} (Copy)`,
        description: item.description,
        location: item.location._id,
        category: item.category._id,
        labels: item.labels.map(label => label._id),
        assetId: item.assetId ? `${item.assetId}-copy` : '',
        quantity: item.quantity,
        serialNumber: item.serialNumber,
        modelNumber: item.modelNumber,
        manufacturer: item.manufacturer,
        notes: item.notes,
        isInsured: item.isInsured,
        isArchived: false,
        upcCode: item.upcCode,
        itemUrl: item.itemUrl,
        manualUrl: item.manualUrl,
        customFields: item.customFields ? [...item.customFields] : []
      };
      
      // Add purchase details if they exist
      if (item.purchaseDetails) {
        itemCopy.purchaseDetails = {
          purchasedFrom: item.purchaseDetails.purchasedFrom,
          purchasePrice: item.purchaseDetails.purchasePrice,
          purchaseDate: item.purchaseDetails.purchaseDate
        };
      }
      
      // Add warranty details if they exist
      if (item.warrantyDetails) {
        itemCopy.warrantyDetails = {
          hasLifetimeWarranty: item.warrantyDetails.hasLifetimeWarranty,
          warrantyExpires: item.warrantyDetails.warrantyExpires,
          warrantyNotes: item.warrantyDetails.warrantyNotes
        };
      }
      
      // Make API call to create a new item with the copied data
      const response = await axios.post('/api/items', itemCopy);
      
      if (response.data.success) {
        setSuccessAlert('Item duplicated successfully');
        // Navigate to the new item in edit mode
        navigate(`/items/edit/${response.data.data._id}`);
      } else {
        setErrorAlert('Error duplicating item: ' + response.data.message);
      }
    } catch (err) {
      setErrorAlert('Error duplicating item: ' + (err.response?.data?.message || err.message));
      console.error(err);
    } finally {
      setDuplicateDialogOpen(false);
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

  if (!item) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant="h5" color="text.secondary">
            Item not found
          </Typography>
          <Button
            variant="contained"
            component={RouterLink}
            to="/items"
            sx={{ mt: 2 }}
          >
            Back to Items
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
        <Link component={RouterLink} to="/items" underline="hover" color="inherit">
          Items
        </Link>
        <Typography color="text.primary">{item.name}</Typography>
      </Breadcrumbs>
      
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <Button
            component={RouterLink}
            to="/items"
            startIcon={<ArrowBackIcon />}
            sx={{ mr: 2 }}
          >
            Back
          </Button>
          
          <Typography variant="h4" component="h1">
            {item.name}
            {item.isArchived && (
              <Chip
                label="Archived"
                size="small"
                sx={{ ml: 2, verticalAlign: 'middle' }}
                color="default"
              />
            )}
          </Typography>
        </Box>
        
        <Box>
          <Button
            variant="outlined"
            startIcon={<QrCodeIcon />}
            sx={{ mr: 1 }}
          >
            QR Code
          </Button>
          
          <Button
            variant="outlined"
            startIcon={<PrintIcon />}
            sx={{ mr: 1 }}
          >
            Print
          </Button>
          
          <Button
            variant="outlined"
            startIcon={<EditIcon />}
            component={RouterLink}
            to={`/items/edit/${item._id}`}
            sx={{ mr: 1 }}
          >
            Edit
          </Button>
          
          <Button
            variant="outlined"
            startIcon={<DuplicateIcon />}
            onClick={() => setDuplicateDialogOpen(true)}
            sx={{ mr: 1 }}
          >
            Duplicate
          </Button>
          
          <Button
            variant="outlined"
            color={item.isArchived ? 'primary' : 'warning'}
            startIcon={item.isArchived ? <UnarchiveIcon /> : <ArchiveIcon />}
            onClick={handleArchiveDialogOpen}
            sx={{ mr: 1 }}
          >
            {item.isArchived ? 'Unarchive' : 'Archive'}
          </Button>
          
          <Button
            variant="outlined"
            color="error"
            startIcon={<DeleteIcon />}
            onClick={handleDeleteDialogOpen}
          >
            Delete
          </Button>
        </Box>
      </Box>
      
      <Grid container spacing={3}>
        {/* Main Details */}
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              Details
            </Typography>
            
            <TableContainer>
              <Table size="small">
                <TableBody>
                  <TableRow>
                    <TableCell component="th" scope="row" sx={{ width: '30%', fontWeight: 'bold' }}>
                      Description
                    </TableCell>
                    <TableCell>{item.description || '-'}</TableCell>
                  </TableRow>
                  
                  <TableRow>
                    <TableCell component="th" scope="row" sx={{ fontWeight: 'bold' }}>
                      Asset ID
                    </TableCell>
                    <TableCell>{item.assetId}</TableCell>
                  </TableRow>
                  
                  <TableRow>
                    <TableCell component="th" scope="row" sx={{ fontWeight: 'bold' }}>
                      Location
                    </TableCell>
                    <TableCell>
                      <Link component={RouterLink} to={`/locations/${item.location._id}`}>
                        {item.location.name}
                      </Link>
                    </TableCell>
                  </TableRow>
                  
                  <TableRow>
                    <TableCell component="th" scope="row" sx={{ fontWeight: 'bold' }}>
                      Full Path
                    </TableCell>
                    <TableCell>
                      {locationHierarchy.length > 0 ? (
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
                      ) : (
                        <Link component={RouterLink} to={`/locations/${item.location._id}`}>
                          {item.location.name}
                        </Link>
                      )}
                    </TableCell>
                  </TableRow>
                  
                  <TableRow>
                    <TableCell component="th" scope="row" sx={{ fontWeight: 'bold' }}>
                      Category
                    </TableCell>
                    <TableCell>
                      <Link component={RouterLink} to={`/categories/${item.category._id}`}>
                        {item.category.name}
                      </Link>
                    </TableCell>
                  </TableRow>
                  
                  <TableRow>
                    <TableCell component="th" scope="row" sx={{ fontWeight: 'bold' }}>
                      Labels
                    </TableCell>
                    <TableCell>
                      {item.labels.length > 0 ? (
                        <Box>
                          {item.labels.map((label) => (
                            <Chip
                              key={label._id}
                              label={label.name}
                              size="small"
                              component={RouterLink}
                              to={`/labels/${label._id}`}
                              clickable
                              sx={{
                                mr: 0.5,
                                mb: 0.5,
                                bgcolor: label.color,
                                color: 'white',
                              }}
                            />
                          ))}
                        </Box>
                      ) : (
                        '-'
                      )}
                    </TableCell>
                  </TableRow>
                  
                  <TableRow>
                    <TableCell component="th" scope="row" sx={{ fontWeight: 'bold' }}>
                      Quantity
                    </TableCell>
                    <TableCell>{item.quantity}</TableCell>
                  </TableRow>
                  
                  <TableRow>
                    <TableCell component="th" scope="row" sx={{ fontWeight: 'bold' }}>
                      Serial Number
                    </TableCell>
                    <TableCell>{item.serialNumber || '-'}</TableCell>
                  </TableRow>
                  
                  <TableRow>
                    <TableCell component="th" scope="row" sx={{ fontWeight: 'bold' }}>
                      Model Number
                    </TableCell>
                    <TableCell>{item.modelNumber || '-'}</TableCell>
                  </TableRow>
                  
                  <TableRow>
                    <TableCell component="th" scope="row" sx={{ fontWeight: 'bold' }}>
                      Manufacturer
                    </TableCell>
                    <TableCell>{item.manufacturer || '-'}</TableCell>
                  </TableRow>
                  
                  <TableRow>
                    <TableCell component="th" scope="row" sx={{ fontWeight: 'bold' }}>
                      UPC Code
                    </TableCell>
                    <TableCell>{item.upcCode || '-'}</TableCell>
                  </TableRow>
                  
                  <TableRow>
                    <TableCell component="th" scope="row" sx={{ fontWeight: 'bold' }}>
                      Item URL
                    </TableCell>
                    <TableCell>
                      {item.itemUrl ? (
                        <Link href={item.itemUrl} target="_blank" rel="noopener noreferrer">
                          {item.itemUrl}
                        </Link>
                      ) : '-'}
                    </TableCell>
                  </TableRow>
                  
                  <TableRow>
                    <TableCell component="th" scope="row" sx={{ fontWeight: 'bold' }}>
                      Manual URL
                    </TableCell>
                    <TableCell>
                      {item.manualUrl ? (
                        <Link href={item.manualUrl} target="_blank" rel="noopener noreferrer">
                          {item.manualUrl}
                        </Link>
                      ) : '-'}
                    </TableCell>
                  </TableRow>
                  
                  <TableRow>
                    <TableCell component="th" scope="row" sx={{ fontWeight: 'bold' }}>
                      Notes
                    </TableCell>
                    <TableCell>{item.notes || '-'}</TableCell>
                  </TableRow>
                  
                  <TableRow>
                    <TableCell component="th" scope="row" sx={{ fontWeight: 'bold' }}>
                      Insured
                    </TableCell>
                    <TableCell>{item.isInsured ? 'Yes' : 'No'}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
          
          {/* Purchase Details */}
          <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              Purchase Details
            </Typography>
            
            <TableContainer>
              <Table size="small">
                <TableBody>
                  <TableRow>
                    <TableCell component="th" scope="row" sx={{ width: '30%', fontWeight: 'bold' }}>
                      Purchased From
                    </TableCell>
                    <TableCell>{(item.purchaseDetails?.purchasedFrom || item.purchasedFrom) || '-'}</TableCell>
                  </TableRow>
                  
                  <TableRow>
                    <TableCell component="th" scope="row" sx={{ fontWeight: 'bold' }}>
                      Purchase Price
                    </TableCell>
                    <TableCell>
                      {(item.purchaseDetails?.purchasePrice || item.purchasePrice) 
                        ? `$${(item.purchaseDetails?.purchasePrice || item.purchasePrice).toFixed(2)}` 
                        : '-'}
                    </TableCell>
                  </TableRow>
                  
                  <TableRow>
                    <TableCell component="th" scope="row" sx={{ fontWeight: 'bold' }}>
                      Purchase Date
                    </TableCell>
                    <TableCell>
                      {(item.purchaseDetails?.purchaseDate || item.purchaseDate) 
                        ? new Date(item.purchaseDetails?.purchaseDate || item.purchaseDate).toLocaleDateString() 
                        : '-'}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
          
          {/* Warranty Details */}
          <Paper sx={{ p: 3, mb: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6">
                Warranty Details
              </Typography>
              
              <Box>
                {item.warrantyDetails && item.warrantyDetails.warrantyExpires && (
                  <Button
                    variant="outlined"
                    color="secondary"
                    startIcon={<WarrantyIcon />}
                    onClick={() => handleReminderDialogOpen('warranty')}
                    size="small"
                    sx={{ mr: 1 }}
                  >
                    Warranty Reminder
                  </Button>
                )}
                
                <Button
                  variant="outlined"
                  color="primary"
                  startIcon={<BuildIcon />}
                  onClick={() => handleReminderDialogOpen('maintenance')}
                  size="small"
                >
                  Maintenance Reminder
                </Button>
              </Box>
            </Box>
            
            <TableContainer>
              <Table size="small">
                <TableBody>
                  <TableRow>
                    <TableCell component="th" scope="row" sx={{ width: '30%', fontWeight: 'bold' }}>
                      Lifetime Warranty
                    </TableCell>
                    <TableCell>{item.warrantyDetails && item.warrantyDetails.hasLifetimeWarranty ? 'Yes' : 'No'}</TableCell>
                  </TableRow>
                  
                  {(!item.warrantyDetails || !item.warrantyDetails.hasLifetimeWarranty) && (
                    <TableRow>
                      <TableCell component="th" scope="row" sx={{ fontWeight: 'bold' }}>
                        Warranty Expires
                      </TableCell>
                      <TableCell>
                        {item.warrantyDetails && item.warrantyDetails.warrantyExpires 
                          ? new Date(item.warrantyDetails.warrantyExpires).toLocaleDateString() 
                          : '-'}
                      </TableCell>
                    </TableRow>
                  )}
                  
                  <TableRow>
                    <TableCell component="th" scope="row" sx={{ fontWeight: 'bold' }}>
                      Warranty Notes
                    </TableCell>
                    <TableCell>{item.warrantyDetails && item.warrantyDetails.warrantyNotes || '-'}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
          
          {/* Custom Fields */}
          {item.customFields && item.customFields.length > 0 && (
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Custom Fields
              </Typography>
              
              <TableContainer>
                <Table size="small">
                  <TableBody>
                    {item.customFields.map((field, index) => {
                      // Format the display value based on field type
                      // Handle case where field.value might be undefined
                      let displayValue = field.value !== undefined ? field.value : '';
                      let linkUrl = '';
                      
                      // Handle different field types
                      if (field.type === 'boolean' && field.value !== undefined) {
                        // Convert boolean values to Yes/No
                        displayValue = field.value === 'true' || field.value === true ? 'Yes' : 'No';
                      } else if (field.type === 'timestamp' && field.value !== undefined) {
                        // Format date for display
                        try {
                          const date = new Date(field.value);
                          if (!isNaN(date.getTime())) {
                            displayValue = date.toLocaleDateString();
                          }
                        } catch (e) {
                          // If date parsing fails, use the original value
                          console.error('Error parsing date:', e);
                        }
                      } else if (field.type === 'integer' && field.value !== undefined) {
                        // Format number with commas for thousands
                        try {
                          const num = parseInt(field.value);
                          if (!isNaN(num)) {
                            displayValue = num.toLocaleString();
                          }
                        } catch (e) {
                          // If number parsing fails, use the original value
                          console.error('Error parsing integer:', e);
                        }
                      } else if (field.value !== undefined) {
                        // Handle text fields, including URLs and Markdown links
                        const markdownLinkMatch = field.value.toString().match(/\[(.+?)\]\((.+?)\)/);
                        
                        if (markdownLinkMatch) {
                          // Extract the text and URL from the Markdown syntax
                          displayValue = markdownLinkMatch[1];
                          linkUrl = markdownLinkMatch[2];
                          
                          // Ensure URL has http/https
                          if (!linkUrl.startsWith('http')) {
                            linkUrl = `https://${linkUrl}`;
                          }
                        } else {
                          // Regular URL/email detection for non-Markdown values
                          const isUrl = /^(https?:\/\/)?(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)$/.test(field.value);
                          const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(field.value);
                          
                          if (isUrl) {
                            // Format URL for proper linking (ensure it has http/https)
                            linkUrl = !field.value.startsWith('http') 
                              ? `https://${field.value}` 
                              : field.value;
                          } else if (isEmail) {
                            // Format email for mailto link
                            linkUrl = `mailto:${field.value}`;
                          }
                        }
                      }
                      
                      return (
                        <TableRow key={index}>
                          <TableCell component="th" scope="row" sx={{ width: '30%', fontWeight: 'bold' }}>
                            {field.name}
                          </TableCell>
                          <TableCell>
                            {linkUrl ? (
                              <Link href={linkUrl} target="_blank" rel="noopener noreferrer">
                                {displayValue}
                              </Link>
                            ) : (
                              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                {displayValue}
                                {field.type && field.type !== 'text' && (
                                  <Chip 
                                    label={field.type} 
                                    size="small"
                                    color={
                                      field.type === 'timestamp' ? 'success' :
                                      field.type === 'integer' ? 'info' :
                                      field.type === 'boolean' ? 'warning' :
                                      'default'
                                    }
                                    sx={{ ml: 1, height: 20, fontSize: '0.7rem' }}
                                  />
                                )}
                              </Box>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>
          )}
        </Grid>
        
        {/* Sidebar */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              Item Information
            </Typography>
            
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" color="text.secondary">
                Created
              </Typography>
              <Typography variant="body1">
                {new Date(item.createdAt).toLocaleString()}
              </Typography>
            </Box>
            
            <Box>
              <Typography variant="body2" color="text.secondary">
                Last Updated
              </Typography>
              <Typography variant="body1">
                {new Date(item.updatedAt).toLocaleString()}
              </Typography>
            </Box>
          </Paper>
          
          {/* Loan Details */}
          <Paper sx={{ p: 3, mb: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6">
                Loan Status
              </Typography>
              
              {item.loanDetails && item.loanDetails.isLoaned ? (
                <Button
                  variant="contained"
                  color="primary"
                  startIcon={<CheckCircleIcon />}
                  onClick={handleReturnDialogOpen}
                >
                  Return Item
                </Button>
              ) : (
                <Button
                  variant="outlined"
                  color="primary"
                  startIcon={<PersonIcon />}
                  onClick={handleLoanDialogOpen}
                >
                  Loan Item
                </Button>
              )}
            </Box>
            
            {item.loanDetails && item.loanDetails.isLoaned ? (
              <TableContainer>
                <Table size="small">
                  <TableBody>
                    <TableRow>
                      <TableCell component="th" scope="row" sx={{ width: '30%', fontWeight: 'bold' }}>
                        Status
                      </TableCell>
                      <TableCell>
                        <Chip 
                          label="Loaned Out" 
                          color="primary" 
                          size="small"
                        />
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell component="th" scope="row" sx={{ fontWeight: 'bold' }}>
                        Loaned To
                      </TableCell>
                      <TableCell>{item.loanDetails.loanedTo}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell component="th" scope="row" sx={{ fontWeight: 'bold' }}>
                        Loan Date
                      </TableCell>
                      <TableCell>
                        {item.loanDetails.loanDate ? new Date(item.loanDetails.loanDate).toLocaleDateString() : '-'}
                      </TableCell>
                    </TableRow>
                    {item.loanDetails.notes && (
                      <TableRow>
                        <TableCell component="th" scope="row" sx={{ fontWeight: 'bold' }}>
                          Notes
                        </TableCell>
                        <TableCell>{item.loanDetails.notes}</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            ) : (
              <Typography variant="body2" color="text.secondary">
                This item is not currently loaned out.
              </Typography>
            )}
          </Paper>
          
          {/* Attachments */}
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Attachments
            </Typography>
            
            <Typography variant="body2" color="text.secondary">
              No attachments yet
            </Typography>
            
            <Button
              variant="outlined"
              fullWidth
              sx={{ mt: 2 }}
            >
              Add Attachment
            </Button>
          </Paper>
        </Grid>
      </Grid>
      
      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={handleDeleteDialogClose}
      >
        <DialogTitle>Delete Item</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete "{item.name}"? This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDeleteDialogClose}>Cancel</Button>
          <Button onClick={handleDelete} color="error" autoFocus>
            Delete
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Archive Confirmation Dialog */}
      <Dialog
        open={archiveDialogOpen}
        onClose={handleArchiveDialogClose}
      >
        <DialogTitle>
          {item.isArchived ? 'Unarchive' : 'Archive'} Item
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            {item.isArchived
              ? `Are you sure you want to unarchive "${item.name}"? This will make it active again.`
              : `Are you sure you want to archive "${item.name}"? Archived items are hidden from the main view.`
            }
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleArchiveDialogClose}>Cancel</Button>
          <Button onClick={handleArchiveToggle} color={item.isArchived ? 'primary' : 'warning'} autoFocus>
            {item.isArchived ? 'Unarchive' : 'Archive'}
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Loan Dialog */}
      <Dialog
        open={loanDialogOpen}
        onClose={handleLoanDialogClose}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Loan Item</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>
            Enter the details of who this item is being loaned to.
          </DialogContentText>
          
          {loanFormError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {loanFormError}
            </Alert>
          )}
          
          <TextField
            autoFocus
            margin="dense"
            id="loanedTo"
            name="loanedTo"
            label="Loaned To"
            type="text"
            fullWidth
            variant="outlined"
            value={loanFormData.loanedTo}
            onChange={handleLoanFormChange}
            required
            sx={{ mb: 2 }}
          />
          
          <TextField
            margin="dense"
            id="notes"
            name="notes"
            label="Notes"
            type="text"
            fullWidth
            variant="outlined"
            value={loanFormData.notes}
            onChange={handleLoanFormChange}
            multiline
            rows={3}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleLoanDialogClose}>Cancel</Button>
          <Button 
            onClick={handleLoanItem} 
            color="primary" 
            disabled={submittingLoan}
          >
            {submittingLoan ? 'Saving...' : 'Loan Item'}
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Return Dialog */}
      <Dialog
        open={returnDialogOpen}
        onClose={handleReturnDialogClose}
      >
        <DialogTitle>Return Item</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to mark this item as returned?
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleReturnDialogClose}>Cancel</Button>
          <Button onClick={handleReturnItem} color="primary" autoFocus>
            Mark as Returned
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Create Reminder Dialog */}
      <Dialog
        open={reminderDialogOpen}
        onClose={handleReminderDialogClose}
      >
        <DialogTitle>Create {reminderType === 'warranty' ? 'Warranty' : 'Maintenance'} Reminder</DialogTitle>
        <DialogContent>
          <DialogContentText>
            {reminderType === 'warranty' 
              ? `Create a reminder for the warranty expiration of "${item.name}".`
              : `Create a maintenance reminder for "${item.name}".`
            }
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleReminderDialogClose}>Cancel</Button>
          <Button onClick={handleCreateReminder} color="primary" autoFocus>
            Create Reminder
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Duplicate Confirmation Dialog */}
      <Dialog
        open={duplicateDialogOpen}
        onClose={() => setDuplicateDialogOpen(false)}
      >
        <DialogTitle>Duplicate Item</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to duplicate "{item.name}"? This will create a copy of the item with the same details.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDuplicateDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleDuplicateItem} color="primary" autoFocus>
            Duplicate
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default ItemDetail;

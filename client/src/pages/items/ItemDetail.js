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
  Alert,
  IconButton,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  ListItemSecondaryAction,
  Avatar,
  Checkbox,
  FormControlLabel
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
  Build as BuildIcon,
  VerifiedUser as WarrantyIcon,
  ContentCopy as DuplicateIcon,
  AttachFile as AttachFileIcon,
  Image as ImageIcon,
  Description as DocumentIcon,
  Download as DownloadIcon,
  Delete as DeleteAttachmentIcon,
  Visibility as ViewIcon,
  Photo as PrimaryPhotoIcon
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
  const [attachmentDialogOpen, setAttachmentDialogOpen] = useState(false);
  const [deleteAttachmentDialogOpen, setDeleteAttachmentDialogOpen] = useState(false);
  const [attachmentToDelete, setAttachmentToDelete] = useState(null);
  const [calculatorValue, setCalculatorValue] = useState('');
  const [calculatorOpen, setCalculatorOpen] = useState(false);
  const [loanFormData, setLoanFormData] = useState({
    loanedTo: '',
    notes: ''
  });
  const [loanFormError, setLoanFormError] = useState('');
  const [submittingLoan, setSubmittingLoan] = useState(false);
  const [uploadingAttachment, setUploadingAttachment] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [isPrimaryPhoto, setIsPrimaryPhoto] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    const fetchItem = async () => {
      try {
        setLoading(true);
        
        // Make API call to fetch the item with a cache-busting parameter
        const timestamp = new Date().getTime();
        const response = await axios.get(`/api/items/${id}?_=${timestamp}`);
        
        if (response.data.success) {
          console.log('Fetched item data:', response.data.data);
          console.log('Loan details in fetched item:', response.data.data.loanDetails);
          
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
    
    console.log('Loan form data being submitted:', loanFormData);

    try {
      // Make API call to loan the item
      const response = await axios.post(`/api/items/${id}/loan`, loanFormData);
      
      console.log('Loan API response:', response.data);
      
      if (response.data.success) {
        // Log the returned item data to see the loanDetails
        console.log('Updated item data after loan:', response.data.data);
        console.log('Loan details in response:', response.data.data.loanDetails);
        
        // Update the item state with the response data
        setItem(response.data.data);
        setSuccessAlert('Item loaned successfully');
        handleLoanDialogClose();
        
        // Force a reload to ensure we have the latest data
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      } else {
        setLoanFormError('Error loaning item: ' + response.data.message);
      }
    } catch (err) {
      console.error('Loan error:', err);
      console.error('Loan error response:', err.response?.data);
      setLoanFormError('Error loaning item: ' + (err.response?.data?.message || err.message));
    } finally {
      setSubmittingLoan(false);
    }
  };

  const handleCalculatorOpen = () => {
    setCalculatorValue('');
    setCalculatorOpen(true);
  };

  const handleCalculatorClose = () => {
    setCalculatorOpen(false);
  };

  const handleCalculatorChange = (e) => {
    setCalculatorValue(e.target.value);
  };

  const handleQuantityCalculation = async (operation) => {
    try {
      if (!calculatorValue || isNaN(Number(calculatorValue))) {
        return;
      }

      const changeAmount = Number(calculatorValue);
      if (changeAmount <= 0) {
        return;
      }

      // Calculate new quantity based on operation
      let newQuantity;
      if (operation === 'add') {
        newQuantity = (item.quantity || 0) + changeAmount;
      } else if (operation === 'subtract') {
        newQuantity = Math.max(0, (item.quantity || 0) - changeAmount);
      } else {
        return;
      }

      // Make API call to update only the quantity field
      const response = await axios.put(`/api/items/${id}`, {
        quantity: newQuantity
      });
      
      if (response.data.success) {
        // Update item state with the new quantity
        setItem({
          ...item,
          quantity: newQuantity
        });
        // Close the calculator dialog without showing a success message
        handleCalculatorClose();
      } else {
        setErrorAlert('Error updating quantity: ' + response.data.message);
      }
    } catch (err) {
      setErrorAlert('Error updating quantity: ' + (err.response?.data?.message || err.message));
      console.error(err);
    }
  };

  const handleReturnItem = async () => {
    try {
      // Make API call to return the item
      const response = await axios.post(`/api/items/${id}/return`);
      
      if (response.data.success) {
        console.log('Return API response:', response.data);
        console.log('Updated item data after return:', response.data.data);
        console.log('Loan details in response after return:', response.data.data.loanDetails);
        
        // Update the item state with the response data
        setItem(response.data.data);
        setSuccessAlert('Item returned successfully');
        handleReturnDialogClose();
        
        // Force a reload to ensure we have the latest data
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      } else {
        setErrorAlert('Error returning item: ' + response.data.message);
      }
    } catch (err) {
      console.error('Return error:', err);
      console.error('Return error response:', err.response?.data);
      setErrorAlert('Error returning item: ' + (err.response?.data?.message || err.message));
    }
  };

  const handleDelete = async () => {
    try {
      // Make API call to delete the item
      const response = await axios.delete(`/api/items/${id}`);
      
      if (response.data.success) {
        // Navigate immediately without showing a success message
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

  const handleDeleteAttachment = (attachmentId) => {
    // Find attachment details
    const attachment = item.attachments.find(att => att._id === attachmentId);
    if (attachment) {
      setAttachmentToDelete(attachment);
      setDeleteAttachmentDialogOpen(true);
    }
  };

  const handleConfirmDeleteAttachment = async () => {
    if (!attachmentToDelete) return;
    
    try {
      // Close dialog right away
      setDeleteAttachmentDialogOpen(false);
      
      // Get the ID before resetting attachmentToDelete
      const idToDelete = attachmentToDelete._id;
      setAttachmentToDelete(null);
      
      // Show a temporary message while we handle the operation
      setSuccessAlert('Deleting attachment...');
      
      // Wait a moment before trying to delete (gives time for UI to update)
      await new Promise(resolve => setTimeout(resolve, 500));
      
      try {
        // Try to delete on server
        await axios.delete(`/api/items/${id}/attachments/${idToDelete}`);
      } catch (apiError) {
        console.error('Server error deleting attachment:', apiError);
      }
      
      // Regardless of server success, force a complete page reload
      // This is the nuclear option but will ensure fresh data
      window.location.href = window.location.href;
      
    } catch (err) {
      console.error('Unexpected error:', err);
      setErrorAlert('Unexpected error: ' + err.message);
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
        // Update item state immediately without showing a success message
        setItem(response.data.data);
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

  const handleUploadAttachment = async () => {
    if (!selectedFile) return;
    
    setUploadingAttachment(true);
    
    try {
      // Create form data for the file upload
      const formData = new FormData();
      formData.append('file', selectedFile);
      
      // Add isPrimary flag if this is an image and should be primary
      if (selectedFile.type.startsWith('image/') && isPrimaryPhoto) {
        formData.append('isPrimary', 'true');
      }
      
      // Make API call to upload the attachment
      const response = await axios.post(
        `/api/items/${id}/attachments`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        }
      );
      
      if (response.data.success) {
        // Update the item state with the new attachment
        setItem(prev => ({
          ...prev,
          attachments: [...(prev.attachments || []), response.data.data]
        }));
        
        setSuccessAlert('Attachment uploaded successfully');
        setAttachmentDialogOpen(false);
        setSelectedFile(null);
        setIsPrimaryPhoto(false);
        
        // Force a reload to ensure we have the latest data
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      } else {
        setErrorAlert('Error uploading attachment: ' + response.data.message);
      }
    } catch (err) {
      console.error('Upload error:', err);
      setErrorAlert('Error uploading attachment: ' + (err.response?.data?.message || err.message));
    } finally {
      setUploadingAttachment(false);
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
                                <NavigateNextIcon key={`nav-${index}`} fontSize="small" sx={{ mx: 0.5 }} />
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
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <Typography variant="body1" component="span">{item.quantity || 0}</Typography>
                        <Button 
                          size="small" 
                          variant="contained" 
                          color="primary"
                          sx={{ ml: 2 }}
                          onClick={handleCalculatorOpen}
                        >
                          Calculator
                        </Button>
                      </Box>
                    </TableCell>
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
                  >
                    Set Warranty Reminder
                  </Button>
                )}
              </Box>
            </Box>
            
            <TableContainer>
              <Table size="small">
                <TableBody>
                  <TableRow>
                    <TableCell component="th" scope="row" sx={{ width: '30%', fontWeight: 'bold' }}>
                      Lifetime Warranty
                    </TableCell>
                    <TableCell>
                      {item.warrantyDetails?.hasLifetimeWarranty ? 'Yes' : 'No'}
                    </TableCell>
                  </TableRow>
                  
                  {!item.warrantyDetails?.hasLifetimeWarranty && (
                    <TableRow>
                      <TableCell component="th" scope="row" sx={{ fontWeight: 'bold' }}>
                        Warranty Expiration
                      </TableCell>
                      <TableCell>
                        {item.warrantyDetails?.warrantyExpires 
                          ? new Date(item.warrantyDetails.warrantyExpires).toLocaleDateString() 
                          : '-'}
                      </TableCell>
                    </TableRow>
                  )}
                  
                  <TableRow>
                    <TableCell component="th" scope="row" sx={{ fontWeight: 'bold' }}>
                      Warranty Notes
                    </TableCell>
                    <TableCell>{item.warrantyDetails?.warrantyNotes || '-'}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
          
          {/* Attachments */}
          <Paper sx={{ p: 3, mb: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6">
                Attachments
              </Typography>
              
              <Chip 
                label="Cloud Storage Coming Soon" 
                color="primary" 
                variant="outlined" 
              />
            </Box>
            
            <Alert severity="info" sx={{ mb: 2 }}>
              Attachment uploads are temporarily disabled while we transition to a new cloud storage system. Existing attachments are still viewable.
            </Alert>
            
            {item.attachments && item.attachments.length > 0 ? (
              <List>
                {item.attachments.map((attachment) => (
                  <ListItem key={attachment._id}>
                    <ListItemAvatar>
                      <Avatar>
                        {attachment.mimeType?.startsWith('image/') ? (
                          <ImageIcon />
                        ) : (
                          <DocumentIcon />
                        )}
                      </Avatar>
                    </ListItemAvatar>
                    
                    <ListItemText 
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          {attachment.name || attachment.filename || 'Attachment'}
                          {attachment.isPrimary && (
                            <Chip 
                              size="small" 
                              label="Primary" 
                              color="primary" 
                              sx={{ ml: 1 }}
                              icon={<PrimaryPhotoIcon fontSize="small" />} 
                            />
                          )}
                        </Box>
                      }
                      secondary={attachment.uploadDate ? 
                        `Added ${new Date(attachment.uploadDate).toLocaleDateString()}` : 
                        'Recently added'
                      }
                    />
                    
                    <ListItemSecondaryAction>
                      <IconButton 
                        edge="end" 
                        aria-label="view"
                        href={`/uploads/${attachment.filePath}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <ViewIcon />
                      </IconButton>
                      
                      <IconButton 
                        edge="end" 
                        aria-label="download"
                        href={`/uploads/${attachment.filePath}`}
                        download={attachment.name || "attachment"}
                      >
                        <DownloadIcon />
                      </IconButton>
                      
                      <IconButton 
                        edge="end" 
                        aria-label="delete"
                        onClick={() => handleDeleteAttachment(attachment._id)}
                      >
                        <DeleteAttachmentIcon />
                      </IconButton>
                    </ListItemSecondaryAction>
                  </ListItem>
                ))}
              </List>
            ) : (
              <Box sx={{ textAlign: 'center', py: 3 }}>
                <Typography color="text.secondary">
                  No attachments yet
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  Attachment uploads will be available soon with our new cloud storage system.
                </Typography>
              </Box>
            )}
          </Paper>
          
          {/* Attachment Upload Dialog */}
          <Dialog open={attachmentDialogOpen} onClose={() => setAttachmentDialogOpen(false)}>
            <DialogTitle>Upload Attachment</DialogTitle>
            <DialogContent>
              <DialogContentText sx={{ mb: 2 }}>
                Select a file to attach to this item. Supported file types include images, PDFs, and documents.
              </DialogContentText>
              
              <input
                type="file"
                onChange={(e) => setSelectedFile(e.target.files[0])}
                style={{ display: 'none' }}
                ref={fileInputRef}
              />
              
              <Button
                variant="outlined"
                component="span"
                onClick={() => fileInputRef.current.click()}
                startIcon={<AttachFileIcon />}
                fullWidth
                sx={{ mb: 2 }}
              >
                {selectedFile ? selectedFile.name : 'Select File'}
              </Button>
              
              {selectedFile && selectedFile.type.startsWith('image/') && (
                <Box sx={{ mb: 2 }}>
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={isPrimaryPhoto}
                        onChange={(e) => setIsPrimaryPhoto(e.target.checked)}
                      />
                    }
                    label="Set as primary photo"
                  />
                </Box>
              )}
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setAttachmentDialogOpen(false)}>Cancel</Button>
              <Button 
                onClick={handleUploadAttachment}
                disabled={!selectedFile || uploadingAttachment}
                color="primary"
              >
                {uploadingAttachment ? <CircularProgress size={24} /> : 'Upload'}
              </Button>
            </DialogActions>
          </Dialog>
          
          {/* Delete Attachment Dialog */}
          <Dialog open={deleteAttachmentDialogOpen} onClose={() => setDeleteAttachmentDialogOpen(false)}>
            <DialogTitle>Delete Attachment</DialogTitle>
            <DialogContent>
              <DialogContentText>
                Are you sure you want to delete this attachment?
                {attachmentToDelete && (
                  <Box component="span" sx={{ fontWeight: 'bold', display: 'block', mt: 1 }}>
                    {attachmentToDelete.filename}
                  </Box>
                )}
              </DialogContentText>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setDeleteAttachmentDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleConfirmDeleteAttachment} color="error">Delete</Button>
            </DialogActions>
          </Dialog>
        </Grid>
        
        {/* Sidebar */}
        <Grid item xs={12} md={4}>
          {/* Loan Status */}
          {item.loanDetails && (
            <Paper sx={{ p: 3, mb: 3 }}>
              <Typography variant="h6" gutterBottom>
                Loan Status
              </Typography>
              
              {item.loanDetails.isLoaned ? (
                <>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <PersonIcon sx={{ mr: 1, color: 'primary.main' }} />
                    <Typography>
                      Loaned to <strong>{item.loanDetails.loanedTo}</strong>
                    </Typography>
                  </Box>
                  
                  {item.loanDetails.loanDate && (
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                      Loaned on {new Date(item.loanDetails.loanDate).toLocaleDateString()}
                    </Typography>
                  )}
                  
                  {item.loanDetails.notes && (
                    <Box sx={{ mt: 2, mb: 2 }}>
                      <Typography variant="body2" color="text.secondary">
                        Notes:
                      </Typography>
                      <Typography variant="body2">
                        {item.loanDetails.notes}
                      </Typography>
                    </Box>
                  )}
                  
                  <Button
                    variant="contained"
                    startIcon={<CheckCircleIcon />}
                    onClick={handleReturnDialogOpen}
                    fullWidth
                    sx={{ mt: 2 }}
                  >
                    Mark as Returned
                  </Button>
                </>
              ) : (
                <>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <CheckCircleIcon sx={{ mr: 1, color: 'success.main' }} />
                    <Typography>Not currently loaned</Typography>
                  </Box>
                  
                  <Button
                    variant="outlined"
                    startIcon={<PersonIcon />}
                    onClick={handleLoanDialogOpen}
                    fullWidth
                  >
                    Loan This Item
                  </Button>
                </>
              )}
            </Paper>
          )}
          
          {/* Reminders Section */}
          <Paper sx={{ p: 3, mb: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6">
                Reminders
              </Typography>
            </Box>
            
            <Typography paragraph>
              Set up reminders for important dates related to this item.
            </Typography>
            
            <Button
              variant="outlined"
              startIcon={<BuildIcon />}
              onClick={() => handleReminderDialogOpen('maintenance')}
              fullWidth
              sx={{ mb: 1 }}
            >
              Maintenance Reminder
            </Button>
            
            <Button
              variant="outlined"
              startIcon={<WarrantyIcon />}
              onClick={() => handleReminderDialogOpen('warranty')}
              fullWidth
              disabled={!item.warrantyDetails || !item.warrantyDetails.warrantyExpires}
            >
              Warranty Reminder
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
      
      {/* Archive/Unarchive Confirmation Dialog */}
      <Dialog
        open={archiveDialogOpen}
        onClose={handleArchiveDialogClose}
      >
        <DialogTitle>{item.isArchived ? 'Unarchive' : 'Archive'} Item</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to {item.isArchived ? 'unarchive' : 'archive'} "{item.name}"?
            {!item.isArchived && ' Archived items will still be accessible but will be hidden from the main items list.'}
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
      >
        <DialogTitle>Loan Item</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Enter the details of who this item is being loaned to.
          </DialogContentText>
          
          {loanFormError && (
            <Alert severity="error" sx={{ mt: 2, mb: 2 }}>
              {loanFormError}
            </Alert>
          )}
          
          <TextField
            margin="dense"
            name="loanedTo"
            label="Loaned To"
            fullWidth
            variant="outlined"
            value={loanFormData.loanedTo}
            onChange={handleLoanFormChange}
            required
            sx={{ mt: 2 }}
          />
          
          <TextField
            margin="dense"
            name="notes"
            label="Notes"
            fullWidth
            variant="outlined"
            value={loanFormData.notes}
            onChange={handleLoanFormChange}
            multiline
            rows={3}
            sx={{ mt: 2 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleLoanDialogClose}>Cancel</Button>
          <Button 
            onClick={handleLoanItem} 
            color="primary"
            disabled={submittingLoan}
          >
            {submittingLoan ? <CircularProgress size={24} /> : 'Loan Item'}
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Return Confirmation Dialog */}
      <Dialog
        open={returnDialogOpen}
        onClose={handleReturnDialogClose}
      >
        <DialogTitle>Return Item</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to mark this item as returned from {item.loanDetails?.loanedTo}?
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
              ? `Create a reminder for the warranty expiration on ${item.warrantyDetails?.warrantyExpires ? new Date(item.warrantyDetails.warrantyExpires).toLocaleDateString() : 'this item'}.` 
              : 'Create a maintenance reminder for this item.'}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleReminderDialogClose}>Cancel</Button>
          <Button onClick={handleCreateReminder} color="primary">
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

      {/* Quantity Calculator Dialog */}
      <Dialog
        open={calculatorOpen}
        onClose={handleCalculatorClose}
      >
        <DialogTitle>Update Quantity</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Current quantity: <strong>{item.quantity || 0}</strong>
          </DialogContentText>
          
          <Box sx={{ mt: 2, mb: 1 }}>
            <TextField
              label="Amount to change"
              type="number"
              fullWidth
              value={calculatorValue}
              onChange={handleCalculatorChange}
              InputProps={{ inputProps: { min: 1 } }}
            />
          </Box>
          
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 3 }}>
            <Button 
              variant="contained" 
              color="primary"
              onClick={() => handleQuantityCalculation('add')}
              disabled={!calculatorValue || isNaN(Number(calculatorValue)) || Number(calculatorValue) <= 0}
            >
              Add ({calculatorValue ? `= ${(item.quantity || 0) + Number(calculatorValue)}` : ''})
            </Button>
            
            <Button 
              variant="contained" 
              color="secondary"
              onClick={() => handleQuantityCalculation('subtract')}
              disabled={!calculatorValue || isNaN(Number(calculatorValue)) || Number(calculatorValue) <= 0}
            >
              Subtract ({calculatorValue ? `= ${Math.max(0, (item.quantity || 0) - Number(calculatorValue))}` : ''})
            </Button>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCalculatorClose}>Cancel</Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default ItemDetail;

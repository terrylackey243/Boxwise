import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMobile } from '../../context/MobileContext';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  InputAdornment,
  IconButton,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Typography,
  Box,
  Divider,
  CircularProgress,
  Chip
} from '@mui/material';
import {
  Search as SearchIcon,
  QrCodeScanner as QrCodeScannerIcon,
  Close as CloseIcon,
  Info as InfoIcon,
  Add as AddIcon
} from '@mui/icons-material';
import axios from '../../utils/axiosConfig';

/**
 * MobileShoppingAssistant component
 * 
 * This component provides a mobile-friendly interface for quickly searching inventory
 * while shopping to avoid duplicate purchases. It allows users to search by name or
 * scan a UPC code to check if an item already exists in their inventory.
 */
const MobileShoppingAssistant = ({ open = false, onClose }) => {
  const { openScanner, lastScannedCode, clearLastScannedCode } = useMobile();
  const navigate = useNavigate();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [scannedItem, setScannedItem] = useState(null);
  
  // Reset state when opened
  React.useEffect(() => {
    if (open) {
      setSearchQuery('');
      setSearchResults([]);
      setError(null);
      setScannedItem(null);
    }
  }, [open]);
  
  // Close the shopping assistant
  const handleClose = () => {
    if (onClose) {
      onClose();
    }
    clearLastScannedCode();
  };
  
  // Handle search query change
  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value);
  };
  
  // Handle search submission
  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await axios.get(`/api/items?search=${encodeURIComponent(searchQuery)}`);
      
      if (response.data.success) {
        setSearchResults(response.data.data || []);
      } else {
        setError('Error searching items: ' + response.data.message);
      }
    } catch (err) {
      setError('Error searching items: ' + (err.response?.data?.message || err.message));
      console.error(err);
    } finally {
      setLoading(false);
    }
  };
  
  // Handle barcode scan
  const handleScan = () => {
    openScanner();
  };
  
  // Check for scanned code and search for it
  React.useEffect(() => {
    if (lastScannedCode && open) {
      // Search for the scanned UPC code
      const searchUPC = async () => {
        setLoading(true);
        setError(null);
        
        try {
          // First check if we have this UPC in our inventory
          const itemResponse = await axios.get(`/api/items?upcCode=${encodeURIComponent(lastScannedCode)}`);
          
          if (itemResponse.data.success && itemResponse.data.data.length > 0) {
            // We found the item in our inventory
            setSearchResults(itemResponse.data.data);
            setScannedItem(null);
          } else {
            // Item not in inventory, try to look up product info
            try {
              const upcResponse = await axios.get(`/api/upc/${lastScannedCode}`);
              
              if (upcResponse.data.success) {
                // Found product info but not in inventory
                setSearchResults([]);
                setScannedItem(upcResponse.data.data);
              } else {
                // No product info found
                setSearchResults([]);
                setScannedItem(null);
                setError('No product found for this UPC code');
              }
            } catch (upcErr) {
              // Error looking up UPC
              setSearchResults([]);
              setScannedItem(null);
              setError('Error looking up UPC code: ' + (upcErr.response?.data?.message || upcErr.message));
            }
          }
        } catch (err) {
          setError('Error searching items: ' + (err.response?.data?.message || err.message));
          console.error(err);
        } finally {
          setLoading(false);
        }
      };
      
      searchUPC();
    }
  }, [lastScannedCode, open]);
  
  // Navigate to item detail
  const handleViewItem = (itemId) => {
    navigate(`/items/${itemId}`);
    handleClose();
  };
  
  // Navigate to create item with scanned product info
  const handleAddScannedItem = () => {
    if (scannedItem) {
      // Navigate to create item page with pre-filled info
      navigate('/items/create', { 
        state: { 
          prefillData: {
            name: scannedItem.name,
            description: scannedItem.description,
            manufacturer: scannedItem.manufacturer,
            modelNumber: scannedItem.modelNumber,
            upcCode: scannedItem.upcCode
          } 
        } 
      });
      handleClose();
    }
  };
  
  return (
    <Dialog
      open={open}
      onClose={handleClose}
      fullWidth
      maxWidth="sm"
    >
      <DialogTitle>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6">
            Shopping Assistant
          </Typography>
          <IconButton onClick={handleClose} size="small">
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>
      
      <DialogContent>
        <Typography variant="body2" color="text.secondary" paragraph>
          Check if you already own an item before purchasing it. Search by name or scan a barcode.
        </Typography>
        
        <Box sx={{ mb: 2, display: 'flex' }}>
          <TextField
            fullWidth
            label="Search Inventory"
            value={searchQuery}
            onChange={handleSearchChange}
            placeholder="Enter item name or description"
            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton onClick={handleSearch} size="small">
                    <SearchIcon />
                  </IconButton>
                </InputAdornment>
              )
            }}
            sx={{ mr: 1 }}
          />
          <Button
            variant="contained"
            color="primary"
            onClick={handleScan}
            startIcon={<QrCodeScannerIcon />}
          >
            Scan
          </Button>
        </Box>
        
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress />
          </Box>
        ) : error ? (
          <Box sx={{ py: 2, px: 2, bgcolor: 'error.light', borderRadius: 1, color: 'error.contrastText' }}>
            <Typography>{error}</Typography>
          </Box>
        ) : searchResults.length > 0 ? (
          <>
            <Typography variant="subtitle1" sx={{ mt: 2, mb: 1, fontWeight: 'bold', color: 'success.main' }}>
              Found {searchResults.length} item(s) in your inventory:
            </Typography>
            <List>
              {searchResults.map((item) => (
                <React.Fragment key={item._id}>
                  <ListItem button onClick={() => handleViewItem(item._id)}>
                    <ListItemText
                      primary={item.name}
                      secondary={
                        <>
                          <Typography variant="body2" component="span" color="text.secondary">
                            {item.category?.name} • {item.location?.name}
                          </Typography>
                          <br />
                          <Typography variant="body2" component="span" color="text.secondary">
                            Quantity: {item.quantity}
                          </Typography>
                        </>
                      }
                    />
                    <ListItemSecondaryAction>
                      <IconButton edge="end" onClick={() => handleViewItem(item._id)}>
                        <InfoIcon />
                      </IconButton>
                    </ListItemSecondaryAction>
                  </ListItem>
                  <Divider />
                </React.Fragment>
              ))}
            </List>
          </>
        ) : scannedItem ? (
          <Box sx={{ mt: 2, p: 2, bgcolor: 'info.light', borderRadius: 1 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
              Product Found, Not In Your Inventory:
            </Typography>
            <Typography variant="h6" sx={{ mt: 1 }}>
              {scannedItem.name}
            </Typography>
            {scannedItem.manufacturer && (
              <Typography variant="body2">
                Manufacturer: {scannedItem.manufacturer}
              </Typography>
            )}
            {scannedItem.description && (
              <Typography variant="body2" sx={{ mt: 1 }}>
                {scannedItem.description}
              </Typography>
            )}
            <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
              <Button
                variant="contained"
                color="primary"
                startIcon={<AddIcon />}
                onClick={handleAddScannedItem}
              >
                Add to Inventory
              </Button>
            </Box>
          </Box>
        ) : lastScannedCode ? (
          <Box sx={{ mt: 2, p: 2, bgcolor: 'warning.light', borderRadius: 1 }}>
            <Typography>
              No items found for UPC code: {lastScannedCode}
            </Typography>
          </Box>
        ) : null}
      </DialogContent>
      
      <DialogActions>
        <Button onClick={handleClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
};

export { MobileShoppingAssistant };

// Hook to use the shopping assistant
export const useShoppingAssistant = () => {
  const [isOpen, setIsOpen] = useState(false);
  
  const openShoppingAssistant = () => setIsOpen(true);
  const closeShoppingAssistant = () => setIsOpen(false);
  
  const ShoppingAssistantDialog = () => {
    if (!isOpen) return null;
    
    return (
      <MobileShoppingAssistant
        open={isOpen}
        onClose={closeShoppingAssistant}
      />
    );
  };
  
  return {
    openShoppingAssistant,
    closeShoppingAssistant,
    ShoppingAssistantDialog
  };
};

export default MobileShoppingAssistant;

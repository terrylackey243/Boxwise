import React, { useState, useContext } from 'react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import axios from '../../utils/axiosConfig';
import bulkService from '../../services/bulkService';
import { useMobile } from '../../context/MobileContext';
import {
  Container,
  Box,
  Button,
  Typography,
  CircularProgress,
  Breadcrumbs,
  Link,
  Paper,
  TablePagination
} from '@mui/material';
import {
  Add as AddIcon,
  Clear as ClearIcon
} from '@mui/icons-material';
import { AlertContext } from '../../context/AlertContext';
import BarcodeScanner from '../../components/scanner/BarcodeScanner';
import SpreadsheetBulkAddDialog from '../../components/bulk/SpreadsheetBulkAddDialog';
import useIsMobile from '../../hooks/useIsMobile';
import useItemSearch from '../../hooks/useItemSearch';
import ItemsTable from '../../components/items/ItemsTable';
import ItemsCards from '../../components/items/ItemsCards';
import ItemActionMenu from '../../components/items/ItemActionMenu';
import ItemSearchFilters from '../../components/items/ItemSearchFilters';
import MobileActionButtons from '../../components/items/MobileActionButtons';

const Items = () => {
  const { setErrorAlert, setSuccessAlert } = useContext(AlertContext);
  const navigate = useNavigate();
  
  // Menu state
  const [actionMenuAnchor, setActionMenuAnchor] = useState(null);
  const [selectedItemId, setSelectedItemId] = useState(null);
  
  // Scanner state
  const [scannerOpen, setScannerOpen] = useState(false);
  const isMobile = useIsMobile();
  const { openShoppingAssistant } = useMobile();
  
  // Bulk add state
  const [bulkAddOpen, setBulkAddOpen] = useState(false);

  // Use the custom hook for search functionality
  const {
    loading,
    items,
    filteredItems,
    searchInputValue,
    page,
    rowsPerPage,
    totalItems,
    filters,
    handleSearchChange,
    handleClearSearch,
    handleChangePage,
    handleChangeRowsPerPage,
    handleFilterChange,
    handleClearFilters,
    setItems,
    setFilteredItems,
    setTotalItems
  } = useItemSearch({
    onError: setErrorAlert
  });

  // Sort state
  const [sortField, setSortField] = useState('name');
  const [sortDirection, setSortDirection] = useState('asc');

  const handleActionMenuOpen = (event, itemId) => {
    setActionMenuAnchor(event.currentTarget);
    setSelectedItemId(itemId);
  };

  const handleActionMenuClose = () => {
    setActionMenuAnchor(null);
    setSelectedItemId(null);
  };

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const handleDeleteItem = async (itemId) => {
    try {
      // Make API call to delete the item
      await axios.delete(`/api/items/${itemId}`);
      
      // Close the action menu
      handleActionMenuClose();
      
      // Show success message
      setSuccessAlert('Item deleted successfully');
      
      // Refresh the items list from the server
      refreshItems();
    } catch (err) {
      setErrorAlert('Error deleting item: ' + (err.response?.data?.message || err.message));
      console.error(err);
    }
  };

  const handleArchiveItem = async (itemId) => {
    try {
      // Find the item to archive
      const itemToArchive = items.find(item => item._id === itemId);
      if (!itemToArchive) return;
      
      // Make API call to update the item with isArchived set to true
      await axios.put(`/api/items/${itemId}`, {
        ...itemToArchive,
        isArchived: true
      });
      
      // Close the action menu
      handleActionMenuClose();
      
      // Show success message
      setSuccessAlert('Item archived successfully');
      
      // Refresh the items list from the server
      refreshItems();
    } catch (err) {
      setErrorAlert('Error archiving item: ' + (err.response?.data?.message || err.message));
      console.error(err);
    }
  };

  // Helper function to refresh items
  const refreshItems = async () => {
    try {
      // Make API call to fetch items with current pagination and filters
      const params = new URLSearchParams();
      
      // Pagination parameters
      params.set('page', page + 1); // API uses 1-based indexing
      params.set('limit', rowsPerPage);
      
      // Filter parameters
      if (filters.archived === true) {
        params.set('archived', 'true');
      }
      
      if (filters.location) {
        params.set('location', filters.location);
      }
      
      if (filters.category) {
        params.set('category', filters.category);
      }
      
      if (filters.label) {
        params.set('label', filters.label);
      }
      
      const response = await axios.get(`/api/items?${params.toString()}`);
      
      if (response.data.success) {
        setItems(response.data.data);
        setFilteredItems(response.data.data);
        setTotalItems(response.data.total);
      } else {
        setErrorAlert('Failed to refresh items');
      }
    } catch (err) {
      setErrorAlert('Error refreshing items: ' + (err.response?.data?.message || err.message));
      console.error(err);
    }
  };

  // Handle barcode scanner
  const handleOpenScanner = () => {
    setScannerOpen(true);
  };

  const handleCloseScanner = () => {
    setScannerOpen(false);
  };

  const handleBarcodeDetected = async (code) => {
    console.log('Barcode detected:', code);
    
    // Close the scanner
    setScannerOpen(false);
    
    // Set the search term to the detected barcode
    handleSearchChange({ target: { value: code } });
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

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      {/* Breadcrumbs */}
      <Breadcrumbs sx={{ mb: 2 }}>
        <Link component={RouterLink} to="/dashboard" underline="hover" color="inherit">
          Dashboard
        </Link>
        <Typography color="text.primary">Items</Typography>
      </Breadcrumbs>
      
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" component="h1">
            Items
          </Typography>
          {(filters.category || filters.label || filters.location) && (
            <Typography variant="subtitle1" color="text.secondary">
              {filters.category && 'Filtered by Category'}
              {filters.label && 'Filtered by Label'}
              {filters.location && 'Filtered by Location'}
              {' '}
              <Button 
                size="small" 
                onClick={handleClearFilters}
                startIcon={<ClearIcon />}
              >
                Clear Filter
              </Button>
            </Typography>
          )}
        </Box>
        
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
            color="primary"
            startIcon={<AddIcon />}
            component={RouterLink}
            to="/items/create"
          >
            Add Item
          </Button>
        </Box>
      </Box>
      
      {/* Search and Filters */}
      <ItemSearchFilters
        searchValue={searchInputValue}
        onSearchChange={handleSearchChange}
        onClearSearch={handleClearSearch}
        filters={filters}
        onFilterChange={handleFilterChange}
        onClearFilters={handleClearFilters}
        sortField={sortField}
        sortDirection={sortDirection}
        onSort={handleSort}
        onScanBarcode={handleOpenScanner}
      />
      
      {/* Items List - Responsive Layout */}
      <Box>
        {/* Desktop View - Table */}
        <Box sx={{ display: { xs: 'none', md: 'block' } }}>
          <ItemsTable
            items={filteredItems}
            onActionClick={handleActionMenuOpen}
          />
        </Box>

        {/* Mobile View - Cards */}
        <Box sx={{ display: { xs: 'block', md: 'none' } }}>
          <ItemsCards
            items={filteredItems}
            onActionClick={handleActionMenuOpen}
          />
        </Box>
        
        {filteredItems.length > 0 && (
          <Paper sx={{ mt: 2 }}>
            <TablePagination
              component="div"
              count={totalItems}
              page={page}
              onPageChange={handleChangePage}
              rowsPerPage={rowsPerPage}
              onRowsPerPageChange={handleChangeRowsPerPage}
              rowsPerPageOptions={[5, 10, 25, 50]}
            />
          </Paper>
        )}
      </Box>
      
      {/* Barcode Scanner */}
      <BarcodeScanner
        open={scannerOpen}
        onClose={handleCloseScanner}
        onDetected={handleBarcodeDetected}
      />
      
      {/* Mobile Action Buttons */}
      {isMobile && (
        <MobileActionButtons
          onScanBarcode={handleOpenScanner}
          onOpenShoppingAssistant={openShoppingAssistant}
        />
      )}
      
      {/* Spreadsheet Bulk Add Dialog */}
      <SpreadsheetBulkAddDialog
        open={bulkAddOpen}
        onClose={() => setBulkAddOpen(false)}
        onSubmit={async (items) => {
          try {
            const result = await bulkService.bulkAdd('items', items);
            setSuccessAlert(`Successfully added ${result.count} items`);
            
            // Refresh the items list
            refreshItems();
            
            return result;
          } catch (err) {
            setErrorAlert('Error adding items: ' + (err.message || 'Unknown error'));
            throw err;
          }
        }}
        entityType="items"
        fields={{
          // Basic information
          name: {
            label: 'Name',
            required: true
          },
          description: {
            label: 'Description',
            multiline: true,
            rows: 2
          },
          location: {
            label: 'Location',
            required: true
          },
          category: {
            label: 'Category',
            required: true
          },
          labels: {
            label: 'Labels'
          },
          
          // Details
          quantity: {
            label: 'Quantity',
            type: 'number'
          },
          serialNumber: {
            label: 'Serial Number'
          },
          modelNumber: {
            label: 'Model Number'
          },
          manufacturer: {
            label: 'Manufacturer'
          },
          upcCode: {
            label: 'UPC Code'
          },
          
          // Purchase details
          purchasedFrom: {
            label: 'Purchased From'
          },
          purchasePrice: {
            label: 'Purchase Price',
            type: 'number'
          },
          purchaseDate: {
            label: 'Purchase Date',
            type: 'date'
          },
          
          // URLs
          itemUrl: {
            label: 'Item URL'
          },
          manualUrl: {
            label: 'Manual URL'
          },
          
          // Warranty details
          hasLifetimeWarranty: {
            label: 'Lifetime Warranty',
            type: 'boolean'
          },
          warrantyExpires: {
            label: 'Warranty Expires',
            type: 'date'
          },
          warrantyNotes: {
            label: 'Warranty Notes',
            multiline: true,
            rows: 2
          },
          
          // Status
          isInsured: {
            label: 'Insured',
            type: 'boolean'
          },
          isArchived: {
            label: 'Archived',
            type: 'boolean'
          },
          
          // Notes
          notes: {
            label: 'Notes',
            multiline: true,
            rows: 2
          }
        }}
      />
      
      {/* Action Menu */}
      <ItemActionMenu
        anchorEl={actionMenuAnchor}
        open={Boolean(actionMenuAnchor)}
        onClose={handleActionMenuClose}
        itemId={selectedItemId}
        onArchive={handleArchiveItem}
        onDelete={handleDeleteItem}
      />
    </Container>
  );
};

export default Items;

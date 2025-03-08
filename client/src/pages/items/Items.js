import React, { useState, useEffect, useContext } from 'react';
import { Link as RouterLink, useLocation, useNavigate } from 'react-router-dom';
import axios from '../../utils/axiosConfig';
import {
  Container,
  Grid,
  Paper,
  Typography,
  Box,
  Button,
  TextField,
  InputAdornment,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Chip,
  CircularProgress,
  Breadcrumbs,
  Link,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Divider
} from '@mui/material';
import {
  Search as SearchIcon,
  Add as AddIcon,
  FilterList as FilterListIcon,
  Sort as SortIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Archive as ArchiveIcon,
  MoreVert as MoreVertIcon,
  Clear as ClearIcon
} from '@mui/icons-material';
import { AlertContext } from '../../context/AlertContext';

const Items = () => {
  const { setErrorAlert } = useContext(AlertContext);
  const location = useLocation();
  const navigate = useNavigate();
  
  // Parse query parameters
  const queryParams = new URLSearchParams(location.search);
  const categoryParam = queryParams.get('category');
  const labelParam = queryParams.get('label');
  const locationParam = queryParams.get('location');
  
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState([]);
  const [filteredItems, setFilteredItems] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [totalItems, setTotalItems] = useState(0);
  
  // Menu state
  const [filterMenuAnchor, setFilterMenuAnchor] = useState(null);
  const [sortMenuAnchor, setSortMenuAnchor] = useState(null);
  const [actionMenuAnchor, setActionMenuAnchor] = useState(null);
  const [selectedItemId, setSelectedItemId] = useState(null);
  
  // Filter state
  const [filters, setFilters] = useState({
    location: locationParam || '',
    category: categoryParam || '',
    label: labelParam || '',
    archived: false
  });
  
  // Sort state
  const [sortField, setSortField] = useState('name');
  const [sortDirection, setSortDirection] = useState('asc');

  useEffect(() => {
    const fetchItems = async () => {
      try {
        setLoading(true);
        
        // Make API call to fetch items with pagination and filters
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
        
        // Search parameter
        if (searchTerm) {
          params.set('search', searchTerm);
        }
        
        console.log('Fetching items with params:', params.toString());
        const response = await axios.get(`/api/items?${params.toString()}`);
        
        if (response.data.success) {
          setItems(response.data.data);
          setFilteredItems(response.data.data);
          setTotalItems(response.data.total);
          console.log('Fetched items:', response.data.data.length, 'Total:', response.data.total);
        } else {
          setErrorAlert('Failed to load items');
        }
        
        setLoading(false);
      } catch (err) {
        setErrorAlert('Error loading items: ' + (err.response?.data?.message || err.message));
        setLoading(false);
        console.error(err);
      }
    };
    
    fetchItems();
  }, [page, rowsPerPage, searchTerm, filters, setErrorAlert]);

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
    setPage(0);
  };

  const handleClearSearch = () => {
    setSearchTerm('');
  };

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleFilterMenuOpen = (event) => {
    setFilterMenuAnchor(event.currentTarget);
  };

  const handleFilterMenuClose = () => {
    setFilterMenuAnchor(null);
  };

  const handleSortMenuOpen = (event) => {
    setSortMenuAnchor(event.currentTarget);
  };

  const handleSortMenuClose = () => {
    setSortMenuAnchor(null);
  };

  const handleActionMenuOpen = (event, itemId) => {
    event.stopPropagation();
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
    
    setSortMenuAnchor(null);
  };

  const handleFilterChange = (filterName, value) => {
    const newFilters = {
      ...filters,
      [filterName]: value
    };
    
    setFilters(newFilters);
    
    // Update URL query parameters
    const params = new URLSearchParams();
    if (newFilters.category) params.set('category', newFilters.category);
    if (newFilters.label) params.set('label', newFilters.label);
    if (newFilters.location) params.set('location', newFilters.location);
    
    navigate({ search: params.toString() });
    
    setPage(0);
    handleFilterMenuClose();
  };

  const handleClearFilters = () => {
    setFilters({
      location: '',
      category: '',
      label: '',
      archived: false
    });
    
    // Clear URL query parameters
    navigate({ search: '' });
    
    setPage(0);
    handleFilterMenuClose();
  };

  const handleDeleteItem = async (itemId) => {
    try {
      // Make API call to delete the item
      await axios.delete(`/api/items/${itemId}`);
      
      // Update the items list
      setItems(prevItems => prevItems.filter(item => item._id !== itemId));
      
      handleActionMenuClose();
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
      
      // Update the items list
      setItems(prevItems => prevItems.map(item => 
        item._id === itemId ? { ...item, isArchived: true } : item
      ));
      
      handleActionMenuClose();
    } catch (err) {
      setErrorAlert('Error archiving item: ' + (err.response?.data?.message || err.message));
      console.error(err);
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
      
      {/* Search and Filters */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              placeholder="Search items..."
              value={searchTerm}
              onChange={handleSearchChange}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
                endAdornment: searchTerm && (
                  <InputAdornment position="end">
                    <IconButton size="small" onClick={handleClearSearch}>
                      <ClearIcon />
                    </IconButton>
                  </InputAdornment>
                )
              }}
            />
          </Grid>
          
          <Grid item xs={6} md={3}>
            <Button
              fullWidth
              startIcon={<FilterListIcon />}
              onClick={handleFilterMenuOpen}
              variant={Object.values(filters).some(v => v) ? 'contained' : 'outlined'}
              color={Object.values(filters).some(v => v) ? 'primary' : 'inherit'}
            >
              Filter
            </Button>
            
            <Menu
              anchorEl={filterMenuAnchor}
              open={Boolean(filterMenuAnchor)}
              onClose={handleFilterMenuClose}
            >
              <MenuItem disabled>
                <Typography variant="subtitle2">Filter by:</Typography>
              </MenuItem>
              
              <MenuItem onClick={() => handleFilterChange('archived', true)}>
                <ListItemText>Show Archived</ListItemText>
              </MenuItem>
              
              <MenuItem onClick={() => handleFilterChange('archived', false)}>
                <ListItemText>Hide Archived</ListItemText>
              </MenuItem>
              
              <Divider />
              
              <MenuItem onClick={handleClearFilters}>
                <ListItemText>Clear Filters</ListItemText>
              </MenuItem>
            </Menu>
          </Grid>
          
          <Grid item xs={6} md={3}>
            <Button
              fullWidth
              startIcon={<SortIcon />}
              onClick={handleSortMenuOpen}
              variant="outlined"
            >
              Sort
            </Button>
            
            <Menu
              anchorEl={sortMenuAnchor}
              open={Boolean(sortMenuAnchor)}
              onClose={handleSortMenuClose}
            >
              <MenuItem disabled>
                <Typography variant="subtitle2">Sort by:</Typography>
              </MenuItem>
              
              <MenuItem 
                onClick={() => handleSort('name')}
                selected={sortField === 'name'}
              >
                <ListItemText>Name {sortField === 'name' && (sortDirection === 'asc' ? '↑' : '↓')}</ListItemText>
              </MenuItem>
              
              <MenuItem 
                onClick={() => handleSort('location')}
                selected={sortField === 'location'}
              >
                <ListItemText>Location {sortField === 'location' && (sortDirection === 'asc' ? '↑' : '↓')}</ListItemText>
              </MenuItem>
              
              <MenuItem 
                onClick={() => handleSort('category')}
                selected={sortField === 'category'}
              >
                <ListItemText>Category {sortField === 'category' && (sortDirection === 'asc' ? '↑' : '↓')}</ListItemText>
              </MenuItem>
              
              <MenuItem 
                onClick={() => handleSort('updatedAt')}
                selected={sortField === 'updatedAt'}
              >
                <ListItemText>Last Updated {sortField === 'updatedAt' && (sortDirection === 'asc' ? '↑' : '↓')}</ListItemText>
              </MenuItem>
            </Menu>
          </Grid>
        </Grid>
      </Paper>
      
      {/* Items List - Responsive Layout */}
      <Box>
        {/* Desktop View - Table */}
        <Box sx={{ display: { xs: 'none', md: 'block' } }}>
          <Paper>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Name</TableCell>
                    <TableCell>Location</TableCell>
                    <TableCell>Category</TableCell>
                    <TableCell>Labels</TableCell>
                    <TableCell>UPC Code</TableCell>
                    <TableCell>Last Updated</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                
                <TableBody>
                  {filteredItems.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} align="center" sx={{ py: 3 }}>
                        <Typography variant="body1" color="text.secondary" gutterBottom>
                          No items found
                        </Typography>
                        
                        <Button
                          variant="contained"
                          startIcon={<AddIcon />}
                          component={RouterLink}
                          to="/items/create"
                          sx={{ mt: 1 }}
                        >
                          Add Your First Item
                        </Button>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredItems.map((item) => (
                        <TableRow
                          key={item._id}
                          hover
                          onClick={() => navigate(`/items/${item._id}`)}
                          sx={{
                            textDecoration: 'none',
                            color: 'inherit',
                            '&:hover': { cursor: 'pointer' },
                            ...(item.isArchived === true && { opacity: 0.6 })
                          }}
                        >
                          <TableCell>
                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                              <Typography variant="body1">
                                {item.name || 'Unnamed Item'}
                              </Typography>
                              {item.isArchived === true && (
                                <Chip
                                  label="Archived"
                                  size="small"
                                  color="default"
                                  sx={{ ml: 1 }}
                                />
                              )}
                            </Box>
                          </TableCell>
                          
                          <TableCell>{item.location?.name || 'No location'}</TableCell>
                          <TableCell>{item.category?.name || 'No category'}</TableCell>
                          
                          <TableCell>
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                              {item.labels && item.labels.length > 0 ? (
                                item.labels.map((label) => (
                                  <Chip
                                    key={label._id}
                                    label={label.name}
                                    size="small"
                                    sx={{
                                      bgcolor: label.color,
                                      color: 'white',
                                    }}
                                  />
                                ))
                              ) : (
                                <Typography variant="body2" color="text.secondary">
                                  No labels
                                </Typography>
                              )}
                            </Box>
                          </TableCell>
                          
                          <TableCell>
                            {item.upcCode || 'N/A'}
                          </TableCell>
                          
                          <TableCell>
                            {item.updatedAt ? new Date(item.updatedAt).toLocaleDateString() : 'N/A'}
                          </TableCell>
                          
                          <TableCell align="right">
                            <IconButton
                              onClick={(e) => handleActionMenuOpen(e, item._id)}
                              size="small"
                            >
                              <MoreVertIcon />
                            </IconButton>
                          </TableCell>
                        </TableRow>
                      ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Box>

        {/* Mobile View - Cards */}
        <Box sx={{ display: { xs: 'block', md: 'none' } }}>
          {filteredItems.length === 0 ? (
            <Paper sx={{ p: 3, textAlign: 'center' }}>
              <Typography variant="body1" color="text.secondary" gutterBottom>
                No items found
              </Typography>
              
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                component={RouterLink}
                to="/items/create"
                sx={{ mt: 1 }}
              >
                Add Your First Item
              </Button>
            </Paper>
          ) : (
            <Grid container spacing={2}>
              {filteredItems.map((item) => (
                <Grid item xs={12} key={item._id}>
                  <Paper 
                    sx={{ 
                      p: 2, 
                      ...(item.isArchived === true && { opacity: 0.6 }),
                      '&:hover': { boxShadow: 3, cursor: 'pointer' }
                    }}
                    onClick={() => navigate(`/items/${item._id}`)}
                  >
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                      <Typography variant="h6" component="div">
                        {item.name || 'Unnamed Item'}
                        {item.isArchived === true && (
                          <Chip
                            label="Archived"
                            size="small"
                            color="default"
                            sx={{ ml: 1 }}
                          />
                        )}
                      </Typography>
                      <IconButton
                        onClick={(e) => handleActionMenuOpen(e, item._id)}
                        size="small"
                      >
                        <MoreVertIcon />
                      </IconButton>
                    </Box>
                    
                    <Grid container spacing={1}>
                      <Grid item xs={6}>
                        <Typography variant="body2" color="text.secondary">
                          Location:
                        </Typography>
                        <Typography variant="body2">
                          {item.location?.name || 'No location'}
                        </Typography>
                      </Grid>
                      
                      <Grid item xs={6}>
                        <Typography variant="body2" color="text.secondary">
                          Category:
                        </Typography>
                        <Typography variant="body2">
                          {item.category?.name || 'No category'}
                        </Typography>
                      </Grid>
                      
                      {item.upcCode && (
                        <Grid item xs={6}>
                          <Typography variant="body2" color="text.secondary">
                            UPC:
                          </Typography>
                          <Typography variant="body2">
                            {item.upcCode}
                          </Typography>
                        </Grid>
                      )}
                      
                      <Grid item xs={6}>
                        <Typography variant="body2" color="text.secondary">
                          Updated:
                        </Typography>
                        <Typography variant="body2">
                          {item.updatedAt ? new Date(item.updatedAt).toLocaleDateString() : 'N/A'}
                        </Typography>
                      </Grid>
                    </Grid>
                    
                    {item.labels && item.labels.length > 0 && (
                      <Box sx={{ mt: 1 }}>
                        <Typography variant="body2" color="text.secondary" gutterBottom>
                          Labels:
                        </Typography>
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                          {item.labels.map((label) => (
                            <Chip
                              key={label._id}
                              label={label.name}
                              size="small"
                              sx={{
                                bgcolor: label.color,
                                color: 'white',
                              }}
                            />
                          ))}
                        </Box>
                      </Box>
                    )}
                  </Paper>
                </Grid>
              ))}
            </Grid>
          )}
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
      
      {/* Action Menu */}
      <Menu
        anchorEl={actionMenuAnchor}
        open={Boolean(actionMenuAnchor)}
        onClose={handleActionMenuClose}
      >
        <MenuItem
          component={RouterLink}
          to={`/items/edit/${selectedItemId}`}
          onClick={handleActionMenuClose}
        >
          <ListItemIcon>
            <EditIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Edit</ListItemText>
        </MenuItem>
        
        <MenuItem onClick={() => handleArchiveItem(selectedItemId)}>
          <ListItemIcon>
            <ArchiveIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Archive</ListItemText>
        </MenuItem>
        
        <MenuItem onClick={() => handleDeleteItem(selectedItemId)}>
          <ListItemIcon>
            <DeleteIcon fontSize="small" color="error" />
          </ListItemIcon>
          <ListItemText sx={{ color: 'error.main' }}>Delete</ListItemText>
        </MenuItem>
      </Menu>
    </Container>
  );
};

export default Items;

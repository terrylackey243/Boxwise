import React, { useState, useEffect } from 'react';
import {
  Grid,
  Paper,
  TextField,
  InputAdornment,
  IconButton,
  Button,
  Typography,
  Menu,
  MenuItem,
  ListItemText,
  Divider,
  Tooltip,
  Autocomplete
} from '@mui/material';
import {
  Search as SearchIcon,
  FilterList as FilterListIcon,
  Sort as SortIcon,
  Clear as ClearIcon,
  QrCodeScanner as QrCodeScannerIcon
} from '@mui/icons-material';

/**
 * Component for displaying the search and filter controls
 * @param {Object} props - Component props
 * @param {string} props.searchValue - The current search value
 * @param {Function} props.onSearchChange - Function to call when the search value changes
 * @param {Function} props.onClearSearch - Function to call when the search is cleared
 * @param {Object} props.filters - The current filters
 * @param {Function} props.onFilterChange - Function to call when a filter is changed
 * @param {Function} props.onClearFilters - Function to call when filters are cleared
 * @param {string} props.sortField - The current sort field
 * @param {string} props.sortDirection - The current sort direction
 * @param {Function} props.onSort - Function to call when the sort is changed
 * @param {Function} props.onScanBarcode - Function to call when the barcode scanner is opened
 * @returns {JSX.Element} - Rendered component
 */
const ItemSearchFilters = ({
  searchValue,
  onSearchChange,
  onClearSearch,
  filters,
  onFilterChange,
  onClearFilters,
  sortField,
  sortDirection,
  onSort,
  onScanBarcode
}) => {
  const [filterMenuAnchor, setFilterMenuAnchor] = useState(null);
  const [sortMenuAnchor, setSortMenuAnchor] = useState(null);

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

  const handleFilterSelect = (filterName, value) => {
    onFilterChange(filterName, value);
    handleFilterMenuClose();
  };

  const handleSortSelect = (field) => {
    onSort(field);
    handleSortMenuClose();
  };

  return (
    <Paper sx={{ p: 2, mb: 3 }}>
      <Grid container spacing={2} alignItems="center">
        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            placeholder="Search items..."
            value={searchValue}
            onChange={onSearchChange}
            autoFocus
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
              endAdornment: (
                <InputAdornment position="end">
                  {searchValue && (
                    <IconButton size="small" onClick={onClearSearch}>
                      <ClearIcon />
                    </IconButton>
                  )}
                  <Tooltip title="Scan Barcode">
                    <IconButton 
                      color="primary" 
                      onClick={onScanBarcode}
                      size="small"
                      sx={{ ml: 0.5 }}
                    >
                      <QrCodeScannerIcon />
                    </IconButton>
                  </Tooltip>
                </InputAdornment>
              )
            }}
            sx={{
              '& .MuiInputBase-root': {
                borderRadius: 1
              }
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
            
            <MenuItem onClick={() => handleFilterSelect('archived', true)}>
              <ListItemText>Show Archived</ListItemText>
            </MenuItem>
            
            <MenuItem onClick={() => handleFilterSelect('archived', false)}>
              <ListItemText>Hide Archived</ListItemText>
            </MenuItem>
            
            <Divider />
            
            <MenuItem onClick={onClearFilters}>
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
              onClick={() => handleSortSelect('name')}
              selected={sortField === 'name'}
            >
              <ListItemText>Name {sortField === 'name' && (sortDirection === 'asc' ? '↑' : '↓')}</ListItemText>
            </MenuItem>
            
            <MenuItem 
              onClick={() => handleSortSelect('location')}
              selected={sortField === 'location'}
            >
              <ListItemText>Location {sortField === 'location' && (sortDirection === 'asc' ? '↑' : '↓')}</ListItemText>
            </MenuItem>
            
            <MenuItem 
              onClick={() => handleSortSelect('category')}
              selected={sortField === 'category'}
            >
              <ListItemText>Category {sortField === 'category' && (sortDirection === 'asc' ? '↑' : '↓')}</ListItemText>
            </MenuItem>
            
            <MenuItem 
              onClick={() => handleSortSelect('quantity')}
              selected={sortField === 'quantity'}
            >
              <ListItemText>Quantity {sortField === 'quantity' && (sortDirection === 'asc' ? '↑' : '↓')}</ListItemText>
            </MenuItem>
            
            <MenuItem 
              onClick={() => handleSortSelect('updatedAt')}
              selected={sortField === 'updatedAt'}
            >
              <ListItemText>Last Updated {sortField === 'updatedAt' && (sortDirection === 'asc' ? '↑' : '↓')}</ListItemText>
            </MenuItem>
          </Menu>
        </Grid>
      </Grid>
    </Paper>
  );
};

export default ItemSearchFilters;

import { useState, useCallback, useEffect, useRef } from 'react';
import { debounce } from '@mui/material/utils';
import { useLocation, useNavigate } from 'react-router-dom';
import axios from '../utils/axiosConfig';

/**
 * Custom hook for handling item search functionality
 * @param {Object} options - Options for the search
 * @param {Function} options.onError - Function to call when an error occurs
 * @returns {Object} - Search state and functions
 */
const useItemSearch = ({ onError, initialSortField = 'name', initialSortDirection = 'asc' }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState([]);
  const [filteredItems, setFilteredItems] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchInputValue, setSearchInputValue] = useState('');
  const [page, setPage] = useState(0);
  // Initialize rowsPerPage from localStorage or default to 10
  const [rowsPerPage, setRowsPerPage] = useState(() => {
    const savedRowsPerPage = localStorage.getItem('itemsRowsPerPage');
    return savedRowsPerPage ? parseInt(savedRowsPerPage, 10) : 10;
  });
  const [totalItems, setTotalItems] = useState(0);
  const [filters, setFilters] = useState({
    location: '',
    category: '',
    label: '',
    archived: false
  });
  
  // Sort state
  const [sortField, setSortField] = useState(initialSortField);
  const [sortDirection, setSortDirection] = useState(initialSortDirection);
  
  // Store all items for client-side filtering
  const [allItems, setAllItems] = useState([]);
  
  // Flag to prevent unnecessary server requests
  const preventServerRequestRef = useRef(false);
  
  // Flag to track if we've loaded data from URL parameters
  const hasLoadedFromUrlRef = useRef(false);

  // Function to load items from the server
  const loadItems = useCallback(async (options = {}) => {
    try {
      setLoading(true);
      
      // Make API call to fetch items with pagination and filters
      const params = new URLSearchParams();
      
      // Pagination parameters
      params.set('page', (options.page !== undefined ? options.page : page) + 1); // API uses 1-based indexing
      params.set('limit', options.limit || rowsPerPage);
      
      // Only apply filters if we're not forcing a refresh
      if (!options.forceRefresh) {
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
        if (options.searchTerm || searchTerm) {
          params.set('search', options.searchTerm || searchTerm);
        }
      }
      
      // Sort parameters - use options if provided, otherwise use state
      const sortBy = options.sort || sortField;
      const orderBy = options.order || sortDirection;
      
      if (sortBy) {
        params.set('sort', sortBy);
        params.set('order', orderBy);
      }
      
      console.log('Loading items with params:', params.toString());
      const response = await axios.get(`/api/items?${params.toString()}`);
      
      if (response.data.success) {
        const fetchedItems = response.data.data;
        setItems(fetchedItems);
        setFilteredItems(fetchedItems);
        
        // Always update allItems with the fetched items for client-side filtering
        setAllItems(fetchedItems);
        
        setTotalItems(response.data.total);
        console.log('Loaded items:', fetchedItems.length, 'Total:', response.data.total);
      } else {
        onError('Failed to load items');
      }
      
      setLoading(false);
      return true;
    } catch (err) {
      // Special handling for timeout errors
      if (err.code === 'ECONNABORTED' && err.message.includes('timeout')) {
        onError('The request timed out. The server might be busy or the dataset too large. Try again with fewer filters.');
      } else {
        // Handle other types of errors
        onError('Error loading items: ' + (err.response?.data?.message || err.message));
      }
      
      setLoading(false);
      console.error(err);
      return false;
    }
  }, [filters, page, rowsPerPage, searchTerm, sortField, sortDirection, onError]);

  // Initialize filters from URL query parameters and load data
  useEffect(() => {
    // Skip if we've already loaded from URL
    if (hasLoadedFromUrlRef.current) {
      return;
    }
    
    const queryParams = new URLSearchParams(location.search);
    const categoryParam = queryParams.get('category');
    const labelParam = queryParams.get('label');
    const locationParam = queryParams.get('location');
    
    const loadInitialData = async () => {
      try {
        if (categoryParam || labelParam || locationParam) {
          console.log('Setting filters from URL parameters:', { categoryParam, labelParam, locationParam });
          
          // Update filters state
          const newFilters = {
            location: locationParam || '',
            category: categoryParam || '',
            label: labelParam || '',
            archived: false
          };
          
          setFilters(newFilters);
          
          // Load data with these filters (using a reasonable limit)
          await loadItems({ page: 0, limit: 50 });
        } else {
          // No URL parameters, load items with a very small initial batch
          // Using a minimal load size to prevent timeouts
          await loadItems({ page: 0, limit: 5 });
        }
        
        hasLoadedFromUrlRef.current = true;
      } catch (error) {
        console.error('Failed to load initial data:', error);
        // Set loading to false to prevent infinite loading state
        setLoading(false);
        // Show error message to user
        onError('Failed to load items. Please try refreshing the page.');
      }
    };
    
    // Start loading data with a slight delay to allow the app to initialize
    setTimeout(() => {
      loadInitialData();
    }, 500);
  }, [location.search, loadItems, onError]);

  // Create a debounced version of the search function
  const debouncedSearch = useCallback(
    debounce((value) => {
      // Only do a server search if we need to
      if (preventServerRequestRef.current) {
        preventServerRequestRef.current = false;
        return;
      }
      
      console.log('Performing server-side search for:', value);
      setSearchTerm(value);
      loadItems({ searchTerm: value, page: 0, limit: rowsPerPage });
    }, 800),
    [loadItems]
  );
  
  // Function to perform client-side filtering
  const performClientSideFiltering = useCallback((searchValue) => {
    console.log('Performing client-side filtering for:', searchValue);
    
    if (!searchValue.trim()) {
      // If search is empty, show all items
      setFilteredItems(allItems);
      preventServerRequestRef.current = true; // Prevent unnecessary server request
      return;
    }
    
    const searchLower = searchValue.toLowerCase();
    
    // Filter items based on the search value
    const filtered = allItems.filter(item => {
      // Check if any of these fields contain the search term
      return (
        (item.name && item.name.toLowerCase().includes(searchLower)) ||
        (item.description && item.description.toLowerCase().includes(searchLower)) ||
        (item.assetId && item.assetId.toLowerCase().includes(searchLower)) ||
        (item.serialNumber && item.serialNumber.toLowerCase().includes(searchLower)) ||
        (item.modelNumber && item.modelNumber.toLowerCase().includes(searchLower)) ||
        (item.manufacturer && item.manufacturer.toLowerCase().includes(searchLower)) ||
        (item.upcCode && item.upcCode.toLowerCase().includes(searchLower))
      );
    });
    
    setFilteredItems(filtered);
    
    // If we have enough matches client-side, prevent the server request
    if (filtered.length > 0) {
      preventServerRequestRef.current = true;
    }
  }, [allItems]);

  const handleSearchChange = (e) => {
    // Update the input field immediately for a responsive UI
    const value = e.target.value;
    setSearchInputValue(value);
    
    // Perform client-side filtering for immediate feedback
    performClientSideFiltering(value);
    
    // Debounce the server-side search for when client-side filtering isn't enough
    debouncedSearch(value);
    
    // Keep focus on the search input
    e.target.focus();
  };

  const handleClearSearch = () => {
    setSearchInputValue('');
    setSearchTerm('');
    loadItems({ searchTerm: '', page: 0, limit: rowsPerPage });
  };

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
    // Use the current rowsPerPage as the limit to maintain pagination consistency
    loadItems({ page: newPage, limit: rowsPerPage });
  };

  const handleChangeRowsPerPage = (event) => {
    const newRowsPerPage = parseInt(event.target.value, 10);
    
    // Save to localStorage for persistence across page reloads
    localStorage.setItem('itemsRowsPerPage', newRowsPerPage.toString());
    
    setRowsPerPage(newRowsPerPage);
    setPage(0);
    
    // Load items with new rows per page
    loadItems({ page: 0, limit: newRowsPerPage });
  };

  const handleFilterChange = (filterName, value) => {
    const newFilters = {
      ...filters,
      [filterName]: value
    };
    
    setFilters(newFilters);
    setPage(0);
    
    // Update URL to reflect filter changes
    const newUrl = new URL(window.location.href);
    if (value) {
      newUrl.searchParams.set(filterName, value);
    } else {
      newUrl.searchParams.delete(filterName);
    }
    navigate(newUrl.pathname + newUrl.search, { replace: true });
    
    // Load items with new filters (using the current pagination setting)
    setTimeout(() => {
      loadItems({ page: 0, limit: rowsPerPage });
    }, 0);
  };

  const handleClearFilters = () => {
    console.log('handleClearFilters called');
    
    // Clear the filters in state
    setFilters({
      location: '',
      category: '',
      label: '',
      archived: false
    });
    
    // Reset the page
    setPage(0);
    
    // Update the URL to remove filter parameters
    const newUrl = new URL(window.location.href);
    newUrl.searchParams.delete('category');
    newUrl.searchParams.delete('label');
    newUrl.searchParams.delete('location');
    navigate(newUrl.pathname + newUrl.search, { replace: true });
    
    // Force a refresh by explicitly setting searchTerm to empty and calling loadItems
    setSearchTerm('');
    console.log('Calling loadItems with cleared filters');
    
    // Add a small delay to ensure state updates have propagated
    setTimeout(() => {
      loadItems({ page: 0, limit: rowsPerPage, forceRefresh: true });
    }, 50);
  };
  
  const handleSort = (field) => {
    console.log('handleSort called with field:', field);
    
    let newDirection;
    if (sortField === field) {
      newDirection = sortDirection === 'asc' ? 'desc' : 'asc';
      setSortDirection(newDirection);
    } else {
      setSortField(field);
      newDirection = 'asc';
      setSortDirection('asc');
    }
    
    console.log('New sort:', field, newDirection);
    
    // Add a small delay to ensure state updates have propagated
    setTimeout(() => {
      // Load items with new sort (using the current pagination setting)
      loadItems({ page: 0, limit: rowsPerPage, sort: field, order: newDirection });
    }, 50);
  };

  // Function to manually refresh items - used by the Items component
  const refreshItems = async () => {
    // Use the current pagination setting when refreshing items
    return loadItems({ limit: rowsPerPage });
  };

  return {
    loading,
    items,
    filteredItems,
    searchInputValue,
    page,
    rowsPerPage,
    totalItems,
    filters,
    sortField,
    sortDirection,
    handleSearchChange,
    handleClearSearch,
    handleChangePage,
    handleChangeRowsPerPage,
    handleFilterChange,
    handleClearFilters,
    handleSort,
    refreshItems,
    setItems,
    setFilteredItems,
    setTotalItems
  };
};

export default useItemSearch;

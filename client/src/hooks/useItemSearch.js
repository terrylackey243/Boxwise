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
  
  // Store the complete set of items for searching (all items in the database)
  const [completeItemSet, setCompleteItemSet] = useState([]);
  
  // Flag to track if we've loaded the complete item set
  const hasLoadedCompleteItemSetRef = useRef(false);
  
  // Flag to prevent unnecessary server requests
  const preventServerRequestRef = useRef(false);
  
  // Flag to track if we've loaded data from URL parameters
  const hasLoadedFromUrlRef = useRef(false);
  
  // Function to load all items for searching
  const loadAllItemsForSearch = useCallback(async () => {
    try {
      console.log('Loading all items for search...');
      setLoading(true);
      
      // Make API call to fetch all items without pagination or filters
      // Use a very large limit to get as many items as possible
      const params = new URLSearchParams();
      params.set('page', 1);
      params.set('limit', 10000); // Very large limit to get all items
      
      // Sort by name for consistency
      params.set('sort', 'name');
      params.set('order', 'asc');
      
      const response = await axios.get(`/api/items?${params.toString()}`);
      
      if (response.data.success) {
        const allItems = response.data.data;
        setCompleteItemSet(allItems);
        console.log('Loaded all items for search:', allItems.length);
        hasLoadedCompleteItemSetRef.current = true;
        return allItems;
      } else {
        onError('Failed to load all items for search');
        return [];
      }
    } catch (err) {
      onError('Error loading all items for search: ' + (err.response?.data?.message || err.message));
      console.error(err);
      return [];
    } finally {
      setLoading(false);
    }
  }, [onError]);

  // Function to load items from the server
  const loadItems = useCallback(async (options = {}) => {
    try {
      setLoading(true);
      
      // Make API call to fetch items with pagination and filters
      const params = new URLSearchParams();
      
      // Check if we're searching
      const isSearching = Boolean(options.searchTerm || searchTerm);
      
      // When searching, always fetch all items without pagination or filters
      if (isSearching) {
        params.set('page', 1); // Start from first page
        params.set('limit', 10000); // Use a very large limit to get all items
      } else {
        // Normal case: pagination with filters
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
        }
      }
      
      // Search parameter - always apply if present
      if (isSearching) {
        params.set('search', options.searchTerm || searchTerm);
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
          // No URL parameters, load items with the user's preferred page size
          await loadItems({ page: 0, limit: rowsPerPage });
        }
        
        // Also load all items for search in the background
        loadAllItemsForSearch();
        
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
  }, [location.search, loadItems, loadAllItemsForSearch, onError]);

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
      
      // Use a large limit to get all matching items
      loadItems({ searchTerm: value, page: 0, limit: 1000 });
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
    
    // Always search across all items in the database, regardless of filters
    // Force loading the complete item set if we don't have it yet
    if (!hasLoadedCompleteItemSetRef.current) {
      loadAllItemsForSearch();
      // Fall back to current items until the complete set is loaded
      const itemsToSearch = allItems;
      performInitialSearch(searchLower, itemsToSearch);
      return;
    }
    
    // Use the complete item set for searching
    const itemsToSearch = completeItemSet;
    
    console.log(`Searching through ${itemsToSearch.length} items (using complete item set)`);
    
    // Filter items based on the search value
    const filtered = itemsToSearch.filter(item => {
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
    
    // Show all matching items without pagination
    setFilteredItems(filtered);
    setTotalItems(filtered.length); // Update total items count to match filtered results
    
    // Always prevent server request when we have the complete item set
    preventServerRequestRef.current = true;
  }, [allItems, completeItemSet, loadAllItemsForSearch]);
  
  // Helper function to perform initial search while complete set is loading
  const performInitialSearch = (searchLower, itemsToSearch) => {
    console.log(`Performing initial search through ${itemsToSearch.length} items`);
    
    // Filter items based on the search value
    const filtered = itemsToSearch.filter(item => {
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
    
    // Show all matching items without pagination
    setFilteredItems(filtered);
    setTotalItems(filtered.length); // Update total items count to match filtered results
  };

  const handleSearchChange = (e) => {
    // Update the input field immediately for a responsive UI
    const value = e.target.value;
    setSearchInputValue(value);
    
    // Reset to page 0 when searching
    if (page !== 0) {
      setPage(0);
    }
    
    // If we don't have the complete item set yet and this is a search operation, load it now
    if (!hasLoadedCompleteItemSetRef.current && value.trim()) {
      loadAllItemsForSearch().then(allItems => {
        // After loading all items, perform the search on the complete set
        performClientSideFiltering(value);
      });
    } else {
      // Perform client-side filtering for immediate feedback
      performClientSideFiltering(value);
    }
    
    // Only use server-side search as a fallback if client-side filtering doesn't yield enough results
    // and we don't have the complete item set
    if (!hasLoadedCompleteItemSetRef.current) {
      debouncedSearch(value);
    }
    
    // Keep focus on the search input
    e.target.focus();
  };

  const handleClearSearch = () => {
    setSearchInputValue('');
    setSearchTerm('');
    
    // Reset to page 0 and use normal pagination when clearing search
    setPage(0);
    
    // Load items with normal pagination (no search term)
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
    completeItemSet,
    hasLoadedAllItems: hasLoadedCompleteItemSetRef.current,
    handleSearchChange,
    handleClearSearch,
    handleChangePage,
    handleChangeRowsPerPage,
    handleFilterChange,
    handleClearFilters,
    handleSort,
    refreshItems,
    loadAllItemsForSearch,
    setItems,
    setFilteredItems,
    setTotalItems
  };
};

export default useItemSearch;

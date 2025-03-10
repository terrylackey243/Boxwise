import { useState, useCallback, useEffect, useRef } from 'react';
import { debounce } from '@mui/material/utils';
import axios from '../utils/axiosConfig';

/**
 * Custom hook for handling item search functionality
 * @param {Object} options - Options for the search
 * @param {Function} options.onError - Function to call when an error occurs
 * @returns {Object} - Search state and functions
 */
const useItemSearch = ({ onError, initialSortField = 'name', initialSortDirection = 'asc' }) => {
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
  // Flag to track if initial data has been loaded
  const [initialDataLoaded, setInitialDataLoaded] = useState(false);
  // Flag to prevent unnecessary server requests
  const preventServerRequestRef = useRef(false);

  // Initialize filters from URL query parameters
  useEffect(() => {
    const queryParams = new URLSearchParams(window.location.search);
    const categoryParam = queryParams.get('category');
    const labelParam = queryParams.get('label');
    const locationParam = queryParams.get('location');
    
    if (categoryParam || labelParam || locationParam) {
      setFilters({
        location: locationParam || '',
        category: categoryParam || '',
        label: labelParam || '',
        archived: false
      });
    }
  }, []);

  // Initial data load - only happens once
  useEffect(() => {
    if (initialDataLoaded) return;
    
    const loadInitialData = async () => {
      try {
        setLoading(true);
        
        // Make API call to fetch items with pagination and filters
        const params = new URLSearchParams();
        
        // Pagination parameters - get more items initially for better client-side filtering
        params.set('page', 1);
        params.set('limit', 100); // Get more items for client-side filtering
        
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
        
        // Sort parameters
        if (sortField) {
          params.set('sort', sortField);
          params.set('order', sortDirection);
        }
        
        console.log('Loading initial data with params:', params.toString());
        const response = await axios.get(`/api/items?${params.toString()}`);
        
        if (response.data.success) {
          const fetchedItems = response.data.data;
          setItems(fetchedItems);
          setFilteredItems(fetchedItems);
          setAllItems(fetchedItems); // Store all items for client-side filtering
          setTotalItems(response.data.total);
          console.log('Initial data loaded:', fetchedItems.length, 'Total:', response.data.total);
          setInitialDataLoaded(true);
        } else {
          onError('Failed to load items');
        }
        
        setLoading(false);
      } catch (err) {
        onError('Error loading items: ' + (err.response?.data?.message || err.message));
        setLoading(false);
        console.error(err);
      }
    };
    
    loadInitialData();
  }, [filters, sortField, sortDirection, onError, initialDataLoaded]);

  // Create a debounced version of the search function for server-side search
  // This will only be triggered when the user stops typing for a while
  const debouncedServerSearch = useCallback(
    debounce((value) => {
      // Only do a server search if we need to (e.g., for a complex search that client-side can't handle)
      if (preventServerRequestRef.current) {
        preventServerRequestRef.current = false;
        return;
      }
      
      console.log('Performing server-side search for:', value);
      setSearchTerm(value);
      setPage(0);
      
      // Server search will be triggered by the useEffect below
    }, 800), // Longer delay (800ms) before triggering server request
    []
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

  // Fetch items based on search term, filters, pagination, and sorting
  // This effect is for server-side search and filtering
  useEffect(() => {
    // Skip the initial load - that's handled by the initialDataLoaded effect
    if (!initialDataLoaded) return;
    
    // Skip if the search term is empty (we already have all items)
    if (!searchTerm && page === 0) return;
    
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
        
        // Sort parameters
        if (sortField) {
          params.set('sort', sortField);
          params.set('order', sortDirection);
        }
        
        console.log('Fetching items from server with params:', params.toString());
        const response = await axios.get(`/api/items?${params.toString()}`);
        
        if (response.data.success) {
          setItems(response.data.data);
          setFilteredItems(response.data.data);
          setTotalItems(response.data.total);
          console.log('Fetched items from server:', response.data.data.length, 'Total:', response.data.total);
        } else {
          onError('Failed to load items');
        }
        
        setLoading(false);
      } catch (err) {
        onError('Error loading items: ' + (err.response?.data?.message || err.message));
        setLoading(false);
        console.error(err);
      }
    };
    
    fetchItems();
  }, [page, rowsPerPage, searchTerm, filters, sortField, sortDirection, onError, initialDataLoaded]);

  const handleSearchChange = (e) => {
    // Update the input field immediately for a responsive UI
    const value = e.target.value;
    setSearchInputValue(value);
    
    // Perform client-side filtering for immediate feedback
    performClientSideFiltering(value);
    
    // Debounce the server-side search for when client-side filtering isn't enough
    debouncedServerSearch(value);
    
    // Keep focus on the search input
    e.target.focus();
  };

  const handleClearSearch = () => {
    setSearchInputValue('');
    setSearchTerm('');
  };

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    const newRowsPerPage = parseInt(event.target.value, 10);
    
    // Save to localStorage for persistence across page reloads
    localStorage.setItem('itemsRowsPerPage', newRowsPerPage.toString());
    
    setRowsPerPage(newRowsPerPage);
    setPage(0);
    
    // Trigger a refresh with the new rows per page value
    const fetchItemsWithNewRowsPerPage = async () => {
      try {
        setLoading(true);
        
        // Make API call to fetch items with pagination and filters
        const params = new URLSearchParams();
        
        // Pagination parameters with new rows per page
        params.set('page', 1); // Reset to first page
        params.set('limit', newRowsPerPage);
        
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
        
        // Sort parameters
        if (sortField) {
          params.set('sort', sortField);
          params.set('order', sortDirection);
        }
        
        console.log('Fetching items with new rows per page:', newRowsPerPage);
        const response = await axios.get(`/api/items?${params.toString()}`);
        
        if (response.data.success) {
          setItems(response.data.data);
          setFilteredItems(response.data.data);
          setTotalItems(response.data.total);
        } else {
          onError('Failed to load items');
        }
        
        setLoading(false);
      } catch (err) {
        onError('Error loading items: ' + (err.response?.data?.message || err.message));
        setLoading(false);
        console.error(err);
      }
    };
    
    fetchItemsWithNewRowsPerPage();
  };

  const handleFilterChange = (filterName, value) => {
    const newFilters = {
      ...filters,
      [filterName]: value
    };
    
    setFilters(newFilters);
    setPage(0);
  };

  const handleClearFilters = () => {
    setFilters({
      location: '',
      category: '',
      label: '',
      archived: false
    });
    
    setPage(0);
  };
  
  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  return {
    loading,
    items,
    filteredItems,
    searchTerm,
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
    setItems,
    setFilteredItems,
    setTotalItems
  };
};

export default useItemSearch;

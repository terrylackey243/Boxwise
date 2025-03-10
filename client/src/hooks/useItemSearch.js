import { useState, useCallback, useEffect } from 'react';
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
  const [rowsPerPage, setRowsPerPage] = useState(10);
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

  // Create a debounced version of the search function
  const debouncedSearch = useCallback(
    debounce((value) => {
      setSearchTerm(value);
      setPage(0);
    }, 200), // 200ms delay for more responsive filtering
    []
  );

  // Fetch items based on search term, filters, pagination, and sorting
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
        
        // Sort parameters
        if (sortField) {
          params.set('sort', sortField);
          params.set('order', sortDirection);
        }
        
        console.log('Fetching items with params:', params.toString());
        const response = await axios.get(`/api/items?${params.toString()}`);
        
        if (response.data.success) {
          setItems(response.data.data);
          setFilteredItems(response.data.data);
          setTotalItems(response.data.total);
          console.log('Fetched items:', response.data.data.length, 'Total:', response.data.total);
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
  }, [page, rowsPerPage, searchTerm, filters, sortField, sortDirection, onError]);

  const handleSearchChange = (e) => {
    // Update the input field immediately for a responsive UI
    const value = e.target.value;
    setSearchInputValue(value);
    // But debounce the actual search without losing focus
    debouncedSearch(value);
    
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
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
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

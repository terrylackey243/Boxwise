import React, { useState, useEffect, useContext } from 'react';
import axios from '../../utils/axiosConfig';
import bulkService from '../../services/bulkService';
import { Link as RouterLink } from 'react-router-dom';
import {
  Container,
  Grid,
  Paper,
  Typography,
  Box,
  Button,
  TextField,
  InputAdornment,
  CircularProgress,
  Card,
  CardContent,
  CardActions,
  Divider,
  IconButton,
  Menu,
  MenuItem,
  Tooltip,
  Chip
} from '@mui/material';
import {
  Search as SearchIcon,
  Add as AddIcon,
  MoreVert as MoreVertIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Category as CategoryIcon
} from '@mui/icons-material';
import { AlertContext } from '../../context/AlertContext';
import BulkAddDialog from '../../components/bulk/BulkAddDialog';

const Categories = () => {
  const { setSuccessAlert, setErrorAlert } = useContext(AlertContext);
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [bulkAddOpen, setBulkAddOpen] = useState(false);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        setLoading(true);
        
        // Make an API call to fetch categories using axios
        const response = await axios.get('/api/categories');
        
        if (response.data.success) {
          setCategories(response.data.data || []);
        } else {
          setErrorAlert('Error loading categories: ' + response.data.message);
        }
        setLoading(false);
      } catch (err) {
        setErrorAlert('Error loading categories');
        setLoading(false);
        console.error(err);
      }
    };
    
    fetchCategories();
  }, [setErrorAlert]);

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
  };

  const handleMenuOpen = (event, category) => {
    setAnchorEl(event.currentTarget);
    setSelectedCategory(category);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedCategory(null);
  };

  const handleDeleteCategory = async () => {
    if (!selectedCategory) return;
    
    try {
      // Make an API call to delete the category using axios
      const response = await axios.delete(`/api/categories/${selectedCategory._id}`);
      
      if (response.data.success) {
        // Update the local state without showing a success message
        const updatedCategories = categories.filter(category => category._id !== selectedCategory._id);
        setCategories(updatedCategories);
      } else {
        setErrorAlert(response.data.message || 'Error deleting category');
      }
    } catch (err) {
      setErrorAlert('Error deleting category');
      console.error(err);
    } finally {
      handleMenuClose();
    }
  };

  // Filter categories based on search term
  const filteredCategories = categories.filter(category => 
    category.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (category.description && category.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

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
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          Categories
        </Typography>
        
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
            startIcon={<AddIcon />}
            component={RouterLink}
            to="/categories/create"
          >
            Add Category
          </Button>
        </Box>
      </Box>
      
      <Paper sx={{ p: 2, mb: 3 }}>
        <TextField
          fullWidth
          placeholder="Search categories by name or description"
          value={searchTerm}
          onChange={handleSearchChange}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            )
          }}
        />
      </Paper>
      
      {filteredCategories.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant="h6" color="text.secondary">
            No categories found
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Try adjusting your search or add a new category
          </Typography>
        </Paper>
      ) : (
        <Grid container spacing={3}>
          {filteredCategories.map((category) => (
            <Grid item xs={12} sm={6} md={4} key={category._id}>
              <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                <CardContent sx={{ flexGrow: 1 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <CategoryIcon 
                        sx={{ 
                          color: 'primary.main', 
                          mr: 1
                        }} 
                      />
                      <Typography variant="h6" component="h2">
                        {category.name}
                      </Typography>
                    </Box>
                    
                    <IconButton 
                      size="small" 
                      onClick={(e) => handleMenuOpen(e, category)}
                      aria-label="more options"
                    >
                      <MoreVertIcon />
                    </IconButton>
                  </Box>
                  
                  <Chip
                    label={`${category.itemCount} items`}
                    size="small"
                    sx={{ mt: 1, mb: 2 }}
                  />
                  
                  <Typography variant="body2" color="text.secondary" paragraph>
                    {category.description || 'No description provided'}
                  </Typography>
                </CardContent>
                
                <Divider />
                
                <CardActions>
                  <Button
                    size="small"
                    startIcon={<EditIcon />}
                    component={RouterLink}
                    to={`/categories/edit/${category._id}`}
                  >
                    Edit
                  </Button>
                  <Button
                    size="small"
                    component={RouterLink}
                    to={`/items?category=${category._id}`}
                  >
                    View Items
                  </Button>
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}
      
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem 
          component={RouterLink} 
          to={selectedCategory ? `/categories/edit/${selectedCategory._id}` : '#'}
          onClick={handleMenuClose}
        >
          <EditIcon fontSize="small" sx={{ mr: 1 }} />
          Edit
        </MenuItem>
        
        <Divider />
        
        <MenuItem onClick={handleDeleteCategory} sx={{ color: 'error.main' }}>
          <DeleteIcon fontSize="small" sx={{ mr: 1 }} />
          Delete
        </MenuItem>
      </Menu>
      
      {/* Bulk Add Dialog */}
      <BulkAddDialog
        open={bulkAddOpen}
        onClose={() => setBulkAddOpen(false)}
        onSubmit={async (categories) => {
          try {
            const result = await bulkService.bulkAdd('categories', categories);
            
            // Refresh the categories list immediately without delay
            const response = await axios.get('/api/categories');
            if (response.data.success) {
              setCategories(response.data.data || []);
            }
            
            return result;
          } catch (err) {
            setErrorAlert('Error adding categories: ' + (err.message || 'Unknown error'));
            throw err;
          }
        }}
        entityType="categories"
        fields={{
          name: {
            label: 'Name',
            required: true
          },
          description: {
            label: 'Description',
            multiline: true,
            rows: 2
          }
        }}
        defaultValues={{
          name: '',
          description: ''
        }}
      />
    </Container>
  );
};

export default Categories;

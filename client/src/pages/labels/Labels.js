import React, { useState, useEffect, useContext } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import axios from '../../utils/axiosConfig';
import bulkService from '../../services/bulkService';
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
  Chip,
  Divider,
  IconButton,
  Menu,
  MenuItem
} from '@mui/material';
import {
  Search as SearchIcon,
  Add as AddIcon,
  MoreVert as MoreVertIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Label as LabelIcon
} from '@mui/icons-material';
import { AlertContext } from '../../context/AlertContext';
import BulkAddDialog from '../../components/bulk/BulkAddDialog';

const Labels = () => {
  const { setSuccessAlert, setErrorAlert } = useContext(AlertContext);
  const [loading, setLoading] = useState(true);
  const [labels, setLabels] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedLabel, setSelectedLabel] = useState(null);
  const [bulkAddOpen, setBulkAddOpen] = useState(false);

  useEffect(() => {
    const fetchLabels = async () => {
      try {
        setLoading(true);
        
        // Make API calls to fetch labels and label counts
        const [labelsResponse, countsResponse] = await Promise.all([
          axios.get('/api/labels'),
          axios.get('/api/labels/counts')
        ]);
        
        console.log('Labels API response:', labelsResponse.data);
        console.log('Label counts API response:', countsResponse.data);
        
        if (labelsResponse.data?.data && countsResponse.data?.data) {
          // Create a map of label IDs to item counts
          const countMap = {};
          countsResponse.data.data.forEach(item => {
            countMap[item.labelId] = item.count;
          });
          
          // Process the labels from the API response with real item counts
          const labelsWithItemCount = labelsResponse.data.data.map(label => ({
            ...label,
            itemCount: countMap[label._id] || 0
          }));
          
          setLabels(labelsWithItemCount);
        } else {
          // Fallback to empty array if no data
          setLabels([]);
        }
        
        setLoading(false);
      } catch (err) {
        const errorMessage = err.response?.data?.message || err.message;
        setErrorAlert(`Error loading labels: ${errorMessage}`);
        setLoading(false);
        console.error('Error loading labels:', err);
      }
    };
    
    fetchLabels();
  }, [setErrorAlert]);

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
  };

  const handleMenuOpen = (event, label) => {
    setAnchorEl(event.currentTarget);
    setSelectedLabel(label);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedLabel(null);
  };

  const handleDeleteLabel = async () => {
    if (!selectedLabel) return;
    
    try {
      // Make an API call to delete the label
      await axios.delete(`/api/labels/${selectedLabel._id}`);
      
      // Update the local state
      const updatedLabels = labels.filter(label => label._id !== selectedLabel._id);
      setLabels(updatedLabels);
      
      setSuccessAlert(`${selectedLabel.name} deleted successfully`);
    } catch (err) {
      const errorMessage = err.response?.data?.message || err.message;
      setErrorAlert(`Error deleting label: ${errorMessage}`);
      console.error('Error deleting label:', err);
    } finally {
      handleMenuClose();
    }
  };

  // Filter labels based on search term
  const filteredLabels = labels.filter(label => 
    label.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (label.description && label.description.toLowerCase().includes(searchTerm.toLowerCase()))
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
          Labels
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
            to="/labels/create"
          >
            Add Label
          </Button>
        </Box>
      </Box>
      
      <Paper sx={{ p: 2, mb: 3 }}>
        <TextField
          fullWidth
          placeholder="Search labels by name or description"
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
      
      {filteredLabels.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant="h6" color="text.secondary">
            No labels found
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Try adjusting your search or add a new label
          </Typography>
        </Paper>
      ) : (
        <Grid container spacing={3}>
          {filteredLabels.map((label) => (
            <Grid item xs={12} sm={6} md={4} key={label._id}>
              <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                <CardContent sx={{ flexGrow: 1 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <LabelIcon 
                        sx={{ 
                          color: label.color, 
                          mr: 1,
                          transform: 'rotate(180deg)'
                        }} 
                      />
                      <Typography variant="h6" component="h2">
                        {label.name}
                      </Typography>
                    </Box>
                    
                    <IconButton 
                      size="small" 
                      onClick={(e) => handleMenuOpen(e, label)}
                      aria-label="more options"
                    >
                      <MoreVertIcon />
                    </IconButton>
                  </Box>
                  
                  <Chip
                    label={`${label.itemCount} items`}
                    size="small"
                    sx={{ 
                      mt: 1, 
                      mb: 2,
                      bgcolor: label.color,
                      color: 'white'
                    }}
                  />
                  
                  <Typography variant="body2" color="text.secondary" paragraph>
                    {label.description || 'No description provided'}
                  </Typography>
                </CardContent>
                
                <Divider />
                
                <CardActions>
                  <Button
                    size="small"
                    startIcon={<EditIcon />}
                    component={RouterLink}
                    to={`/labels/edit/${label._id}`}
                  >
                    Edit
                  </Button>
                  <Button
                    size="small"
                    component={RouterLink}
                    to={`/items?label=${label._id}`}
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
          to={selectedLabel ? `/labels/edit/${selectedLabel._id}` : '#'}
          onClick={handleMenuClose}
        >
          <EditIcon fontSize="small" sx={{ mr: 1 }} />
          Edit
        </MenuItem>
        
        <Divider />
        
        <MenuItem onClick={handleDeleteLabel} sx={{ color: 'error.main' }}>
          <DeleteIcon fontSize="small" sx={{ mr: 1 }} />
          Delete
        </MenuItem>
      </Menu>
      
      {/* Bulk Add Dialog */}
      <BulkAddDialog
        open={bulkAddOpen}
        onClose={() => setBulkAddOpen(false)}
        onSubmit={async (labels) => {
          try {
            const result = await bulkService.bulkAdd('labels', labels);
            setSuccessAlert(`Successfully added ${result.count} labels`);
            
            // Refresh the labels list
            const [labelsResponse, countsResponse] = await Promise.all([
              axios.get('/api/labels'),
              axios.get('/api/labels/counts')
            ]);
            
            if (labelsResponse.data?.data && countsResponse.data?.data) {
              // Create a map of label IDs to item counts
              const countMap = {};
              countsResponse.data.data.forEach(item => {
                countMap[item.labelId] = item.count;
              });
              
              // Process the labels from the API response with real item counts
              const labelsWithItemCount = labelsResponse.data.data.map(label => ({
                ...label,
                itemCount: countMap[label._id] || 0
              }));
              
              setLabels(labelsWithItemCount);
            }
            
            return result;
          } catch (err) {
            setErrorAlert('Error adding labels: ' + (err.message || 'Unknown error'));
            throw err;
          }
        }}
        entityType="labels"
        fields={{
          name: {
            label: 'Name',
            required: true
          },
          description: {
            label: 'Description',
            multiline: true,
            rows: 2
          },
          color: {
            label: 'Color (hex)',
            required: true,
            helperText: 'e.g. #FF5733'
          }
        }}
        defaultValues={{
          name: '',
          description: '',
          color: '#3f51b5'
        }}
      />
    </Container>
  );
};

export default Labels;

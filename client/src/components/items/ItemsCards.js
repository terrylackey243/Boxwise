import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  Typography,
  Grid,
  Paper,
  Chip,
  IconButton,
  TextField,
  ButtonGroup
} from '@mui/material';
import {
  Add as AddIcon,
  MoreVert as MoreVertIcon,
  AddCircleOutline as IncreaseIcon,
  RemoveCircleOutline as DecreaseIcon
} from '@mui/icons-material';

/**
 * Component for displaying items in a card view (for mobile)
 * @param {Object} props - Component props
 * @param {Array} props.items - Array of items to display
 * @param {Function} props.onActionClick - Function to call when action button is clicked
 * @param {Function} props.onUpdateQuantity - Function to call when quantity is updated
 * @returns {JSX.Element} - Rendered component
 */
const ItemsCards = ({ items, onActionClick, onUpdateQuantity }) => {
  const [editingQuantity, setEditingQuantity] = useState({});
  const navigate = useNavigate();

  if (items.length === 0) {
    return (
      <Paper sx={{ p: 3, textAlign: 'center' }}>
        <Typography variant="body1" color="text.secondary" gutterBottom>
          No items found
        </Typography>
        
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          component="a"
          href="/items/create"
          sx={{ mt: 1 }}
        >
          Add Your First Item
        </Button>
      </Paper>
    );
  }

  return (
    <Grid container spacing={2}>
      {items.map((item) => (
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
                {item.loanDetails && item.loanDetails.isLoaned && (
                  <Chip
                    label="Loaned"
                    size="small"
                    color="primary"
                    sx={{ ml: 1 }}
                  />
                )}
              </Typography>
              <IconButton
                onClick={(e) => {
                  e.stopPropagation();
                  onActionClick(e, item._id);
                }}
                size="small"
              >
                <MoreVertIcon />
              </IconButton>
            </Box>
            
            <Grid container spacing={1}>
              <Grid item xs={6}>
                <Typography variant="body2" color="text.secondary">
                  Quantity:
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <TextField
                    size="small"
                    type="number"
                    value={editingQuantity[item._id] !== undefined ? editingQuantity[item._id] : (item.quantity || 1)}
                    onChange={(e) => {
                      const value = parseInt(e.target.value, 10) || 0;
                      setEditingQuantity({
                        ...editingQuantity,
                        [item._id]: value
                      });
                    }}
                    onBlur={() => {
                      if (editingQuantity[item._id] !== undefined) {
                        onUpdateQuantity(item._id, editingQuantity[item._id]);
                        // Clear the editing state for this item
                        const newEditingQuantity = { ...editingQuantity };
                        delete newEditingQuantity[item._id];
                        setEditingQuantity(newEditingQuantity);
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.target.blur(); // Trigger the onBlur event
                      }
                    }}
                    InputProps={{
                      inputProps: { min: 0 }
                    }}
                    sx={{ 
                      width: '70px', 
                      mr: 1,
                      '& input': {
                        textAlign: 'center',
                      },
                      '& input::-webkit-outer-spin-button, & input::-webkit-inner-spin-button': {
                        '-webkit-appearance': 'none',
                        margin: 0,
                      },
                      '& input[type=number]': {
                        '-moz-appearance': 'textfield',
                      },
                    }}
                    onClick={(e) => e.stopPropagation()} // Prevent card click when clicking on the TextField
                  />
                  <ButtonGroup size="small" onClick={(e) => e.stopPropagation()}>
                    <IconButton 
                      size="small" 
                      color="primary"
                      onClick={(e) => {
                        e.stopPropagation();
                        const currentQuantity = item.quantity || 1;
                        onUpdateQuantity(item._id, currentQuantity + 1);
                      }}
                    >
                      <IncreaseIcon />
                    </IconButton>
                    <IconButton 
                      size="small" 
                      color="primary"
                      onClick={(e) => {
                        e.stopPropagation();
                        const currentQuantity = item.quantity || 1;
                        onUpdateQuantity(item._id, Math.max(0, currentQuantity - 1));
                      }}
                    >
                      <DecreaseIcon />
                    </IconButton>
                  </ButtonGroup>
                </Box>
              </Grid>
              
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
  );
};

export default ItemsCards;

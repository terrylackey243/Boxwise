import React, { useState, useEffect, memo } from 'react';
import axios from '../../utils/axiosConfig';
import {
  TableRow,
  TableCell,
  Box,
  TextField,
  ButtonGroup,
  Chip,
  Typography,
  IconButton,
  Avatar,
  CircularProgress
} from '@mui/material';
import {
  MoreVert as MoreVertIcon,
  AddCircleOutline as IncreaseIcon,
  RemoveCircleOutline as DecreaseIcon,
  Image as ImageIcon
} from '@mui/icons-material';

/**
 * Individual row component for the virtualized items table
 */
const VirtualizedRow = memo(({ data, index, style }) => {
  const {
    items,
    onActionClick,
    onUpdateQuantity,
    canEdit = true,
    isViewer = false,
    navigate
  } = data;
  
  // Initialize all hooks unconditionally (Rules of Hooks)
  const [quantityValue, setQuantityValue] = useState(0);
  const [primaryPhotoUrl, setPrimaryPhotoUrl] = useState('');
  const [photoLoading, setPhotoLoading] = useState(false);
  
  const item = items[index];
  
  // useEffect must be called unconditionally
  useEffect(() => {
    if (item) {
      setQuantityValue(item.quantity || 0);
    }
  }, [item, item?.quantity]); // Also depend on item.quantity to update when it changes
  
  // Fetch primary photo if available
  useEffect(() => {
    if (!item || !item.attachments || item.attachments.length === 0) {
      console.log('VirtualizedRow - No attachments for item:', item?._id);
      return;
    }
    
    const fetchPrimaryPhoto = async () => {
      // Log the attachments we have
      console.log('VirtualizedRow - Item attachments:', item.attachments);
      
      // Find primary attachment (checking both isPrimary and isPrimaryPhoto for compatibility)
      const primaryAttachment = item.attachments.find(att => att.isPrimary || att.isPrimaryPhoto);
      if (!primaryAttachment) {
        console.log('VirtualizedRow - No primary attachment found for item:', item._id);
        return;
      }
      
      console.log('VirtualizedRow - Found primary attachment:', primaryAttachment);
      setPhotoLoading(true);
      
      try {
        console.log('VirtualizedRow - Fetching URL for attachment:', primaryAttachment._id);
        const response = await axios.get(`/api/items/${item._id}/attachments/${primaryAttachment._id}/url`);
        if (response.data.success) {
          console.log('VirtualizedRow - Got URL:', response.data.data.downloadUrl);
          setPrimaryPhotoUrl(response.data.data.downloadUrl);
        }
      } catch (error) {
        console.error('Error getting primary photo URL:', error);
      } finally {
        setPhotoLoading(false);
      }
    };
    
    fetchPrimaryPhoto();
  }, [item]);
  
  // Return early after all hooks have been called
  if (!item) return null;
  
  const handleQuantityChange = (e) => {
    const value = parseInt(e.target.value, 10);
    if (!isNaN(value)) {
      setQuantityValue(value);
    }
  };
  
  const handleBlur = () => {
    onUpdateQuantity(item._id, quantityValue);
  };
  
  const handleIncrement = (e) => {
    e.stopPropagation();
    const newValue = (item.quantity || 0) + 1;
    setQuantityValue(newValue);
    onUpdateQuantity(item._id, newValue);
  };
  
  const handleDecrement = (e) => {
    e.stopPropagation();
    if (item.quantity > 0) {
      const newValue = item.quantity - 1;
      setQuantityValue(newValue);
      onUpdateQuantity(item._id, newValue);
    }
  };
  
  const handleRowClick = () => {
    navigate(`/items/${item._id}`);
  };
  
  return (
    <div style={style}>
      <TableRow 
        hover
        onClick={handleRowClick}
        sx={{
          height: 60, // Increased to accommodate the thumbnail
          '&:nth-of-type(odd)': {
            backgroundColor: 'background.default',
          },
          ...(item.isArchived ? { opacity: 0.5 } : {}),
          '&:hover': { cursor: 'pointer' }
        }}
      >
        <TableCell>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            {/* Primary Photo Thumbnail */}
            <Box sx={{ mr: 2, width: 40, height: 40, position: 'relative' }}>
              {photoLoading ? (
                <CircularProgress size={20} sx={{ position: 'absolute', top: '10px', left: '10px' }} />
              ) : primaryPhotoUrl ? (
                <Avatar 
                  src={primaryPhotoUrl} 
                  alt={item.name} 
                  variant="rounded"
                  sx={{ width: 40, height: 40 }}
                />
              ) : (
                <Avatar 
                  variant="rounded"
                  sx={{ 
                    width: 40, 
                    height: 40, 
                    backgroundColor: 'rgba(0,0,0,0.08)',
                    color: 'rgba(0,0,0,0.38)'
                  }}
                >
                  <ImageIcon fontSize="small" />
                </Avatar>
              )}
            </Box>
            
            <Box>
              <Typography variant="body1">
                {item.name || 'Unnamed Item'}
              </Typography>
              <Box sx={{ display: 'flex', mt: 0.5 }}>
                {item.isArchived === true && (
                  <Chip
                    label="Archived"
                    size="small"
                    color="default"
                    sx={{ mr: 1, height: 20 }}
                  />
                )}
                {item.loanDetails && item.loanDetails.isLoaned && (
                  <Chip
                    label="Loaned"
                    size="small"
                    color="primary"
                    sx={{ mr: 1, height: 20 }}
                  />
                )}
              </Box>
            </Box>
          </Box>
        </TableCell>
        
        <TableCell>{item.category?.name || 'No category'}</TableCell>
        <TableCell>{item.location?.name || 'No location'}</TableCell>
        
        <TableCell>
          <Box sx={{ display: 'flex', alignItems: 'center' }} onClick={(e) => e.stopPropagation()}>
            {canEdit && !isViewer ? (
              <>
                <ButtonGroup size="small">
                  <IconButton 
                    size="small" 
                    onClick={handleDecrement}
                    disabled={item.quantity <= 0}
                  >
                    <DecreaseIcon fontSize="small" />
                  </IconButton>
                  
                  <TextField
                    variant="outlined"
                    size="small"
                    value={quantityValue}
                    onChange={handleQuantityChange}
                    onBlur={handleBlur}
                    inputProps={{ 
                      min: 0, 
                      style: { textAlign: 'center' } 
                    }}
                    sx={{ 
                      width: 60,
                      '& input::-webkit-outer-spin-button, & input::-webkit-inner-spin-button': {
                        '-webkit-appearance': 'none',
                        margin: 0,
                      },
                      '& input[type=number]': {
                        '-moz-appearance': 'textfield',
                      },
                    }}
                  />
                  
                  <IconButton 
                    size="small" 
                    onClick={handleIncrement}
                  >
                    <IncreaseIcon fontSize="small" />
                  </IconButton>
                </ButtonGroup>
              </>
            ) : (
              <Typography>{item.quantity || 0}</Typography>
            )}
          </Box>
        </TableCell>
        
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
          {item.updatedAt ? new Date(item.updatedAt).toLocaleDateString() : 'N/A'}
        </TableCell>
        
        <TableCell align="right">
          <IconButton
            onClick={(e) => {
              e.stopPropagation();
              onActionClick(e, item._id);
            }}
            size="small"
          >
            <MoreVertIcon />
          </IconButton>
        </TableCell>
      </TableRow>
    </div>
  );
});

export default VirtualizedRow;

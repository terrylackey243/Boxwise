import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from '../../utils/axiosConfig';
import {
  Box,
  TableCell,
  TableRow,
  Typography,
  Chip,
  IconButton,
  TextField,
  ButtonGroup,
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
 * Component for a single item row in the items table
 */
const ItemRow = ({ 
  item, 
  onActionClick, 
  onUpdateQuantity,
  editingQuantity,
  setEditingQuantity
}) => {
  const navigate = useNavigate();
  const [primaryPhotoUrl, setPrimaryPhotoUrl] = useState('');
  const [photoLoading, setPhotoLoading] = useState(false);

  // Fetch primary photo URL if available
  useEffect(() => {
    const fetchPrimaryPhoto = async () => {
      // Debug log to see what attachments we're getting
      console.log('ItemRow - Item attachments:', item.attachments);
      
      if (!item.attachments || item.attachments.length === 0) {
        console.log('ItemRow - No attachments for item:', item._id);
        return;
      }
      
      // Find primary attachment (checking both isPrimary and isPrimaryPhoto for compatibility)
      const primaryAttachment = item.attachments.find(att => att.isPrimary || att.isPrimaryPhoto);
      if (!primaryAttachment) {
        console.log('ItemRow - No primary attachment found for item:', item._id);
        return;
      }
      
      console.log('ItemRow - Found primary attachment:', primaryAttachment);
      setPhotoLoading(true);
      
      try {
        console.log('ItemRow - Fetching URL for attachment:', primaryAttachment._id);
        const response = await axios.get(`/api/items/${item._id}/attachments/${primaryAttachment._id}/url`);
        if (response.data.success) {
          console.log('ItemRow - Got URL:', response.data.data.downloadUrl);
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

  return (
    <TableRow
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
      
      <TableCell align="center">
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
            onClick={(e) => e.stopPropagation()} // Prevent row click when clicking on the TextField
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
  );
};

export default React.memo(ItemRow);

import React, { useState, useCallback, memo } from 'react';
import { FixedSizeList as List } from 'react-window';
import AutoSizer from 'react-virtualized-auto-sizer';
import { useNavigate } from 'react-router-dom';
import {
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  TableContainer,
  Paper,
  IconButton,
  Box,
  TextField,
  ButtonGroup,
  Chip,
  Typography
} from '@mui/material';
import {
  AddCircleOutline as IncreaseIcon,
  RemoveCircleOutline as DecreaseIcon,
  MoreVert as MoreVertIcon
} from '@mui/icons-material';
import { withMemoization, itemPropsAreEqual } from '../optimizations/MemoizedComponents';

// Memoized row component to prevent unnecessary re-renders
const Row = memo(({ data, index, style }) => {
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
  
  const item = items[index];
  
  // useEffect must be called unconditionally
  React.useEffect(() => {
    if (item) {
      setQuantityValue(item.quantity || 0);
    }
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
          height: 53,
          '&:nth-of-type(odd)': {
            backgroundColor: 'background.default',
          },
          ...(item.isArchived ? { opacity: 0.5 } : {}),
          '&:hover': { cursor: 'pointer' }
        }}
      >
        <TableCell>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Typography variant="body1">
              {item.name || 'Unnamed Item'}
            </Typography>
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
}, itemPropsAreEqual);

/**
 * VirtualizedItemsTable - A virtualized table for displaying large item lists
 * Only renders items that are visible in the viewport for better performance
 */
const VirtualizedItemsTable = ({
  items = [],
  onActionClick,
  onUpdateQuantity,
  canEdit = true,
  isViewer = false
}) => {
  const navigate = useNavigate();
  
  const itemData = {
    items,
    onActionClick,
    onUpdateQuantity,
    canEdit,
    isViewer,
    navigate
  };
  
  if (!items.length) {
    return (
      <Paper>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Category</TableCell>
                <TableCell>Location</TableCell>
                <TableCell>Quantity</TableCell>
                <TableCell>Labels</TableCell>
                <TableCell>Last Updated</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              <TableRow>
                <TableCell colSpan={7} align="center" sx={{ py: 3 }}>
                  <Typography variant="body1" color="text.secondary">
                    No items found
                  </Typography>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    );
  }
  
  return (
    <Paper sx={{ width: '100%', height: 'calc(100vh - 300px)', minHeight: 400 }}>
      <Table sx={{ tableLayout: 'fixed' }}>
        <TableHead>
          <TableRow>
            <TableCell width="20%">Name</TableCell>
            <TableCell width="15%">Category</TableCell>
            <TableCell width="15%">Location</TableCell>
            <TableCell width="20%">Quantity</TableCell>
            <TableCell width="20%">Labels</TableCell>
            <TableCell width="10%">Last Updated</TableCell>
            <TableCell width="10%" align="right">Actions</TableCell>
          </TableRow>
        </TableHead>
      </Table>
      
      <Box sx={{ height: 'calc(100% - 57px)', width: '100%' }}>
        <AutoSizer>
          {({ height, width }) => (
            <List
              height={height}
              width={width}
              itemCount={items.length}
              itemSize={53} // Match the TableRow height
              itemData={itemData}
            >
              {Row}
            </List>
          )}
        </AutoSizer>
      </Box>
    </Paper>
  );
};

// Export memoized component to prevent unnecessary re-renders
export default withMemoization(VirtualizedItemsTable);

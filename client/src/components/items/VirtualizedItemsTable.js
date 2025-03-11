import React, { useState, useCallback, memo } from 'react';
import { FixedSizeList as List } from 'react-window';
import AutoSizer from 'react-virtualized-auto-sizer';
import {
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Paper,
  IconButton,
  Box,
  TextField,
  InputAdornment,
  Typography
} from '@mui/material';
import {
  Add as AddIcon,
  Remove as RemoveIcon,
  MoreVert as MoreVertIcon
} from '@mui/icons-material';
import { withMemoization, itemPropsAreEqual } from '../optimizations/MemoizedComponents';

// Memoized row component to prevent unnecessary re-renders
const Row = memo(({ data, index, style }) => {
  const {
    items,
    onActionClick,
    onUpdateQuantity,
    canEdit = true
  } = data;
  
  const item = items[index];
  if (!item) return null;
  
  const handleQuantityChange = (e) => {
    const value = parseInt(e.target.value);
    if (!isNaN(value)) {
      onUpdateQuantity(item._id, value);
    }
  };
  
  const handleIncrement = () => {
    onUpdateQuantity(item._id, (item.quantity || 0) + 1);
  };
  
  const handleDecrement = () => {
    if (item.quantity > 0) {
      onUpdateQuantity(item._id, item.quantity - 1);
    }
  };
  
  return (
    <div style={style}>
      <TableRow 
        hover
        sx={{
          height: 53,
          '&:nth-of-type(odd)': {
            backgroundColor: 'background.default',
          },
          ...(item.isArchived ? { opacity: 0.5 } : {})
        }}
      >
        <TableCell>{item.name}</TableCell>
        <TableCell>{item.category?.name || '-'}</TableCell>
        <TableCell>{item.location?.name || '-'}</TableCell>
        <TableCell>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            {canEdit ? (
              <>
                <IconButton 
                  size="small" 
                  onClick={handleDecrement}
                  disabled={item.quantity <= 0}
                >
                  <RemoveIcon fontSize="small" />
                </IconButton>
                
                <TextField
                  variant="outlined"
                  size="small"
                  value={item.quantity || 0}
                  onChange={handleQuantityChange}
                  inputProps={{ min: 0, style: { textAlign: 'center' } }}
                  sx={{ width: 60, mx: 1 }}
                />
                
                <IconButton 
                  size="small" 
                  onClick={handleIncrement}
                >
                  <AddIcon fontSize="small" />
                </IconButton>
              </>
            ) : (
              <Typography>{item.quantity || 0}</Typography>
            )}
          </Box>
        </TableCell>
        <TableCell>
          {item.labels?.map(label => label.name).join(', ') || '-'}
        </TableCell>
        <TableCell align="right">
          <IconButton onClick={(e) => onActionClick(e, item._id)}>
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
  const [hoveredRow, setHoveredRow] = useState(null);
  
  const itemData = {
    items,
    onActionClick,
    onUpdateQuantity,
    hoveredRow,
    setHoveredRow,
    canEdit: canEdit && !isViewer
  };
  
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

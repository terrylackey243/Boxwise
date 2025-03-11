import React, { memo } from 'react';
import { 
  Paper, 
  IconButton, 
  Table, 
  TableHead, 
  TableRow, 
  TableCell, 
  TableBody,
  TextField,
  Typography
} from '@mui/material';
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  MoreVert as MoreVertIcon
} from '@mui/icons-material';
import { Link as RouterLink } from 'react-router-dom';
import { FixedSizeList as List } from 'react-window';
import AutoSizer from 'react-virtualized-auto-sizer';

// Memoized row component for better performance
const ItemRow = memo(({ item, onActionClick, onUpdateQuantity, style }) => {
  const handleQuantityChange = (e) => {
    onUpdateQuantity(item._id, parseInt(e.target.value, 10));
  };

  return (
    <TableRow hover style={style}>
      <TableCell>
        <RouterLink to={`/items/${item._id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
          {item.name}
        </RouterLink>
      </TableCell>
      <TableCell>{item.description}</TableCell>
      <TableCell>
        <TextField
          type="number"
          value={item.quantity}
          onChange={handleQuantityChange}
          InputProps={{ inputProps: { min: 0 } }}
          size="small"
          variant="outlined"
          style={{ width: '70px' }}
        />
      </TableCell>
      <TableCell>{item.location?.name || ''}</TableCell>
      <TableCell>{item.category?.name || ''}</TableCell>
      <TableCell>
        <IconButton 
          component={RouterLink} 
          to={`/items/edit/${item._id}`}
          size="small"
        >
          <EditIcon fontSize="small" />
        </IconButton>
        <IconButton 
          size="small"
          onClick={(e) => onActionClick(e, item._id)}
        >
          <MoreVertIcon fontSize="small" />
        </IconButton>
      </TableCell>
    </TableRow>
  );
});

// Virtualized table for better performance with large lists
const VirtualizedItemsTable = ({ items, onActionClick, onUpdateQuantity }) => {
  if (!items.length) {
    return (
      <Paper sx={{ p: 2, mt: 2, textAlign: 'center' }}>
        <Typography variant="body1">No items found</Typography>
      </Paper>
    );
  }

  return (
    <Paper sx={{ mb: 2, overflow: 'hidden' }}>
      <Table aria-label="items table" size="small">
        <TableHead>
          <TableRow>
            <TableCell>Name</TableCell>
            <TableCell>Description</TableCell>
            <TableCell>Quantity</TableCell>
            <TableCell>Location</TableCell>
            <TableCell>Category</TableCell>
            <TableCell>Actions</TableCell>
          </TableRow>
        </TableHead>
      </Table>
      
      <div style={{ height: Math.min(500, items.length * 53) }}>
        <AutoSizer>
          {({ height, width }) => (
            <List
              height={height}
              width={width}
              itemCount={items.length}
              itemSize={53} // Approximate height of a TableRow
            >
              {({ index, style }) => (
                <ItemRow
                  item={items[index]}
                  onActionClick={onActionClick}
                  onUpdateQuantity={onUpdateQuantity}
                  style={style}
                />
              )}
            </List>
          )}
        </AutoSizer>
      </div>
    </Paper>
  );
};

export default memo(VirtualizedItemsTable);

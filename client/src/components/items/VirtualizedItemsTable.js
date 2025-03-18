import React from 'react';
import { FixedSizeList as List } from 'react-window';
import AutoSizer from 'react-virtualized-auto-sizer';
import { useNavigate } from 'react-router-dom';
import VirtualizedRow from './VirtualizedRow';
import {
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  TableContainer,
  Paper,
  Box,
  Typography
} from '@mui/material';

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
              itemSize={60} // Match the increased row height for thumbnails
              itemData={itemData}
            >
              {VirtualizedRow}
            </List>
          )}
        </AutoSizer>
      </Box>
    </Paper>
  );
};

export default VirtualizedItemsTable;

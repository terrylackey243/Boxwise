import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ItemRow from './ItemRow';
import {
  Box,
  Button,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
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
 * Component for displaying items in a table view
 * @param {Object} props - Component props
 * @param {Array} props.items - Array of items to display
 * @param {Function} props.onActionClick - Function to call when action button is clicked
 * @param {Function} props.onUpdateQuantity - Function to call when quantity is updated
 * @param {boolean} props.canEdit - Whether the user has edit permissions
 * @param {boolean} props.isViewer - Whether the user is a viewer (read-only)
 * @returns {JSX.Element} - Rendered component
 */
const ItemsTable = ({ 
  items, 
  onActionClick, 
  onUpdateQuantity,
  canEdit = true,
  isViewer = false
}) => {
  const [editingQuantity, setEditingQuantity] = useState({});
  const navigate = useNavigate();

  if (items.length === 0) {
    return (
      <Paper>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell align="center">Quantity</TableCell>
                <TableCell>Location</TableCell>
                <TableCell>Category</TableCell>
                <TableCell>Labels</TableCell>
                <TableCell>Last Updated</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              <TableRow>
                <TableCell colSpan={7} align="center" sx={{ py: 3 }}>
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
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    );
  }

  return (
    <Paper>
      <TableContainer>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell align="center">Quantity</TableCell>
              <TableCell>Location</TableCell>
              <TableCell>Category</TableCell>
              <TableCell>Labels</TableCell>
              <TableCell>Last Updated</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          
          <TableBody>
            {items.map((item) => (
              <ItemRow
                key={item._id}
                item={item}
                onActionClick={onActionClick}
                onUpdateQuantity={onUpdateQuantity}
                editingQuantity={editingQuantity}
                setEditingQuantity={setEditingQuantity}
              />
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Paper>
  );
};

export default ItemsTable;

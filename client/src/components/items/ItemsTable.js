import React from 'react';
import { useNavigate } from 'react-router-dom';
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
  IconButton
} from '@mui/material';
import {
  Add as AddIcon,
  MoreVert as MoreVertIcon
} from '@mui/icons-material';

/**
 * Component for displaying items in a table view
 * @param {Object} props - Component props
 * @param {Array} props.items - Array of items to display
 * @param {Function} props.onActionClick - Function to call when action button is clicked
 * @returns {JSX.Element} - Rendered component
 */
const ItemsTable = ({ items, onActionClick }) => {
  const navigate = useNavigate();

  if (items.length === 0) {
    return (
      <Paper>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Location</TableCell>
                <TableCell>Category</TableCell>
                <TableCell>Labels</TableCell>
                <TableCell>UPC Code</TableCell>
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
              <TableCell>Location</TableCell>
              <TableCell>Category</TableCell>
              <TableCell>Labels</TableCell>
              <TableCell>UPC Code</TableCell>
              <TableCell>Last Updated</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          
          <TableBody>
            {items.map((item) => (
              <TableRow
                key={item._id}
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
                  {item.upcCode || 'N/A'}
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
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Paper>
  );
};

export default ItemsTable;

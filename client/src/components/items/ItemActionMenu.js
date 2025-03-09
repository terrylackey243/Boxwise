import React from 'react';
import { Link as RouterLink } from 'react-router-dom';
import {
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText
} from '@mui/material';
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  Archive as ArchiveIcon
} from '@mui/icons-material';

/**
 * Component for displaying the item action menu
 * @param {Object} props - Component props
 * @param {Object} props.anchorEl - The anchor element for the menu
 * @param {boolean} props.open - Whether the menu is open
 * @param {Function} props.onClose - Function to call when the menu is closed
 * @param {string} props.itemId - The ID of the item
 * @param {Function} props.onArchive - Function to call when the archive option is selected
 * @param {Function} props.onDelete - Function to call when the delete option is selected
 * @returns {JSX.Element} - Rendered component
 */
const ItemActionMenu = ({ 
  anchorEl, 
  open, 
  onClose, 
  itemId, 
  onArchive, 
  onDelete 
}) => {
  return (
    <Menu
      anchorEl={anchorEl}
      open={open}
      onClose={onClose}
    >
      <MenuItem 
        component={RouterLink} 
        to={`/items/edit/${itemId}`}
      >
        <ListItemIcon>
          <EditIcon fontSize="small" />
        </ListItemIcon>
        <ListItemText>Edit</ListItemText>
      </MenuItem>
      
      <MenuItem onClick={() => onArchive(itemId)}>
        <ListItemIcon>
          <ArchiveIcon fontSize="small" />
        </ListItemIcon>
        <ListItemText>Archive</ListItemText>
      </MenuItem>
      
      <MenuItem onClick={() => onDelete(itemId)}>
        <ListItemIcon>
          <DeleteIcon fontSize="small" />
        </ListItemIcon>
        <ListItemText>Delete</ListItemText>
      </MenuItem>
    </Menu>
  );
};

export default ItemActionMenu;

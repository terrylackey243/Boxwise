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
 * @param {boolean} props.canEdit - Whether the user has edit permissions
 * @param {boolean} props.isViewer - Whether the user is a viewer (read-only)
 * @returns {JSX.Element} - Rendered component
 */
const ItemActionMenu = ({ 
  anchorEl, 
  open, 
  onClose, 
  itemId, 
  onArchive, 
  onDelete,
  canEdit = true,
  isViewer = false
}) => {
  return (
    <Menu
      anchorEl={anchorEl}
      open={open}
      onClose={onClose}
    >
      {/* Only show edit option if user has edit permissions */}
      {!isViewer && canEdit && (
        <MenuItem 
          component={RouterLink} 
          to={`/items/edit/${itemId}`}
        >
          <ListItemIcon>
            <EditIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Edit</ListItemText>
        </MenuItem>
      )}
      
      {/* Only show archive option if user has edit permissions */}
      {!isViewer && canEdit && (
        <MenuItem onClick={() => onArchive(itemId)}>
          <ListItemIcon>
            <ArchiveIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Archive</ListItemText>
        </MenuItem>
      )}
      
      {/* Only show delete option if user has edit permissions */}
      {!isViewer && canEdit && (
        <MenuItem onClick={() => onDelete(itemId)}>
          <ListItemIcon>
            <DeleteIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Delete</ListItemText>
        </MenuItem>
      )}
      
      {/* Show message if user is viewer with no edit options */}
      {isViewer && (
        <MenuItem disabled>
          <ListItemText style={{ textAlign: 'center' }}>
            View-only mode
          </ListItemText>
        </MenuItem>
      )}
    </Menu>
  );
};

export default ItemActionMenu;

import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Typography,
  Box,
  Paper,
  List,
  ListItem,
  ListItemText,
  IconButton,
  Divider,
  Alert,
  CircularProgress
} from '@mui/material';
import {
  Close as CloseIcon,
  Delete as DeleteIcon,
  Add as AddIcon
} from '@mui/icons-material';

/**
 * A reusable dialog component for bulk adding entities (items, locations, labels, categories)
 * 
 * @param {Object} props
 * @param {boolean} props.open - Whether the dialog is open
 * @param {Function} props.onClose - Function to call when the dialog is closed
 * @param {Function} props.onSubmit - Function to call when the form is submitted
 * @param {string} props.entityType - The type of entity being added ('items', 'locations', 'labels', 'categories')
 * @param {Object} props.fields - The fields to display in the form
 * @param {Object} props.defaultValues - Default values for the fields
 */
const BulkAddDialog = ({ 
  open, 
  onClose, 
  onSubmit, 
  entityType, 
  fields = {}, 
  defaultValues = {} 
}) => {
  const [entities, setEntities] = useState([{ ...defaultValues, id: Date.now() }]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Get the singular form of the entity type for display
  const entityName = {
    'items': 'Item',
    'locations': 'Location',
    'labels': 'Label',
    'categories': 'Category'
  }[entityType] || 'Entity';

  // Handle adding a new entity to the list
  const handleAddEntity = () => {
    setEntities([...entities, { ...defaultValues, id: Date.now() }]);
  };

  // Handle removing an entity from the list
  const handleRemoveEntity = (id) => {
    setEntities(entities.filter(entity => entity.id !== id));
  };

  // Handle field change for a specific entity
  const handleFieldChange = (id, field, value) => {
    setEntities(entities.map(entity => 
      entity.id === id ? { ...entity, [field]: value } : entity
    ));
  };

  // Handle form submission
  const handleSubmit = async () => {
    try {
      setIsSubmitting(true);
      setError(null);
      
      // Filter out any entities with empty required fields
      const validEntities = entities.filter(entity => {
        // Check if all required fields have values
        return Object.entries(fields).every(([field, config]) => {
          return !config.required || entity[field];
        });
      });
      
      if (validEntities.length === 0) {
        setError('Please fill in at least one entity with all required fields');
        setIsSubmitting(false);
        return;
      }
      
      // Remove the temporary id property before submitting
      const entitiesToSubmit = validEntities.map(({ id, ...rest }) => rest);
      
      // Call the onSubmit function with the entities
      await onSubmit(entitiesToSubmit);
      
      // Show success message
      setSuccess(`Successfully added ${validEntities.length} ${entityType}`);
      
      // Reset the form
      setEntities([{ ...defaultValues, id: Date.now() }]);
      
      // Close the dialog after a delay
      setTimeout(() => {
        onClose();
        setSuccess(null);
      }, 2000);
    } catch (err) {
      setError(err.message || `Failed to add ${entityType}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog 
      open={open} 
      onClose={onClose} 
      maxWidth="md" 
      fullWidth
      PaperProps={{
        sx: {
          maxHeight: '80vh',
        }
      }}
    >
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h6">Bulk Add {entityName}s</Typography>
        <IconButton edge="end" color="inherit" onClick={onClose} aria-label="close">
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      
      <DialogContent dividers>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        
        {success && (
          <Alert severity="success" sx={{ mb: 2 }}>
            {success}
          </Alert>
        )}
        
        <Typography variant="body2" color="text.secondary" paragraph>
          Add multiple {entityName.toLowerCase()}s at once. Fill in the details for each {entityName.toLowerCase()} and click "Add {entityName}" to add more.
        </Typography>
        
        <List>
          {entities.map((entity, index) => (
            <Paper 
              key={entity.id} 
              elevation={1} 
              sx={{ 
                mb: 2, 
                p: 2,
                border: '1px solid',
                borderColor: 'divider'
              }}
            >
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                <Typography variant="subtitle1">{entityName} #{index + 1}</Typography>
                {entities.length > 1 && (
                  <IconButton 
                    size="small" 
                    color="error" 
                    onClick={() => handleRemoveEntity(entity.id)}
                    aria-label={`remove ${entityName.toLowerCase()} ${index + 1}`}
                  >
                    <DeleteIcon />
                  </IconButton>
                )}
              </Box>
              
              <Divider sx={{ mb: 2 }} />
              
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {Object.entries(fields).map(([field, config]) => (
                  <TextField
                    key={`${entity.id}-${field}`}
                    label={config.label}
                    value={entity[field] || ''}
                    onChange={(e) => handleFieldChange(entity.id, field, e.target.value)}
                    required={config.required}
                    fullWidth
                    size="small"
                    type={config.type || 'text'}
                    multiline={config.multiline}
                    rows={config.rows}
                    select={config.select}
                    SelectProps={config.SelectProps}
                    InputProps={config.InputProps}
                    helperText={config.helperText}
                  />
                ))}
              </Box>
            </Paper>
          ))}
        </List>
        
        <Button
          variant="outlined"
          startIcon={<AddIcon />}
          onClick={handleAddEntity}
          fullWidth
          sx={{ mt: 1 }}
        >
          Add Another {entityName}
        </Button>
      </DialogContent>
      
      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button 
          variant="contained" 
          color="primary" 
          onClick={handleSubmit}
          disabled={isSubmitting}
          startIcon={isSubmitting ? <CircularProgress size={20} /> : null}
        >
          {isSubmitting ? 'Saving...' : `Save ${entities.length} ${entityName}${entities.length !== 1 ? 's' : ''}`}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default BulkAddDialog;

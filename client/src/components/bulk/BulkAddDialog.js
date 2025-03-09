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
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Autocomplete
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
  const [fieldErrors, setFieldErrors] = useState({});

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
    // Update the entity with the new value
    setEntities(entities.map(entity => 
      entity.id === id ? { ...entity, [field]: value } : entity
    ));
    
    // Validate field length for name and description
    if (field === 'name' && value.length > 99) {
      setFieldErrors(prev => ({
        ...prev,
        [`${id}-${field}`]: 'Name cannot exceed 99 characters'
      }));
    } else if (field === 'description' && value.length > 999) {
      setFieldErrors(prev => ({
        ...prev,
        [`${id}-${field}`]: 'Description cannot exceed 999 characters'
      }));
    } else if (fieldErrors[`${id}-${field}`]) {
      // Clear the error if it's fixed
      const newErrors = { ...fieldErrors };
      delete newErrors[`${id}-${field}`];
      setFieldErrors(newErrors);
    }
  };

  // Handle form submission
  const handleSubmit = async () => {
    try {
      setIsSubmitting(true);
      setError(null);
      
      // Check if there are any field errors
      if (Object.keys(fieldErrors).length > 0) {
        setError('Please fix the field errors before submitting');
        setIsSubmitting(false);
        return;
      }
      
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
      
      // Check for name and description length limits
      const invalidEntities = validEntities.filter(entity => 
        (entity.name && entity.name.length > 99) || 
        (entity.description && entity.description.length > 999)
      );
      
      if (invalidEntities.length > 0) {
        setError('Some entities have fields that exceed character limits. Please fix them before submitting.');
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
      <DialogTitle 
        sx={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          fontWeight: 'medium'
        }}
      >
        Bulk Add {entityName}s
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
                  <React.Fragment key={`${entity.id}-${field}`}>
                    {config.select ? (
                      <Autocomplete
                        options={config.options || []}
                        getOptionLabel={(option) => {
                          if (typeof option === 'string') {
                            const foundOption = config.options?.find(opt => opt.value === option);
                            return foundOption ? foundOption.label : option;
                          }
                          return option.label;
                        }}
                        value={
                          entity[field] 
                            ? config.options?.find(opt => opt.value === entity[field]) || null 
                            : null
                        }
                        onChange={(event, newValue) => {
                          handleFieldChange(entity.id, field, newValue ? newValue.value : '');
                        }}
                        isOptionEqualToValue={(option, value) => option.value === value.value}
                        renderInput={(params) => (
                          <TextField
                            {...params}
                            label={config.label}
                            required={config.required}
                            size="small"
                            helperText={config.helperText}
                          />
                        )}
                        disablePortal={false}
                        PopperProps={{ placement: 'bottom-start' }}
                        fullWidth
                        size="small"
                      />
                    ) : (
                      <TextField
                        label={config.label}
                        value={entity[field] || ''}
                        onChange={(e) => handleFieldChange(entity.id, field, e.target.value)}
                        required={config.required}
                        fullWidth
                        size="small"
                        type={config.type || 'text'}
                        multiline={config.multiline}
                        rows={config.rows}
                        InputProps={{
                          ...config.InputProps,
                          // Add red border for name and description fields that exceed limits
                          sx: {
                            ...(config.InputProps?.sx || {}),
                            ...(field === 'name' && entity[field]?.length > 99 && {
                              '& fieldset': { borderColor: 'error.main' },
                              '&:hover fieldset': { borderColor: 'error.main' },
                              '&.Mui-focused fieldset': { borderColor: 'error.main' },
                            }),
                            ...(field === 'description' && entity[field]?.length > 999 && {
                              '& fieldset': { borderColor: 'error.main' },
                              '&:hover fieldset': { borderColor: 'error.main' },
                              '&.Mui-focused fieldset': { borderColor: 'error.main' },
                            })
                          }
                        }}
                        error={!!fieldErrors[`${entity.id}-${field}`]}
                        helperText={
                          fieldErrors[`${entity.id}-${field}`] || 
                          (field === 'name' ? 
                            `${entity[field]?.length || 0}/99 characters${entity[field]?.length > 99 ? ' (limit exceeded)' : ''}` : 
                            field === 'description' ? 
                            `${entity[field]?.length || 0}/999 characters${entity[field]?.length > 999 ? ' (limit exceeded)' : ''}` : 
                            config.helperText)
                        }
                      />
                    )}
                  </React.Fragment>
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

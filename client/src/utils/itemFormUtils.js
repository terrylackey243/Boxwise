import axios from '../utils/axiosConfig';

/**
 * Validates the form data for item creation
 * @param {Object} formData - The form data to validate
 * @param {Object} errors - The current errors state
 * @param {Function} setErrors - Function to update errors
 * @param {Array} locations - Array of available locations
 * @param {Array} categories - Array of available categories
 * @param {Array} recentlyCreatedEntities - Optional tracking of recently created entities
 * @returns {boolean} - Whether the form is valid
 */
export const validateItemForm = (
  formData, 
  setErrors, 
  locations = [], 
  categories = [], 
  recentlyCreatedEntities = { location: null, category: null, labels: [] }
) => {
  const newErrors = {};
  
  // Required fields - ensure name is a string before calling trim()
  if (!formData.name || (typeof formData.name === 'string' && !formData.name.trim())) {
    newErrors.name = 'Name is required';
  }
  
  // Check name length - ensure name is a string
  if (formData.name && typeof formData.name === 'string' && formData.name.length > 100) {
    newErrors.name = 'Name cannot exceed 100 characters';
  }
  
  if (!formData.location) {
    newErrors.location = 'Location is required';
  }
  
  if (!formData.category) {
    newErrors.category = 'Category is required';
  }
  
  // Check if location was recently created and verify it exists in the locations array
  if (recentlyCreatedEntities.location && formData.location === recentlyCreatedEntities.location._id) {
    const locationExists = locations.some(loc => loc._id === recentlyCreatedEntities.location._id);
    if (!locationExists) {
      newErrors.location = 'The selected location was recently created and may not be fully saved yet. Please try again in a moment.';
    }
  }
  
  // Check if category was recently created and verify it exists in the categories array
  if (recentlyCreatedEntities.category && formData.category === recentlyCreatedEntities.category._id) {
    const categoryExists = categories.some(cat => cat._id === recentlyCreatedEntities.category._id);
    if (!categoryExists) {
      newErrors.category = 'The selected category was recently created and may not be fully saved yet. Please try again in a moment.';
    }
  }
  
  // Check description length - ensure description is a string
  if (formData.description && typeof formData.description === 'string' && formData.description.length > 1000) {
    newErrors.description = 'Description cannot exceed 1000 characters';
  }
  
  // Quantity must be a positive number
  if (!formData.quantity || formData.quantity <= 0) {
    newErrors.quantity = 'Quantity must be greater than 0';
  }
  
  // Purchase price must be a valid number if provided
  if (formData.purchasePrice && 
      (typeof formData.purchasePrice !== 'number' && isNaN(parseFloat(formData.purchasePrice)))) {
    newErrors.purchasePrice = 'Purchase price must be a valid number';
  }
  
  // Warranty expiration date must be in the future if provided and not lifetime warranty
  if (!formData.hasLifetimeWarranty && formData.warrantyExpires) {
    try {
      const warrantyDate = new Date(formData.warrantyExpires);
      const today = new Date();
      
      // Check if warranty date is valid before comparing
      if (!isNaN(warrantyDate.getTime()) && warrantyDate <= today) {
        newErrors.warrantyExpires = 'Warranty expiration date must be in the future';
      }
    } catch (e) {
      // If date parsing fails, mark it as invalid
      newErrors.warrantyExpires = 'Invalid warranty expiration date';
    }
  }
  
  // Update the errors state
  setErrors(newErrors);
  
  // Return true if there are no errors
  return Object.keys(newErrors).length === 0;
};

/**
 * Function to detect the type of input based on its value
 * @param {string} value - The value to check the type of
 * @returns {string} - The detected type
 */
export const detectFieldType = (value) => {
  // Check if it's a URL or email
  if (/^(https?:\/\/)?(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)$/.test(value)) {
    return 'url';
  }
  
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
    return 'email';
  }
  
  // Check if it's a date
  if (/^\d{4}-\d{2}-\d{2}$/.test(value) || /^\d{1,2}\/\d{1,2}\/\d{4}$/.test(value)) {
    return 'timestamp';
  }
  
  // Check if it's a number/integer
  if (/^-?\d+(\.\d+)?$/.test(value)) {
    return 'integer';
  }
  
  // Check if it's a boolean
  if (/^(true|false|yes|no)$/i.test(value)) {
    return 'boolean';
  }
  
  // Default to text
  return 'text';
};

/**
 * Maps UI field types to database field types
 * @param {string} uiType - The UI field type
 * @returns {string} - The database field type
 */
export const mapFieldTypeToDbType = (uiType) => {
  // The database only supports 'text', 'integer', 'boolean', 'timestamp'
  switch (uiType) {
    case 'url':
    case 'email':
      return 'text';
    case 'integer':
    case 'boolean':
    case 'timestamp':
    case 'text':
      return uiType;
    default:
      return 'text';
  }
};

/**
 * Submits the form data to create a new item
 * @param {Object} formData - The form data to submit
 * @param {Function} setSubmitting - Function to update submitting state
 * @param {Function} setErrorAlert - Function to show error alerts
 * @param {Function} setErrors - Function to update errors
 * @param {Function} navigate - Navigation function to redirect after success
 * @returns {Promise<void>}
 */
export const submitItemForm = async (
  formData,
  setSubmitting,
  setErrorAlert,
  setErrors,
  navigate
) => {
  console.log('Form submission started');
  setSubmitting(true);
  
  try {
    // Extract just the label IDs from the label objects if they exist
    const labelIds = formData.labels && Array.isArray(formData.labels)
      ? formData.labels.map(label => label?._id).filter(Boolean)
      : [];
    console.log('Label IDs extracted:', labelIds);
    
    const submissionData = {
      ...formData,
      // Override the labels with just the IDs
      labels: labelIds,
      // Include nested purchase details for database model
      purchaseDetails: {
        purchasedFrom: formData.purchasedFrom,
        purchasePrice: formData.purchasePrice,
        purchaseDate: formData.purchaseDate
      },
      // Include nested warranty details for database model
      warrantyDetails: {
        hasLifetimeWarranty: formData.hasLifetimeWarranty,
        warrantyExpires: formData.warrantyExpires,
        warrantyNotes: formData.warrantyNotes
      },
      // Map UI field types to database field types for custom fields (with safety checks)
      customFields: Array.isArray(formData.customFields) 
        ? formData.customFields.map(field => ({
            name: field?.name || '',
            value: field?.value || '',
            type: mapFieldTypeToDbType(field?.type || detectFieldType(field?.value || ''))
          }))
        : []
    };
    
    console.log('Submitting data to API:', submissionData);
    
    try {
      // Make API call to create the item
      console.log('Making API call to /api/items');
      const response = await axios.post('/api/items', submissionData);
      console.log('API response received:', response);
      
      if (response.data.success) {
        console.log('Item created successfully');
        
        // Navigate immediately without showing a success message
        navigate('/items');
      } else {
        console.log('API returned error:', response.data.message);
        setErrorAlert('Error creating item: ' + response.data.message);
      }
    } catch (apiError) {
      console.error('API call error:', apiError);
      throw apiError; // Re-throw to be caught by the outer catch block
    }
  } catch (err) {
    if (err.response && err.response.data && err.response.data.message) {
      if (err.response.data.message.includes('description')) {
        setErrors(prev => ({
          ...prev,
          description: 'Description cannot exceed 1000 characters'
        }));
        setErrorAlert('Error creating item: Description is too long');
      } else if (err.response.data.message.includes('name')) {
        setErrors(prev => ({
          ...prev,
          name: 'Name cannot exceed 100 characters'
        }));
        setErrorAlert('Error creating item: Name is too long');
      } else {
        setErrorAlert('Error creating item: ' + err.response.data.message);
      }
    } else {
      setErrorAlert('Error creating item: ' + (err.message || 'Unknown error'));
    }
    console.error(err);
  } finally {
    setSubmitting(false);
  }
};

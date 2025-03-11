/**
 * Utility functions for form validation
 */

/**
 * Detects the type of a field based on its value
 * @param {string} value - The field value to analyze
 * @returns {string} The detected field type ('url', 'email', 'timestamp', 'integer', 'boolean', or 'text')
 */
export const detectFieldType = (value) => {
  // Check if it's a URL
  if (/^(https?:\/\/)?(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)$/.test(value)) {
    return 'url';
  }
  
  // Check if it's an email
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
 * @returns {string} The corresponding database field type
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
 * Basic validation for item forms
 * @param {Object} formData - The form data to validate
 * @returns {Object} An object with errors and a boolean indicating if the form is valid
 */
export const validateItemForm = (formData) => {
  const errors = {};
  
  // Required fields - make sure name is a string before calling trim()
  if (!formData.name || (typeof formData.name === 'string' && !formData.name.trim())) {
    errors.name = 'Name is required';
  }
  
  // Check name length - make sure name is a string before checking length
  if (formData.name && typeof formData.name === 'string' && formData.name.length > 100) {
    errors.name = 'Name cannot exceed 100 characters';
  }
  
  if (!formData.location) {
    errors.location = 'Location is required';
  }
  
  if (!formData.category) {
    errors.category = 'Category is required';
  }
  
  // Check description length - make sure description is a string before checking length
  if (formData.description && typeof formData.description === 'string' && formData.description.length > 1000) {
    errors.description = 'Description cannot exceed 1000 characters';
  }
  
  // Quantity must be a positive number
  if (formData.quantity <= 0) {
    errors.quantity = 'Quantity must be greater than 0';
  }
  
  // Purchase price must be a valid number if provided
  if (formData.purchasePrice && isNaN(parseFloat(formData.purchasePrice))) {
    errors.purchasePrice = 'Purchase price must be a valid number';
  }
  
  // Warranty expiration date must be in the future if provided and not lifetime warranty
  if (!formData.hasLifetimeWarranty && formData.warrantyExpires) {
    const warrantyDate = new Date(formData.warrantyExpires);
    const today = new Date();
    
    if (warrantyDate <= today) {
      errors.warrantyExpires = 'Warranty expiration date must be in the future';
    }
  }
  
  return {
    errors,
    isValid: Object.keys(errors).length === 0
  };
};

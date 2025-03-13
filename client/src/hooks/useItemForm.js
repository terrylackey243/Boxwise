import { useState, useContext, useEffect } from 'react';
import axios from '../utils/axiosConfig';
import { validateItemForm, mapFieldTypeToDbType, detectFieldType } from '../utils/validationUtils';
import { flattenLocations } from '../utils/locationUtils';
import { AlertContext } from '../context/AlertContext';

/**
 * Custom hook for managing item forms (create, edit)
 * @param {Object} options - Configuration options
 * @param {Object} options.initialData - Initial form data
 * @param {string} options.mode - 'create' or 'edit'
 * @param {string} options.itemId - Item ID (for edit mode)
 * @param {function} options.onSuccess - Callback when form submission succeeds
 * @returns {Object} Form state and handlers
 */
const useItemForm = ({ initialData = {}, mode = 'create', itemId = null, onSuccess }) => {
  const { setSuccessAlert, setErrorAlert } = useContext(AlertContext);
  
  // Form states
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    location: '',
    category: '',
    labels: [],
    quantity: 1,
    serialNumber: '',
    modelNumber: '',
    manufacturer: '',
    notes: '',
    isInsured: false,
    isArchived: false,
    purchasedFrom: '',
    purchasePrice: '',
    purchaseDate: new Date().toISOString().split('T')[0],
    hasLifetimeWarranty: false,
    warrantyExpires: '',
    warrantyNotes: '',
    customFields: [],
    upcCode: '',
    itemUrl: '',
    manualUrl: '',
    ...initialData
  });
  
  // Resource states
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState({});
  const [locations, setLocations] = useState([]);
  const [categories, setCategories] = useState([]);
  const [labels, setLabels] = useState([]);
  const [nextAssetId, setNextAssetId] = useState('');
  
  // Dialog states for quick add functionality
  const [newLocationDialog, setNewLocationDialog] = useState(false);
  const [newCategoryDialog, setNewCategoryDialog] = useState(false);
  const [newLabelDialog, setNewLabelDialog] = useState(false);
  
  // State for new entities
  const [newLocation, setNewLocation] = useState({ name: '', description: '', parent: '' });
  const [newCategory, setNewCategory] = useState({ name: '', description: '' });
  const [newLabel, setNewLabel] = useState({ name: '', description: '', color: '#3f51b5' });
  
  // Initial data loading
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // List to store all API requests
        const requests = [
          axios.get('/api/locations'),
          axios.get('/api/categories'),
          axios.get('/api/labels'),
        ];
        
        // If in edit mode, add request to fetch item details
        if (mode === 'edit' && itemId) {
          requests.push(axios.get(`/api/items/${itemId}`));
        } else {
          // In create mode, fetch next asset ID
          requests.push(axios.get('/api/items/next-asset-id'));
        }
        
        // Execute all requests
        const responses = await Promise.all(requests);
        
        // Process locations
        if (responses[0].data.success) {
          const flatLocations = flattenLocations(responses[0].data.data || []);
          setLocations(flatLocations);
        }
        
        // Process categories
        if (responses[1].data.success) {
          setCategories(responses[1].data.data || []);
        }
        
        // Process labels
        if (responses[2].data.success) {
          setLabels(responses[2].data.data || []);
        }
        
        // Process item details or next asset ID
        if (responses[3].data.success) {
          if (mode === 'edit') {
            // In edit mode, set form data from item
            const item = responses[3].data.data;
            setFormData({
              name: item.name,
              description: item.description || '',
              location: item.location._id,
              category: item.category._id,
              labels: item.labels || [],
              quantity: item.quantity,
              serialNumber: item.serialNumber || '',
              modelNumber: item.modelNumber || '',
              manufacturer: item.manufacturer || '',
              notes: item.notes || '',
              isInsured: item.isInsured,
              isArchived: item.isArchived,
              // Extract purchase details
              purchasedFrom: item.purchaseDetails?.purchasedFrom || '',
              purchasePrice: item.purchaseDetails?.purchasePrice || '',
              purchaseDate: item.purchaseDetails?.purchaseDate 
                ? new Date(item.purchaseDetails.purchaseDate).toISOString().split('T')[0] 
                : '',
              // Extract warranty details
              hasLifetimeWarranty: item.warrantyDetails?.hasLifetimeWarranty || false,
              warrantyExpires: item.warrantyDetails?.warrantyExpires 
                ? new Date(item.warrantyDetails.warrantyExpires).toISOString().split('T')[0] 
                : '',
              warrantyNotes: item.warrantyDetails?.warrantyNotes || '',
              customFields: item.customFields || [],
              upcCode: item.upcCode || '',
              itemUrl: item.itemUrl || '',
              manualUrl: item.manualUrl || ''
            });
          } else {
            // In create mode, set the next asset ID
            setNextAssetId(responses[3].data.data);
            setFormData(prevData => ({
              ...prevData,
              assetId: responses[3].data.data
            }));
          }
        }
        
        setLoading(false);
      } catch (err) {
        setErrorAlert(mode === 'edit' ? 'Error loading item data' : 'Error loading data');
        setLoading(false);
        console.error(err);
      }
    };
    
    fetchData();
  }, [mode, itemId, setErrorAlert, initialData]);

  // Change handler for form fields
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    // Apply automatic trimming for fields with character limits
    let processedValue = value;
    if (type !== 'checkbox') {
      // For name field, limit to 99 characters (1 below the max of 100)
      if (name === 'name' && value.length > 99) {
        processedValue = value.substring(0, 99);
      }
      // For description field, limit to 999 characters (1 below the max of 1000)
      else if (name === 'description' && value.length > 999) {
        processedValue = value.substring(0, 999);
      }
    }
    
    setFormData(prevData => ({
      ...prevData,
      [name]: type === 'checkbox' ? checked : processedValue
    }));
    
    // Clear error for this field if it exists
    if (errors[name]) {
      setErrors(prevErrors => ({
        ...prevErrors,
        [name]: null
      }));
    }
  };
  
  // Change handler for labels
  const handleLabelChange = (event, newValue) => {
    setFormData(prevData => ({
      ...prevData,
      labels: newValue
    }));
  };

  // Custom fields handlers
  const handleAddCustomField = () => {
    setFormData(prevData => ({
      ...prevData,
      customFields: [
        ...prevData.customFields,
        { name: '', value: '', type: 'text' }
      ]
    }));
  };
  
  const handleCustomFieldChange = (index, field, value) => {
    const updatedCustomFields = [...formData.customFields];
    
    // Update the field with the new value
    updatedCustomFields[index] = {
      ...updatedCustomFields[index],
      [field]: value
    };
    
    // If the field being changed is the value, detect and update the type
    if (field === 'value') {
      updatedCustomFields[index].type = detectFieldType(value);
    }
    
    setFormData(prevData => ({
      ...prevData,
      customFields: updatedCustomFields
    }));
  };
  
  const handleRemoveCustomField = (index) => {
    const updatedCustomFields = formData.customFields.filter((_, i) => i !== index);
    
    setFormData(prevData => ({
      ...prevData,
      customFields: updatedCustomFields
    }));
  };

  // Form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Perform essential validations here - especially for required fields
    // Check if name is a non-empty string
    const nameIsValid = typeof formData.name === 'string' && formData.name.trim() !== '';
    if (!nameIsValid) {
      setErrors(prev => ({
        ...prev,
        name: 'Item name is required'
      }));
      setErrorAlert('Item name is required');
      return;
    }
    
    if (!formData.location) {
      setErrors(prev => ({
        ...prev,
        location: 'Location is required'
      }));
      setErrorAlert('Location is required');
      return;
    }
    
    const { errors, isValid } = validateItemForm(formData);
    
    if (!isValid) {
      setErrors(errors);
      return;
    }
    
    setSubmitting(true);
    
    try {
      // Process labels to extract IDs and ensure they're valid
      const labelIds = Array.isArray(formData.labels) 
        ? formData.labels
            .filter(label => label !== null && label !== undefined)
            .map(label => {
              if (typeof label === 'object' && label !== null && label._id) {
                return label._id;
              } else if (typeof label === 'string') {
                return label;
              }
              return null;
            })
            .filter(Boolean)
        : [];
      
      // Create a clean submission data object that matches the expected server-side schema
      const submissionData = {
        // Basic fields
        name: typeof formData.name === 'string' ? formData.name.trim() : '',
        description: typeof formData.description === 'string' ? formData.description.trim() : '',
        location: formData.location || '',
        category: formData.category || '',
        quantity: Number(formData.quantity) || 1,
        serialNumber: typeof formData.serialNumber === 'string' ? formData.serialNumber.trim() : '',
        modelNumber: typeof formData.modelNumber === 'string' ? formData.modelNumber.trim() : '',
        manufacturer: typeof formData.manufacturer === 'string' ? formData.manufacturer.trim() : '',
        notes: typeof formData.notes === 'string' ? formData.notes.trim() : '',
        isInsured: Boolean(formData.isInsured),
        isArchived: Boolean(formData.isArchived),
        
        // URLs
        upcCode: typeof formData.upcCode === 'string' ? formData.upcCode.trim() : '',
        itemUrl: typeof formData.itemUrl === 'string' ? formData.itemUrl.trim() : '',
        manualUrl: typeof formData.manualUrl === 'string' ? formData.manualUrl.trim() : '',
        
        // Labels
        labels: labelIds,
        
        // Asset ID if it exists
        ...(formData.assetId ? { assetId: formData.assetId } : {}),
        
        // Handle purchase details with careful type checking and validation
        purchaseDetails: {
          purchasedFrom: typeof formData.purchasedFrom === 'string' ? formData.purchasedFrom.trim() : '',
          purchaseDate: formData.purchaseDate || null
        },
        
        warrantyDetails: {
          hasLifetimeWarranty: Boolean(formData.hasLifetimeWarranty),
          warrantyExpires: formData.warrantyExpires || null,
          warrantyNotes: typeof formData.warrantyNotes === 'string' ? formData.warrantyNotes.trim() : ''
        }
      };
      
      // Handle purchase price separately with extra validation
      let purchasePrice = null;
      if (formData.purchasePrice) {
        const parsedPrice = parseFloat(formData.purchasePrice);
        if (!isNaN(parsedPrice) && parsedPrice >= 0) {
          purchasePrice = parsedPrice;
        }
      }
      submissionData.purchaseDetails.purchasePrice = purchasePrice;
      
      // Ensure dates are properly formatted or set to null
      // Handle purchase date safely
      if (formData.purchaseDate) {
        try {
          // Check if it's a valid date
          const dateObj = new Date(formData.purchaseDate);
          if (!isNaN(dateObj.getTime())) {
            // Format as ISO string for MongoDB
            submissionData.purchaseDetails.purchaseDate = dateObj.toISOString();
          } else {
            submissionData.purchaseDetails.purchaseDate = null;
          }
        } catch (e) {
          console.warn('Invalid purchase date:', formData.purchaseDate);
          submissionData.purchaseDetails.purchaseDate = null;
        }
      } else {
        submissionData.purchaseDetails.purchaseDate = null;
      }
      
      // Handle warranty date safely
      if (formData.warrantyExpires) {
        try {
          // Check if it's a valid date
          const dateObj = new Date(formData.warrantyExpires);
          if (!isNaN(dateObj.getTime())) {
            // Format as ISO string for MongoDB
            submissionData.warrantyDetails.warrantyExpires = dateObj.toISOString();
          } else {
            submissionData.warrantyDetails.warrantyExpires = null;
          }
        } catch (e) {
          console.warn('Invalid warranty date:', formData.warrantyExpires);
          submissionData.warrantyDetails.warrantyExpires = null;
        }
      } else {
        submissionData.warrantyDetails.warrantyExpires = null;
      }
      
      // Process custom fields if they exist - make sure we follow the schema structure
      submissionData.customFields = Array.isArray(formData.customFields) 
        ? formData.customFields
            .filter(field => field && typeof field.name === 'string' && field.name.trim())
            .map(field => {
              const fieldType = mapFieldTypeToDbType(field.type || detectFieldType(field.value || ''));
              
              // Convert the value according to the field type
              let processedValue = field.value || '';
              if (fieldType === 'integer' && processedValue) {
                processedValue = Number(processedValue);
              } else if (fieldType === 'boolean' && processedValue) {
                processedValue = /^(true|yes)$/i.test(processedValue);
              }
              
              return {
                name: field.name.trim(),
                value: processedValue,
                type: fieldType
              };
            })
        : [];
      
      // Log the submission data to help with debugging
      console.log('Submitting item data:', JSON.stringify(submissionData));
      
      let response;
      
      if (mode === 'edit') {
        // Update existing item
        response = await axios.put(`/api/items/${itemId}`, submissionData);
      } else {
        // Create new item
        response = await axios.post('/api/items', submissionData);
      }
      
      if (response.data.success) {
        // Call success callback
        if (onSuccess) {
          onSuccess(response.data.data);
        }
      } else {
        setErrorAlert(`Error ${mode === 'edit' ? 'updating' : 'creating'} item: ${response.data.message}`);
      }
    } catch (err) {
      handleSubmissionError(err);
    } finally {
      setSubmitting(false);
    }
  };
  
  // Error handling for form submission
  const handleSubmissionError = (err) => {
    if (err.response?.data?.message) {
      const message = err.response.data.message;
      
      if (message.includes('description')) {
        setErrors(prev => ({
          ...prev,
          description: 'Description cannot exceed 1000 characters'
        }));
        setErrorAlert(`Error ${mode === 'edit' ? 'updating' : 'creating'} item: Description is too long`);
      } else if (message.includes('name')) {
        setErrors(prev => ({
          ...prev,
          name: 'Name cannot exceed 100 characters'
        }));
        setErrorAlert(`Error ${mode === 'edit' ? 'updating' : 'creating'} item: Name is too long`);
      } else {
        setErrorAlert(`Error ${mode === 'edit' ? 'updating' : 'creating'} item: ${message}`);
      }
    } else {
      setErrorAlert(`Error ${mode === 'edit' ? 'updating' : 'creating'} item: ${err.message || 'Unknown error'}`);
    }
    console.error(err);
  };
  
  // Create new location
  const handleCreateLocation = async () => {
    if (!newLocation.name.trim()) {
      setErrorAlert('Location name is required');
      return;
    }
    
    try {
      const response = await axios.post('/api/locations', {
        name: newLocation.name,
        description: newLocation.description,
        parent: newLocation.parent || null
      });
      
      if (response.data.success) {
        // Add the new location to the locations array
        const newLoc = response.data.data;
        setLocations([...locations, newLoc]);
        
        // Select the new location in the form
        setFormData(prevData => ({
          ...prevData,
          location: newLoc._id
        }));
        
        // Reset the new location form
        setNewLocation({ name: '', description: '', parent: '' });
        
        // Close the dialog
        setNewLocationDialog(false);
      } else {
        setErrorAlert('Error creating location: ' + response.data.message);
      }
    } catch (err) {
      setErrorAlert('Error creating location: ' + (err.response?.data?.message || err.message));
      console.error(err);
    }
  };
  
  // Create new category
  const handleCreateCategory = async () => {
    if (!newCategory.name.trim()) {
      setErrorAlert('Category name is required');
      return;
    }
    
    try {
      const response = await axios.post('/api/categories', {
        name: newCategory.name,
        description: newCategory.description
      });
      
      if (response.data.success) {
        // Add the new category to the categories array
        const newCat = response.data.data;
        setCategories([...categories, newCat]);
        
        // Select the new category in the form
        setFormData(prevData => ({
          ...prevData,
          category: newCat._id
        }));
        
        // Reset the new category form
        setNewCategory({ name: '', description: '' });
        
        // Close the dialog
        setNewCategoryDialog(false);
      } else {
        setErrorAlert('Error creating category: ' + response.data.message);
      }
    } catch (err) {
      setErrorAlert('Error creating category: ' + (err.response?.data?.message || err.message));
      console.error(err);
    }
  };
  
  // Create new label
  const handleCreateLabel = async () => {
    if (!newLabel.name.trim()) {
      setErrorAlert('Label name is required');
      return;
    }
    
    try {
      const response = await axios.post('/api/labels', {
        name: newLabel.name,
        description: newLabel.description,
        color: newLabel.color
      });
      
      if (response.data.success) {
        // Add the new label to the labels array
        const newLab = response.data.data;
        setLabels([...labels, newLab]);
        
        // Add the new label to the selected labels in the form
        setFormData(prevData => ({
          ...prevData,
          labels: [...prevData.labels, newLab]
        }));
        
        // Reset the new label form
        setNewLabel({ name: '', description: '', color: '#3f51b5' });
        
        // Close the dialog
        setNewLabelDialog(false);
      } else {
        setErrorAlert('Error creating label: ' + response.data.message);
      }
    } catch (err) {
      setErrorAlert('Error creating label: ' + (err.response?.data?.message || err.message));
      console.error(err);
    }
  };

  return {
    // Form data
    formData,
    setFormData,
    
    // Resource data
    loading,
    submitting,
    errors,
    locations,
    categories,
    labels,
    nextAssetId,
    
    // Dialog states and handlers
    newLocationDialog,
    setNewLocationDialog,
    newCategoryDialog,
    setNewCategoryDialog,
    newLabelDialog,
    setNewLabelDialog,
    
    // Form handlers
    handleChange,
    handleLabelChange,
    handleSubmit,
    
    // Custom fields handlers
    handleAddCustomField,
    handleRemoveCustomField,
    handleCustomFieldChange,
    
    // New entity states
    newLocation,
    setNewLocation,
    newCategory,
    setNewCategory,
    newLabel,
    setNewLabel,
    
    // New entity creation handlers
    handleCreateLocation,
    handleCreateCategory,
    handleCreateLabel
  };
};

export default useItemForm;

import axios from './axiosConfig';

// Get all items with pagination and filters
export const getItems = async (page = 1, limit = 10, filters = {}, search = '') => {
  try {
    const params = new URLSearchParams();
    
    // Pagination parameters
    params.set('page', page);
    params.set('limit', limit);
    
    // Filter parameters
    if (filters.archived === true) {
      params.set('archived', 'true');
    }
    
    if (filters.location) {
      params.set('location', filters.location);
    }
    
    if (filters.category) {
      params.set('category', filters.category);
    }
    
    if (filters.label) {
      params.set('label', filters.label);
    }
    
    // Search parameter
    if (search) {
      params.set('search', search);
    }
    
    const response = await axios.get(`/api/items?${params.toString()}`);
    return response.data;
  } catch (error) {
    throw error;
  }
};

// Get a single item by ID
export const getItem = async (id) => {
  try {
    const response = await axios.get(`/api/items/${id}`);
    return response.data;
  } catch (error) {
    throw error;
  }
};

// Create a new item
export const createItem = async (itemData) => {
  try {
    const response = await axios.post('/api/items', itemData);
    return response.data;
  } catch (error) {
    throw error;
  }
};

// Update an existing item
export const updateItem = async (id, itemData) => {
  try {
    const response = await axios.put(`/api/items/${id}`, itemData);
    return response.data;
  } catch (error) {
    throw error;
  }
};

// Delete an item
export const deleteItem = async (id) => {
  try {
    const response = await axios.delete(`/api/items/${id}`);
    return response.data;
  } catch (error) {
    throw error;
  }
};

// Upload an image for an item
export const uploadItemImage = async (id, imageUri, isPrimary = false) => {
  try {
    // Create form data for file upload
    const formData = new FormData();
    
    // Get filename from URI
    const filename = imageUri.split('/').pop();
    
    // Determine file type
    let fileType = 'image/jpeg';
    if (filename.endsWith('.png')) {
      fileType = 'image/png';
    } else if (filename.endsWith('.gif')) {
      fileType = 'image/gif';
    }
    
    // Append the file to form data
    formData.append('file', {
      uri: imageUri,
      name: filename,
      type: fileType,
    });
    
    // Add isPrimary flag
    formData.append('isPrimary', isPrimary);
    
    // Make the request with multipart/form-data content type
    const response = await axios.post(`/api/items/${id}/attachments`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    
    return response.data;
  } catch (error) {
    throw error;
  }
};

// Lookup UPC code
export const lookupUPC = async (upcCode) => {
  try {
    const response = await axios.get(`/api/upc/${upcCode}`);
    return response.data;
  } catch (error) {
    throw error;
  }
};

// Quick add item (for adding items while shopping)
export const quickAddItem = async (itemData) => {
  try {
    // This endpoint would be a simplified version of the create item endpoint
    // that requires fewer fields for quick addition
    const response = await axios.post('/api/items/quick-add', itemData);
    return response.data;
  } catch (error) {
    throw error;
  }
};

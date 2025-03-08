import axios from 'axios';

/**
 * Service for bulk operations on entities
 */
const bulkService = {
  /**
   * Bulk add entities
   * @param {string} entityType - The type of entity to add ('items', 'locations', 'labels', 'categories')
   * @param {Array} entities - Array of entity objects to add
   * @returns {Promise} - Promise that resolves with the response data
   */
  bulkAdd: async (entityType, entities) => {
    try {
      const response = await axios.post(`/api/${entityType}/bulk`, { entities });
      return response.data;
    } catch (error) {
      console.error(`Error bulk adding ${entityType}:`, error);
      throw error.response?.data || error;
    }
  },

  /**
   * Validate entities before bulk adding
   * @param {string} entityType - The type of entity to validate ('items', 'locations', 'labels', 'categories')
   * @param {Array} entities - Array of entity objects to validate
   * @returns {Promise} - Promise that resolves with validation results
   */
  validateBulkAdd: async (entityType, entities) => {
    try {
      const response = await axios.post(`/api/${entityType}/validate`, { entities });
      return response.data;
    } catch (error) {
      console.error(`Error validating ${entityType}:`, error);
      throw error.response?.data || error;
    }
  }
};

export default bulkService;

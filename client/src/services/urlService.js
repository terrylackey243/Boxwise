import axios from '../utils/axiosConfig';

/**
 * Service for URL-related operations
 */
const urlService = {
  /**
   * Lookup product information from a URL
   * @param {string} url - The URL to lookup
   * @returns {Promise<Object>} - The product information
   */
  lookupUrl: async (url) => {
    try {
      const response = await axios.post('/api/url/lookup', { url });
      return response.data;
    } catch (error) {
      console.error('Error looking up URL:', error);
      throw error;
    }
  },

  /**
   * Scrape product information from a URL (GET version)
   * @param {string} url - The URL to scrape
   * @returns {Promise<Object>} - The product information
   */
  scrapeUrl: async (url) => {
    try {
      const response = await axios.get(`/api/url/scrape?url=${encodeURIComponent(url)}`);
      return response.data;
    } catch (error) {
      console.error('Error scraping URL:', error);
      throw error;
    }
  }
};

export default urlService;

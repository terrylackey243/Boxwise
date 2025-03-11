/**
 * Utility functions for handling location data
 */

/**
 * Builds a hierarchical path string for a location (e.g., "Warehouse > Section A > Shelf 1")
 * @param {Object} location - The location object
 * @param {Array} allLocations - Array of all locations
 * @returns {String} Formatted location path
 */
export const getLocationHierarchy = (location, allLocations) => {
  if (!location) return '';
  
  // Start with the current location name
  let path = location.name;
  let currentLocation = location;
  
  // Traverse up the parent hierarchy
  while (currentLocation.parent) {
    // Find the parent location
    const parentLocation = allLocations.find(loc => loc._id === currentLocation.parent);
    
    // If parent not found, break the loop
    if (!parentLocation) break;
    
    // Add parent name to the path
    path = `${parentLocation.name} > ${path}`;
    
    // Move up to the parent
    currentLocation = parentLocation;
  }
  
  return path;
};

/**
 * Flattens a hierarchical locations array into a single-level array
 * @param {Array} locationArray - The hierarchical locations array
 * @param {Array} result - The resulting flattened array (used for recursion)
 * @returns {Array} Flattened array of locations
 */
export const flattenLocations = (locationArray, result = []) => {
  locationArray.forEach(location => {
    result.push(location);
    if (location.children && location.children.length > 0) {
      flattenLocations(location.children, result);
    }
  });
  return result;
};

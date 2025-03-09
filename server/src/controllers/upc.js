const axios = require('axios');

// @desc    Lookup item details by UPC code
// @route   GET /api/upc/:code
// @access  Private
exports.lookupUPC = async (req, res, next) => {
  try {
    const upcCode = req.params.code;
    
    if (!upcCode) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a UPC code'
      });
    }
    
    try {
      // First, try the RapidAPI (primary API)
      console.log('Looking up UPC code with RapidAPI:', upcCode);
      
      // RapidAPI configuration using axios
      const options = {
        method: 'GET',
        url: `https://${process.env.RAPIDAPI_HOST || 'big-product-data.p.rapidapi.com'}/gtin/${upcCode}`,
        headers: {
          'x-rapidapi-key': process.env.RAPIDAPI_KEY || '36cc414bc3msh807cb10f6d1a426p195c91jsn71a306cdd316',
          'x-rapidapi-host': process.env.RAPIDAPI_HOST || 'big-product-data.p.rapidapi.com'
        }
      };
      
      // Make the API request using axios
      const rapidApiResponse = await axios.request(options);
      
      // Check if we got a valid response
      if (rapidApiResponse.data && rapidApiResponse.data.properties) {
        const properties = rapidApiResponse.data.properties;
        
        // Format the response from RapidAPI
        const productData = {
          upcCode,
          name: properties.title || '',
          description: properties.description || '',
          manufacturer: properties.brand || '',
          modelNumber: properties.mpn || '',
          category: properties.series_name || '',
          images: rapidApiResponse.data.stores && rapidApiResponse.data.stores.length > 0 
            ? [rapidApiResponse.data.stores[0].image] 
            : []
        };
        
        console.log('RapidAPI success for UPC:', upcCode);
        
        return res.status(200).json({
          success: true,
          data: productData,
          source: 'rapid-api'
        });
      }
    } catch (primaryApiError) {
      console.log('Primary RapidAPI error:', primaryApiError.message);
      // Continue to fallback API if primary fails
    }
    
    // If we reach here, the RapidAPI didn't find the product or failed
    // Try the fallback original API
    try {
      // Get the API URL from environment variables
      const apiUrl = `${process.env.UPC_API_URL}?upc=${upcCode}`;
      
      console.log('Looking up UPC code with fallback API:', upcCode);
      console.log('Using API URL:', apiUrl);
      
      // Make the API request
      const response = await axios.get(apiUrl);
      
      // Check if we got a valid response with items
      if (response.data && response.data.items && response.data.items.length > 0) {
        // Get the first item from the response
        const item = response.data.items[0];
        
        // Format the response
        const productData = {
          upcCode,
          name: item.title || '',
          description: item.description || '',
          manufacturer: item.brand || '',
          modelNumber: item.model || '',
          category: item.category || '',
          images: item.images || []
        };
        
        console.log('Fallback API success for UPC:', upcCode);
        
        return res.status(200).json({
          success: true,
          data: productData,
          source: 'upc-api'
        });
      } else {
        console.log('No product found for UPC:', upcCode);
        return res.status(404).json({
          success: false,
          message: 'No product found for this UPC code'
        });
      }
    } catch (fallbackApiError) {
      console.log('Fallback API error:', fallbackApiError.message);
      return res.status(404).json({
        success: false,
        message: 'Error looking up UPC code',
        error: fallbackApiError.message
      });
    }
  } catch (err) {
    console.error('Unexpected error in UPC lookup:', err);
    return res.status(500).json({
      success: false,
      message: 'Error looking up UPC code',
      error: err.message
    });
  }
};

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
    
    // Check if we have an API key in the environment variables
    const apiKey = process.env.UPC_API_KEY;
    
    // Use the API key if available, otherwise use the trial API
    const apiUrl = apiKey 
      ? `https://api.upcitemdb.com/prod/v1/lookup?upc=${upcCode}&apikey=${apiKey}`
      : `https://api.upcitemdb.com/prod/trial/lookup?upc=${upcCode}`;
    
    // Make the API request
    const response = await axios.get(apiUrl);
    
    // Check if we got a valid response with items
    if (!response.data || !response.data.items || response.data.items.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No product found for this UPC code'
      });
    }
    
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
    
    res.status(200).json({
      success: true,
      data: productData
    });
  } catch (err) {
    // If the UPC lookup service is unavailable or returns an error
    return res.status(500).json({
      success: false,
      message: 'Error looking up UPC code',
      error: err.message
    });
  }
};

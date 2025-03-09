const axios = require('axios');
require('dotenv').config();

const upcCode = '195532002872'; // Example UPC code

const options = {
  method: 'GET',
  url: `https://big-product-data.p.rapidapi.com/gtin/${upcCode}`,
  headers: {
    'x-rapidapi-key': process.env.RAPIDAPI_KEY || '36cc414bc3msh807cb10f6d1a426p195c91jsn71a306cdd316',
    'x-rapidapi-host': process.env.RAPIDAPI_HOST || 'big-product-data.p.rapidapi.com'
  }
};

async function testRapidApi() {
  try {
    console.log('Testing RapidAPI with UPC:', upcCode);
    console.log('Using options:', JSON.stringify(options, null, 2));
    
    const response = await axios.request(options);
    
    console.log('RapidAPI Response Status:', response.status);
    console.log('RapidAPI Response Data:', JSON.stringify(response.data, null, 2));
    
    return response.data;
  } catch (error) {
    console.error('RapidAPI Error:', error.message);
    if (error.response) {
      console.error('Error Response Status:', error.response.status);
      console.error('Error Response Data:', error.response.data);
    }
    throw error;
  }
}

testRapidApi()
  .then(data => {
    console.log('Test completed successfully');
  })
  .catch(err => {
    console.error('Test failed:', err.message);
    process.exit(1);
  });

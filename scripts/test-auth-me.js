const axios = require('axios');

async function testAuthMe() {
  try {
    console.log('Testing login and auth/me endpoint...');
    console.log('Attempting to login with owner@example.com / password123');
    
    // Login first to get token
    const loginResponse = await axios.post('http://localhost:5001/api/auth/login', {
      email: 'owner@example.com',
      password: 'password123'
    });
    
    console.log('Login successful!');
    console.log('Login response:', JSON.stringify(loginResponse.data, null, 2));
    
    if (!loginResponse.data.token) {
      console.error('No token received in login response!');
      return;
    }
    
    console.log('Token received, now trying to get user data...');
    
    // Use token to get user data
    const token = loginResponse.data.token;
    console.log('Using token:', token);
    console.log('Making request to: http://localhost:5001/api/auth/me');
    console.log('With Authorization header: Bearer ' + token);
    
    const userResponse = await axios.get('http://localhost:5001/api/auth/me', {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    
    console.log('User data retrieved successfully:');
    console.log('Status:', userResponse.status);
    console.log('Headers:', JSON.stringify(userResponse.headers, null, 2));
    console.log('Data:', JSON.stringify(userResponse.data, null, 2));
    
  } catch (error) {
    console.error('Error occurred:');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', JSON.stringify(error.response.data, null, 2));
      console.error('Headers:', JSON.stringify(error.response.headers, null, 2));
    } else if (error.request) {
      console.error('Request was made but no response was received');
      console.error(error.request);
    } else {
      console.error('Error message:', error.message);
    }
    console.error('Error stack:', error.stack);
  }
}

// Run the test
testAuthMe().catch(err => {
  console.error('Unhandled error in testAuthMe:', err);
});

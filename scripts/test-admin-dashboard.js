const axios = require('axios');

async function testAdminDashboard() {
  try {
    console.log('Testing admin dashboard endpoints...');
    
    // Login first to get token (as admin or owner)
    const loginResponse = await axios.post('http://localhost:5001/api/auth/login', {
      email: 'owner@example.com',
      password: 'password123'
    });
    
    console.log('Login successful!');
    console.log('Token:', loginResponse.data.token);
    
    // Use token to get admin stats
    const token = loginResponse.data.token;
    const statsResponse = await axios.get('http://localhost:5001/api/admin/stats', {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    
    console.log('Admin stats retrieved successfully:');
    console.log(JSON.stringify(statsResponse.data, null, 2));
    
    // Use token to get users
    const usersResponse = await axios.get('http://localhost:5001/api/users', {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    
    console.log('Users retrieved successfully:');
    console.log(JSON.stringify(usersResponse.data, null, 2));
    
  } catch (error) {
    console.error('Error:');
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
  }
}

// Run the test
testAdminDashboard();

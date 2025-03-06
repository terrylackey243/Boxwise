const axios = require('axios');

async function testDashboard() {
  try {
    console.log('Testing dashboard endpoint...');
    
    // Login first to get token
    const loginResponse = await axios.post('http://localhost:5001/api/auth/login', {
      email: 'owner@example.com',
      password: 'password123'
    });
    
    console.log('Login successful!');
    console.log('Token:', loginResponse.data.token);
    
    // Use token to get dashboard data
    const token = loginResponse.data.token;
    const dashboardResponse = await axios.get('http://localhost:5001/api/dashboard', {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    
    console.log('Dashboard data retrieved successfully:');
    console.log(JSON.stringify(dashboardResponse.data, null, 2));
    
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
testDashboard();

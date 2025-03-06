const axios = require('axios');

// Test login with demo credentials
async function testLogin() {
  try {
    console.log('Testing login with demo credentials...');
    
    // Try owner account
    try {
      console.log('Attempting to login as owner@example.com...');
      const ownerResponse = await axios.post('http://localhost:5001/api/auth/login', {
        email: 'owner@example.com',
        password: 'password123'
      });
      
      console.log('Owner login successful!');
      console.log('Token:', ownerResponse.data.token);
    } catch (error) {
      console.error('Owner login failed:');
      if (error.response) {
        console.error('Status:', error.response.status);
        console.error('Data:', JSON.stringify(error.response.data, null, 2));
        console.error('Headers:', JSON.stringify(error.response.headers, null, 2));
      } else if (error.request) {
        console.error('Request was made but no response was received');
        console.error(error.request);
      } else {
        console.error('Error:', error.message);
      }
    }
    
    // Try admin account
    try {
      console.log('\nAttempting to login as admin@example.com...');
      const adminResponse = await axios.post('http://localhost:5001/api/auth/login', {
        email: 'admin@example.com',
        password: 'password123'
      });
      
      console.log('Admin login successful!');
      console.log('Token:', adminResponse.data.token);
    } catch (error) {
      console.error('Admin login failed:');
      if (error.response) {
        console.error('Status:', error.response.status);
        console.error('Data:', JSON.stringify(error.response.data, null, 2));
      } else {
        console.error('Error:', error.message);
      }
    }
    
    // Try regular user account
    try {
      console.log('\nAttempting to login as user@example.com...');
      const userResponse = await axios.post('http://localhost:5001/api/auth/login', {
        email: 'user@example.com',
        password: 'password123'
      });
      
      console.log('Regular user login successful!');
      console.log('Token:', userResponse.data.token);
    } catch (error) {
      console.error('Regular user login failed:');
      if (error.response) {
        console.error('Status:', error.response.status);
        console.error('Data:', JSON.stringify(error.response.data, null, 2));
      } else {
        console.error('Error:', error.message);
      }
    }
    
    // Try a test account to see if the server is responding
    try {
      console.log('\nAttempting to login with invalid credentials (test)...');
      const testResponse = await axios.post('http://localhost:5001/api/auth/login', {
        email: 'test@example.com',
        password: 'wrongpassword'
      });
      
      console.log('Test login response:', testResponse.data);
    } catch (error) {
      console.log('Expected error for invalid credentials:');
      if (error.response) {
        console.log('Status:', error.response.status);
        console.log('Data:', JSON.stringify(error.response.data, null, 2));
      } else {
        console.error('Error:', error.message);
      }
    }
    
  } catch (error) {
    console.error('Test failed:', error.message);
  }
}

// Run the test
testLogin();

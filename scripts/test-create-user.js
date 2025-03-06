const axios = require('axios');

async function testCreateUser() {
  try {
    console.log('Testing user creation...');
    
    // Login first to get token (as admin or owner)
    const loginResponse = await axios.post('http://localhost:5001/api/auth/login', {
      email: 'owner@example.com',
      password: 'password123'
    });
    
    console.log('Login successful!');
    console.log('Token:', loginResponse.data.token);
    
    // Use token to create a new user
    const token = loginResponse.data.token;
    
    const newUser = {
      name: 'Test User',
      email: 'testuser@example.com',
      password: 'password123',
      role: 'user',
      subscription: {
        plan: 'free',
        status: 'active'
      }
    };
    
    const createResponse = await axios.post('http://localhost:5001/api/users', newUser, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    
    console.log('User created successfully:');
    console.log(JSON.stringify(createResponse.data, null, 2));
    
    // Use token to get all users
    const usersResponse = await axios.get('http://localhost:5001/api/users', {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    
    console.log('All users:');
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
testCreateUser();

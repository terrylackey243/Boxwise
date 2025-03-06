import axios from 'axios';

// Set default base URL for all axios requests
// Use a relative URL to make requests to the same domain
axios.defaults.baseURL = '';

// Set default headers for all axios requests
axios.defaults.headers.common['Content-Type'] = 'application/json';
axios.defaults.headers.common['Accept'] = 'application/json';

// Add a request interceptor to handle errors
axios.interceptors.request.use(
  config => {
    // Do something before request is sent
    console.log('Request:', config.url);
    
    // Add token to Authorization header if it exists in localStorage
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
      console.log('Added token to request:', config.url);
    }
    
    return config;
  },
  error => {
    // Do something with request error
    console.error('Request Error:', error);
    return Promise.reject(error);
  }
);

// Add a response interceptor to handle errors
axios.interceptors.response.use(
  response => {
    // Any status code that lie within the range of 2xx cause this function to trigger
    console.log('Response:', response.status);
    return response;
  },
  error => {
    // Any status codes that falls outside the range of 2xx cause this function to trigger
    console.error('Response Error:', error.response ? error.response.status : error.message);
    return Promise.reject(error);
  }
);

export default axios;

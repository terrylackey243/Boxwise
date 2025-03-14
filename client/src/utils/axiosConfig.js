import axios from 'axios';

// Set default base URL for all axios requests
// Using the proxy setting in package.json for local development
// In production, use relative path which will be handled by the rewrite rules in render.yaml
axios.defaults.baseURL = process.env.NODE_ENV === 'production' ? '/api' : '';

// Set default timeout (10 seconds) - reduce from 15 seconds to improve responsiveness
axios.defaults.timeout = 10000;

// Set default headers for all axios requests
axios.defaults.headers.common['Content-Type'] = 'application/json';
axios.defaults.headers.common['Accept'] = 'application/json';

// Add a request interceptor to handle errors
axios.interceptors.request.use(
  config => {
    // Add token to Authorization header if it exists in localStorage
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    return config;
  },
  error => {
    // Do something with request error
    return Promise.reject(error);
  }
);

// Add a response interceptor to handle errors
axios.interceptors.response.use(
  response => {
    // Any status code that lie within the range of 2xx cause this function to trigger
    return response;
  },
  error => {
    // Any status codes that falls outside the range of 2xx cause this function to trigger
    return Promise.reject(error);
  }
);

export default axios;

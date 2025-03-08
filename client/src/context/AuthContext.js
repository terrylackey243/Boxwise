import React, { createContext, useReducer, useEffect } from 'react';
import axios from '../utils/axiosConfig';
import jwt_decode from 'jwt-decode';

// Create context
export const AuthContext = createContext();

// Initial state
const initialState = {
  token: localStorage.getItem('token'),
  isAuthenticated: false,
  loading: true,
  user: null,
  error: null
};

// Reducer
const authReducer = (state, action) => {
  switch (action.type) {
    case 'USER_LOADED':
      return {
        ...state,
        isAuthenticated: true,
        loading: false,
        user: action.payload
      };
    case 'REGISTER_SUCCESS':
    case 'LOGIN_SUCCESS':
      localStorage.setItem('token', action.payload.token);
      return {
        ...state,
        token: action.payload.token,
        isAuthenticated: true,
        loading: false,
        error: null
      };
    case 'AUTH_ERROR':
    case 'REGISTER_FAIL':
    case 'LOGIN_FAIL':
    case 'LOGOUT':
      localStorage.removeItem('token');
      return {
        ...state,
        token: null,
        isAuthenticated: false,
        loading: false,
        user: null,
        error: action.payload
      };
    case 'CLEAR_ERROR':
      return {
        ...state,
        error: null
      };
    case 'UPDATE_USER':
      return {
        ...state,
        user: { ...state.user, ...action.payload }
      };
    default:
      return state;
  }
};

// Provider component
export const AuthProvider = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // Set auth token
  const setAuthToken = (token) => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    } else {
      delete axios.defaults.headers.common['Authorization'];
    }
  };

  // Load user
  const loadUser = async () => {
    console.log('loadUser called - checking authentication state');
    
    if (localStorage.token) {
      console.log('Token found in localStorage:', localStorage.token.substring(0, 20) + '...');
      setAuthToken(localStorage.token);
      
      try {
        // Check if token is expired
        const decoded = jwt_decode(localStorage.token);
        console.log('Token decoded:', decoded);
        
        const currentTime = Date.now() / 1000;
        console.log('Current time:', currentTime, 'Token expires:', decoded.exp);
        
        if (decoded.exp < currentTime) {
          // Token is expired
          console.error('Token expired - redirecting to login');
          dispatch({ type: 'AUTH_ERROR', payload: 'Session expired, please login again' });
          return;
        }
        
        console.log('Attempting to fetch user data with token');
        const res = await axios.get('/api/auth/me');
        console.log('User data received:', res.data);
        
        dispatch({
          type: 'USER_LOADED',
          payload: res.data.data
        });
        console.log('User loaded successfully');
      } catch (err) {
        console.error('Error loading user:', err);
        console.error('Error details:', {
          status: err.response?.status,
          statusText: err.response?.statusText,
          data: err.response?.data,
          headers: err.response?.headers,
          config: {
            url: err.config?.url,
            method: err.config?.method,
            baseURL: err.config?.baseURL,
            headers: err.config?.headers
          }
        });
        
        dispatch({
          type: 'AUTH_ERROR',
          payload: err.response?.data?.message || 'Authentication error'
        });
      }
    } else {
      console.warn('No token found in localStorage');
      dispatch({ type: 'AUTH_ERROR' });
    }
  };

  // Register user
  const register = async (formData) => {
    try {
      const res = await axios.post('/api/auth/register', formData);
      
      dispatch({
        type: 'REGISTER_SUCCESS',
        payload: res.data
      });
      
      loadUser();
    } catch (err) {
      dispatch({
        type: 'REGISTER_FAIL',
        payload: err.response?.data?.message || 'Registration failed'
      });
    }
  };

  // Login user
  const login = async (formData) => {
    console.log('Login function called with:', { email: formData.email, password: '***' });
    
    try {
      console.log('Sending login request to /api/auth/login');
      const res = await axios.post('/api/auth/login', formData);
      console.log('Login response received:', res.data);
      
      // Set token in localStorage and axios headers
      console.log('Setting token in localStorage and axios headers');
      localStorage.setItem('token', res.data.token);
      setAuthToken(res.data.token);
      
      // Verify token was stored correctly
      const storedToken = localStorage.getItem('token');
      console.log('Token stored in localStorage:', storedToken ? storedToken.substring(0, 20) + '...' : 'null');
      
      dispatch({
        type: 'LOGIN_SUCCESS',
        payload: res.data
      });
      console.log('Dispatched LOGIN_SUCCESS');
      
      try {
        // Load user data
        console.log('Attempting to load user data');
        const userRes = await axios.get('/api/auth/me');
        console.log('User data received:', userRes.data);
        
        dispatch({
          type: 'USER_LOADED',
          payload: userRes.data.data
        });
        console.log('Dispatched USER_LOADED');
        
        // Force redirect to dashboard
        console.log('Redirecting to dashboard');
        window.location.href = '/dashboard';
        
        return true;
      } catch (loadErr) {
        console.error('Error loading user after login:', loadErr);
        console.error('Error details:', {
          status: loadErr.response?.status,
          statusText: loadErr.response?.statusText,
          data: loadErr.response?.data,
          headers: loadErr.response?.headers,
          config: {
            url: loadErr.config?.url,
            method: loadErr.config?.method,
            baseURL: loadErr.config?.baseURL,
            headers: loadErr.config?.headers
          }
        });
        
        dispatch({
          type: 'AUTH_ERROR',
          payload: loadErr.response?.data?.message || 'Error loading user'
        });
        console.log('Dispatched AUTH_ERROR due to error loading user');
      }
    } catch (err) {
      console.error('Login failed:', err);
      console.error('Error details:', {
        status: err.response?.status,
        statusText: err.response?.statusText,
        data: err.response?.data,
        headers: err.response?.headers,
        config: {
          url: err.config?.url,
          method: err.config?.method,
          baseURL: err.config?.baseURL,
          headers: err.config?.headers
        }
      });
      
      dispatch({
        type: 'LOGIN_FAIL',
        payload: err.response?.data?.message || 'Invalid credentials'
      });
      console.log('Dispatched LOGIN_FAIL');
      throw err;
    }
  };

  // Logout
  const logout = () => {
    dispatch({ type: 'LOGOUT' });
  };

  // Clear errors
  const clearError = () => {
    dispatch({ type: 'CLEAR_ERROR' });
  };

  // Update user
  const updateUser = async (formData) => {
    try {
      const res = await axios.put('/api/auth/updatedetails', formData);
      
      dispatch({
        type: 'UPDATE_USER',
        payload: res.data.data
      });
      
      return res.data;
    } catch (err) {
      dispatch({
        type: 'AUTH_ERROR',
        payload: err.response?.data?.message || 'Update failed'
      });
      throw err;
    }
  };

  // Update password
  const updatePassword = async (formData) => {
    try {
      const res = await axios.put('/api/auth/updatepassword', formData);
      
      dispatch({
        type: 'LOGIN_SUCCESS',
        payload: res.data
      });
      
      loadUser();
      return res.data;
    } catch (err) {
      dispatch({
        type: 'AUTH_ERROR',
        payload: err.response?.data?.message || 'Password update failed'
      });
      throw err;
    }
  };

  // Update preferences
  const updatePreferences = async (preferences) => {
    try {
      const res = await axios.put('/api/auth/preferences', preferences);
      
      dispatch({
        type: 'UPDATE_USER',
        payload: { preferences: res.data.data }
      });
      
      return res.data;
    } catch (err) {
      dispatch({
        type: 'AUTH_ERROR',
        payload: err.response?.data?.message || 'Preferences update failed'
      });
      throw err;
    }
  };

  // Load user on initial render
  useEffect(() => {
    loadUser();
    // eslint-disable-next-line
  }, []);

  return (
    <AuthContext.Provider
      value={{
        token: state.token,
        isAuthenticated: state.isAuthenticated,
        loading: state.loading,
        user: state.user,
        error: state.error,
        register,
        login,
        logout,
        clearError,
        updateUser,
        updatePassword,
        updatePreferences
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

import React, { createContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from '../api/axiosConfig';
import { jwtDecode } from 'jwt-decode';

// Create the context
export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Load token from storage on app start
  useEffect(() => {
    const loadToken = async () => {
      try {
        const storedToken = await AsyncStorage.getItem('token');
        
        if (storedToken) {
          // Check if token is expired
          const decodedToken = jwtDecode(storedToken);
          const currentTime = Date.now() / 1000;
          
          if (decodedToken.exp > currentTime) {
            setToken(storedToken);
            setUser(decodedToken);
          } else {
            // Token is expired, remove it
            await AsyncStorage.removeItem('token');
          }
        }
      } catch (err) {
        console.error('Error loading auth token:', err);
      } finally {
        setLoading(false);
      }
    };
    
    loadToken();
  }, []);

  // Login function
  const login = async (email, password) => {
    try {
      setError(null);
      setLoading(true);
      
      const response = await axios.post('/api/auth/login', {
        email,
        password,
      });
      
      if (response.data.success) {
        const { token } = response.data;
        
        // Store token in AsyncStorage
        await AsyncStorage.setItem('token', token);
        
        // Decode token to get user info
        const decodedToken = jwtDecode(token);
        
        // Update state
        setToken(token);
        setUser(decodedToken);
        
        return true;
      } else {
        setError(response.data.message || 'Login failed');
        return false;
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed');
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Logout function
  const logout = async () => {
    try {
      // Remove token from AsyncStorage
      await AsyncStorage.removeItem('token');
      
      // Clear state
      setToken(null);
      setUser(null);
    } catch (err) {
      console.error('Error during logout:', err);
    }
  };

  // Register function
  const register = async (userData) => {
    try {
      setError(null);
      setLoading(true);
      
      const response = await axios.post('/api/auth/register', userData);
      
      if (response.data.success) {
        // If registration automatically logs in the user
        const { token } = response.data;
        
        // Store token in AsyncStorage
        await AsyncStorage.setItem('token', token);
        
        // Decode token to get user info
        const decodedToken = jwtDecode(token);
        
        // Update state
        setToken(token);
        setUser(decodedToken);
        
        return true;
      } else {
        setError(response.data.message || 'Registration failed');
        return false;
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed');
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Check if user is authenticated
  const isAuthenticated = () => {
    return !!token;
  };

  // Check if user is admin
  const isAdmin = () => {
    return user?.role === 'admin';
  };

  // Update user profile
  const updateProfile = async (profileData) => {
    try {
      setError(null);
      setLoading(true);
      
      const response = await axios.put('/api/users/profile', profileData);
      
      if (response.data.success) {
        // Update user state with new profile data
        setUser(prevUser => ({
          ...prevUser,
          ...response.data.data
        }));
        
        return true;
      } else {
        setError(response.data.message || 'Profile update failed');
        return false;
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Profile update failed');
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Context value
  const value = {
    user,
    token,
    loading,
    error,
    login,
    logout,
    register,
    isAuthenticated,
    isAdmin,
    updateProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export default AuthContext;

import React, { useState, useContext, useEffect } from 'react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import {
  Container,
  Box,
  Typography,
  TextField,
  Button,
  Link,
  Paper,
  Avatar,
  Grid,
  CircularProgress
} from '@mui/material';
import { LockOutlined } from '@mui/icons-material';
import { AuthContext } from '../../context/AuthContext';
import { AlertContext } from '../../context/AlertContext';

const Login = () => {
  const { login, isAuthenticated, error, clearError } = useContext(AuthContext);
  const { setErrorAlert } = useContext(AlertContext);
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);

  const { email, password } = formData;

  useEffect(() => {
    console.log('Login component - useEffect triggered');
    console.log('Authentication state:', { isAuthenticated, error });
    
    // Check localStorage directly
    const token = localStorage.getItem('token');
    console.log('Token in localStorage:', token ? `${token.substring(0, 20)}...` : 'null');
    
    // If already authenticated, redirect to dashboard
    if (isAuthenticated) {
      console.log('User is authenticated, redirecting to dashboard');
      navigate('/dashboard');
    } else {
      console.log('User is not authenticated');
    }

    // If there's an error, show it
    if (error) {
      console.error('Authentication error:', error);
      setErrorAlert(error);
      clearError();
    }
    // eslint-disable-next-line
  }, [isAuthenticated, error]);

  const onChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    console.log('Login form submitted');
    setLoading(true);
    
    try {
      console.log('Attempting to login with:', { email, password: '***' });
      
      // Check authentication state before login
      console.log('Auth state before login:', { 
        isAuthenticated, 
        hasToken: !!localStorage.getItem('token') 
      });
      
      await login({ email, password });
      
      // Check authentication state after login
      console.log('Auth state after login:', { 
        isAuthenticated, 
        hasToken: !!localStorage.getItem('token') 
      });
      
      console.log('Login successful, redirecting to dashboard...');
      
      // Add a small delay to ensure state updates have propagated
      setTimeout(() => {
        console.log('Navigating to dashboard after delay');
        navigate('/dashboard');
      }, 100);
      
    } catch (err) {
      console.error('Login error:', err);
      console.error('Error details:', {
        message: err.message,
        response: err.response ? {
          status: err.response.status,
          data: err.response.data
        } : 'No response'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container component="main" maxWidth="xs">
      <Box
        sx={{
          marginTop: 8,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <Paper
          elevation={3}
          sx={{
            p: 4,
            width: '100%',
            borderRadius: 2,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
          }}
        >
          <Avatar sx={{ m: 1, bgcolor: 'primary.main' }}>
            <LockOutlined />
          </Avatar>
          <Typography component="h1" variant="h5">
            Sign in to Boxwise
          </Typography>
          <Box component="form" onSubmit={onSubmit} noValidate sx={{ mt: 1, width: '100%' }}>
            <TextField
              margin="normal"
              required
              fullWidth
              id="email"
              label="Email Address"
              name="email"
              autoComplete="email"
              autoFocus
              value={email}
              onChange={onChange}
            />
            <TextField
              margin="normal"
              required
              fullWidth
              name="password"
              label="Password"
              type="password"
              id="password"
              autoComplete="current-password"
              value={password}
              onChange={onChange}
            />
            <Button
              type="submit"
              fullWidth
              variant="contained"
              sx={{ mt: 3, mb: 2 }}
              disabled={loading}
            >
              {loading ? <CircularProgress size={24} /> : 'Sign In'}
            </Button>
            {/* Admin note: New users must be created through user management */}
            <Typography variant="body2" color="text.secondary" align="center" sx={{ mt: 2 }}>
              Contact your administrator for account assistance
            </Typography>
          </Box>
        </Paper>
      </Box>
    </Container>
  );
};

export default Login;

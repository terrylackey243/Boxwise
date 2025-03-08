import React, { useContext, useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import { CircularProgress, Box } from '@mui/material';

const PrivateRoute = ({ children }) => {
  const { isAuthenticated, loading, token, user } = useContext(AuthContext);
  const location = useLocation();

  useEffect(() => {
    console.log('PrivateRoute rendered for path:', location.pathname);
    console.log('Authentication state:', { 
      isAuthenticated, 
      loading, 
      hasToken: !!token,
      user: user ? `User: ${user.name} (${user.email})` : 'No user data'
    });
    
    if (!isAuthenticated && !loading) {
      console.warn('User not authenticated, redirecting to login page');
      
      // Check localStorage directly as a double-check
      const localToken = localStorage.getItem('token');
      console.log('Token in localStorage:', localToken ? `${localToken.substring(0, 20)}...` : 'null');
      
      if (localToken && !isAuthenticated) {
        console.error('Token exists in localStorage but isAuthenticated is false - possible auth state mismatch');
      }
    }
  }, [isAuthenticated, loading, location.pathname, token, user]);

  if (loading) {
    console.log('Auth state is still loading, showing spinner');
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: 'calc(100vh - 64px)',
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  if (!isAuthenticated) {
    console.warn(`Redirecting from ${location.pathname} to /login due to missing authentication`);
    return <Navigate to="/login" />;
  }
  
  console.log(`User authenticated, rendering protected route: ${location.pathname}`);
  return children;
};

export default PrivateRoute;

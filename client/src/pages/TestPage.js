import React from 'react';
import { Container, Typography, Paper, Box, Button } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';

const TestPage = () => {
  // Log when the component mounts
  React.useEffect(() => {
    console.log('TestPage mounted - this page does not require authentication');
    
    // Check if localStorage has a token
    const token = localStorage.getItem('token');
    console.log('Token in localStorage:', token ? `${token.substring(0, 20)}...` : 'null');
    
    return () => {
      console.log('TestPage unmounted');
    };
  }, []);

  return (
    <Container maxWidth="md" sx={{ mt: 4 }}>
      <Paper sx={{ p: 4, borderRadius: 2 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Test Page
        </Typography>
        <Typography variant="body1" paragraph>
          This is a test page that doesn't require authentication. If you can see this page, the basic routing is working correctly.
        </Typography>
        <Typography variant="body1" paragraph>
          This page is useful for diagnosing authentication and routing issues.
        </Typography>
        
        <Box sx={{ mt: 4 }}>
          <Button 
            variant="contained" 
            color="primary" 
            component={RouterLink} 
            to="/login"
            sx={{ mr: 2 }}
          >
            Go to Login
          </Button>
          <Button 
            variant="outlined" 
            component={RouterLink} 
            to="/dashboard"
          >
            Try Dashboard (requires auth)
          </Button>
        </Box>
      </Paper>
    </Container>
  );
};

export default TestPage;

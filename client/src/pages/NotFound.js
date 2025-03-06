import React from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { Container, Box, Typography, Button, Paper } from '@mui/material';
import { Home as HomeIcon, Search as SearchIcon } from '@mui/icons-material';

const NotFound = () => {
  return (
    <Container maxWidth="md">
      <Box
        sx={{
          mt: 8,
          mb: 4,
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
            textAlign: 'center',
          }}
        >
          <Typography variant="h1" component="h1" sx={{ fontSize: '8rem', fontWeight: 'bold', color: 'primary.main' }}>
            404
          </Typography>
          <Typography variant="h4" component="h2" gutterBottom>
            Page Not Found
          </Typography>
          <Typography variant="body1" color="text.secondary" paragraph>
            The page you are looking for might have been removed, had its name changed, or is temporarily unavailable.
          </Typography>
          <Box sx={{ mt: 4, display: 'flex', gap: 2, flexWrap: 'wrap', justifyContent: 'center' }}>
            <Button
              variant="contained"
              color="primary"
              startIcon={<HomeIcon />}
              component={RouterLink}
              to="/"
            >
              Go to Dashboard
            </Button>
            <Button
              variant="outlined"
              color="primary"
              startIcon={<SearchIcon />}
              component={RouterLink}
              to="/items"
            >
              Search Items
            </Button>
          </Box>
        </Paper>
      </Box>
    </Container>
  );
};

export default NotFound;

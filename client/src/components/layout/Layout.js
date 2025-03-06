import React from 'react';
import { Box, useMediaQuery, useTheme } from '@mui/material';

const Layout = ({ children }) => {
  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up('md'));

  return (
    <Box
      sx={{
        ml: isDesktop ? '250px' : 0, // Add margin to accommodate the permanent drawer on desktop
        pt: '64px', // Add padding top to account for the fixed AppBar
        transition: theme.transitions.create(['margin'], {
          easing: theme.transitions.easing.sharp,
          duration: theme.transitions.duration.leavingScreen,
        }),
      }}
    >
      {children}
    </Box>
  );
};

export default Layout;

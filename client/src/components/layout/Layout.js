import React from 'react';
import { Box, useMediaQuery, useTheme } from '@mui/material';
import { useLocation } from 'react-router-dom';
import MobileNavigation from '../mobile/MobileNavigation';

const Layout = ({ children }) => {
  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up('md'));
  const location = useLocation();
  const isLandingPage = location.pathname === '/';

  return (
    <>
      <Box
        sx={{
          ml: isDesktop && !isLandingPage ? '250px' : 0, // No margin for landing page
          pt: '64px', // Add padding top to account for the fixed AppBar
          transition: theme.transitions.create(['margin'], {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.leavingScreen,
          }),
        }}
      >
        {children}
      </Box>
      {!isLandingPage && <MobileNavigation />}
    </>
  );
};

export default Layout;

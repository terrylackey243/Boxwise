import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useMobile } from '../../context/MobileContext';
import {
  Paper,
  BottomNavigation,
  BottomNavigationAction,
  Drawer,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
  IconButton,
  Box,
  Typography
} from '@mui/material';
import {
  Home as HomeIcon,
  Inventory as InventoryIcon,
  LocationOn as LocationIcon,
  Category as CategoryIcon,
  Label as LabelIcon,
  Menu as MenuIcon,
  Close as CloseIcon,
  Add as AddIcon,
  Search as SearchIcon,
  QrCode as QrCodeIcon,
  CameraAlt as CameraIcon,
  PhoneAndroid as PhoneAndroidIcon,
  QrCodeScanner as QrCodeScannerIcon,
  ShoppingCart as ShoppingCartIcon
} from '@mui/icons-material';

const MobileNavigation = () => {
  const { isMobile, openScanner } = useMobile();
  const navigate = useNavigate();
  const location = useLocation();
  const [drawerOpen, setDrawerOpen] = useState(false);
  
  // Don't render on non-mobile devices
  if (!isMobile) {
    return null;
  }
  
  // Get the current path without any parameters
  const currentPath = location.pathname.split('/')[1] || 'dashboard';
  
  // Handle navigation change
  const handleNavChange = (event, newValue) => {
    navigate(`/${newValue}`);
  };
  
  // Toggle drawer
  const toggleDrawer = (open) => (event) => {
    if (
      event.type === 'keydown' &&
      (event.key === 'Tab' || event.key === 'Shift')
    ) {
      return;
    }
    
    setDrawerOpen(open);
  };
  
  // Navigation drawer content
  const drawerContent = (
    <Box
      sx={{ width: 280 }}
      role="presentation"
      onClick={toggleDrawer(false)}
      onKeyDown={toggleDrawer(false)}
    >
      <Box sx={{ p: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Typography variant="h6">Boxwise Mobile</Typography>
        <IconButton onClick={toggleDrawer(false)}>
          <CloseIcon />
        </IconButton>
      </Box>
      
      <Divider />
      
      <List>
        <ListItem button onClick={() => navigate('/dashboard')}>
          <ListItemIcon>
            <HomeIcon />
          </ListItemIcon>
          <ListItemText primary="Dashboard" />
        </ListItem>
        
        <ListItem button onClick={() => navigate('/items')}>
          <ListItemIcon>
            <InventoryIcon />
          </ListItemIcon>
          <ListItemText primary="Items" />
        </ListItem>
        
        <ListItem button onClick={() => navigate('/locations')}>
          <ListItemIcon>
            <LocationIcon />
          </ListItemIcon>
          <ListItemText primary="Locations" />
        </ListItem>
        
        <ListItem button onClick={() => navigate('/categories')}>
          <ListItemIcon>
            <CategoryIcon />
          </ListItemIcon>
          <ListItemText primary="Categories" />
        </ListItem>
        
        <ListItem button onClick={() => navigate('/labels')}>
          <ListItemIcon>
            <LabelIcon />
          </ListItemIcon>
          <ListItemText primary="Labels" />
        </ListItem>
      </List>
      
      <Divider />
      
      <List>
        <ListItem button onClick={() => navigate('/items/create')}>
          <ListItemIcon>
            <AddIcon />
          </ListItemIcon>
          <ListItemText primary="Add Item" />
        </ListItem>
        
        <ListItem button onClick={() => {
          // Open shopping assistant
          if (window.boxwiseMobile?.openShoppingAssistant) {
            window.boxwiseMobile.openShoppingAssistant();
            setDrawerOpen(false);
          }
        }}>
          <ListItemIcon>
            <ShoppingCartIcon />
          </ListItemIcon>
          <ListItemText primary="Shopping Assistant" />
        </ListItem>
        
        <ListItem button onClick={() => navigate('/tools/qr-generator')}>
          <ListItemIcon>
            <QrCodeIcon />
          </ListItemIcon>
          <ListItemText primary="QR Generator" />
        </ListItem>
      </List>
      
      <Divider />
      
      <List>
        <ListItem button onClick={() => navigate('/mobile-app')}>
          <ListItemIcon>
            <PhoneAndroidIcon />
          </ListItemIcon>
          <ListItemText primary="Mobile App Features" />
        </ListItem>
        
        <ListItem button component="a" href="/mobile-app-guide.html" target="_blank">
          <ListItemIcon>
            <PhoneAndroidIcon />
          </ListItemIcon>
          <ListItemText primary="Mobile App Guide" />
        </ListItem>
      </List>
    </Box>
  );
  
  return (
    <>
      {/* Bottom Navigation */}
      <Paper
        sx={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 1000,
          borderRadius: 0
        }}
        elevation={3}
      >
        <BottomNavigation
          value={currentPath}
          onChange={handleNavChange}
          showLabels
        >
          <BottomNavigationAction
            label="Menu"
            value="menu"
            icon={<MenuIcon />}
            onClick={toggleDrawer(true)}
          />
          <BottomNavigationAction
            label="Home"
            value="dashboard"
            icon={<HomeIcon />}
          />
          <BottomNavigationAction
            label="Items"
            value="items"
            icon={<InventoryIcon />}
          />
          <BottomNavigationAction
            label="Scan"
            value="scan"
            icon={<QrCodeScannerIcon />}
            onClick={() => {
              // Open the barcode scanner directly
              if (openScanner) {
                openScanner();
              } else {
                // Fallback to the items page if scanner context is not available
                navigate('/items');
              }
            }}
          />
          <BottomNavigationAction
            label="Add"
            value="items/create"
            icon={<AddIcon />}
          />
        </BottomNavigation>
      </Paper>
      
      {/* Navigation Drawer */}
      <Drawer
        anchor="left"
        open={drawerOpen}
        onClose={toggleDrawer(false)}
      >
        {drawerContent}
      </Drawer>
      
      {/* Add padding to the bottom of the page to account for the bottom navigation */}
      <Box sx={{ pb: 7 }} />
    </>
  );
};

export default MobileNavigation;

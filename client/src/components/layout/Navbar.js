import React, { useState, useContext } from 'react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import {
  AppBar,
  Box,
  Toolbar,
  IconButton,
  Typography,
  Menu,
  Container,
  Avatar,
  Button,
  Tooltip,
  MenuItem,
  Drawer,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
  Badge,
  useMediaQuery,
  useTheme
} from '@mui/material';
import {
  Menu as MenuIcon,
  Brightness4 as DarkModeIcon,
  Brightness7 as LightModeIcon,
  Dashboard as DashboardIcon,
  Inventory as InventoryIcon,
  LocationOn as LocationIcon,
  Label as LabelIcon,
  Category as CategoryIcon,
  Assessment as ReportIcon,
  QrCode as QrCodeIcon,
  Settings as SettingsIcon,
  Person as PersonIcon,
  EmojiEvents as AchievementIcon,
  Logout as LogoutIcon,
  Login as LoginIcon,
  PersonAdd as RegisterIcon,
  Upload as ImportExportIcon,
  AdminPanelSettings as AdminIcon,
  Alarm as ReminderIcon,
  PhoneAndroid as MobileIcon
} from '@mui/icons-material';

import { AuthContext } from '../../context/AuthContext';
import { AlertContext } from '../../context/AlertContext';

const Navbar = ({ toggleColorMode, mode }) => {
  const { isAuthenticated, user, logout } = useContext(AuthContext);
  const { setSuccessAlert } = useContext(AlertContext);
  const navigate = useNavigate();
  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up('md'));

  const [anchorElUser, setAnchorElUser] = useState(null);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

  const handleOpenUserMenu = (event) => {
    setAnchorElUser(event.currentTarget);
  };

  const handleCloseUserMenu = () => {
    setAnchorElUser(null);
  };

  const handleToggleMobileDrawer = () => {
    setMobileDrawerOpen(!mobileDrawerOpen);
  };

  const handleLogout = () => {
    logout();
    setSuccessAlert('Logged out successfully');
    navigate('/login');
    handleCloseUserMenu();
  };

  const mainMenuItems = [
    {
      text: 'Dashboard',
      icon: <DashboardIcon />,
      path: '/dashboard',
      auth: true
    },
    {
      text: 'Items',
      icon: <InventoryIcon />,
      path: '/items',
      auth: true
    },
    {
      text: 'Locations',
      icon: <LocationIcon />,
      path: '/locations',
      auth: true
    },
    {
      text: 'Labels',
      icon: <LabelIcon />,
      path: '/labels',
      auth: true
    },
    {
      text: 'Categories',
      icon: <CategoryIcon />,
      path: '/categories',
      auth: true
    }
  ];

  const toolsMenuItems = [
    {
      text: 'Reports',
      icon: <ReportIcon />,
      path: '/reports',
      auth: true
    },
    {
      text: 'QR Generator',
      icon: <QrCodeIcon />,
      path: '/tools/qr-generator',
      auth: true
    },
    {
      text: 'Label Generator',
      icon: <LabelIcon />,
      path: '/tools/label-generator',
      auth: true
    },
    {
      text: 'Import/Export',
      icon: <ImportExportIcon />,
      path: '/tools/import-export',
      auth: true
    },
    {
      text: 'Mobile App',
      icon: <MobileIcon />,
      path: '/mobile-app.html',
      auth: true
    },
    {
      text: 'Admin Dashboard',
      icon: <AdminIcon />,
      path: '/admin/dashboard',
      auth: true,
      role: ['admin', 'owner'] // Only show for admin and owner users
    }
  ];

  // User-related menu items for the sidebar
  const userMenuItems = [
    {
      text: 'Profile',
      icon: <PersonIcon />,
      path: '/profile',
      auth: true
    },
    {
      text: 'Achievements',
      icon: <AchievementIcon />,
      path: '/achievements',
      auth: true
    },
    {
      text: 'Reminders',
      icon: <ReminderIcon />,
      path: '/reminders',
      auth: true
    }
  ];
  
  // Items for the user dropdown menu in the top bar
  const userDropdownItems = [
    {
      text: 'Logout',
      icon: <LogoutIcon />,
      auth: true,
      onClick: handleLogout
    },
    {
      text: 'Login',
      icon: <LoginIcon />,
      path: '/login',
      auth: false,
      onClick: handleCloseUserMenu
    },
    {
      text: 'Register',
      icon: <RegisterIcon />,
      path: '/register',
      auth: false,
      onClick: handleCloseUserMenu
    }
  ];

  const drawerContent = (
    <Box 
      sx={{ 
        width: 250,
        height: '100%',
        display: 'flex',
        flexDirection: 'column'
      }} 
      role="presentation"
    >
      <Box sx={{ p: 2, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Typography variant="h6" component="div" sx={{ fontWeight: 'bold' }}>
          Boxwise
        </Typography>
      </Box>
      <Divider />
      <List>
        {mainMenuItems.map((item) => (
          (item.auth === isAuthenticated || item.auth === undefined) && (
            <ListItem 
              button 
              key={item.text} 
              component={RouterLink} 
              to={item.path}
              onClick={!isDesktop ? () => setMobileDrawerOpen(false) : undefined}
            >
              <ListItemIcon>{item.icon}</ListItemIcon>
              <ListItemText primary={item.text} />
            </ListItem>
          )
        ))}
      </List>
      <Divider />
      <List>
        {toolsMenuItems
          .filter(item => !item.role) // Filter out admin items
          .map((item) => {
            // Check if item should be shown based on authentication
            const showItem = (item.auth === isAuthenticated || item.auth === undefined);
            
            return showItem ? (
              <ListItem 
                button 
                key={item.text} 
                component={RouterLink} 
                to={item.path}
                onClick={!isDesktop ? () => setMobileDrawerOpen(false) : undefined}
              >
                <ListItemIcon>{item.icon}</ListItemIcon>
                <ListItemText primary={item.text} />
              </ListItem>
            ) : null;
          })}
      </List>
      
      {/* User section */}
      {isAuthenticated && (
        <>
          <Divider />
          <List>
            {userMenuItems.map((item) => (
              <ListItem 
                button 
                key={item.text} 
                component={RouterLink} 
                to={item.path}
                onClick={!isDesktop ? () => setMobileDrawerOpen(false) : undefined}
              >
                <ListItemIcon>{item.icon}</ListItemIcon>
                <ListItemText primary={item.text} />
              </ListItem>
            ))}
          </List>
        </>
      )}
      
      {/* Admin section */}
      {(user?.role === 'admin' || user?.role === 'owner') && (
        <>
          <Divider />
          <List>
            {toolsMenuItems
              .filter(item => item.role) // Only admin items
              .map((item) => {
                // Check if item should be shown based on authentication and role
                const showItem = (item.auth === isAuthenticated || item.auth === undefined) && 
                  (item.role && Array.isArray(item.role) && item.role.includes(user?.role));
                
                return showItem ? (
                  <ListItem 
                    button 
                    key={item.text} 
                    component={RouterLink} 
                    to={item.path}
                    onClick={!isDesktop ? () => setMobileDrawerOpen(false) : undefined}
                  >
                    <ListItemIcon>{item.icon}</ListItemIcon>
                    <ListItemText primary={item.text} />
                  </ListItem>
                ) : null;
              })}
          </List>
        </>
      )}
      
      {/* Logout button at the bottom */}
      {isAuthenticated && (
        <>
          <Box sx={{ flexGrow: 1 }} /> {/* This pushes the logout button to the bottom */}
          <Divider />
          <List>
            <ListItem 
              button 
              onClick={handleLogout}
            >
              <ListItemIcon><LogoutIcon /></ListItemIcon>
              <ListItemText primary="Logout" />
            </ListItem>
          </List>
        </>
      )}
    </Box>
  );

  return (
    <>
      <AppBar position="fixed" sx={{ zIndex: (theme) => theme.zIndex.drawer + 1 }}>
        <Container maxWidth="xl">
          <Toolbar disableGutters>
            {!isDesktop && (
              <IconButton
                size="large"
                edge="start"
                color="inherit"
                aria-label="menu"
                sx={{ mr: 2 }}
                onClick={handleToggleMobileDrawer}
              >
                <MenuIcon />
              </IconButton>
            )}
            
            <Typography
              variant="h6"
              noWrap
              component={RouterLink}
              to="/"
              sx={{
                mr: 2,
                display: { xs: 'none', md: 'flex' },
                fontWeight: 700,
                color: 'inherit',
                textDecoration: 'none',
              }}
            >
              Boxwise
            </Typography>

            <Typography
              variant="h6"
              noWrap
              component={RouterLink}
              to="/"
              sx={{
                mr: 2,
                display: { xs: 'flex', md: 'none' },
                flexGrow: 1,
                fontWeight: 700,
                color: 'inherit',
                textDecoration: 'none',
              }}
            >
              Boxwise
            </Typography>
            
            <Box sx={{ flexGrow: 1 }} />
            
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <IconButton onClick={toggleColorMode} color="inherit">
                {mode === 'dark' ? <LightModeIcon /> : <DarkModeIcon />}
              </IconButton>
              
              {isAuthenticated ? (
                <Box sx={{ ml: 2 }}>
                  <Tooltip title="Open settings">
                    <IconButton onClick={handleOpenUserMenu} sx={{ p: 0 }}>
                      <Avatar alt={user?.name} src="/static/images/avatar/2.jpg">
                        {user?.name?.charAt(0)}
                      </Avatar>
                    </IconButton>
                  </Tooltip>
                  <Menu
                    sx={{ mt: '45px' }}
                    id="menu-appbar"
                    anchorEl={anchorElUser}
                    anchorOrigin={{
                      vertical: 'top',
                      horizontal: 'right',
                    }}
                    keepMounted
                    transformOrigin={{
                      vertical: 'top',
                      horizontal: 'right',
                    }}
                    open={Boolean(anchorElUser)}
                    onClose={handleCloseUserMenu}
                  >
                    {userDropdownItems
                      .filter(item => {
                        // Show items that require authentication
                        if (item.auth !== isAuthenticated) return false;
                        
                        // If item has role restriction, check if user has the required role
                        if (item.role && Array.isArray(item.role)) {
                          return item.role.includes(user?.role);
                        }
                        
                        // Otherwise show the item
                        return true;
                      })
                      .map((item) => (
                        <MenuItem 
                          key={item.text} 
                          onClick={item.onClick}
                          component={item.path ? RouterLink : 'li'}
                          to={item.path}
                        >
                          <ListItemIcon>{item.icon}</ListItemIcon>
                          <Typography textAlign="center">{item.text}</Typography>
                        </MenuItem>
                      ))}
                  </Menu>
                </Box>
              ) : (
                <Box sx={{ display: 'flex' }}>
                  <Button 
                    color="inherit" 
                    component={RouterLink} 
                    to="/login"
                    startIcon={<LoginIcon />}
                    sx={{ ml: 1 }}
                  >
                    Login
                  </Button>
                  <Button 
                    color="inherit" 
                    component={RouterLink} 
                    to="/register"
                    startIcon={<RegisterIcon />}
                    sx={{ ml: 1 }}
                  >
                    Register
                  </Button>
                </Box>
              )}
            </Box>
          </Toolbar>
        </Container>
      </AppBar>
      
      {/* Mobile drawer (temporary) */}
      {!isDesktop && (
        <Drawer
          anchor="left"
          open={mobileDrawerOpen}
          onClose={handleToggleMobileDrawer}
          variant="temporary"
        >
          {drawerContent}
        </Drawer>
      )}
      
      {/* Desktop drawer (permanent) */}
      {isDesktop && (
        <Drawer
          variant="permanent"
          sx={{
            width: 250,
            flexShrink: 0,
            '& .MuiDrawer-paper': {
              width: 250,
              boxSizing: 'border-box',
              paddingTop: '64px', // Add padding to account for AppBar height
            },
          }}
          open
        >
          {drawerContent}
        </Drawer>
      )}
    </>
  );
};

export default Navbar;

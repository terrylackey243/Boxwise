import React from 'react';
import { Link as RouterLink } from 'react-router-dom';
import {
  Box,
  Button,
  Container,
  Grid,
  Typography,
  Card,
  CardContent,
  CardMedia,
  Divider,
  Paper,
  Stack,
  useTheme,
  useMediaQuery,
  alpha
} from '@mui/material';
import {
  Inventory as InventoryIcon,
  QrCodeScanner as QrCodeScannerIcon,
  Category as CategoryIcon,
  LocationOn as LocationIcon,
  Label as LabelIcon,
  Notifications as NotificationsIcon,
  Assessment as AssessmentIcon,
  PhoneIphone as PhoneIphoneIcon,
  Security as SecurityIcon,
  CloudUpload as CloudUploadIcon,
  Add as AddIcon,
  Person as PersonIcon,
  EmojiEvents as TrophyIcon,
  Group as GroupIcon
} from '@mui/icons-material';
import { Link } from '@mui/material';

const FeatureCard = ({ icon, title, description }) => {
  const theme = useTheme();
  
  return (
    <Card 
      elevation={2} 
      sx={{ 
        height: '100%', 
        display: 'flex', 
        flexDirection: 'column',
        transition: 'transform 0.3s ease-in-out, box-shadow 0.3s ease-in-out',
        '&:hover': {
          transform: 'translateY(-8px)',
          boxShadow: theme.shadows[8],
        }
      }}
    >
      <Box 
        sx={{ 
          p: 2, 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          bgcolor: alpha(theme.palette.primary.main, 0.1)
        }}
      >
        {icon}
      </Box>
      <CardContent sx={{ flexGrow: 1 }}>
        <Typography variant="h6" component="h3" gutterBottom>
          {title}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {description}
        </Typography>
      </CardContent>
    </Card>
  );
};

const LandingPage = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  
  return (
    <Box sx={{ bgcolor: 'background.default', minHeight: '100vh' }}>
      {/* Hero Section */}
      <Paper 
        elevation={0}
        sx={{ 
          position: 'relative',
          bgcolor: 'primary.main',
          color: 'primary.contrastText',
          pt: 8,
          pb: 6,
          overflow: 'hidden'
        }}
      >
        <Container maxWidth="lg">
          <Grid container spacing={4} alignItems="center">
            <Grid item xs={12} md={6}>
              <Typography
                component="h1"
                variant="h2"
                fontWeight="bold"
                gutterBottom
              >
                Organize Your Life with Boxwise
              </Typography>
              <Typography variant="h5" paragraph sx={{ mb: 4 }}>
                The smart inventory management system that helps you keep track of everything you own.
                Now with mobile support for managing on the go!
              </Typography>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <Button
                  component={RouterLink}
                  to="/login"
                  variant="contained"
                  size="large"
                  color="secondary"
                  sx={{ 
                    px: 4,
                    py: 1.5,
                    fontSize: '1.1rem',
                    fontWeight: 'bold'
                  }}
                >
                  Get Started
                </Button>
                <Button
                  component={RouterLink}
                  to="/mobile-app"
                  variant="outlined"
                  size="large"
                  sx={{ 
                    px: 4,
                    py: 1.5,
                    fontSize: '1.1rem',
                    color: 'white',
                    borderColor: 'white',
                    '&:hover': {
                      borderColor: 'white',
                      bgcolor: alpha('#ffffff', 0.1)
                    }
                  }}
                >
                  Learn More
                </Button>
              </Stack>
            </Grid>
            <Grid item xs={12} md={6} sx={{ display: { xs: 'none', md: 'block' } }}>
              <Box
                component="div"
                alt="Boxwise Dashboard"
                bgcolor="white"
                sx={{
                  width: '100%',
                  maxWidth: 600,
                  height: 350,
                  borderRadius: 2,
                  boxShadow: '0 10px 30px rgba(0, 0, 0, 0.3)',
                  transform: 'perspective(1500px) rotateY(-15deg)',
                  position: 'relative',
                  overflow: 'hidden',
                  p: 2
                }}
              >
                {/* Mock Dashboard Header */}
                <Box sx={{ height: '50px', width: '100%', mb: 2, display: 'flex', alignItems: 'center' }}>
                  <Typography variant="h6" color="primary.main" fontWeight="bold">Dashboard</Typography>
                </Box>
                
                {/* Mock Dashboard Content */}
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                  {/* Stats Cards */}
                  <Box sx={{ bgcolor: alpha(theme.palette.primary.main, 0.1), p: 2, borderRadius: 1, width: '45%' }}>
                    <Typography variant="h4" color="primary.main" fontWeight="bold">128</Typography>
                    <Typography variant="body2" color="text.secondary">Total Items</Typography>
                  </Box>
                  <Box sx={{ bgcolor: alpha(theme.palette.secondary.main, 0.1), p: 2, borderRadius: 1, width: '45%' }}>
                    <Typography variant="h4" color="secondary.main" fontWeight="bold">12</Typography>
                    <Typography variant="body2" color="text.secondary">Locations</Typography>
                  </Box>
                  <Box sx={{ bgcolor: alpha(theme.palette.success.main, 0.1), p: 2, borderRadius: 1, width: '45%' }}>
                    <Typography variant="h4" color="success.main" fontWeight="bold">8</Typography>
                    <Typography variant="body2" color="text.secondary">Categories</Typography>
                  </Box>
                  <Box sx={{ bgcolor: alpha(theme.palette.warning.main, 0.1), p: 2, borderRadius: 1, width: '45%' }}>
                    <Typography variant="h4" color="warning.main" fontWeight="bold">3</Typography>
                    <Typography variant="body2" color="text.secondary">Reminders</Typography>
                  </Box>
                </Box>
                
                {/* Mock Table */}
                <Box sx={{ mt: 3, bgcolor: 'background.paper', borderRadius: 1, p: 1 }}>
                  <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 1 }}>Recent Items</Typography>
                  <Box sx={{ height: '120px', display: 'flex', flexDirection: 'column', gap: 1 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid', borderColor: 'divider', pb: 0.5 }}>
                      <Typography variant="body2" fontWeight="medium">Laptop</Typography>
                      <Typography variant="body2" color="text.secondary">Office</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid', borderColor: 'divider', pb: 0.5 }}>
                      <Typography variant="body2" fontWeight="medium">Monitor</Typography>
                      <Typography variant="body2" color="text.secondary">Office</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid', borderColor: 'divider', pb: 0.5 }}>
                      <Typography variant="body2" fontWeight="medium">Keyboard</Typography>
                      <Typography variant="body2" color="text.secondary">Storage</Typography>
                    </Box>
                  </Box>
                </Box>
              </Box>
            </Grid>
          </Grid>
        </Container>
        
        {/* Decorative elements */}
        <Box
          sx={{
            position: 'absolute',
            top: -100,
            right: -100,
            width: 300,
            height: 300,
            borderRadius: '50%',
            bgcolor: alpha(theme.palette.secondary.main, 0.2),
            zIndex: 0
          }}
        />
        <Box
          sx={{
            position: 'absolute',
            bottom: -50,
            left: -50,
            width: 200,
            height: 200,
            borderRadius: '50%',
            bgcolor: alpha(theme.palette.secondary.main, 0.15),
            zIndex: 0
          }}
        />
      </Paper>

      {/* Features Section */}
      <Container maxWidth="lg" sx={{ py: 8 }}>
        <Typography
          component="h2"
          variant="h3"
          align="center"
          gutterBottom
        >
          Powerful Features
        </Typography>
        <Typography variant="h6" align="center" color="text.secondary" paragraph sx={{ mb: 6 }}>
          Everything you need to organize, track, and manage your inventory
        </Typography>
        
        <Grid container spacing={4}>
          <Grid item xs={12} sm={6} md={4}>
            <FeatureCard
              icon={<InventoryIcon sx={{ fontSize: 48, color: 'primary.main' }} />}
              title="Inventory Management"
              description="Keep track of all your items with detailed information, including location, category, purchase details, and more."
            />
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <FeatureCard
              icon={<QrCodeScannerIcon sx={{ fontSize: 48, color: 'primary.main' }} />}
              title="Barcode Scanning"
              description="Quickly add items by scanning UPC codes with your device's camera. Automatically retrieves product information."
            />
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <FeatureCard
              icon={<PhoneIphoneIcon sx={{ fontSize: 48, color: 'primary.main' }} />}
              title="Mobile Support"
              description="Manage your inventory on the go with our mobile-friendly interface. Take photos, scan barcodes, and check inventory while shopping."
            />
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <FeatureCard
              icon={<LocationIcon sx={{ fontSize: 48, color: 'primary.main' }} />}
              title="Location Tracking"
              description="Organize items by location with a hierarchical structure. Never lose track of where things are stored."
            />
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <FeatureCard
              icon={<CategoryIcon sx={{ fontSize: 48, color: 'primary.main' }} />}
              title="Categories & Labels"
              description="Categorize and tag your items for easy filtering and organization. Create custom categories and color-coded labels."
            />
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <FeatureCard
              icon={<NotificationsIcon sx={{ fontSize: 48, color: 'primary.main' }} />}
              title="Reminders"
              description="Set reminders for warranty expirations, maintenance tasks, or anything else related to your items."
            />
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <FeatureCard
              icon={<AssessmentIcon sx={{ fontSize: 48, color: 'primary.main' }} />}
              title="Reports & Analytics"
              description="Generate reports to gain insights into your inventory. Track value, categories, locations, and more."
            />
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <FeatureCard
              icon={<TrophyIcon sx={{ fontSize: 48, color: 'primary.main' }} />}
              title="Achievements & Gamification"
              description="Earn achievements as you organize your inventory. Track personal and group progress with levels, points, and unlockable rewards."
            />
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <FeatureCard
              icon={<GroupIcon sx={{ fontSize: 48, color: 'primary.main' }} />}
              title="Group Collaboration"
              description="Work together with family members or teammates. Share inventory, track group achievements, and manage items collectively."
            />
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <FeatureCard
              icon={<SecurityIcon sx={{ fontSize: 48, color: 'primary.main' }} />}
              title="Secure & Private"
              description="Your inventory data is secure and private. User authentication and authorization ensure only authorized access."
            />
          </Grid>
        </Grid>
      </Container>

      {/* Mobile App Section */}
      <Box sx={{ bgcolor: alpha(theme.palette.primary.main, 0.05), py: 8 }}>
        <Container maxWidth="lg">
          <Grid container spacing={4} alignItems="center">
            <Grid item xs={12} md={6} order={{ xs: 2, md: 1 }}>
              <Typography variant="h3" component="h2" gutterBottom>
                Take Boxwise Anywhere
              </Typography>
              <Typography variant="h6" paragraph color="text.secondary">
                Our mobile-friendly interface lets you manage your inventory on the go.
              </Typography>
              <Box sx={{ my: 3 }}>
                <Stack spacing={2}>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <Box sx={{ 
                      mr: 2, 
                      p: 1, 
                      borderRadius: '50%', 
                      bgcolor: alpha(theme.palette.primary.main, 0.1),
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <QrCodeScannerIcon color="primary" />
                    </Box>
                    <Typography variant="body1">
                      <strong>Scan UPC codes</strong> directly with your phone camera
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <Box sx={{ 
                      mr: 2, 
                      p: 1, 
                      borderRadius: '50%', 
                      bgcolor: alpha(theme.palette.primary.main, 0.1),
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <PhoneIphoneIcon color="primary" />
                    </Box>
                    <Typography variant="body1">
                      <strong>Take photos</strong> of items and upload them immediately
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <Box sx={{ 
                      mr: 2, 
                      p: 1, 
                      borderRadius: '50%', 
                      bgcolor: alpha(theme.palette.primary.main, 0.1),
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <InventoryIcon color="primary" />
                    </Box>
                    <Typography variant="body1">
                      <strong>Check inventory</strong> while shopping to avoid duplicate purchases
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <Box sx={{ 
                      mr: 2, 
                      p: 1, 
                      borderRadius: '50%', 
                      bgcolor: alpha(theme.palette.primary.main, 0.1),
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <AddIcon color="primary" />
                    </Box>
                    <Typography variant="body1">
                      <strong>Add items</strong> to inventory right when they're purchased
                    </Typography>
                  </Box>
                </Stack>
              </Box>
              <Button
                component={RouterLink}
                to="/mobile-app"
                variant="contained"
                color="primary"
                size="large"
                sx={{ mt: 2 }}
              >
                Learn More About Mobile Features
              </Button>
            </Grid>
            <Grid item xs={12} md={6} order={{ xs: 1, md: 2 }}>
              <Box sx={{ 
                display: 'flex', 
                justifyContent: 'center',
                position: 'relative'
              }}>
                <Box
                  component="div"
                  alt="Boxwise Mobile App"
                  bgcolor="white"
                  sx={{
                    width: '100%',
                    maxWidth: 300,
                    height: 500,
                    borderRadius: 4,
                    boxShadow: '0 10px 30px rgba(0, 0, 0, 0.2)',
                    border: '10px solid #333',
                    borderRadius: '36px',
                    position: 'relative',
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column'
                  }}
                >
                  {/* Mobile App Header */}
                  <Box sx={{ 
                    bgcolor: 'primary.main', 
                    color: 'white', 
                    p: 2, 
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                  }}>
                    <Typography variant="subtitle1" fontWeight="bold">Boxwise</Typography>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <QrCodeScannerIcon fontSize="small" />
                      <NotificationsIcon fontSize="small" />
                    </Box>
                  </Box>
                  
                  {/* Mobile App Content */}
                  <Box sx={{ p: 2, flexGrow: 1 }}>
                    {/* Search Bar */}
                    <Box sx={{ 
                      bgcolor: alpha(theme.palette.primary.main, 0.1), 
                      p: 1, 
                      borderRadius: 2,
                      display: 'flex',
                      alignItems: 'center',
                      mb: 2
                    }}>
                      <Typography variant="body2" color="text.secondary">Search items...</Typography>
                    </Box>
                    
                    {/* Item Cards */}
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      <Box sx={{ 
                        bgcolor: 'background.paper', 
                        p: 1.5, 
                        borderRadius: 2,
                        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                      }}>
                        <Typography variant="subtitle2" fontWeight="bold">Laptop</Typography>
                        <Typography variant="body2" color="text.secondary">Office • Electronics</Typography>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
                          <Typography variant="caption" color="primary">Asset #1234</Typography>
                          <Typography variant="caption">Qty: 1</Typography>
                        </Box>
                      </Box>
                      
                      <Box sx={{ 
                        bgcolor: 'background.paper', 
                        p: 1.5, 
                        borderRadius: 2,
                        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                      }}>
                        <Typography variant="subtitle2" fontWeight="bold">Monitor</Typography>
                        <Typography variant="body2" color="text.secondary">Office • Electronics</Typography>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
                          <Typography variant="caption" color="primary">Asset #1235</Typography>
                          <Typography variant="caption">Qty: 2</Typography>
                        </Box>
                      </Box>
                      
                      <Box sx={{ 
                        bgcolor: 'background.paper', 
                        p: 1.5, 
                        borderRadius: 2,
                        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                      }}>
                        <Typography variant="subtitle2" fontWeight="bold">Keyboard</Typography>
                        <Typography variant="body2" color="text.secondary">Storage • Electronics</Typography>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
                          <Typography variant="caption" color="primary">Asset #1236</Typography>
                          <Typography variant="caption">Qty: 3</Typography>
                        </Box>
                      </Box>
                    </Box>
                  </Box>
                  
                  {/* Mobile App Bottom Navigation */}
                  <Box sx={{ 
                    bgcolor: 'background.paper', 
                    p: 1,
                    borderTop: '1px solid',
                    borderColor: 'divider',
                    display: 'flex',
                    justifyContent: 'space-around'
                  }}>
                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                      <InventoryIcon fontSize="small" color="primary" />
                      <Typography variant="caption">Items</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                      <LocationIcon fontSize="small" />
                      <Typography variant="caption">Locations</Typography>
                    </Box>
                    <Box sx={{ 
                      display: 'flex', 
                      flexDirection: 'column', 
                      alignItems: 'center',
                      position: 'relative',
                      top: -15,
                      bgcolor: 'primary.main',
                      color: 'white',
                      p: 1,
                      borderRadius: '50%'
                    }}>
                      <AddIcon fontSize="small" />
                    </Box>
                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                      <CategoryIcon fontSize="small" />
                      <Typography variant="caption">Categories</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                      <PersonIcon fontSize="small" />
                      <Typography variant="caption">Profile</Typography>
                    </Box>
                  </Box>
                </Box>
                {/* Decorative elements */}
                <Box
                  sx={{
                    position: 'absolute',
                    top: -20,
                    right: isMobile ? 20 : 40,
                    width: 100,
                    height: 100,
                    borderRadius: '50%',
                    bgcolor: alpha(theme.palette.primary.main, 0.1),
                    zIndex: -1
                  }}
                />
                <Box
                  sx={{
                    position: 'absolute',
                    bottom: -30,
                    left: isMobile ? 30 : 60,
                    width: 150,
                    height: 150,
                    borderRadius: '50%',
                    bgcolor: alpha(theme.palette.secondary.main, 0.1),
                    zIndex: -1
                  }}
                />
              </Box>
            </Grid>
          </Grid>
        </Container>
      </Box>

      {/* CTA Section */}
      <Box sx={{ bgcolor: 'primary.main', color: 'primary.contrastText', py: 8 }}>
        <Container maxWidth="md" sx={{ textAlign: 'center' }}>
          <Typography variant="h3" component="h2" gutterBottom>
            Ready to Get Organized?
          </Typography>
          <Typography variant="h6" paragraph sx={{ mb: 4 }}>
            Start managing your inventory today with Boxwise.
          </Typography>
          <Button
            component={RouterLink}
            to="/login"
            variant="contained"
            color="secondary"
            size="large"
            sx={{ 
              px: 6,
              py: 1.5,
              fontSize: '1.2rem',
              fontWeight: 'bold'
            }}
          >
            Get Started Now
          </Button>
        </Container>
      </Box>

      {/* Footer */}
      <Box sx={{ bgcolor: 'background.paper', py: 6 }}>
        <Container maxWidth="lg">
          <Grid container spacing={4}>
            <Grid item xs={12} md={4}>
              <Typography variant="h6" gutterBottom>
                Boxwise
              </Typography>
              <Typography variant="body2" color="text.secondary">
                The smart inventory management system that helps you keep track of everything you own.
              </Typography>
            </Grid>
            <Grid item xs={12} md={4}>
              <Typography variant="h6" gutterBottom>
                Features
              </Typography>
              <Typography variant="body2" component="div">
                <ul style={{ paddingLeft: '1.5rem', margin: 0 }}>
                  <li>Inventory Management</li>
                  <li>Barcode Scanning</li>
                  <li>Mobile Support</li>
                  <li>Location Tracking</li>
                  <li>Categories & Labels</li>
                  <li>Achievements & Gamification</li>
                  <li>Group Collaboration</li>
                  <li>Reports & Analytics</li>
                </ul>
              </Typography>
            </Grid>
            <Grid item xs={12} md={4}>
              <Typography variant="h6" gutterBottom>
                Links
              </Typography>
              <Typography variant="body2" component="div">
                <ul style={{ paddingLeft: '1.5rem', margin: 0 }}>
                  <li><Link component={RouterLink} to="/login" color="inherit">Login</Link></li>
                  <li><Link component={RouterLink} to="/mobile-app" color="inherit">Mobile App</Link></li>
                  <li><Link component={RouterLink} to="/dashboard" color="inherit">Dashboard</Link></li>
                  <li><Link component={RouterLink} to="/achievements" color="inherit">Achievements</Link></li>
                </ul>
              </Typography>
            </Grid>
          </Grid>
          <Box sx={{ mt: 4, pt: 3, borderTop: `1px solid ${theme.palette.divider}` }}>
            <Typography variant="body2" color="text.secondary" align="center">
              © {new Date().getFullYear()} Boxwise. All rights reserved.
            </Typography>
          </Box>
        </Container>
      </Box>
    </Box>
  );
};

export default LandingPage;

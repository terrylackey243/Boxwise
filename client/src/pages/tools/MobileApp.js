import React from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { useMobile } from '../../context/MobileContext';
import {
  Container,
  Typography,
  Box,
  Paper,
  Grid,
  Button,
  Card,
  CardContent,
  CardMedia,
  CardActions,
  Divider,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Link
} from '@mui/material';
import {
  QrCodeScanner as QrCodeScannerIcon,
  CameraAlt as CameraIcon,
  ShoppingCart as ShoppingCartIcon,
  Inventory as InventoryIcon,
  PhoneAndroid as PhoneAndroidIcon,
  ArrowForward as ArrowForwardIcon,
  Check as CheckIcon
} from '@mui/icons-material';

const MobileApp = () => {
  const { isMobile } = useMobile();
  
  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Paper sx={{ p: 3, mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <PhoneAndroidIcon fontSize="large" color="primary" sx={{ mr: 2 }} />
          <Typography variant="h4" component="h1">
            Mobile Application
          </Typography>
        </Box>
        
        <Typography variant="body1" paragraph>
          Boxwise now offers a mobile application experience, allowing you to manage your inventory on the go.
          Use your smartphone to scan barcodes, take photos of items, check inventory while shopping, and add items right when you purchase them.
        </Typography>
        
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2, mb: 1 }}>
          <Button
            component="a"
            href="/mobile-app-guide.html"
            target="_blank"
            variant="outlined"
            color="primary"
            startIcon={<PhoneAndroidIcon />}
          >
            View Mobile App Guide
          </Button>
        </Box>
        
        {isMobile ? (
          <Box sx={{ mb: 3 }}>
            <Typography variant="h6" gutterBottom color="primary">
              You're currently using a mobile device!
            </Typography>
            <Typography variant="body1">
              You can use all the mobile features directly in this browser. No separate app download required.
            </Typography>
          </Box>
        ) : (
          <Box sx={{ mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              Access on your mobile device
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap' }}>
              <Box sx={{ flex: '1 1 300px', pr: 3 }}>
                <Typography variant="body1" paragraph>
                  Simply visit this website on your mobile device's browser to access all mobile features.
                  No separate app download required.
                </Typography>
                <Typography variant="body1">
                  Scan the QR code with your mobile device to open the app directly.
                </Typography>
              </Box>
              <Box sx={{ flex: '0 0 auto', textAlign: 'center', p: 2 }}>
                <img 
                  src="/static/images/mobile-app-qr.png" 
                  alt="QR Code for Mobile App" 
                  style={{ 
                    width: 150, 
                    height: 150, 
                    border: '1px solid #eee', 
                    borderRadius: 8,
                    padding: 8
                  }} 
                />
              </Box>
            </Box>
          </Box>
        )}
      </Paper>
      
      <Typography variant="h5" gutterBottom sx={{ mt: 4, mb: 2 }}>
        Key Features
      </Typography>
      
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardMedia
              component="div"
              sx={{
                height: 140,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                bgcolor: 'primary.light',
                color: 'white'
              }}
            >
              <QrCodeScannerIcon sx={{ fontSize: 60 }} />
            </CardMedia>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Barcode Scanning
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Scan UPC codes directly with your phone camera to quickly look up product information.
                No need for external barcode scanners.
              </Typography>
            </CardContent>
            <CardActions>
              <Button 
                component={RouterLink} 
                to="/items/create" 
                size="small" 
                endIcon={<ArrowForwardIcon />}
              >
                Try It
              </Button>
            </CardActions>
          </Card>
        </Grid>
        
        <Grid item xs={12} md={6}>
          <Card>
            <CardMedia
              component="div"
              sx={{
                height: 140,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                bgcolor: 'secondary.light',
                color: 'white'
              }}
            >
              <CameraIcon sx={{ fontSize: 60 }} />
            </CardMedia>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Photo Capture
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Take photos of your items directly with your phone camera and upload them immediately.
                Document your items with visual references for better inventory management.
              </Typography>
            </CardContent>
            <CardActions>
              <Button 
                component={RouterLink} 
                to="/items/create" 
                size="small" 
                endIcon={<ArrowForwardIcon />}
              >
                Try It
              </Button>
            </CardActions>
          </Card>
        </Grid>
        
        <Grid item xs={12} md={6}>
          <Card>
            <CardMedia
              component="div"
              sx={{
                height: 140,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                bgcolor: 'success.light',
                color: 'white'
              }}
            >
              <ShoppingCartIcon sx={{ fontSize: 60 }} />
            </CardMedia>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Shopping Assistant
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Check your inventory while shopping to avoid duplicate purchases.
                Quickly search for items to see if you already own them before buying.
              </Typography>
            </CardContent>
            <CardActions>
              <Button 
                component={RouterLink} 
                to="/items" 
                size="small" 
                endIcon={<ArrowForwardIcon />}
              >
                View Inventory
              </Button>
            </CardActions>
          </Card>
        </Grid>
        
        <Grid item xs={12} md={6}>
          <Card>
            <CardMedia
              component="div"
              sx={{
                height: 140,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                bgcolor: 'info.light',
                color: 'white'
              }}
            >
              <InventoryIcon sx={{ fontSize: 60 }} />
            </CardMedia>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Instant Inventory
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Add items to your inventory right when you purchase them.
                No need to wait until you get home to update your records.
              </Typography>
            </CardContent>
            <CardActions>
              <Button 
                component={RouterLink} 
                to="/items/create" 
                size="small" 
                endIcon={<ArrowForwardIcon />}
              >
                Add Item
              </Button>
            </CardActions>
          </Card>
        </Grid>
      </Grid>
      
      <Paper sx={{ p: 3, mt: 4 }}>
        <Typography variant="h5" gutterBottom>
          Benefits
        </Typography>
        
        <List>
          <ListItem>
            <ListItemIcon>
              <CheckIcon color="success" />
            </ListItemIcon>
            <ListItemText 
              primary="Improved Efficiency" 
              secondary="Save time with mobile-friendly inventory management" 
            />
          </ListItem>
          
          <Divider component="li" />
          
          <ListItem>
            <ListItemIcon>
              <CheckIcon color="success" />
            </ListItemIcon>
            <ListItemText 
              primary="Better Documentation" 
              secondary="Capture photos and details at the point of purchase" 
            />
          </ListItem>
          
          <Divider component="li" />
          
          <ListItem>
            <ListItemIcon>
              <CheckIcon color="success" />
            </ListItemIcon>
            <ListItemText 
              primary="Avoid Duplicates" 
              secondary="Check your inventory while shopping to make informed decisions" 
            />
          </ListItem>
          
          <Divider component="li" />
          
          <ListItem>
            <ListItemIcon>
              <CheckIcon color="success" />
            </ListItemIcon>
            <ListItemText 
              primary="Real-time Updates" 
              secondary="Keep your inventory current with immediate updates" 
            />
          </ListItem>
        </List>
        
        <Box sx={{ mt: 3, textAlign: 'center' }}>
          <Button
            component={RouterLink}
            to="/items/create"
            variant="contained"
            color="primary"
            size="large"
            startIcon={<PhoneAndroidIcon />}
          >
            Try Mobile Features Now
          </Button>
        </Box>
      </Paper>
    </Container>
  );
};

export default MobileApp;

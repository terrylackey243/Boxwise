import React, { useState, useEffect, useContext } from 'react';
import axios from '../../utils/axiosConfig';
import {
  Container,
  Grid,
  Paper,
  Typography,
  Box,
  Button,
  Card,
  CardContent,
  CardActions,
  Divider,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  CircularProgress
} from '@mui/material';
import {
  CheckCircleOutline as CheckIcon,
  Cancel as CancelIcon,
  Star as StarIcon,
  StarBorder as StarBorderIcon,
  People as PeopleIcon
} from '@mui/icons-material';
import { AuthContext } from '../../context/AuthContext';
import { AlertContext } from '../../context/AlertContext';

const Subscription = () => {
  const { user } = useContext(AuthContext);
  const { setSuccessAlert, setErrorAlert } = useContext(AlertContext);
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPlan, setCurrentPlan] = useState('free');
  
  useEffect(() => {
    const fetchPlans = async () => {
      try {
        const response = await axios.get('/api/subscriptions/plans');
        if (response.data.success) {
          // Transform the data to match the component's expected format
          const formattedPlans = response.data.data.plans.map(plan => ({
            id: plan.id,
            name: plan.name,
            price: `$${plan.price}`,
            period: plan.interval === 'month' ? 'per month' : 'per year',
            description: plan.description,
            features: plan.features.map(feature => ({
              text: feature,
              available: true
            })),
            // Add some default styling based on plan type
            color: plan.id === 'free' ? '#718096' : 
                   plan.id === 'pro' ? '#6B46C1' : '#38A169',
            icon: plan.id === 'free' ? <StarBorderIcon fontSize="large" /> : 
                  plan.id === 'pro' ? <StarIcon fontSize="large" /> : 
                  <PeopleIcon fontSize="large" />
          }));
          
          setPlans(formattedPlans);
          setCurrentPlan(response.data.data.currentPlan);
        } else {
          setErrorAlert('Error loading subscription plans');
        }
      } catch (err) {
        setErrorAlert('Error loading subscription plans: ' + (err.response?.data?.message || err.message));
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchPlans();
  }, [setErrorAlert]);

  const handleUpgrade = (plan) => {
    setSelectedPlan(plan);
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
  };

  const handleConfirmUpgrade = async () => {
    if (!selectedPlan) return;
    
    try {
      // Make API call to change the subscription plan
      const response = await axios.post('/api/subscriptions/change-plan', {
        planId: selectedPlan.id
      });
      
      if (response.data.success) {
        setSuccessAlert(`Subscription upgraded to ${selectedPlan.name} plan!`);
        setCurrentPlan(selectedPlan.id);
      } else {
        setErrorAlert('Error upgrading subscription: ' + response.data.message);
      }
    } catch (err) {
      setErrorAlert('Error upgrading subscription: ' + (err.response?.data?.message || err.message));
      console.error(err);
    }
    
    setOpenDialog(false);
  };

  // Use the currentPlan from state, which is updated from the API

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Paper sx={{ p: 3, mb: 4, borderRadius: 2 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Subscription Plans
        </Typography>
        <Typography variant="body1" paragraph>
          Choose the plan that works best for you and your organization needs.
        </Typography>
        
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
            <CircularProgress />
          </Box>
        ) : (
          <Grid container spacing={3} sx={{ mt: 2 }}>
          {plans.map((plan) => (
            <Grid item xs={12} md={4} key={plan.id}>
              <Card 
                sx={{ 
                  height: '100%', 
                  display: 'flex', 
                  flexDirection: 'column',
                  borderRadius: 2,
                  ...(currentPlan === plan.id && {
                    border: 3,
                    borderColor: plan.color
                  })
                }}
              >
                <Box 
                  sx={{ 
                    bgcolor: plan.color, 
                    color: 'white', 
                    p: 2,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                  }}
                >
                  <Typography variant="h5" component="h2">
                    {plan.name}
                  </Typography>
                  {plan.icon}
                </Box>
                <CardContent sx={{ flexGrow: 1 }}>
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="h4" component="p" sx={{ fontWeight: 'bold' }}>
                      {plan.price}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {plan.period}
                    </Typography>
                  </Box>
                  
                  <Typography variant="body2" color="text.secondary" paragraph>
                    {plan.description}
                  </Typography>
                  
                  <Divider sx={{ my: 2 }} />
                  
                  <List dense>
                    {plan.features.map((feature, index) => (
                      <ListItem key={index} disableGutters>
                        <ListItemIcon sx={{ minWidth: 36 }}>
                          {feature.available ? (
                            <CheckIcon sx={{ color: 'success.main' }} />
                          ) : (
                            <CancelIcon sx={{ color: 'text.disabled' }} />
                          )}
                        </ListItemIcon>
                        <ListItemText 
                          primary={feature.text} 
                          sx={{ 
                            '& .MuiListItemText-primary': {
                              color: feature.available ? 'text.primary' : 'text.disabled'
                            }
                          }}
                        />
                      </ListItem>
                    ))}
                  </List>
                </CardContent>
                <CardActions sx={{ p: 2, pt: 0 }}>
                  {currentPlan === plan.id ? (
                    <Button 
                      fullWidth 
                      variant="outlined" 
                      disabled
                    >
                      Current Plan
                    </Button>
                  ) : (
                    <Button 
                      fullWidth 
                      variant="contained" 
                      sx={{ 
                        bgcolor: plan.color,
                        '&:hover': {
                          bgcolor: plan.color,
                          opacity: 0.9
                        }
                      }}
                      onClick={() => handleUpgrade(plan)}
                    >
                      {currentPlan === 'free' ? 'Upgrade' : 'Switch Plan'}
                    </Button>
                  )}
                </CardActions>
              </Card>
            </Grid>
          ))}
          </Grid>
        )}
      </Paper>
      
      <Dialog
        open={openDialog}
        onClose={handleCloseDialog}
      >
        <DialogTitle>
          Confirm Subscription Change
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            {selectedPlan && `Are you sure you want to upgrade to the ${selectedPlan.name} plan for ${selectedPlan.price} ${selectedPlan.period}?`}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button onClick={handleConfirmUpgrade} variant="contained" color="primary">
            Confirm
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default Subscription;

import React, { useState, useEffect, useContext, useCallback } from 'react';
import axios from '../../utils/axiosConfig';
import {
  Container,
  Grid,
  Paper,
  Typography,
  Box,
  Card,
  CardContent,
  Divider,
  LinearProgress,
  Chip,
  Avatar,
  Tooltip,
  Button,
  CircularProgress
} from '@mui/material';
import {
  EmojiEvents as TrophyIcon,
  Inventory as InventoryIcon,
  LocationOn as LocationIcon,
  Label as LabelIcon,
  Category as CategoryIcon,
  CalendarMonth as CalendarIcon,
  Star as StarIcon,
  Lock as LockIcon
} from '@mui/icons-material';
import { AuthContext } from '../../context/AuthContext';
import { AlertContext } from '../../context/AlertContext';

const Achievements = () => {
  const { user } = useContext(AuthContext);
  const { setErrorAlert } = useContext(AlertContext);
  const [achievements, setAchievements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalPoints: 0,
    completedAchievements: 0,
    level: 1
  });

  const fetchAchievements = useCallback(async () => {
    try {
      setLoading(true);
      console.log('Fetching achievements...');
      
      // Fetch achievements data from the API
      const response = await axios.get('/api/achievements');
      console.log('Achievements response:', response.data);
      
      if (response.data.success) {
        const { achievements, stats } = response.data.data;
        
        // Map the achievements to include the appropriate icon component
        const achievementsWithIcons = achievements.map(achievement => {
          let icon;
          
          // Determine which icon to use based on achievement type
          switch (achievement.type) {
            case 'item_count':
              icon = <InventoryIcon />;
              break;
            case 'location_count':
              icon = <LocationIcon />;
              break;
            case 'label_count':
              icon = <LabelIcon />;
              break;
            case 'category_count':
              icon = <CategoryIcon />;
              break;
            case 'login_streak':
              icon = <CalendarIcon />;
              break;
            default:
              icon = <StarIcon />;
          }
          
          return {
            ...achievement,
            icon
          };
        });
        
        // Update state with new data
        setAchievements(achievementsWithIcons);
        setStats(stats);
        console.log('Updated achievements state:', achievementsWithIcons);
        console.log('Updated stats state:', stats);
      } else {
        setErrorAlert('Error loading achievements');
      }
      
      setLoading(false);
    } catch (err) {
      setErrorAlert('Error loading achievements');
      setLoading(false);
      console.error('Error fetching achievements:', err);
    }
  }, [setErrorAlert]);
  
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    fetchAchievements();
  }, [user]); // Re-fetch when user changes, but not when fetchAchievements changes
  
  // Handle refresh button click
  const handleRefresh = () => {
    console.log('Refresh button clicked');
    fetchAchievements();
  };

  // Format date
  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Calculate progress percentage
  const calculateProgress = (current, threshold) => {
    return Math.min(100, Math.round((current / threshold) * 100));
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      {/* Stats Overview */}
      <Paper
        sx={{
          p: 3,
          mb: 4,
          display: 'flex',
          flexDirection: { xs: 'column', md: 'row' },
          alignItems: 'center',
          justifyContent: 'space-between',
          borderRadius: 2,
          background: 'linear-gradient(45deg, #6B46C1 30%, #9F7AEA 90%)',
          color: 'white',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <Avatar
            sx={{
              width: 80,
              height: 80,
              bgcolor: 'rgba(255, 255, 255, 0.2)',
              mr: 3
            }}
          >
            <TrophyIcon sx={{ fontSize: 40 }} />
          </Avatar>
          <Box>
            <Typography variant="h4" component="h1" gutterBottom>
              Level {stats.level}
            </Typography>
            <Typography variant="body1">
              {stats.completedAchievements} achievements completed
            </Typography>
            <Typography variant="body1">
              {stats.totalPoints} total points earned
            </Typography>
          </Box>
        </Box>
        
        <Box sx={{ mt: { xs: 3, md: 0 }, width: { xs: '100%', md: '40%' } }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
            <Typography variant="body2">
              Level {stats.level}
            </Typography>
            <Typography variant="body2">
              Level {stats.level + 1}
            </Typography>
          </Box>
          <LinearProgress
            variant="determinate"
            value={(stats.totalPoints % 100)}
            sx={{
              height: 10,
              borderRadius: 5,
              bgcolor: 'rgba(255, 255, 255, 0.2)',
              '& .MuiLinearProgress-bar': {
                bgcolor: 'white'
              }
            }}
          />
          <Typography variant="body2" sx={{ mt: 1, textAlign: 'center' }}>
            {stats.totalPoints % 100} / 100 points to next level
          </Typography>
        </Box>
      </Paper>

      {/* Achievements Grid */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h5" component="h2">
          Your Achievements
        </Typography>
        <Button 
          variant="outlined" 
          onClick={handleRefresh}
          startIcon={loading ? <CircularProgress size={20} /> : <TrophyIcon />}
          disabled={loading}
        >
          Refresh
        </Button>
      </Box>
      <Divider sx={{ mb: 3 }} />
      
      <Grid container spacing={3}>
        {achievements.map((achievement) => (
          <Grid item xs={12} sm={6} md={4} key={achievement.id}>
            <Card
              sx={{
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                borderRadius: 2,
                position: 'relative',
                ...(achievement.completed ? {
                  border: `2px solid ${achievement.color}`
                } : {
                  opacity: 0.7
                })
              }}
            >
              {!achievement.completed && (
                <Box
                  sx={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 1,
                    bgcolor: 'rgba(0, 0, 0, 0.1)',
                    borderRadius: 2
                  }}
                >
                  <LockIcon sx={{ fontSize: 40, color: 'text.secondary' }} />
                </Box>
              )}
              
              <Box
                sx={{
                  p: 2,
                  display: 'flex',
                  alignItems: 'center',
                  bgcolor: achievement.color,
                  color: 'white'
                }}
              >
                <Avatar
                  sx={{
                    bgcolor: 'rgba(255, 255, 255, 0.2)',
                    mr: 2
                  }}
                >
                  {achievement.icon}
                </Avatar>
                <Typography variant="h6" component="h3">
                  {achievement.name}
                </Typography>
              </Box>
              
              <CardContent sx={{ flexGrow: 1 }}>
                <Typography variant="body2" color="text.secondary" paragraph>
                  {achievement.description}
                </Typography>
                
                <Box sx={{ mt: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="body2" color="text.secondary">
                      Progress: {achievement.currentValue} / {achievement.threshold}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {calculateProgress(achievement.currentValue, achievement.threshold)}%
                    </Typography>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={calculateProgress(achievement.currentValue, achievement.threshold)}
                    sx={{
                      height: 8,
                      borderRadius: 4,
                      '& .MuiLinearProgress-bar': {
                        bgcolor: achievement.color
                      }
                    }}
                  />
                </Box>
                
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 2 }}>
                  <Chip
                    label={`+${achievement.points} points`}
                    size="small"
                    sx={{
                      bgcolor: achievement.completed ? achievement.color : 'text.disabled',
                      color: 'white'
                    }}
                  />
                  
                  {achievement.completed && (
                    <Tooltip title={`Completed on ${formatDate(achievement.completedAt)}`}>
                      <Chip
                        icon={<TrophyIcon />}
                        label="Completed"
                        size="small"
                        sx={{
                          bgcolor: 'success.main',
                          color: 'white'
                        }}
                      />
                    </Tooltip>
                  )}
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Container>
  );
};

export default Achievements;

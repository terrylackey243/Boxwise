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
  CircularProgress,
  Tabs,
  Tab
} from '@mui/material';
import {
  EmojiEvents as TrophyIcon,
  Inventory as InventoryIcon,
  LocationOn as LocationIcon,
  Label as LabelIcon,
  Category as CategoryIcon,
  CalendarMonth as CalendarIcon,
  Star as StarIcon,
  Lock as LockIcon,
  Group as GroupIcon,
  People as PeopleIcon,
  Insights as InsightsIcon
} from '@mui/icons-material';
import { AuthContext } from '../../context/AuthContext';
import { AlertContext } from '../../context/AlertContext';

const Achievements = () => {
  const { user } = useContext(AuthContext);
  const { setErrorAlert } = useContext(AlertContext);
  const [achievements, setAchievements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tabValue, setTabValue] = useState(0); // 0: All, 1: Personal, 2: Group
  const [stats, setStats] = useState({
    totalPoints: 0,
    completedAchievements: 0,
    level: 1
  });
  
  const [groupStats, setGroupStats] = useState({
    totalPoints: 0,
    completedAchievements: 0,
    level: 1
  });
  
  // Handle tab change
  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

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
            case 'group_item_count':
              icon = <GroupIcon />;
              break;
            case 'group_member_count':
              icon = <PeopleIcon />;
              break;
            case 'group_activity':
              icon = <InsightsIcon />;
              break;
            default:
              icon = <StarIcon />;
          }
          
          return {
            ...achievement,
            icon
          };
        });
        
        // Calculate group stats
        const groupAchievements = achievementsWithIcons.filter(a => 
          a.type.startsWith('group_')
        );
        const completedGroupAchievements = groupAchievements.filter(a => a.completed);
        const groupPoints = completedGroupAchievements.reduce((sum, a) => sum + a.points, 0);
        const groupLevel = Math.floor(groupPoints / 100) + 1;
        
        const groupStatsData = {
          totalPoints: groupPoints,
          completedAchievements: completedGroupAchievements.length,
          level: groupLevel
        };
        
        // Update state with new data
        setAchievements(achievementsWithIcons);
        setStats(stats);
        setGroupStats(groupStatsData);
        console.log('Updated achievements state:', achievementsWithIcons);
        console.log('Updated stats state:', stats);
        console.log('Updated group stats state:', groupStatsData);
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
      {/* Individual Stats Overview */}
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
              {stats.completedAchievements} personal achievements completed
            </Typography>
            <Typography variant="body1">
              {stats.totalPoints} personal points earned
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

      {/* Group Stats Overview */}
      <Paper
        sx={{
          p: 3,
          mb: 4,
          display: 'flex',
          flexDirection: { xs: 'column', md: 'row' },
          alignItems: 'center',
          justifyContent: 'space-between',
          borderRadius: 2,
          background: 'linear-gradient(45deg, #2B6CB0 30%, #4299E1 90%)',
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
            <GroupIcon sx={{ fontSize: 40 }} />
          </Avatar>
          <Box>
            <Typography variant="h4" component="h1" gutterBottom>
              Group Level {groupStats.level}
            </Typography>
            <Typography variant="body1">
              {groupStats.completedAchievements} group achievements completed
            </Typography>
            <Typography variant="body1">
              {groupStats.totalPoints} group points earned
            </Typography>
          </Box>
        </Box>
        
        <Box sx={{ mt: { xs: 3, md: 0 }, width: { xs: '100%', md: '40%' } }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
            <Typography variant="body2">
              Level {groupStats.level}
            </Typography>
            <Typography variant="body2">
              Level {groupStats.level + 1}
            </Typography>
          </Box>
          <LinearProgress
            variant="determinate"
            value={(groupStats.totalPoints % 100)}
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
            {groupStats.totalPoints % 100} / 100 points to next group level
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
      
      {/* Achievement Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs 
          value={tabValue} 
          onChange={handleTabChange} 
          aria-label="achievement tabs"
          centered
        >
          <Tab label="All Achievements" />
          <Tab label="Personal Achievements" />
          <Tab label="Group Achievements" />
        </Tabs>
      </Box>
      
      <Grid container spacing={3}>
        {loading ? (
          <Grid item xs={12} sx={{ textAlign: 'center', py: 5 }}>
            <CircularProgress />
          </Grid>
        ) : achievements
          .filter(achievement => {
            if (tabValue === 0) return true; // All achievements
            if (tabValue === 1) return !achievement.type.startsWith('group_'); // Personal achievements
            if (tabValue === 2) return achievement.type.startsWith('group_'); // Group achievements
            return true;
          }).length === 0 ? (
          <Grid item xs={12} sx={{ textAlign: 'center', py: 5 }}>
            <Typography variant="h6" color="text.secondary">
              {tabValue === 0 && "No achievements found"}
              {tabValue === 1 && "No personal achievements found"}
              {tabValue === 2 && "No group achievements found"}
            </Typography>
          </Grid>
        ) : achievements
          .filter(achievement => {
            if (tabValue === 0) return true; // All achievements
            if (tabValue === 1) return !achievement.type.startsWith('group_'); // Personal achievements
            if (tabValue === 2) return achievement.type.startsWith('group_'); // Group achievements
            return true;
          })
          .map((achievement) => (
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
                  color: 'white',
                  position: 'relative'
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
                <Typography variant="h6" component="h3" sx={{ pr: 4 }}>
                  {achievement.name}
                </Typography>
                
                {/* Badge to indicate personal or group achievement */}
                <Chip
                  label={achievement.type.startsWith('group_') ? 'Group' : 'Personal'}
                  size="small"
                  sx={{
                    position: 'absolute',
                    top: 8,
                    right: 8,
                    bgcolor: 'rgba(255, 255, 255, 0.3)',
                    color: 'white',
                    fontSize: '0.7rem',
                    height: 20
                  }}
                />
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

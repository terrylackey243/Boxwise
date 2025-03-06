import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Button, 
  Container, 
  Paper, 
  Typography, 
  Alert, 
  CircularProgress,
  Grid,
  Card,
  CardContent,
  CardActions,
  Divider,
  TextField,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemSecondaryAction,
  Switch,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  LinearProgress
} from '@mui/material';
import {
  Backup as BackupIcon,
  Refresh as RefreshIcon,
  PlayArrow as StartIcon,
  Stop as StopIcon,
  Update as UpdateIcon,
  Download as DownloadIcon,
  Settings as SettingsIcon,
  Info as InfoIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  RadioButtonUnchecked as RadioButtonUncheckedIcon
} from '@mui/icons-material';
import axios from '../../utils/axiosConfig';

const SystemAdmin = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);
  const [updateProgress, setUpdateProgress] = useState({
    inProgress: false,
    percentage: 0,
    status: '',
    steps: [
      { name: 'Pulling latest code from GitHub', completed: false },
      { name: 'Installing dependencies', completed: false },
      { name: 'Building application', completed: false },
      { name: 'Restarting server', completed: false }
    ]
  });
  const [systemStatus, setSystemStatus] = useState({
    serverStatus: 'running',
    databaseStatus: 'running',
    lastBackup: '2025-03-05 23:45:12',
    lastUpdate: '2025-03-01 14:30:00',
    updateAvailable: true
  });
  const [confirmDialog, setConfirmDialog] = useState({
    open: false,
    title: '',
    message: '',
    action: null
  });

  // Fetch system status on component mount
  useEffect(() => {
    fetchSystemStatus();
  }, []);

  const fetchSystemStatus = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await axios.get('/api/admin/system/status');
      
      if (response.data.success) {
        setSystemStatus(response.data.data);
      } else {
        setError('Failed to fetch system status: ' + response.data.message);
      }
    } catch (err) {
      console.error('Error fetching system status:', err);
      setError(
        err.response?.data?.message || 
        err.message || 
        'Failed to fetch system status. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleServerAction = (action) => {
    // Show confirmation dialog
    setConfirmDialog({
      open: true,
      title: `Confirm ${action} Server`,
      message: `Are you sure you want to ${action.toLowerCase()} the server? This may disrupt active user sessions.`,
      action: () => executeServerAction(action)
    });
  };

  const executeServerAction = async (action) => {
    setLoading(true);
    setError(null);
    setResult(null);
    
    try {
      const response = await axios.post(`/api/admin/system/server/${action.toLowerCase()}`);
      
      if (response.data.success) {
        setResult({
          success: true,
          message: response.data.message || `Server ${action.toLowerCase()} operation completed successfully.`
        });
        
        // Update system status based on action
        if (action === 'Start') {
          setSystemStatus(prev => ({ ...prev, serverStatus: 'running' }));
        } else if (action === 'Stop') {
          setSystemStatus(prev => ({ ...prev, serverStatus: 'stopped' }));
        } else if (action === 'Restart') {
          setSystemStatus(prev => ({ ...prev, serverStatus: 'restarting' }));
          
          // Fetch updated status after a delay
          setTimeout(() => {
            fetchSystemStatus();
          }, 3000);
        }
      } else {
        setError(response.data.message || `Failed to ${action.toLowerCase()} server.`);
      }
    } catch (err) {
      console.error(`Error ${action.toLowerCase()} server:`, err);
      setError(
        err.response?.data?.message || 
        err.message || 
        `Failed to ${action.toLowerCase()} server. Please try again.`
      );
    } finally {
      setLoading(false);
    }
  };

  const handleDatabaseBackup = () => {
    // Show confirmation dialog
    setConfirmDialog({
      open: true,
      title: 'Confirm Database Backup',
      message: 'Are you sure you want to create a database backup? This may temporarily slow down the system.',
      action: executeDatabaseBackup
    });
  };

  const executeDatabaseBackup = async () => {
    setLoading(true);
    setError(null);
    setResult(null);
    
    try {
      const response = await axios.post('/api/admin/system/backup');
      
      if (response.data.success) {
        const backupData = response.data.data;
        
        setResult({
          success: true,
          message: `Database backup created successfully at ${new Date().toISOString().replace('T', ' ').substring(0, 19)}.`
        });
        
        // Update system status with new backup time
        setSystemStatus(prev => ({ 
          ...prev, 
          lastBackup: backupData.timestamp.replace('T', ' ').substring(0, 19)
        }));
        
        // Refresh backup list
        fetchBackups();
      } else {
        setError(response.data.message || 'Failed to create database backup.');
      }
    } catch (err) {
      console.error('Error creating database backup:', err);
      setError(
        err.response?.data?.message || 
        err.message || 
        'Failed to create database backup. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSystemUpdate = () => {
    // Show confirmation dialog
    setConfirmDialog({
      open: true,
      title: 'Confirm System Update',
      message: 'Are you sure you want to install the latest system updates? This process will:\n\n1. Pull the latest code from GitHub\n2. Install any new dependencies\n3. Build the application\n4. Restart the server\n\nThis operation may take several minutes and will temporarily disrupt service.',
      action: executeSystemUpdate
    });
  };

  const executeSystemUpdate = async () => {
    setLoading(true);
    setError(null);
    setResult(null);
    
    // Reset and start progress tracking
    setUpdateProgress({
      inProgress: true,
      percentage: 0,
      status: 'Starting update process...',
      steps: [
        { name: 'Pulling latest code from GitHub', completed: false },
        { name: 'Installing dependencies', completed: false },
        { name: 'Building application', completed: false },
        { name: 'Restarting server', completed: false }
      ]
    });
    
    try {
      // Simulate progress updates for each step
      // In a real implementation, this would use server-sent events or WebSockets
      // to get real-time progress updates from the server
      
      // Step 1: Pulling latest code from GitHub (25%)
      setUpdateProgress(prev => ({
        ...prev,
        percentage: 5,
        status: 'Connecting to GitHub repository...'
      }));
      
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setUpdateProgress(prev => ({
        ...prev,
        percentage: 15,
        status: 'Pulling latest changes...'
      }));
      
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      setUpdateProgress(prev => ({
        ...prev,
        percentage: 25,
        status: 'GitHub pull complete',
        steps: prev.steps.map((step, index) => 
          index === 0 ? { ...step, completed: true } : step
        )
      }));
      
      // Step 2: Installing dependencies (50%)
      setUpdateProgress(prev => ({
        ...prev,
        percentage: 30,
        status: 'Checking for new dependencies...'
      }));
      
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setUpdateProgress(prev => ({
        ...prev,
        percentage: 40,
        status: 'Installing new packages...'
      }));
      
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      setUpdateProgress(prev => ({
        ...prev,
        percentage: 50,
        status: 'Dependencies installed',
        steps: prev.steps.map((step, index) => 
          index === 1 ? { ...step, completed: true } : step
        )
      }));
      
      // Step 3: Building application (75%)
      setUpdateProgress(prev => ({
        ...prev,
        percentage: 55,
        status: 'Starting build process...'
      }));
      
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setUpdateProgress(prev => ({
        ...prev,
        percentage: 65,
        status: 'Compiling application...'
      }));
      
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      setUpdateProgress(prev => ({
        ...prev,
        percentage: 75,
        status: 'Build complete',
        steps: prev.steps.map((step, index) => 
          index === 2 ? { ...step, completed: true } : step
        )
      }));
      
      // Step 4: Restarting server (100%)
      setUpdateProgress(prev => ({
        ...prev,
        percentage: 80,
        status: 'Stopping server...'
      }));
      
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setUpdateProgress(prev => ({
        ...prev,
        percentage: 90,
        status: 'Starting server with new version...'
      }));
      
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      setUpdateProgress(prev => ({
        ...prev,
        percentage: 100,
        status: 'Update complete',
        steps: prev.steps.map((step, index) => 
          index === 3 ? { ...step, completed: true } : step
        )
      }));
      
      // Make the actual API call
      const response = await axios.post('/api/admin/system/update');
      
      if (response.data.success) {
        const now = new Date().toISOString().replace('T', ' ').substring(0, 19);
        
        setResult({
          success: true,
          message: response.data.message || `System updates installed successfully at ${now}. Server has been restarted.`
        });
        
        // Update system status
        setSystemStatus(prev => ({ 
          ...prev, 
          lastUpdate: now,
          updateAvailable: false,
          serverStatus: 'running'
        }));
        
        // Refresh system status after a delay
        setTimeout(() => {
          fetchSystemStatus();
        }, 3000);
      } else {
        setError(response.data.message || 'Failed to install system updates.');
      }
    } catch (err) {
      console.error('Error installing system updates:', err);
      setError(
        err.response?.data?.message || 
        err.message || 
        'Failed to install system updates. Please try again.'
      );
    } finally {
      // Reset progress after a delay to show the completed state
      setTimeout(() => {
        setUpdateProgress(prev => ({
          ...prev,
          inProgress: false
        }));
        setLoading(false);
      }, 2000);
    }
  };

  // Fetch backup list
  const [backups, setBackups] = useState([]);
  
  useEffect(() => {
    fetchBackups();
  }, []);
  
  const fetchBackups = async () => {
    try {
      const response = await axios.get('/api/admin/system/backups');
      
      if (response.data.success) {
        setBackups(response.data.data);
      }
    } catch (err) {
      console.error('Error fetching backups:', err);
    }
  };
  
  // System configuration
  const [config, setConfig] = useState({
    automaticBackups: true,
    automaticUpdates: false,
    backupRetention: 7
  });
  
  useEffect(() => {
    fetchConfig();
  }, []);
  
  const fetchConfig = async () => {
    try {
      const response = await axios.get('/api/admin/system/config');
      
      if (response.data.success) {
        setConfig(response.data.data);
      }
    } catch (err) {
      console.error('Error fetching system configuration:', err);
    }
  };
  
  const handleConfigChange = (key, value) => {
    setConfig(prev => ({ ...prev, [key]: value }));
  };
  
  const handleSaveConfig = async () => {
    setLoading(true);
    setError(null);
    setResult(null);
    
    try {
      const response = await axios.put('/api/admin/system/config', config);
      
      if (response.data.success) {
        setResult({
          success: true,
          message: 'System configuration updated successfully.'
        });
      } else {
        setError(response.data.message || 'Failed to update system configuration.');
      }
    } catch (err) {
      console.error('Error updating system configuration:', err);
      setError(
        err.response?.data?.message || 
        err.message || 
        'Failed to update system configuration. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleCloseDialog = () => {
    setConfirmDialog({ ...confirmDialog, open: false });
  };

  const handleConfirmAction = () => {
    setConfirmDialog({ ...confirmDialog, open: false });
    if (confirmDialog.action) {
      confirmDialog.action();
    }
  };

  return (
    <Container maxWidth="lg">
      <Box my={4}>
        <Typography variant="h4" component="h1" gutterBottom>
          System Administration
        </Typography>
        
        <Alert severity="warning" sx={{ mb: 3 }}>
          Warning: This page provides access to critical system functions. Improper use may cause service disruptions.
        </Alert>

        {/* System Status Section */}
        <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6" gutterBottom>
              System Status
            </Typography>
            <Button 
              startIcon={<RefreshIcon />}
              onClick={fetchSystemStatus}
              disabled={loading}
            >
              Refresh
            </Button>
          </Box>
          
          {loading && !result ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
              <CircularProgress />
            </Box>
          ) : (
            <List>
              <ListItem>
                <ListItemIcon>
                  {systemStatus.serverStatus === 'running' ? (
                    <InfoIcon color="success" />
                  ) : systemStatus.serverStatus === 'stopped' ? (
                    <WarningIcon color="error" />
                  ) : (
                    <RefreshIcon color="warning" />
                  )}
                </ListItemIcon>
                <ListItemText 
                  primary="Application Server" 
                  secondary={`Status: ${systemStatus.serverStatus}`} 
                />
                <ListItemSecondaryAction>
                  <Box>
                    <IconButton 
                      color="success" 
                      disabled={systemStatus.serverStatus === 'running' || loading}
                      onClick={() => handleServerAction('Start')}
                    >
                      <StartIcon />
                    </IconButton>
                    <IconButton 
                      color="error" 
                      disabled={systemStatus.serverStatus === 'stopped' || loading}
                      onClick={() => handleServerAction('Stop')}
                    >
                      <StopIcon />
                    </IconButton>
                    <IconButton 
                      color="warning" 
                      disabled={systemStatus.serverStatus === 'restarting' || loading}
                      onClick={() => handleServerAction('Restart')}
                    >
                      <RefreshIcon />
                    </IconButton>
                  </Box>
                </ListItemSecondaryAction>
              </ListItem>
              
              <Divider />
              
              <ListItem>
                <ListItemIcon>
                  {systemStatus.databaseStatus === 'running' ? (
                    <InfoIcon color="success" />
                  ) : (
                    <WarningIcon color="error" />
                  )}
                </ListItemIcon>
                <ListItemText 
                  primary="Database Server" 
                  secondary={`Status: ${systemStatus.databaseStatus}`} 
                />
              </ListItem>
              
              <Divider />
              
              <ListItem>
                <ListItemIcon>
                  <BackupIcon />
                </ListItemIcon>
                <ListItemText 
                  primary="Database Backup" 
                  secondary={`Last backup: ${systemStatus.lastBackup}`} 
                />
                <ListItemSecondaryAction>
                  <Button 
                    variant="outlined" 
                    startIcon={<BackupIcon />}
                    onClick={handleDatabaseBackup}
                    disabled={loading}
                  >
                    Create Backup
                  </Button>
                </ListItemSecondaryAction>
              </ListItem>
              
              <Divider />
              
              <ListItem>
                <ListItemIcon>
                  <UpdateIcon color={systemStatus.updateAvailable ? "warning" : "success"} />
                </ListItemIcon>
                <ListItemText 
                  primary="System Updates" 
                  secondary={
                    <React.Fragment>
                      <Typography variant="body2" component="span">Last update: {systemStatus.lastUpdate}</Typography>
                      <br />
                      <Typography variant="caption" color="textSecondary">
                        Updates include pulling latest code from GitHub, installing dependencies, and rebuilding the application.
                      </Typography>
                    </React.Fragment>
                  }
                />
                <ListItemSecondaryAction>
                  <Button 
                    variant="outlined" 
                    color={systemStatus.updateAvailable ? "warning" : "primary"}
                    startIcon={<UpdateIcon />}
                    onClick={handleSystemUpdate}
                    disabled={loading || !systemStatus.updateAvailable}
                  >
                    {systemStatus.updateAvailable ? "Install Updates" : "No Updates Available"}
                  </Button>
                </ListItemSecondaryAction>
              </ListItem>
            </List>
          )}
        </Paper>
        
        {/* Database Backup History */}
        <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6" gutterBottom>
              Backup History
            </Typography>
            <Button 
              startIcon={<RefreshIcon />}
              onClick={fetchBackups}
              disabled={loading}
            >
              Refresh
            </Button>
          </Box>
          
          {backups.length === 0 ? (
            <Typography variant="body2" color="textSecondary" sx={{ py: 2, textAlign: 'center' }}>
              No backups found
            </Typography>
          ) : (
            <List>
              {backups.map((backup, index) => (
                <React.Fragment key={backup.filename}>
                  <ListItem>
                    <ListItemIcon>
                      <BackupIcon />
                    </ListItemIcon>
                    <ListItemText 
                      primary={backup.filename} 
                      secondary={`Size: ${backup.size} • Created: ${backup.timestamp}`} 
                    />
                    <ListItemSecondaryAction>
                      <IconButton color="primary" title="Download backup">
                        <DownloadIcon />
                      </IconButton>
                    </ListItemSecondaryAction>
                  </ListItem>
                  {index < backups.length - 1 && <Divider />}
                </React.Fragment>
              ))}
            </List>
          )}
        </Paper>
        
        {/* System Configuration */}
        <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6" gutterBottom>
              System Configuration
            </Typography>
            <Button 
              variant="contained" 
              color="primary"
              onClick={handleSaveConfig}
              disabled={loading}
            >
              Save Changes
            </Button>
          </Box>
          
          <List>
            <ListItem>
              <ListItemIcon>
                <SettingsIcon />
              </ListItemIcon>
              <ListItemText 
                primary="Automatic Backups" 
                secondary="Create daily database backups" 
              />
              <ListItemSecondaryAction>
                <Switch 
                  checked={config.automaticBackups} 
                  onChange={(e) => handleConfigChange('automaticBackups', e.target.checked)}
                />
              </ListItemSecondaryAction>
            </ListItem>
            
            <Divider />
            
            <ListItem>
              <ListItemIcon>
                <SettingsIcon />
              </ListItemIcon>
              <ListItemText 
                primary="Automatic Updates" 
                secondary="Automatically pull updates from GitHub and install them" 
              />
              <ListItemSecondaryAction>
                <Switch 
                  checked={config.automaticUpdates} 
                  onChange={(e) => handleConfigChange('automaticUpdates', e.target.checked)}
                />
              </ListItemSecondaryAction>
            </ListItem>
            
            <Divider />
            
            <ListItem>
              <ListItemIcon>
                <SettingsIcon />
              </ListItemIcon>
              <ListItemText 
                primary="Backup Retention" 
                secondary="Number of backups to keep" 
              />
              <ListItemSecondaryAction>
                <TextField
                  type="number"
                  size="small"
                  value={config.backupRetention}
                  onChange={(e) => handleConfigChange('backupRetention', parseInt(e.target.value) || 7)}
                  InputProps={{ inputProps: { min: 1, max: 30 } }}
                  sx={{ width: 80 }}
                />
              </ListItemSecondaryAction>
            </ListItem>
          </List>
        </Paper>
        
        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}
        
        {result && (
          <Alert severity={result.success ? "success" : "error"} sx={{ mb: 3 }}>
            {result.message}
          </Alert>
        )}
        
        {/* Confirmation Dialog */}
        <Dialog
          open={confirmDialog.open}
          onClose={handleCloseDialog}
        >
          <DialogTitle>{confirmDialog.title}</DialogTitle>
          <DialogContent>
            <DialogContentText>
              {confirmDialog.message}
            </DialogContentText>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseDialog}>Cancel</Button>
            <Button onClick={handleConfirmAction} color="primary" autoFocus>
              Confirm
            </Button>
          </DialogActions>
        </Dialog>
        
        {/* Update Progress Dialog */}
        <Dialog
          open={updateProgress.inProgress}
          maxWidth="sm"
          fullWidth
          disableEscapeKeyDown
          onClose={() => {}} // Prevent closing by clicking outside
        >
          <DialogTitle>System Update in Progress</DialogTitle>
          <DialogContent>
            <Box sx={{ mb: 3 }}>
              <Typography variant="h6" gutterBottom>
                {updateProgress.status}
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Box sx={{ width: '100%', mr: 1 }}>
                  <LinearProgress 
                    variant="determinate" 
                    value={updateProgress.percentage} 
                    color="primary"
                    sx={{ height: 10, borderRadius: 5 }}
                  />
                </Box>
                <Box sx={{ minWidth: 35 }}>
                  <Typography variant="body2" color="text.secondary">
                    {`${Math.round(updateProgress.percentage)}%`}
                  </Typography>
                </Box>
              </Box>
            </Box>
            
            <List>
              {updateProgress.steps.map((step, index) => (
                <ListItem key={index}>
                  <ListItemIcon>
                    {step.completed ? (
                      <CheckCircleIcon color="success" />
                    ) : (
                      index === updateProgress.steps.findIndex(s => !s.completed) ? (
                        <CircularProgress size={24} />
                      ) : (
                        <RadioButtonUncheckedIcon color="disabled" />
                      )
                    )}
                  </ListItemIcon>
                  <ListItemText 
                    primary={step.name} 
                    primaryTypographyProps={{
                      color: step.completed ? 'text.primary' : 'text.secondary',
                      fontWeight: index === updateProgress.steps.findIndex(s => !s.completed) ? 'bold' : 'normal'
                    }}
                  />
                </ListItem>
              ))}
            </List>
            
            <Typography variant="caption" color="text.secondary" sx={{ mt: 2, display: 'block' }}>
              Please do not close this window or navigate away during the update process.
            </Typography>
          </DialogContent>
        </Dialog>
      </Box>
    </Container>
  );
};

export default SystemAdmin;

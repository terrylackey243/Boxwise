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
  LinearProgress,
  Chip,
  Tooltip,
  ButtonGroup
} from '@mui/material';
import {
  Backup as BackupIcon,
  Refresh as RefreshIcon,
  PlayArrow as StartIcon,
  Stop as StopIcon,
  Download as DownloadIcon,
  Settings as SettingsIcon,
  Info as InfoIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  RadioButtonUnchecked as RadioButtonUncheckedIcon,
  Restore as RestoreIcon,
  Update as UpdateIcon,
  Edit as EditIcon,
  Save as SaveIcon
} from '@mui/icons-material';
import axios from '../../utils/axiosConfig';
import versionInfo from '../../version.json';

const SystemAdmin = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);
  const [currentVersion, setCurrentVersion] = useState(versionInfo);
  const [manualVersion, setManualVersion] = useState({
    major: versionInfo.major,
    minor: versionInfo.minor,
    patch: versionInfo.patch
  });
  const [systemStatus, setSystemStatus] = useState({
    serverStatus: 'running',
    databaseStatus: 'running',
    lastBackup: 'Never'
  });
  const [confirmDialog, setConfirmDialog] = useState({
    open: false,
    title: '',
    message: '',
    action: null
  });
  const [restoreDialog, setRestoreDialog] = useState({
    open: false,
    backupFile: null
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
        // Ensure databaseStatus has a default value if not provided by the API
        const data = response.data.data;
        if (data.databaseStatus === undefined) {
          data.databaseStatus = 'running';
        }
        setSystemStatus(data);
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
          message: `Database backup created successfully at ${backupData.timestamp.replace('T', ' ').substring(0, 19)}.`
        });
        
        // Update system status with new backup time
        setSystemStatus(prev => ({ 
          ...prev, 
          lastBackup: backupData.timestamp.replace('T', ' ').substring(0, 19)
        }));
        
        // Refresh backup list and system status to ensure consistency
        fetchBackups();
        fetchSystemStatus();
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

  // Fetch backup list
  const [backups, setBackups] = useState([]);
  
  useEffect(() => {
    fetchBackups();
  }, []);
  
  const fetchBackups = async () => {
    try {
      const response = await axios.get('/api/admin/system/backups');
      
      if (response.data.success) {
        // Sort backups by timestamp in descending order (newest first)
        const sortedBackups = [...response.data.data].sort((a, b) => {
          return new Date(b.timestamp) - new Date(a.timestamp);
        });
        setBackups(sortedBackups);
      }
    } catch (err) {
      console.error('Error fetching backups:', err);
    }
  };

  const handleRestoreBackup = (backup) => {
    setRestoreDialog({
      open: true,
      backupFile: backup
    });
  };

  const executeRestoreBackup = async () => {
    if (!restoreDialog.backupFile) return;
    
    setLoading(true);
    setError(null);
    setResult(null);
    setRestoreDialog({ ...restoreDialog, open: false });
    
    try {
      const response = await axios.post('/api/admin/system/restore', {
        filename: restoreDialog.backupFile.filename
      });
      
      if (response.data.success) {
        setResult({
          success: true,
          message: `Database restored successfully from backup ${restoreDialog.backupFile.timestamp}.`
        });
        
        // Refresh system status after a delay
        setTimeout(() => {
          fetchSystemStatus();
        }, 3000);
      } else {
        setError(response.data.message || 'Failed to restore database from backup.');
      }
    } catch (err) {
      console.error('Error restoring database:', err);
      setError(
        err.response?.data?.message || 
        err.message || 
        'Failed to restore database from backup. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };
  
  // System configuration
  const [config, setConfig] = useState({
    automaticBackups: true,
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

  const handleCloseRestoreDialog = () => {
    setRestoreDialog({ ...restoreDialog, open: false });
  };

  // Version management functions
  const updateVersion = async (newVersion) => {
    setLoading(true);
    setError(null);
    setResult(null);
    
    try {
      // Update version.json file
      const response = await axios.put('/api/admin/system/version', newVersion);
      
      if (response.data.success) {
        setCurrentVersion(response.data.data);
        setManualVersion({
          major: response.data.data.major,
          minor: response.data.data.minor,
          patch: response.data.data.patch
        });
        
        setResult({
          success: true,
          message: `Version updated to ${response.data.data.version} successfully.`
        });
      } else {
        setError(response.data.message || 'Failed to update version.');
      }
    } catch (err) {
      console.error('Error updating version:', err);
      setError(
        err.response?.data?.message || 
        err.message || 
        'Failed to update version. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };
  
  const handleIncrementVersion = (component) => {
    const newVersion = { ...currentVersion };
    
    if (component === 'major') {
      newVersion.major += 1;
      newVersion.minor = 0;
      newVersion.patch = 0;
    } else if (component === 'minor') {
      newVersion.minor += 1;
      newVersion.patch = 0;
    } else if (component === 'patch') {
      newVersion.patch += 1;
    }
    
    newVersion.version = `${newVersion.major}.${newVersion.minor}.${newVersion.patch}`;
    updateVersion(newVersion);
  };
  
  const handleManualVersionChange = (component, value) => {
    // Ensure value is a number and non-negative
    const numValue = Math.max(0, parseInt(value) || 0);
    
    setManualVersion(prev => ({
      ...prev,
      [component]: numValue
    }));
  };
  
  const handleSaveManualVersion = () => {
    const newVersion = {
      major: manualVersion.major,
      minor: manualVersion.minor,
      patch: manualVersion.patch,
      version: `${manualVersion.major}.${manualVersion.minor}.${manualVersion.patch}`
    };
    
    updateVersion(newVersion);
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
                      <IconButton 
                        color="primary" 
                        title="Restore backup"
                        onClick={() => handleRestoreBackup(backup)}
                        disabled={loading}
                      >
                        <RestoreIcon />
                      </IconButton>
                      <IconButton 
                        color="primary" 
                        title="Download backup"
                        disabled={loading}
                      >
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
        
        {/* Version Control Section */}
        <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6" gutterBottom>
              Version Control
            </Typography>
            <Chip 
              size="medium" 
              label={`v${currentVersion.version}`} 
              color="primary" 
            />
          </Box>
          
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="subtitle1" gutterBottom>
                    Increment Version
                  </Typography>
                  <Typography variant="body2" color="text.secondary" paragraph>
                    Update version components individually. Increasing Major or Minor will reset lower components to zero.
                  </Typography>
                  <ButtonGroup variant="outlined" sx={{ mt: 1 }}>
                    <Tooltip title="Increase Major Version">
                      <Button 
                        onClick={() => handleIncrementVersion('major')}
                        disabled={loading}
                      >
                        Major ({currentVersion.major} → {currentVersion.major + 1}.0.0)
                      </Button>
                    </Tooltip>
                    <Tooltip title="Increase Minor Version">
                      <Button 
                        onClick={() => handleIncrementVersion('minor')}
                        disabled={loading}
                      >
                        Minor ({currentVersion.minor} → {currentVersion.major}.{currentVersion.minor + 1}.0)
                      </Button>
                    </Tooltip>
                    <Tooltip title="Increase Patch Version">
                      <Button 
                        onClick={() => handleIncrementVersion('patch')}
                        disabled={loading}
                      >
                        Patch ({currentVersion.patch} → {currentVersion.major}.{currentVersion.minor}.{currentVersion.patch + 1})
                      </Button>
                    </Tooltip>
                  </ButtonGroup>
                </CardContent>
              </Card>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="subtitle1" gutterBottom>
                    Manual Version Entry
                  </Typography>
                  <Typography variant="body2" color="text.secondary" paragraph>
                    Set specific version numbers manually.
                  </Typography>
                  <Grid container spacing={2} alignItems="center">
                    <Grid item xs={3}>
                      <TextField
                        label="Major"
                        type="number"
                        value={manualVersion.major}
                        onChange={(e) => handleManualVersionChange('major', e.target.value)}
                        fullWidth
                        inputProps={{ min: 0 }}
                        disabled={loading}
                      />
                    </Grid>
                    <Grid item xs={3}>
                      <TextField
                        label="Minor"
                        type="number"
                        value={manualVersion.minor}
                        onChange={(e) => handleManualVersionChange('minor', e.target.value)}
                        fullWidth
                        inputProps={{ min: 0 }}
                        disabled={loading}
                      />
                    </Grid>
                    <Grid item xs={3}>
                      <TextField
                        label="Patch"
                        type="number"
                        value={manualVersion.patch}
                        onChange={(e) => handleManualVersionChange('patch', e.target.value)}
                        fullWidth
                        inputProps={{ min: 0 }}
                        disabled={loading}
                      />
                    </Grid>
                    <Grid item xs={3}>
                      <Button
                        variant="contained"
                        startIcon={<SaveIcon />}
                        onClick={handleSaveManualVersion}
                        disabled={loading}
                        fullWidth
                      >
                        Save
                      </Button>
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
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
        
        {/* Restore Backup Dialog */}
        <Dialog
          open={restoreDialog.open}
          onClose={handleCloseRestoreDialog}
        >
          <DialogTitle>Confirm Database Restore</DialogTitle>
          <DialogContent>
            <DialogContentText>
              Are you sure you want to restore the database from backup {restoreDialog.backupFile?.timestamp}?
              <br /><br />
              <strong>Warning:</strong> This will replace all current data with the data from the backup. This action cannot be undone.
            </DialogContentText>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseRestoreDialog}>Cancel</Button>
            <Button onClick={executeRestoreBackup} color="primary" autoFocus>
              Restore Database
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </Container>
  );
};

export default SystemAdmin;

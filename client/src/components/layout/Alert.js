import React, { useContext } from 'react';
import { AlertContext } from '../../context/AlertContext';
import { Alert as MuiAlert, Snackbar, Stack } from '@mui/material';

const Alert = () => {
  const { alerts, removeAlert } = useContext(AlertContext);

  const handleClose = (id) => (event, reason) => {
    if (reason === 'clickaway') {
      return;
    }
    removeAlert(id);
  };

  return (
    <Stack spacing={2} sx={{ width: '100%', position: 'fixed', top: 64, zIndex: 1400 }}>
      {alerts.map((alert) => (
        <Snackbar
          key={alert.id}
          open={true}
          autoHideDuration={5000}
          onClose={handleClose(alert.id)}
          anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
        >
          <MuiAlert
            elevation={6}
            variant="filled"
            onClose={handleClose(alert.id)}
            severity={alert.severity}
            sx={{ width: '100%' }}
          >
            {alert.msg}
          </MuiAlert>
        </Snackbar>
      ))}
    </Stack>
  );
};

export default Alert;

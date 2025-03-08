import React from 'react';
import {
  Paper,
  Typography,
  Box,
  Button,
  Grid,
  Card,
  CardMedia,
  CardContent,
  CardActions,
  IconButton,
  Divider
} from '@mui/material';
import {
  CameraAlt as CameraIcon,
  Delete as DeleteIcon
} from '@mui/icons-material';
import { useMobile } from '../../context/MobileContext';

const MobilePhotoSection = () => {
  const { openPhotoCapture, capturedPhotos, getCapturedPhotos } = useMobile();
  
  // Handle photo capture
  const handleTakePhoto = () => {
    openPhotoCapture();
  };
  
  // Get photos for the current item
  const itemPhotos = getCapturedPhotos();
  
  return (
    <Paper sx={{ p: 3, mb: 3 }}>
      <Typography variant="h6" gutterBottom>
        Photos
      </Typography>
      
      <Button
        fullWidth
        variant="outlined"
        color="primary"
        startIcon={<CameraIcon />}
        onClick={handleTakePhoto}
        sx={{ mb: 2 }}
      >
        Take Photo
      </Button>
      
      {itemPhotos.length > 0 ? (
        <Grid container spacing={2}>
          {itemPhotos.map((photo) => (
            <Grid item xs={12} key={photo.id}>
              <Card>
                <CardMedia
                  component="img"
                  height="140"
                  image={photo.dataUrl}
                  alt="Item photo"
                />
                <CardContent sx={{ py: 1 }}>
                  <Typography variant="caption" color="text.secondary">
                    {new Date(photo.timestamp).toLocaleString()}
                  </Typography>
                </CardContent>
                <CardActions sx={{ justifyContent: 'flex-end', pt: 0 }}>
                  <IconButton color="error" size="small">
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
      ) : (
        <Box sx={{ textAlign: 'center', py: 2 }}>
          <Typography variant="body2" color="text.secondary">
            No photos yet. Use the button above to take photos of your item.
          </Typography>
        </Box>
      )}
      
      <Divider sx={{ my: 2 }} />
      
      <Typography variant="body2" color="text.secondary">
        Photos will be saved with the item after creation. You can add more photos later.
      </Typography>
    </Paper>
  );
};

export default MobilePhotoSection;

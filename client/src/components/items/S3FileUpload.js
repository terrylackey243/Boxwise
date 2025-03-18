import React, { useState, useRef, useEffect } from 'react';
import axios from '../../utils/axiosConfig';
import { compressImage, formatBytes } from '../../utils/imageCompression';
import {
  Box,
  Button,
  CircularProgress,
  Typography,
  FormControlLabel,
  Checkbox,
  LinearProgress,
  Alert,
  Divider,
  Paper
} from '@mui/material';
import { 
  AttachFile as AttachFileIcon,
  Info as InfoIcon,
  Compress as CompressIcon
} from '@mui/icons-material';

// Constants for file upload limits
const MAX_FILE_SIZE = 5000000; // 5MB in bytes
const MAX_ATTACHMENTS_PER_ITEM = 5;

// Allowed file types
const ALLOWED_FILE_TYPES = {
  // Images
  'image/jpeg': true,
  'image/jpg': true,
  'image/png': true,
  'image/gif': true,
  'image/webp': true,
  'image/svg+xml': true,
  
  // Documents
  'application/pdf': true,
  'application/msword': true, // .doc
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': true, // .docx
  'application/vnd.ms-excel': true, // .xls
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': true, // .xlsx
  'application/vnd.ms-powerpoint': true, // .ppt
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': true, // .pptx
  'text/plain': true, // .txt
  'text/csv': true, // .csv
};

// Human-readable list of allowed file types
const ALLOWED_FILE_EXTENSIONS = '.jpg, .jpeg, .png, .gif, .webp, .svg, .pdf, .doc, .docx, .xls, .xlsx, .ppt, .pptx, .txt, .csv';

/**
 * Component for handling file uploads directly to S3 using presigned URLs
 */
const S3FileUpload = ({ itemId, onUploadSuccess, onUploadError, existingAttachments = [] }) => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [isPrimaryPhoto, setIsPrimaryPhoto] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStep, setUploadStep] = useState(''); // For showing the current step of the process
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);
  
  // Calculate remaining attachments
  const attachmentCount = existingAttachments.length;
  const remainingAttachments = MAX_ATTACHMENTS_PER_ITEM - attachmentCount;
  const canUploadMore = remainingAttachments > 0;
  
  // State for compression information
  const [compressing, setCompressing] = useState(false);
  const [compressionStats, setCompressionStats] = useState(null);
  
  const handleFileChange = (e) => {
    setError(null);
    setCompressionStats(null);
    
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      
      // Check if file type is allowed
      if (!ALLOWED_FILE_TYPES[file.type]) {
        setError(`File type not allowed. Supported file types: ${ALLOWED_FILE_EXTENSIONS}`);
        return;
      }
      
      // For non-image files, validate size immediately
      if (!file.type.startsWith('image/') && file.size > MAX_FILE_SIZE) {
        setError(`File size (${formatBytes(file.size)}) exceeds the maximum allowed size of ${formatBytes(MAX_FILE_SIZE)}`);
        return;
      }
      
      setSelectedFile(file);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setUploading(true);
    setUploadProgress(0);
    
    try {
      // Attempt compression for oversized images
      let fileToUpload = selectedFile;
      
      // For images that are larger than the limit, try compression
      if (selectedFile.type.startsWith('image/') && selectedFile.size > MAX_FILE_SIZE) {
        setUploadStep('Compressing image...');
        setCompressing(true);
        
        // Try to compress the image
        fileToUpload = await compressImage(selectedFile, MAX_FILE_SIZE);
        
        // If compression was successful, show stats
        if (fileToUpload.size < selectedFile.size) {
          const savedSize = selectedFile.size - fileToUpload.size;
          const savedPercentage = Math.round((savedSize / selectedFile.size) * 100);
          
          setCompressionStats({
            originalSize: formatBytes(selectedFile.size),
            compressedSize: formatBytes(fileToUpload.size),
            savedSize: formatBytes(savedSize),
            savedPercentage
          });
        }
        
        // If still too large after compression
        if (fileToUpload.size > MAX_FILE_SIZE) {
          setError(`Image could not be compressed enough to meet the ${formatBytes(MAX_FILE_SIZE)} limit. Please use a smaller image.`);
          setUploading(false);
          setCompressing(false);
          return;
        }
      }
      
      setCompressing(false);
      setUploadStep('Requesting upload URL...');

      // Step 1: Get a presigned URL from the server
      const presignedResponse = await axios.get(
        `/api/items/${itemId}/presigned-upload`,
        {
          params: {
            fileName: selectedFile.name,
            fileType: selectedFile.type,
            isPrimaryPhoto: isPrimaryPhoto
          }
        }
      );

      if (!presignedResponse.data.success) {
        throw new Error('Failed to get upload URL');
      }

      const { uploadUrl, fileKey } = presignedResponse.data.data;
      
      // Step 2: Upload the file directly to S3
      setUploadStep('Uploading to cloud storage...');
      
      // Use XMLHttpRequest to track upload progress
      await new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        
        xhr.upload.addEventListener('progress', (event) => {
          if (event.lengthComputable) {
            const percentComplete = Math.round((event.loaded / event.total) * 100);
            setUploadProgress(percentComplete);
          }
        });
        
        xhr.addEventListener('load', () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve();
          } else {
            reject(new Error(`Upload failed with status ${xhr.status}`));
          }
        });
        
        xhr.addEventListener('error', () => {
          reject(new Error('Upload failed due to network error'));
        });
        
        xhr.open('PUT', uploadUrl);
        xhr.setRequestHeader('Content-Type', fileToUpload.type);
        xhr.send(fileToUpload);
      });
      
      // Step 3: Confirm the upload with the server
      setUploadStep('Confirming upload...');
      setUploadProgress(100);
      
      const confirmResponse = await axios.post(`/api/items/${itemId}/attachments`, {
        fileKey,
        fileName: selectedFile.name,
        fileType: selectedFile.type,
        isPrimaryPhoto
      });
      
      if (!confirmResponse.data.success) {
        throw new Error('Failed to confirm upload');
      }
      
      // Clear the selection and notify parent
      setSelectedFile(null);
      setIsPrimaryPhoto(false);
      onUploadSuccess(confirmResponse.data.data);
      
    } catch (error) {
      console.error('Upload error:', error);
      onUploadError(error.message || 'Error uploading file');
    } finally {
      setUploading(false);
      setCompressing(false);
      setUploadStep('');
      setUploadProgress(0);
    }
  };

  return (
    <Box>
      <input
        type="file"
        onChange={handleFileChange}
        style={{ display: 'none' }}
        ref={fileInputRef}
      />
      
      <Button
        variant="outlined"
        component="span"
        onClick={() => fileInputRef.current.click()}
        startIcon={<AttachFileIcon />}
        fullWidth
        sx={{ mb: 2 }}
      >
        {selectedFile ? selectedFile.name : 'Select File'}
      </Button>
      
      {selectedFile && selectedFile.type.startsWith('image/') && (
        <Box sx={{ mb: 2 }}>
          <FormControlLabel
            control={
              <Checkbox
                checked={isPrimaryPhoto}
                onChange={(e) => setIsPrimaryPhoto(e.target.checked)}
              />
            }
            label="Set as primary photo"
          />
        </Box>
      )}
      
      {compressionStats && (
        <Alert severity="success" sx={{ mt: 2, mb: 2 }}>
          <Typography variant="body2">
            Image compressed from {compressionStats.originalSize} to {compressionStats.compressedSize}
          </Typography>
          <Typography variant="body2">
            Saved {compressionStats.savedSize} ({compressionStats.savedPercentage}%)
          </Typography>
        </Alert>
      )}
      
      {uploading && (
        <Box sx={{ mt: 2, mb: 2 }}>
          <Typography variant="body2" gutterBottom>
            {uploadStep}
          </Typography>
          <LinearProgress variant="determinate" value={uploadProgress} />
        </Box>
      )}
      
      {error && (
        <Alert severity="error" sx={{ mt: 2, mb: 2 }}>
          {error}
        </Alert>
      )}
      
      {!canUploadMore && (
        <Alert severity="warning" sx={{ mt: 2, mb: 2 }}>
          Maximum number of attachments reached ({MAX_ATTACHMENTS_PER_ITEM})
        </Alert>
      )}
      
      {selectedFile && selectedFile.type.startsWith('image/') && selectedFile.size > MAX_FILE_SIZE && (
        <Alert severity="info" sx={{ mt: 2, mb: 2 }} icon={<CompressIcon />}>
          This image exceeds the maximum file size but will be automatically compressed before uploading.
        </Alert>
      )}
      
      <Box sx={{ mt: 2, mb: 2 }}>
        <Paper variant="outlined" sx={{ p: 1.5, bgcolor: 'background.default' }}>
          <Typography variant="caption" display="block" sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
            <InfoIcon fontSize="small" sx={{ mr: 0.5, color: 'info.main' }} />
            Attachment Limits
          </Typography>
          <Divider sx={{ mb: 1 }} />
          <Typography variant="caption" display="block">
            • Maximum {MAX_ATTACHMENTS_PER_ITEM} attachments per item
          </Typography>
          <Typography variant="caption" display="block">
            • Maximum file size: {formatBytes(MAX_FILE_SIZE)}
          </Typography>
          <Typography variant="caption" display="block">
            • Remaining: {remainingAttachments} of {MAX_ATTACHMENTS_PER_ITEM}
          </Typography>
        </Paper>
      </Box>
      
      <Button
        variant="contained"
        color="primary"
        onClick={handleUpload}
        disabled={!selectedFile || uploading || !canUploadMore}
        fullWidth
      >
        {uploading ? <CircularProgress size={24} /> : 'Upload'}
      </Button>
    </Box>
  );
};

export default S3FileUpload;

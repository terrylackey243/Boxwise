/**
 * Utility functions for image compression
 */

/**
 * Compresses an image file to fit within a maximum file size
 * @param {File} file - The image file to compress
 * @param {number} maxSizeBytes - Maximum file size in bytes
 * @param {number} [quality=0.7] - Initial quality factor (0-1)
 * @param {number} [minQuality=0.3] - Minimum quality to try before giving up
 * @param {number} [maxWidth=1920] - Maximum width of the image
 * @returns {Promise<File>} - A promise that resolves to a compressed File object
 */
export const compressImage = async (
  file,
  maxSizeBytes,
  quality = 0.7,
  minQuality = 0.3,
  maxWidth = 1920
) => {
  // Check if it's an image file that we can compress
  if (!file.type.startsWith('image/')) {
    console.log('Not an image file, returning original file');
    return file;
  }
  
  // Skip compression for small files that are already under the limit
  if (file.size <= maxSizeBytes) {
    console.log('File already under size limit, no compression needed');
    return file;
  }

  // Create a new promise to handle the async compression
  return new Promise((resolve, reject) => {
    // Create file reader
    const reader = new FileReader();
    
    reader.onload = (readerEvent) => {
      // Create an image object
      const img = new Image();
      
      img.onload = () => {
        // Create a canvas to resize and compress the image
        const canvas = document.createElement('canvas');
        
        // Calculate dimensions while maintaining aspect ratio
        let width = img.width;
        let height = img.height;
        
        // Resize large images to improve compression
        if (width > maxWidth) {
          const ratio = maxWidth / width;
          width = maxWidth;
          height = Math.round(height * ratio);
        }
        
        // Set canvas dimensions
        canvas.width = width;
        canvas.height = height;
        
        // Draw image to canvas
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        
        // Try to compress with initial quality
        const tryCompression = (currentQuality) => {
          // Convert to blob with quality setting
          canvas.toBlob(async (blob) => {
            // Check if the compressed file is under the limit
            if (blob.size <= maxSizeBytes || currentQuality <= minQuality) {
              // Convert blob to File
              const compressedFile = new File(
                [blob], 
                file.name, 
                { type: file.type }
              );
              
              console.log(`Compressed from ${file.size} to ${compressedFile.size} bytes (${Math.round(compressedFile.size / file.size * 100)}% of original) with quality ${currentQuality}`);
              
              resolve(compressedFile);
            } else {
              // If still too large, try a lower quality
              const newQuality = Math.max(currentQuality - 0.1, minQuality);
              console.log(`Still too large (${blob.size} bytes), trying with quality ${newQuality}`);
              
              tryCompression(newQuality);
            }
          }, file.type, currentQuality);
        };
        
        // Start compression attempts
        tryCompression(quality);
      };
      
      img.onerror = () => {
        console.error('Error loading image for compression');
        reject(new Error('Error loading image for compression'));
      };
      
      // Load image from file reader result
      img.src = readerEvent.target.result;
    };
    
    reader.onerror = () => {
      console.error('Error reading file for compression');
      reject(new Error('Error reading file for compression'));
    };
    
    // Read the file as a data URL
    reader.readAsDataURL(file);
  });
};

/**
 * Format bytes to a human-readable size
 * @param {number} bytes - Size in bytes
 * @param {number} [decimals=2] - Number of decimal places
 * @returns {string} - Formatted size (e.g. "5.2 MB")
 */
export const formatBytes = (bytes, decimals = 2) => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

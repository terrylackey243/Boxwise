/**
 * Async handler middleware to avoid try-catch blocks in route handlers
 * @param {Function} fn - The async function to wrap
 * @returns {Function} - Express middleware function
 */
const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(err => {
    console.error('AsyncHandler Error:', err.stack);
    
    // Add detailed logging for debugging
    console.error('Request path:', req.path);
    console.error('Request method:', req.method);
    console.error('Request body:', JSON.stringify(req.body, null, 2));
    console.error('Request params:', JSON.stringify(req.params, null, 2));
    
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        message: 'Server error - operation failed',
        error: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
      });
    } else {
      next(err);
    }
  });

module.exports = asyncHandler;

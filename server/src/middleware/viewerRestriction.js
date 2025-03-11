/**
 * Middleware to restrict viewer users from modifying data
 * Viewers can only perform GET operations (read-only)
 */
exports.restrictViewers = (req, res, next) => {
  // Allow if user is not a viewer
  if (req.user.role !== 'viewer') {
    return next();
  }

  // Viewers can only perform GET requests
  if (req.method === 'GET') {
    return next();
  }

  // Block all other operations for viewers
  return res.status(403).json({
    success: false,
    message: 'Viewer accounts can only view data and cannot make changes'
  });
};

/**
 * Middleware to hide edit/delete UI elements for viewers
 * Adds a property to res.locals that can be checked in templates
 */
exports.addViewerContext = (req, res, next) => {
  // Add a flag to res.locals for templates to use
  res.locals.isViewer = req.user && req.user.role === 'viewer';
  
  // Continue processing the request
  next();
};

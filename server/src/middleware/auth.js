const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Protect routes
exports.protect = async (req, res, next) => {
  let token;

  // Check if auth header exists and starts with Bearer
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    // Set token from Bearer token in header
    token = req.headers.authorization.split(' ')[1];
  }

  // Make sure token exists
  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Not authorized to access this route'
    });
  }

  try {
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Add user to req object
    req.user = await User.findById(decoded.id);

    // Check if user exists
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'User not found'
      });
    }

    next();
  } catch (err) {
    return res.status(401).json({
      success: false,
      message: 'Not authorized to access this route'
    });
  }
};

// Grant access to specific roles
exports.authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `User role ${req.user.role} is not authorized to access this route`
      });
    }
    next();
  };
};

// Check if user belongs to the same group as the resource
exports.checkGroupAccess = (model) => async (req, res, next) => {
  try {
    const resource = await model.findById(req.params.id);

    if (!resource) {
      return res.status(404).json({
        success: false,
        message: 'Resource not found'
      });
    }

    // Check if user belongs to the same group as the resource
    if (resource.group.toString() !== req.user.group.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to access this resource'
      });
    }

    // Add resource to req object
    req.resource = resource;
    next();
  } catch (err) {
    next(err);
  }
};

// Check subscription limits
exports.checkSubscriptionLimits = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id).populate('group');
    
    // Check if user has reached item limit (for free plan)
    if (req.baseUrl === '/api/items' && req.method === 'POST') {
      // Use the Item model instead of direct DB access
      const Item = require('../models/Item');
      const itemCount = await Item.countDocuments({ group: user.group._id });
      
      if (await user.hasReachedItemLimit(itemCount)) {
        return res.status(403).json({
          success: false,
          message: 'You have reached the maximum number of items allowed on your current plan. Please upgrade to add more items.'
        });
      }
    }
    
    // Check if group has reached member limit (for invites)
    if (req.baseUrl === '/api/groups/invite' && req.method === 'POST') {
      if (user.group.hasReachedMemberLimit()) {
        return res.status(403).json({
          success: false,
          message: 'You have reached the maximum number of members allowed on your current plan. Please upgrade to add more members.'
        });
      }
    }
    
    next();
  } catch (err) {
    next(err);
  }
};

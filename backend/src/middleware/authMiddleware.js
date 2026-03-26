const jwt = require('jsonwebtoken');
const Client = require('../models/Client');
const { ERROR_MESSAGES } = require('../utils/constants');

/**
 * Verify JWT and attach user to req.user.
 * Expects: Authorization: Bearer <token>
 */
const protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      message: ERROR_MESSAGES.UNAUTHENTICATED,
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await Client.findById(decoded.id).select('-__v');
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User belonging to this token no longer exists',
      });
    }

    if (user.status === 'suspended') {
      return res.status(403).json({
        success: false,
        message: 'Your account has been suspended. Please contact support.',
      });
    }

    req.user = user;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, message: 'Token expired. Please log in again.' });
    }
    return res.status(401).json({ success: false, message: 'Invalid token.' });
  }
};

/**
 * Role-based access control middleware.
 * Usage: authorize('admin') or authorize('admin', 'manager')
 *
 * @param {...string} roles - Allowed roles
 */
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: ERROR_MESSAGES.UNAUTHENTICATED });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Role '${req.user.role}' is not authorized to access this resource`,
      });
    }
    next();
  };
};

/**
 * Optional authentication — attaches user to req.user if token present,
 * but does not reject requests without a token.
 */
const optionalAuth = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) return next();

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await Client.findById(decoded.id).select('-__v');
    if (user && user.status !== 'suspended') req.user = user;
  } catch (_) {
    // Silently ignore invalid tokens for optional auth
  }

  next();
};

module.exports = { protect, authorize, optionalAuth };

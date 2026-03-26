const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const Client = require('../models/Client');
const { asyncHandler, AppError } = require('../middleware/errorHandler');
const AuditLog = require('../models/AuditLog');

/**
 * Sign a JWT token for a client.
 */
const signToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });

/**
 * Send token response.
 */
const sendTokenResponse = (user, statusCode, res) => {
  const token = signToken(user._id);
  user.password = undefined;

  res.status(statusCode).json({
    success: true,
    token,
    data: { user },
  });
};

/**
 * @desc    Register a new client
 * @route   POST /api/auth/register
 * @access  Public
 */
exports.register = asyncHandler(async (req, res, next) => {
  const { name, email, phone, password, companyName, gstNumber, address } = req.body;

  const existing = await Client.findOne({ email });
  if (existing) return next(new AppError('An account with this email already exists', 409));

  const salt = await bcrypt.genSalt(12);
  const hashedPassword = await bcrypt.hash(password, salt);

  const client = await Client.create({
    name,
    email,
    phone,
    password: hashedPassword,
    companyName,
    gstNumber,
    address,
    status: 'pending',
    role: 'client',
  });

  await AuditLog.create({
    user: client._id,
    userEmail: client.email,
    action: 'REGISTER',
    resource: 'Client',
    resourceId: client._id,
    ipAddress: req.ip,
    userAgent: req.headers['user-agent'],
  });

  sendTokenResponse(client, 201, res);
});

/**
 * @desc    Login
 * @route   POST /api/auth/login
 * @access  Public
 */
exports.login = asyncHandler(async (req, res, next) => {
  const { email, password } = req.body;

  if (!email || !password) return next(new AppError('Please provide email and password', 400));

  const client = await Client.findOne({ email }).select('+password');
  if (!client) return next(new AppError('Invalid email or password', 401));

  const isMatch = await bcrypt.compare(password, client.password);
  if (!isMatch) return next(new AppError('Invalid email or password', 401));

  if (client.status === 'suspended') {
    return next(new AppError('Account suspended. Please contact support.', 403));
  }

  await AuditLog.create({
    user: client._id,
    userEmail: client.email,
    action: 'LOGIN',
    resource: 'Client',
    resourceId: client._id,
    ipAddress: req.ip,
    userAgent: req.headers['user-agent'],
  });

  sendTokenResponse(client, 200, res);
});

/**
 * @desc    Logout (client-side token invalidation; log the event)
 * @route   POST /api/auth/logout
 * @access  Private
 */
exports.logout = asyncHandler(async (req, res) => {
  await AuditLog.create({
    user: req.user._id,
    userEmail: req.user.email,
    action: 'LOGOUT',
    resource: 'Client',
    resourceId: req.user._id,
    ipAddress: req.ip,
    userAgent: req.headers['user-agent'],
  });

  res.status(200).json({ success: true, message: 'Logged out successfully' });
});

/**
 * @desc    Get current logged-in user
 * @route   GET /api/auth/me
 * @access  Private
 */
exports.getMe = asyncHandler(async (req, res) => {
  const user = await Client.findById(req.user._id);
  res.status(200).json({ success: true, data: user });
});

/**
 * @desc    Update profile
 * @route   PUT /api/auth/profile
 * @access  Private
 */
exports.updateProfile = asyncHandler(async (req, res, next) => {
  const allowedFields = ['name', 'phone', 'companyName', 'gstNumber', 'address'];
  const updates = {};
  allowedFields.forEach((f) => { if (req.body[f] !== undefined) updates[f] = req.body[f]; });

  const before = await Client.findById(req.user._id).lean();
  const updated = await Client.findByIdAndUpdate(req.user._id, updates, {
    new: true,
    runValidators: true,
  });

  if (!updated) return next(new AppError('User not found', 404));

  await AuditLog.create({
    user: req.user._id,
    action: 'UPDATE',
    resource: 'Client',
    resourceId: req.user._id,
    changes: { before, after: updated.toObject() },
    ipAddress: req.ip,
  });

  res.status(200).json({ success: true, data: updated });
});

/**
 * @desc    Change password
 * @route   PUT /api/auth/change-password
 * @access  Private
 */
exports.changePassword = asyncHandler(async (req, res, next) => {
  const { currentPassword, newPassword } = req.body;

  const client = await Client.findById(req.user._id).select('+password');
  if (!client) return next(new AppError('User not found', 404));

  const isMatch = await bcrypt.compare(currentPassword, client.password);
  if (!isMatch) return next(new AppError('Current password is incorrect', 400));

  const salt = await bcrypt.genSalt(12);
  client.password = await bcrypt.hash(newPassword, salt);
  await client.save();

  await AuditLog.create({
    user: req.user._id,
    action: 'UPDATE',
    resource: 'Client',
    resourceId: req.user._id,
    changes: { before: { password: '[REDACTED]' }, after: { password: '[CHANGED]' } },
    ipAddress: req.ip,
  });

  res.status(200).json({ success: true, message: 'Password changed successfully' });
});

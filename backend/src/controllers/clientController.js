const Client = require('../models/Client');
const AuditLog = require('../models/AuditLog');
const { asyncHandler, AppError } = require('../middleware/errorHandler');
const { uploadFile } = require('../utils/s3Helper');
const { PAGINATION } = require('../utils/constants');

/**
 * @desc    Get all clients (with pagination & filters)
 * @route   GET /api/clients
 * @access  Admin
 */
exports.getAllClients = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || PAGINATION.DEFAULT_PAGE;
  const limit = Math.min(parseInt(req.query.limit) || PAGINATION.DEFAULT_LIMIT, PAGINATION.MAX_LIMIT);
  const skip = (page - 1) * limit;

  const filter = {};
  if (req.query.status) filter.status = req.query.status;
  if (req.query.search) {
    filter.$or = [
      { name: new RegExp(req.query.search, 'i') },
      { email: new RegExp(req.query.search, 'i') },
      { companyName: new RegExp(req.query.search, 'i') },
    ];
  }

  const [clients, total] = await Promise.all([
    Client.find(filter).skip(skip).limit(limit).sort({ createdAt: -1 }),
    Client.countDocuments(filter),
  ]);

  res.status(200).json({
    success: true,
    count: clients.length,
    total,
    page,
    pages: Math.ceil(total / limit),
    data: clients,
  });
});

/**
 * @desc    Get single client
 * @route   GET /api/clients/:id
 * @access  Admin or own client
 */
exports.getClientById = asyncHandler(async (req, res, next) => {
  const client = await Client.findById(req.params.id);
  if (!client) return next(new AppError('Client not found', 404));
  res.status(200).json({ success: true, data: client });
});

/**
 * @desc    Create client (admin)
 * @route   POST /api/clients
 * @access  Admin
 */
exports.createClient = asyncHandler(async (req, res, next) => {
  const existing = await Client.findOne({ email: req.body.email });
  if (existing) return next(new AppError('Client with this email already exists', 409));

  const client = await Client.create(req.body);

  await AuditLog.create({
    user: req.user._id,
    action: 'CREATE',
    resource: 'Client',
    resourceId: client._id,
    ipAddress: req.ip,
  });

  res.status(201).json({ success: true, data: client });
});

/**
 * @desc    Update client
 * @route   PUT /api/clients/:id
 * @access  Admin
 */
exports.updateClient = asyncHandler(async (req, res, next) => {
  const before = await Client.findById(req.params.id).lean();
  if (!before) return next(new AppError('Client not found', 404));

  // Prevent email updates via this endpoint to avoid auth issues
  delete req.body.password;
  delete req.body.cognitoId;

  const client = await Client.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });

  await AuditLog.create({
    user: req.user._id,
    action: 'UPDATE',
    resource: 'Client',
    resourceId: client._id,
    changes: { before, after: client.toObject() },
    ipAddress: req.ip,
  });

  res.status(200).json({ success: true, data: client });
});

/**
 * @desc    Delete client (soft delete via status)
 * @route   DELETE /api/clients/:id
 * @access  Admin
 */
exports.deleteClient = asyncHandler(async (req, res, next) => {
  const client = await Client.findById(req.params.id);
  if (!client) return next(new AppError('Client not found', 404));

  client.status = 'suspended';
  await client.save();

  await AuditLog.create({
    user: req.user._id,
    action: 'DELETE',
    resource: 'Client',
    resourceId: client._id,
    ipAddress: req.ip,
  });

  res.status(200).json({ success: true, message: 'Client deactivated successfully' });
});

/**
 * @desc    Update client status
 * @route   PATCH /api/clients/:id/status
 * @access  Admin
 */
exports.updateClientStatus = asyncHandler(async (req, res, next) => {
  const { status } = req.body;
  if (!['pending', 'active', 'suspended'].includes(status)) {
    return next(new AppError('Invalid status value', 400));
  }

  const client = await Client.findByIdAndUpdate(
    req.params.id,
    { status },
    { new: true }
  );
  if (!client) return next(new AppError('Client not found', 404));

  await AuditLog.create({
    user: req.user._id,
    action: 'UPDATE',
    resource: 'Client',
    resourceId: client._id,
    changes: { before: { status: client.status }, after: { status } },
    ipAddress: req.ip,
  });

  res.status(200).json({ success: true, data: client });
});

/**
 * @desc    Get client balance summary
 * @route   GET /api/clients/:id/balance
 * @access  Admin or own client
 */
exports.getClientBalance = asyncHandler(async (req, res, next) => {
  const client = await Client.findById(req.params.id).select('name email creditLimit currentBalance');
  if (!client) return next(new AppError('Client not found', 404));

  const SalesInvoice = require('../models/SalesInvoice');
  const outstanding = await SalesInvoice.aggregate([
    { $match: { client: client._id, paymentStatus: { $in: ['unpaid', 'partial', 'overdue'] } } },
    { $group: { _id: null, totalOutstanding: { $sum: '$balanceAmount' } } },
  ]);

  res.status(200).json({
    success: true,
    data: {
      client: { _id: client._id, name: client.name, email: client.email },
      creditLimit: client.creditLimit,
      currentBalance: client.currentBalance,
      availableCredit: client.creditLimit - client.currentBalance,
      totalOutstanding: outstanding[0]?.totalOutstanding || 0,
    },
  });
});

/**
 * @desc    Upload KYC document for a client
 * @route   POST /api/clients/:id/kyc
 * @access  Admin or own client
 */
exports.uploadKYCDocument = asyncHandler(async (req, res, next) => {
  if (!req.file) return next(new AppError('No file uploaded', 400));

  const { type } = req.body;
  if (!type) return next(new AppError('Document type is required', 400));

  const client = await Client.findById(req.params.id);
  if (!client) return next(new AppError('Client not found', 404));

  const key = `kyc/${client._id}/${type}-${Date.now()}.${req.file.originalname.split('.').pop()}`;
  const url = await uploadFile(req.file.buffer, key, req.file.mimetype);

  client.kycDocuments.push({ type, url, verified: false });
  await client.save();

  res.status(200).json({ success: true, data: client.kycDocuments });
});

const PaymentReceipt = require('../models/PaymentReceipt');
const SalesInvoice = require('../models/SalesInvoice');
const Client = require('../models/Client');
const AuditLog = require('../models/AuditLog');
const { asyncHandler, AppError } = require('../middleware/errorHandler');
const { getNextSequence } = require('../utils/counterHelper');
const { allocatePaymentFIFO } = require('../utils/fifoHelper');
const { PAGINATION } = require('../utils/constants');
const mongoose = require('mongoose');

/**
 * @desc    Get all payment receipts
 * @route   GET /api/payments
 * @access  Admin
 */
exports.getAllPayments = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || PAGINATION.DEFAULT_PAGE;
  const limit = Math.min(parseInt(req.query.limit) || PAGINATION.DEFAULT_LIMIT, PAGINATION.MAX_LIMIT);
  const skip = (page - 1) * limit;

  const filter = {};
  if (req.query.client) filter.client = req.query.client;
  if (req.query.paymentMode) filter.paymentMode = req.query.paymentMode;
  if (req.query.from || req.query.to) {
    filter.paymentDate = {};
    if (req.query.from) filter.paymentDate.$gte = new Date(req.query.from);
    if (req.query.to) filter.paymentDate.$lte = new Date(req.query.to);
  }

  const [payments, total] = await Promise.all([
    PaymentReceipt.find(filter)
      .populate('client', 'name email companyName')
      .skip(skip).limit(limit).sort({ paymentDate: -1 }),
    PaymentReceipt.countDocuments(filter),
  ]);

  res.status(200).json({ success: true, count: payments.length, total, page, pages: Math.ceil(total / limit), data: payments });
});

/**
 * @desc    Get payment by ID
 * @route   GET /api/payments/:id
 * @access  Admin
 */
exports.getPaymentById = asyncHandler(async (req, res, next) => {
  const payment = await PaymentReceipt.findById(req.params.id)
    .populate('client', 'name email companyName')
    .populate('allocations.invoice', 'invoiceNumber totalAmount');

  if (!payment) return next(new AppError('Payment receipt not found', 404));
  res.status(200).json({ success: true, data: payment });
});

/**
 * @desc    Record a payment with FIFO allocation to invoices
 * @route   POST /api/payments
 * @access  Admin
 */
exports.recordPayment = asyncHandler(async (req, res, next) => {
  const { client: clientId, amount, paymentMode, referenceNumber, paymentDate, notes } = req.body;

  const client = await Client.findById(clientId);
  if (!client) return next(new AppError('Client not found', 404));

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const receiptNumber = await getNextSequence('receipt', 'RCP');

    // FIFO allocation
    const { allocations, unallocated } = await allocatePaymentFIFO(clientId, amount, session);

    const receipt = await PaymentReceipt.create(
      [
        {
          receiptNumber,
          client: clientId,
          amount,
          paymentMode,
          referenceNumber,
          paymentDate: paymentDate || new Date(),
          allocations,
          unallocated,
          notes,
          recordedBy: req.user._id,
        },
      ],
      { session }
    );

    // Update client balance
    if (allocations.length > 0) {
      const allocated = amount - unallocated;
      await Client.findByIdAndUpdate(
        clientId,
        { $inc: { currentBalance: -allocated } },
        { session }
      );
    }

    await session.commitTransaction();
    session.endSession();

    await AuditLog.create({
      user: req.user._id,
      action: 'PAYMENT_RECORDED',
      resource: 'PaymentReceipt',
      resourceId: receipt[0]._id,
      resourceNumber: receiptNumber,
      changes: { after: { amount, allocationsCount: allocations.length, unallocated } },
      ipAddress: req.ip,
    });

    const populated = await PaymentReceipt.findById(receipt[0]._id)
      .populate('client', 'name email')
      .populate('allocations.invoice', 'invoiceNumber');

    res.status(201).json({
      success: true,
      data: populated,
      summary: { totalPaid: amount, allocated: amount - unallocated, unallocated },
    });
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    return next(err);
  }
});

/**
 * @desc    Get payments by client
 * @route   GET /api/payments/client/:clientId
 * @access  Admin or own client
 */
exports.getPaymentsByClient = asyncHandler(async (req, res, next) => {
  const clientId = req.params.clientId;

  if (req.user.role === 'client' && req.user._id.toString() !== clientId) {
    return next(new AppError('Not authorized', 403));
  }

  const page = parseInt(req.query.page) || PAGINATION.DEFAULT_PAGE;
  const limit = Math.min(parseInt(req.query.limit) || PAGINATION.DEFAULT_LIMIT, PAGINATION.MAX_LIMIT);

  const [payments, total] = await Promise.all([
    PaymentReceipt.find({ client: clientId })
      .skip((page - 1) * limit).limit(limit).sort({ paymentDate: -1 }),
    PaymentReceipt.countDocuments({ client: clientId }),
  ]);

  res.status(200).json({ success: true, count: payments.length, total, page, pages: Math.ceil(total / limit), data: payments });
});

/**
 * @desc    Get outstanding balance for a client
 * @route   GET /api/payments/outstanding/:clientId
 * @access  Admin or own client
 */
exports.getOutstandingBalance = asyncHandler(async (req, res, next) => {
  const clientId = req.params.clientId;

  if (req.user.role === 'client' && req.user._id.toString() !== clientId) {
    return next(new AppError('Not authorized', 403));
  }

  const [client, invoiceAgg] = await Promise.all([
    Client.findById(clientId).select('name email companyName creditLimit currentBalance'),
    SalesInvoice.aggregate([
      { $match: { client: new mongoose.Types.ObjectId(clientId), paymentStatus: { $in: ['unpaid', 'partial', 'overdue'] } } },
      {
        $group: {
          _id: '$paymentStatus',
          count: { $sum: 1 },
          totalBalance: { $sum: '$balanceAmount' },
        },
      },
    ]),
  ]);

  if (!client) return next(new AppError('Client not found', 404));

  const breakdown = Object.fromEntries(invoiceAgg.map((g) => [g._id, { count: g.count, totalBalance: g.totalBalance }]));
  const totalOutstanding = invoiceAgg.reduce((s, g) => s + g.totalBalance, 0);

  res.status(200).json({
    success: true,
    data: {
      client: { _id: client._id, name: client.name, companyName: client.companyName },
      totalOutstanding,
      breakdown,
      creditLimit: client.creditLimit,
      currentBalance: client.currentBalance,
    },
  });
});

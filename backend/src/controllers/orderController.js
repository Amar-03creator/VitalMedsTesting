const Order = require('../models/Order');
const Client = require('../models/Client');
const AuditLog = require('../models/AuditLog');
const { asyncHandler, AppError } = require('../middleware/errorHandler');
const { getNextSequence } = require('../utils/counterHelper');
const { sendOrderConfirmation } = require('../utils/emailHelper');
const { PAGINATION } = require('../utils/constants');

/**
 * @desc    Get all orders
 * @route   GET /api/orders
 * @access  Admin
 */
exports.getAllOrders = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || PAGINATION.DEFAULT_PAGE;
  const limit = Math.min(parseInt(req.query.limit) || PAGINATION.DEFAULT_LIMIT, PAGINATION.MAX_LIMIT);
  const skip = (page - 1) * limit;

  const filter = {};
  if (req.query.status) filter.status = req.query.status;
  if (req.query.paymentStatus) filter.paymentStatus = req.query.paymentStatus;
  if (req.query.client) filter.client = req.query.client;
  if (req.query.from || req.query.to) {
    filter.createdAt = {};
    if (req.query.from) filter.createdAt.$gte = new Date(req.query.from);
    if (req.query.to) filter.createdAt.$lte = new Date(req.query.to);
  }

  const [orders, total] = await Promise.all([
    Order.find(filter)
      .populate('client', 'name email companyName')
      .populate('inquiry', 'inquiryNumber')
      .skip(skip).limit(limit).sort({ createdAt: -1 }),
    Order.countDocuments(filter),
  ]);

  res.status(200).json({ success: true, count: orders.length, total, page, pages: Math.ceil(total / limit), data: orders });
});

/**
 * @desc    Get order by ID
 * @route   GET /api/orders/:id
 * @access  Private
 */
exports.getOrderById = asyncHandler(async (req, res, next) => {
  const order = await Order.findById(req.params.id)
    .populate('client', 'name email companyName phone gstNumber address')
    .populate('inquiry', 'inquiryNumber')
    .populate('items.product', 'name sku hsn unit')
    .populate('items.batch', 'batchNumber expiryDate mrp');

  if (!order) return next(new AppError('Order not found', 404));

  // Clients can only see their own orders
  if (req.user.role === 'client' && order.client._id.toString() !== req.user._id.toString()) {
    return next(new AppError('Not authorized to view this order', 403));
  }

  res.status(200).json({ success: true, data: order });
});

/**
 * @desc    Create order directly
 * @route   POST /api/orders
 * @access  Admin
 */
exports.createOrder = asyncHandler(async (req, res, next) => {
  const orderNumber = await getNextSequence('order', 'ORD');

  const order = await Order.create({
    ...req.body,
    orderNumber,
    balanceAmount: req.body.totalAmount,
    processedBy: req.user._id,
  });

  // Send confirmation email (non-blocking)
  try {
    const client = await Client.findById(order.client);
    if (client) {
      const populated = await Order.findById(order._id).populate('items.product', 'name');
      await sendOrderConfirmation(populated, client);
    }
  } catch (emailErr) {
    console.error('Order confirmation email failed:', emailErr.message);
  }

  await AuditLog.create({
    user: req.user._id,
    action: 'CREATE',
    resource: 'Order',
    resourceId: order._id,
    resourceNumber: orderNumber,
    ipAddress: req.ip,
  });

  res.status(201).json({ success: true, data: order });
});

/**
 * @desc    Update order
 * @route   PUT /api/orders/:id
 * @access  Admin
 */
exports.updateOrder = asyncHandler(async (req, res, next) => {
  const order = await Order.findById(req.params.id);
  if (!order) return next(new AppError('Order not found', 404));
  if (['delivered', 'cancelled'].includes(order.status)) {
    return next(new AppError(`Cannot update a ${order.status} order`, 400));
  }

  // Prevent changing these via general update
  delete req.body.orderNumber;
  delete req.body.client;

  const updated = await Order.findByIdAndUpdate(req.params.id, req.body, {
    new: true, runValidators: true,
  }).populate('client', 'name email').populate('items.product', 'name sku');

  res.status(200).json({ success: true, data: updated });
});

/**
 * @desc    Update order status
 * @route   PATCH /api/orders/:id/status
 * @access  Admin
 */
exports.updateOrderStatus = asyncHandler(async (req, res, next) => {
  const { status } = req.body;
  const validTransitions = {
    pending: ['processing', 'cancelled'],
    processing: ['shipped', 'cancelled'],
    shipped: ['delivered', 'cancelled'],
    delivered: [],
    cancelled: [],
  };

  const order = await Order.findById(req.params.id);
  if (!order) return next(new AppError('Order not found', 404));

  if (!validTransitions[order.status]?.includes(status)) {
    return next(new AppError(`Cannot transition from '${order.status}' to '${status}'`, 400));
  }

  const before = order.status;
  order.status = status;
  if (status === 'delivered') order.deliveryDate = new Date();
  await order.save();

  await AuditLog.create({
    user: req.user._id,
    action: 'UPDATE',
    resource: 'Order',
    resourceId: order._id,
    resourceNumber: order.orderNumber,
    changes: { before: { status: before }, after: { status } },
    ipAddress: req.ip,
  });

  res.status(200).json({ success: true, data: order });
});

/**
 * @desc    Cancel order
 * @route   PATCH /api/orders/:id/cancel
 * @access  Admin
 */
exports.cancelOrder = asyncHandler(async (req, res, next) => {
  const order = await Order.findById(req.params.id);
  if (!order) return next(new AppError('Order not found', 404));
  if (['delivered', 'cancelled'].includes(order.status)) {
    return next(new AppError(`Order is already ${order.status}`, 400));
  }

  order.status = 'cancelled';
  order.cancelReason = req.body.reason || 'Cancelled by admin';
  await order.save();

  res.status(200).json({ success: true, data: order });
});

/**
 * @desc    Get orders by client
 * @route   GET /api/orders/client/:clientId
 * @access  Admin or own client
 */
exports.getOrdersByClient = asyncHandler(async (req, res, next) => {
  const clientId = req.params.clientId;

  if (req.user.role === 'client' && req.user._id.toString() !== clientId) {
    return next(new AppError('Not authorized', 403));
  }

  const page = parseInt(req.query.page) || PAGINATION.DEFAULT_PAGE;
  const limit = Math.min(parseInt(req.query.limit) || PAGINATION.DEFAULT_LIMIT, PAGINATION.MAX_LIMIT);
  const skip = (page - 1) * limit;

  const filter = { client: clientId };
  if (req.query.status) filter.status = req.query.status;

  const [orders, total] = await Promise.all([
    Order.find(filter).skip(skip).limit(limit).sort({ createdAt: -1 }),
    Order.countDocuments(filter),
  ]);

  res.status(200).json({ success: true, count: orders.length, total, page, pages: Math.ceil(total / limit), data: orders });
});

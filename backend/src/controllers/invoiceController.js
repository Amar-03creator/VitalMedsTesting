const SalesInvoice = require('../models/SalesInvoice');
const Order = require('../models/Order');
const Company = require('../models/Company');
const AuditLog = require('../models/AuditLog');
const { asyncHandler, AppError } = require('../middleware/errorHandler');
const { getNextSequence } = require('../utils/counterHelper');
const { generateInvoicePDF } = require('../utils/pdfGenerator');
const { uploadFile, getSignedUrl, extractKeyFromUrl } = require('../utils/s3Helper');
const { sendInvoiceEmail } = require('../utils/emailHelper');
const { PAGINATION } = require('../utils/constants');

/**
 * @desc    Get all invoices
 * @route   GET /api/invoices
 * @access  Admin
 */
exports.getAllInvoices = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || PAGINATION.DEFAULT_PAGE;
  const limit = Math.min(parseInt(req.query.limit) || PAGINATION.DEFAULT_LIMIT, PAGINATION.MAX_LIMIT);
  const skip = (page - 1) * limit;

  const filter = {};
  if (req.query.paymentStatus) filter.paymentStatus = req.query.paymentStatus;
  if (req.query.client) filter.client = req.query.client;
  if (req.query.from || req.query.to) {
    filter.createdAt = {};
    if (req.query.from) filter.createdAt.$gte = new Date(req.query.from);
    if (req.query.to) filter.createdAt.$lte = new Date(req.query.to);
  }

  const [invoices, total] = await Promise.all([
    SalesInvoice.find(filter)
      .populate('client', 'name email companyName')
      .populate('order', 'orderNumber')
      .skip(skip).limit(limit).sort({ createdAt: -1 }),
    SalesInvoice.countDocuments(filter),
  ]);

  res.status(200).json({ success: true, count: invoices.length, total, page, pages: Math.ceil(total / limit), data: invoices });
});

/**
 * @desc    Get invoice by ID
 * @route   GET /api/invoices/:id
 * @access  Private
 */
exports.getInvoiceById = asyncHandler(async (req, res, next) => {
  const invoice = await SalesInvoice.findById(req.params.id)
    .populate('client', 'name email companyName phone gstNumber address')
    .populate('order', 'orderNumber shippingAddress')
    .populate('items.product', 'name sku hsn unit');

  if (!invoice) return next(new AppError('Invoice not found', 404));

  if (req.user.role === 'client' && invoice.client._id.toString() !== req.user._id.toString()) {
    return next(new AppError('Not authorized to view this invoice', 403));
  }

  res.status(200).json({ success: true, data: invoice });
});

/**
 * @desc    Create invoice from order
 * @route   POST /api/invoices/from-order/:orderId
 * @access  Admin
 */
exports.createInvoice = asyncHandler(async (req, res, next) => {
  const order = await Order.findById(req.params.orderId)
    .populate('client')
    .populate('items.product', 'name sku hsn');

  if (!order) return next(new AppError('Order not found', 404));

  const existing = await SalesInvoice.findOne({ order: order._id });
  if (existing) return next(new AppError('Invoice already exists for this order', 409));

  const invoiceNumber = await getNextSequence('invoice', 'INV');
  const dueDays = parseInt(req.body.dueDays) || 30;
  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + dueDays);

  // Denormalize product names and batch numbers for PDF resilience
  const items = order.items.map((item) => ({
    product: item.product._id,
    productName: item.product.name,
    batch: item.batch,
    qty: item.qty,
    unitPrice: item.unitPrice,
    discount: item.discount,
    gstRate: item.gstRate,
    cgst: item.cgst,
    sgst: item.sgst,
    igst: item.igst,
    amount: item.amount,
    hsnCode: item.product.hsn || item.hsnCode,
  }));

  const invoice = await SalesInvoice.create({
    invoiceNumber,
    order: order._id,
    client: order.client._id,
    items,
    subtotal: order.subtotal,
    discountAmount: order.discountAmount,
    totalCgst: order.totalCgst,
    totalSgst: order.totalSgst,
    totalIgst: order.totalIgst,
    totalGst: order.totalGst,
    totalAmount: order.totalAmount,
    balanceAmount: order.totalAmount - order.paidAmount,
    paidAmount: order.paidAmount,
    paymentStatus: order.paymentStatus,
    dueDate,
    isInterState: order.isInterState,
  });

  await AuditLog.create({
    user: req.user._id,
    action: 'CREATE',
    resource: 'SalesInvoice',
    resourceId: invoice._id,
    resourceNumber: invoiceNumber,
    ipAddress: req.ip,
  });

  res.status(201).json({ success: true, data: invoice });
});

/**
 * @desc    Generate and upload invoice PDF to S3
 * @route   POST /api/invoices/:id/pdf
 * @access  Admin
 */
exports.generatePDF = asyncHandler(async (req, res, next) => {
  const invoice = await SalesInvoice.findById(req.params.id)
    .populate('client', 'name email companyName phone gstNumber address')
    .populate('order', 'orderNumber')
    .populate('items.product', 'name sku hsn');

  if (!invoice) return next(new AppError('Invoice not found', 404));

  const company = await Company.findOne();
  const pdfBuffer = await generateInvoicePDF(invoice, company || {});

  const key = `invoices/${invoice._id}-${Date.now()}.pdf`;
  const pdfUrl = await uploadFile(pdfBuffer, key, 'application/pdf');

  invoice.pdfUrl = pdfUrl;
  await invoice.save();

  res.status(200).json({ success: true, data: { pdfUrl } });
});

/**
 * @desc    Send invoice via email
 * @route   POST /api/invoices/:id/send-email
 * @access  Admin
 */
exports.sendInvoiceEmailHandler = asyncHandler(async (req, res, next) => {
  const invoice = await SalesInvoice.findById(req.params.id)
    .populate('client', 'name email')
    .populate('order', 'orderNumber');

  if (!invoice) return next(new AppError('Invoice not found', 404));

  let pdfUrl = invoice.pdfUrl;
  if (pdfUrl) {
    // Get a fresh pre-signed URL for secure download link in email
    try {
      pdfUrl = await getSignedUrl(extractKeyFromUrl(invoice.pdfUrl), 86400);
    } catch (_) {
      pdfUrl = invoice.pdfUrl;
    }
  }

  await sendInvoiceEmail(invoice, invoice.client, pdfUrl);

  await AuditLog.create({
    user: req.user._id,
    action: 'EMAIL_SENT',
    resource: 'SalesInvoice',
    resourceId: invoice._id,
    resourceNumber: invoice.invoiceNumber,
    ipAddress: req.ip,
  });

  res.status(200).json({ success: true, message: 'Invoice email sent successfully' });
});

/**
 * @desc    Get invoices by client
 * @route   GET /api/invoices/client/:clientId
 * @access  Admin or own client
 */
exports.getInvoicesByClient = asyncHandler(async (req, res, next) => {
  const clientId = req.params.clientId;

  if (req.user.role === 'client' && req.user._id.toString() !== clientId) {
    return next(new AppError('Not authorized', 403));
  }

  const page = parseInt(req.query.page) || PAGINATION.DEFAULT_PAGE;
  const limit = Math.min(parseInt(req.query.limit) || PAGINATION.DEFAULT_LIMIT, PAGINATION.MAX_LIMIT);

  const [invoices, total] = await Promise.all([
    SalesInvoice.find({ client: clientId })
      .populate('order', 'orderNumber')
      .skip((page - 1) * limit).limit(limit).sort({ createdAt: -1 }),
    SalesInvoice.countDocuments({ client: clientId }),
  ]);

  res.status(200).json({ success: true, count: invoices.length, total, page, pages: Math.ceil(total / limit), data: invoices });
});

/**
 * @desc    Get overdue invoices
 * @route   GET /api/invoices/overdue
 * @access  Admin
 */
exports.getOverdueInvoices = asyncHandler(async (req, res) => {
  const invoices = await SalesInvoice.find({
    dueDate: { $lt: new Date() },
    paymentStatus: { $in: ['unpaid', 'partial'] },
  })
    .populate('client', 'name email companyName phone')
    .sort({ dueDate: 1 });

  const totalOverdue = invoices.reduce((s, i) => s + i.balanceAmount, 0);

  res.status(200).json({
    success: true,
    count: invoices.length,
    totalOverdue,
    data: invoices,
  });
});

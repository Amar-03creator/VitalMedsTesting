const Inquiry = require('../models/Inquiry');
const Order = require('../models/Order');
const AuditLog = require('../models/AuditLog');
const { asyncHandler, AppError } = require('../middleware/errorHandler');
const { getNextSequence } = require('../utils/counterHelper');
const { generateQuotePDF } = require('../utils/pdfGenerator');
const { uploadFile } = require('../utils/s3Helper');
const { PAGINATION } = require('../utils/constants');
const Company = require('../models/Company');

/**
 * @desc    Get all inquiries
 * @route   GET /api/inquiries
 * @access  Admin
 */
exports.getAllInquiries = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || PAGINATION.DEFAULT_PAGE;
  const limit = Math.min(parseInt(req.query.limit) || PAGINATION.DEFAULT_LIMIT, PAGINATION.MAX_LIMIT);
  const skip = (page - 1) * limit;

  const filter = {};
  if (req.query.status) filter.status = req.query.status;
  if (req.query.client) filter.client = req.query.client;

  const [inquiries, total] = await Promise.all([
    Inquiry.find(filter)
      .populate('client', 'name email companyName')
      .populate('items.product', 'name sku')
      .skip(skip).limit(limit).sort({ createdAt: -1 }),
    Inquiry.countDocuments(filter),
  ]);

  res.status(200).json({ success: true, count: inquiries.length, total, page, pages: Math.ceil(total / limit), data: inquiries });
});

/**
 * @desc    Get inquiry by ID
 * @route   GET /api/inquiries/:id
 * @access  Private
 */
exports.getInquiryById = asyncHandler(async (req, res, next) => {
  const inquiry = await Inquiry.findById(req.params.id)
    .populate('client', 'name email companyName phone gstNumber')
    .populate('items.product', 'name sku unit gstRate hsn')
    .populate('quoteItems.product', 'name sku unit')
    .populate('quoteItems.batch', 'batchNumber expiryDate')
    .populate('convertedOrder', 'orderNumber status');

  if (!inquiry) return next(new AppError('Inquiry not found', 404));
  res.status(200).json({ success: true, data: inquiry });
});

/**
 * @desc    Create inquiry
 * @route   POST /api/inquiries
 * @access  Private (client or admin)
 */
exports.createInquiry = asyncHandler(async (req, res) => {
  const inquiryNumber = await getNextSequence('inquiry', 'INQ');

  const clientId = req.user.role === 'admin' ? req.body.client : req.user._id;

  const inquiry = await Inquiry.create({
    ...req.body,
    client: clientId,
    inquiryNumber,
    status: 'pending',
  });

  await AuditLog.create({
    user: req.user._id,
    action: 'CREATE',
    resource: 'Inquiry',
    resourceId: inquiry._id,
    resourceNumber: inquiryNumber,
    ipAddress: req.ip,
  });

  const populated = await Inquiry.findById(inquiry._id)
    .populate('client', 'name email')
    .populate('items.product', 'name sku');

  res.status(201).json({ success: true, data: populated });
});

/**
 * @desc    Update inquiry
 * @route   PUT /api/inquiries/:id
 * @access  Admin
 */
exports.updateInquiry = asyncHandler(async (req, res, next) => {
  const inquiry = await Inquiry.findById(req.params.id);
  if (!inquiry) return next(new AppError('Inquiry not found', 404));
  if (['converted', 'rejected'].includes(inquiry.status)) {
    return next(new AppError(`Cannot update a ${inquiry.status} inquiry`, 400));
  }

  const updated = await Inquiry.findByIdAndUpdate(req.params.id, req.body, {
    new: true, runValidators: true,
  }).populate('client', 'name email').populate('items.product', 'name sku');

  res.status(200).json({ success: true, data: updated });
});

/**
 * @desc    Create quote from inquiry
 * @route   POST /api/inquiries/:id/quote
 * @access  Admin
 */
exports.createQuote = asyncHandler(async (req, res, next) => {
  const inquiry = await Inquiry.findById(req.params.id).populate('client');
  if (!inquiry) return next(new AppError('Inquiry not found', 404));
  if (inquiry.status === 'converted') return next(new AppError('Inquiry already converted to order', 400));
  if (inquiry.status === 'rejected') return next(new AppError('Cannot quote a rejected inquiry', 400));

  const { quoteItems, quoteValidTill, notes } = req.body;

  inquiry.quoteItems = quoteItems;
  inquiry.quoteValidTill = quoteValidTill;
  inquiry.notes = notes || inquiry.notes;
  inquiry.status = 'quoted';
  inquiry.quotedBy = req.user._id;
  inquiry.quotedAt = new Date();

  await inquiry.save();

  // Generate PDF
  try {
    const company = await Company.findOne();
    const populated = await Inquiry.findById(inquiry._id)
      .populate('client', 'name email companyName gstNumber phone')
      .populate('quoteItems.product', 'name sku hsn');

    const pdfBuffer = await generateQuotePDF(populated, company || {});
    const key = `quotes/${inquiry._id}-${Date.now()}.pdf`;
    const pdfUrl = await uploadFile(pdfBuffer, key, 'application/pdf');
    inquiry.quotePdfUrl = pdfUrl;
    await inquiry.save();
  } catch (pdfErr) {
    console.error('Quote PDF generation failed:', pdfErr.message);
  }

  await AuditLog.create({
    user: req.user._id,
    action: 'UPDATE',
    resource: 'Inquiry',
    resourceId: inquiry._id,
    resourceNumber: inquiry.inquiryNumber,
    changes: { before: { status: 'pending' }, after: { status: 'quoted' } },
    ipAddress: req.ip,
  });

  res.status(200).json({ success: true, data: inquiry });
});

/**
 * @desc    Convert quoted inquiry to order
 * @route   POST /api/inquiries/:id/convert
 * @access  Admin
 */
exports.convertToOrder = asyncHandler(async (req, res, next) => {
  const inquiry = await Inquiry.findById(req.params.id).populate('client');
  if (!inquiry) return next(new AppError('Inquiry not found', 404));
  if (inquiry.status !== 'quoted') return next(new AppError('Only quoted inquiries can be converted to orders', 400));
  if (inquiry.quoteValidTill && inquiry.quoteValidTill < new Date()) {
    return next(new AppError('Quote has expired. Please create a new quote.', 400));
  }

  const orderNumber = await getNextSequence('order', 'ORD');
  const isInterState = req.body.isInterState || false;

  // Calculate totals from quoteItems
  let subtotal = 0, totalCgst = 0, totalSgst = 0, totalIgst = 0, discountAmount = 0;

  const orderItems = inquiry.quoteItems.map((qi) => {
    const baseAmount = qi.qty * qi.unitPrice;
    const discAmt = baseAmount * (qi.discount / 100);
    const taxable = baseAmount - discAmt;
    const gstAmt = taxable * (qi.gstRate / 100);
    const cgst = isInterState ? 0 : gstAmt / 2;
    const sgst = isInterState ? 0 : gstAmt / 2;
    const igst = isInterState ? gstAmt : 0;

    subtotal += taxable;
    discountAmount += discAmt;
    totalCgst += cgst;
    totalSgst += sgst;
    totalIgst += igst;

    return {
      product: qi.product,
      batch: qi.batch,
      qty: qi.qty,
      unitPrice: qi.unitPrice,
      discount: qi.discount,
      gstRate: qi.gstRate,
      cgst,
      sgst,
      igst,
      amount: taxable + gstAmt,
    };
  });

  const totalGst = totalCgst + totalSgst + totalIgst;
  const totalAmount = subtotal + totalGst;

  const order = await Order.create({
    orderNumber,
    client: inquiry.client._id,
    inquiry: inquiry._id,
    items: orderItems,
    subtotal,
    discountAmount,
    totalCgst,
    totalSgst,
    totalIgst,
    totalGst,
    totalAmount,
    balanceAmount: totalAmount,
    status: 'pending',
    paymentStatus: 'unpaid',
    isInterState,
    shippingAddress: req.body.shippingAddress,
    notes: req.body.notes,
    processedBy: req.user._id,
  });

  inquiry.status = 'converted';
  inquiry.convertedOrder = order._id;
  await inquiry.save();

  await AuditLog.create({
    user: req.user._id,
    action: 'CREATE',
    resource: 'Order',
    resourceId: order._id,
    resourceNumber: orderNumber,
    changes: { before: { inquiryStatus: 'quoted' }, after: { inquiryStatus: 'converted', orderNumber } },
    ipAddress: req.ip,
  });

  res.status(201).json({ success: true, data: { inquiry, order } });
});

/**
 * @desc    Reject an inquiry
 * @route   PATCH /api/inquiries/:id/reject
 * @access  Admin
 */
exports.rejectInquiry = asyncHandler(async (req, res, next) => {
  const inquiry = await Inquiry.findById(req.params.id);
  if (!inquiry) return next(new AppError('Inquiry not found', 404));
  if (inquiry.status === 'converted') return next(new AppError('Cannot reject a converted inquiry', 400));

  inquiry.status = 'rejected';
  inquiry.rejectionReason = req.body.reason || 'No reason provided';
  await inquiry.save();

  res.status(200).json({ success: true, data: inquiry });
});

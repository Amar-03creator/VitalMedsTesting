const Batch = require('../models/Batch');
const Product = require('../models/Product');
const AuditLog = require('../models/AuditLog');
const { asyncHandler, AppError } = require('../middleware/errorHandler');
const { deductFIFO, checkStockAvailability } = require('../utils/fifoHelper');
const { PAGINATION } = require('../utils/constants');
const mongoose = require('mongoose');

/**
 * @desc    Get stock summary with FIFO batch details per product
 * @route   GET /api/fifo/stock-summary
 * @access  Admin
 */
exports.getStockSummary = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || PAGINATION.DEFAULT_PAGE;
  const limit = Math.min(parseInt(req.query.limit) || 50, 100);
  const skip = (page - 1) * limit;

  const today = new Date();

  const products = await Product.find({ isActive: true }).skip(skip).limit(limit).lean();
  const total = await Product.countDocuments({ isActive: true });

  const productIds = products.map((p) => p._id);

  const batches = await Batch.find({
    product: { $in: productIds },
    isActive: true,
  }).sort({ expiryDate: 1 }).lean();

  // Group batches by product
  const batchMap = {};
  batches.forEach((b) => {
    const pid = b.product.toString();
    if (!batchMap[pid]) batchMap[pid] = [];
    batchMap[pid].push(b);
  });

  const summary = products.map((p) => {
    const pBatches = batchMap[p._id.toString()] || [];
    const activeBatches = pBatches.filter((b) => !b.isExpired && b.expiryDate > today);
    const totalStock = activeBatches.reduce((s, b) => s + b.availableQty, 0);
    const expiredStock = pBatches.filter((b) => b.isExpired || b.expiryDate <= today)
      .reduce((s, b) => s + b.availableQty, 0);

    return {
      product: { _id: p._id, name: p.name, sku: p.sku, category: p.category, reorderPoint: p.reorderPoint },
      totalStock,
      expiredStock,
      isLowStock: totalStock <= p.reorderPoint,
      batchCount: activeBatches.length,
      batches: activeBatches.map((b) => ({
        batchId: b._id,
        batchNumber: b.batchNumber,
        availableQty: b.availableQty,
        expiryDate: b.expiryDate,
        sellingPrice: b.sellingPrice,
        mrp: b.mrp,
        isExpiringSoon: b.expiryDate <= new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000),
      })),
    };
  });

  res.status(200).json({ success: true, count: products.length, total, page, pages: Math.ceil(total / limit), data: summary });
});

/**
 * @desc    Manual stock deduction (adjustments/wastage)
 * @route   POST /api/fifo/deduct
 * @access  Admin
 */
exports.deductStock = asyncHandler(async (req, res, next) => {
  const { productId, quantity, reason } = req.body;

  if (!productId || !quantity || quantity <= 0) {
    return next(new AppError('productId and quantity (>0) are required', 400));
  }

  const product = await Product.findById(productId);
  if (!product) return next(new AppError('Product not found', 404));

  const { available, totalQty } = await checkStockAvailability(productId, quantity);
  if (!available) {
    return next(new AppError(`Insufficient stock. Available: ${totalQty}, Requested: ${quantity}`, 400));
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const deductions = await deductFIFO(productId, quantity, session);
    await session.commitTransaction();
    session.endSession();

    await AuditLog.create({
      user: req.user._id,
      action: 'STOCK_DEDUCTED',
      resource: 'Batch',
      resourceId: new mongoose.Types.ObjectId(productId),
      changes: { after: { productId, quantity, reason, deductions } },
      ipAddress: req.ip,
    });

    res.status(200).json({
      success: true,
      message: `${quantity} units deducted from ${deductions.length} batch(es)`,
      data: { productId, productName: product.name, deductions },
    });
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    return next(err);
  }
});

/**
 * @desc    Get stock movement history (audit logs for STOCK_DEDUCTED)
 * @route   GET /api/fifo/movement
 * @access  Admin
 */
exports.getStockMovement = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || PAGINATION.DEFAULT_PAGE;
  const limit = Math.min(parseInt(req.query.limit) || PAGINATION.DEFAULT_LIMIT, PAGINATION.MAX_LIMIT);
  const skip = (page - 1) * limit;

  const filter = { action: 'STOCK_DEDUCTED' };
  if (req.query.productId) filter.resourceId = new mongoose.Types.ObjectId(req.query.productId);
  if (req.query.from || req.query.to) {
    filter.createdAt = {};
    if (req.query.from) filter.createdAt.$gte = new Date(req.query.from);
    if (req.query.to) filter.createdAt.$lte = new Date(req.query.to);
  }

  const [movements, total] = await Promise.all([
    AuditLog.find(filter)
      .populate('user', 'name email')
      .skip(skip).limit(limit).sort({ createdAt: -1 }),
    AuditLog.countDocuments(filter),
  ]);

  res.status(200).json({ success: true, count: movements.length, total, page, pages: Math.ceil(total / limit), data: movements });
});

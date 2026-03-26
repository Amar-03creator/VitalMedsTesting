const Product = require('../models/Product');
const Batch = require('../models/Batch');
const AuditLog = require('../models/AuditLog');
const { asyncHandler, AppError } = require('../middleware/errorHandler');
const { PAGINATION } = require('../utils/constants');

/**
 * @desc    Get all products
 * @route   GET /api/products
 * @access  Private
 */
exports.getAllProducts = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || PAGINATION.DEFAULT_PAGE;
  const limit = Math.min(parseInt(req.query.limit) || PAGINATION.DEFAULT_LIMIT, PAGINATION.MAX_LIMIT);
  const skip = (page - 1) * limit;

  const filter = {};
  if (req.query.isActive !== undefined) filter.isActive = req.query.isActive === 'true';
  if (req.query.category) filter.category = req.query.category;
  if (req.query.search) {
    filter.$or = [
      { name: new RegExp(req.query.search, 'i') },
      { sku: new RegExp(req.query.search, 'i') },
      { manufacturer: new RegExp(req.query.search, 'i') },
    ];
  }

  const [products, total] = await Promise.all([
    Product.find(filter).skip(skip).limit(limit).sort({ name: 1 }),
    Product.countDocuments(filter),
  ]);

  // Attach stock totals
  const productIds = products.map((p) => p._id);
  const stockAgg = await Batch.aggregate([
    { $match: { product: { $in: productIds }, isActive: true, isExpired: false, expiryDate: { $gt: new Date() } } },
    { $group: { _id: '$product', totalStock: { $sum: '$availableQty' } } },
  ]);
  const stockMap = Object.fromEntries(stockAgg.map((s) => [s._id.toString(), s.totalStock]));

  const productsWithStock = products.map((p) => ({
    ...p.toObject(),
    totalStock: stockMap[p._id.toString()] || 0,
  }));

  res.status(200).json({
    success: true,
    count: products.length,
    total,
    page,
    pages: Math.ceil(total / limit),
    data: productsWithStock,
  });
});

/**
 * @desc    Get product by ID with batch info
 * @route   GET /api/products/:id
 * @access  Private
 */
exports.getProductById = asyncHandler(async (req, res, next) => {
  const product = await Product.findById(req.params.id);
  if (!product) return next(new AppError('Product not found', 404));

  const batches = await Batch.find({
    product: product._id,
    isActive: true,
    isExpired: false,
    expiryDate: { $gt: new Date() },
  }).sort({ expiryDate: 1 });

  const totalStock = batches.reduce((s, b) => s + b.availableQty, 0);

  res.status(200).json({
    success: true,
    data: { ...product.toObject(), totalStock, batches },
  });
});

/**
 * @desc    Create product
 * @route   POST /api/products
 * @access  Admin
 */
exports.createProduct = asyncHandler(async (req, res, next) => {
  const existing = await Product.findOne({ sku: req.body.sku.toUpperCase() });
  if (existing) return next(new AppError(`Product with SKU '${req.body.sku}' already exists`, 409));

  const product = await Product.create(req.body);

  await AuditLog.create({
    user: req.user._id,
    action: 'CREATE',
    resource: 'Product',
    resourceId: product._id,
    ipAddress: req.ip,
  });

  res.status(201).json({ success: true, data: product });
});

/**
 * @desc    Update product
 * @route   PUT /api/products/:id
 * @access  Admin
 */
exports.updateProduct = asyncHandler(async (req, res, next) => {
  const before = await Product.findById(req.params.id).lean();
  if (!before) return next(new AppError('Product not found', 404));

  const product = await Product.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });

  await AuditLog.create({
    user: req.user._id,
    action: 'UPDATE',
    resource: 'Product',
    resourceId: product._id,
    changes: { before, after: product.toObject() },
    ipAddress: req.ip,
  });

  res.status(200).json({ success: true, data: product });
});

/**
 * @desc    Delete product (soft delete)
 * @route   DELETE /api/products/:id
 * @access  Admin
 */
exports.deleteProduct = asyncHandler(async (req, res, next) => {
  const product = await Product.findById(req.params.id);
  if (!product) return next(new AppError('Product not found', 404));

  product.isActive = false;
  await product.save();

  res.status(200).json({ success: true, message: 'Product deactivated successfully' });
});

/**
 * @desc    Get all batches for a product
 * @route   GET /api/products/:id/batches
 * @access  Private
 */
exports.getBatches = asyncHandler(async (req, res, next) => {
  const product = await Product.findById(req.params.id);
  if (!product) return next(new AppError('Product not found', 404));

  const filter = { product: req.params.id };
  if (req.query.active === 'true') {
    filter.isActive = true;
    filter.isExpired = false;
    filter.expiryDate = { $gt: new Date() };
  }

  const batches = await Batch.find(filter).sort({ expiryDate: 1 });
  res.status(200).json({ success: true, count: batches.length, data: batches });
});

/**
 * @desc    Add batch to product
 * @route   POST /api/products/:id/batches
 * @access  Admin
 */
exports.addBatch = asyncHandler(async (req, res, next) => {
  const product = await Product.findById(req.params.id);
  if (!product) return next(new AppError('Product not found', 404));

  const batch = await Batch.create({
    ...req.body,
    product: req.params.id,
    availableQty: req.body.quantity,
  });

  await AuditLog.create({
    user: req.user._id,
    action: 'CREATE',
    resource: 'Batch',
    resourceId: batch._id,
    ipAddress: req.ip,
  });

  res.status(201).json({ success: true, data: batch });
});

/**
 * @desc    Update a batch
 * @route   PUT /api/products/:id/batches/:batchId
 * @access  Admin
 */
exports.updateBatch = asyncHandler(async (req, res, next) => {
  const batch = await Batch.findOne({
    _id: req.params.batchId,
    product: req.params.id,
  });
  if (!batch) return next(new AppError('Batch not found', 404));

  const allowed = ['sellingPrice', 'mrp', 'location', 'isActive'];
  allowed.forEach((f) => { if (req.body[f] !== undefined) batch[f] = req.body[f]; });
  await batch.save();

  res.status(200).json({ success: true, data: batch });
});

/**
 * @desc    Get products with low stock
 * @route   GET /api/products/low-stock
 * @access  Admin
 */
exports.getLowStockProducts = asyncHandler(async (req, res) => {
  const products = await Product.find({ isActive: true });

  const stockAgg = await Batch.aggregate([
    { $match: { isActive: true, isExpired: false, expiryDate: { $gt: new Date() } } },
    { $group: { _id: '$product', totalStock: { $sum: '$availableQty' } } },
  ]);
  const stockMap = Object.fromEntries(stockAgg.map((s) => [s._id.toString(), s.totalStock]));

  const lowStock = products
    .map((p) => ({ ...p.toObject(), totalStock: stockMap[p._id.toString()] || 0 }))
    .filter((p) => p.totalStock <= p.reorderPoint);

  res.status(200).json({ success: true, count: lowStock.length, data: lowStock });
});

/**
 * @desc    Get batches expiring within N days
 * @route   GET /api/products/expiring-batches
 * @access  Admin
 */
exports.getExpiringBatches = asyncHandler(async (req, res) => {
  const days = parseInt(req.query.days) || 30;
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() + days);

  const batches = await Batch.find({
    isActive: true,
    isExpired: false,
    availableQty: { $gt: 0 },
    expiryDate: { $gt: new Date(), $lte: cutoff },
  })
    .populate('product', 'name sku manufacturer')
    .sort({ expiryDate: 1 });

  res.status(200).json({ success: true, count: batches.length, data: batches });
});

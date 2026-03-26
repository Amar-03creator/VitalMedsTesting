const Order = require('../models/Order');
const SalesInvoice = require('../models/SalesInvoice');
const PaymentReceipt = require('../models/PaymentReceipt');
const Product = require('../models/Product');
const Batch = require('../models/Batch');
const { asyncHandler, AppError } = require('../middleware/errorHandler');
const mongoose = require('mongoose');

/**
 * @desc    Sales report for a date range
 * @route   GET /api/reports/sales
 * @access  Admin
 */
exports.getSalesReport = asyncHandler(async (req, res) => {
  const { from, to } = req.query;
  const dateFilter = {};
  if (from) dateFilter.$gte = new Date(from);
  if (to) dateFilter.$lte = new Date(to);

  const matchStage = {};
  if (Object.keys(dateFilter).length) matchStage.createdAt = dateFilter;
  matchStage.status = { $nin: ['cancelled'] };

  const [summary, byClient, byProduct] = await Promise.all([
    Order.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: null,
          totalOrders: { $sum: 1 },
          totalRevenue: { $sum: '$totalAmount' },
          totalGst: { $sum: '$totalGst' },
          avgOrderValue: { $avg: '$totalAmount' },
        },
      },
    ]),
    Order.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: '$client',
          orderCount: { $sum: 1 },
          revenue: { $sum: '$totalAmount' },
        },
      },
      { $sort: { revenue: -1 } },
      { $limit: 10 },
      {
        $lookup: {
          from: 'clients',
          localField: '_id',
          foreignField: '_id',
          as: 'clientInfo',
        },
      },
      { $unwind: '$clientInfo' },
      {
        $project: {
          clientName: '$clientInfo.name',
          companyName: '$clientInfo.companyName',
          orderCount: 1,
          revenue: 1,
        },
      },
    ]),
    Order.aggregate([
      { $match: matchStage },
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.product',
          totalQty: { $sum: '$items.qty' },
          totalRevenue: { $sum: '$items.amount' },
        },
      },
      { $sort: { totalRevenue: -1 } },
      { $limit: 10 },
      {
        $lookup: {
          from: 'products',
          localField: '_id',
          foreignField: '_id',
          as: 'productInfo',
        },
      },
      { $unwind: '$productInfo' },
      {
        $project: {
          productName: '$productInfo.name',
          sku: '$productInfo.sku',
          totalQty: 1,
          totalRevenue: 1,
        },
      },
    ]),
  ]);

  res.status(200).json({
    success: true,
    data: {
      summary: summary[0] || { totalOrders: 0, totalRevenue: 0, totalGst: 0, avgOrderValue: 0 },
      topClients: byClient,
      topProducts: byProduct,
    },
  });
});

/**
 * @desc    GST summary for a given month/year
 * @route   GET /api/reports/gst
 * @access  Admin
 */
exports.getGSTSummary = asyncHandler(async (req, res) => {
  const month = parseInt(req.query.month) || new Date().getMonth() + 1;
  const year = parseInt(req.query.year) || new Date().getFullYear();

  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0, 23, 59, 59);

  const invoices = await SalesInvoice.aggregate([
    { $match: { createdAt: { $gte: startDate, $lte: endDate } } },
    {
      $group: {
        _id: null,
        totalCgst: { $sum: '$totalCgst' },
        totalSgst: { $sum: '$totalSgst' },
        totalIgst: { $sum: '$totalIgst' },
        totalGst: { $sum: '$totalGst' },
        taxableAmount: { $sum: '$subtotal' },
        totalInvoiceValue: { $sum: '$totalAmount' },
        invoiceCount: { $sum: 1 },
      },
    },
  ]);

  // GST breakdown by rate
  const byRate = await SalesInvoice.aggregate([
    { $match: { createdAt: { $gte: startDate, $lte: endDate } } },
    { $unwind: '$items' },
    {
      $group: {
        _id: '$items.gstRate',
        taxable: { $sum: { $subtract: ['$items.amount', { $add: ['$items.cgst', '$items.sgst', '$items.igst'] }] } },
        cgst: { $sum: '$items.cgst' },
        sgst: { $sum: '$items.sgst' },
        igst: { $sum: '$items.igst' },
        total: { $sum: '$items.amount' },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  res.status(200).json({
    success: true,
    data: {
      period: { month, year, from: startDate, to: endDate },
      summary: invoices[0] || { totalCgst: 0, totalSgst: 0, totalIgst: 0, totalGst: 0 },
      byRate,
    },
  });
});

/**
 * @desc    Inventory report
 * @route   GET /api/reports/inventory
 * @access  Admin
 */
exports.getInventoryReport = asyncHandler(async (req, res) => {
  const today = new Date();
  const thirtyDays = new Date();
  thirtyDays.setDate(thirtyDays.getDate() + 30);

  const [stockSummary, lowStock, expiringSoon, expiredBatches] = await Promise.all([
    Batch.aggregate([
      { $match: { isActive: true } },
      {
        $group: {
          _id: '$product',
          totalQty: { $sum: '$quantity' },
          availableQty: { $sum: '$availableQty' },
          batchCount: { $sum: 1 },
        },
      },
      {
        $lookup: { from: 'products', localField: '_id', foreignField: '_id', as: 'product' },
      },
      { $unwind: '$product' },
      { $match: { 'product.isActive': true } },
      {
        $project: {
          productName: '$product.name',
          sku: '$product.sku',
          category: '$product.category',
          reorderPoint: '$product.reorderPoint',
          totalQty: 1,
          availableQty: 1,
          batchCount: 1,
          isLowStock: { $lte: ['$availableQty', '$product.reorderPoint'] },
        },
      },
    ]),
    Product.aggregate([
      { $match: { isActive: true } },
      {
        $lookup: {
          from: 'batches',
          let: { pid: '$_id' },
          pipeline: [
            { $match: { $expr: { $eq: ['$product', '$$pid'] }, isActive: true, isExpired: false, expiryDate: { $gt: today } } },
            { $group: { _id: null, total: { $sum: '$availableQty' } } },
          ],
          as: 'stock',
        },
      },
      { $addFields: { totalStock: { $ifNull: [{ $arrayElemAt: ['$stock.total', 0] }, 0] } } },
      { $match: { $expr: { $lte: ['$totalStock', '$reorderPoint'] } } },
      { $project: { name: 1, sku: 1, reorderPoint: 1, reorderQty: 1, totalStock: 1 } },
    ]),
    Batch.find({
      isActive: true,
      isExpired: false,
      availableQty: { $gt: 0 },
      expiryDate: { $gt: today, $lte: thirtyDays },
    }).populate('product', 'name sku').sort({ expiryDate: 1 }),
    Batch.find({
      isExpired: true,
      availableQty: { $gt: 0 },
    }).populate('product', 'name sku').sort({ expiryDate: -1 }).limit(50),
  ]);

  res.status(200).json({
    success: true,
    data: {
      stockSummary,
      lowStockCount: lowStock.length,
      lowStock,
      expiringSoon: expiringSoon.map((b) => ({
        batchId: b._id,
        batchNumber: b.batchNumber,
        productName: b.product?.name,
        sku: b.product?.sku,
        availableQty: b.availableQty,
        expiryDate: b.expiryDate,
      })),
      expiredWithStock: expiredBatches.map((b) => ({
        batchId: b._id,
        batchNumber: b.batchNumber,
        productName: b.product?.name,
        availableQty: b.availableQty,
        expiryDate: b.expiryDate,
      })),
    },
  });
});

/**
 * @desc    Payment collection report
 * @route   GET /api/reports/payments
 * @access  Admin
 */
exports.getPaymentReport = asyncHandler(async (req, res) => {
  const { from, to } = req.query;
  const dateFilter = {};
  if (from) dateFilter.$gte = new Date(from);
  if (to) dateFilter.$lte = new Date(to);

  const matchStage = Object.keys(dateFilter).length ? { paymentDate: dateFilter } : {};

  const [collections, outstanding, byMode] = await Promise.all([
    PaymentReceipt.aggregate([
      { $match: matchStage },
      { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } },
    ]),
    SalesInvoice.aggregate([
      { $match: { paymentStatus: { $in: ['unpaid', 'partial', 'overdue'] } } },
      { $group: { _id: '$paymentStatus', total: { $sum: '$balanceAmount' }, count: { $sum: 1 } } },
    ]),
    PaymentReceipt.aggregate([
      { $match: matchStage },
      { $group: { _id: '$paymentMode', total: { $sum: '$amount' }, count: { $sum: 1 } } },
      { $sort: { total: -1 } },
    ]),
  ]);

  const totalOutstanding = outstanding.reduce((s, g) => s + g.total, 0);

  res.status(200).json({
    success: true,
    data: {
      collections: collections[0] || { total: 0, count: 0 },
      outstanding: { breakdown: outstanding, total: totalOutstanding },
      byPaymentMode: byMode,
    },
  });
});

/**
 * @desc    Replenishment forecast based on sales velocity
 * @route   GET /api/reports/replenishment
 * @access  Admin
 */
exports.getReplenishmentForecast = asyncHandler(async (req, res) => {
  const days = parseInt(req.query.days) || 90;
  const forecastDays = parseInt(req.query.forecastDays) || 30;
  const fromDate = new Date();
  fromDate.setDate(fromDate.getDate() - days);

  // Calculate daily sales velocity
  const salesVelocity = await Order.aggregate([
    { $match: { createdAt: { $gte: fromDate }, status: { $nin: ['cancelled'] } } },
    { $unwind: '$items' },
    {
      $group: {
        _id: '$items.product',
        totalSold: { $sum: '$items.qty' },
      },
    },
    {
      $addFields: { dailyVelocity: { $divide: ['$totalSold', days] } },
    },
    {
      $lookup: { from: 'products', localField: '_id', foreignField: '_id', as: 'product' },
    },
    { $unwind: '$product' },
    {
      $lookup: {
        from: 'batches',
        let: { pid: '$_id' },
        pipeline: [
          {
            $match: {
              $expr: { $eq: ['$product', '$$pid'] },
              isActive: true,
              isExpired: false,
              expiryDate: { $gt: new Date() },
            },
          },
          { $group: { _id: null, available: { $sum: '$availableQty' } } },
        ],
        as: 'stock',
      },
    },
    {
      $addFields: {
        currentStock: { $ifNull: [{ $arrayElemAt: ['$stock.available', 0] }, 0] },
        forecastDemand: { $multiply: [{ $divide: ['$totalSold', days] }, forecastDays] },
      },
    },
    {
      $addFields: {
        daysOfStock: {
          $cond: [
            { $gt: ['$dailyVelocity', 0] },
            { $divide: ['$currentStock', '$dailyVelocity'] },
            999,
          ],
        },
        needsReplenishment: {
          $lte: [
            '$currentStock',
            { $multiply: [{ $divide: ['$totalSold', days] }, forecastDays] },
          ],
        },
      },
    },
    {
      $project: {
        productName: '$product.name',
        sku: '$product.sku',
        reorderQty: '$product.reorderQty',
        totalSold: 1,
        dailyVelocity: { $round: ['$dailyVelocity', 2] },
        forecastDemand: { $round: ['$forecastDemand', 0] },
        currentStock: 1,
        daysOfStock: { $round: ['$daysOfStock', 0] },
        needsReplenishment: 1,
      },
    },
    { $sort: { daysOfStock: 1 } },
  ]);

  res.status(200).json({
    success: true,
    data: {
      forecastPeriodDays: forecastDays,
      analysisPeriodDays: days,
      products: salesVelocity,
      needsReplenishment: salesVelocity.filter((p) => p.needsReplenishment),
    },
  });
});

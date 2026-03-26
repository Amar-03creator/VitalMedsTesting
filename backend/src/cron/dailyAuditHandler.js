/**
 * Standalone Lambda handler for the daily audit cron job.
 * Invoked by EventBridge schedule (see serverless.yml).
 */
require('dotenv').config();
const connectDB = require('../config/database');

exports.handler = async (event, context) => {
  context.callbackWaitsForEmptyEventLoop = false;

  console.log('[Lambda Cron] Daily audit triggered', JSON.stringify(event));

  try {
    await connectDB();

    const Batch = require('../models/Batch');
    const Product = require('../models/Product');
    const AuditLog = require('../models/AuditLog');
    const { sendAdminAlertEmail } = require('../utils/emailHelper');

    const today = new Date();
    const thirtyDays = new Date();
    thirtyDays.setDate(thirtyDays.getDate() + 30);

    // Flag expired batches
    const expiredResult = await Batch.updateMany(
      { isExpired: false, expiryDate: { $lt: today } },
      { $set: { isExpired: true } }
    );
    console.log(`[Lambda Cron] Flagged ${expiredResult.modifiedCount} expired batches`);

    // Expiring soon
    const expiringBatches = await Batch.find({
      isActive: true,
      isExpired: false,
      availableQty: { $gt: 0 },
      expiryDate: { $gt: today, $lte: thirtyDays },
    })
      .populate('product', 'name sku')
      .sort({ expiryDate: 1 })
      .lean();

    // Low stock
    const products = await Product.find({ isActive: true }).lean();
    const stockAgg = await Batch.aggregate([
      { $match: { isActive: true, isExpired: false, expiryDate: { $gt: today } } },
      { $group: { _id: '$product', totalStock: { $sum: '$availableQty' } } },
    ]);
    const stockMap = Object.fromEntries(stockAgg.map((s) => [s._id.toString(), s.totalStock]));
    const lowStockItems = products
      .map((p) => ({ ...p, totalStock: stockMap[p._id.toString()] || 0 }))
      .filter((p) => p.totalStock <= p.reorderPoint);

    if (lowStockItems.length > 0 || expiringBatches.length > 0) {
      await sendAdminAlertEmail(lowStockItems, expiringBatches);
    }

    console.log('[Lambda Cron] Daily audit complete');
    return { statusCode: 200, body: 'Audit complete' };
  } catch (err) {
    console.error('[Lambda Cron] Error:', err.message);
    return { statusCode: 500, body: err.message };
  }
};

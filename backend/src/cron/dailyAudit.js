const cron = require('node-cron');
const Batch = require('../models/Batch');
const Product = require('../models/Product');
const AuditLog = require('../models/AuditLog');
const { sendAdminAlertEmail } = require('../utils/emailHelper');

/**
 * Daily inventory audit cron job.
 * Runs every day at 7:00 AM IST.
 * - Flags expired batches
 * - Identifies low stock products
 * - Identifies batches expiring within 30 days
 * - Sends admin alert email
 */
const scheduleDailyAudit = () => {
  // Cron: "0 7 * * *" — 7 AM daily
  cron.schedule('0 7 * * *', async () => {
    console.log(`[CRON] Daily audit started at ${new Date().toISOString()}`);

    try {
      const today = new Date();
      const thirtyDays = new Date();
      thirtyDays.setDate(thirtyDays.getDate() + 30);

      // 1. Flag all newly expired batches
      const expiredResult = await Batch.updateMany(
        {
          isExpired: false,
          expiryDate: { $lt: today },
        },
        { $set: { isExpired: true } }
      );
      console.log(`[CRON] Flagged ${expiredResult.modifiedCount} newly expired batches`);

      // 2. Find batches expiring within 30 days (with stock)
      const expiringBatches = await Batch.find({
        isActive: true,
        isExpired: false,
        availableQty: { $gt: 0 },
        expiryDate: { $gt: today, $lte: thirtyDays },
      })
        .populate('product', 'name sku')
        .sort({ expiryDate: 1 })
        .lean();

      const expiringData = expiringBatches.map((b) => ({
        batchId: b._id,
        batchNumber: b.batchNumber,
        productName: b.product?.name || 'Unknown',
        sku: b.product?.sku || '',
        availableQty: b.availableQty,
        expiryDate: b.expiryDate,
      }));

      // 3. Find low stock products
      const products = await Product.find({ isActive: true }).lean();

      const stockAgg = await Batch.aggregate([
        {
          $match: {
            isActive: true,
            isExpired: false,
            expiryDate: { $gt: today },
          },
        },
        { $group: { _id: '$product', totalStock: { $sum: '$availableQty' } } },
      ]);

      const stockMap = Object.fromEntries(
        stockAgg.map((s) => [s._id.toString(), s.totalStock])
      );

      const lowStockItems = products
        .map((p) => ({
          productId: p._id,
          name: p.name,
          sku: p.sku,
          totalStock: stockMap[p._id.toString()] || 0,
          reorderPoint: p.reorderPoint,
          reorderQty: p.reorderQty,
        }))
        .filter((p) => p.totalStock <= p.reorderPoint);

      console.log(`[CRON] Low stock products: ${lowStockItems.length}`);
      console.log(`[CRON] Expiring batches within 30 days: ${expiringData.length}`);

      // 4. Log the audit summary
      if (lowStockItems.length > 0 || expiringData.length > 0) {
        await AuditLog.create({
          user: null,
          userEmail: 'system@vitalmeds.in',
          action: 'READ',
          resource: 'DailyAudit',
          changes: {
            after: {
              date: today.toISOString(),
              expiredFlagged: expiredResult.modifiedCount,
              lowStockCount: lowStockItems.length,
              expiringBatchCount: expiringData.length,
              summary: {
                lowStockItems: lowStockItems.map((p) => ({ name: p.name, sku: p.sku, stock: p.totalStock })),
                expiringBatches: expiringData.slice(0, 10),
              },
            },
          },
          ipAddress: 'system',
          userAgent: 'cron/daily-audit',
        }).catch((err) => console.error('[CRON] AuditLog save failed:', err.message));

        // 5. Send admin alert email
        await sendAdminAlertEmail(lowStockItems, expiringData);
        console.log('[CRON] Admin alert email sent');
      } else {
        console.log('[CRON] All clear — no alerts to send today');
      }

      console.log(`[CRON] Daily audit completed at ${new Date().toISOString()}`);
    } catch (err) {
      console.error('[CRON] Daily audit failed:', err.message, err.stack);
    }
  }, {
    timezone: 'Asia/Kolkata',
  });

  console.log('[CRON] Daily audit job scheduled (7:00 AM IST)');
};

module.exports = { scheduleDailyAudit };

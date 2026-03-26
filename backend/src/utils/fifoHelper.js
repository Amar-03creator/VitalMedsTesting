const mongoose = require('mongoose');
const Batch = require('../models/Batch');
const SalesInvoice = require('../models/SalesInvoice');

/**
 * Deduct stock using FIFO (oldest batches first, by manufacturing/purchase date).
 * Skips expired batches automatically.
 *
 * @param {string|ObjectId} productId - Product ID
 * @param {number} quantity - Quantity to deduct
 * @param {Object} [session] - Mongoose session for transactions
 * @returns {Promise<Array>} Array of {batchId, batchNumber, deducted, remainingQty}
 */
const deductFIFO = async (productId, quantity, session = null) => {
  const today = new Date();

  // Get non-expired batches with available stock, sorted by expiry date (FIFO)
  const batches = await Batch.find({
    product: productId,
    availableQty: { $gt: 0 },
    isExpired: false,
    isActive: true,
    expiryDate: { $gt: today },
  })
    .sort({ expiryDate: 1, createdAt: 1 })
    .session(session);

  const deductions = [];
  let remaining = quantity;

  for (const batch of batches) {
    if (remaining <= 0) break;

    const deduct = Math.min(batch.availableQty, remaining);
    batch.availableQty -= deduct;
    await batch.save({ session });

    deductions.push({
      batchId: batch._id,
      batchNumber: batch.batchNumber,
      deducted: deduct,
      unitPrice: batch.sellingPrice,
      mrp: batch.mrp,
      expiryDate: batch.expiryDate,
      remainingQty: batch.availableQty,
    });

    remaining -= deduct;
  }

  if (remaining > 0) {
    throw new Error(`Insufficient stock for product ${productId}. Short by ${remaining} units.`);
  }

  return deductions;
};

/**
 * Allocate a payment to outstanding invoices using FIFO
 * (oldest unpaid invoices are settled first).
 *
 * @param {string|ObjectId} clientId - Client ID
 * @param {number} amount - Payment amount
 * @param {Object} [session] - Mongoose session
 * @returns {Promise<Array>} Allocation details per invoice
 */
const allocatePaymentFIFO = async (clientId, amount, session = null) => {
  // Get unpaid/partial invoices sorted by creation date (oldest first)
  const invoices = await SalesInvoice.find({
    client: clientId,
    paymentStatus: { $in: ['unpaid', 'partial', 'overdue'] },
    balanceAmount: { $gt: 0 },
  })
    .sort({ createdAt: 1 })
    .session(session);

  const allocations = [];
  let remaining = amount;

  for (const invoice of invoices) {
    if (remaining <= 0) break;

    const allocate = Math.min(invoice.balanceAmount, remaining);
    invoice.paidAmount += allocate;
    invoice.balanceAmount -= allocate;

    if (invoice.balanceAmount <= 0) {
      invoice.paymentStatus = 'paid';
    } else {
      invoice.paymentStatus = 'partial';
    }

    await invoice.save({ session });

    allocations.push({
      invoice: invoice._id,
      invoiceNumber: invoice.invoiceNumber,
      allocated: allocate,
      outstanding: invoice.balanceAmount,
    });

    remaining -= allocate;
  }

  return { allocations, unallocated: remaining };
};

/**
 * Check if sufficient stock is available for a product (without deducting).
 *
 * @param {string|ObjectId} productId - Product ID
 * @param {number} quantity - Required quantity
 * @returns {Promise<{available: boolean, totalQty: number, batches: Array}>}
 */
const checkStockAvailability = async (productId, quantity) => {
  const today = new Date();

  const batches = await Batch.find({
    product: productId,
    availableQty: { $gt: 0 },
    isExpired: false,
    isActive: true,
    expiryDate: { $gt: today },
  }).sort({ expiryDate: 1 });

  const totalQty = batches.reduce((sum, b) => sum + b.availableQty, 0);

  return {
    available: totalQty >= quantity,
    totalQty,
    batches: batches.map((b) => ({
      batchId: b._id,
      batchNumber: b.batchNumber,
      availableQty: b.availableQty,
      expiryDate: b.expiryDate,
      sellingPrice: b.sellingPrice,
    })),
  };
};

/**
 * Reserve stock temporarily (e.g., during order processing).
 * Used to prevent overselling before transaction commits.
 *
 * @param {string|ObjectId} productId
 * @param {number} quantity
 * @param {Object} [session]
 */
const reserveStock = async (productId, quantity, session = null) => {
  const today = new Date();
  const batches = await Batch.find({
    product: productId,
    availableQty: { $gt: 0 },
    isExpired: false,
    isActive: true,
    expiryDate: { $gt: today },
  })
    .sort({ expiryDate: 1 })
    .session(session);

  let remaining = quantity;
  for (const batch of batches) {
    if (remaining <= 0) break;
    const reserve = Math.min(batch.availableQty, remaining);
    batch.availableQty -= reserve;
    batch.reservedQty += reserve;
    await batch.save({ session });
    remaining -= reserve;
  }

  if (remaining > 0) {
    throw new Error(`Cannot reserve: insufficient stock for product ${productId}`);
  }
};

module.exports = {
  deductFIFO,
  allocatePaymentFIFO,
  checkStockAvailability,
  reserveStock,
};

const mongoose = require('mongoose');

const purchaseItemSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
    },
    batchNumber: { type: String, required: true, trim: true, uppercase: true },
    manufacturingDate: { type: Date },
    expiryDate: { type: Date, required: true },
    qty: { type: Number, required: true, min: 1 },
    unitPrice: { type: Number, required: true, min: 0 },
    mrp: { type: Number, min: 0 },
    sellingPrice: { type: Number, min: 0 },
    gstRate: { type: Number, required: true, enum: [0, 5, 12, 18, 28] },
    cgst: { type: Number, default: 0 },
    sgst: { type: Number, default: 0 },
    igst: { type: Number, default: 0 },
    amount: { type: Number, required: true, min: 0 },
    hsnCode: { type: String },
  },
  { _id: false }
);

const purchaseBillSchema = new mongoose.Schema(
  {
    billNumber: { type: String, required: true, trim: true },
    supplier: {
      name: { type: String, required: true, trim: true },
      gstNumber: { type: String, trim: true },
      address: { type: String, trim: true },
      phone: { type: String, trim: true },
    },
    invoiceDate: { type: Date, required: true },
    dueDate: { type: Date },
    items: {
      type: [purchaseItemSchema],
      required: true,
      validate: [(v) => v.length > 0, 'At least one item required'],
    },
    subtotal: { type: Number, default: 0 },
    totalCgst: { type: Number, default: 0 },
    totalSgst: { type: Number, default: 0 },
    totalIgst: { type: Number, default: 0 },
    totalGst: { type: Number, default: 0 },
    totalAmount: { type: Number, required: true, min: 0 },
    pdfUrl: { type: String },
    paymentStatus: {
      type: String,
      enum: ['unpaid', 'partial', 'paid'],
      default: 'unpaid',
    },
    paidAmount: { type: Number, default: 0 },
    notes: { type: String },
    batchesCreated: { type: Boolean, default: false },
  },
  {
    timestamps: true,
  }
);

purchaseBillSchema.index({ billNumber: 1 });
purchaseBillSchema.index({ invoiceDate: -1 });
purchaseBillSchema.index({ 'supplier.name': 1 });

module.exports = mongoose.model('PurchaseBill', purchaseBillSchema);

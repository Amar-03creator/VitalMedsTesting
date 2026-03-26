const mongoose = require('mongoose');

const noteItemSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
    productName: { type: String },
    batchNumber: { type: String },
    qty: { type: Number, min: 0 },
    unitPrice: { type: Number, min: 0 },
    gstRate: { type: Number },
    amount: { type: Number, min: 0 },
  },
  { _id: false }
);

const debitNoteSchema = new mongoose.Schema(
  {
    debitNoteNumber: { type: String, unique: true },
    supplier: {
      name: { type: String, required: true, trim: true },
      gstNumber: { type: String, trim: true },
      address: { type: String },
    },
    purchaseBill: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PurchaseBill',
    },
    reason: { type: String, required: true, trim: true },
    items: [noteItemSchema],
    amount: { type: Number, required: true, min: 0 },
    gstAmount: { type: Number, default: 0 },
    totalAmount: { type: Number, required: true, min: 0 },
    status: {
      type: String,
      enum: ['pending', 'approved', 'applied', 'rejected'],
      default: 'pending',
    },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Client' },
    approvedAt: { type: Date },
    pdfUrl: { type: String },
    notes: { type: String },
  },
  {
    timestamps: true,
  }
);

debitNoteSchema.index({ debitNoteNumber: 1 });
debitNoteSchema.index({ 'supplier.name': 1 });

module.exports = mongoose.model('DebitNote', debitNoteSchema);

const mongoose = require('mongoose');

const noteItemSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
    productName: { type: String },
    qty: { type: Number, min: 0 },
    unitPrice: { type: Number, min: 0 },
    gstRate: { type: Number },
    amount: { type: Number, min: 0 },
  },
  { _id: false }
);

const creditNoteSchema = new mongoose.Schema(
  {
    creditNoteNumber: { type: String, unique: true },
    client: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Client',
      required: true,
    },
    order: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
    },
    invoice: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SalesInvoice',
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
    appliedToInvoice: { type: mongoose.Schema.Types.ObjectId, ref: 'SalesInvoice' },
    pdfUrl: { type: String },
    notes: { type: String },
  },
  {
    timestamps: true,
  }
);

creditNoteSchema.index({ client: 1, status: 1 });
creditNoteSchema.index({ creditNoteNumber: 1 });

module.exports = mongoose.model('CreditNote', creditNoteSchema);

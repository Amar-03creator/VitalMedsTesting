const mongoose = require('mongoose');

const inquiryItemSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
    },
    qty: { type: Number, required: true, min: 1 },
    requestedPrice: { type: Number, min: 0 },
    notes: { type: String },
  },
  { _id: false }
);

const quoteItemSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
    },
    batch: { type: mongoose.Schema.Types.ObjectId, ref: 'Batch' },
    qty: { type: Number, required: true, min: 1 },
    unitPrice: { type: Number, required: true, min: 0 },
    discount: { type: Number, default: 0, min: 0, max: 100 },
    gstRate: { type: Number, required: true, enum: [0, 5, 12, 18, 28] },
    amount: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const inquirySchema = new mongoose.Schema(
  {
    inquiryNumber: { type: String, unique: true },
    client: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Client',
      required: true,
    },
    items: { type: [inquiryItemSchema], required: true, validate: [(v) => v.length > 0, 'At least one item required'] },
    status: {
      type: String,
      enum: ['pending', 'quoted', 'converted', 'rejected'],
      default: 'pending',
    },
    quoteItems: [quoteItemSchema],
    quoteValidTill: { type: Date },
    quotePdfUrl: { type: String },
    notes: { type: String },
    internalNotes: { type: String },
    convertedOrder: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
    },
    quotedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Client' },
    quotedAt: { type: Date },
    rejectionReason: { type: String },
  },
  {
    timestamps: true,
  }
);

inquirySchema.index({ client: 1, status: 1 });
inquirySchema.index({ inquiryNumber: 1 });
inquirySchema.index({ createdAt: -1 });

module.exports = mongoose.model('Inquiry', inquirySchema);

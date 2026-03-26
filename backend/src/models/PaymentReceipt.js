const mongoose = require('mongoose');

const allocationSchema = new mongoose.Schema(
  {
    invoice: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SalesInvoice',
      required: true,
    },
    invoiceNumber: { type: String },
    allocated: { type: Number, required: true, min: 0 },
    outstanding: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const paymentReceiptSchema = new mongoose.Schema(
  {
    receiptNumber: { type: String, unique: true },
    client: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Client',
      required: true,
    },
    amount: { type: Number, required: true, min: 0.01 },
    paymentMode: {
      type: String,
      enum: ['cash', 'cheque', 'neft', 'rtgs', 'upi', 'dd'],
      required: true,
    },
    referenceNumber: { type: String, trim: true },
    paymentDate: { type: Date, required: true, default: Date.now },
    allocations: [allocationSchema],
    unallocated: { type: Number, default: 0 },
    notes: { type: String },
    recordedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Client' },
    pdfUrl: { type: String },
  },
  {
    timestamps: true,
  }
);

paymentReceiptSchema.index({ client: 1 });
paymentReceiptSchema.index({ receiptNumber: 1 });
paymentReceiptSchema.index({ paymentDate: -1 });

module.exports = mongoose.model('PaymentReceipt', paymentReceiptSchema);

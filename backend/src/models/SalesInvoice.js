const mongoose = require('mongoose');

const invoiceItemSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
    },
    batch: { type: mongoose.Schema.Types.ObjectId, ref: 'Batch' },
    qty: { type: Number, required: true, min: 1 },
    unitPrice: { type: Number, required: true, min: 0 },
    discount: { type: Number, default: 0 },
    gstRate: { type: Number, required: true },
    cgst: { type: Number, default: 0 },
    sgst: { type: Number, default: 0 },
    igst: { type: Number, default: 0 },
    amount: { type: Number, required: true, min: 0 },
    hsnCode: { type: String },
    productName: { type: String },
    batchNumber: { type: String },
  },
  { _id: false }
);

const salesInvoiceSchema = new mongoose.Schema(
  {
    invoiceNumber: { type: String, unique: true },
    order: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
      required: true,
    },
    client: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Client',
      required: true,
    },
    items: {
      type: [invoiceItemSchema],
      required: true,
      validate: [(v) => v.length > 0, 'At least one item required'],
    },
    subtotal: { type: Number, required: true, min: 0 },
    discountAmount: { type: Number, default: 0 },
    totalCgst: { type: Number, default: 0 },
    totalSgst: { type: Number, default: 0 },
    totalIgst: { type: Number, default: 0 },
    totalGst: { type: Number, default: 0 },
    totalAmount: { type: Number, required: true, min: 0 },
    pdfUrl: { type: String },
    dueDate: { type: Date, required: true },
    paymentStatus: {
      type: String,
      enum: ['unpaid', 'partial', 'paid', 'overdue'],
      default: 'unpaid',
    },
    paidAmount: { type: Number, default: 0 },
    balanceAmount: { type: Number, default: 0 },
    isInterState: { type: Boolean, default: false },
    notes: { type: String },
  },
  {
    timestamps: true,
  }
);

salesInvoiceSchema.pre('save', function (next) {
  if (this.isModified('totalAmount') || this.isModified('paidAmount')) {
    this.balanceAmount = this.totalAmount - this.paidAmount;
  }
  // Mark overdue
  if (this.dueDate < new Date() && this.paymentStatus !== 'paid') {
    this.paymentStatus = 'overdue';
  }
  next();
});

salesInvoiceSchema.index({ client: 1, paymentStatus: 1 });
salesInvoiceSchema.index({ invoiceNumber: 1 });
salesInvoiceSchema.index({ dueDate: 1 });
salesInvoiceSchema.index({ createdAt: -1 });

module.exports = mongoose.model('SalesInvoice', salesInvoiceSchema);

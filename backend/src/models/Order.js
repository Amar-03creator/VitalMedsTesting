const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema(
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
    cgst: { type: Number, default: 0 },
    sgst: { type: Number, default: 0 },
    igst: { type: Number, default: 0 },
    amount: { type: Number, required: true, min: 0 },
    hsnCode: { type: String },
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    orderNumber: { type: String, unique: true },
    client: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Client',
      required: true,
    },
    inquiry: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Inquiry',
    },
    items: {
      type: [orderItemSchema],
      required: true,
      validate: [(v) => v.length > 0, 'At least one item required'],
    },
    subtotal: { type: Number, required: true, min: 0 },
    discountAmount: { type: Number, default: 0 },
    totalGst: { type: Number, default: 0 },
    totalCgst: { type: Number, default: 0 },
    totalSgst: { type: Number, default: 0 },
    totalIgst: { type: Number, default: 0 },
    totalAmount: { type: Number, required: true, min: 0 },
    status: {
      type: String,
      enum: ['pending', 'processing', 'shipped', 'delivered', 'cancelled'],
      default: 'pending',
    },
    shippingAddress: {
      street: String,
      city: String,
      state: String,
      pincode: String,
      country: { type: String, default: 'India' },
    },
    deliveryDate: { type: Date },
    expectedDelivery: { type: Date },
    paymentStatus: {
      type: String,
      enum: ['unpaid', 'partial', 'paid'],
      default: 'unpaid',
    },
    paidAmount: { type: Number, default: 0 },
    balanceAmount: { type: Number, default: 0 },
    notes: { type: String },
    cancelReason: { type: String },
    processedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Client' },
    isInterState: { type: Boolean, default: false },
  },
  {
    timestamps: true,
  }
);

orderSchema.pre('save', function (next) {
  if (this.isModified('totalAmount') || this.isModified('paidAmount')) {
    this.balanceAmount = this.totalAmount - this.paidAmount;
  }
  next();
});

orderSchema.index({ client: 1, status: 1 });
orderSchema.index({ orderNumber: 1 });
orderSchema.index({ createdAt: -1 });
orderSchema.index({ paymentStatus: 1 });

module.exports = mongoose.model('Order', orderSchema);

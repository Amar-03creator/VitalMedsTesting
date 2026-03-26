const mongoose = require('mongoose');

const batchSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
    },
    batchNumber: { type: String, required: true, trim: true, uppercase: true },
    manufacturingDate: { type: Date, required: true },
    expiryDate: { type: Date, required: true },
    purchasePrice: { type: Number, required: true, min: 0 },
    sellingPrice: { type: Number, required: true, min: 0 },
    mrp: { type: Number, required: true, min: 0 },
    quantity: { type: Number, required: true, min: 0 },
    availableQty: { type: Number, required: true, min: 0 },
    reservedQty: { type: Number, default: 0, min: 0 },
    purchaseBill: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PurchaseBill',
    },
    location: { type: String, trim: true },
    isExpired: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Pre-save: mark expired batches
batchSchema.pre('save', function (next) {
  if (this.expiryDate < new Date()) {
    this.isExpired = true;
  }
  next();
});

batchSchema.virtual('isExpiringSoon').get(function () {
  const thirtyDaysFromNow = new Date();
  thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
  return this.expiryDate <= thirtyDaysFromNow && !this.isExpired;
});

// Compound unique index per product
batchSchema.index({ product: 1, batchNumber: 1 }, { unique: true });
batchSchema.index({ product: 1, expiryDate: 1 });
batchSchema.index({ expiryDate: 1 });
batchSchema.index({ availableQty: 1 });

module.exports = mongoose.model('Batch', batchSchema);

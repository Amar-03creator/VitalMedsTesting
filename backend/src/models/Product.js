const mongoose = require('mongoose');

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    sku: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
    },
    category: {
      type: String,
      required: true,
      enum: [
        'tablet',
        'capsule',
        'syrup',
        'injection',
        'ointment',
        'drops',
        'inhaler',
        'powder',
        'device',
        'other',
      ],
    },
    description: { type: String, trim: true },
    hsn: { type: String, trim: true, required: true },
    gstRate: {
      type: Number,
      required: true,
      enum: [0, 5, 12, 18, 28],
      default: 12,
    },
    unit: {
      type: String,
      required: true,
      enum: ['strip', 'bottle', 'box', 'vial', 'tube', 'sachet', 'unit'],
      default: 'strip',
    },
    manufacturer: { type: String, trim: true },
    composition: { type: String, trim: true },
    reorderPoint: { type: Number, default: 10, min: 0 },
    reorderQty: { type: Number, default: 100, min: 0 },
    isActive: { type: Boolean, default: true },
    imageUrl: { type: String },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtual to get total available quantity across all batches
productSchema.virtual('totalStock', {
  ref: 'Batch',
  localField: '_id',
  foreignField: 'product',
  count: false,
});

productSchema.index({ sku: 1 });
productSchema.index({ category: 1 });
productSchema.index({ isActive: 1 });
productSchema.index({ name: 'text', description: 'text' });

module.exports = mongoose.model('Product', productSchema);

const mongoose = require('mongoose');

const kycDocumentSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ['gst_certificate', 'pan_card', 'drug_license', 'address_proof', 'other'],
      required: true,
    },
    url: { type: String, required: true },
    verified: { type: Boolean, default: false },
    verifiedAt: { type: Date },
    notes: { type: String },
  },
  { _id: false }
);

const addressSchema = new mongoose.Schema(
  {
    street: String,
    city: String,
    state: String,
    pincode: String,
    country: { type: String, default: 'India' },
  },
  { _id: false }
);

const clientSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    phone: { type: String, required: true, trim: true },
    address: addressSchema,
    companyName: { type: String, trim: true },
    gstNumber: {
      type: String,
      trim: true,
      uppercase: true,
      match: [/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/, 'Invalid GST number'],
    },
    kycDocuments: [kycDocumentSchema],
    status: {
      type: String,
      enum: ['pending', 'active', 'suspended'],
      default: 'pending',
    },
    cognitoId: { type: String, unique: true, sparse: true },
    role: { type: String, enum: ['client', 'admin'], default: 'client' },
    password: { type: String, select: false },
    creditLimit: { type: Number, default: 0, min: 0 },
    currentBalance: { type: Number, default: 0 },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

clientSchema.virtual('availableCredit').get(function () {
  return this.creditLimit - this.currentBalance;
});

clientSchema.index({ email: 1 });
clientSchema.index({ status: 1 });
clientSchema.index({ cognitoId: 1 });

module.exports = mongoose.model('Client', clientSchema);

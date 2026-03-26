const mongoose = require('mongoose');

const bankDetailsSchema = new mongoose.Schema(
  {
    accountNo: { type: String, trim: true },
    ifsc: { type: String, trim: true, uppercase: true },
    bankName: { type: String, trim: true },
    accountName: { type: String, trim: true },
    accountType: { type: String, enum: ['savings', 'current'], default: 'current' },
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

const companySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    phone: { type: String, required: true, trim: true },
    address: addressSchema,
    gstNumber: {
      type: String,
      trim: true,
      uppercase: true,
      match: [/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/, 'Invalid GST number'],
    },
    panNumber: {
      type: String,
      trim: true,
      uppercase: true,
      match: [/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/, 'Invalid PAN number'],
    },
    bankDetails: bankDetailsSchema,
    logoUrl: { type: String },
    website: { type: String },
    drugLicenseNumber: { type: String, trim: true },
    signatureUrl: { type: String },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Company', companySchema);

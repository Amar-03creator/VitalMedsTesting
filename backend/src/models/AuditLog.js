const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Client',
      required: false,
    },
    userEmail: { type: String },
    action: {
      type: String,
      required: true,
      enum: [
        'CREATE', 'READ', 'UPDATE', 'DELETE',
        'LOGIN', 'LOGOUT', 'REGISTER',
        'APPROVE', 'REJECT', 'CANCEL',
        'UPLOAD', 'DOWNLOAD', 'EMAIL_SENT',
        'PAYMENT_RECORDED', 'STOCK_DEDUCTED',
      ],
    },
    resource: { type: String, required: true },
    resourceId: { type: mongoose.Schema.Types.ObjectId },
    resourceNumber: { type: String },
    changes: {
      before: { type: mongoose.Schema.Types.Mixed },
      after: { type: mongoose.Schema.Types.Mixed },
    },
    ipAddress: { type: String },
    userAgent: { type: String },
    status: { type: String, enum: ['success', 'failure'], default: 'success' },
    errorMessage: { type: String },
    duration: { type: Number },
  },
  {
    timestamps: true,
  }
);

// Expire audit logs after 1 year (optional)
auditLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 31536000 });
auditLogSchema.index({ user: 1, createdAt: -1 });
auditLogSchema.index({ resource: 1, resourceId: 1 });
auditLogSchema.index({ action: 1 });

module.exports = mongoose.model('AuditLog', auditLogSchema);

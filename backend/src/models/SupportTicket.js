const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema(
  {
    sender: { type: mongoose.Schema.Types.ObjectId, ref: 'Client', required: true },
    role: { type: String, enum: ['client', 'admin', 'agent'], required: true },
    senderName: { type: String },
    message: { type: String, required: true },
    attachments: [{ url: String, name: String }],
    timestamp: { type: Date, default: Date.now },
  },
  { _id: false }
);

const supportTicketSchema = new mongoose.Schema(
  {
    ticketNumber: { type: String, unique: true },
    client: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Client',
      required: true,
    },
    subject: { type: String, required: true, trim: true },
    description: { type: String, required: true },
    status: {
      type: String,
      enum: ['open', 'in-progress', 'resolved', 'closed'],
      default: 'open',
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical'],
      default: 'medium',
    },
    category: {
      type: String,
      enum: ['order', 'payment', 'product', 'delivery', 'account', 'other'],
      default: 'other',
    },
    messages: [messageSchema],
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'Client' },
    relatedOrder: { type: mongoose.Schema.Types.ObjectId, ref: 'Order' },
    relatedInvoice: { type: mongoose.Schema.Types.ObjectId, ref: 'SalesInvoice' },
    resolvedAt: { type: Date },
    closedAt: { type: Date },
    firstResponseAt: { type: Date },
    resolutionNotes: { type: String },
  },
  {
    timestamps: true,
  }
);

supportTicketSchema.index({ client: 1, status: 1 });
supportTicketSchema.index({ ticketNumber: 1 });
supportTicketSchema.index({ assignedTo: 1, status: 1 });
supportTicketSchema.index({ priority: 1, status: 1 });

module.exports = mongoose.model('SupportTicket', supportTicketSchema);

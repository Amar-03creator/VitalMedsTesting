const Joi = require('joi');

/**
 * Middleware factory that validates req.body against a Joi schema.
 * Returns 422 with error details on validation failure.
 *
 * @param {Joi.Schema} schema - Joi schema to validate against
 * @param {string} [source='body'] - 'body', 'query', or 'params'
 */
const validate = (schema, source = 'body') => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req[source], {
      abortEarly: false,
      allowUnknown: false,
      stripUnknown: true,
    });

    if (error) {
      const errors = error.details.map((d) => ({
        field: d.path.join('.'),
        message: d.message.replace(/"/g, ''),
      }));
      return res.status(422).json({
        success: false,
        message: 'Validation failed',
        errors,
      });
    }

    req[source] = value;
    next();
  };
};

// =============================================
// Joi Validation Schemas
// =============================================

const addressSchema = Joi.object({
  street: Joi.string().optional(),
  city: Joi.string().optional(),
  state: Joi.string().optional(),
  pincode: Joi.string().optional(),
  country: Joi.string().optional(),
});

const schemas = {
  // Auth
  registerClient: Joi.object({
    name: Joi.string().min(2).max(100).required(),
    email: Joi.string().email().lowercase().required(),
    phone: Joi.string().min(10).max(15).required(),
    password: Joi.string().min(8).max(128).required(),
    companyName: Joi.string().max(200).optional(),
    gstNumber: Joi.string()
      .pattern(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/)
      .optional()
      .messages({ 'string.pattern.base': 'Invalid GST number format' }),
    address: addressSchema.optional(),
  }),

  login: Joi.object({
    email: Joi.string().email().lowercase().required(),
    password: Joi.string().required(),
  }),

  changePassword: Joi.object({
    currentPassword: Joi.string().required(),
    newPassword: Joi.string().min(8).max(128).required(),
    confirmPassword: Joi.string().valid(Joi.ref('newPassword')).required()
      .messages({ 'any.only': 'Passwords do not match' }),
  }),

  // Product
  createProduct: Joi.object({
    name: Joi.string().min(2).max(200).required(),
    sku: Joi.string().min(2).max(50).uppercase().required(),
    category: Joi.string()
      .valid('tablet', 'capsule', 'syrup', 'injection', 'ointment', 'drops', 'inhaler', 'powder', 'device', 'other')
      .required(),
    description: Joi.string().max(1000).optional(),
    hsn: Joi.string().required(),
    gstRate: Joi.number().valid(0, 5, 12, 18, 28).required(),
    unit: Joi.string().valid('strip', 'bottle', 'box', 'vial', 'tube', 'sachet', 'unit').required(),
    manufacturer: Joi.string().max(200).optional(),
    composition: Joi.string().max(500).optional(),
    reorderPoint: Joi.number().integer().min(0).optional(),
    reorderQty: Joi.number().integer().min(0).optional(),
    isActive: Joi.boolean().optional(),
  }),

  // Batch
  addBatch: Joi.object({
    batchNumber: Joi.string().required(),
    manufacturingDate: Joi.date().required(),
    expiryDate: Joi.date().greater(Joi.ref('manufacturingDate')).required()
      .messages({ 'date.greater': 'Expiry date must be after manufacturing date' }),
    purchasePrice: Joi.number().min(0).required(),
    sellingPrice: Joi.number().min(0).required(),
    mrp: Joi.number().min(0).required(),
    quantity: Joi.number().integer().min(1).required(),
    location: Joi.string().optional(),
    purchaseBill: Joi.string().optional(),
  }),

  // Inquiry
  createInquiry: Joi.object({
    client: Joi.string().optional(),
    items: Joi.array()
      .items(
        Joi.object({
          product: Joi.string().required(),
          qty: Joi.number().integer().min(1).required(),
          requestedPrice: Joi.number().min(0).optional(),
          notes: Joi.string().optional(),
        })
      )
      .min(1)
      .required(),
    notes: Joi.string().max(1000).optional(),
  }),

  createQuote: Joi.object({
    quoteItems: Joi.array()
      .items(
        Joi.object({
          product: Joi.string().required(),
          batch: Joi.string().optional(),
          qty: Joi.number().integer().min(1).required(),
          unitPrice: Joi.number().min(0).required(),
          discount: Joi.number().min(0).max(100).default(0),
          gstRate: Joi.number().valid(0, 5, 12, 18, 28).required(),
          amount: Joi.number().min(0).required(),
        })
      )
      .min(1)
      .required(),
    quoteValidTill: Joi.date().greater('now').required(),
    notes: Joi.string().max(1000).optional(),
  }),

  // Order
  createOrder: Joi.object({
    client: Joi.string().required(),
    inquiry: Joi.string().optional(),
    items: Joi.array()
      .items(
        Joi.object({
          product: Joi.string().required(),
          batch: Joi.string().optional(),
          qty: Joi.number().integer().min(1).required(),
          unitPrice: Joi.number().min(0).required(),
          discount: Joi.number().min(0).max(100).default(0),
          gstRate: Joi.number().valid(0, 5, 12, 18, 28).required(),
          amount: Joi.number().min(0).required(),
          cgst: Joi.number().min(0).default(0),
          sgst: Joi.number().min(0).default(0),
          igst: Joi.number().min(0).default(0),
          hsnCode: Joi.string().optional(),
        })
      )
      .min(1)
      .required(),
    subtotal: Joi.number().min(0).required(),
    discountAmount: Joi.number().min(0).default(0),
    totalGst: Joi.number().min(0).default(0),
    totalAmount: Joi.number().min(0).required(),
    shippingAddress: addressSchema.optional(),
    expectedDelivery: Joi.date().optional(),
    notes: Joi.string().max(1000).optional(),
    isInterState: Joi.boolean().default(false),
  }),

  // Payment
  recordPayment: Joi.object({
    client: Joi.string().required(),
    amount: Joi.number().min(0.01).required(),
    paymentMode: Joi.string().valid('cash', 'cheque', 'neft', 'rtgs', 'upi', 'dd').required(),
    referenceNumber: Joi.string().optional(),
    paymentDate: Joi.date().default(() => new Date()),
    notes: Joi.string().optional(),
  }),

  // Support Ticket
  createTicket: Joi.object({
    subject: Joi.string().min(5).max(200).required(),
    description: Joi.string().min(10).max(2000).required(),
    priority: Joi.string().valid('low', 'medium', 'high', 'critical').default('medium'),
    category: Joi.string().valid('order', 'payment', 'product', 'delivery', 'account', 'other').default('other'),
    relatedOrder: Joi.string().optional(),
    relatedInvoice: Joi.string().optional(),
  }),

  addMessage: Joi.object({
    message: Joi.string().min(1).max(2000).required(),
  }),
};

module.exports = { validate, schemas };

// =============================================
// Application-wide constants for VitalMEDS
// =============================================

const ORDER_STATUS = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  SHIPPED: 'shipped',
  DELIVERED: 'delivered',
  CANCELLED: 'cancelled',
};

const INVOICE_STATUS = {
  UNPAID: 'unpaid',
  PARTIAL: 'partial',
  PAID: 'paid',
  OVERDUE: 'overdue',
};

const PAYMENT_STATUS = {
  UNPAID: 'unpaid',
  PARTIAL: 'partial',
  PAID: 'paid',
};

const TICKET_STATUS = {
  OPEN: 'open',
  IN_PROGRESS: 'in-progress',
  RESOLVED: 'resolved',
  CLOSED: 'closed',
};

const CLIENT_STATUS = {
  PENDING: 'pending',
  ACTIVE: 'active',
  SUSPENDED: 'suspended',
};

const INQUIRY_STATUS = {
  PENDING: 'pending',
  QUOTED: 'quoted',
  CONVERTED: 'converted',
  REJECTED: 'rejected',
};

const GST_RATES = [0, 5, 12, 18, 28];

const PAYMENT_MODES = ['cash', 'cheque', 'neft', 'rtgs', 'upi', 'dd'];

const PRODUCT_CATEGORIES = [
  'tablet', 'capsule', 'syrup', 'injection',
  'ointment', 'drops', 'inhaler', 'powder', 'device', 'other',
];

const DOCUMENT_PREFIXES = {
  INQUIRY: 'INQ',
  ORDER: 'ORD',
  INVOICE: 'INV',
  RECEIPT: 'RCP',
  CREDIT_NOTE: 'CN',
  DEBIT_NOTE: 'DN',
  TICKET: 'TKT',
};

const ERROR_MESSAGES = {
  NOT_FOUND: (resource) => `${resource} not found`,
  UNAUTHORIZED: 'You are not authorized to perform this action',
  UNAUTHENTICATED: 'Please log in to access this resource',
  VALIDATION_ERROR: 'Validation failed. Please check your input',
  DUPLICATE_EMAIL: 'An account with this email already exists',
  INVALID_CREDENTIALS: 'Invalid email or password',
  INSUFFICIENT_STOCK: 'Insufficient stock available',
  INSUFFICIENT_CREDIT: 'Client credit limit exceeded',
  BATCH_EXPIRED: 'Cannot use expired batch for order',
  SERVER_ERROR: 'Internal server error. Please try again later',
  FILE_TOO_LARGE: 'File size exceeds the allowed limit (5MB)',
  INVALID_FILE_TYPE: 'File type not allowed',
};

const SUCCESS_MESSAGES = {
  CREATED: (resource) => `${resource} created successfully`,
  UPDATED: (resource) => `${resource} updated successfully`,
  DELETED: (resource) => `${resource} deleted successfully`,
  EMAIL_SENT: 'Email sent successfully',
  PAYMENT_RECORDED: 'Payment recorded and allocated successfully',
};

const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 20,
  MAX_LIMIT: 100,
};

module.exports = {
  ORDER_STATUS,
  INVOICE_STATUS,
  PAYMENT_STATUS,
  TICKET_STATUS,
  CLIENT_STATUS,
  INQUIRY_STATUS,
  GST_RATES,
  PAYMENT_MODES,
  PRODUCT_CATEGORIES,
  DOCUMENT_PREFIXES,
  ERROR_MESSAGES,
  SUCCESS_MESSAGES,
  PAGINATION,
};

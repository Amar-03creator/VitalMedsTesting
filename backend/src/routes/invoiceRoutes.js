const express = require('express');
const router = express.Router();
const {
  getAllInvoices,
  getInvoiceById,
  createInvoice,
  generatePDF,
  sendInvoiceEmailHandler,
  getInvoicesByClient,
  getOverdueInvoices,
} = require('../controllers/invoiceController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.use(protect);

router.get('/overdue', authorize('admin'), getOverdueInvoices);
router.get('/client/:clientId', getInvoicesByClient);

router.route('/')
  .get(authorize('admin'), getAllInvoices);

router.post('/from-order/:orderId', authorize('admin'), createInvoice);

router.route('/:id')
  .get(getInvoiceById);

router.post('/:id/pdf', authorize('admin'), generatePDF);
router.post('/:id/send-email', authorize('admin'), sendInvoiceEmailHandler);

module.exports = router;

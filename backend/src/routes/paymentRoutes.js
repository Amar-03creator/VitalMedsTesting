const express = require('express');
const router = express.Router();
const {
  getAllPayments,
  getPaymentById,
  recordPayment,
  getPaymentsByClient,
  getOutstandingBalance,
} = require('../controllers/paymentController');
const { protect, authorize } = require('../middleware/authMiddleware');
const { validate, schemas } = require('../middleware/validator');

router.use(protect);

router.get('/outstanding/:clientId', getOutstandingBalance);
router.get('/client/:clientId', getPaymentsByClient);

router.route('/')
  .get(authorize('admin'), getAllPayments)
  .post(authorize('admin'), validate(schemas.recordPayment), recordPayment);

router.route('/:id')
  .get(authorize('admin'), getPaymentById);

module.exports = router;

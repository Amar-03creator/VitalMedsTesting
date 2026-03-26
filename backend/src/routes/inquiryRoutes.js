const express = require('express');
const router = express.Router();
const {
  getAllInquiries,
  getInquiryById,
  createInquiry,
  updateInquiry,
  createQuote,
  convertToOrder,
  rejectInquiry,
} = require('../controllers/inquiryController');
const { protect, authorize } = require('../middleware/authMiddleware');
const { validate, schemas } = require('../middleware/validator');

router.use(protect);

router.route('/')
  .get(authorize('admin'), getAllInquiries)
  .post(validate(schemas.createInquiry), createInquiry);

router.route('/:id')
  .get(getInquiryById)
  .put(authorize('admin'), updateInquiry);

router.post('/:id/quote', authorize('admin'), validate(schemas.createQuote), createQuote);
router.post('/:id/convert', authorize('admin'), convertToOrder);
router.patch('/:id/reject', authorize('admin'), rejectInquiry);

module.exports = router;

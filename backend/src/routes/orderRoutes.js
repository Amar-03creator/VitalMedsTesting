const express = require('express');
const router = express.Router();
const {
  getAllOrders,
  getOrderById,
  createOrder,
  updateOrder,
  updateOrderStatus,
  cancelOrder,
  getOrdersByClient,
} = require('../controllers/orderController');
const { protect, authorize } = require('../middleware/authMiddleware');
const { validate, schemas } = require('../middleware/validator');

router.use(protect);

router.get('/client/:clientId', getOrdersByClient);

router.route('/')
  .get(authorize('admin'), getAllOrders)
  .post(authorize('admin'), validate(schemas.createOrder), createOrder);

router.route('/:id')
  .get(getOrderById)
  .put(authorize('admin'), updateOrder);

router.patch('/:id/status', authorize('admin'), updateOrderStatus);
router.patch('/:id/cancel', authorize('admin'), cancelOrder);

module.exports = router;

const express = require('express');
const router = express.Router();
const {
  getSalesReport,
  getGSTSummary,
  getInventoryReport,
  getPaymentReport,
  getReplenishmentForecast,
} = require('../controllers/reportController');
const {
  getStockSummary,
  deductStock,
  getStockMovement,
} = require('../controllers/fifoController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.use(protect, authorize('admin'));

router.get('/sales', getSalesReport);
router.get('/gst', getGSTSummary);
router.get('/inventory', getInventoryReport);
router.get('/payments', getPaymentReport);
router.get('/replenishment', getReplenishmentForecast);

// FIFO / stock routes under reports
router.get('/fifo/stock-summary', getStockSummary);
router.post('/fifo/deduct', deductStock);
router.get('/fifo/movement', getStockMovement);

module.exports = router;

const express = require('express');
const router = express.Router();
const {
  getAllProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  getBatches,
  addBatch,
  updateBatch,
  getLowStockProducts,
  getExpiringBatches,
} = require('../controllers/productController');
const { protect, authorize } = require('../middleware/authMiddleware');
const { validate, schemas } = require('../middleware/validator');

router.use(protect);

// Special routes before /:id
router.get('/low-stock', authorize('admin'), getLowStockProducts);
router.get('/expiring-batches', authorize('admin'), getExpiringBatches);

router.route('/')
  .get(getAllProducts)
  .post(authorize('admin'), validate(schemas.createProduct), createProduct);

router.route('/:id')
  .get(getProductById)
  .put(authorize('admin'), updateProduct)
  .delete(authorize('admin'), deleteProduct);

router.route('/:id/batches')
  .get(getBatches)
  .post(authorize('admin'), validate(schemas.addBatch), addBatch);

router.put('/:id/batches/:batchId', authorize('admin'), updateBatch);

module.exports = router;

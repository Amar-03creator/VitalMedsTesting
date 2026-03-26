const express = require('express');
const router = express.Router();
const multer = require('multer');
const {
  getAllClients,
  getClientById,
  createClient,
  updateClient,
  deleteClient,
  updateClientStatus,
  getClientBalance,
  uploadKYCDocument,
} = require('../controllers/clientController');
const { protect, authorize } = require('../middleware/authMiddleware');

// In-memory storage for KYC uploads (buffer for S3)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'application/pdf'];
    cb(null, allowed.includes(file.mimetype));
  },
});

router.use(protect);

router.route('/')
  .get(authorize('admin'), getAllClients)
  .post(authorize('admin'), createClient);

router.route('/:id')
  .get(getClientById)
  .put(authorize('admin'), updateClient)
  .delete(authorize('admin'), deleteClient);

router.patch('/:id/status', authorize('admin'), updateClientStatus);
router.get('/:id/balance', getClientBalance);
router.post('/:id/kyc', upload.single('document'), uploadKYCDocument);

module.exports = router;

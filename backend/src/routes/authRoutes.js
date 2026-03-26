const express = require('express');
const router = express.Router();
const {
  register,
  login,
  logout,
  getMe,
  updateProfile,
  changePassword,
} = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');
const { validate, schemas } = require('../middleware/validator');

router.post('/register', validate(schemas.registerClient), register);
router.post('/login', validate(schemas.login), login);
router.post('/logout', protect, logout);
router.get('/me', protect, getMe);
router.put('/profile', protect, updateProfile);
router.put('/change-password', protect, validate(schemas.changePassword), changePassword);

module.exports = router;

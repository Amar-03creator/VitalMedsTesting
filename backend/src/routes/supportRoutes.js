const express = require('express');
const router = express.Router();
const {
  getAllTickets,
  getTicketById,
  createTicket,
  updateTicket,
  addMessage,
  resolveTicket,
  closeTicket,
  getTicketsByClient,
} = require('../controllers/supportController');
const { protect, authorize } = require('../middleware/authMiddleware');
const { validate, schemas } = require('../middleware/validator');

router.use(protect);

router.get('/client/:clientId', getTicketsByClient);

router.route('/')
  .get(authorize('admin'), getAllTickets)
  .post(validate(schemas.createTicket), createTicket);

router.route('/:id')
  .get(getTicketById)
  .put(authorize('admin'), updateTicket);

router.post('/:id/messages', validate(schemas.addMessage), addMessage);
router.patch('/:id/resolve', authorize('admin'), resolveTicket);
router.patch('/:id/close', closeTicket);

module.exports = router;

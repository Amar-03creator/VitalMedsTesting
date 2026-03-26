const SupportTicket = require('../models/SupportTicket');
const AuditLog = require('../models/AuditLog');
const { asyncHandler, AppError } = require('../middleware/errorHandler');
const { getNextSequence } = require('../utils/counterHelper');
const { PAGINATION } = require('../utils/constants');

/**
 * @desc    Get all tickets
 * @route   GET /api/support
 * @access  Admin
 */
exports.getAllTickets = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || PAGINATION.DEFAULT_PAGE;
  const limit = Math.min(parseInt(req.query.limit) || PAGINATION.DEFAULT_LIMIT, PAGINATION.MAX_LIMIT);
  const skip = (page - 1) * limit;

  const filter = {};
  if (req.query.status) filter.status = req.query.status;
  if (req.query.priority) filter.priority = req.query.priority;
  if (req.query.assignedTo) filter.assignedTo = req.query.assignedTo;
  if (req.query.client) filter.client = req.query.client;

  const [tickets, total] = await Promise.all([
    SupportTicket.find(filter)
      .populate('client', 'name email companyName')
      .populate('assignedTo', 'name email')
      .skip(skip).limit(limit).sort({ priority: -1, createdAt: -1 }),
    SupportTicket.countDocuments(filter),
  ]);

  res.status(200).json({ success: true, count: tickets.length, total, page, pages: Math.ceil(total / limit), data: tickets });
});

/**
 * @desc    Get ticket by ID
 * @route   GET /api/support/:id
 * @access  Private
 */
exports.getTicketById = asyncHandler(async (req, res, next) => {
  const ticket = await SupportTicket.findById(req.params.id)
    .populate('client', 'name email companyName')
    .populate('assignedTo', 'name email')
    .populate('messages.sender', 'name role');

  if (!ticket) return next(new AppError('Ticket not found', 404));

  if (req.user.role === 'client' && ticket.client._id.toString() !== req.user._id.toString()) {
    return next(new AppError('Not authorized to view this ticket', 403));
  }

  res.status(200).json({ success: true, data: ticket });
});

/**
 * @desc    Create support ticket
 * @route   POST /api/support
 * @access  Private
 */
exports.createTicket = asyncHandler(async (req, res) => {
  const ticketNumber = await getNextSequence('ticket', 'TKT');

  const ticket = await SupportTicket.create({
    ...req.body,
    ticketNumber,
    client: req.user.role === 'client' ? req.user._id : (req.body.client || req.user._id),
    status: 'open',
    messages: req.body.description
      ? [{
          sender: req.user._id,
          role: req.user.role,
          senderName: req.user.name,
          message: req.body.description,
          timestamp: new Date(),
        }]
      : [],
  });

  res.status(201).json({ success: true, data: ticket });
});

/**
 * @desc    Update ticket (priority, assign, etc.)
 * @route   PUT /api/support/:id
 * @access  Admin
 */
exports.updateTicket = asyncHandler(async (req, res, next) => {
  const ticket = await SupportTicket.findById(req.params.id);
  if (!ticket) return next(new AppError('Ticket not found', 404));

  // Track if being assigned for first time
  if (req.body.assignedTo && !ticket.assignedTo) {
    req.body.status = req.body.status || 'in-progress';
  }

  const updated = await SupportTicket.findByIdAndUpdate(req.params.id, req.body, {
    new: true, runValidators: true,
  })
    .populate('client', 'name email')
    .populate('assignedTo', 'name email');

  res.status(200).json({ success: true, data: updated });
});

/**
 * @desc    Add message to ticket thread
 * @route   POST /api/support/:id/messages
 * @access  Private
 */
exports.addMessage = asyncHandler(async (req, res, next) => {
  const ticket = await SupportTicket.findById(req.params.id);
  if (!ticket) return next(new AppError('Ticket not found', 404));

  if (ticket.status === 'closed') {
    return next(new AppError('Cannot add messages to a closed ticket', 400));
  }

  if (req.user.role === 'client' && ticket.client.toString() !== req.user._id.toString()) {
    return next(new AppError('Not authorized', 403));
  }

  ticket.messages.push({
    sender: req.user._id,
    role: req.user.role,
    senderName: req.user.name,
    message: req.body.message,
    timestamp: new Date(),
  });

  // Set first response time for admin replies
  if (req.user.role === 'admin' && !ticket.firstResponseAt) {
    ticket.firstResponseAt = new Date();
    if (ticket.status === 'open') ticket.status = 'in-progress';
  }

  await ticket.save();
  res.status(200).json({ success: true, data: ticket });
});

/**
 * @desc    Resolve ticket
 * @route   PATCH /api/support/:id/resolve
 * @access  Admin
 */
exports.resolveTicket = asyncHandler(async (req, res, next) => {
  const ticket = await SupportTicket.findById(req.params.id);
  if (!ticket) return next(new AppError('Ticket not found', 404));
  if (ticket.status === 'closed') return next(new AppError('Ticket is already closed', 400));

  ticket.status = 'resolved';
  ticket.resolvedAt = new Date();
  ticket.resolutionNotes = req.body.notes || '';
  await ticket.save();

  res.status(200).json({ success: true, data: ticket });
});

/**
 * @desc    Close ticket
 * @route   PATCH /api/support/:id/close
 * @access  Admin or own client
 */
exports.closeTicket = asyncHandler(async (req, res, next) => {
  const ticket = await SupportTicket.findById(req.params.id);
  if (!ticket) return next(new AppError('Ticket not found', 404));

  if (req.user.role === 'client' && ticket.client.toString() !== req.user._id.toString()) {
    return next(new AppError('Not authorized', 403));
  }

  ticket.status = 'closed';
  ticket.closedAt = new Date();
  await ticket.save();

  res.status(200).json({ success: true, data: ticket });
});

/**
 * @desc    Get tickets by client
 * @route   GET /api/support/client/:clientId
 * @access  Admin or own client
 */
exports.getTicketsByClient = asyncHandler(async (req, res, next) => {
  const clientId = req.params.clientId;

  if (req.user.role === 'client' && req.user._id.toString() !== clientId) {
    return next(new AppError('Not authorized', 403));
  }

  const page = parseInt(req.query.page) || PAGINATION.DEFAULT_PAGE;
  const limit = Math.min(parseInt(req.query.limit) || PAGINATION.DEFAULT_LIMIT, PAGINATION.MAX_LIMIT);

  const filter = { client: clientId };
  if (req.query.status) filter.status = req.query.status;

  const [tickets, total] = await Promise.all([
    SupportTicket.find(filter).skip((page - 1) * limit).limit(limit).sort({ createdAt: -1 }),
    SupportTicket.countDocuments(filter),
  ]);

  res.status(200).json({ success: true, count: tickets.length, total, page, pages: Math.ceil(total / limit), data: tickets });
});

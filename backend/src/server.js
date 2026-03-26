require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const serverless = require('serverless-http');

const connectDB = require('./config/database');
const { errorHandler, AppError } = require('./middleware/errorHandler');

// Route imports
const authRoutes = require('./routes/authRoutes');
const clientRoutes = require('./routes/clientRoutes');
const productRoutes = require('./routes/productRoutes');
const orderRoutes = require('./routes/orderRoutes');
const invoiceRoutes = require('./routes/invoiceRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const inquiryRoutes = require('./routes/inquiryRoutes');
const supportRoutes = require('./routes/supportRoutes');
const reportRoutes = require('./routes/reportRoutes');

const app = express();

// =============================================
// Security & Utility Middleware
// =============================================
app.use(helmet());

// Global rate limiter — 100 requests per 15 minutes per IP
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { status: 'error', message: 'Too many requests, please try again later.' },
});

// Stricter limiter for auth endpoints — 20 requests per 15 minutes per IP
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { status: 'error', message: 'Too many authentication attempts, please try again later.' },
});

app.use(globalLimiter);

app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

if (process.env.NODE_ENV !== 'test') {
  app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
}

// =============================================
// Health Check
// =============================================
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
  });
});

// =============================================
// API Routes
// =============================================
const API_PREFIX = '/api';

app.use(`${API_PREFIX}/auth`, authLimiter, authRoutes);
app.use(`${API_PREFIX}/clients`, clientRoutes);
app.use(`${API_PREFIX}/products`, productRoutes);
app.use(`${API_PREFIX}/orders`, orderRoutes);
app.use(`${API_PREFIX}/invoices`, invoiceRoutes);
app.use(`${API_PREFIX}/payments`, paymentRoutes);
app.use(`${API_PREFIX}/inquiries`, inquiryRoutes);
app.use(`${API_PREFIX}/support`, supportRoutes);
app.use(`${API_PREFIX}/reports`, reportRoutes);

// =============================================
// 404 Handler
// =============================================
app.all('*', (req, res, next) => {
  next(new AppError(`Route ${req.originalUrl} not found`, 404));
});

// =============================================
// Global Error Handler
// =============================================
app.use(errorHandler);

// =============================================
// Server Bootstrap
// =============================================
const startServer = async () => {
  try {
    await connectDB();

    // Start cron jobs only in non-Lambda environments
    if (process.env.NODE_ENV !== 'test') {
      const { scheduleDailyAudit } = require('./cron/dailyAudit');
      scheduleDailyAudit();
    }

    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => {
      console.log(`VitalMEDS API running on port ${PORT} [${process.env.NODE_ENV || 'development'}]`);
    });
  } catch (err) {
    console.error('Failed to start server:', err.message);
    process.exit(1);
  }
};

// Start only when not running inside AWS Lambda
if (process.env.LAMBDA_TASK_ROOT === undefined) {
  startServer();
}

// =============================================
// Serverless Handler (AWS Lambda)
// =============================================
const handler = serverless(app, {
  request: async (req) => {
    // Ensure DB connection is alive before handling Lambda invocations
    await connectDB();
  },
});

module.exports = { app, handler };

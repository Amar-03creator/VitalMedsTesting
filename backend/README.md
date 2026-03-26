# VitalMEDS Backend API

Production-grade Node.js/Express REST API for the VitalMEDS pharmaceutical platform. Deployable locally or on AWS Lambda via the Serverless Framework.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js 18.x |
| Framework | Express.js |
| Database | MongoDB (Mongoose) |
| Auth | JWT + bcryptjs |
| Storage | AWS S3 (SDK v3) |
| Email | AWS SES (SDK v3) |
| PDF | PDFKit |
| Serverless | Serverless Framework + serverless-http |
| Cron | node-cron / EventBridge |
| Validation | Joi |

---

## Project Structure

```
backend/
├── src/
│   ├── config/
│   │   ├── database.js        # MongoDB connection
│   │   └── aws.js             # S3 & SES clients
│   ├── models/                # Mongoose schemas
│   │   ├── Client.js
│   │   ├── Company.js
│   │   ├── Product.js
│   │   ├── Batch.js
│   │   ├── Inquiry.js
│   │   ├── Order.js
│   │   ├── SalesInvoice.js
│   │   ├── PaymentReceipt.js
│   │   ├── PurchaseBill.js
│   │   ├── CreditNote.js
│   │   ├── DebitNote.js
│   │   ├── SupportTicket.js
│   │   └── AuditLog.js
│   ├── controllers/           # Route handlers
│   ├── routes/                # Express routers
│   ├── middleware/
│   │   ├── authMiddleware.js  # JWT protect + authorize
│   │   ├── errorHandler.js    # Global error handler
│   │   └── validator.js       # Joi validation middleware
│   ├── utils/
│   │   ├── constants.js       # App-wide constants
│   │   ├── counterHelper.js   # Auto-increment document numbers
│   │   ├── fifoHelper.js      # FIFO stock & payment allocation
│   │   ├── pdfGenerator.js    # Invoice & quote PDF generation
│   │   ├── s3Helper.js        # S3 upload/download helpers
│   │   └── emailHelper.js     # SES email helpers
│   ├── cron/
│   │   ├── dailyAudit.js          # node-cron scheduler
│   │   └── dailyAuditHandler.js   # Lambda handler for cron
│   └── server.js              # Express app + Lambda export
├── .env.example
├── package.json
├── serverless.yml
└── README.md
```

---

## Quick Start (Local Development)

### 1. Prerequisites

- Node.js >= 18
- MongoDB Atlas cluster (or local MongoDB)
- AWS account with S3 and SES configured

### 2. Install Dependencies

```bash
cd backend
npm install
```

### 3. Configure Environment

```bash
cp .env.example .env
# Edit .env with your values
```

Required variables:
```
MONGODB_URI=mongodb+srv://...
JWT_SECRET=your_secret_here
AWS_REGION=ap-south-1
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
S3_BUCKET_NAME=vitalmeds-documents
SES_FROM_EMAIL=noreply@vitalmeds.in
```

### 4. Run Development Server

```bash
npm run dev
```

Server starts at `http://localhost:5000`

---

## API Endpoints

### Authentication
| Method | Path | Description |
|---|---|---|
| POST | `/api/auth/register` | Register new client |
| POST | `/api/auth/login` | Login, get JWT |
| POST | `/api/auth/logout` | Logout (audit log) |
| GET | `/api/auth/me` | Get current user |
| PUT | `/api/auth/profile` | Update profile |
| PUT | `/api/auth/change-password` | Change password |

### Clients (Admin)
| Method | Path | Description |
|---|---|---|
| GET | `/api/clients` | List all clients |
| POST | `/api/clients` | Create client |
| GET | `/api/clients/:id` | Get client |
| PUT | `/api/clients/:id` | Update client |
| DELETE | `/api/clients/:id` | Deactivate client |
| PATCH | `/api/clients/:id/status` | Update status |
| GET | `/api/clients/:id/balance` | Balance summary |
| POST | `/api/clients/:id/kyc` | Upload KYC doc |

### Products
| Method | Path | Description |
|---|---|---|
| GET | `/api/products` | List products |
| POST | `/api/products` | Create product |
| GET | `/api/products/low-stock` | Low stock list |
| GET | `/api/products/expiring-batches` | Expiring batches |
| GET | `/api/products/:id` | Get product |
| PUT | `/api/products/:id` | Update product |
| GET | `/api/products/:id/batches` | Product batches |
| POST | `/api/products/:id/batches` | Add batch |
| PUT | `/api/products/:id/batches/:batchId` | Update batch |

### Inquiries
| Method | Path | Description |
|---|---|---|
| GET | `/api/inquiries` | List inquiries |
| POST | `/api/inquiries` | Create inquiry |
| GET | `/api/inquiries/:id` | Get inquiry |
| PUT | `/api/inquiries/:id` | Update inquiry |
| POST | `/api/inquiries/:id/quote` | Create quote |
| POST | `/api/inquiries/:id/convert` | Convert to order |
| PATCH | `/api/inquiries/:id/reject` | Reject inquiry |

### Orders
| Method | Path | Description |
|---|---|---|
| GET | `/api/orders` | List orders |
| POST | `/api/orders` | Create order |
| GET | `/api/orders/:id` | Get order |
| PUT | `/api/orders/:id` | Update order |
| PATCH | `/api/orders/:id/status` | Update status |
| PATCH | `/api/orders/:id/cancel` | Cancel order |
| GET | `/api/orders/client/:clientId` | Client orders |

### Invoices
| Method | Path | Description |
|---|---|---|
| GET | `/api/invoices` | List invoices |
| POST | `/api/invoices/from-order/:orderId` | Create from order |
| GET | `/api/invoices/overdue` | Overdue invoices |
| GET | `/api/invoices/:id` | Get invoice |
| POST | `/api/invoices/:id/pdf` | Generate PDF |
| POST | `/api/invoices/:id/send-email` | Email invoice |
| GET | `/api/invoices/client/:clientId` | Client invoices |

### Payments
| Method | Path | Description |
|---|---|---|
| GET | `/api/payments` | List payments |
| POST | `/api/payments` | Record payment (FIFO) |
| GET | `/api/payments/:id` | Get payment |
| GET | `/api/payments/client/:clientId` | Client payments |
| GET | `/api/payments/outstanding/:clientId` | Outstanding balance |

### Support
| Method | Path | Description |
|---|---|---|
| GET | `/api/support` | List tickets |
| POST | `/api/support` | Create ticket |
| GET | `/api/support/:id` | Get ticket |
| PUT | `/api/support/:id` | Update ticket |
| POST | `/api/support/:id/messages` | Add message |
| PATCH | `/api/support/:id/resolve` | Resolve ticket |
| PATCH | `/api/support/:id/close` | Close ticket |
| GET | `/api/support/client/:clientId` | Client tickets |

### Reports (Admin)
| Method | Path | Description |
|---|---|---|
| GET | `/api/reports/sales` | Sales report |
| GET | `/api/reports/gst` | GST summary |
| GET | `/api/reports/inventory` | Inventory report |
| GET | `/api/reports/payments` | Payment report |
| GET | `/api/reports/replenishment` | Forecast |
| GET | `/api/reports/fifo/stock-summary` | FIFO stock |
| POST | `/api/reports/fifo/deduct` | Manual deduction |
| GET | `/api/reports/fifo/movement` | Stock movement |

---

## Authentication

All protected routes require a Bearer token:

```
Authorization: Bearer <jwt_token>
```

Roles: `client` | `admin`

---

## Deployment (AWS Lambda)

### Prerequisites
```bash
npm install -g serverless
```

### Deploy to dev
```bash
npx serverless deploy --stage dev
```

### Deploy to production
```bash
npx serverless deploy --stage prod
```

### Store secrets in AWS SSM Parameter Store
```bash
aws ssm put-parameter --name "/vitalmeds/dev/MONGODB_URI" --value "mongodb+srv://..." --type "SecureString"
aws ssm put-parameter --name "/vitalmeds/dev/JWT_SECRET" --value "secret" --type "SecureString"
```

### Local Lambda simulation
```bash
npx serverless offline
```

---

## Key Features

### FIFO Stock Management
- Inventory deductions use oldest batches first (sorted by expiry date)
- Auto-skips expired batches
- Transaction-safe with MongoDB sessions

### FIFO Payment Allocation
- Payments applied to oldest unpaid invoices first
- Automatic `paymentStatus` updates (unpaid → partial → paid)
- Unallocated balance tracked on receipt

### Auto-Numbering
- All documents get sequential numbers: `INQ-0001`, `ORD-0001`, `INV-0001`, `RCP-0001`, `TKT-0001`
- Thread-safe using MongoDB `findOneAndUpdate` with `upsert`

### PDF Generation
- Tax invoices with GST breakdown (CGST/SGST/IGST)
- Quotation PDFs
- Auto-uploaded to S3, emailed via SES

### Daily Cron Audit
- Flags expired batches automatically
- Identifies low stock vs reorder point
- Sends admin alert email with summary

---

## Running Tests

```bash
npm test
```

---

## Environment Variables Reference

See [`.env.example`](.env.example) for the full list.

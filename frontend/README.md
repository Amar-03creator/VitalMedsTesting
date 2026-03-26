# VitalMEDS Frontend

A modern React.js frontend for the VitalMEDS pharmaceutical distribution platform.

## Tech Stack

- **React 18** with functional components and hooks
- **Vite** – fast development server and build tool
- **React Router v6** – client-side routing with nested routes
- **Tailwind CSS** + `@tailwindcss/forms` – utility-first styling
- **Headless UI** – accessible modal, menu, and transition components
- **Heroicons** – icon library
- **Recharts** – charts and data visualisation
- **AWS Amplify** – Cognito authentication
- **Axios** – HTTP client with interceptors
- **react-hot-toast** – toast notifications
- **date-fns** – date formatting and utilities

---

## Getting Started

### 1. Install dependencies

```bash
cd frontend
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
```

Edit `.env` and fill in:

| Variable | Description |
|---|---|
| `VITE_API_BASE_URL` | Backend API URL (e.g. `http://localhost:5000/api`) |
| `VITE_AWS_REGION` | AWS region (e.g. `ap-south-1`) |
| `VITE_COGNITO_USER_POOL_ID` | Cognito User Pool ID |
| `VITE_COGNITO_CLIENT_ID` | Cognito App Client ID |

### 3. Start development server

```bash
npm run dev
```

App runs at **http://localhost:3000**

### 4. Build for production

```bash
npm run build
```

Output is in `dist/`.

### 5. Preview production build

```bash
npm run preview
```

---

## Project Structure

```
src/
├── api/                  # Axios API client + per-resource functions
│   ├── axiosClient.js    # Axios instance with auth + error interceptors
│   ├── authApi.js
│   ├── clientApi.js
│   ├── productApi.js
│   ├── orderApi.js
│   ├── invoiceApi.js
│   └── reportApi.js
│
├── context/              # React Context providers
│   ├── AuthContext.jsx   # Cognito authentication state
│   ├── CartContext.jsx   # Inquiry cart state
│   └── NotificationContext.jsx
│
├── hooks/                # Custom React hooks
│   ├── useAuth.js
│   ├── useApi.js         # Generic loading/error wrapper
│   └── useForm.js        # Form state + validation
│
├── components/
│   ├── Common/           # Shared UI components
│   │   ├── Loading.jsx
│   │   ├── Navbar.jsx
│   │   ├── Sidebar.jsx
│   │   ├── Modal.jsx
│   │   ├── Table.jsx
│   │   ├── Form.jsx
│   │   └── ProtectedRoute.jsx
│   │
│   ├── Auth/
│   │   ├── Login.jsx
│   │   └── Register.jsx
│   │
│   ├── Admin/            # Admin-only pages
│   │   ├── Dashboard.jsx
│   │   ├── CustomerManagement.jsx
│   │   ├── ProductManagement.jsx
│   │   ├── OrderManagement.jsx
│   │   ├── InventoryManagement.jsx
│   │   ├── FinancialHub.jsx
│   │   ├── ReportGeneration.jsx
│   │   └── SupportManagement.jsx
│   │
│   └── Client/           # Client-facing pages
│       ├── Dashboard.jsx
│       ├── ProductBrowse.jsx
│       ├── CreateInquiry.jsx
│       ├── OrderHistory.jsx
│       ├── InvoiceView.jsx
│       ├── PaymentTracking.jsx
│       └── SupportTicket.jsx
│
├── pages/                # Layout wrappers
│   ├── AdminPages.jsx    # Navbar + Sidebar + Outlet (admin)
│   ├── ClientPages.jsx   # Navbar + Sidebar + Outlet (client)
│   ├── NotFound.jsx
│   └── Unauthorized.jsx
│
├── styles/
│   └── globals.css       # Tailwind directives + custom utilities
│
├── App.jsx               # Route definitions
└── main.jsx              # Entry point with Amplify + Toaster
```

---

## Routes

| Path | Component | Access |
|---|---|---|
| `/login` | `Login` | Public |
| `/register` | `Register` | Public |
| `/admin/dashboard` | `AdminDashboard` | Admin only |
| `/admin/customers` | `CustomerManagement` | Admin only |
| `/admin/products` | `ProductManagement` | Admin only |
| `/admin/orders` | `OrderManagement` | Admin only |
| `/admin/inventory` | `InventoryManagement` | Admin only |
| `/admin/financial` | `FinancialHub` | Admin only |
| `/admin/reports` | `ReportGeneration` | Admin only |
| `/admin/support` | `SupportManagement` | Admin only |
| `/client/dashboard` | `ClientDashboard` | Client only |
| `/client/products` | `ProductBrowse` | Client only |
| `/client/inquiries` | `CreateInquiry` | Client only |
| `/client/orders` | `OrderHistory` | Client only |
| `/client/invoices` | `InvoiceView` | Client only |
| `/client/payments` | `PaymentTracking` | Client only |
| `/client/support` | `SupportTicket` | Client only |
| `/unauthorized` | `Unauthorized` | Public |
| `*` | `NotFound` | Public |

---

## Authentication Flow

1. User logs in via Cognito (AWS Amplify)
2. JWT ID token stored in `localStorage`
3. Axios interceptor attaches token to every request
4. `ProtectedRoute` checks auth + role before rendering
5. Token auto-refreshed every 50 minutes

---

## Key Features

### Admin Portal
- **Dashboard** – KPI stats, revenue charts, alerts
- **Customer Management** – KYC review, credit limits, status management
- **Product Management** – CRUD with batch tracking and FIFO visibility
- **Order Management** – Status workflow, invoice generation
- **Inventory** – Stock summary, expiry alerts, low-stock monitoring
- **Financial Hub** – Invoices, payments (FIFO allocation), overdue tracking
- **Reports** – Sales, GST summary (CGST/SGST/IGST), inventory, forecasting
- **Support** – Ticket management with threaded replies

### Client Portal
- **Dashboard** – Orders, balance, alerts summary
- **Browse Products** – Search, filter, add-to-cart
- **Inquiry Cart** – Build and submit orders
- **Order History** – Status tracking with timeline
- **Invoices** – View, download PDF
- **Payments** – Outstanding balance, payment history
- **Support** – Create and manage tickets

---

## Environment Variables Reference

```dotenv
# Required
VITE_API_BASE_URL=http://localhost:5000/api
VITE_AWS_REGION=ap-south-1
VITE_COGNITO_USER_POOL_ID=ap-south-1_XXXXXXXXX
VITE_COGNITO_CLIENT_ID=xxxxxxxxxxxxxxxxxxxxxxxxxx
```

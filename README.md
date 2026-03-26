# VitalMEDS Platform

A complete, production-ready pharmaceutical distribution management platform built with Node.js/Express (AWS Lambda), React 18, MongoDB Atlas, and AWS services.

## Architecture

```
VitalMedsTesting/
├── backend/    # Node.js/Express API on AWS Lambda
└── frontend/   # React 18 SPA with Vite
```

## Features

- **Authentication**: AWS Cognito with JWT
- **Role-based Access**: Admin and Client dashboards
- **FIFO Inventory**: Oldest-batch-first stock deduction
- **FIFO Payments**: Oldest-invoice-first payment allocation
- **Inquiry → Quote → Order** workflow
- **Invoice Generation**: PDF export via PDFKit + S3
- **GST Reports**: CGST/SGST/IGST breakdown
- **Support Tickets**: Threaded messaging
- **Smart Replenishment**: Sales velocity forecasting
- **Daily Audit**: Expiry and low-stock alerts via EventBridge

## Quick Start

### Prerequisites
- Node.js 18+
- MongoDB Atlas account
- AWS account (Cognito, S3, SES)

### Backend
```bash
cd backend
cp .env.example .env
# Edit .env with your credentials
npm install
npm run dev
```

### Frontend
```bash
cd frontend
cp .env.example .env
# Edit .env with your credentials
npm install
npm run dev
```

## Deployment

See [DEPLOYMENT.md](DEPLOYMENT.md) for full AWS deployment instructions.

## API Documentation

See [backend/README.md](backend/README.md) for API reference.

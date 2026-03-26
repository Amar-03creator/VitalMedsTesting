# VitalMEDS Deployment Guide

## Prerequisites

1. AWS account with appropriate permissions
2. MongoDB Atlas cluster (M0 free tier works)
3. Node.js 18+, npm
4. Serverless Framework: `npm install -g serverless`

---

## 1. MongoDB Atlas Setup

1. Create a free cluster at [mongodb.com/atlas](https://mongodb.com/atlas)
2. Create a database user
3. Whitelist your IP or use `0.0.0.0/0` for Lambda
4. Copy the connection string (SRV format)

---

## 2. AWS Cognito Setup

1. Go to **AWS Cognito → Create User Pool**
2. Configure:
   - Sign-in: email
   - Password policy: 8+ chars, mixed case, numbers
   - MFA: optional
3. Create an **App Client** (no secret for SPA)
4. Note: **User Pool ID** and **Client ID**

---

## 3. AWS S3 Setup

1. Create an S3 bucket: `vitalmeds-documents-{env}`
2. Block public access (files served via signed URLs)
3. CORS configuration:
```json
[{
  "AllowedHeaders": ["*"],
  "AllowedMethods": ["GET", "PUT", "POST", "DELETE"],
  "AllowedOrigins": ["https://your-frontend-domain.com"],
  "MaxAgeSeconds": 3000
}]
```

---

## 4. AWS SES Setup

1. Go to **AWS SES → Verified Identities**
2. Verify your sender email address
3. If in sandbox mode, also verify recipient emails
4. To exit sandbox: request production access

---

## 5. Backend Deployment (AWS Lambda)

```bash
cd backend
cp .env.example .env
# Fill in all environment variables

npm install
npx serverless deploy --stage prod
```

This deploys:
- API Gateway HTTP API
- Lambda function for all routes
- EventBridge rule for daily audit cron

**Output**: Copy the `endpoints` URL for frontend config.

---

## 6. Frontend Deployment

### Option A: AWS Amplify Hosting (Recommended)

1. Push to GitHub
2. Go to **AWS Amplify → New App → Host web app**
3. Connect your GitHub repository
4. Build settings (auto-detected for Vite):
   - Build command: `cd frontend && npm run build`
   - Output directory: `frontend/dist`
5. Set environment variables in Amplify console:
   - `VITE_API_BASE_URL` = Lambda endpoint from step 5
   - `VITE_AWS_REGION` = your region
   - `VITE_COGNITO_USER_POOL_ID`
   - `VITE_COGNITO_CLIENT_ID`
6. Deploy

### Option B: S3 + CloudFront

```bash
cd frontend
npm run build
aws s3 sync dist/ s3://vitalmeds-frontend-bucket --delete
# Invalidate CloudFront distribution
aws cloudfront create-invalidation --distribution-id YOUR_ID --paths "/*"
```

---

## 7. Environment Variables Reference

### Backend (.env)
| Variable | Description |
|---|---|
| `NODE_ENV` | `production` |
| `PORT` | `3000` (local only) |
| `MONGODB_URI` | MongoDB Atlas SRV connection string |
| `JWT_SECRET` | Random 64-char string |
| `JWT_EXPIRES_IN` | `7d` |
| `AWS_REGION` | e.g. `ap-south-1` |
| `AWS_ACCESS_KEY_ID` | IAM user access key |
| `AWS_SECRET_ACCESS_KEY` | IAM user secret |
| `S3_BUCKET_NAME` | S3 bucket name |
| `SES_FROM_EMAIL` | Verified sender email |
| `COGNITO_USER_POOL_ID` | Cognito User Pool ID |
| `COGNITO_CLIENT_ID` | Cognito App Client ID |
| `FRONTEND_URL` | Frontend domain for CORS |

### Frontend (.env)
| Variable | Description |
|---|---|
| `VITE_API_BASE_URL` | Lambda API Gateway URL |
| `VITE_AWS_REGION` | AWS region |
| `VITE_COGNITO_USER_POOL_ID` | Cognito User Pool ID |
| `VITE_COGNITO_CLIENT_ID` | Cognito App Client ID |

---

## 8. First Run Setup

After deployment, create the admin user in Cognito:

```bash
aws cognito-idp admin-create-user \
  --user-pool-id YOUR_POOL_ID \
  --username admin@yourcompany.com \
  --user-attributes Name=email,Value=admin@yourcompany.com Name=custom:role,Value=admin \
  --temporary-password "TempPass123!"

aws cognito-idp admin-set-user-password \
  --user-pool-id YOUR_POOL_ID \
  --username admin@yourcompany.com \
  --password "YourSecurePass123!" \
  --permanent
```

---

## 9. Local Development

```bash
# Terminal 1 - Backend
cd backend
npm run dev   # nodemon on port 3000

# Terminal 2 - Frontend
cd frontend
npm run dev   # Vite on port 5173
```

Frontend proxies `/api` to `http://localhost:3000` via vite.config.js.

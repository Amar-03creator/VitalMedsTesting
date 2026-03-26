const { S3Client } = require('@aws-sdk/client-s3');
const { SESClient } = require('@aws-sdk/client-ses');

const awsConfig = {
  region: process.env.AWS_REGION || 'ap-south-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
};

/**
 * AWS S3 Client (SDK v3)
 */
const s3Client = new S3Client(awsConfig);

/**
 * AWS SES Client (SDK v3)
 */
const sesClient = new SESClient(awsConfig);

module.exports = { s3Client, sesClient };

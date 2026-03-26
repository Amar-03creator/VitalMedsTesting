const {
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
} = require('@aws-sdk/client-s3');
const { getSignedUrl: awsGetSignedUrl } = require('@aws-sdk/s3-request-presigner');
const { s3Client } = require('../config/aws');

const BUCKET = process.env.S3_BUCKET_NAME;

/**
 * Upload a file buffer to S3.
 *
 * @param {Buffer} buffer - File content
 * @param {string} key - S3 object key (path/filename)
 * @param {string} contentType - MIME type
 * @returns {Promise<string>} Public or CDN URL of the uploaded file
 */
const uploadFile = async (buffer, key, contentType) => {
  const command = new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    Body: buffer,
    ContentType: contentType,
    ServerSideEncryption: 'AES256',
  });

  await s3Client.send(command);
  return `https://${BUCKET}.s3.${process.env.AWS_REGION || 'ap-south-1'}.amazonaws.com/${key}`;
};

/**
 * Delete a file from S3.
 *
 * @param {string} key - S3 object key
 */
const deleteFile = async (key) => {
  const command = new DeleteObjectCommand({ Bucket: BUCKET, Key: key });
  await s3Client.send(command);
};

/**
 * Generate a pre-signed URL for temporary access to a private S3 object.
 *
 * @param {string} key - S3 object key
 * @param {number} [expiresIn=3600] - Expiry in seconds (default 1 hour)
 * @returns {Promise<string>} Pre-signed URL
 */
const getSignedUrl = async (key, expiresIn = 3600) => {
  const command = new GetObjectCommand({ Bucket: BUCKET, Key: key });
  return awsGetSignedUrl(s3Client, command, { expiresIn });
};

/**
 * Extract S3 key from a full S3 URL.
 *
 * @param {string} url - Full S3 URL
 * @returns {string} S3 key
 */
const extractKeyFromUrl = (url) => {
  if (!url) return null;
  const prefix = `https://${BUCKET}.s3.${process.env.AWS_REGION || 'ap-south-1'}.amazonaws.com/`;
  return url.startsWith(prefix) ? url.slice(prefix.length) : url;
};

module.exports = { uploadFile, deleteFile, getSignedUrl, extractKeyFromUrl };

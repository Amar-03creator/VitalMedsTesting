const { SendEmailCommand } = require('@aws-sdk/client-ses');
const { sesClient } = require('../config/aws');

const FROM_EMAIL = process.env.SES_FROM_EMAIL || 'noreply@vitalmeds.in';

/**
 * Send an email via AWS SES.
 *
 * @param {string|string[]} to - Recipient email(s)
 * @param {string} subject - Email subject
 * @param {string} htmlBody - HTML email body
 * @param {string} [textBody] - Optional plain text fallback
 */
const sendEmail = async (to, subject, htmlBody, textBody = '') => {
  const toAddresses = Array.isArray(to) ? to : [to];

  const command = new SendEmailCommand({
    Source: FROM_EMAIL,
    Destination: { ToAddresses: toAddresses },
    Message: {
      Subject: { Data: subject, Charset: 'UTF-8' },
      Body: {
        Html: { Data: htmlBody, Charset: 'UTF-8' },
        ...(textBody && { Text: { Data: textBody, Charset: 'UTF-8' } }),
      },
    },
  });

  const result = await sesClient.send(command);
  return result.MessageId;
};

/**
 * Send an order confirmation email to the client.
 *
 * @param {Object} order - Populated Order document
 * @param {Object} client - Client document
 */
const sendOrderConfirmation = async (order, client) => {
  const itemRows = (order.items || [])
    .map(
      (item) =>
        `<tr>
          <td style="padding:8px;border-bottom:1px solid #eee">${(item.product && item.product.name) || 'N/A'}</td>
          <td style="padding:8px;border-bottom:1px solid #eee;text-align:center">${item.qty}</td>
          <td style="padding:8px;border-bottom:1px solid #eee;text-align:right">₹${item.unitPrice.toFixed(2)}</td>
          <td style="padding:8px;border-bottom:1px solid #eee;text-align:right">₹${item.amount.toFixed(2)}</td>
        </tr>`
    )
    .join('');

  const html = `
<!DOCTYPE html>
<html>
<body style="font-family:Arial,sans-serif;background:#f4f4f4;padding:20px">
  <div style="max-width:600px;margin:0 auto;background:#fff;border-radius:8px;overflow:hidden">
    <div style="background:#1a3c5e;padding:20px;text-align:center">
      <h1 style="color:#fff;margin:0">Order Confirmed</h1>
    </div>
    <div style="padding:30px">
      <p>Dear ${client.name},</p>
      <p>Your order <strong>${order.orderNumber}</strong> has been confirmed.</p>
      <table style="width:100%;border-collapse:collapse;margin:20px 0">
        <thead>
          <tr style="background:#f8f8f8">
            <th style="padding:8px;text-align:left">Product</th>
            <th style="padding:8px;text-align:center">Qty</th>
            <th style="padding:8px;text-align:right">Unit Price</th>
            <th style="padding:8px;text-align:right">Amount</th>
          </tr>
        </thead>
        <tbody>${itemRows}</tbody>
        <tfoot>
          <tr>
            <td colspan="3" style="padding:8px;text-align:right;font-weight:bold">Total GST:</td>
            <td style="padding:8px;text-align:right">₹${(order.totalGst || 0).toFixed(2)}</td>
          </tr>
          <tr>
            <td colspan="3" style="padding:8px;text-align:right;font-weight:bold;font-size:16px">Total:</td>
            <td style="padding:8px;text-align:right;font-weight:bold;font-size:16px;color:#1a3c5e">₹${(order.totalAmount || 0).toFixed(2)}</td>
          </tr>
        </tfoot>
      </table>
      <p>We will notify you when your order is shipped.</p>
      <p>Thank you for choosing VitalMEDS!</p>
    </div>
    <div style="background:#f8f8f8;padding:15px;text-align:center;color:#888;font-size:12px">
      VitalMEDS Pharmaceutical Platform | ${process.env.FRONTEND_URL || ''}
    </div>
  </div>
</body>
</html>`;

  return sendEmail(client.email, `Order Confirmed: ${order.orderNumber}`, html);
};

/**
 * Send an invoice email with PDF attachment via SES.
 * Note: SES raw email required for attachments; this sends a link instead
 * unless a PDF URL is provided.
 *
 * @param {Object} invoice - SalesInvoice document
 * @param {Object} client - Client document
 * @param {string} [pdfUrl] - S3 URL or pre-signed URL of the PDF
 */
const sendInvoiceEmail = async (invoice, client, pdfUrl = null) => {
  const downloadLink = pdfUrl
    ? `<p><a href="${pdfUrl}" style="background:#1a3c5e;color:#fff;padding:10px 20px;border-radius:4px;text-decoration:none">Download Invoice PDF</a></p>`
    : '';

  const html = `
<!DOCTYPE html>
<html>
<body style="font-family:Arial,sans-serif;background:#f4f4f4;padding:20px">
  <div style="max-width:600px;margin:0 auto;background:#fff;border-radius:8px;overflow:hidden">
    <div style="background:#1a3c5e;padding:20px;text-align:center">
      <h1 style="color:#fff;margin:0">Invoice</h1>
    </div>
    <div style="padding:30px">
      <p>Dear ${client.name},</p>
      <p>Please find your invoice <strong>${invoice.invoiceNumber}</strong> for order <strong>${(invoice.order && invoice.order.orderNumber) || ''}</strong>.</p>
      <table style="width:100%;border-collapse:collapse;margin:20px 0">
        <tr><td style="padding:6px;color:#888">Invoice Date</td><td style="padding:6px">${new Date(invoice.createdAt).toLocaleDateString('en-IN')}</td></tr>
        <tr><td style="padding:6px;color:#888">Due Date</td><td style="padding:6px">${new Date(invoice.dueDate).toLocaleDateString('en-IN')}</td></tr>
        <tr><td style="padding:6px;color:#888">Total Amount</td><td style="padding:6px;font-weight:bold;font-size:16px;color:#1a3c5e">₹${(invoice.totalAmount || 0).toFixed(2)}</td></tr>
        <tr><td style="padding:6px;color:#888">Status</td><td style="padding:6px">${(invoice.paymentStatus || '').toUpperCase()}</td></tr>
      </table>
      ${downloadLink}
      <p>Please make payment before the due date to avoid late charges.</p>
    </div>
    <div style="background:#f8f8f8;padding:15px;text-align:center;color:#888;font-size:12px">
      VitalMEDS Pharmaceutical Platform
    </div>
  </div>
</body>
</html>`;

  return sendEmail(client.email, `Invoice ${invoice.invoiceNumber} - VitalMEDS`, html);
};

/**
 * Send a low stock / expiry alert email to admin.
 *
 * @param {Array} lowStockItems - Array of low stock product info
 * @param {Array} expiringBatches - Array of expiring batch info
 */
const sendAdminAlertEmail = async (lowStockItems = [], expiringBatches = []) => {
  const adminEmail = process.env.SES_ADMIN_EMAIL || FROM_EMAIL;

  const lowStockRows = lowStockItems
    .map((p) => `<tr><td style="padding:6px">${p.name}</td><td style="padding:6px">${p.sku}</td><td style="padding:6px;color:#dc3545">${p.totalStock}</td><td style="padding:6px">${p.reorderPoint}</td></tr>`)
    .join('');

  const expiryRows = expiringBatches
    .map((b) => `<tr><td style="padding:6px">${b.productName}</td><td style="padding:6px">${b.batchNumber}</td><td style="padding:6px">${b.availableQty}</td><td style="padding:6px;color:#ffc107">${new Date(b.expiryDate).toLocaleDateString('en-IN')}</td></tr>`)
    .join('');

  const html = `
<!DOCTYPE html>
<html>
<body style="font-family:Arial,sans-serif;background:#f4f4f4;padding:20px">
  <div style="max-width:700px;margin:0 auto;background:#fff;border-radius:8px;padding:30px">
    <h2 style="color:#1a3c5e">Daily Inventory Alert - VitalMEDS</h2>
    <p>${new Date().toLocaleDateString('en-IN')}</p>
    ${lowStockRows ? `
    <h3 style="color:#dc3545">Low Stock Items (${lowStockItems.length})</h3>
    <table style="width:100%;border-collapse:collapse">
      <thead><tr style="background:#f8f8f8"><th style="padding:6px;text-align:left">Product</th><th style="padding:6px;text-align:left">SKU</th><th style="padding:6px;text-align:left">Stock</th><th style="padding:6px;text-align:left">Reorder At</th></tr></thead>
      <tbody>${lowStockRows}</tbody>
    </table>` : '<p style="color:#28a745">✓ No low stock items</p>'}
    ${expiryRows ? `
    <h3 style="color:#ffc107">Expiring Soon (${expiringBatches.length} batches)</h3>
    <table style="width:100%;border-collapse:collapse">
      <thead><tr style="background:#f8f8f8"><th style="padding:6px;text-align:left">Product</th><th style="padding:6px;text-align:left">Batch</th><th style="padding:6px;text-align:left">Qty</th><th style="padding:6px;text-align:left">Expiry</th></tr></thead>
      <tbody>${expiryRows}</tbody>
    </table>` : '<p style="color:#28a745">✓ No batches expiring within 30 days</p>'}
  </div>
</body>
</html>`;

  return sendEmail(adminEmail, `[VitalMEDS] Daily Inventory Alert - ${new Date().toLocaleDateString('en-IN')}`, html);
};

module.exports = {
  sendEmail,
  sendOrderConfirmation,
  sendInvoiceEmail,
  sendAdminAlertEmail,
};

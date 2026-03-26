const PDFDocument = require('pdfkit');

/**
 * Format currency for Indian locale.
 */
const formatCurrency = (amount) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(amount || 0);

/**
 * Format date to DD/MM/YYYY.
 */
const formatDate = (date) => {
  if (!date) return 'N/A';
  return new Date(date).toLocaleDateString('en-IN');
};

/**
 * Draw a horizontal line across the page.
 */
const drawHLine = (doc, y, color = '#CCCCCC') => {
  doc.moveTo(50, y).lineTo(550, y).strokeColor(color).stroke();
};

/**
 * Add a standard page header with company info.
 */
const addHeader = (doc, company, title) => {
  doc.fillColor('#1a3c5e').fontSize(20).font('Helvetica-Bold').text(company.name || 'VitalMEDS', 50, 50);
  doc.fillColor('#555').fontSize(9).font('Helvetica')
    .text(company.address ? `${company.address.street}, ${company.address.city}, ${company.address.state} - ${company.address.pincode}` : '', 50, 75)
    .text(`GST: ${company.gstNumber || 'N/A'}  |  PAN: ${company.panNumber || 'N/A'}`, 50, 87)
    .text(`Phone: ${company.phone || 'N/A'}  |  Email: ${company.email || 'N/A'}`, 50, 99);

  doc.fillColor('#1a3c5e').fontSize(16).font('Helvetica-Bold').text(title, 350, 55, { align: 'right', width: 200 });

  drawHLine(doc, 115, '#1a3c5e');
};

/**
 * Add footer with page number.
 */
const addFooter = (doc) => {
  const pageHeight = doc.page.height;
  drawHLine(doc, pageHeight - 60, '#CCCCCC');
  doc.fillColor('#888').fontSize(8).font('Helvetica')
    .text('This is a computer generated document. No signature required.', 50, pageHeight - 50, { align: 'center', width: 500 });
};

/**
 * Generate an Invoice PDF buffer.
 *
 * @param {Object} invoice - Populated SalesInvoice document
 * @param {Object} company - Company info
 * @returns {Promise<Buffer>}
 */
const generateInvoicePDF = (invoice, company = {}) => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 50, size: 'A4' });
      const buffers = [];

      doc.on('data', (chunk) => buffers.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', reject);

      // Header
      addHeader(doc, company, 'TAX INVOICE');

      // Invoice meta
      const metaY = 130;
      doc.fillColor('#333').fontSize(9).font('Helvetica-Bold')
        .text('Invoice No:', 50, metaY).text('Date:', 50, metaY + 14).text('Due Date:', 50, metaY + 28);
      doc.font('Helvetica')
        .text(invoice.invoiceNumber || 'N/A', 120, metaY)
        .text(formatDate(invoice.createdAt), 120, metaY + 14)
        .text(formatDate(invoice.dueDate), 120, metaY + 28);

      // Bill To
      doc.font('Helvetica-Bold').text('Bill To:', 300, metaY);
      const client = invoice.client || {};
      doc.font('Helvetica')
        .text(client.companyName || client.name || 'N/A', 300, metaY + 14)
        .text(client.email || '', 300, metaY + 28)
        .text(client.phone || '', 300, metaY + 42)
        .text(client.gstNumber ? `GST: ${client.gstNumber}` : '', 300, metaY + 56);

      drawHLine(doc, metaY + 75);

      // Table header
      const tableY = metaY + 85;
      const cols = { sno: 50, name: 75, hsn: 240, qty: 285, price: 320, disc: 365, gst: 405, amount: 460 };
      const headerBg = '#1a3c5e';

      doc.rect(50, tableY, 500, 18).fill(headerBg);
      doc.fillColor('#FFF').fontSize(8).font('Helvetica-Bold')
        .text('#', cols.sno, tableY + 5)
        .text('Product', cols.name, tableY + 5)
        .text('HSN', cols.hsn, tableY + 5)
        .text('Qty', cols.qty, tableY + 5)
        .text('Rate', cols.price, tableY + 5)
        .text('Disc%', cols.disc, tableY + 5)
        .text('GST%', cols.gst, tableY + 5)
        .text('Amount', cols.amount, tableY + 5);

      // Table rows
      let rowY = tableY + 22;
      doc.fillColor('#333').font('Helvetica').fontSize(8);

      (invoice.items || []).forEach((item, i) => {
        const bg = i % 2 === 0 ? '#F9F9F9' : '#FFFFFF';
        doc.rect(50, rowY, 500, 16).fill(bg);
        doc.fillColor('#333')
          .text(i + 1, cols.sno, rowY + 3)
          .text(item.productName || (item.product && item.product.name) || 'N/A', cols.name, rowY + 3, { width: 160, ellipsis: true })
          .text(item.hsnCode || '', cols.hsn, rowY + 3)
          .text(item.qty, cols.qty, rowY + 3)
          .text(formatCurrency(item.unitPrice), cols.price, rowY + 3)
          .text(`${item.discount || 0}%`, cols.disc, rowY + 3)
          .text(`${item.gstRate || 0}%`, cols.gst, rowY + 3)
          .text(formatCurrency(item.amount), cols.amount, rowY + 3);
        rowY += 16;
      });

      drawHLine(doc, rowY + 4);

      // Totals
      const totalX = 360;
      let totalY = rowY + 14;
      doc.fontSize(9);

      const addTotalRow = (label, value, bold = false) => {
        doc.font(bold ? 'Helvetica-Bold' : 'Helvetica')
          .fillColor('#333')
          .text(label, totalX, totalY, { width: 100 })
          .text(formatCurrency(value), totalX + 105, totalY, { width: 90, align: 'right' });
        totalY += 14;
      };

      addTotalRow('Subtotal:', invoice.subtotal);
      if (invoice.discountAmount) addTotalRow('Discount:', -invoice.discountAmount);
      if (!invoice.isInterState) {
        addTotalRow('CGST:', invoice.totalCgst || 0);
        addTotalRow('SGST:', invoice.totalSgst || 0);
      } else {
        addTotalRow('IGST:', invoice.totalIgst || 0);
      }
      drawHLine(doc, totalY);
      totalY += 4;
      addTotalRow('TOTAL:', invoice.totalAmount, true);

      // Payment status badge
      const statusColors = { paid: '#28a745', unpaid: '#dc3545', partial: '#ffc107', overdue: '#dc3545' };
      const statusColor = statusColors[invoice.paymentStatus] || '#333';
      doc.roundedRect(50, totalY + 10, 100, 20, 3).fill(statusColor);
      doc.fillColor('#FFF').fontSize(10).font('Helvetica-Bold')
        .text((invoice.paymentStatus || 'unpaid').toUpperCase(), 52, totalY + 15, { width: 96, align: 'center' });

      addFooter(doc);
      doc.end();
    } catch (err) {
      reject(err);
    }
  });
};

/**
 * Generate a Quotation PDF buffer.
 *
 * @param {Object} inquiry - Populated Inquiry document
 * @param {Object} company - Company info
 * @returns {Promise<Buffer>}
 */
const generateQuotePDF = (inquiry, company = {}) => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 50, size: 'A4' });
      const buffers = [];

      doc.on('data', (chunk) => buffers.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', reject);

      addHeader(doc, company, 'QUOTATION');

      const metaY = 130;
      doc.fillColor('#333').fontSize(9).font('Helvetica-Bold')
        .text('Quotation No:', 50, metaY).text('Date:', 50, metaY + 14).text('Valid Till:', 50, metaY + 28);
      doc.font('Helvetica')
        .text(inquiry.inquiryNumber || 'N/A', 120, metaY)
        .text(formatDate(inquiry.createdAt), 120, metaY + 14)
        .text(formatDate(inquiry.quoteValidTill), 120, metaY + 28);

      const client = inquiry.client || {};
      doc.font('Helvetica-Bold').text('To:', 300, metaY);
      doc.font('Helvetica')
        .text(client.companyName || client.name || 'N/A', 300, metaY + 14)
        .text(client.email || '', 300, metaY + 28);

      drawHLine(doc, metaY + 45);

      // Table
      const tableY = metaY + 55;
      doc.rect(50, tableY, 500, 18).fill('#1a3c5e');
      const cols = { sno: 50, name: 75, qty: 280, price: 320, disc: 365, gst: 405, amount: 455 };
      doc.fillColor('#FFF').fontSize(8).font('Helvetica-Bold')
        .text('#', cols.sno, tableY + 5)
        .text('Product', cols.name, tableY + 5)
        .text('Qty', cols.qty, tableY + 5)
        .text('Unit Price', cols.price, tableY + 5)
        .text('Disc%', cols.disc, tableY + 5)
        .text('GST%', cols.gst, tableY + 5)
        .text('Amount', cols.amount, tableY + 5);

      let rowY = tableY + 22;
      doc.fillColor('#333').font('Helvetica').fontSize(8);

      (inquiry.quoteItems || []).forEach((item, i) => {
        const bg = i % 2 === 0 ? '#F9F9F9' : '#FFFFFF';
        doc.rect(50, rowY, 500, 16).fill(bg);
        doc.fillColor('#333')
          .text(i + 1, cols.sno, rowY + 3)
          .text((item.product && item.product.name) || 'N/A', cols.name, rowY + 3, { width: 200, ellipsis: true })
          .text(item.qty, cols.qty, rowY + 3)
          .text(formatCurrency(item.unitPrice), cols.price, rowY + 3)
          .text(`${item.discount || 0}%`, cols.disc, rowY + 3)
          .text(`${item.gstRate || 0}%`, cols.gst, rowY + 3)
          .text(formatCurrency(item.amount), cols.amount, rowY + 3);
        rowY += 16;
      });

      drawHLine(doc, rowY + 4);

      // Total
      const total = (inquiry.quoteItems || []).reduce((s, i) => s + (i.amount || 0), 0);
      doc.fontSize(10).font('Helvetica-Bold').fillColor('#1a3c5e')
        .text(`Total Amount: ${formatCurrency(total)}`, 50, rowY + 14, { align: 'right', width: 500 });

      if (inquiry.notes) {
        doc.fontSize(9).font('Helvetica').fillColor('#555')
          .text('Notes:', 50, rowY + 35, { continued: false })
          .text(inquiry.notes, 50, rowY + 48);
      }

      addFooter(doc);
      doc.end();
    } catch (err) {
      reject(err);
    }
  });
};

module.exports = { generateInvoicePDF, generateQuotePDF };

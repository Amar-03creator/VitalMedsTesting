import { useState } from 'react';
import { DocumentArrowDownIcon, EyeIcon } from '@heroicons/react/24/outline';
import { invoiceApi } from '../../api/invoiceApi.js';
import useApi from '../../hooks/useApi.js';
import Table from '../Common/Table.jsx';
import Modal from '../Common/Modal.jsx';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

const PAY_STATUS = {
  paid:    'badge-green',
  partial: 'badge-yellow',
  unpaid:  'badge-red',
  overdue: 'badge-red',
};

export default function InvoiceView() {
  const [page, setPage]         = useState(1);
  const [status, setStatus]     = useState('');
  const [selected, setSelected] = useState(null);
  const pageSize = 10;

  const { data, loading } = useApi(
    () => invoiceApi.getMyInvoices({ page, limit: pageSize, paymentStatus: status }),
    [page, status],
    { defaultData: { invoices: [], total: 0 } }
  );

  const handleDownload = async (invoice) => {
    try {
      const blob = await invoiceApi.generatePDF(invoice._id);
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href     = url;
      a.download = `Invoice-${invoice.invoiceNumber}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Invoice downloaded');
    } catch {
      toast.error('Failed to download invoice');
    }
  };

  const columns = [
    { key: 'invoiceNumber', label: 'Invoice #',  render: v => <span className="font-mono font-semibold text-teal-700">{v}</span> },
    { key: 'orderNumber',   label: 'Order #',    render: v => <span className="font-mono">{v}</span> },
    { key: 'totalAmount',   label: 'Total',      render: v => `₹${(v||0).toLocaleString('en-IN')}` },
    { key: 'amountDue',     label: 'Amount Due', render: v => <span className={`font-medium ${v > 0 ? 'text-red-600' : 'text-green-600'}`}>₹{(v||0).toLocaleString('en-IN')}</span> },
    { key: 'paymentStatus', label: 'Status',     render: v => <span className={`badge ${PAY_STATUS[v] || 'badge-gray'}`}>{v}</span> },
    { key: 'dueDate',       label: 'Due Date',   render: v => v ? format(new Date(v), 'dd MMM yyyy') : '—' },
    { key: 'createdAt',     label: 'Issued',     render: v => v ? format(new Date(v), 'dd MMM yyyy') : '—' },
    {
      key: 'actions', label: 'Actions',
      render: (_, row) => (
        <div className="flex items-center gap-1">
          <button onClick={() => setSelected(row)} className="p-1.5 rounded hover:bg-gray-100 text-gray-500" title="View">
            <EyeIcon className="w-4 h-4" />
          </button>
          <button onClick={() => handleDownload(row)} className="p-1.5 rounded hover:bg-blue-50 text-blue-500" title="Download">
            <DocumentArrowDownIcon className="w-4 h-4" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="page-header">
        <h1 className="page-title">My Invoices</h1>
        <select value={status} onChange={e => { setStatus(e.target.value); setPage(1); }} className="input-field w-44">
          <option value="">All Statuses</option>
          <option value="unpaid">Unpaid</option>
          <option value="partial">Partial</option>
          <option value="paid">Paid</option>
          <option value="overdue">Overdue</option>
        </select>
      </div>

      <div className="card p-4">
        <Table
          columns={columns}
          data={data?.invoices || []}
          loading={loading}
          emptyMessage="No invoices found"
          pagination={{ page, pageSize, total: data?.total || 0, totalPages: Math.ceil((data?.total||0)/pageSize), onChange: setPage }}
        />
      </div>

      {selected && (
        <InvoiceDetailModal invoice={selected} onClose={() => setSelected(null)} onDownload={handleDownload} />
      )}
    </div>
  );
}

function InvoiceDetailModal({ invoice, onClose, onDownload }) {
  return (
    <Modal open title={`Invoice ${invoice.invoiceNumber}`} onClose={onClose} size="lg"
      footer={
        <div className="flex items-center justify-between">
          <span className={`badge ${PAY_STATUS[invoice.paymentStatus] || 'badge-gray'} text-sm px-3 py-1`}>
            {invoice.paymentStatus}
          </span>
          <div className="flex gap-2">
            <button onClick={() => onDownload(invoice)} className="btn btn-secondary">
              <DocumentArrowDownIcon className="w-4 h-4 mr-1" /> Download PDF
            </button>
            <button onClick={onClose} className="btn btn-primary">Close</button>
          </div>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3 text-sm">
          {[
            ['Invoice #',  invoice.invoiceNumber],
            ['Order #',    invoice.orderNumber],
            ['Total',      `₹${(invoice.totalAmount||0).toLocaleString('en-IN')}`],
            ['GST Total',  `₹${(invoice.totalGst||0).toLocaleString('en-IN')}`],
            ['Amount Due', `₹${(invoice.amountDue||0).toLocaleString('en-IN')}`],
            ['Due Date',   invoice.dueDate ? format(new Date(invoice.dueDate), 'dd MMM yyyy') : '—'],
          ].map(([k, v]) => (
            <div key={k} className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs text-gray-500 mb-0.5">{k}</p>
              <p className="font-semibold text-gray-800">{v || '—'}</p>
            </div>
          ))}
        </div>

        {invoice.items?.length > 0 && (
          <div>
            <h4 className="font-semibold text-gray-700 mb-2">Line Items</h4>
            <div className="table-container">
              <table className="data-table">
                <thead><tr><th>Product</th><th>Qty</th><th>Rate</th><th>GST %</th><th>GST Amt</th><th>Total</th></tr></thead>
                <tbody>
                  {invoice.items.map((item, i) => (
                    <tr key={i}>
                      <td>{item.productName}</td>
                      <td>{item.quantity}</td>
                      <td>₹{(item.unitPrice||0).toFixed(2)}</td>
                      <td>{item.gstRate||0}%</td>
                      <td>₹{(item.gstAmount||0).toFixed(2)}</td>
                      <td>₹{(item.totalWithGst||0).toLocaleString('en-IN')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {invoice.payments?.length > 0 && (
          <div>
            <h4 className="font-semibold text-gray-700 mb-2">Payment History</h4>
            <div className="space-y-2">
              {invoice.payments.map((p, i) => (
                <div key={i} className="flex items-center justify-between text-sm bg-green-50 border border-green-100 rounded-lg px-3 py-2">
                  <div>
                    <span className="font-medium text-gray-800">₹{(p.amount||0).toLocaleString('en-IN')}</span>
                    <span className="text-gray-500 ml-2">via {p.method}</span>
                  </div>
                  <span className="text-gray-500 text-xs">{p.date ? format(new Date(p.date), 'dd MMM yyyy') : ''}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}

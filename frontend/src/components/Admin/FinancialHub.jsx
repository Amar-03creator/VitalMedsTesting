import { useState } from 'react';
import {
  DocumentTextIcon,
  CreditCardIcon,
  ExclamationTriangleIcon,
  BanknotesIcon,
} from '@heroicons/react/24/outline';
import { invoiceApi } from '../../api/invoiceApi.js';
import { clientApi } from '../../api/clientApi.js';
import useApi from '../../hooks/useApi.js';
import Table from '../Common/Table.jsx';
import Modal from '../Common/Modal.jsx';
import { FormField, FormSelect, FormTextarea, SubmitButton } from '../Common/Form.jsx';
import toast from 'react-hot-toast';
import { format, isPast } from 'date-fns';

const TABS = [
  { key: 'invoices',  label: 'Invoices',    Icon: DocumentTextIcon },
  { key: 'payments',  label: 'Payments',    Icon: CreditCardIcon },
  { key: 'overdue',   label: 'Overdue',     Icon: ExclamationTriangleIcon },
  { key: 'balances',  label: 'Balances',    Icon: BanknotesIcon },
];

const paymentStatusBadge = (s) => {
  const map = { paid: 'badge-green', partial: 'badge-yellow', unpaid: 'badge-red', overdue: 'badge-red' };
  return <span className={`badge ${map[s] || 'badge-gray'}`}>{s}</span>;
};

export default function FinancialHub() {
  const [tab, setTab]       = useState('invoices');
  const [page, setPage]     = useState(1);
  const [selected, setSelected] = useState(null);
  const [payModal, setPayModal] = useState(null);
  const pageSize = 10;

  const { data: invoiceData, loading: invLoading, refetch: refetchInv } = useApi(
    () => invoiceApi.getAllInvoices({ page, limit: pageSize }),
    [page],
    { defaultData: { invoices: [], total: 0 } }
  );

  const { data: overdueData, loading: odLoading } = useApi(
    () => invoiceApi.getOverdue(),
    [],
    { defaultData: [] }
  );

  const { data: clientData, loading: clientLoading } = useApi(
    () => clientApi.getAllClients({ limit: 100 }),
    [],
    { defaultData: { clients: [] } }
  );

  const invoiceColumns = [
    { key: 'invoiceNumber', label: 'Invoice #', render: v => <span className="font-mono text-teal-700 font-semibold">{v}</span> },
    { key: 'clientName',    label: 'Client',    sortable: true },
    { key: 'totalAmount',   label: 'Total',     render: v => `₹${(v||0).toLocaleString('en-IN')}` },
    { key: 'amountDue',     label: 'Amount Due', render: v => <span className={`font-medium ${v > 0 ? 'text-red-600' : 'text-green-600'}`}>₹{(v||0).toLocaleString('en-IN')}</span> },
    { key: 'paymentStatus', label: 'Status',    render: v => paymentStatusBadge(v) },
    { key: 'dueDate',       label: 'Due Date',  render: v => {
      if (!v) return '—';
      const past = isPast(new Date(v));
      return <span className={past ? 'text-red-600 font-medium' : ''}>{format(new Date(v), 'dd MMM yyyy')}</span>;
    }},
    {
      key: 'actions', label: 'Actions',
      render: (_, row) => (
        <div className="flex gap-1">
          <button onClick={() => setSelected(row)} className="btn btn-secondary btn-sm">View</button>
          {row.amountDue > 0 && (
            <button onClick={() => setPayModal(row)} className="btn btn-primary btn-sm">Record Payment</button>
          )}
        </div>
      ),
    },
  ];

  const overdueColumns = [
    { key: 'invoiceNumber', label: 'Invoice #',  render: v => <span className="font-mono font-semibold text-red-600">{v}</span> },
    { key: 'clientName',    label: 'Client' },
    { key: 'amountDue',     label: 'Overdue Amt', render: v => <span className="text-red-600 font-bold">₹{(v||0).toLocaleString('en-IN')}</span> },
    { key: 'dueDate',       label: 'Was Due',     render: v => v ? format(new Date(v), 'dd MMM yyyy') : '—' },
    {
      key: 'actions', label: '',
      render: (_, row) => (
        <button onClick={() => setPayModal(row)} className="btn btn-danger btn-sm">Record Payment</button>
      ),
    },
  ];

  const balanceColumns = [
    { key: 'name',        label: 'Company',     render: (v, row) => row.companyName || v },
    { key: 'email',       label: 'Email' },
    { key: 'creditLimit', label: 'Credit Limit', render: v => `₹${(v||0).toLocaleString('en-IN')}` },
    {
      key: 'balance',     label: 'Outstanding',
      render: v => <span className={`font-bold ${v > 0 ? 'text-red-600' : 'text-green-600'}`}>₹{(v||0).toLocaleString('en-IN')}</span>,
    },
    {
      key: 'utilizationPct', label: 'Utilization',
      render: (_, row) => {
        const pct = row.creditLimit > 0 ? Math.round((row.balance / row.creditLimit) * 100) : 0;
        return (
          <div className="flex items-center gap-2">
            <div className="flex-1 bg-gray-100 rounded-full h-2">
              <div className={`h-2 rounded-full ${pct > 80 ? 'bg-red-500' : pct > 50 ? 'bg-amber-500' : 'bg-teal-500'}`} style={{ width: `${Math.min(pct, 100)}%` }} />
            </div>
            <span className="text-xs font-medium">{pct}%</span>
          </div>
        );
      },
    },
  ];

  return (
    <div className="space-y-6">
      <div className="page-header">
        <h1 className="page-title">Financial Hub</h1>
        {overdueData?.length > 0 && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 border border-red-200 rounded-lg">
            <ExclamationTriangleIcon className="w-4 h-4 text-red-600" />
            <span className="text-sm text-red-700 font-medium">{overdueData.length} overdue invoices</span>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="card">
        <div className="flex border-b border-gray-200 px-4 overflow-x-auto">
          {TABS.map(({ key, label, Icon }) => (
            <button key={key} onClick={() => { setTab(key); setPage(1); }}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors
                ${tab === key ? 'border-teal-600 text-teal-700' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
              <Icon className="w-4 h-4" />
              {label}
              {key === 'overdue' && overdueData?.length > 0 && (
                <span className="bg-red-100 text-red-700 text-xs px-1.5 py-0.5 rounded-full font-semibold">{overdueData.length}</span>
              )}
            </button>
          ))}
        </div>

        <div className="p-4">
          {tab === 'invoices' && (
            <Table
              columns={invoiceColumns}
              data={invoiceData?.invoices || []}
              loading={invLoading}
              emptyMessage="No invoices found"
              pagination={{ page, pageSize, total: invoiceData?.total || 0, totalPages: Math.ceil((invoiceData?.total||0) / pageSize), onChange: setPage }}
            />
          )}

          {tab === 'overdue' && (
            <Table columns={overdueColumns} data={overdueData || []} loading={odLoading} emptyMessage="No overdue invoices 🎉" />
          )}

          {tab === 'balances' && (
            <Table columns={balanceColumns} data={clientData?.clients || []} loading={clientLoading} emptyMessage="No clients found" />
          )}

          {tab === 'payments' && (
            <PaymentHistory />
          )}
        </div>
      </div>

      {selected && (
        <InvoiceDetailModal invoice={selected} onClose={() => setSelected(null)} />
      )}

      {payModal && (
        <RecordPaymentModal
          invoice={payModal}
          onClose={() => setPayModal(null)}
          onSaved={() => { setPayModal(null); refetchInv(); }}
        />
      )}
    </div>
  );
}

function PaymentHistory() {
  const { data, loading } = useApi(
    () => invoiceApi.getAllInvoices({ paymentStatus: 'paid', limit: 50 }),
    [],
    { defaultData: { invoices: [] } }
  );

  const cols = [
    { key: 'invoiceNumber', label: 'Invoice #', render: v => <span className="font-mono text-teal-700">{v}</span> },
    { key: 'clientName',    label: 'Client' },
    { key: 'totalAmount',   label: 'Amount',   render: v => `₹${(v||0).toLocaleString('en-IN')}` },
    { key: 'paidDate',      label: 'Paid On',  render: v => v ? format(new Date(v), 'dd MMM yyyy') : '—' },
    { key: 'paymentMethod', label: 'Method' },
  ];

  return <Table columns={cols} data={data?.invoices || []} loading={loading} emptyMessage="No payments recorded" />;
}

function InvoiceDetailModal({ invoice, onClose }) {
  const handleDownload = async () => {
    try {
      const blob = await invoiceApi.generatePDF(invoice._id);
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href     = url;
      a.download = `Invoice-${invoice.invoiceNumber}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error('Failed to generate PDF');
    }
  };

  return (
    <Modal open title={`Invoice ${invoice.invoiceNumber}`} onClose={onClose} size="lg"
      footer={
        <div className="flex gap-2">
          <button onClick={handleDownload} className="btn btn-secondary">Download PDF</button>
          <button onClick={onClose} className="btn btn-primary ml-auto">Close</button>
        </div>
      }
    >
      <div className="grid grid-cols-2 gap-3 text-sm mb-4">
        {[
          ['Invoice #',   invoice.invoiceNumber],
          ['Client',      invoice.clientName],
          ['Total',       `₹${(invoice.totalAmount||0).toLocaleString('en-IN')}`],
          ['Amount Due',  `₹${(invoice.amountDue||0).toLocaleString('en-IN')}`],
          ['Status',      invoice.paymentStatus],
          ['Due Date',    invoice.dueDate ? format(new Date(invoice.dueDate), 'dd MMM yyyy') : '—'],
        ].map(([k, v]) => (
          <div key={k} className="bg-gray-50 rounded-lg p-3">
            <p className="text-xs text-gray-500 mb-0.5">{k}</p>
            <p className="font-semibold text-gray-800">{v || '—'}</p>
          </div>
        ))}
      </div>
      {invoice.items?.length > 0 && (
        <div className="table-container">
          <table className="data-table">
            <thead><tr><th>Product</th><th>Qty</th><th>Rate</th><th>GST</th><th>Total</th></tr></thead>
            <tbody>
              {invoice.items.map((item, i) => (
                <tr key={i}>
                  <td>{item.productName}</td>
                  <td>{item.quantity}</td>
                  <td>₹{(item.unitPrice||0).toFixed(2)}</td>
                  <td>{item.gstRate||0}%</td>
                  <td>₹{(item.totalWithGst||0).toLocaleString('en-IN')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Modal>
  );
}

function RecordPaymentModal({ invoice, onClose, onSaved }) {
  const [form, setForm] = useState({ amount: invoice.amountDue || '', method: 'bank_transfer', reference: '', notes: '' });
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    if (!form.amount || form.amount <= 0) { toast.error('Enter valid amount'); return; }
    setLoading(true);
    try {
      await invoiceApi.recordPayment(invoice._id, form);
      toast.success('Payment recorded successfully');
      onSaved();
    } catch (err) {
      toast.error(err?.message || 'Failed to record payment');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal open title={`Record Payment – ${invoice.invoiceNumber}`} onClose={onClose} size="sm"
      footer={
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="btn btn-secondary">Cancel</button>
          <SubmitButton loading={loading} onClick={handleSave}>Record Payment</SubmitButton>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="bg-teal-50 border border-teal-200 rounded-lg p-3 text-sm">
          <p className="text-gray-600">Outstanding: <strong className="text-red-600">₹{(invoice.amountDue||0).toLocaleString('en-IN')}</strong></p>
          <p className="text-xs text-gray-500 mt-0.5">Payment will be applied using FIFO allocation</p>
        </div>
        <FormField label="Amount (₹)" name="amount" type="number" value={form.amount}
          onChange={e => setForm(p => ({ ...p, amount: e.target.value }))} required />
        <FormSelect label="Payment Method" name="method" value={form.method}
          onChange={e => setForm(p => ({ ...p, method: e.target.value }))}
          options={[
            { value: 'bank_transfer', label: 'Bank Transfer' },
            { value: 'cheque',        label: 'Cheque' },
            { value: 'cash',          label: 'Cash' },
            { value: 'upi',           label: 'UPI' },
          ]}
        />
        <FormField label="Reference / UTR" name="reference" value={form.reference}
          onChange={e => setForm(p => ({ ...p, reference: e.target.value }))} />
        <FormTextarea label="Notes" name="notes" value={form.notes}
          onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} rows={2} />
      </div>
    </Modal>
  );
}

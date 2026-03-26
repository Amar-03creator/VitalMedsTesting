import {
  CreditCardIcon,
  DocumentTextIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
} from '@heroicons/react/24/outline';
import { invoiceApi } from '../../api/invoiceApi.js';
import useApi from '../../hooks/useApi.js';
import useAuth from '../../hooks/useAuth.js';
import Table from '../Common/Table.jsx';
import { format, isPast } from 'date-fns';

export default function PaymentTracking() {
  const { user } = useAuth();

  const { data: invoicesData, loading: invLoading } = useApi(
    () => invoiceApi.getMyInvoices({ limit: 100 }),
    [],
    { defaultData: { invoices: [] } }
  );

  const invoices = invoicesData?.invoices || [];
  const paid     = invoices.filter(i => i.paymentStatus === 'paid');
  const unpaid   = invoices.filter(i => i.paymentStatus !== 'paid');
  const overdue  = invoices.filter(i => i.dueDate && isPast(new Date(i.dueDate)) && i.amountDue > 0);
  const totalDue = invoices.reduce((s, i) => s + (i.amountDue || 0), 0);

  const outstandingCols = [
    { key: 'invoiceNumber', label: 'Invoice #',  render: v => <span className="font-mono text-teal-700">{v}</span> },
    { key: 'totalAmount',   label: 'Total',      render: v => `₹${(v||0).toLocaleString('en-IN')}` },
    { key: 'amountDue',     label: 'Amount Due', render: v => <span className="font-bold text-red-600">₹{(v||0).toLocaleString('en-IN')}</span> },
    {
      key: 'dueDate', label: 'Due Date',
      render: v => {
        if (!v) return '—';
        const past = isPast(new Date(v));
        return (
          <span className={`flex items-center gap-1 ${past ? 'text-red-600 font-medium' : 'text-gray-700'}`}>
            {past && <ExclamationCircleIcon className="w-3.5 h-3.5" />}
            {format(new Date(v), 'dd MMM yyyy')}
          </span>
        );
      },
    },
    { key: 'paymentStatus', label: 'Status',
      render: v => {
        const colors = { paid: 'badge-green', partial: 'badge-yellow', unpaid: 'badge-red', overdue: 'badge-red' };
        return <span className={`badge ${colors[v] || 'badge-gray'}`}>{v}</span>;
      },
    },
  ];

  const paidCols = [
    { key: 'invoiceNumber', label: 'Invoice #',  render: v => <span className="font-mono text-teal-700">{v}</span> },
    { key: 'totalAmount',   label: 'Amount',     render: v => `₹${(v||0).toLocaleString('en-IN')}` },
    { key: 'paidDate',      label: 'Paid On',    render: v => v ? format(new Date(v), 'dd MMM yyyy') : '—' },
    { key: 'paymentMethod', label: 'Method' },
    { key: 'paymentStatus', label: 'Status',     render: () => <span className="badge badge-green">Paid</span> },
  ];

  return (
    <div className="space-y-6">
      <div className="page-header">
        <h1 className="page-title">Payment Tracking</h1>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card p-5 flex items-center gap-4">
          <div className="w-12 h-12 bg-red-50 rounded-xl flex items-center justify-center">
            <CreditCardIcon className="w-6 h-6 text-red-500" />
          </div>
          <div>
            <p className="text-sm text-gray-500">Total Outstanding</p>
            <p className="text-xl font-bold text-red-600">₹{totalDue.toLocaleString('en-IN')}</p>
          </div>
        </div>
        <div className="card p-5 flex items-center gap-4">
          <div className="w-12 h-12 bg-amber-50 rounded-xl flex items-center justify-center">
            <ExclamationCircleIcon className="w-6 h-6 text-amber-500" />
          </div>
          <div>
            <p className="text-sm text-gray-500">Overdue Invoices</p>
            <p className="text-xl font-bold text-amber-600">{overdue.length}</p>
          </div>
        </div>
        <div className="card p-5 flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center">
            <DocumentTextIcon className="w-6 h-6 text-blue-500" />
          </div>
          <div>
            <p className="text-sm text-gray-500">Unpaid Invoices</p>
            <p className="text-xl font-bold text-blue-600">{unpaid.length}</p>
          </div>
        </div>
        <div className="card p-5 flex items-center gap-4">
          <div className="w-12 h-12 bg-green-50 rounded-xl flex items-center justify-center">
            <CheckCircleIcon className="w-6 h-6 text-green-500" />
          </div>
          <div>
            <p className="text-sm text-gray-500">Paid Invoices</p>
            <p className="text-xl font-bold text-green-600">{paid.length}</p>
          </div>
        </div>
      </div>

      {/* Overdue alert */}
      {overdue.length > 0 && (
        <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-xl">
          <ExclamationCircleIcon className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-red-800">You have {overdue.length} overdue invoice{overdue.length > 1 ? 's' : ''}</p>
            <p className="text-sm text-red-600 mt-0.5">
              Total overdue: ₹{overdue.reduce((s, i) => s + (i.amountDue||0), 0).toLocaleString('en-IN')}.
              Please contact us to arrange payment and avoid service interruption.
            </p>
          </div>
        </div>
      )}

      {/* Outstanding invoices */}
      {unpaid.length > 0 && (
        <div className="card">
          <div className="card-header">
            <h3 className="font-semibold text-gray-800">Outstanding Invoices</h3>
          </div>
          <div className="p-4">
            <Table columns={outstandingCols} data={unpaid} loading={invLoading} emptyMessage="No outstanding invoices" />
          </div>
        </div>
      )}

      {/* Payment history */}
      <div className="card">
        <div className="card-header">
          <h3 className="font-semibold text-gray-800">Payment History</h3>
        </div>
        <div className="p-4">
          <Table columns={paidCols} data={paid} loading={invLoading} emptyMessage="No payments recorded yet" />
        </div>
      </div>

      {/* Payment methods info */}
      <div className="card p-5 bg-teal-50 border-teal-200">
        <h4 className="font-semibold text-teal-800 mb-3">Payment Methods Accepted</h4>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm text-teal-700">
          {['Bank Transfer (NEFT/RTGS)', 'IMPS / UPI', 'Cheque', 'Cash (On Delivery)'].map(m => (
            <div key={m} className="flex items-center gap-2">
              <CheckCircleIcon className="w-4 h-4 text-teal-600" />
              {m}
            </div>
          ))}
        </div>
        <p className="text-xs text-teal-600 mt-3">
          After payment, please share the UTR/reference number with your account manager or via support ticket.
        </p>
      </div>
    </div>
  );
}

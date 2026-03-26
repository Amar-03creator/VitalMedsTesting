import {
  ShoppingCartIcon,
  DocumentTextIcon,
  BanknotesIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';
import { orderApi } from '../../api/orderApi.js';
import { invoiceApi } from '../../api/invoiceApi.js';
import { productApi } from '../../api/productApi.js';
import useApi from '../../hooks/useApi.js';
import useAuth from '../../hooks/useAuth.js';
import Table from '../Common/Table.jsx';
import { format } from 'date-fns';

const ORDER_STATUS_COLORS = {
  pending:    'badge-yellow',
  confirmed:  'badge-blue',
  processing: 'badge-blue',
  shipped:    'badge-teal',
  delivered:  'badge-green',
  cancelled:  'badge-gray',
};

export default function ClientDashboard() {
  const { user } = useAuth();

  const { data: ordersData, loading: ordersLoading } = useApi(
    () => orderApi.getMyOrders({ limit: 5, sort: '-createdAt' }),
    [],
    { defaultData: { orders: [], total: 0 } }
  );

  const { data: invoicesData, loading: invLoading } = useApi(
    () => invoiceApi.getMyInvoices({ limit: 5, sort: '-createdAt' }),
    [],
    { defaultData: { invoices: [], total: 0 } }
  );

  const { data: lowStock } = useApi(
    () => productApi.getLowStock(),
    [],
    { defaultData: [] }
  );

  const pendingOrders   = (ordersData?.orders  || []).filter(o => o.status === 'pending' || o.status === 'processing').length;
  const totalOrders     = ordersData?.total || 0;
  const outstandingAmt  = (invoicesData?.invoices || []).reduce((s, inv) => s + (inv.amountDue || 0), 0);
  const overdueCount    = (invoicesData?.invoices || []).filter(inv => inv.paymentStatus === 'overdue').length;

  const orderColumns = [
    { key: 'orderNumber', label: 'Order #',    render: v => <span className="font-mono font-semibold text-teal-700">{v}</span> },
    { key: 'totalAmount', label: 'Amount',     render: v => `₹${(v||0).toLocaleString('en-IN')}` },
    { key: 'status',      label: 'Status',     render: v => <span className={`badge ${ORDER_STATUS_COLORS[v] || 'badge-gray'}`}>{v}</span> },
    { key: 'createdAt',   label: 'Date',       render: v => v ? format(new Date(v), 'dd MMM yyyy') : '—' },
  ];

  const invoiceColumns = [
    { key: 'invoiceNumber', label: 'Invoice #', render: v => <span className="font-mono font-semibold">{v}</span> },
    { key: 'totalAmount',   label: 'Total',     render: v => `₹${(v||0).toLocaleString('en-IN')}` },
    { key: 'amountDue',     label: 'Due',       render: v => <span className={`font-medium ${v > 0 ? 'text-red-600' : 'text-green-600'}`}>₹{(v||0).toLocaleString('en-IN')}</span> },
    { key: 'dueDate',       label: 'Due Date',  render: v => v ? format(new Date(v), 'dd MMM yyyy') : '—' },
  ];

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <h1 className="page-title">Welcome, {user?.name?.split(' ')[0] || 'there'}!</h1>
          <p className="text-sm text-gray-500">{format(new Date(), 'EEEE, dd MMMM yyyy')}</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="card p-5 flex items-center gap-4">
          <div className="w-12 h-12 bg-teal-50 rounded-xl flex items-center justify-center">
            <ShoppingCartIcon className="w-6 h-6 text-teal-600" />
          </div>
          <div>
            <p className="text-sm text-gray-500">Total Orders</p>
            <p className="text-2xl font-bold text-gray-900">{totalOrders}</p>
          </div>
        </div>
        <div className="card p-5 flex items-center gap-4">
          <div className="w-12 h-12 bg-amber-50 rounded-xl flex items-center justify-center">
            <ShoppingCartIcon className="w-6 h-6 text-amber-500" />
          </div>
          <div>
            <p className="text-sm text-gray-500">Pending Orders</p>
            <p className="text-2xl font-bold text-amber-600">{pendingOrders}</p>
          </div>
        </div>
        <div className="card p-5 flex items-center gap-4">
          <div className="w-12 h-12 bg-red-50 rounded-xl flex items-center justify-center">
            <BanknotesIcon className="w-6 h-6 text-red-500" />
          </div>
          <div>
            <p className="text-sm text-gray-500">Outstanding Balance</p>
            <p className="text-2xl font-bold text-red-600">₹{outstandingAmt.toLocaleString('en-IN')}</p>
          </div>
        </div>
        <div className="card p-5 flex items-center gap-4">
          <div className="w-12 h-12 bg-orange-50 rounded-xl flex items-center justify-center">
            <DocumentTextIcon className="w-6 h-6 text-orange-500" />
          </div>
          <div>
            <p className="text-sm text-gray-500">Overdue Invoices</p>
            <p className="text-2xl font-bold text-orange-600">{overdueCount}</p>
          </div>
        </div>
      </div>

      {/* Alerts */}
      {overdueCount > 0 && (
        <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-xl">
          <ExclamationTriangleIcon className="w-5 h-5 text-red-600 flex-shrink-0" />
          <p className="text-sm text-red-700">
            You have <strong>{overdueCount} overdue invoice{overdueCount > 1 ? 's' : ''}</strong> totalling ₹{outstandingAmt.toLocaleString('en-IN')}. Please clear dues to maintain your credit limit.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Recent Orders */}
        <div className="card">
          <div className="card-header">
            <h3 className="font-semibold text-gray-800">Recent Orders</h3>
          </div>
          <div className="p-4">
            <Table columns={orderColumns} data={ordersData?.orders || []} loading={ordersLoading} emptyMessage="No orders yet" />
          </div>
        </div>

        {/* Recent Invoices */}
        <div className="card">
          <div className="card-header">
            <h3 className="font-semibold text-gray-800">Recent Invoices</h3>
          </div>
          <div className="p-4">
            <Table columns={invoiceColumns} data={invoicesData?.invoices || []} loading={invLoading} emptyMessage="No invoices yet" />
          </div>
        </div>
      </div>

      {/* Low stock alerts */}
      {(lowStock || []).length > 0 && (
        <div className="card">
          <div className="card-header flex items-center gap-2">
            <ExclamationTriangleIcon className="w-4 h-4 text-amber-500" />
            <h3 className="font-semibold text-gray-800">Low Stock Alerts</h3>
            <span className="badge badge-yellow">{lowStock.length}</span>
          </div>
          <div className="p-4 flex flex-wrap gap-2">
            {(lowStock || []).slice(0, 10).map(p => (
              <div key={p._id} className="px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg text-sm">
                <span className="font-medium">{p.name}</span>
                <span className="text-amber-700 ml-2">{p.totalStock} {p.unit} left</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

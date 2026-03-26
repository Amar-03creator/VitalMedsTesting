import { useState } from 'react';
import { EyeIcon } from '@heroicons/react/24/outline';
import { orderApi } from '../../api/orderApi.js';
import useApi from '../../hooks/useApi.js';
import Table from '../Common/Table.jsx';
import Modal from '../Common/Modal.jsx';
import { format } from 'date-fns';

const STATUS_COLORS = {
  pending:    'badge-yellow',
  confirmed:  'badge-blue',
  processing: 'badge-blue',
  shipped:    'badge-teal',
  delivered:  'badge-green',
  cancelled:  'badge-gray',
};

export default function OrderHistory() {
  const [page, setPage]         = useState(1);
  const [status, setStatus]     = useState('');
  const [selected, setSelected] = useState(null);
  const pageSize = 10;

  const { data, loading } = useApi(
    () => orderApi.getMyOrders({ page, limit: pageSize, status }),
    [page, status],
    { defaultData: { orders: [], total: 0 } }
  );

  const columns = [
    {
      key: 'orderNumber', label: 'Order #',
      render: v => <span className="font-mono font-semibold text-teal-700">{v}</span>,
    },
    { key: 'totalAmount', label: 'Amount',    render: v => `₹${(v||0).toLocaleString('en-IN')}` },
    { key: 'itemCount',   label: 'Items',     render: (v, row) => row.items?.length ?? v ?? '—' },
    { key: 'status',      label: 'Status',    render: v => <span className={`badge ${STATUS_COLORS[v] || 'badge-gray'}`}>{v}</span> },
    { key: 'createdAt',   label: 'Ordered On', render: v => v ? format(new Date(v), 'dd MMM yyyy') : '—' },
    { key: 'updatedAt',   label: 'Last Updated', render: v => v ? format(new Date(v), 'dd MMM yyyy') : '—' },
    {
      key: 'actions', label: '',
      render: (_, row) => (
        <button onClick={() => setSelected(row)} className="p-1.5 rounded hover:bg-gray-100 text-gray-500">
          <EyeIcon className="w-4 h-4" />
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="page-header">
        <h1 className="page-title">My Orders</h1>
        <select value={status} onChange={e => { setStatus(e.target.value); setPage(1); }} className="input-field w-44">
          <option value="">All Statuses</option>
          <option value="pending">Pending</option>
          <option value="confirmed">Confirmed</option>
          <option value="processing">Processing</option>
          <option value="shipped">Shipped</option>
          <option value="delivered">Delivered</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      <div className="card p-4">
        <Table
          columns={columns}
          data={data?.orders || []}
          loading={loading}
          emptyMessage="No orders found"
          pagination={{ page, pageSize, total: data?.total || 0, totalPages: Math.ceil((data?.total||0)/pageSize), onChange: setPage }}
        />
      </div>

      {selected && (
        <OrderDetailModal order={selected} onClose={() => setSelected(null)} />
      )}
    </div>
  );
}

function OrderDetailModal({ order, onClose }) {
  return (
    <Modal open title={`Order ${order.orderNumber}`} onClose={onClose} size="lg">
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3 text-sm">
          {[
            ['Order #',   order.orderNumber],
            ['Status',    order.status],
            ['Total',     `₹${(order.totalAmount||0).toLocaleString('en-IN')}`],
            ['Date',      order.createdAt ? format(new Date(order.createdAt), 'dd MMM yyyy HH:mm') : '—'],
            ['Invoice',   order.invoiceId || 'Not yet generated'],
          ].map(([k, v]) => (
            <div key={k} className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs text-gray-500 mb-0.5">{k}</p>
              <p className="font-semibold text-gray-800">{v || '—'}</p>
            </div>
          ))}
        </div>

        {/* Status timeline */}
        <div>
          <h4 className="font-semibold text-gray-700 mb-3">Order Progress</h4>
          <div className="flex items-center gap-0">
            {['pending','confirmed','processing','shipped','delivered'].map((s, i, arr) => {
              const statuses = ['pending','confirmed','processing','shipped','delivered'];
              const currentIdx = statuses.indexOf(order.status);
              const stepIdx = statuses.indexOf(s);
              const done = stepIdx <= currentIdx;
              return (
                <div key={s} className="flex items-center flex-1">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0
                    ${done ? 'bg-teal-600 text-white' : 'bg-gray-200 text-gray-400'}`}>
                    {i + 1}
                  </div>
                  <div className={`text-xs mt-1 text-center -mt-4 ml-0.5 ${done ? 'text-teal-700' : 'text-gray-400'}`} style={{ fontSize: '9px', width: '60px' }}>
                    {s}
                  </div>
                  {i < arr.length - 1 && (
                    <div className={`flex-1 h-0.5 ${stepIdx < currentIdx ? 'bg-teal-600' : 'bg-gray-200'}`} />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {order.items?.length > 0 && (
          <div>
            <h4 className="font-semibold text-gray-700 mb-2">Items</h4>
            <div className="table-container">
              <table className="data-table">
                <thead><tr><th>Product</th><th>Qty</th><th>Unit Price</th><th>Total</th></tr></thead>
                <tbody>
                  {order.items.map((item, i) => (
                    <tr key={i}>
                      <td>{item.productName || item.product?.name}</td>
                      <td>{item.quantity} {item.unit}</td>
                      <td>₹{(item.unitPrice||0).toFixed(2)}</td>
                      <td>₹{((item.quantity||0) * (item.unitPrice||0)).toLocaleString('en-IN')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {order.notes && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm">
            <p className="font-medium text-amber-700 mb-1">Notes</p>
            <p>{order.notes}</p>
          </div>
        )}
      </div>
    </Modal>
  );
}

import { useState } from 'react';
import {
  MagnifyingGlassIcon,
  FunnelIcon,
  EyeIcon,
  DocumentTextIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';
import { orderApi } from '../../api/orderApi.js';
import useApi from '../../hooks/useApi.js';
import Table from '../Common/Table.jsx';
import Modal from '../Common/Modal.jsx';
import { FormSelect, FormTextarea, SubmitButton } from '../Common/Form.jsx';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

const STATUS_FLOW = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'];

const STATUS_COLORS = {
  pending:    'badge-yellow',
  confirmed:  'badge-blue',
  processing: 'badge-blue',
  shipped:    'badge-teal',
  delivered:  'badge-green',
  cancelled:  'badge-gray',
};

export default function OrderManagement() {
  const [search, setSearch]   = useState('');
  const [status, setStatus]   = useState('');
  const [page, setPage]       = useState(1);
  const [selected, setSelected] = useState(null);
  const [modal, setModal]     = useState(null); // 'view' | 'status'
  const pageSize = 10;

  const { data, loading, refetch } = useApi(
    () => orderApi.getAllOrders({ search, status, page, limit: pageSize }),
    [search, status, page],
    { defaultData: { orders: [], total: 0 } }
  );

  const orders = data?.orders || [];
  const total  = data?.total  || 0;

  const handleGenerateInvoice = async (orderId) => {
    try {
      await orderApi.generateInvoice(orderId);
      toast.success('Invoice generated successfully');
      refetch();
    } catch (err) {
      toast.error(err?.message || 'Failed to generate invoice');
    }
  };

  const columns = [
    {
      key: 'orderNumber', label: 'Order #', sortable: true,
      render: v => <span className="font-mono font-semibold text-teal-700">{v}</span>,
    },
    {
      key: 'client', label: 'Client',
      render: (v, row) => <span>{row.clientName || row.client?.companyName || row.client?.name || '—'}</span>,
    },
    { key: 'totalAmount',  label: 'Amount', render: v => `₹${(v||0).toLocaleString('en-IN')}`, sortable: true },
    { key: 'itemCount',    label: 'Items',  render: (v, row) => row.items?.length ?? v ?? '—' },
    { key: 'status',       label: 'Status', render: v => <span className={`badge ${STATUS_COLORS[v] || 'badge-gray'}`}>{v}</span> },
    { key: 'createdAt',    label: 'Date',   render: v => v ? format(new Date(v), 'dd MMM yyyy') : '—', sortable: true },
    {
      key: 'actions', label: 'Actions',
      render: (_, row) => (
        <div className="flex items-center gap-1">
          <button onClick={() => { setSelected(row); setModal('view'); }} className="p-1.5 rounded hover:bg-gray-100 text-gray-500" title="View"><EyeIcon className="w-4 h-4" /></button>
          <button onClick={() => { setSelected(row); setModal('status'); }} className="p-1.5 rounded hover:bg-blue-50 text-blue-500" title="Update Status"><ArrowPathIcon className="w-4 h-4" /></button>
          {row.status === 'delivered' && !row.invoiceId && (
            <button onClick={() => handleGenerateInvoice(row._id)} className="p-1.5 rounded hover:bg-green-50 text-green-600" title="Generate Invoice"><DocumentTextIcon className="w-4 h-4" /></button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="page-header">
        <h1 className="page-title">Order Management</h1>
      </div>

      {/* Filters */}
      <div className="card p-4 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input type="text" placeholder="Search order # or client..." value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }} className="input-field pl-9" />
        </div>
        <div className="flex items-center gap-2">
          <FunnelIcon className="w-4 h-4 text-gray-400" />
          <select value={status} onChange={e => { setStatus(e.target.value); setPage(1); }} className="input-field w-44">
            <option value="">All Statuses</option>
            {STATUS_FLOW.map(s => <option key={s} value={s} className="capitalize">{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
          </select>
        </div>
      </div>

      <div className="card p-4">
        <Table
          columns={columns}
          data={orders}
          loading={loading}
          emptyMessage="No orders found"
          pagination={{ page, pageSize, total, totalPages: Math.ceil(total / pageSize), onChange: setPage }}
        />
      </div>

      {modal === 'view' && selected && (
        <OrderDetailModal order={selected} onClose={() => { setSelected(null); setModal(null); }} />
      )}

      {modal === 'status' && selected && (
        <UpdateStatusModal
          order={selected}
          onClose={() => { setSelected(null); setModal(null); }}
          onSaved={() => { setSelected(null); setModal(null); refetch(); }}
        />
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
            ['Order #',    order.orderNumber],
            ['Client',     order.clientName || order.client?.companyName],
            ['Status',     order.status],
            ['Total',      `₹${(order.totalAmount||0).toLocaleString('en-IN')}`],
            ['Created',    order.createdAt ? format(new Date(order.createdAt), 'dd MMM yyyy HH:mm') : '—'],
            ['Invoice',    order.invoiceId || 'Not generated'],
          ].map(([k, v]) => (
            <div key={k} className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs text-gray-500 mb-0.5">{k}</p>
              <p className="font-semibold text-gray-800">{v || '—'}</p>
            </div>
          ))}
        </div>

        {order.items?.length > 0 && (
          <div>
            <h4 className="font-semibold text-gray-700 mb-2">Order Items</h4>
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Product</th><th>Qty</th><th>Unit Price</th><th>Total</th>
                  </tr>
                </thead>
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
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
            <p className="text-xs text-amber-700 font-medium mb-1">Notes</p>
            <p className="text-sm text-gray-700">{order.notes}</p>
          </div>
        )}
      </div>
    </Modal>
  );
}

function UpdateStatusModal({ order, onClose, onSaved }) {
  const [status, setStatus]   = useState(order.status);
  const [notes, setNotes]     = useState('');
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    setLoading(true);
    try {
      await orderApi.updateStatus(order._id, status, notes);
      toast.success('Order status updated');
      onSaved();
    } catch (err) {
      toast.error(err?.message || 'Failed to update status');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal open title="Update Order Status" onClose={onClose} size="sm"
      footer={
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="btn btn-secondary">Cancel</button>
          <SubmitButton loading={loading} onClick={handleSave}>Update Status</SubmitButton>
        </div>
      }
    >
      <div className="space-y-4">
        <p className="text-sm text-gray-600">Order: <strong>{order.orderNumber}</strong></p>
        <FormSelect
          label="New Status"
          name="status"
          value={status}
          onChange={e => setStatus(e.target.value)}
          options={STATUS_FLOW.map(s => ({ value: s, label: s.charAt(0).toUpperCase() + s.slice(1) }))}
        />
        <FormTextarea
          label="Notes (optional)"
          name="notes"
          value={notes}
          onChange={e => setNotes(e.target.value)}
          placeholder="Add any notes about this update..."
          rows={2}
        />
      </div>
    </Modal>
  );
}

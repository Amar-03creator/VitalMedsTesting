import { useState } from 'react';
import {
  ExclamationTriangleIcon,
  ArchiveBoxIcon,
  ArrowsRightLeftIcon,
} from '@heroicons/react/24/outline';
import { productApi } from '../../api/productApi.js';
import useApi from '../../hooks/useApi.js';
import Table from '../Common/Table.jsx';
import Modal from '../Common/Modal.jsx';
import { format, differenceInDays } from 'date-fns';

export default function InventoryManagement() {
  const [tab, setTab]     = useState('stock'); // 'stock' | 'expiring' | 'low'
  const [selected, setSelected] = useState(null);

  const { data: products,  loading: prodLoading  } = useApi(
    () => productApi.getAllProducts({ limit: 100 }),
    [],
    { defaultData: { products: [] } }
  );

  const { data: lowStock,  loading: lowLoading   } = useApi(
    () => productApi.getLowStock(),
    [],
    { defaultData: [] }
  );

  const { data: expiring,  loading: expLoading   } = useApi(
    () => productApi.getExpiringBatches(90),
    [],
    { defaultData: [] }
  );

  const stockColumns = [
    {
      key: 'name', label: 'Product', sortable: true,
      render: (v, row) => (
        <div>
          <p className="font-medium">{v}</p>
          <p className="text-xs text-gray-500">{row.sku}</p>
        </div>
      ),
    },
    { key: 'category',    label: 'Category' },
    { key: 'unit',        label: 'Unit' },
    {
      key: 'totalStock',  label: 'Total Stock',
      render: (v, row) => (
        <span className={`font-semibold ${v <= (row.reorderLevel || 10) ? 'text-red-600' : 'text-gray-800'}`}>
          {v ?? 0}
        </span>
      ),
    },
    { key: 'reorderLevel', label: 'Reorder At' },
    {
      key: 'status', label: 'Status',
      render: (_, row) => {
        if ((row.totalStock ?? 0) === 0) return <span className="badge badge-red">Out of Stock</span>;
        if ((row.totalStock ?? 0) <= (row.reorderLevel || 10)) return <span className="badge badge-yellow">Low Stock</span>;
        return <span className="badge badge-green">In Stock</span>;
      },
    },
    {
      key: 'actions', label: '',
      render: (_, row) => (
        <button onClick={() => setSelected(row)} className="btn btn-secondary btn-sm">
          View Batches
        </button>
      ),
    },
  ];

  const lowColumns = [
    { key: 'name',         label: 'Product',       render: (v, row) => <div><p className="font-medium">{v}</p><p className="text-xs text-gray-500">{row.sku}</p></div> },
    { key: 'totalStock',   label: 'Current Stock', render: v => <span className="text-red-600 font-bold">{v}</span> },
    { key: 'reorderLevel', label: 'Reorder Level' },
    { key: 'unit',         label: 'Unit' },
    { key: 'category',     label: 'Category' },
  ];

  const expiringColumns = [
    { key: 'productName',  label: 'Product' },
    { key: 'batchNumber',  label: 'Batch #' },
    { key: 'quantity',     label: 'Qty' },
    {
      key: 'expiryDate', label: 'Expiry',
      render: v => {
        if (!v) return '—';
        const days = differenceInDays(new Date(v), new Date());
        return (
          <div>
            <p className={`font-medium ${days < 30 ? 'text-red-600' : days < 60 ? 'text-amber-600' : 'text-gray-700'}`}>
              {format(new Date(v), 'dd MMM yyyy')}
            </p>
            <p className="text-xs text-gray-500">{days} days left</p>
          </div>
        );
      },
    },
  ];

  const tabs = [
    { key: 'stock',    label: 'Stock Summary',     count: products?.products?.length },
    { key: 'low',      label: 'Low Stock',         count: (lowStock || []).length,   danger: true },
    { key: 'expiring', label: 'Expiring Batches',  count: (expiring || []).length,   warning: true },
  ];

  return (
    <div className="space-y-6">
      <div className="page-header">
        <h1 className="page-title">Inventory Management</h1>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="card p-5 flex items-center gap-4">
          <div className="w-12 h-12 bg-teal-50 rounded-xl flex items-center justify-center">
            <ArchiveBoxIcon className="w-6 h-6 text-teal-600" />
          </div>
          <div>
            <p className="text-sm text-gray-500">Total Products</p>
            <p className="text-2xl font-bold text-gray-900">{products?.total || products?.products?.length || 0}</p>
          </div>
        </div>
        <div className="card p-5 flex items-center gap-4">
          <div className="w-12 h-12 bg-red-50 rounded-xl flex items-center justify-center">
            <ExclamationTriangleIcon className="w-6 h-6 text-red-500" />
          </div>
          <div>
            <p className="text-sm text-gray-500">Low Stock Alerts</p>
            <p className="text-2xl font-bold text-red-600">{(lowStock || []).length}</p>
          </div>
        </div>
        <div className="card p-5 flex items-center gap-4">
          <div className="w-12 h-12 bg-amber-50 rounded-xl flex items-center justify-center">
            <ArrowsRightLeftIcon className="w-6 h-6 text-amber-500" />
          </div>
          <div>
            <p className="text-sm text-gray-500">Expiring Soon</p>
            <p className="text-2xl font-bold text-amber-600">{(expiring || []).length}</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="card">
        <div className="flex border-b border-gray-200 px-4">
          {tabs.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
                tab === t.key
                  ? 'border-teal-600 text-teal-700'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {t.label}
              {t.count !== undefined && (
                <span className={`text-xs px-1.5 py-0.5 rounded-full font-semibold
                  ${t.danger ? 'bg-red-100 text-red-700' : t.warning ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-600'}`}>
                  {t.count}
                </span>
              )}
            </button>
          ))}
        </div>
        <div className="p-4">
          {tab === 'stock' && (
            <Table
              columns={stockColumns}
              data={products?.products || []}
              loading={prodLoading}
              emptyMessage="No products found"
            />
          )}
          {tab === 'low' && (
            <Table columns={lowColumns} data={lowStock || []} loading={lowLoading} emptyMessage="No low stock alerts" />
          )}
          {tab === 'expiring' && (
            <Table columns={expiringColumns} data={expiring || []} loading={expLoading} emptyMessage="No expiring batches" rowKey="batchNumber" />
          )}
        </div>
      </div>

      {/* Batch detail modal */}
      {selected && (
        <BatchDetailModal product={selected} onClose={() => setSelected(null)} />
      )}
    </div>
  );
}

function BatchDetailModal({ product, onClose }) {
  const { data: batches, loading } = useApi(
    () => productApi.getBatches(product._id),
    [product._id],
    { defaultData: [] }
  );

  const columns = [
    { key: 'batchNumber',       label: 'Batch #' },
    { key: 'quantity',          label: 'Remaining' },
    { key: 'originalQuantity',  label: 'Original' },
    { key: 'purchasePrice',     label: 'Purchase ₹', render: v => `₹${(v||0).toFixed(2)}` },
    { key: 'mrp',               label: 'MRP ₹',       render: v => `₹${(v||0).toFixed(2)}` },
    {
      key: 'expiryDate', label: 'Expiry',
      render: v => {
        if (!v) return '—';
        const days = differenceInDays(new Date(v), new Date());
        return <span className={days < 90 ? 'text-red-600 font-medium' : ''}>{format(new Date(v), 'MMM yyyy')}</span>;
      },
    },
    { key: 'fifoOrder', label: 'FIFO Position', render: (_, __, idx) => `#${idx + 1}` },
  ];

  return (
    <Modal open title={`Batches – ${product.name} (FIFO Order)`} onClose={onClose} size="xl">
      <p className="text-sm text-gray-500 mb-4">
        Batches are consumed in FIFO order (oldest expiry first).
      </p>
      <Table columns={columns} data={batches || []} loading={loading} emptyMessage="No batches found" rowKey="batchNumber" />
    </Modal>
  );
}

import { useEffect, useState } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import {
  CurrencyRupeeIcon,
  UsersIcon,
  ShoppingCartIcon,
  ExclamationTriangleIcon,
  ArrowTrendingUpIcon,
} from '@heroicons/react/24/outline';
import { reportApi } from '../../api/reportApi.js';
import { orderApi } from '../../api/orderApi.js';
import { productApi } from '../../api/productApi.js';
import useApi from '../../hooks/useApi.js';
import Loading from '../Common/Loading.jsx';
import Table from '../Common/Table.jsx';
import { format } from 'date-fns';

const MOCK_STATS = {
  totalRevenue: 2847500,
  activeClients: 142,
  pendingOrders: 23,
  lowStockCount: 8,
  revenueChange: 12.4,
};

const MOCK_CHART = [
  { month: 'Aug', revenue: 180000, orders: 45 },
  { month: 'Sep', revenue: 220000, orders: 58 },
  { month: 'Oct', revenue: 195000, orders: 51 },
  { month: 'Nov', revenue: 260000, orders: 67 },
  { month: 'Dec', revenue: 310000, orders: 82 },
  { month: 'Jan', revenue: 284750, orders: 74 },
];

const statusBadge = {
  pending:    <span className="badge badge-yellow">Pending</span>,
  processing: <span className="badge badge-blue">Processing</span>,
  shipped:    <span className="badge badge-teal">Shipped</span>,
  delivered:  <span className="badge badge-green">Delivered</span>,
  cancelled:  <span className="badge badge-gray">Cancelled</span>,
};

const orderColumns = [
  { key: 'orderNumber', label: 'Order #', sortable: true },
  { key: 'clientName',  label: 'Client',  sortable: true },
  { key: 'totalAmount', label: 'Amount',  render: (v) => `₹${(v || 0).toLocaleString('en-IN')}` },
  { key: 'status',      label: 'Status',  render: (v) => statusBadge[v] || <span className="badge badge-gray">{v}</span> },
  { key: 'createdAt',   label: 'Date',    render: (v) => v ? format(new Date(v), 'dd MMM yyyy') : '—' },
];

function StatCard({ icon: Icon, label, value, change, color = 'teal' }) {
  const colors = {
    teal:   'bg-teal-50 text-teal-600',
    blue:   'bg-blue-50 text-blue-600',
    amber:  'bg-amber-50 text-amber-600',
    red:    'bg-red-50 text-red-600',
    green:  'bg-green-50 text-green-600',
    purple: 'bg-purple-50 text-purple-600',
  };
  return (
    <div className="card p-5 flex items-start gap-4">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${colors[color]}`}>
        <Icon className="w-6 h-6" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-gray-500 font-medium">{label}</p>
        <p className="text-2xl font-bold text-gray-900 mt-0.5">{value}</p>
        {change !== undefined && (
          <p className={`text-xs mt-1 flex items-center gap-1 ${change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            <ArrowTrendingUpIcon className={`w-3 h-3 ${change < 0 ? 'rotate-180' : ''}`} />
            {Math.abs(change)}% from last month
          </p>
        )}
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  const [stats, setStats]         = useState(MOCK_STATS);
  const [chartData, setChartData] = useState(MOCK_CHART);

  const { data: recentOrders, loading: ordersLoading } = useApi(
    () => orderApi.getAllOrders({ limit: 8, sort: '-createdAt' }),
    [],
    { defaultData: { orders: [], total: 0 } }
  );

  const { data: lowStock, loading: stockLoading } = useApi(
    () => productApi.getLowStock(),
    [],
    { defaultData: [] }
  );

  const { data: expiring, loading: expiringLoading } = useApi(
    () => productApi.getExpiringBatches(90),
    [],
    { defaultData: [] }
  );

  useEffect(() => {
    reportApi.getDashboardStats()
      .then(d => { if (d) setStats(d); })
      .catch(() => {});
  }, []);

  const fmt = (n) => `₹${(n || 0).toLocaleString('en-IN')}`;

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="text-sm text-gray-500 mt-0.5">Welcome back! Here's what's happening.</p>
        </div>
        <span className="text-sm text-gray-400">{format(new Date(), 'EEEE, dd MMMM yyyy')}</span>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard icon={CurrencyRupeeIcon} label="Total Revenue (MTD)" value={fmt(stats.totalRevenue)} change={stats.revenueChange} color="teal" />
        <StatCard icon={UsersIcon}          label="Active Clients"       value={stats.activeClients}  color="blue" />
        <StatCard icon={ShoppingCartIcon}   label="Pending Orders"       value={stats.pendingOrders}  color="amber" />
        <StatCard icon={ExclamationTriangleIcon} label="Low Stock Items" value={stats.lowStockCount}  color="red" />
      </div>

      {/* Chart */}
      <div className="card p-6">
        <h3 className="section-title">Revenue &amp; Orders (Last 6 Months)</h3>
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="month" tick={{ fontSize: 12 }} />
            <YAxis yAxisId="left" tick={{ fontSize: 12 }} tickFormatter={v => `₹${(v / 1000).toFixed(0)}K`} />
            <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12 }} />
            <Tooltip
              formatter={(value, name) =>
                name === 'revenue' ? [`₹${value.toLocaleString('en-IN')}`, 'Revenue'] : [value, 'Orders']
              }
            />
            <Legend />
            <Line yAxisId="left" type="monotone" dataKey="revenue" stroke="#0d9488" strokeWidth={2} dot={{ fill: '#0d9488', r: 4 }} name="revenue" />
            <Line yAxisId="right" type="monotone" dataKey="orders"  stroke="#3b82f6" strokeWidth={2} dot={{ fill: '#3b82f6', r: 4 }} name="orders" />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Recent orders */}
        <div className="xl:col-span-2 card">
          <div className="card-header flex items-center justify-between">
            <h3 className="font-semibold text-gray-800">Recent Orders</h3>
          </div>
          <div className="p-4">
            <Table
              columns={orderColumns}
              data={recentOrders?.orders || []}
              loading={ordersLoading}
              emptyMessage="No orders yet"
            />
          </div>
        </div>

        {/* Alerts */}
        <div className="space-y-4">
          {/* Low stock */}
          <div className="card">
            <div className="card-header">
              <h3 className="font-semibold text-gray-800 text-sm flex items-center gap-2">
                <ExclamationTriangleIcon className="w-4 h-4 text-red-500" />
                Low Stock Alerts ({(lowStock || []).length})
              </h3>
            </div>
            <div className="divide-y divide-gray-100 max-h-48 overflow-y-auto scrollbar-thin">
              {stockLoading ? (
                <div className="p-4"><Loading /></div>
              ) : (lowStock || []).length === 0 ? (
                <p className="p-4 text-sm text-gray-400">All stock levels OK</p>
              ) : (
                (lowStock || []).slice(0, 6).map(p => (
                  <div key={p._id} className="px-4 py-3 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-800">{p.name}</p>
                      <p className="text-xs text-gray-500">{p.sku}</p>
                    </div>
                    <span className="badge badge-red">{p.totalStock} {p.unit}</span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Expiring batches */}
          <div className="card">
            <div className="card-header">
              <h3 className="font-semibold text-gray-800 text-sm flex items-center gap-2">
                <ExclamationTriangleIcon className="w-4 h-4 text-amber-500" />
                Expiring Soon (90 days)
              </h3>
            </div>
            <div className="divide-y divide-gray-100 max-h-48 overflow-y-auto scrollbar-thin">
              {expiringLoading ? (
                <div className="p-4"><Loading /></div>
              ) : (expiring || []).length === 0 ? (
                <p className="p-4 text-sm text-gray-400">No batches expiring soon</p>
              ) : (
                (expiring || []).slice(0, 6).map((b, i) => (
                  <div key={i} className="px-4 py-3 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-800">{b.productName}</p>
                      <p className="text-xs text-gray-500">Batch: {b.batchNumber}</p>
                    </div>
                    <span className="badge badge-yellow">{b.expiryDate ? format(new Date(b.expiryDate), 'MMM yy') : '—'}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

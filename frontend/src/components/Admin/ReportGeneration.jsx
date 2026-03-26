import { useState } from 'react';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell,
} from 'recharts';
import {
  DocumentArrowDownIcon,
  CalendarIcon,
} from '@heroicons/react/24/outline';
import { reportApi } from '../../api/reportApi.js';
import useApi from '../../hooks/useApi.js';
import Table from '../Common/Table.jsx';
import Loading from '../Common/Loading.jsx';
import toast from 'react-hot-toast';
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns';

const REPORT_TYPES = [
  { value: 'sales',     label: 'Sales Report' },
  { value: 'gst',       label: 'GST Summary' },
  { value: 'inventory', label: 'Inventory Report' },
  { value: 'payments',  label: 'Payment Report' },
  { value: 'forecast',  label: 'Replenishment Forecast' },
];

const GST_COLORS = ['#0d9488', '#3b82f6', '#8b5cf6', '#f59e0b'];

export default function ReportGeneration() {
  const [reportType, setReportType] = useState('sales');
  const [dateRange, setDateRange]   = useState({
    from: format(startOfMonth(subMonths(new Date(), 2)), 'yyyy-MM-dd'),
    to:   format(endOfMonth(new Date()), 'yyyy-MM-dd'),
  });
  const [exporting, setExporting] = useState(false);

  const { data: salesData, loading: salesLoading, refetch: refetchSales } = useApi(
    () => reportApi.getSalesReport({ from: dateRange.from, to: dateRange.to }),
    [dateRange.from, dateRange.to],
    { defaultData: { summary: {}, chartData: [], topProducts: [] } }
  );

  const { data: gstData, loading: gstLoading, refetch: refetchGST } = useApi(
    () => reportApi.getGSTSummary({ from: dateRange.from, to: dateRange.to }),
    [dateRange.from, dateRange.to],
    { defaultData: { rates: [], totals: {} } }
  );

  const { data: inventoryData, loading: invLoading } = useApi(
    () => reportApi.getInventoryReport(),
    [],
    { defaultData: { products: [] } }
  );

  const { data: forecastData, loading: fcastLoading } = useApi(
    () => reportApi.getReplenishmentForecast(),
    [],
    { defaultData: [] }
  );

  const handleExport = async () => {
    setExporting(true);
    try {
      const blob = await reportApi.exportReport(reportType, dateRange);
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href     = url;
      a.download = `vitalmeds-${reportType}-report-${format(new Date(), 'yyyy-MM-dd')}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Report exported');
    } catch {
      toast.error('Export failed');
    } finally {
      setExporting(false);
    }
  };

  const gstTableColumns = [
    { key: 'rate',       label: 'GST Rate' },
    { key: 'taxable',    label: 'Taxable Value', render: v => `₹${(v||0).toLocaleString('en-IN')}` },
    { key: 'cgst',       label: 'CGST',          render: v => `₹${(v||0).toLocaleString('en-IN')}` },
    { key: 'sgst',       label: 'SGST',          render: v => `₹${(v||0).toLocaleString('en-IN')}` },
    { key: 'igst',       label: 'IGST',          render: v => `₹${(v||0).toLocaleString('en-IN')}` },
    { key: 'totalTax',   label: 'Total Tax',     render: v => <strong>₹{(v||0).toLocaleString('en-IN')}</strong> },
  ];

  const inventoryColumns = [
    { key: 'name',        label: 'Product', render: (v, row) => <div><p className="font-medium">{v}</p><p className="text-xs text-gray-500">{row.sku}</p></div> },
    { key: 'totalStock',  label: 'Stock' },
    { key: 'stockValue',  label: 'Value',   render: v => `₹${(v||0).toLocaleString('en-IN')}` },
    { key: 'sold30days',  label: 'Sold (30d)' },
    { key: 'turnover',    label: 'Turnover', render: v => v ? `${v.toFixed(1)}x` : '—' },
  ];

  const forecastColumns = [
    { key: 'name',             label: 'Product' },
    { key: 'currentStock',     label: 'Current Stock' },
    { key: 'avgMonthlySales',  label: 'Avg Monthly Sales', render: v => `${(v||0).toFixed(0)} units` },
    { key: 'daysOfStock',      label: 'Days of Stock',     render: v => <span className={v < 30 ? 'text-red-600 font-bold' : ''}>{v || '—'}</span> },
    { key: 'suggestedOrder',   label: 'Suggested Order',   render: v => <strong className="text-teal-700">{v} units</strong> },
  ];

  return (
    <div className="space-y-6">
      <div className="page-header">
        <h1 className="page-title">Reports</h1>
        <button onClick={handleExport} disabled={exporting} className="btn btn-secondary">
          <DocumentArrowDownIcon className="w-4 h-4 mr-1" />
          {exporting ? 'Exporting…' : 'Export CSV'}
        </button>
      </div>

      {/* Controls */}
      <div className="card p-4 flex flex-col sm:flex-row gap-4 items-end">
        <div>
          <label className="form-label">Report Type</label>
          <select value={reportType} onChange={e => setReportType(e.target.value)} className="input-field w-52">
            {REPORT_TYPES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
          </select>
        </div>
        <div className="flex items-end gap-3">
          <div>
            <label className="form-label flex items-center gap-1"><CalendarIcon className="w-3.5 h-3.5" />From</label>
            <input type="date" value={dateRange.from} onChange={e => setDateRange(p => ({ ...p, from: e.target.value }))} className="input-field" />
          </div>
          <div>
            <label className="form-label">To</label>
            <input type="date" value={dateRange.to} onChange={e => setDateRange(p => ({ ...p, to: e.target.value }))} className="input-field" />
          </div>
        </div>
      </div>

      {/* Sales Report */}
      {reportType === 'sales' && (
        <div className="space-y-6">
          {salesLoading ? <Loading /> : (
            <>
              {/* Summary */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[
                  ['Total Revenue',  `₹${((salesData?.summary?.totalRevenue)||0).toLocaleString('en-IN')}`],
                  ['Total Orders',   salesData?.summary?.totalOrders || 0],
                  ['Avg Order Value',`₹${((salesData?.summary?.avgOrderValue)||0).toFixed(0)}`],
                  ['New Clients',    salesData?.summary?.newClients || 0],
                ].map(([k, v]) => (
                  <div key={k} className="card p-4">
                    <p className="text-xs text-gray-500">{k}</p>
                    <p className="text-xl font-bold text-gray-900 mt-1">{v}</p>
                  </div>
                ))}
              </div>

              {/* Chart */}
              <div className="card p-6">
                <h3 className="section-title">Revenue Trend</h3>
                <ResponsiveContainer width="100%" height={250}>
                  <LineChart data={salesData?.chartData || []}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                    <YAxis tickFormatter={v => `₹${(v/1000).toFixed(0)}K`} tick={{ fontSize: 11 }} />
                    <Tooltip formatter={v => `₹${v.toLocaleString('en-IN')}`} />
                    <Line type="monotone" dataKey="revenue" stroke="#0d9488" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* Top products */}
              {(salesData?.topProducts || []).length > 0 && (
                <div className="card p-6">
                  <h3 className="section-title">Top Selling Products</h3>
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={salesData.topProducts.slice(0, 8)} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis type="number" tickFormatter={v => `₹${(v/1000).toFixed(0)}K`} tick={{ fontSize: 11 }} />
                      <YAxis type="category" dataKey="name" width={140} tick={{ fontSize: 11 }} />
                      <Tooltip formatter={v => `₹${v.toLocaleString('en-IN')}`} />
                      <Bar dataKey="revenue" fill="#0d9488" radius={[0,4,4,0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* GST Report */}
      {reportType === 'gst' && (
        <div className="space-y-6">
          {gstLoading ? <Loading /> : (
            <>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="card p-6">
                  <h3 className="section-title">GST by Rate</h3>
                  <Table columns={gstTableColumns} data={gstData?.rates || []} emptyMessage="No GST data" rowKey="rate" />
                </div>
                <div className="card p-6">
                  <h3 className="section-title">Tax Distribution</h3>
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie data={gstData?.rates || []} dataKey="totalTax" nameKey="rate" cx="50%" cy="50%" outerRadius={80} label={({ rate, percent }) => `${rate}: ${(percent*100).toFixed(0)}%`}>
                        {(gstData?.rates || []).map((_, i) => <Cell key={i} fill={GST_COLORS[i % GST_COLORS.length]} />)}
                      </Pie>
                      <Tooltip formatter={v => `₹${(v||0).toLocaleString('en-IN')}`} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div className="card p-4 bg-teal-50 border-teal-200">
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div><p className="text-xs text-gray-500">Total CGST</p><p className="text-lg font-bold text-teal-700">₹{(gstData?.totals?.cgst||0).toLocaleString('en-IN')}</p></div>
                  <div><p className="text-xs text-gray-500">Total SGST</p><p className="text-lg font-bold text-teal-700">₹{(gstData?.totals?.sgst||0).toLocaleString('en-IN')}</p></div>
                  <div><p className="text-xs text-gray-500">Total IGST</p><p className="text-lg font-bold text-teal-700">₹{(gstData?.totals?.igst||0).toLocaleString('en-IN')}</p></div>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* Inventory Report */}
      {reportType === 'inventory' && (
        <div className="card p-4">
          <Table columns={inventoryColumns} data={inventoryData?.products || []} loading={invLoading} emptyMessage="No inventory data" />
        </div>
      )}

      {/* Forecast */}
      {reportType === 'forecast' && (
        <div className="card p-4">
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-700">
            Forecast based on last 90 days of sales velocity. Suggested order quantity covers 60 days of stock.
          </div>
          <Table columns={forecastColumns} data={forecastData || []} loading={fcastLoading} emptyMessage="No forecast data" />
        </div>
      )}
    </div>
  );
}

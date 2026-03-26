import { useState, useCallback } from 'react';
import {
  MagnifyingGlassIcon,
  FunnelIcon,
  EyeIcon,
  PencilIcon,
  CheckCircleIcon,
  XCircleIcon,
} from '@heroicons/react/24/outline';
import { clientApi } from '../../api/clientApi.js';
import useApi from '../../hooks/useApi.js';
import useForm from '../../hooks/useForm.js';
import Table from '../Common/Table.jsx';
import Modal from '../Common/Modal.jsx';
import { FormField, FormSelect, FormTextarea, SubmitButton } from '../Common/Form.jsx';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

const STATUS_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'pending',   label: 'Pending' },
  { value: 'active',    label: 'Active' },
  { value: 'suspended', label: 'Suspended' },
  { value: 'rejected',  label: 'Rejected' },
];

const statusBadge = (s) => {
  const map = {
    active:    'badge-green',
    pending:   'badge-yellow',
    suspended: 'badge-red',
    rejected:  'badge-red',
  };
  return <span className={`badge ${map[s] || 'badge-gray'}`}>{s}</span>;
};

export default function CustomerManagement() {
  const [search, setSearch]         = useState('');
  const [statusFilter, setStatus]   = useState('');
  const [page, setPage]             = useState(1);
  const [selected, setSelected]     = useState(null);
  const [modalType, setModalType]   = useState(null); // 'view' | 'edit' | 'status' | 'credit'
  const pageSize = 10;

  const { data, loading, refetch } = useApi(
    () => clientApi.getAllClients({ search, status: statusFilter, page, limit: pageSize }),
    [search, statusFilter, page],
    { defaultData: { clients: [], total: 0 } }
  );

  const clients = data?.clients || [];
  const total   = data?.total   || 0;

  const openModal = (client, type) => {
    setSelected(client);
    setModalType(type);
  };
  const closeModal = () => { setSelected(null); setModalType(null); };

  const columns = [
    { key: 'companyName', label: 'Company',    sortable: true },
    { key: 'name',        label: 'Contact',    sortable: true },
    { key: 'email',       label: 'Email' },
    { key: 'gstNumber',   label: 'GST' },
    { key: 'creditLimit', label: 'Credit Limit', render: v => `₹${(v||0).toLocaleString('en-IN')}` },
    { key: 'balance',     label: 'Outstanding',  render: v => <span className={`font-medium ${v > 0 ? 'text-red-600' : 'text-green-600'}`}>₹{(v||0).toLocaleString('en-IN')}</span> },
    { key: 'status',      label: 'Status',        render: v => statusBadge(v) },
    { key: 'createdAt',   label: 'Joined',        render: v => v ? format(new Date(v), 'dd MMM yyyy') : '—' },
    {
      key: 'actions', label: 'Actions',
      render: (_, row) => (
        <div className="flex items-center gap-1">
          <button onClick={() => openModal(row, 'view')} className="p-1.5 rounded hover:bg-gray-100 text-gray-500" title="View"><EyeIcon className="w-4 h-4" /></button>
          <button onClick={() => openModal(row, 'edit')} className="p-1.5 rounded hover:bg-blue-50 text-blue-500" title="Edit"><PencilIcon className="w-4 h-4" /></button>
          <button onClick={() => openModal(row, 'status')} className="p-1.5 rounded hover:bg-green-50 text-green-600" title="Update Status"><CheckCircleIcon className="w-4 h-4" /></button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="page-header">
        <h1 className="page-title">Customer Management</h1>
      </div>

      {/* Filters */}
      <div className="card p-4 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by company, name or email..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            className="input-field pl-9"
          />
        </div>
        <div className="flex items-center gap-2">
          <FunnelIcon className="w-4 h-4 text-gray-400" />
          <select
            value={statusFilter}
            onChange={e => { setStatus(e.target.value); setPage(1); }}
            className="input-field w-40"
          >
            {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="card p-4">
        <Table
          columns={columns}
          data={clients}
          loading={loading}
          emptyMessage="No customers found"
          pagination={{ page, pageSize, total, totalPages: Math.ceil(total / pageSize), onChange: setPage }}
        />
      </div>

      {/* View Modal */}
      {modalType === 'view' && selected && (
        <ClientDetailModal client={selected} onClose={closeModal} />
      )}

      {/* Edit Modal */}
      {modalType === 'edit' && selected && (
        <EditClientModal client={selected} onClose={closeModal} onSaved={() => { closeModal(); refetch(); }} />
      )}

      {/* Status Modal */}
      {modalType === 'status' && selected && (
        <StatusModal client={selected} onClose={closeModal} onSaved={() => { closeModal(); refetch(); }} />
      )}
    </div>
  );
}

function ClientDetailModal({ client, onClose }) {
  return (
    <Modal open title={`${client.companyName || client.name} – Details`} onClose={onClose} size="lg">
      <div className="grid grid-cols-2 gap-4 text-sm">
        {[
          ['Full Name',     client.name],
          ['Email',         client.email],
          ['Phone',         client.phone],
          ['Company',       client.companyName],
          ['GST Number',    client.gstNumber],
          ['State',         client.state],
          ['Status',        client.status],
          ['Credit Limit',  `₹${(client.creditLimit||0).toLocaleString('en-IN')}`],
          ['Outstanding',   `₹${(client.balance||0).toLocaleString('en-IN')}`],
          ['KYC Status',    client.kycStatus],
          ['Joined',        client.createdAt ? format(new Date(client.createdAt), 'dd MMM yyyy') : '—'],
        ].map(([k, v]) => (
          <div key={k} className="bg-gray-50 rounded-lg p-3">
            <p className="text-xs text-gray-500 font-medium mb-0.5">{k}</p>
            <p className="font-semibold text-gray-800">{v || '—'}</p>
          </div>
        ))}
      </div>
      {client.kycDocuments?.length > 0 && (
        <div className="mt-4">
          <p className="font-semibold text-gray-700 mb-2">KYC Documents</p>
          <div className="flex flex-wrap gap-2">
            {client.kycDocuments.map((doc, i) => (
              <a key={i} href={doc.url} target="_blank" rel="noopener noreferrer" className="btn btn-secondary btn-sm">
                {doc.type || `Document ${i + 1}`}
              </a>
            ))}
          </div>
        </div>
      )}
    </Modal>
  );
}

function EditClientModal({ client, onClose, onSaved }) {
  const { values, errors, submitting, handleChange, handleBlur, handleSubmit } = useForm(
    {
      name:        client.name        || '',
      companyName: client.companyName || '',
      phone:       client.phone       || '',
      gstNumber:   client.gstNumber   || '',
      state:       client.state       || '',
      creditLimit: client.creditLimit || 0,
    }
  );

  const onSubmit = handleSubmit(async (data) => {
    await clientApi.updateClient(client._id, data);
    toast.success('Client updated successfully');
    onSaved();
  });

  return (
    <Modal open title="Edit Client" onClose={onClose} size="md"
      footer={
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="btn btn-secondary">Cancel</button>
          <SubmitButton loading={submitting} onClick={onSubmit}>Save Changes</SubmitButton>
        </div>
      }
    >
      <form onSubmit={onSubmit} className="space-y-4">
        <FormField label="Full Name"    name="name"        value={values.name}        onChange={handleChange} error={errors.name} />
        <FormField label="Company Name" name="companyName" value={values.companyName} onChange={handleChange} error={errors.companyName} />
        <FormField label="Phone"        name="phone"       value={values.phone}       onChange={handleChange} error={errors.phone} type="tel" />
        <FormField label="GST Number"   name="gstNumber"   value={values.gstNumber}   onChange={handleChange} error={errors.gstNumber} />
        <FormField label="Credit Limit (₹)" name="creditLimit" value={values.creditLimit} onChange={handleChange} error={errors.creditLimit} type="number" />
      </form>
    </Modal>
  );
}

function StatusModal({ client, onClose, onSaved }) {
  const [status, setStatus]   = useState(client.status);
  const [reason, setReason]   = useState('');
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    setLoading(true);
    try {
      await clientApi.updateStatus(client._id, status, reason);
      toast.success('Status updated');
      onSaved();
    } catch (err) {
      toast.error(err?.message || 'Failed to update status');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal open title="Update Client Status" onClose={onClose} size="sm"
      footer={
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="btn btn-secondary">Cancel</button>
          <SubmitButton loading={loading} onClick={handleSave}>Update</SubmitButton>
        </div>
      }
    >
      <div className="space-y-4">
        <p className="text-sm text-gray-600">Client: <strong>{client.companyName || client.name}</strong></p>
        <FormSelect
          label="New Status"
          name="status"
          value={status}
          onChange={e => setStatus(e.target.value)}
          options={[
            { value: 'pending',   label: 'Pending' },
            { value: 'active',    label: 'Active' },
            { value: 'suspended', label: 'Suspended' },
            { value: 'rejected',  label: 'Rejected' },
          ]}
        />
        <FormTextarea
          label="Reason (optional)"
          name="reason"
          value={reason}
          onChange={e => setReason(e.target.value)}
          placeholder="Reason for status change..."
          rows={2}
        />
      </div>
    </Modal>
  );
}

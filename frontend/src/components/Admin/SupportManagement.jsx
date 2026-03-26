import { useState } from 'react';
import {
  MagnifyingGlassIcon,
  FunnelIcon,
  ChatBubbleLeftRightIcon,
  CheckCircleIcon,
  UserCircleIcon,
} from '@heroicons/react/24/outline';
import useApi from '../../hooks/useApi.js';
import axiosClient from '../../api/axiosClient.js';
import Table from '../Common/Table.jsx';
import Modal from '../Common/Modal.jsx';
import { FormSelect, FormTextarea, SubmitButton } from '../Common/Form.jsx';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

const STATUS_COLORS   = { open: 'badge-blue', in_progress: 'badge-yellow', resolved: 'badge-green', closed: 'badge-gray' };
const PRIORITY_COLORS = { low: 'badge-gray', medium: 'badge-blue', high: 'badge-yellow', urgent: 'badge-red' };

const fetchTickets = (params) => axiosClient.get('/support/tickets', { params }).then(r => r.data);
const replyTicket  = (id, data) => axiosClient.post(`/support/tickets/${id}/reply`, data).then(r => r.data);
const updateTicket = (id, data) => axiosClient.patch(`/support/tickets/${id}`, data).then(r => r.data);

export default function SupportManagement() {
  const [search, setSearch]     = useState('');
  const [status, setStatus]     = useState('');
  const [priority, setPriority] = useState('');
  const [page, setPage]         = useState(1);
  const [selected, setSelected] = useState(null);
  const pageSize = 10;

  const { data, loading, refetch } = useApi(
    () => fetchTickets({ search, status, priority, page, limit: pageSize }),
    [search, status, priority, page],
    { defaultData: { tickets: [], total: 0 } }
  );

  const columns = [
    { key: 'ticketNumber', label: 'Ticket #', render: v => <span className="font-mono font-semibold text-teal-700">{v}</span> },
    { key: 'subject',      label: 'Subject',  sortable: true },
    { key: 'clientName',   label: 'Client' },
    { key: 'priority',     label: 'Priority', render: v => <span className={`badge ${PRIORITY_COLORS[v] || 'badge-gray'} capitalize`}>{v}</span> },
    { key: 'status',       label: 'Status',   render: v => <span className={`badge ${STATUS_COLORS[v] || 'badge-gray'} capitalize`}>{v?.replace('_', ' ')}</span> },
    { key: 'assignedTo',   label: 'Assigned', render: v => v || <span className="text-gray-400 text-xs">Unassigned</span> },
    { key: 'updatedAt',    label: 'Last Activity', render: v => v ? format(new Date(v), 'dd MMM HH:mm') : '—' },
    {
      key: 'actions', label: '',
      render: (_, row) => (
        <button onClick={() => setSelected(row)} className="btn btn-secondary btn-sm flex items-center gap-1">
          <ChatBubbleLeftRightIcon className="w-3.5 h-3.5" /> View
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="page-header">
        <h1 className="page-title">Support Management</h1>
      </div>

      {/* Filters */}
      <div className="card p-4 flex flex-col sm:flex-row gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input type="text" placeholder="Search tickets..." value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }} className="input-field pl-9" />
        </div>
        <select value={status} onChange={e => { setStatus(e.target.value); setPage(1); }} className="input-field w-40">
          <option value="">All Statuses</option>
          <option value="open">Open</option>
          <option value="in_progress">In Progress</option>
          <option value="resolved">Resolved</option>
          <option value="closed">Closed</option>
        </select>
        <select value={priority} onChange={e => { setPriority(e.target.value); setPage(1); }} className="input-field w-36">
          <option value="">All Priorities</option>
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
          <option value="urgent">Urgent</option>
        </select>
      </div>

      <div className="card p-4">
        <Table
          columns={columns}
          data={data?.tickets || []}
          loading={loading}
          emptyMessage="No support tickets"
          pagination={{ page, pageSize, total: data?.total||0, totalPages: Math.ceil((data?.total||0)/pageSize), onChange: setPage }}
        />
      </div>

      {selected && (
        <TicketModal
          ticket={selected}
          onClose={() => { setSelected(null); refetch(); }}
        />
      )}
    </div>
  );
}

function TicketModal({ ticket, onClose }) {
  const [reply, setReply]     = useState('');
  const [status, setStatus]   = useState(ticket.status);
  const [assigned, setAssigned] = useState(ticket.assignedTo || '');
  const [sending, setSending] = useState(false);
  const [saving, setSaving]   = useState(false);

  const handleReply = async () => {
    if (!reply.trim()) return;
    setSending(true);
    try {
      await replyTicket(ticket._id, { message: reply });
      toast.success('Reply sent');
      setReply('');
    } catch (err) {
      toast.error(err?.message || 'Failed to send reply');
    } finally {
      setSending(false);
    }
  };

  const handleUpdate = async () => {
    setSaving(true);
    try {
      await updateTicket(ticket._id, { status, assignedTo: assigned });
      toast.success('Ticket updated');
    } catch (err) {
      toast.error(err?.message || 'Failed to update');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open title={`Ticket ${ticket.ticketNumber} – ${ticket.subject}`} onClose={onClose} size="xl">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Thread */}
        <div className="lg:col-span-2 space-y-4">
          <div className="space-y-3 max-h-80 overflow-y-auto scrollbar-thin">
            {(ticket.messages || []).length === 0 ? (
              <div className="text-center py-8 text-gray-400 text-sm">No messages yet</div>
            ) : (
              (ticket.messages || []).map((msg, i) => (
                <div key={i} className={`flex gap-3 ${msg.role === 'admin' ? 'flex-row-reverse' : ''}`}>
                  <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 bg-gray-100">
                    <UserCircleIcon className="w-5 h-5 text-gray-400" />
                  </div>
                  <div className={`flex-1 rounded-xl p-3 text-sm ${msg.role === 'admin' ? 'bg-teal-50 border border-teal-100' : 'bg-gray-50 border border-gray-100'}`}>
                    <p className="font-medium text-gray-700 mb-1">{msg.senderName || (msg.role === 'admin' ? 'Support Team' : 'Client')}</p>
                    <p className="text-gray-600">{msg.message}</p>
                    <p className="text-xs text-gray-400 mt-1">{msg.createdAt ? format(new Date(msg.createdAt), 'dd MMM yyyy HH:mm') : ''}</p>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Reply box */}
          <div className="space-y-2">
            <FormTextarea
              label="Reply"
              name="reply"
              value={reply}
              onChange={e => setReply(e.target.value)}
              placeholder="Type your reply..."
              rows={3}
            />
            <div className="flex justify-end">
              <SubmitButton loading={sending} onClick={handleReply}>Send Reply</SubmitButton>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <div className="bg-gray-50 rounded-xl p-4 space-y-3 text-sm">
            <div>
              <p className="text-xs text-gray-500">Client</p>
              <p className="font-semibold">{ticket.clientName}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Priority</p>
              <span className={`badge ${PRIORITY_COLORS[ticket.priority] || 'badge-gray'} capitalize`}>{ticket.priority}</span>
            </div>
            <div>
              <p className="text-xs text-gray-500">Created</p>
              <p>{ticket.createdAt ? format(new Date(ticket.createdAt), 'dd MMM yyyy') : '—'}</p>
            </div>
          </div>

          <div className="space-y-3">
            <FormSelect label="Update Status" name="status" value={status} onChange={e => setStatus(e.target.value)}
              options={[
                { value: 'open',        label: 'Open' },
                { value: 'in_progress', label: 'In Progress' },
                { value: 'resolved',    label: 'Resolved' },
                { value: 'closed',      label: 'Closed' },
              ]}
            />
            <div>
              <label className="form-label">Assign To</label>
              <input type="text" value={assigned} onChange={e => setAssigned(e.target.value)}
                placeholder="Agent name or email" className="input-field" />
            </div>
            <SubmitButton loading={saving} onClick={handleUpdate} className="w-full">
              <CheckCircleIcon className="w-4 h-4 mr-1" /> Save Changes
            </SubmitButton>
          </div>
        </div>
      </div>
    </Modal>
  );
}

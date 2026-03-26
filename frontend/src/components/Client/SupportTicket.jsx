import { useState } from 'react';
import {
  PlusIcon,
  ChatBubbleLeftRightIcon,
  UserCircleIcon,
  PaperAirplaneIcon,
} from '@heroicons/react/24/outline';
import axiosClient from '../../api/axiosClient.js';
import useApi from '../../hooks/useApi.js';
import useForm from '../../hooks/useForm.js';
import Table from '../Common/Table.jsx';
import Modal from '../Common/Modal.jsx';
import { FormField, FormSelect, FormTextarea, SubmitButton } from '../Common/Form.jsx';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

const fetchMyTickets = () => axiosClient.get('/support/tickets/my').then(r => r.data);
const createTicket   = (data) => axiosClient.post('/support/tickets', data).then(r => r.data);
const replyToTicket  = (id, data) => axiosClient.post(`/support/tickets/${id}/reply`, data).then(r => r.data);

const STATUS_COLORS   = { open: 'badge-blue', in_progress: 'badge-yellow', resolved: 'badge-green', closed: 'badge-gray' };
const PRIORITY_COLORS = { low: 'badge-gray', medium: 'badge-blue', high: 'badge-yellow', urgent: 'badge-red' };

const validateTicket = (v) => {
  const e = {};
  if (!v.subject) e.subject = 'Subject is required';
  if (!v.message) e.message = 'Message is required';
  return e;
};

export default function SupportTicket() {
  const [tab, setTab]         = useState('list'); // 'list' | 'new'
  const [selected, setSelected] = useState(null);

  const { data: tickets, loading, refetch } = useApi(
    () => fetchMyTickets(),
    [],
    { defaultData: [] }
  );

  const columns = [
    { key: 'ticketNumber', label: 'Ticket #', render: v => <span className="font-mono text-teal-700 font-semibold">{v}</span> },
    { key: 'subject',      label: 'Subject',  sortable: true },
    { key: 'priority',     label: 'Priority', render: v => <span className={`badge ${PRIORITY_COLORS[v] || 'badge-gray'} capitalize`}>{v}</span> },
    { key: 'status',       label: 'Status',   render: v => <span className={`badge ${STATUS_COLORS[v] || 'badge-gray'} capitalize`}>{v?.replace('_', ' ')}</span> },
    { key: 'updatedAt',    label: 'Last Updated', render: v => v ? format(new Date(v), 'dd MMM HH:mm') : '—' },
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
        <h1 className="page-title">Support</h1>
        <button onClick={() => setTab('new')} className="btn btn-primary">
          <PlusIcon className="w-4 h-4 mr-1" /> New Ticket
        </button>
      </div>

      <div className="flex gap-2 border-b border-gray-200 mb-4">
        {[
          { key: 'list', label: 'My Tickets' },
          { key: 'new',  label: 'New Ticket' },
        ].map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${tab === t.key ? 'border-teal-600 text-teal-700' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'list' && (
        <div className="card p-4">
          <Table
            columns={columns}
            data={tickets || []}
            loading={loading}
            emptyMessage="No support tickets yet"
          />
        </div>
      )}

      {tab === 'new' && (
        <NewTicketForm
          onSubmitted={() => { setTab('list'); refetch(); }}
          onCancel={() => setTab('list')}
        />
      )}

      {selected && (
        <TicketDetailModal
          ticket={selected}
          onClose={() => { setSelected(null); refetch(); }}
        />
      )}
    </div>
  );
}

function NewTicketForm({ onSubmitted, onCancel }) {
  const { values, errors, submitting, handleChange, handleBlur, handleSubmit } = useForm(
    { subject: '', category: '', priority: 'medium', message: '' },
    validateTicket
  );

  const onSubmit = handleSubmit(async (data) => {
    await createTicket(data);
    toast.success('Support ticket created successfully!');
    onSubmitted();
  });

  return (
    <div className="card p-6 max-w-2xl">
      <h3 className="font-semibold text-gray-800 mb-4">Create New Support Ticket</h3>
      <form onSubmit={onSubmit} className="space-y-4">
        <FormField label="Subject" name="subject" value={values.subject} onChange={handleChange} onBlur={handleBlur} error={errors.subject} placeholder="Brief description of your issue" required />
        <div className="grid grid-cols-2 gap-4">
          <FormSelect label="Category" name="category" value={values.category} onChange={handleChange}
            options={[
              { value: 'order',    label: 'Order Issue' },
              { value: 'invoice',  label: 'Invoice / Payment' },
              { value: 'product',  label: 'Product Query' },
              { value: 'account',  label: 'Account' },
              { value: 'delivery', label: 'Delivery' },
              { value: 'other',    label: 'Other' },
            ]}
            placeholder="Select category"
          />
          <FormSelect label="Priority" name="priority" value={values.priority} onChange={handleChange}
            options={[
              { value: 'low',    label: 'Low' },
              { value: 'medium', label: 'Medium' },
              { value: 'high',   label: 'High' },
              { value: 'urgent', label: 'Urgent' },
            ]}
          />
        </div>
        <FormTextarea label="Message" name="message" value={values.message} onChange={handleChange} onBlur={handleBlur} error={errors.message} placeholder="Describe your issue in detail..." rows={5} required />
        <div className="flex gap-3">
          <button type="button" onClick={onCancel} className="btn btn-secondary">Cancel</button>
          <SubmitButton loading={submitting}>Submit Ticket</SubmitButton>
        </div>
      </form>
    </div>
  );
}

function TicketDetailModal({ ticket, onClose }) {
  const [reply, setReply]   = useState('');
  const [sending, setSending] = useState(false);
  const [messages, setMessages] = useState(ticket.messages || []);

  const handleReply = async () => {
    if (!reply.trim()) return;
    setSending(true);
    try {
      const updated = await replyToTicket(ticket._id, { message: reply });
      setMessages(updated?.messages || [...messages, { message: reply, role: 'client', createdAt: new Date() }]);
      setReply('');
      toast.success('Reply sent');
    } catch (err) {
      toast.error(err?.message || 'Failed to send reply');
    } finally {
      setSending(false);
    }
  };

  const isClosed = ticket.status === 'resolved' || ticket.status === 'closed';

  return (
    <Modal open title={`Ticket ${ticket.ticketNumber}`} onClose={onClose} size="lg">
      <div className="space-y-4">
        {/* Meta */}
        <div className="flex flex-wrap gap-3 text-sm bg-gray-50 rounded-xl p-3">
          <div><span className="text-gray-500">Subject: </span><strong>{ticket.subject}</strong></div>
          <div><span className="text-gray-500">Status: </span>
            <span className={`badge ${STATUS_COLORS[ticket.status] || 'badge-gray'} capitalize`}>{ticket.status?.replace('_',' ')}</span>
          </div>
          <div><span className="text-gray-500">Priority: </span>
            <span className={`badge ${PRIORITY_COLORS[ticket.priority] || 'badge-gray'} capitalize`}>{ticket.priority}</span>
          </div>
          <div className="ml-auto text-gray-400 text-xs">{ticket.createdAt ? format(new Date(ticket.createdAt), 'dd MMM yyyy HH:mm') : ''}</div>
        </div>

        {/* Message Thread */}
        <div className="space-y-3 max-h-80 overflow-y-auto scrollbar-thin border border-gray-100 rounded-xl p-3">
          {messages.length === 0 ? (
            <p className="text-center text-gray-400 text-sm py-8">No messages yet</p>
          ) : messages.map((msg, i) => (
            <div key={i} className={`flex gap-3 ${msg.role === 'admin' || msg.role === 'support' ? 'flex-row-reverse' : ''}`}>
              <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                <UserCircleIcon className="w-5 h-5 text-gray-400" />
              </div>
              <div className={`flex-1 rounded-xl p-3 text-sm ${msg.role === 'admin' || msg.role === 'support' ? 'bg-teal-50 border border-teal-100' : 'bg-gray-50 border border-gray-100'}`}>
                <p className="font-medium text-gray-700 mb-1 text-xs">
                  {msg.role === 'admin' || msg.role === 'support' ? '🛡 Support Team' : '👤 You'}
                </p>
                <p className="text-gray-700">{msg.message}</p>
                <p className="text-xs text-gray-400 mt-1">{msg.createdAt ? format(new Date(msg.createdAt), 'dd MMM HH:mm') : ''}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Reply */}
        {!isClosed ? (
          <div className="flex gap-2 items-end">
            <FormTextarea
              name="reply"
              value={reply}
              onChange={e => setReply(e.target.value)}
              placeholder="Write your reply..."
              rows={2}
              className="flex-1"
            />
            <button
              onClick={handleReply}
              disabled={sending || !reply.trim()}
              className="btn btn-primary h-10 px-4 flex-shrink-0"
            >
              <PaperAirplaneIcon className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="text-center py-3 bg-gray-50 rounded-lg text-sm text-gray-500">
            This ticket is {ticket.status}. Open a new ticket for further assistance.
          </div>
        )}
      </div>
    </Modal>
  );
}

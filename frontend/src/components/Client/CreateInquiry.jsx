import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ShoppingCartIcon,
  TrashIcon,
  CheckCircleIcon,
  PlusIcon,
  MinusIcon,
} from '@heroicons/react/24/outline';
import { orderApi } from '../../api/orderApi.js';
import { useCartContext } from '../../context/CartContext.jsx';
import { FormTextarea } from '../Common/Form.jsx';
import toast from 'react-hot-toast';

export default function CreateInquiry() {
  const { items, updateQuantity, updateNote, removeItem, clearCart, total } = useCartContext();
  const navigate  = useNavigate();
  const [notes, setNotes]     = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(null);

  const handleSubmit = async () => {
    if (items.length === 0) { toast.error('Your cart is empty'); return; }
    setLoading(true);
    try {
      const orderData = {
        items: items.map(i => ({
          productId: i.productId,
          quantity:  i.quantity,
          notes:     i.notes,
        })),
        notes,
        type: 'inquiry',
      };
      const result = await orderApi.createOrder(orderData);
      setSuccess(result);
      clearCart();
      toast.success('Inquiry submitted successfully!');
    } catch (err) {
      toast.error(err?.message || 'Failed to submit inquiry');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="max-w-lg mx-auto py-12 text-center">
        <div className="card p-10">
          <CheckCircleIcon className="w-16 h-16 text-teal-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Inquiry Submitted!</h2>
          <p className="text-gray-500 mb-2">
            Your inquiry <strong className="text-teal-700">{success.orderNumber}</strong> has been submitted.
          </p>
          <p className="text-sm text-gray-400 mb-6">
            Our team will review your inquiry and confirm availability. You'll be notified once processed.
          </p>
          <div className="flex gap-3 justify-center">
            <button onClick={() => navigate('/client/orders')} className="btn btn-primary">
              View My Orders
            </button>
            <button onClick={() => navigate('/client/products')} className="btn btn-secondary">
              Continue Shopping
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="page-header">
        <h1 className="page-title">Submit Inquiry</h1>
      </div>

      {items.length === 0 ? (
        <div className="card p-12 text-center">
          <ShoppingCartIcon className="w-16 h-16 text-gray-200 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-600 mb-2">Your cart is empty</h3>
          <p className="text-gray-400 mb-6">Browse products and add items to your inquiry cart.</p>
          <button onClick={() => navigate('/client/products')} className="btn btn-primary">
            Browse Products
          </button>
        </div>
      ) : (
        <>
          {/* Cart items */}
          <div className="card divide-y divide-gray-100">
            {items.map(item => (
              <div key={item.productId} className="p-4">
                <div className="flex items-start gap-4">
                  <div className="flex-1">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-semibold text-gray-900">{item.name}</p>
                        <p className="text-sm text-gray-500">{item.sku} · ₹{item.price.toFixed(2)} per {item.unit}</p>
                      </div>
                      <button onClick={() => removeItem(item.productId)} className="text-gray-400 hover:text-red-500 p-1">
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="flex items-center gap-4 mt-3">
                      <div className="flex items-center gap-2">
                        <button onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                          className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center hover:bg-gray-50">
                          <MinusIcon className="w-3.5 h-3.5" />
                        </button>
                        <span className="w-10 text-center font-semibold">{item.quantity}</span>
                        <button onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                          className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center hover:bg-gray-50">
                          <PlusIcon className="w-3.5 h-3.5" />
                        </button>
                        <span className="text-sm text-gray-500">{item.unit}s</span>
                      </div>
                      <span className="ml-auto font-bold text-teal-700">
                        ₹{(item.price * item.quantity).toLocaleString('en-IN')}
                      </span>
                    </div>

                    <div className="mt-2">
                      <textarea
                        value={item.notes}
                        onChange={e => updateNote(item.productId, e.target.value)}
                        placeholder="Notes for this item (optional)..."
                        rows={1}
                        className="input-field text-xs resize-none"
                      />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Summary + notes */}
          <div className="card p-5 space-y-4">
            <FormTextarea
              label="Overall Order Notes"
              name="notes"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Any special instructions or requirements..."
              rows={2}
            />

            <div className="bg-teal-50 border border-teal-200 rounded-xl p-4">
              <div className="flex justify-between text-sm text-gray-600 mb-1">
                <span>Items</span>
                <span>{items.length}</span>
              </div>
              <div className="flex justify-between text-sm text-gray-600 mb-1">
                <span>Total Qty</span>
                <span>{items.reduce((s, i) => s + i.quantity, 0)} units</span>
              </div>
              <div className="flex justify-between font-bold text-base border-t border-teal-200 pt-2 mt-2">
                <span>Estimated Value</span>
                <span className="text-teal-700">₹{total.toLocaleString('en-IN')}</span>
              </div>
              <p className="text-xs text-teal-600 mt-2">
                * Final price will be confirmed after admin review. GST applicable.
              </p>
            </div>

            <div className="flex gap-3">
              <button onClick={() => navigate('/client/products')} className="btn btn-secondary flex-1">
                Add More Items
              </button>
              <button onClick={handleSubmit} disabled={loading} className="btn btn-primary flex-1 btn-lg">
                {loading ? 'Submitting...' : 'Submit Inquiry'}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

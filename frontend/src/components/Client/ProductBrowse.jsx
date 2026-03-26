import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  MagnifyingGlassIcon,
  ShoppingCartIcon,
  XMarkIcon,
  PlusIcon,
  MinusIcon,
} from '@heroicons/react/24/outline';
import { productApi } from '../../api/productApi.js';
import { useCartContext } from '../../context/CartContext.jsx';
import useApi from '../../hooks/useApi.js';

const CATEGORIES = ['All','Tablet','Capsule','Syrup','Injection','Ointment','Drops','Powder','Device','Other'];

function ProductCard({ product, onAdd }) {
  const { items } = useCartContext();
  const inCart = items.some(i => i.productId === product._id);

  return (
    <div className="card flex flex-col hover:shadow-md transition-shadow">
      <div className="p-5 flex-1">
        <div className="flex items-start justify-between gap-2 mb-2">
          <h4 className="font-semibold text-gray-900 text-sm leading-snug">{product.name}</h4>
          {product.totalStock <= (product.reorderLevel || 10) && product.totalStock > 0 && (
            <span className="badge badge-yellow flex-shrink-0">Low Stock</span>
          )}
          {product.totalStock === 0 && (
            <span className="badge badge-red flex-shrink-0">Out of Stock</span>
          )}
        </div>
        <p className="text-xs text-gray-500 mb-3">{product.manufacturer} · {product.sku}</p>
        <div className="flex flex-wrap gap-1 mb-3">
          {product.category && <span className="badge badge-teal">{product.category}</span>}
          {product.gstRate !== undefined && <span className="badge badge-gray">GST {product.gstRate}%</span>}
        </div>
        <p className="text-lg font-bold text-teal-700">₹{(product.price||0).toFixed(2)}</p>
        <p className="text-xs text-gray-400">per {product.unit || 'unit'}</p>
        {product.description && (
          <p className="text-xs text-gray-500 mt-2 line-clamp-2">{product.description}</p>
        )}
      </div>
      <div className="p-4 border-t border-gray-100">
        <button
          onClick={() => onAdd(product)}
          disabled={product.totalStock === 0}
          className={`btn w-full ${inCart ? 'btn-secondary' : 'btn-primary'}`}
        >
          <ShoppingCartIcon className="w-4 h-4 mr-1.5" />
          {inCart ? 'Update Cart' : 'Add to Inquiry'}
        </button>
      </div>
    </div>
  );
}

function CartDrawer({ open, onClose }) {
  const { items, updateQuantity, removeItem, total, clearCart } = useCartContext();
  const navigate = useNavigate();

  return (
    <>
      {open && <div className="fixed inset-0 z-20 bg-black/40" onClick={onClose} />}
      <div className={`fixed right-0 top-0 h-full w-full max-w-sm bg-white shadow-xl z-30 flex flex-col transform transition-transform duration-300 ${open ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h3 className="font-semibold text-gray-900 flex items-center gap-2">
            <ShoppingCartIcon className="w-5 h-5 text-teal-600" />
            Inquiry Cart ({items.length})
          </h3>
          <button onClick={onClose} className="p-1.5 rounded hover:bg-gray-100">
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto scrollbar-thin p-4 space-y-3">
          {items.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <ShoppingCartIcon className="w-12 h-12 mx-auto mb-2 text-gray-200" />
              <p className="text-sm">Your cart is empty</p>
            </div>
          ) : (
            items.map(item => (
              <div key={item.productId} className="bg-gray-50 rounded-xl p-3">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div>
                    <p className="font-medium text-gray-900 text-sm">{item.name}</p>
                    <p className="text-xs text-gray-500">₹{item.price.toFixed(2)} / {item.unit}</p>
                  </div>
                  <button onClick={() => removeItem(item.productId)} className="text-gray-400 hover:text-red-500">
                    <XMarkIcon className="w-4 h-4" />
                  </button>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <button onClick={() => updateQuantity(item.productId, item.quantity - 1)} className="w-7 h-7 rounded-lg border border-gray-300 flex items-center justify-center hover:bg-gray-100">
                      <MinusIcon className="w-3 h-3" />
                    </button>
                    <span className="font-semibold text-sm w-8 text-center">{item.quantity}</span>
                    <button onClick={() => updateQuantity(item.productId, item.quantity + 1)} className="w-7 h-7 rounded-lg border border-gray-300 flex items-center justify-center hover:bg-gray-100">
                      <PlusIcon className="w-3 h-3" />
                    </button>
                  </div>
                  <span className="font-semibold text-teal-700 text-sm">₹{(item.price * item.quantity).toLocaleString('en-IN')}</span>
                </div>
              </div>
            ))
          )}
        </div>

        {items.length > 0 && (
          <div className="p-4 border-t border-gray-200 space-y-3">
            <div className="flex items-center justify-between font-semibold">
              <span>Estimated Total</span>
              <span className="text-teal-700">₹{total.toLocaleString('en-IN')}</span>
            </div>
            <button onClick={() => { onClose(); navigate('/client/inquiries'); }} className="btn btn-primary w-full btn-lg">
              Review &amp; Submit Inquiry
            </button>
            <button onClick={clearCart} className="btn btn-secondary w-full btn-sm">Clear Cart</button>
          </div>
        )}
      </div>
    </>
  );
}

export default function ProductBrowse() {
  const [search, setSearch]     = useState('');
  const [category, setCategory] = useState('All');
  const [cartOpen, setCartOpen] = useState(false);
  const [page, setPage]         = useState(1);
  const { addItem, itemCount }  = useCartContext();
  const pageSize = 12;

  const { data, loading } = useApi(
    () => productApi.getAllProducts({
      search,
      category: category === 'All' ? '' : category,
      page,
      limit: pageSize,
    }),
    [search, category, page],
    { defaultData: { products: [], total: 0 } }
  );

  const products = data?.products || [];
  const total    = data?.total    || 0;
  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="space-y-6">
      <div className="page-header">
        <h1 className="page-title">Browse Products</h1>
        <button onClick={() => setCartOpen(true)} className="btn btn-primary relative">
          <ShoppingCartIcon className="w-4 h-4 mr-1.5" />
          Inquiry Cart
          {itemCount > 0 && (
            <span className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold">
              {itemCount}
            </span>
          )}
        </button>
      </div>

      {/* Filters */}
      <div className="card p-4 space-y-3">
        <div className="relative">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input type="text" placeholder="Search products by name, SKU, manufacturer..."
            value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
            className="input-field pl-9" />
        </div>
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map(c => (
            <button
              key={c}
              onClick={() => { setCategory(c); setPage(1); }}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors
                ${category === c ? 'bg-teal-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="card p-5 animate-pulse">
              <div className="h-4 bg-gray-200 rounded mb-2 w-3/4" />
              <div className="h-3 bg-gray-200 rounded mb-3 w-1/2" />
              <div className="h-6 bg-gray-200 rounded w-1/3 mt-4" />
            </div>
          ))}
        </div>
      ) : products.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <MagnifyingGlassIcon className="w-12 h-12 mx-auto mb-3 text-gray-200" />
          <p>No products found</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {products.map(p => (
              <ProductCard key={p._id} product={p} onAdd={addItem} />
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex justify-center gap-2">
              {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => i + 1).map(p => (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  className={`w-9 h-9 rounded-lg text-sm font-medium ${page === p ? 'bg-teal-600 text-white' : 'bg-white border border-gray-200 hover:bg-gray-50'}`}
                >
                  {p}
                </button>
              ))}
            </div>
          )}
        </>
      )}

      <CartDrawer open={cartOpen} onClose={() => setCartOpen(false)} />
    </div>
  );
}

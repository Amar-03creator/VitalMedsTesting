import { useState } from 'react';
import {
  MagnifyingGlassIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  CubeIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';
import { productApi } from '../../api/productApi.js';
import useApi from '../../hooks/useApi.js';
import useForm from '../../hooks/useForm.js';
import Table from '../Common/Table.jsx';
import Modal from '../Common/Modal.jsx';
import { FormField, FormSelect, FormTextarea, SubmitButton } from '../Common/Form.jsx';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

const CATEGORIES = ['Tablet','Capsule','Syrup','Injection','Ointment','Drops','Powder','Device','Other'];
const GST_RATES   = [0, 5, 12, 18, 28];

const validate = (v) => {
  const e = {};
  if (!v.name) e.name = 'Product name is required';
  if (!v.sku)  e.sku  = 'SKU is required';
  if (!v.price || v.price <= 0) e.price = 'Valid price required';
  return e;
};

export default function ProductManagement() {
  const [search, setSearch]       = useState('');
  const [category, setCategory]   = useState('');
  const [page, setPage]           = useState(1);
  const [modal, setModal]         = useState(null); // { type: 'add'|'edit'|'batches', product? }
  const pageSize = 10;

  const { data, loading, refetch } = useApi(
    () => productApi.getAllProducts({ search, category, page, limit: pageSize }),
    [search, category, page],
    { defaultData: { products: [], total: 0 } }
  );

  const products = data?.products || [];
  const total    = data?.total    || 0;

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this product?')) return;
    try {
      await productApi.deleteProduct(id);
      toast.success('Product deleted');
      refetch();
    } catch (err) {
      toast.error(err?.message || 'Failed to delete');
    }
  };

  const columns = [
    {
      key: 'name', label: 'Product', sortable: true,
      render: (v, row) => (
        <div>
          <p className="font-medium text-gray-900">{v}</p>
          <p className="text-xs text-gray-500">{row.sku} · {row.manufacturer}</p>
        </div>
      ),
    },
    { key: 'category',   label: 'Category' },
    { key: 'unit',       label: 'Unit' },
    { key: 'price',      label: 'Price (MRP)',   render: v => `₹${(v||0).toFixed(2)}` },
    { key: 'gstRate',    label: 'GST',           render: v => `${v||0}%` },
    {
      key: 'totalStock', label: 'Stock',
      render: (v, row) => (
        <span className={`font-semibold ${v <= (row.reorderLevel || 10) ? 'text-red-600' : 'text-gray-800'}`}>
          {v ?? 0} {row.unit}
          {v <= (row.reorderLevel || 10) && <ExclamationTriangleIcon className="w-3.5 h-3.5 text-red-500 inline ml-1" />}
        </span>
      ),
    },
    {
      key: 'actions', label: 'Actions',
      render: (_, row) => (
        <div className="flex items-center gap-1">
          <button onClick={() => setModal({ type: 'batches', product: row })} className="p-1.5 rounded hover:bg-teal-50 text-teal-600" title="Batches"><CubeIcon className="w-4 h-4" /></button>
          <button onClick={() => setModal({ type: 'edit', product: row })}    className="p-1.5 rounded hover:bg-blue-50 text-blue-500"  title="Edit"><PencilIcon className="w-4 h-4" /></button>
          <button onClick={() => handleDelete(row._id)}                        className="p-1.5 rounded hover:bg-red-50 text-red-500"    title="Delete"><TrashIcon className="w-4 h-4" /></button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="page-header">
        <h1 className="page-title">Product Management</h1>
        <button onClick={() => setModal({ type: 'add' })} className="btn btn-primary">
          <PlusIcon className="w-4 h-4 mr-1" /> Add Product
        </button>
      </div>

      {/* Filters */}
      <div className="card p-4 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input type="text" placeholder="Search products..." value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }} className="input-field pl-9" />
        </div>
        <select value={category} onChange={e => { setCategory(e.target.value); setPage(1); }} className="input-field w-44">
          <option value="">All Categories</option>
          {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      <div className="card p-4">
        <Table
          columns={columns}
          data={products}
          loading={loading}
          emptyMessage="No products found"
          pagination={{ page, pageSize, total, totalPages: Math.ceil(total / pageSize), onChange: setPage }}
        />
      </div>

      {(modal?.type === 'add' || modal?.type === 'edit') && (
        <ProductFormModal
          product={modal.product}
          onClose={() => setModal(null)}
          onSaved={() => { setModal(null); refetch(); }}
        />
      )}

      {modal?.type === 'batches' && (
        <BatchModal product={modal.product} onClose={() => setModal(null)} />
      )}
    </div>
  );
}

function ProductFormModal({ product, onClose, onSaved }) {
  const isEdit = !!product;
  const { values, errors, submitting, handleChange, handleBlur, handleSubmit } = useForm(
    {
      name:           product?.name         || '',
      sku:            product?.sku          || '',
      manufacturer:   product?.manufacturer || '',
      category:       product?.category     || '',
      unit:           product?.unit         || '',
      price:          product?.price        || '',
      purchasePrice:  product?.purchasePrice|| '',
      gstRate:        product?.gstRate      ?? 12,
      reorderLevel:   product?.reorderLevel || 10,
      description:    product?.description  || '',
      hsnCode:        product?.hsnCode      || '',
    },
    validate
  );

  const onSubmit = handleSubmit(async (data) => {
    if (isEdit) {
      await productApi.updateProduct(product._id, data);
      toast.success('Product updated');
    } else {
      await productApi.createProduct(data);
      toast.success('Product created');
    }
    onSaved();
  });

  return (
    <Modal open title={isEdit ? 'Edit Product' : 'Add Product'} onClose={onClose} size="lg"
      footer={
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="btn btn-secondary">Cancel</button>
          <SubmitButton loading={submitting} onClick={onSubmit}>{isEdit ? 'Save Changes' : 'Create Product'}</SubmitButton>
        </div>
      }
    >
      <form onSubmit={onSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <FormField label="Product Name" name="name" value={values.name} onChange={handleChange} onBlur={handleBlur} error={errors.name} required className="sm:col-span-2" />
        <FormField label="SKU / Product Code" name="sku" value={values.sku} onChange={handleChange} onBlur={handleBlur} error={errors.sku} required />
        <FormField label="HSN Code" name="hsnCode" value={values.hsnCode} onChange={handleChange} />
        <FormField label="Manufacturer" name="manufacturer" value={values.manufacturer} onChange={handleChange} />
        <FormSelect label="Category" name="category" value={values.category} onChange={handleChange} options={CATEGORIES} placeholder="Select category" />
        <FormField label="Unit (e.g. Strip, Bottle)" name="unit" value={values.unit} onChange={handleChange} />
        <FormField label="MRP / Sale Price (₹)" name="price" type="number" value={values.price} onChange={handleChange} onBlur={handleBlur} error={errors.price} required />
        <FormField label="Purchase Price (₹)" name="purchasePrice" type="number" value={values.purchasePrice} onChange={handleChange} />
        <FormSelect label="GST Rate (%)" name="gstRate" value={values.gstRate} onChange={handleChange} options={GST_RATES.map(r => ({ value: r, label: `${r}%` }))} />
        <FormField label="Reorder Level" name="reorderLevel" type="number" value={values.reorderLevel} onChange={handleChange} />
        <FormTextarea label="Description" name="description" value={values.description} onChange={handleChange} className="sm:col-span-2" rows={2} />
      </form>
    </Modal>
  );
}

function BatchModal({ product, onClose }) {
  const { data: batches, loading, refetch } = useApi(
    () => productApi.getBatches(product._id),
    [product._id],
    { defaultData: [] }
  );

  const { values, handleChange, handleSubmit, reset, submitting } = useForm({
    batchNumber: '', quantity: '', purchasePrice: '', mrp: '', manufacturingDate: '', expiryDate: '',
  });

  const onAddBatch = handleSubmit(async (data) => {
    await productApi.addBatch(product._id, data);
    toast.success('Batch added');
    reset();
    refetch();
  });

  const batchColumns = [
    { key: 'batchNumber',      label: 'Batch #' },
    { key: 'quantity',         label: 'Qty' },
    { key: 'purchasePrice',    label: 'Purchase ₹', render: v => `₹${(v||0).toFixed(2)}` },
    { key: 'mrp',              label: 'MRP ₹',       render: v => `₹${(v||0).toFixed(2)}` },
    { key: 'manufacturingDate',label: 'Mfg Date',    render: v => v ? format(new Date(v), 'MMM yyyy') : '—' },
    { key: 'expiryDate',       label: 'Expiry',      render: (v) => {
      if (!v) return '—';
      const d = new Date(v);
      const diff = (d - new Date()) / (1000 * 60 * 60 * 24);
      return <span className={diff < 90 ? 'text-red-600 font-medium' : ''}>{format(d, 'MMM yyyy')}</span>;
    }},
  ];

  return (
    <Modal open title={`Batches – ${product.name}`} onClose={onClose} size="xl">
      <div className="space-y-6">
        <div>
          <h4 className="font-semibold text-gray-700 mb-3">Add New Batch</h4>
          <form onSubmit={onAddBatch} className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <FormField label="Batch Number" name="batchNumber" value={values.batchNumber} onChange={handleChange} required />
            <FormField label="Quantity"     name="quantity"    value={values.quantity}    onChange={handleChange} type="number" required />
            <FormField label="Purchase ₹"  name="purchasePrice" value={values.purchasePrice} onChange={handleChange} type="number" />
            <FormField label="MRP ₹"       name="mrp"         value={values.mrp}         onChange={handleChange} type="number" />
            <FormField label="Mfg Date"    name="manufacturingDate" value={values.manufacturingDate} onChange={handleChange} type="date" />
            <FormField label="Expiry Date" name="expiryDate"  value={values.expiryDate}  onChange={handleChange} type="date" required />
          </form>
          <div className="mt-3 flex justify-end">
            <SubmitButton loading={submitting} onClick={onAddBatch}>Add Batch</SubmitButton>
          </div>
        </div>
        <div>
          <h4 className="font-semibold text-gray-700 mb-3">Existing Batches</h4>
          <Table columns={batchColumns} data={batches || []} loading={loading} emptyMessage="No batches added yet" rowKey="batchNumber" />
        </div>
      </div>
    </Modal>
  );
}

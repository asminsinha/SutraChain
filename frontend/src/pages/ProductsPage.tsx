import React, { useEffect, useState } from 'react';
import {
  Package,
  Plus,
  Search,
  Filter,
  Edit2,
  Trash2,
  Eye,
  CheckCircle2,
  AlertCircle,
  ArrowUpDown,
  RefreshCw,
  X
} from 'lucide-react';
import { api, Product } from '../services/api';
import { Modal } from '../components/Modal';

export const ProductsPage: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const limit = 10;

  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('ALL');
  const [stockStatus, setStockStatus] = useState('ALL');
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState<-1 | 1>(-1);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // Modals & Drawers
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [detailProduct, setDetailProduct] = useState<Product | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    product_id: '',
    name: '',
    category: 'Electronics',
    price: 99.99,
    stock_quantity: 50,
    vendor_id: 'VEND-8801',
    color: 'Matte Black',
    warranty_months: 12,
  });

  // Notification Toast
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  };

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const data = await api.getProducts({
        limit,
        skip: (page - 1) * limit,
        search: search.trim() || undefined,
        category: category !== 'ALL' ? category : undefined,
        stock_status: stockStatus !== 'ALL' ? stockStatus : undefined,
        sort_by: sortBy,
        sort_order: sortOrder,
      });
      setProducts(data.products);
      setTotal(data.total);
    } catch (err: any) {
      showToast(err.message || 'Failed to fetch products', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, [page, category, stockStatus, sortBy, sortOrder]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchProducts();
  };

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setActionLoading(true);
      const res = await api.createProduct({
        product_id: formData.product_id.trim().toUpperCase(),
        name: formData.name.trim(),
        category: formData.category,
        price: Number(formData.price),
        stock_quantity: Number(formData.stock_quantity),
        vendor_id: formData.vendor_id.trim(),
        specs: {
          color: formData.color,
          warranty_months: Number(formData.warranty_months),
        },
      });
      showToast(`Product ${res.data.product_id} created & synchronised with Neo4j!`);
      setIsAddOpen(false);
      fetchProducts();
    } catch (err: any) {
      showToast(err.message || 'Creation failed', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct) return;
    try {
      setActionLoading(true);
      await api.updateProduct(selectedProduct.product_id, {
        name: formData.name.trim(),
        category: formData.category,
        price: Number(formData.price),
        stock_quantity: Number(formData.stock_quantity),
        vendor_id: formData.vendor_id.trim(),
      });
      showToast(`Product ${selectedProduct.product_id} updated successfully!`);
      setIsEditOpen(false);
      fetchProducts();
    } catch (err: any) {
      showToast(err.message || 'Update failed', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteProduct = async () => {
    if (!selectedProduct) return;
    try {
      setActionLoading(true);
      await api.deleteProduct(selectedProduct.product_id);
      showToast(`Product ${selectedProduct.product_id} deleted and detached from graph.`);
      setIsDeleteOpen(false);
      setSelectedProduct(null);
      fetchProducts();
    } catch (err: any) {
      showToast(err.message || 'Delete failed', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const openEditModal = (prod: Product) => {
    setSelectedProduct(prod);
    setFormData({
      product_id: prod.product_id,
      name: prod.name,
      category: prod.category,
      price: prod.price,
      stock_quantity: prod.stock_quantity,
      vendor_id: prod.vendor_id || 'VEND-8801',
      color: prod.specs?.color || 'Standard',
      warranty_months: prod.specs?.warranty_months || 12,
    });
    setIsEditOpen(true);
  };

  const openDeleteModal = (prod: Product) => {
    setSelectedProduct(prod);
    setIsDeleteOpen(true);
  };

  const categoriesList = ['ALL', 'Electronics', 'Industrial', 'Apparel', 'Home Appliance', 'Automotive', 'Medical Devices'];

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {notification && (
        <div
          className={`p-4 rounded-xl border flex items-center justify-between text-sm shadow-lg ${
            notification.type === 'success'
              ? 'bg-emerald-950/80 border-emerald-800 text-emerald-200'
              : 'bg-rose-950/80 border-rose-800 text-rose-200'
          }`}
        >
          <div className="flex items-center space-x-2">
            {notification.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-400" />
            )}
            <span>{notification.message}</span>
          </div>
          <button onClick={() => setNotification(null)} className="text-slate-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Page Header & Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-white dark:text-white light:text-slate-900">
            Product Catalogue Management
          </h2>
          <p className="text-xs text-slate-400">
            CRUD operations on MongoDB transactional documents with automatic Neo4j product node synchronisation.
          </p>
        </div>

        <button
          onClick={() => {
            const nextNum = 1020 + total + Math.floor(Math.random() * 90);
            setFormData({
              product_id: `PROD-${nextNum}`,
              name: '',
              category: 'Electronics',
              price: 120.0,
              stock_quantity: 45,
              vendor_id: 'VEND-8801',
              color: 'Matte Black',
              warranty_months: 12,
            });
            setIsAddOpen(true);
          }}
          className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-sm font-medium transition shadow-md shadow-sky-600/20"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Product</span>
        </button>
      </div>

      {/* Filter & Search Toolbar */}
      <div className="p-4 rounded-xl border border-slate-800 dark:border-slate-800 light:border-slate-200 bg-slate-900/60 dark:bg-slate-900/60 light:bg-white flex flex-col md:flex-row gap-3 items-center justify-between">
        {/* Search Bar */}
        <form onSubmit={handleSearchSubmit} className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="Search by name, ID, or SKU..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-lg bg-slate-950 dark:bg-slate-950 light:bg-slate-50 border border-slate-700 dark:border-slate-700 light:border-slate-300 text-xs text-slate-200 dark:text-slate-200 light:text-slate-800 placeholder-slate-500 focus:outline-none focus:border-sky-500"
          />
        </form>

        {/* Filter Dropdowns */}
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          {/* Category Dropdown */}
          <select
            value={category}
            onChange={(e) => {
              setCategory(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 rounded-lg bg-slate-950 dark:bg-slate-950 light:bg-slate-50 border border-slate-700 dark:border-slate-700 light:border-slate-300 text-xs text-slate-200 dark:text-slate-200 light:text-slate-800 focus:outline-none"
          >
            {categoriesList.map((cat) => (
              <option key={cat} value={cat}>
                Category: {cat}
              </option>
            ))}
          </select>

          {/* Stock Filter */}
          <select
            value={stockStatus}
            onChange={(e) => {
              setStockStatus(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 rounded-lg bg-slate-950 dark:bg-slate-950 light:bg-slate-50 border border-slate-700 dark:border-slate-700 light:border-slate-300 text-xs text-slate-200 dark:text-slate-200 light:text-slate-800 focus:outline-none"
          >
            <option value="ALL">Stock: All</option>
            <option value="IN_STOCK">In Stock (&gt;30)</option>
            <option value="LOW">Low Stock (≤30)</option>
            <option value="OUT_OF_STOCK">Out of Stock (0)</option>
          </select>

          {/* Sort By */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="px-3 py-2 rounded-lg bg-slate-950 dark:bg-slate-950 light:bg-slate-50 border border-slate-700 dark:border-slate-700 light:border-slate-300 text-xs text-slate-200 dark:text-slate-200 light:text-slate-800 focus:outline-none"
          >
            <option value="created_at">Sort: Created Date</option>
            <option value="price">Sort: Price</option>
            <option value="stock_quantity">Sort: Stock Level</option>
            <option value="name">Sort: Name</option>
          </select>

          {/* Sort Direction Toggle */}
          <button
            onClick={() => setSortOrder(sortOrder === 1 ? -1 : 1)}
            title="Toggle sort direction"
            className="p-2 rounded-lg bg-slate-800 dark:bg-slate-800 light:bg-slate-200 text-slate-300 dark:text-slate-300 light:text-slate-700 hover:bg-slate-700 transition"
          >
            <ArrowUpDown className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Product Data Table */}
      <div className="rounded-xl border border-slate-800 dark:border-slate-800 light:border-slate-200 bg-slate-900/60 dark:bg-slate-900/60 light:bg-white overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="text-slate-400 bg-slate-950/50 dark:bg-slate-950/50 light:bg-slate-50 border-b border-slate-800 dark:border-slate-800 light:border-slate-200 uppercase tracking-wider font-semibold">
              <tr>
                <th className="py-3 px-4">Product ID</th>
                <th className="py-3 px-4">Name & Specs</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Vendor</th>
                <th className="py-3 px-4 text-right">Unit Price</th>
                <th className="py-3 px-4 text-center">Available Stock</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 dark:divide-slate-800/60 light:divide-slate-200">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center space-y-2">
                      <RefreshCw className="w-5 h-5 animate-spin text-sky-400" />
                      <span>Loading products from MongoDB...</span>
                    </div>
                  </td>
                </tr>
              ) : products.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    No products matched your search or filters.
                  </td>
                </tr>
              ) : (
                products.map((prod) => (
                  <tr key={prod.product_id} className="hover:bg-slate-800/30 dark:hover:bg-slate-800/30 light:hover:bg-slate-50 transition">
                    <td className="py-3 px-4 font-mono font-semibold text-sky-400">
                      {prod.product_id}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-medium text-slate-100 dark:text-slate-100 light:text-slate-900">
                        {prod.name}
                      </div>
                      <div className="text-[11px] text-slate-400">
                        Color: {prod.specs?.color || 'Standard'} · {prod.specs?.warranty_months || 12}M Warranty
                      </div>
                    </td>
                    <td className="py-3 px-4 text-slate-300 dark:text-slate-300 light:text-slate-700">
                      <span className="px-2 py-0.5 rounded bg-slate-800 dark:bg-slate-800 light:bg-slate-100 border border-slate-700 dark:border-slate-700 light:border-slate-200 text-[11px]">
                        {prod.category}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono text-[11px] text-slate-400">
                      {prod.vendor_id || '—'}
                    </td>
                    <td className="py-3 px-4 text-right font-semibold text-slate-100 dark:text-slate-100 light:text-slate-900">
                      ${prod.price.toFixed(2)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                          prod.stock_quantity <= 10
                            ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                            : prod.stock_quantity <= 30
                            ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                            : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        }`}
                      >
                        {prod.stock_quantity} in stock
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right space-x-1">
                      <button
                        onClick={() => setDetailProduct(prod)}
                        title="View Details"
                        className="p-1.5 rounded hover:bg-slate-800 dark:hover:bg-slate-800 light:hover:bg-slate-200 text-slate-400 hover:text-slate-200"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => openEditModal(prod)}
                        title="Edit Product"
                        className="p-1.5 rounded hover:bg-slate-800 dark:hover:bg-slate-800 light:hover:bg-slate-200 text-sky-400 hover:text-sky-300"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => openDeleteModal(prod)}
                        title="Delete Product"
                        className="p-1.5 rounded hover:bg-slate-800 dark:hover:bg-slate-800 light:hover:bg-slate-200 text-rose-400 hover:text-rose-300"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="p-4 border-t border-slate-800 dark:border-slate-800 light:border-slate-200 flex items-center justify-between text-xs text-slate-400 bg-slate-950/30">
          <div>
            Showing <span className="font-semibold text-slate-200">{products.length}</span> of{' '}
            <span className="font-semibold text-slate-200">{total}</span> products
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1.5 rounded bg-slate-800 dark:bg-slate-800 light:bg-slate-200 text-slate-200 dark:text-slate-200 light:text-slate-800 disabled:opacity-40"
            >
              Previous
            </button>
            <span className="font-medium text-slate-300">
              Page {page} of {Math.ceil(total / limit) || 1}
            </span>
            <button
              onClick={() => setPage((p) => (p * limit < total ? p + 1 : p))}
              disabled={page * limit >= total}
              className="px-3 py-1.5 rounded bg-slate-800 dark:bg-slate-800 light:bg-slate-200 text-slate-200 dark:text-slate-200 light:text-slate-800 disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* CREATE PRODUCT MODAL */}
      <Modal isOpen={isAddOpen} onClose={() => setIsAddOpen(false)} title="Create New Product (Polyglot Synced)">
        <form onSubmit={handleCreateProduct} className="space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-400 mb-1 font-medium">Product ID</label>
              <input
                type="text"
                required
                value={formData.product_id}
                onChange={(e) => setFormData({ ...formData, product_id: e.target.value })}
                className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-slate-100 font-mono text-xs focus:border-sky-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-slate-400 mb-1 font-medium">Vendor ID</label>
              <input
                type="text"
                required
                value={formData.vendor_id}
                onChange={(e) => setFormData({ ...formData, vendor_id: e.target.value })}
                className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-slate-100 font-mono text-xs focus:border-sky-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-400 mb-1 font-medium">Product Commercial Name</label>
            <input
              type="text"
              required
              placeholder="e.g. Smart IoT Edge Controller v2.0"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-slate-100 text-xs focus:border-sky-500 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-slate-400 mb-1 font-medium">Category</label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-slate-100 text-xs focus:border-sky-500 focus:outline-none"
              >
                {categoriesList.filter((c) => c !== 'ALL').map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-slate-400 mb-1 font-medium">Unit Price ($)</label>
              <input
                type="number"
                step="0.01"
                min="1"
                required
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) })}
                className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-slate-100 text-xs focus:border-sky-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-slate-400 mb-1 font-medium">Initial Stock</label>
              <input
                type="number"
                min="0"
                required
                value={formData.stock_quantity}
                onChange={(e) => setFormData({ ...formData, stock_quantity: parseInt(e.target.value) })}
                className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-slate-100 text-xs focus:border-sky-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="p-3 rounded-lg bg-sky-950/40 border border-sky-800/60 text-[11px] text-sky-300">
            <strong>Cross-Database Note:</strong> This will create a document in MongoDB <code>products</code> collection and insert a connected <code>(:Product)</code> node in Neo4j with <code>[:SUPPLIES]</code> and <code>[:STOCKED_AT]</code> relationships.
          </div>

          <div className="flex justify-end space-x-2 pt-2">
            <button
              type="button"
              onClick={() => setIsAddOpen(false)}
              className="px-4 py-2 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 text-xs"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={actionLoading}
              className="px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold"
            >
              {actionLoading ? 'Creating...' : 'Create & Persist'}
            </button>
          </div>
        </form>
      </Modal>

      {/* EDIT PRODUCT MODAL */}
      <Modal isOpen={isEditOpen} onClose={() => setIsEditOpen(false)} title={`Edit Product: ${selectedProduct?.product_id}`}>
        <form onSubmit={handleUpdateProduct} className="space-y-4 text-xs">
          <div>
            <label className="block text-slate-400 mb-1 font-medium">Product Name</label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-slate-100 text-xs focus:border-sky-500 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-400 mb-1 font-medium">Category</label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-slate-100 text-xs focus:border-sky-500 focus:outline-none"
              >
                {categoriesList.filter((c) => c !== 'ALL').map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-slate-400 mb-1 font-medium">Vendor ID</label>
              <input
                type="text"
                value={formData.vendor_id}
                onChange={(e) => setFormData({ ...formData, vendor_id: e.target.value })}
                className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-slate-100 font-mono text-xs focus:border-sky-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-400 mb-1 font-medium">Price ($)</label>
              <input
                type="number"
                step="0.01"
                min="1"
                required
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) })}
                className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-slate-100 text-xs focus:border-sky-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-slate-400 mb-1 font-medium">Stock Quantity</label>
              <input
                type="number"
                min="0"
                required
                value={formData.stock_quantity}
                onChange={(e) => setFormData({ ...formData, stock_quantity: parseInt(e.target.value) })}
                className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-slate-100 text-xs focus:border-sky-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="flex justify-end space-x-2 pt-2">
            <button
              type="button"
              onClick={() => setIsEditOpen(false)}
              className="px-4 py-2 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 text-xs"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={actionLoading}
              className="px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold"
            >
              {actionLoading ? 'Updating...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </Modal>

      {/* DELETE CONFIRMATION MODAL */}
      <Modal isOpen={isDeleteOpen} onClose={() => setIsDeleteOpen(false)} title="Confirm Product Deletion">
        <div className="space-y-4 text-xs">
          <p className="text-slate-300">
            Are you sure you want to permanently delete{' '}
            <strong className="text-rose-400 font-mono">{selectedProduct?.product_id}</strong> (
            <em>{selectedProduct?.name}</em>)?
          </p>
          <div className="p-3 rounded-lg bg-rose-950/40 border border-rose-800/60 text-[11px] text-rose-300">
            <strong>Cross-Database Synchronization:</strong> This will delete the document in MongoDB and perform a <code>DETACH DELETE</code> on the associated <code>(:Product)</code> node in Neo4j to maintain polyglot graph consistency.
          </div>
          <div className="flex justify-end space-x-2 pt-2">
            <button
              type="button"
              onClick={() => setIsDeleteOpen(false)}
              className="px-4 py-2 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 text-xs"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleDeleteProduct}
              disabled={actionLoading}
              className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold"
            >
              {actionLoading ? 'Deleting...' : 'Delete from Both Databases'}
            </button>
          </div>
        </div>
      </Modal>

      {/* PRODUCT DETAIL SLIDE-OUT DRAWER */}
      {detailProduct && (
        <div className="fixed inset-y-0 right-0 w-96 bg-slate-900 border-l border-slate-800 shadow-2xl p-6 z-50 flex flex-col justify-between overflow-y-auto animate-fadeIn">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center space-x-2">
                <Package className="w-5 h-5 text-sky-400" />
                <h3 className="font-bold text-sm text-white">Product Intelligence</h3>
              </div>
              <button
                onClick={() => setDetailProduct(null)}
                className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-4 space-y-4 text-xs">
              <div>
                <span className="text-slate-400 text-[10px] uppercase font-semibold">Identifier</span>
                <div className="font-mono text-sky-400 font-bold text-base">{detailProduct.product_id}</div>
              </div>

              <div>
                <span className="text-slate-400 text-[10px] uppercase font-semibold">Title</span>
                <div className="text-slate-100 font-medium text-sm">{detailProduct.name}</div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <div className="p-2.5 rounded bg-slate-950 border border-slate-800">
                  <span className="text-slate-400 text-[10px] uppercase">Price</span>
                  <div className="text-emerald-400 font-bold text-base">${detailProduct.price.toFixed(2)}</div>
                </div>
                <div className="p-2.5 rounded bg-slate-950 border border-slate-800">
                  <span className="text-slate-400 text-[10px] uppercase">Current Stock</span>
                  <div className="text-amber-400 font-bold text-base">{detailProduct.stock_quantity} units</div>
                </div>
              </div>

              <div className="space-y-2 pt-2">
                <span className="text-slate-400 text-[10px] uppercase font-semibold">Specifications</span>
                <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-1.5 font-mono text-[11px]">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Category:</span>
                    <span className="text-slate-200">{detailProduct.category}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Vendor ID:</span>
                    <span className="text-slate-200">{detailProduct.vendor_id || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Color:</span>
                    <span className="text-slate-200">{detailProduct.specs?.color || 'Standard'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Warranty:</span>
                    <span className="text-slate-200">{detailProduct.specs?.warranty_months || 12} Months</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Created:</span>
                    <span className="text-slate-400">{detailProduct.created_at?.slice(0, 10) || '2026-02-01'}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-800">
            <button
              onClick={() => setDetailProduct(null)}
              className="w-full py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold"
            >
              Close Drawer
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

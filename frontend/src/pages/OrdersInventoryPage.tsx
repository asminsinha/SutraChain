import React, { useEffect, useState } from 'react';
import {
  Boxes,
  Truck,
  History,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  PlusCircle,
  MinusCircle,
  Clock,
  Filter,
  Eye,
  RefreshCw,
  X
} from 'lucide-react';
import { api, Order, InventoryLog, Product } from '../services/api';
import { Modal } from '../components/Modal';

export const OrdersInventoryPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'orders' | 'inventory'>('orders');

  // Orders State
  const [orders, setOrders] = useState<Order[]>([]);
  const [totalOrders, setTotalOrders] = useState(0);
  const [orderStatusFilter, setOrderStatusFilter] = useState('ALL');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  // Inventory & Products State
  const [products, setProducts] = useState<Product[]>([]);
  const [inventoryLogs, setInventoryLogs] = useState<InventoryLog[]>([]);
  const [loading, setLoading] = useState(true);

  // Stock Adjustment Modal
  const [adjustModalOpen, setAdjustModalOpen] = useState(false);
  const [adjustProduct, setAdjustProduct] = useState<Product | null>(null);
  const [adjustQty, setAdjustQty] = useState<number>(10);
  const [adjustReason, setAdjustReason] = useState('RESTOCK RECEIPT');
  const [adjustWarehouse, setAdjustWarehouse] = useState('WH-01');
  const [actionLoading, setActionLoading] = useState(false);

  // Toast
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const data = await api.getOrders({
        limit: 50,
        status: orderStatusFilter !== 'ALL' ? orderStatusFilter : undefined,
      });
      setOrders(data.orders);
      setTotalOrders(data.total);
    } catch (err: any) {
      showToast(err.message || 'Failed to fetch orders', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchInventoryData = async () => {
    try {
      setLoading(true);
      const [prodData, logsData] = await Promise.all([
        api.getProducts({ limit: 50 }),
        api.getInventoryLogs({ limit: 50 }),
      ]);
      setProducts(prodData.products);
      setInventoryLogs(logsData.logs);
    } catch (err: any) {
      showToast(err.message || 'Failed to load inventory data', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'orders') {
      fetchOrders();
    } else {
      fetchInventoryData();
    }
  }, [activeTab, orderStatusFilter]);

  const handleStatusChange = async (orderId: string, newStatus: string) => {
    try {
      await api.updateOrderStatus(orderId, newStatus);
      showToast(`Order ${orderId} updated to ${newStatus}`);
      fetchOrders();
    } catch (err: any) {
      showToast(err.message || 'Status update failed', 'error');
    }
  };

  const handleStockAdjustment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustProduct) return;
    try {
      setActionLoading(true);
      const res = await api.adjustInventory(adjustProduct.product_id, {
        change_qty: Number(adjustQty),
        reason: adjustReason,
        warehouse_id: adjustWarehouse,
      });
      showToast(`Stock updated! New stock for ${adjustProduct.product_id}: ${res.new_stock} units.`);
      setAdjustModalOpen(false);
      fetchInventoryData();
    } catch (err: any) {
      showToast(err.message || 'Stock adjustment failed', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const openAdjustModal = (p: Product) => {
    setAdjustProduct(p);
    setAdjustQty(20);
    setAdjustReason('RESTOCK RECEIPT');
    setAdjustWarehouse('WH-01');
    setAdjustModalOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Toast */}
      {toast && (
        <div
          className={`p-4 rounded-xl border flex items-center justify-between text-sm shadow-lg ${
            toast.type === 'success'
              ? 'bg-emerald-950/80 border-emerald-800 text-emerald-200'
              : 'bg-rose-950/80 border-rose-800 text-rose-200'
          }`}
        >
          <div className="flex items-center space-x-2">
            {toast.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-400" />
            )}
            <span>{toast.message}</span>
          </div>
          <button onClick={() => setToast(null)} className="text-slate-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header & Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-white dark:text-white light:text-slate-900">
            Orders & Inventory Operations
          </h2>
          <p className="text-xs text-slate-400">
            Real-time transactional order processing and atomic stock balance reconciliation in MongoDB.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center p-1 rounded-lg bg-slate-900 border border-slate-800 self-start sm:self-auto">
          <button
            onClick={() => setActiveTab('orders')}
            className={`flex items-center space-x-2 px-4 py-1.5 rounded-md text-xs font-semibold transition ${
              activeTab === 'orders'
                ? 'bg-sky-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Boxes className="w-3.5 h-3.5" />
            <span>Customer Orders ({totalOrders})</span>
          </button>
          <button
            onClick={() => setActiveTab('inventory')}
            className={`flex items-center space-x-2 px-4 py-1.5 rounded-md text-xs font-semibold transition ${
              activeTab === 'inventory'
                ? 'bg-sky-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>Stock & Audit Logs</span>
          </button>
        </div>
      </div>

      {/* VIEW 1: ORDERS FULFILLMENT TAB */}
      {activeTab === 'orders' && (
        <div className="space-y-4">
          {/* Status Filter Toolbar */}
          <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/60 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Filter className="w-4 h-4 text-slate-400" />
              <span className="text-xs font-medium text-slate-300">Filter Status:</span>
              <div className="flex flex-wrap gap-1.5">
                {['ALL', 'DELIVERED', 'IN_TRANSIT', 'PROCESSING', 'SHIPPED', 'PENDING'].map((st) => (
                  <button
                    key={st}
                    onClick={() => setOrderStatusFilter(st)}
                    className={`px-3 py-1 rounded-md text-xs font-medium transition ${
                      orderStatusFilter === st
                        ? 'bg-sky-600 text-white font-semibold'
                        : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Orders Table */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="text-slate-400 bg-slate-950/50 border-b border-slate-800 uppercase tracking-wider font-semibold">
                  <tr>
                    <th className="py-3 px-4">Order ID</th>
                    <th className="py-3 px-4">Customer</th>
                    <th className="py-3 px-4">Order Date</th>
                    <th className="py-3 px-4">Assigned Routing Path</th>
                    <th className="py-3 px-4 text-right">Total Amount</th>
                    <th className="py-3 px-4 text-center">Status Action</th>
                    <th className="py-3 px-4 text-right">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {loading ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-400">
                        <RefreshCw className="w-5 h-5 animate-spin mx-auto text-sky-400 mb-2" />
                        <span>Loading orders from MongoDB...</span>
                      </td>
                    </tr>
                  ) : orders.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-400">
                        No orders found with status '{orderStatusFilter}'.
                      </td>
                    </tr>
                  ) : (
                    orders.map((ord) => (
                      <tr key={ord.order_id} className="hover:bg-slate-800/30 transition">
                        <td className="py-3 px-4 font-mono font-semibold text-sky-400">
                          {ord.order_id}
                        </td>
                        <td className="py-3 px-4 font-mono text-slate-300">
                          {ord.customer_id}
                        </td>
                        <td className="py-3 px-4 text-slate-400">
                          {ord.order_date?.slice(0, 10) || '2026-02-01'}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center space-x-1 font-mono text-[11px] text-slate-300">
                            <Truck className="w-3 h-3 text-sky-400 flex-shrink-0" />
                            <span>{ord.assigned_route?.join(' ➔ ') || 'Standard Route'}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-right font-bold text-slate-100">
                          ${ord.total_amount?.toFixed(2)}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <select
                            value={ord.status}
                            onChange={(e) => handleStatusChange(ord.order_id, e.target.value)}
                            className={`px-2.5 py-1 rounded text-[11px] font-semibold border focus:outline-none cursor-pointer ${
                              ord.status === 'DELIVERED'
                                ? 'bg-emerald-950/60 text-emerald-400 border-emerald-800'
                                : ord.status === 'IN_TRANSIT'
                                ? 'bg-sky-950/60 text-sky-400 border-sky-800'
                                : ord.status === 'SHIPPED'
                                ? 'bg-purple-950/60 text-purple-400 border-purple-800'
                                : 'bg-amber-950/60 text-amber-400 border-amber-800'
                            }`}
                          >
                            <option value="PENDING">PENDING</option>
                            <option value="PROCESSING">PROCESSING</option>
                            <option value="SHIPPED">SHIPPED</option>
                            <option value="IN_TRANSIT">IN_TRANSIT</option>
                            <option value="DELIVERED">DELIVERED</option>
                            <option value="CANCELLED">CANCELLED</option>
                          </select>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => setSelectedOrder(ord)}
                            className="p-1.5 rounded hover:bg-slate-800 text-slate-400 hover:text-slate-200"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* VIEW 2: INVENTORY STOCK & AUDIT LOGS TAB */}
      {activeTab === 'inventory' && (
        <div className="space-y-6">
          {/* Stock Balances Section */}
          <div className="p-5 rounded-xl border border-slate-800 bg-slate-900/60">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-semibold text-base text-slate-100">Live Inventory Balances</h3>
                <p className="text-xs text-slate-400">Current stock positions with quick RESTOCK / WRITE-OFF controls</p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="text-slate-400 bg-slate-950/50 border-b border-slate-800 uppercase tracking-wider font-semibold">
                  <tr>
                    <th className="py-3 px-4">Product ID</th>
                    <th className="py-3 px-4">Product Name</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4 text-center">Current Stock</th>
                    <th className="py-3 px-4 text-center">Health Status</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {products.map((prod) => (
                    <tr key={prod.product_id} className="hover:bg-slate-800/30">
                      <td className="py-3 px-4 font-mono font-semibold text-sky-400">{prod.product_id}</td>
                      <td className="py-3 px-4 font-medium text-slate-200">{prod.name}</td>
                      <td className="py-3 px-4 text-slate-400">{prod.category}</td>
                      <td className="py-3 px-4 text-center font-bold text-slate-100 text-sm">
                        {prod.stock_quantity}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded text-[10px] font-bold ${
                            prod.stock_quantity <= 10
                              ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                              : prod.stock_quantity <= 30
                              ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                              : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          }`}
                        >
                          {prod.stock_quantity <= 10 ? 'CRITICAL' : prod.stock_quantity <= 30 ? 'LOW STOCK' : 'OPTIMAL'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => openAdjustModal(prod)}
                          className="px-3 py-1 rounded bg-slate-800 hover:bg-slate-700 text-sky-400 hover:text-sky-300 font-medium"
                        >
                          Adjust Stock
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Historical Audit Logs Section */}
          <div className="p-5 rounded-xl border border-slate-800 bg-slate-900/60">
            <div className="flex items-center space-x-2 mb-4">
              <History className="w-5 h-5 text-purple-400" />
              <div>
                <h3 className="font-semibold text-base text-slate-100">Historical Inventory Audit Log</h3>
                <p className="text-xs text-slate-400">Permanent ledger in MongoDB <code>inventory_logs</code></p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="text-slate-400 bg-slate-950/50 border-b border-slate-800 uppercase tracking-wider font-semibold">
                  <tr>
                    <th className="py-3 px-4">Log ID</th>
                    <th className="py-3 px-4">Timestamp</th>
                    <th className="py-3 px-4">Product ID</th>
                    <th className="py-3 px-4">Warehouse</th>
                    <th className="py-3 px-4 text-center">Qty Delta</th>
                    <th className="py-3 px-4">Reason</th>
                    <th className="py-3 px-4">Reference</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {inventoryLogs.map((log) => (
                    <tr key={log.log_id} className="hover:bg-slate-800/30">
                      <td className="py-3 px-4 font-mono text-slate-400">{log.log_id}</td>
                      <td className="py-3 px-4 text-slate-400">{log.timestamp?.replace('T', ' ').slice(0, 19)}</td>
                      <td className="py-3 px-4 font-mono text-sky-400 font-semibold">{log.product_id}</td>
                      <td className="py-3 px-4 font-mono text-slate-300">{log.warehouse_id}</td>
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`font-mono font-bold ${
                            log.change_qty > 0 ? 'text-emerald-400' : 'text-rose-400'
                          }`}
                        >
                          {log.change_qty > 0 ? `+${log.change_qty}` : log.change_qty}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded bg-slate-800 text-[11px] font-medium text-slate-300">
                          {log.reason}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-400">{log.reference_order_id || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* STOCK ADJUSTMENT MODAL */}
      <Modal isOpen={adjustModalOpen} onClose={() => setAdjustModalOpen(false)} title="Perform Atomic Stock Adjustment">
        <form onSubmit={handleStockAdjustment} className="space-y-4 text-xs">
          <div>
            <span className="text-slate-400 uppercase text-[10px] font-semibold">Target Product</span>
            <div className="font-mono text-sky-400 font-bold text-sm">{adjustProduct?.product_id} - {adjustProduct?.name}</div>
            <div className="text-slate-400 text-xs mt-0.5">Current Stock: <strong className="text-white">{adjustProduct?.stock_quantity} units</strong></div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-400 mb-1 font-medium">Adjustment Delta (Positive/Negative)</label>
              <input
                type="number"
                required
                value={adjustQty}
                onChange={(e) => setAdjustQty(parseInt(e.target.value))}
                className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-slate-100 font-mono text-xs focus:border-sky-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-slate-400 mb-1 font-medium">Warehouse</label>
              <select
                value={adjustWarehouse}
                onChange={(e) => setAdjustWarehouse(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-slate-100 text-xs focus:border-sky-500 focus:outline-none"
              >
                {['WH-01', 'WH-02', 'WH-03', 'WH-04', 'WH-05', 'WH-06', 'WH-07', 'WH-08'].map((wh) => (
                  <option key={wh} value={wh}>{wh}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-slate-400 mb-1 font-medium">Adjustment Reason</label>
            <select
              value={adjustReason}
              onChange={(e) => setAdjustReason(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-slate-100 text-xs focus:border-sky-500 focus:outline-none"
            >
              <option value="RESTOCK RECEIPT">RESTOCK RECEIPT (Inbound Shipment)</option>
              <option value="CYCLE COUNT ADJUSTMENT">CYCLE COUNT ADJUSTMENT (Audit Variance)</option>
              <option value="DAMAGED TRANSFER">DAMAGED TRANSFER (Write-off)</option>
              <option value="ORDER CHECKOUT">ORDER CHECKOUT (Direct Customer Pick)</option>
            </select>
          </div>

          <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 text-[11px] text-slate-300">
            <strong>Resulting Stock:</strong> {adjustProduct ? adjustProduct.stock_quantity + Number(adjustQty) : 0} units.
          </div>

          <div className="flex justify-end space-x-2 pt-2">
            <button
              type="button"
              onClick={() => setAdjustModalOpen(false)}
              className="px-4 py-2 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 text-xs"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={actionLoading}
              className="px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold"
            >
              {actionLoading ? 'Saving...' : 'Apply Adjustment'}
            </button>
          </div>
        </form>
      </Modal>

      {/* ORDER DETAIL MODAL */}
      <Modal isOpen={!!selectedOrder} onClose={() => setSelectedOrder(null)} title={`Order Summary: ${selectedOrder?.order_id}`}>
        {selectedOrder && (
          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-3 p-3 rounded-lg bg-slate-950 border border-slate-800">
              <div>
                <span className="text-slate-400 text-[10px] uppercase">Customer ID</span>
                <div className="font-mono text-slate-200 font-medium">{selectedOrder.customer_id}</div>
              </div>
              <div>
                <span className="text-slate-400 text-[10px] uppercase">Order Value</span>
                <div className="font-bold text-emerald-400 text-sm">${selectedOrder.total_amount?.toFixed(2)}</div>
              </div>
            </div>

            <div>
              <span className="text-slate-400 text-[10px] uppercase font-semibold">Assigned Transit Route</span>
              <div className="mt-1 p-2.5 rounded bg-slate-950 border border-slate-800 font-mono text-sky-400 text-[11px]">
                {selectedOrder.assigned_route?.join(' ➔ ') || 'Standard Local Logistics Corridor'}
              </div>
            </div>

            <div>
              <span className="text-slate-400 text-[10px] uppercase font-semibold">Order Items</span>
              <div className="mt-1 border border-slate-800 rounded-lg overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950 text-slate-400 font-medium border-b border-slate-800">
                    <tr>
                      <th className="p-2">Product ID</th>
                      <th className="p-2 text-center">Quantity</th>
                      <th className="p-2 text-right">Unit Price</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {selectedOrder.items?.map((item, idx) => (
                      <tr key={idx}>
                        <td className="p-2 font-mono text-sky-400">{item.product_id}</td>
                        <td className="p-2 text-center font-bold text-slate-200">{item.qty || item.quantity || 1}</td>
                        <td className="p-2 text-right text-slate-200">${item.unit_price?.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setSelectedOrder(null)}
                className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

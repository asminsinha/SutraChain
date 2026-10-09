import React, { useEffect, useState } from 'react';
import {
  BarChart3,
  TrendingUp,
  AlertTriangle,
  Award,
  Network,
  Activity,
  Layers,
  RefreshCw,
  Star,
  CheckCircle2
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';
import { api, CentralityNode } from '../services/api';

const COLORS = ['#0284c7', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4'];

export const AnalyticsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'sales' | 'inventory' | 'vendors' | 'graph'>('sales');

  const [topSales, setTopSales] = useState<any[]>([]);
  const [categoryRevenue, setCategoryRevenue] = useState<any[]>([]);
  const [orderStatuses, setOrderStatuses] = useState<any[]>([]);
  const [lowStockList, setLowStockList] = useState<any[]>([]);
  const [inventoryActivity, setInventoryActivity] = useState<any[]>([]);
  const [vendorPerformance, setVendorPerformance] = useState<any[]>([]);
  const [centralityNodes, setCentralityNodes] = useState<CentralityNode[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAllAnalytics = async () => {
    try {
      setLoading(true);
      const [
        salesRes,
        catRes,
        statusRes,
        lowStockRes,
        activityRes,
        vendorsRes,
        centralityRes,
      ] = await Promise.all([
        api.getTopSalesAnalytics(10),
        api.getCategoryRevenueAnalytics(),
        api.getOrderStatusAnalytics(),
        api.getLowStockAnalytics(30),
        api.getInventoryActivityAnalytics(),
        api.getVendorPerformanceAnalytics(),
        api.getCentralityRanking(),
      ]);

      setTopSales(salesRes);
      setCategoryRevenue(catRes);
      setOrderStatuses(statusRes);
      setLowStockList(lowStockRes);
      setInventoryActivity(activityRes);
      setVendorPerformance(vendorsRes);
      setCentralityNodes(centralityRes);
    } catch (err) {
      console.error('Failed to load analytics suite:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllAnalytics();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center space-y-3">
          <RefreshCw className="w-8 h-8 animate-spin text-sky-500" />
          <p className="text-sm text-slate-400">Executing MongoDB Aggregations & Graph Analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-white dark:text-white light:text-slate-900">
            Advanced Polyglot Analytics & Reports
          </h2>
          <p className="text-xs text-slate-400">
            Deep insights calculated directly on MongoDB aggregation pipelines and Neo4j graph algorithms.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center p-1 rounded-lg bg-slate-900 border border-slate-800 self-start sm:self-auto overflow-x-auto">
          <button
            onClick={() => setActiveTab('sales')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition ${
              activeTab === 'sales' ? 'bg-sky-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5" />
            <span>Commercial Sales</span>
          </button>
          <button
            onClick={() => setActiveTab('inventory')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition ${
              activeTab === 'inventory' ? 'bg-sky-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Stock Risk Matrix</span>
          </button>
          <button
            onClick={() => setActiveTab('vendors')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition ${
              activeTab === 'vendors' ? 'bg-sky-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Award className="w-3.5 h-3.5" />
            <span>Vendor Reliability</span>
          </button>
          <button
            onClick={() => setActiveTab('graph')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition ${
              activeTab === 'graph' ? 'bg-sky-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Network className="w-3.5 h-3.5" />
            <span>Graph Centrality</span>
          </button>
        </div>
      </div>

      {/* TAB 1: COMMERCIAL SALES & REVENUE */}
      {activeTab === 'sales' && (
        <div className="space-y-6">
          {/* Charts Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top Selling Products Bar Chart */}
            <div className="p-5 rounded-xl border border-slate-800 bg-slate-900/60 flex flex-col">
              <div className="mb-4">
                <h3 className="font-semibold text-base text-slate-100">Top-Selling Products by Revenue ($)</h3>
                <p className="text-xs text-slate-400">MongoDB Order-Item Unwind & Multi-stage Aggregation</p>
              </div>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={topSales} layout="vertical" margin={{ top: 5, right: 20, left: 40, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.4} />
                    <XAxis type="number" stroke="#94a3b8" fontSize={10} />
                    <YAxis dataKey="name" type="category" stroke="#94a3b8" fontSize={10} width={90} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', color: '#fff' }}
                      formatter={(val: any) => [`$${Number(val).toLocaleString()}`, 'Total Revenue']}
                    />
                    <Bar dataKey="total_revenue" fill="#10b981" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Revenue by Category Chart */}
            <div className="p-5 rounded-xl border border-slate-800 bg-slate-900/60 flex flex-col">
              <div className="mb-4">
                <h3 className="font-semibold text-base text-slate-100">Category Volume & Revenue ($)</h3>
                <p className="text-xs text-slate-400">Product Categories Joined with Real Orders</p>
              </div>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={categoryRevenue} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.4} />
                    <XAxis dataKey="category" stroke="#94a3b8" fontSize={10} />
                    <YAxis stroke="#94a3b8" fontSize={10} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', color: '#fff' }}
                      formatter={(val: any) => [`$${Number(val).toLocaleString()}`, 'Gross Revenue']}
                    />
                    <Bar dataKey="total_revenue" fill="#0284c7" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Top Selling Products Leaderboard Table */}
          <div className="p-5 rounded-xl border border-slate-800 bg-slate-900/60">
            <h3 className="font-semibold text-base text-slate-100 mb-3">Product Sales Leaderboard</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950/50 border-b border-slate-800 text-slate-400 uppercase tracking-wider font-semibold">
                  <tr>
                    <th className="py-3 px-4">Rank</th>
                    <th className="py-3 px-4">Product ID</th>
                    <th className="py-3 px-4">Product Commercial Name</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4 text-center">Units Sold</th>
                    <th className="py-3 px-4 text-center">Orders Count</th>
                    <th className="py-3 px-4 text-right">Gross Revenue</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {topSales.map((s, idx) => (
                    <tr key={s.product_id} className="hover:bg-slate-800/30">
                      <td className="py-3 px-4 font-bold text-sky-400">#{idx + 1}</td>
                      <td className="py-3 px-4 font-mono font-semibold text-slate-200">{s.product_id}</td>
                      <td className="py-3 px-4 font-medium text-slate-100">{s.name}</td>
                      <td className="py-3 px-4 text-slate-400">{s.category}</td>
                      <td className="py-3 px-4 text-center font-bold text-emerald-400">{s.total_quantity_sold}</td>
                      <td className="py-3 px-4 text-center text-slate-300">{s.order_occurrences}</td>
                      <td className="py-3 px-4 text-right font-bold text-slate-100">${s.total_revenue?.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: INVENTORY RISK & VELOCITY MATRIX */}
      {activeTab === 'inventory' && (
        <div className="space-y-6">
          {/* Movement Activity Reason Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {inventoryActivity.map((act) => (
              <div key={act.reason} className="p-4 rounded-xl border border-slate-800 bg-slate-900/60">
                <span className="text-[10px] text-slate-400 uppercase font-semibold">{act.reason}</span>
                <div className="text-2xl font-bold text-slate-100 mt-1">{act.event_count} Events</div>
                <div className="text-xs mt-1 text-slate-400">
                  Net Qty Delta:{' '}
                  <span className={act.net_quantity_delta >= 0 ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                    {act.net_quantity_delta >= 0 ? `+${act.net_quantity_delta}` : act.net_quantity_delta}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Low Stock Risk Table */}
          <div className="p-5 rounded-xl border border-slate-800 bg-slate-900/60">
            <div className="flex items-center space-x-2 mb-3">
              <AlertTriangle className="w-5 h-5 text-amber-400" />
              <h3 className="font-semibold text-base text-slate-100">Low-Stock Replenishment Queue ({lowStockList.length})</h3>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950/50 border-b border-slate-800 text-slate-400 uppercase tracking-wider font-semibold">
                  <tr>
                    <th className="py-3 px-4">Product ID</th>
                    <th className="py-3 px-4">Product Name</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4">Vendor ID</th>
                    <th className="py-3 px-4 text-center">Remaining Stock</th>
                    <th className="py-3 px-4 text-right">Risk Rating</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {lowStockList.map((item) => (
                    <tr key={item.product_id} className="hover:bg-slate-800/30">
                      <td className="py-3 px-4 font-mono font-semibold text-sky-400">{item.product_id}</td>
                      <td className="py-3 px-4 font-medium text-slate-200">{item.name}</td>
                      <td className="py-3 px-4 text-slate-400">{item.category}</td>
                      <td className="py-3 px-4 font-mono text-slate-400">{item.vendor_id}</td>
                      <td className="py-3 px-4 text-center font-bold text-amber-400">{item.stock_quantity} units</td>
                      <td className="py-3 px-4 text-right">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                            item.risk_level === 'CRITICAL'
                              ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                              : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                          }`}
                        >
                          {item.risk_level}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: VENDOR PERFORMANCE */}
      {activeTab === 'vendors' && (
        <div className="p-5 rounded-xl border border-slate-800 bg-slate-900/60">
          <h3 className="font-semibold text-base text-slate-100 mb-3">Commercial Vendor Reliability Matrix</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/50 border-b border-slate-800 text-slate-400 uppercase tracking-wider font-semibold">
                <tr>
                  <th className="py-3 px-4">Vendor ID</th>
                  <th className="py-3 px-4">Business Name</th>
                  <th className="py-3 px-4">Origin Hub</th>
                  <th className="py-3 px-4 text-center">Catalog Size</th>
                  <th className="py-3 px-4 text-center">Avg Price</th>
                  <th className="py-3 px-4 text-center">Rating</th>
                  <th className="py-3 px-4 text-right">Verification</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {vendorPerformance.map((v) => (
                  <tr key={v.vendor_id} className="hover:bg-slate-800/30">
                    <td className="py-3 px-4 font-mono font-semibold text-sky-400">{v.vendor_id}</td>
                    <td className="py-3 px-4 font-medium text-slate-100">{v.business_name}</td>
                    <td className="py-3 px-4 font-mono text-slate-400">{v.origin_warehouse_id}</td>
                    <td className="py-3 px-4 text-center font-semibold text-slate-200">{v.product_catalog_count} SKUs</td>
                    <td className="py-3 px-4 text-center text-slate-300">${v.avg_catalog_price?.toFixed(2) || '0.00'}</td>
                    <td className="py-3 px-4 text-center">
                      <div className="inline-flex items-center space-x-1 text-amber-400 font-bold">
                        <Star className="w-3.5 h-3.5 fill-amber-400" />
                        <span>{v.rating}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        {v.verification_status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: GRAPH NETWORK CENTRALITY & BOTTLENECKS */}
      {activeTab === 'graph' && (
        <div className="p-5 rounded-xl border border-slate-800 bg-slate-900/60 space-y-4">
          <div>
            <h3 className="font-semibold text-base text-slate-100">
              Graph Network Degree Centrality Ranking
            </h3>
            <p className="text-xs text-slate-400">
              Calculates in-degree, out-degree, and total transit degree across graph nodes to identify network bottlenecks.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/50 border-b border-slate-800 text-slate-400 uppercase tracking-wider font-semibold">
                <tr>
                  <th className="py-3 px-4">Node ID</th>
                  <th className="py-3 px-4">Node Name</th>
                  <th className="py-3 px-4">Entity Label</th>
                  <th className="py-3 px-4 text-center">In-Degree</th>
                  <th className="py-3 px-4 text-center">Out-Degree</th>
                  <th className="py-3 px-4 text-center">Total Degree</th>
                  <th className="py-3 px-4 text-right">Bottleneck Rating</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {centralityNodes.map((n) => (
                  <tr key={n.node_id} className="hover:bg-slate-800/30">
                    <td className="py-3 px-4 font-mono font-bold text-sky-400">{n.node_id}</td>
                    <td className="py-3 px-4 font-medium text-slate-200">{n.name}</td>
                    <td className="py-3 px-4 text-slate-400">
                      <span className="px-2 py-0.5 rounded bg-slate-800 text-[10px]">{n.label}</span>
                    </td>
                    <td className="py-3 px-4 text-center font-mono text-purple-400">{n.in_degree}</td>
                    <td className="py-3 px-4 text-center font-mono text-emerald-400">{n.out_degree}</td>
                    <td className="py-3 px-4 text-center font-mono font-bold text-slate-100 text-sm">{n.total_degree}</td>
                    <td className="py-3 px-4 text-right">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded text-[10px] font-bold ${
                          n.criticality === 'CRITICAL BOTTLENECK'
                            ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                            : n.criticality === 'HIGH INTERCHANGE'
                            ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                            : 'bg-sky-500/10 text-sky-400 border border-sky-500/20'
                        }`}
                      >
                        {n.criticality}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

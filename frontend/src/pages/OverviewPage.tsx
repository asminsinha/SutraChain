import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Package,
  Boxes,
  Network,
  AlertTriangle,
  ArrowRight,
  TrendingUp,
  Database,
  Truck,
  ShieldCheck,
  CheckCircle2,
  Clock
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
import { api, GraphStats } from '../services/api';

const COLORS = ['#0284c7', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4'];

export const OverviewPage: React.FC = () => {
  const [stats, setStats] = useState<{
    totalProducts: number;
    totalOrders: number;
    lowStockCount: number;
    totalRevenue: number;
    graphStats: GraphStats | null;
  }>({
    totalProducts: 0,
    totalOrders: 0,
    lowStockCount: 0,
    totalRevenue: 0,
    graphStats: null,
  });

  const [categoryData, setCategoryData] = useState<any[]>([]);
  const [orderStatusData, setOrderStatusData] = useState<any[]>([]);
  const [lowStockAlerts, setLowStockAlerts] = useState<any[]>([]);
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        const [
          productsRes,
          ordersRes,
          lowStockRes,
          catRevRes,
          orderStatusRes,
          graphStatsRes
        ] = await Promise.all([
          api.getProducts({ limit: 1 }),
          api.getOrders({ limit: 5 }),
          api.getLowStockAnalytics(30),
          api.getCategoryRevenueAnalytics(),
          api.getOrderStatusAnalytics(),
          api.getGraphStats()
        ]);

        const revTotal = catRevRes.reduce((acc, curr) => acc + (curr.total_revenue || 0), 0);

        setStats({
          totalProducts: productsRes.total,
          totalOrders: ordersRes.total,
          lowStockCount: lowStockRes.length,
          totalRevenue: revTotal,
          graphStats: graphStatsRes,
        });

        setCategoryData(catRevRes);
        setOrderStatusData(orderStatusRes);
        setLowStockAlerts(lowStockRes.slice(0, 5));
        setRecentOrders(ordersRes.orders);
      } catch (err) {
        console.error('Failed to load dashboard data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center space-y-3">
          <div className="w-8 h-8 border-4 border-sky-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm text-slate-400">Loading polyglot operational metrics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between p-6 rounded-xl border border-slate-800 dark:border-slate-800 light:border-slate-200 bg-gradient-to-r from-slate-900 to-slate-850 dark:from-slate-900 dark:to-slate-850 light:from-white light:to-slate-50 shadow-sm">
        <div className="space-y-1">
          <div className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-sky-500/10 text-sky-400 border border-sky-500/20 mb-1">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>SutraChain Dual-Engine Active</span>
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-white dark:text-white light:text-slate-900">
            Supply Chain Operations Overview
          </h2>
          <p className="text-sm text-slate-400 dark:text-slate-400 light:text-slate-500">
            Real-time telemetry uniting MongoDB document transactions with Neo4j graph network topology.
          </p>
        </div>
        <div className="mt-4 md:mt-0 flex items-center space-x-3">
          <Link
            to="/logistics"
            className="inline-flex items-center space-x-2 px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-sm font-medium transition shadow-md shadow-sky-600/20"
          >
            <Truck className="w-4 h-4" />
            <span>Route Intelligence</span>
          </Link>
          <Link
            to="/network"
            className="inline-flex items-center space-x-2 px-4 py-2 rounded-lg border border-slate-700 dark:border-slate-700 light:border-slate-300 hover:bg-slate-800 dark:hover:bg-slate-800 light:hover:bg-slate-100 text-slate-200 dark:text-slate-200 light:text-slate-700 text-sm font-medium transition"
          >
            <Network className="w-4 h-4" />
            <span>Explore Graph</span>
          </Link>
        </div>
      </div>

      {/* 4 High-Impact KPI Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Products */}
        <div className="p-5 rounded-xl border border-slate-800 dark:border-slate-800 light:border-slate-200 bg-slate-900/60 dark:bg-slate-900/60 light:bg-white flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Catalog Size</span>
            <div className="p-2 rounded-lg bg-sky-500/10 text-sky-400">
              <Package className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-3xl font-bold text-white dark:text-white light:text-slate-900">
              {stats.totalProducts}
            </div>
            <div className="text-xs text-slate-400 mt-1 flex items-center space-x-1">
              <Database className="w-3.5 h-3.5 text-emerald-400" />
              <span>Synced in MongoDB & Neo4j</span>
            </div>
          </div>
        </div>

        {/* Total Orders */}
        <div className="p-5 rounded-xl border border-slate-800 dark:border-slate-800 light:border-slate-200 bg-slate-900/60 dark:bg-slate-900/60 light:bg-white flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Orders</span>
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
              <Boxes className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-3xl font-bold text-white dark:text-white light:text-slate-900">
              {stats.totalOrders}
            </div>
            <div className="text-xs text-slate-400 mt-1 flex items-center space-x-1">
              <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
              <span>Across 40 Delivery Zones</span>
            </div>
          </div>
        </div>

        {/* Inventory Risk Items */}
        <div className="p-5 rounded-xl border border-slate-800 dark:border-slate-800 light:border-slate-200 bg-slate-900/60 dark:bg-slate-900/60 light:bg-white flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Low-Stock Risks</span>
            <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-3xl font-bold text-amber-400">
              {stats.lowStockCount}
            </div>
            <div className="text-xs text-slate-400 mt-1">
              Items under threshold (≤ 30 units)
            </div>
          </div>
        </div>

        {/* Graph Nodes */}
        <div className="p-5 rounded-xl border border-slate-800 dark:border-slate-800 light:border-slate-200 bg-slate-900/60 dark:bg-slate-900/60 light:bg-white flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Graph Nodes</span>
            <div className="p-2 rounded-lg bg-purple-500/10 text-purple-400">
              <Network className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-3xl font-bold text-white dark:text-white light:text-slate-900">
              {stats.graphStats?.total_nodes || 137}
            </div>
            <div className="text-xs text-slate-400 mt-1">
              {stats.graphStats?.total_relationships || 356} Connected Relationships
            </div>
          </div>
        </div>
      </div>

      {/* Analytics Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Category Revenue Bar Chart */}
        <div className="lg:col-span-2 p-5 rounded-xl border border-slate-800 dark:border-slate-800 light:border-slate-200 bg-slate-900/60 dark:bg-slate-900/60 light:bg-white flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold text-base text-slate-100 dark:text-slate-100 light:text-slate-900">
                Revenue by Product Category ($)
              </h3>
              <p className="text-xs text-slate-400">Calculated via MongoDB Multi-Stage Aggregation Pipeline</p>
            </div>
            <Link to="/analytics" className="text-xs font-medium text-sky-400 hover:text-sky-300 flex items-center space-x-1">
              <span>Detailed View</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={categoryData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.4} />
                <XAxis dataKey="category" stroke="#94a3b8" fontSize={11} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', color: '#fff' }}
                  formatter={(val: any) => [`$${Number(val).toLocaleString()}`, 'Revenue']}
                />
                <Bar dataKey="total_revenue" fill="#0284c7" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Order Status Distribution Pie Chart */}
        <div className="p-5 rounded-xl border border-slate-800 dark:border-slate-800 light:border-slate-200 bg-slate-900/60 dark:bg-slate-900/60 light:bg-white flex flex-col">
          <div className="mb-4">
            <h3 className="font-semibold text-base text-slate-100 dark:text-slate-100 light:text-slate-900">
              Order Status Breakdown
            </h3>
            <p className="text-xs text-slate-400">Fulfillment Pipeline Status</p>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={orderStatusData}
                  dataKey="order_count"
                  nameKey="status"
                  cx="50%"
                  cy="50%"
                  outerRadius={75}
                  innerRadius={45}
                  paddingAngle={3}
                >
                  {orderStatusData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', color: '#fff' }}
                  formatter={(val: any) => [`${val} orders`, 'Count']}
                />
                <Legend
                  verticalAlign="bottom"
                  height={36}
                  formatter={(value) => <span className="text-[11px] text-slate-300">{value}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Operational Feeds: Low Stock Risk Table & Recent Orders */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Low Stock Attention List */}
        <div className="p-5 rounded-xl border border-slate-800 dark:border-slate-800 light:border-slate-200 bg-slate-900/60 dark:bg-slate-900/60 light:bg-white">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              <h3 className="font-semibold text-base text-slate-100 dark:text-slate-100 light:text-slate-900">
                Critical Low-Stock Alerts
              </h3>
            </div>
            <Link to="/orders-inventory" className="text-xs text-sky-400 hover:text-sky-300 flex items-center space-x-1">
              <span>Restock</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="text-slate-400 border-b border-slate-800 dark:border-slate-800 light:border-slate-200 font-medium">
                <tr>
                  <th className="pb-2">Product</th>
                  <th className="pb-2">Category</th>
                  <th className="pb-2">Stock Level</th>
                  <th className="pb-2 text-right">Risk Level</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 dark:divide-slate-800/60 light:divide-slate-200">
                {lowStockAlerts.map((item) => (
                  <tr key={item.product_id} className="hover:bg-slate-800/30">
                    <td className="py-2.5 font-medium text-slate-200 dark:text-slate-200 light:text-slate-800">
                      <div>{item.name}</div>
                      <span className="font-mono text-[10px] text-slate-400">{item.product_id}</span>
                    </td>
                    <td className="py-2.5 text-slate-400">{item.category}</td>
                    <td className="py-2.5 font-semibold text-amber-400">{item.stock_quantity} units</td>
                    <td className="py-2.5 text-right">
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

        {/* Recent Fulfilled Orders Feed */}
        <div className="p-5 rounded-xl border border-slate-800 dark:border-slate-800 light:border-slate-200 bg-slate-900/60 dark:bg-slate-900/60 light:bg-white">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-2">
              <Boxes className="w-4 h-4 text-emerald-400" />
              <h3 className="font-semibold text-base text-slate-100 dark:text-slate-100 light:text-slate-900">
                Recent Orders & Routing Tracks
              </h3>
            </div>
            <Link to="/orders-inventory" className="text-xs text-sky-400 hover:text-sky-300 flex items-center space-x-1">
              <span>View All</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          <div className="space-y-2.5">
            {recentOrders.map((order) => (
              <div
                key={order.order_id}
                className="p-3 rounded-lg bg-slate-800/40 dark:bg-slate-800/40 light:bg-slate-50 border border-slate-800 dark:border-slate-800 light:border-slate-200 flex items-center justify-between text-xs"
              >
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="font-mono font-semibold text-sky-400">{order.order_id}</span>
                    <span className="text-slate-400">·</span>
                    <span className="font-medium text-slate-200 dark:text-slate-200 light:text-slate-800">
                      ${order.total_amount?.toFixed(2)}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-400 mt-1 flex items-center space-x-1 font-mono">
                    <Truck className="w-3 h-3 text-slate-500" />
                    <span>{order.assigned_route?.join(' ➔ ') || 'Standard Ground Route'}</span>
                  </div>
                </div>
                <div>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                      order.status === 'DELIVERED'
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        : order.status === 'IN_TRANSIT'
                        ? 'bg-sky-500/10 text-sky-400 border border-sky-500/20'
                        : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                    }`}
                  >
                    {order.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Package,
  Boxes,
  Network,
  Route,
  BarChart3,
  Sun,
  Moon,
  Database,
  Activity,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  RefreshCw
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { api, HealthStatus } from '../services/api';

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchHealth = async () => {
    try {
      setIsRefreshing(true);
      const data = await api.getHealth();
      setHealth(data);
    } catch {
      setHealth({
        status: 'unhealthy',
        mongodb: { status: 'error', database: 'sutrachain_db', collections_count: 0 },
        neo4j: { status: 'error', nodes_count: 0, relationships_count: 0 },
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchHealth();
    const interval = setInterval(fetchHealth, 30000); // 30s poll
    return () => clearInterval(interval);
  }, []);

  const navItems = [
    { name: 'Overview', path: '/', icon: LayoutDashboard },
    { name: 'Product Catalogue', path: '/products', icon: Package },
    { name: 'Orders & Inventory', path: '/orders-inventory', icon: Boxes },
    { name: 'Supply Network', path: '/network', icon: Network },
    { name: 'Logistics Intelligence', path: '/logistics', icon: Route },
    { name: 'Analytics & Reports', path: '/analytics', icon: BarChart3 },
  ];

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-950 text-slate-100 dark:bg-slate-950 dark:text-slate-100 light:bg-slate-50 light:text-slate-900">
      {/* Sidebar */}
      <aside className="w-64 flex-shrink-0 flex flex-col border-r border-slate-800 dark:border-slate-800 light:border-slate-200 bg-slate-900/90 dark:bg-slate-900/90 light:bg-white backdrop-blur-md">
        {/* Brand Header */}
        <div className="p-5 border-b border-slate-800 dark:border-slate-800 light:border-slate-200">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-lg bg-sky-600 flex items-center justify-center text-white font-bold shadow-md shadow-sky-600/20">
              <Network className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-base tracking-tight text-white dark:text-white light:text-slate-900">
                SutraChain
              </h1>
              <p className="text-[11px] font-medium text-slate-400 dark:text-slate-400 light:text-slate-500">
                Graph & NoSQL Logistics
              </p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center space-x-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-sky-600 text-white shadow-sm shadow-sky-600/30'
                    : 'text-slate-400 hover:text-slate-200 dark:hover:text-slate-200 light:text-slate-600 light:hover:text-slate-900 hover:bg-slate-800/60 dark:hover:bg-slate-800/60 light:hover:bg-slate-100'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>

        {/* System & Polyglot Engine Info */}
        <div className="p-4 border-t border-slate-800 dark:border-slate-800 light:border-slate-200 bg-slate-950/40 dark:bg-slate-950/40 light:bg-slate-50">
          <div className="space-y-2">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-400 light:text-slate-500">
              Polyglot Persistence
            </div>

            {/* MongoDB Pill */}
            <div className="flex items-center justify-between text-xs py-1 px-2 rounded bg-slate-800/50 dark:bg-slate-800/50 light:bg-slate-200/60">
              <span className="flex items-center space-x-1.5 font-medium text-slate-300 dark:text-slate-300 light:text-slate-700">
                <Database className="w-3.5 h-3.5 text-emerald-400" />
                <span>MongoDB</span>
              </span>
              <span className="flex items-center space-x-1 text-[11px]">
                {health?.mongodb.status === 'connected' ? (
                  <span className="text-emerald-400 font-medium flex items-center">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mr-1 animate-pulse"></span>
                    Live
                  </span>
                ) : (
                  <span className="text-rose-400 font-medium flex items-center">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-400 mr-1"></span>
                    Offline
                  </span>
                )}
              </span>
            </div>

            {/* Neo4j Pill */}
            <div className="flex items-center justify-between text-xs py-1 px-2 rounded bg-slate-800/50 dark:bg-slate-800/50 light:bg-slate-200/60">
              <span className="flex items-center space-x-1.5 font-medium text-slate-300 dark:text-slate-300 light:text-slate-700">
                <Network className="w-3.5 h-3.5 text-sky-400" />
                <span>Neo4j Graph</span>
              </span>
              <span className="flex items-center space-x-1 text-[11px]">
                {health?.neo4j.status === 'connected' ? (
                  <span className="text-sky-400 font-medium flex items-center">
                    <span className="w-1.5 h-1.5 rounded-full bg-sky-400 mr-1 animate-pulse"></span>
                    {health.neo4j.nodes_count} Nodes
                  </span>
                ) : (
                  <span className="text-rose-400 font-medium flex items-center">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-400 mr-1"></span>
                    Offline
                  </span>
                )}
              </span>
            </div>

            <div className="pt-2 text-[10px] text-slate-500 dark:text-slate-500 light:text-slate-400 leading-tight">
              VIT Vellore DBMS Project<br />
              <span className="text-slate-400 font-mono">24BAI0181 & 24BCI0137</span>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Header */}
        <header className="h-16 flex-shrink-0 border-b border-slate-800 dark:border-slate-800 light:border-slate-200 bg-slate-900/60 dark:bg-slate-900/60 light:bg-white/80 backdrop-blur-md px-6 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <h2 className="text-lg font-semibold text-slate-100 dark:text-slate-100 light:text-slate-800">
              {navItems.find((i) => i.path === location.pathname)?.name || 'SutraChain'}
            </h2>
          </div>

          <div className="flex items-center space-x-3">
            {/* Health Badge */}
            <div className="hidden sm:flex items-center space-x-2 px-3 py-1.5 rounded-full text-xs font-medium bg-slate-800/80 dark:bg-slate-800/80 light:bg-slate-100 border border-slate-700/50 dark:border-slate-700/50 light:border-slate-300">
              {health?.status === 'healthy' ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400">All Databases Synchronised</span>
                </>
              ) : health?.status === 'degraded' ? (
                <>
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                  <span className="text-amber-400">Database Degraded</span>
                </>
              ) : (
                <>
                  <XCircle className="w-3.5 h-3.5 text-rose-400" />
                  <span className="text-rose-400">Database Offline</span>
                </>
              )}
            </div>

            {/* Refresh Button */}
            <button
              onClick={fetchHealth}
              disabled={isRefreshing}
              title="Refresh connection status"
              className="p-2 text-slate-400 hover:text-slate-200 dark:hover:text-slate-200 light:hover:text-slate-700 rounded-lg hover:bg-slate-800 dark:hover:bg-slate-800 light:hover:bg-slate-100 transition"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-sky-400' : ''}`} />
            </button>

            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
              className="p-2 text-slate-400 hover:text-slate-200 dark:hover:text-slate-200 light:hover:text-slate-700 rounded-lg hover:bg-slate-800 dark:hover:bg-slate-800 light:hover:bg-slate-100 transition"
            >
              {theme === 'dark' ? (
                <Sun className="w-4 h-4 text-amber-400" />
              ) : (
                <Moon className="w-4 h-4 text-slate-600" />
              )}
            </button>
          </div>
        </header>

        {/* Scrollable Page Body */}
        <main className="flex-1 overflow-y-auto p-6 bg-slate-950 dark:bg-slate-950 light:bg-slate-50">
          <div className="max-w-7xl mx-auto">{children}</div>
        </main>
      </div>
    </div>
  );
};

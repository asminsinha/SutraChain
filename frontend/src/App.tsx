import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/Layout';
import { OverviewPage } from './pages/OverviewPage';
import { ProductsPage } from './pages/ProductsPage';
import { OrdersInventoryPage } from './pages/OrdersInventoryPage';
import { NetworkExplorerPage } from './pages/NetworkExplorerPage';
import { LogisticsPage } from './pages/LogisticsPage';
import { AnalyticsPage } from './pages/AnalyticsPage';

export const App: React.FC = () => {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<OverviewPage />} />
        <Route path="/products" element={<ProductsPage />} />
        <Route path="/orders-inventory" element={<OrdersInventoryPage />} />
        <Route path="/network" element={<NetworkExplorerPage />} />
        <Route path="/logistics" element={<LogisticsPage />} />
        <Route path="/analytics" element={<AnalyticsPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  );
};

const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api';

export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  mongodb: {
    status: 'connected' | 'disconnected' | 'error';
    database: string;
    collections_count: number;
    error?: string;
  };
  neo4j: {
    status: 'connected' | 'disconnected' | 'error';
    nodes_count: number;
    relationships_count: number;
    error?: string;
  };
}

export interface Product {
  product_id: string;
  name: string;
  category: string;
  price: number;
  stock_quantity: number;
  stock_level?: number;
  vendor_id?: string;
  specs?: {
    color?: string;
    warranty_months?: number;
    weight_kg?: number;
    sku?: string;
  };
  created_at?: string;
}

export interface ProductListResponse {
  total: number;
  page: number;
  limit: number;
  products: Product[];
}

export interface Order {
  order_id: string;
  customer_id: string;
  order_date: string;
  total_amount: number;
  status: 'PENDING' | 'PROCESSING' | 'SHIPPED' | 'IN_TRANSIT' | 'DELIVERED' | 'CANCELLED';
  items: Array<{
    product_id: string;
    qty?: number;
    quantity?: number;
    unit_price: number;
  }>;
  assigned_route?: string[];
}

export interface InventoryLog {
  log_id: string;
  product_id: string;
  warehouse_id: string;
  change_qty: number;
  reason: string;
  reference_order_id?: string;
  timestamp: string;
}

export interface GraphStats {
  total_nodes: number;
  total_relationships: number;
  nodes_by_label: Record<string, number>;
  relationships_by_type: Record<string, number>;
}

export interface GraphTopology {
  elements: {
    nodes: Array<{
      data: {
        id: string;
        name: string;
        label: string;
        type: string;
        extra?: Record<string, any>;
      };
    }>;
    edges: Array<{
      data: {
        id: string;
        source: string;
        target: string;
        label: string;
        dist_km?: number;
        cost?: number;
        hours?: number;
      };
    }>;
  };
  total_nodes: number;
  total_edges: number;
}

export interface OptimalRoute {
  success: boolean;
  start_warehouse: string;
  destination_zone: string;
  total_hops: number;
  total_distance_km: number;
  estimated_transit_hours: number;
  estimated_shipping_cost: number;
  path_nodes: Array<{
    id: string;
    name: string;
    label: string;
    city?: string;
  }>;
  path_edges: Array<{
    source: string;
    target: string;
    type: string;
    dist_km: number;
    hours: number;
    cost: number;
  }>;
  message?: string;
}

export interface SupplierImpact {
  supplier_id: string;
  supplier_name: string;
  tier?: string;
  reliability_score?: number;
  supplied_products_count: number;
  supplied_products: Array<{ id: string; name: string; category: string }>;
  affected_warehouses_count: number;
  affected_warehouses: Array<{ id: string; name: string; city: string }>;
  downstream_retailer_zones_count: number;
  downstream_retailer_zones: Array<{ id: string; name: string; city: string }>;
}

export interface CentralityNode {
  node_id: string;
  name: string;
  label: string;
  total_degree: number;
  out_degree: number;
  in_degree: number;
  criticality: string;
}

// API Helper
async function request<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;
  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    ...options,
  });

  if (!response.ok) {
    let errorDetail = 'API Request Failed';
    try {
      const err = await response.json();
      errorDetail = err.detail || err.message || errorDetail;
    } catch {
      errorDetail = response.statusText;
    }
    throw new Error(errorDetail);
  }

  return response.json();
}

export const api = {
  // Health
  getHealth: () => request<HealthStatus>('/health'),

  // Products
  getProducts: (params?: {
    limit?: number;
    skip?: number;
    search?: string;
    category?: string;
    vendor_id?: string;
    stock_status?: string;
    sort_by?: string;
    sort_order?: number;
  }) => {
    const query = new URLSearchParams();
    if (params?.limit) query.set('limit', params.limit.toString());
    if (params?.skip) query.set('skip', params.skip.toString());
    if (params?.search) query.set('search', params.search);
    if (params?.category) query.set('category', params.category);
    if (params?.vendor_id) query.set('vendor_id', params.vendor_id);
    if (params?.stock_status) query.set('stock_status', params.stock_status);
    if (params?.sort_by) query.set('sort_by', params.sort_by);
    if (params?.sort_order) query.set('sort_order', params.sort_order.toString());
    return request<ProductListResponse>(`/products?${query.toString()}`);
  },

  getProductById: (id: string) => request<Product>(`/products/${id}`),

  createProduct: (data: Partial<Product> & { product_id: string; name: string; category: string; price: number; stock_quantity: number }) =>
    request<{ message: string; data: Product; cross_db_sync: { mongodb: boolean; neo4j: boolean } }>('/products', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateProduct: (id: string, data: Partial<Product>) =>
    request<{ message: string; data: Product; cross_db_sync: { mongodb: boolean; neo4j: boolean } }>(`/products/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  deleteProduct: (id: string) =>
    request<{ message: string; cross_db_sync: { mongodb: boolean; neo4j: boolean } }>(`/products/${id}`, {
      method: 'DELETE',
    }),

  // Orders & Inventory
  getOrders: (params?: { limit?: number; skip?: number; status?: string; customer_id?: string }) => {
    const query = new URLSearchParams();
    if (params?.limit) query.set('limit', params.limit.toString());
    if (params?.skip) query.set('skip', params.skip.toString());
    if (params?.status) query.set('status', params.status);
    if (params?.customer_id) query.set('customer_id', params.customer_id);
    return request<{ total: number; page: number; limit: number; orders: Order[] }>(`/orders?${query.toString()}`);
  },

  updateOrderStatus: (orderId: string, status: string) =>
    request<{ message: string }>(`/orders/${orderId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }),

  adjustInventory: (productId: string, adjustment: { change_qty: number; reason: string; warehouse_id?: string; reference_order_id?: string }) =>
    request<{ message: string; product_id: string; previous_stock: number; new_stock: number; audit_log: InventoryLog }>(
      `/inventory/${productId}`,
      {
        method: 'PATCH',
        body: JSON.stringify(adjustment),
      }
    ),

  getInventoryLogs: (params?: { limit?: number; skip?: number; product_id?: string }) => {
    const query = new URLSearchParams();
    if (params?.limit) query.set('limit', params.limit.toString());
    if (params?.skip) query.set('skip', params.skip.toString());
    if (params?.product_id) query.set('product_id', params.product_id);
    return request<{ total: number; logs: InventoryLog[] }>(`/inventory/logs?${query.toString()}`);
  },

  // MongoDB Aggregations
  getLowStockAnalytics: (threshold: number = 30) => request<any[]>(`/analytics/low-stock?threshold=${threshold}`),
  getTopSalesAnalytics: (limit: number = 10) => request<any[]>(`/analytics/top-sales?limit=${limit}`),
  getCategoryRevenueAnalytics: () => request<any[]>('/analytics/revenue-by-category'),
  getOrderStatusAnalytics: () => request<any[]>('/analytics/order-status'),
  getVendorPerformanceAnalytics: () => request<any[]>('/analytics/vendor-performance'),
  getInventoryActivityAnalytics: () => request<any[]>('/analytics/inventory-activity'),

  // Neo4j Graph
  getGraphStats: () => request<GraphStats>('/graph/stats'),
  getGraphTopology: (params?: { limit_nodes?: number; label_filter?: string }) => {
    const query = new URLSearchParams();
    if (params?.limit_nodes) query.set('limit_nodes', params.limit_nodes.toString());
    if (params?.label_filter) query.set('label_filter', params.label_filter);
    return request<GraphTopology>(`/graph/topology?${query.toString()}`);
  },
  getOptimalRoute: (startWarehouse: string, destinationZone: string) =>
    request<OptimalRoute>(`/routes/optimal?start_warehouse=${encodeURIComponent(startWarehouse)}&destination_zone=${encodeURIComponent(destinationZone)}`),
  getAlternativeRoutes: (startWarehouse: string, destinationZone: string) =>
    request<any[]>(`/routes/alternatives?start_warehouse=${encodeURIComponent(startWarehouse)}&destination_zone=${encodeURIComponent(destinationZone)}`),
  getSupplierImpact: (supplierId: string) => request<SupplierImpact>(`/graph/supplier-impact/${supplierId}`),
  getCentralityRanking: () => request<CentralityNode[]>('/graph/centrality'),
  getWarehouseStock: (warehouseId: string) => request<any>(`/graph/warehouse-stock/${warehouseId}`),
  getAlternativeSuppliers: (productId: string) => request<any[]>(`/graph/alternative-suppliers/${productId}`),
  getZoneCoverage: (zoneId: string) => request<any>(`/graph/zone-coverage/${zoneId}`),
  getNetworkResilience: () => request<any>('/graph/network-resilience'),
  getCorridors: () => request<any[]>('/graph/corridors'),
  getProductTraceability: (productId: string) => request<any>(`/graph/product-chain/${productId}`),

  // Vendors & Users
  getVendors: () => request<any[]>('/vendors'),
  getUsers: () => request<any[]>('/users'),
};

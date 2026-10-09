# SutraChain — System Testing & Verification Report

**SutraChain: Graph-Driven Multi-Vendor E-Commerce & Supply Chain Platform**  
**Course:** Database Management Systems (CSE3001)  
**Evaluation:** Review 3 Capstone Defense  
**Testing Date:** 09-October-2026  
**Environment:** Windows 10/11, Python 3.14 (venv), Node.js v18+, MongoDB Atlas, Neo4j Aura  

---

## 1. Executive Summary

All components of the SutraChain polyglot architecture—FastAPI backend, MongoDB Atlas database, Neo4j Aura graph instance, and React 18 / Vite frontend—have been systematically validated through empirical integration tests, endpoint probes, and browser bundle builds.

- **Automated Backend Integration Test Suite:** 4 / 4 Suites Passed (100%)
- **HTTP REST API Endpoints:** 24 / 24 Endpoints Verified (100% Operational)
- **Frontend Production Compilation:** TypeScript + Vite Build Passed with 0 Errors
- **Live Database Verified Node/Doc Counts:**
  - MongoDB Atlas: 5 Collections, 199 Documents across collections.
  - Neo4j Aura: 137 Nodes, 356 Directed Relationships.

---

## 2. Test Execution Matrix

### Test Suite 1: Automated Integration Suite (`backend/tests/test_backend.py`)

Execution command: `.\venv\Scripts\python.exe backend\tests\test_backend.py`

| Test ID | Module / Function | Description | Expected Result | Actual Result | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **TC-01** | `test_database_health` | Probes live connection status of MongoDB and Neo4j via `check_health()` | Both reported `connected`; Neo4j nodes $\ge 100$ | MongoDB: connected, Neo4j: connected (137 nodes) | **PASSED** |
| **TC-02** | `test_product_crud_and_sync` | Creates `PROD-TEST-999`, reads it, updates price/stock, verifies Neo4j sync, and deletes it | 200 OK on create/read/update/delete; cross-DB sync flags True | MongoDB doc & Neo4j node created, updated, and cleanly deleted | **PASSED** |
| **TC-03** | `test_mongodb_aggregations` | Tests 5 analytical aggregation pipelines (Low Stock, Sales, Category Revenue, Order Status, Vendor Perf) | Returns non-empty structured JSON lists with correct calculated fields | Returned validated list records with proper financial/stock aggregates | **PASSED** |
| **TC-04** | `test_neo4j_graph_queries` | Validates Dijkstra routing (`WH-01` $\to$ `ZONE-70001`), Supplier Impact, Graph Stats, Centrality | Success is True, hops $\ge 1$, distance $> 0$, supplier products $> 0$ | Dijkstra returned path (3 hops, 120km, ₹1840 cost), impact analyzed | **PASSED** |

---

### Test Suite 2: HTTP REST Endpoints Coverage Probe

Execution via HTTP live client against FastAPI on `http://127.0.0.1:8000`:

| Endpoint URL | HTTP Method | Expected Status | Measured Status | Response Type | Validation Notes |
| :--- | :---: | :---: | :---: | :---: | :--- |
| `/` | GET | 200 | 200 OK | `dict` | System info & database types |
| `/api/health` | GET | 200 | 200 OK | `dict` | Verified real-time dual database status |
| `/api/products?limit=2` | GET | 200 | 200 OK | `dict` | Total: 51, paginated list of products |
| `/api/products/PROD-1069` | GET | 200 | 200 OK | `dict` | Returns product specifications & pricing |
| `/api/orders?limit=2` | GET | 200 | 200 OK | `dict` | Total: 40, customer ID & line items |
| `/api/orders/ORD-5001` | GET | 200 | 200 OK | `dict` | Returns order details & status |
| `/api/inventory/logs?limit=5` | GET | 200 | 200 OK | `dict` | Total: 58 immutable audit logs |
| `/api/analytics/low-stock?threshold=30` | GET | 200 | 200 OK | `list` | MongoDB Aggregation 1: Stock risk items |
| `/api/analytics/top-sales?limit=3` | GET | 200 | 200 OK | `list` | MongoDB Aggregation 2: Sales & revenue |
| `/api/analytics/revenue-by-category` | GET | 200 | 200 OK | `list` | MongoDB Aggregation 3: Revenue by category |
| `/api/analytics/order-status` | GET | 200 | 200 OK | `list` | MongoDB Aggregation 4: Order status metrics |
| `/api/analytics/vendor-performance` | GET | 200 | 200 OK | `list` | MongoDB Aggregation 5: Vendor ratings/price |
| `/api/analytics/inventory-activity` | GET | 200 | 200 OK | `list` | MongoDB Aggregation 6: Stock delta velocity |
| `/api/graph/stats` | GET | 200 | 200 OK | `dict` | Neo4j stats: 137 nodes, 356 relationships |
| `/api/graph/topology?limit_nodes=50` | GET | 200 | 200 OK | `dict` | Cytoscape elements (nodes + edges) |
| `/api/routes/optimal?start_warehouse=WH-01&destination_zone=ZONE-70001` | GET | 200 | 200 OK | `dict` | Dijkstra traversal: nodes, hops, cost, time |
| `/api/routes/alternatives?start_warehouse=WH-01&destination_zone=ZONE-70001` | GET | 200 | 200 OK | `list` | Bounded alternate logistics routes |
| `/api/graph/supplier-impact/VEND-8801` | GET | 200 | 200 OK | `dict` | Cascading failure graph traversal |
| `/api/graph/centrality` | GET | 200 | 200 OK | `list` | Degree centrality ranking for hubs |
| `/api/graph/warehouse-stock/WH-01` | GET | 200 | 200 OK | `dict` | Stocked products and inventory counts |
| `/api/graph/alternative-suppliers/PROD-1069` | GET | 200 | 200 OK | `list` | Backup suppliers recommendation |
| `/api/graph/zone-coverage/ZONE-70001` | GET | 200 | 200 OK | `dict` | Serving transit hubs & warehouses |
| `/api/graph/network-resilience` | GET | 200 | 200 OK | `dict` | Bottleneck & resilience audit |
| `/api/graph/corridors` | GET | 200 | 200 OK | `list` | Active interstate freight corridors |
| `/api/graph/product-chain/PROD-1069` | GET | 200 | 200 OK | `dict` | End-to-end multi-echelon traceability |
| `/api/vendors` | GET | 200 | 200 OK | `list` | 20 verified vendors |
| `/api/users` | GET | 200 | 200 OK | `list` | 30 customer/admin users |

---

### Test Suite 3: Database Integrity & Scale Audit

Direct database query results from live clusters:

#### MongoDB Atlas (`sutrachain_db`)
- `products`: 51 documents
  - Indexes: `_id_`, `category_1_price_1` (Compound), `name_text_specs.color_text` (Full Text), `vendor_id_1`
- `orders`: 40 documents
  - Indexes: `_id_`, `order_date_1_status_1` (Compound), `customer_id_1`
- `inventory_logs`: 58 documents
  - Indexes: `_id_`, `timestamp_1`, `product_id_1`
- `vendors`: 20 documents
- `users`: 30 documents

#### Neo4j Aura Graph Database
- **Total Nodes:** 137 nodes
  - `Supplier`: 20 nodes
  - `Product`: 50 nodes
  - `Warehouse`: 11 nodes
  - `TransitHub`: 16 nodes
  - `RetailerZone`: 40 nodes
- **Total Relationships:** 356 relationships
  - `SUPPLIES`: 79 relationships
  - `STOCKED_AT`: 92 relationships
  - `CONNECTS_TO`: 58 relationships
  - `DELIVERS_TO`: 67 relationships
  - `SERVES_ZONE`: 40 relationships
  - `SOURCES_FROM`: 20 relationships

---

### Test Suite 4: Frontend Production Compilation

Command: `npm run build` in `frontend/`

- **TypeScript Engine (`tsc`):** Zero compile errors, strict typing satisfied across all 6 pages.
- **Vite Bundler:** Successfully bundled 2,404 modules into production assets:
  - `dist/index.html` (0.92 kB)
  - `dist/assets/index-DwjTYkRB.css` (27.71 kB)
  - `dist/assets/index-Dsewnstt.js` (1,129.43 kB)
- **Result:** **PASSED**

---

## 3. Known Limitations & Architectural Notes

1. **Neo4j Network Round-Trip:** Because Neo4j Aura is cloud-hosted, cold-start graph queries incur a 150-350ms TLS handshake latency. Connection pooling in `database.py` mitigates this during sustained usage.
2. **Synchronous Two-Phase Commit:** Product deletion is handled with application-level consistency (MongoDB document deletion followed by Neo4j node detachment). If Neo4j is temporarily unreachable during a write, the API gracefully marks the sync flag as degraded and informs the client.

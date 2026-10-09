# SutraChain: Graph-Driven Multi-Vendor E-Commerce & Supply Chain Platform

**Academic Capstone / DBMS Review 3 Demonstration**  
**Institution:** Vellore Institute of Technology (VIT), Vellore  
**Course:** Database Management Systems (CSE3001)  
**Developers:**  
- Asmin Sinha (Reg No: 24BAI0181)  
- Rishit Bhansali (Reg No: 24BCI0137)  

---

## 1. System Overview

**SutraChain** is an enterprise-grade multi-vendor commerce and supply chain logistics platform utilizing a **Polyglot Persistence Architecture**.

Instead of forcing complex relational or graph data into a single paradigm:
- **MongoDB Atlas** serves as the **Transactional Commerce Engine**, handling high-throughput product catalogs, customer orders, inventory audit trails, and multi-stage analytical aggregations.
- **Neo4j Aura** serves as the **Graph Logistics Intelligence Engine**, modeling multi-echelon supply network topology, vendor-product supply lines, warehouse storage, transit corridors, Dijkstra shortest-path route optimization, and downstream cascading failure simulations.

---

## 2. Polyglot Architecture & Technology Stack

```
+------------------------------------------------------------------------------+
|                        React 18 + Vite Frontend                              |
|   (TypeScript, Tailwind CSS, Lucide Icons, Cytoscape.js, Recharts, Dark/Light)|
+---------------------------------------+--------------------------------------+
                                        | HTTP / JSON REST
                                        v
+------------------------------------------------------------------------------+
|                          FastAPI Backend (Python 3.14)                       |
|        Async Lifespan, Motor (AsyncIO), Neo4j Async Driver, Pydantic V2      |
+-------------------+--------------------------------------+-------------------+
                    |                                      |
         Motor Async Client (PyMongo)            Neo4j Async Bolt Driver
                    |                                      |
                    v                                      v
+---------------------------------------+  +-----------------------------------+
|            MongoDB Atlas              |  |             Neo4j Aura            |
|   Database: `sutrachain_db`           |  |   Database: `neo4j`               |
|                                       |  |                                   |
| - products (51 docs, Compound Idx)    |  | - 137 Nodes                       |
| - orders (40 docs, Status Idx)        |  |   * Supplier (20)                 |
| - vendors (20 docs)                   |  |   * Product (50)                  |
| - inventory_logs (58 docs, Time Idx)  |  |   * Warehouse (11)                |
| - users (30 docs)                     |  |   * TransitHub (16)               |
|                                       |  |   * RetailerZone (40)             |
| 6 High-Performance Aggregations       |  |                                   |
| Atomic $inc Stock & Transaction Logs  |  | - 356 Relationships               |
|                                       |  |   * SUPPLIES (79)                 |
|                                       |  |   * STOCKED_AT (92)               |
|                                       |  |   * CONNECTS_TO (58)              |
|                                       |  |   * DELIVERS_TO (67)              |
|                                       |  |   * SERVES_ZONE (40)              |
|                                       |  |   * SOURCES_FROM (20)             |
|                                       |  |                                   |
|                                       |  | Algorithms: Dijkstra & Impact     |
+---------------------------------------+  +-----------------------------------+
```

---

## 3. Directory Structure

```
c:\Users\asmin\sutra_chain\
├── backend/
│   ├── tests/
│   │   └── test_backend.py          # Complete async test suite (Health, CRUD, Aggs, Graph)
│   ├── crud.py                      # MongoDB aggregations, CRUD & Neo4j Cypher algorithms
│   ├── database.py                  # Database drivers, connection pooling & health probe
│   ├── main.py                      # FastAPI entry point, CORS & 24 REST endpoints
│   └── schemas.py                   # Pydantic models for validation & request parsing
├── database/
│   ├── mongo_init.py                # Safe idempotent seed & index creation for MongoDB
│   └── neo4j_init.py                # Safe idempotent Cypher seed & constraints for Neo4j
├── docs/
│   ├── DEMO_SCRIPT.md               # Step-by-step Review 3 teacher demo walkthrough
│   ├── TESTING_REPORT.md            # Empirical test execution logs & coverage matrix
│   └── USER_MANUAL.md               # End-user operational guide with screenshots guide
├── frontend/
│   ├── dist/                        # Production build bundle
│   ├── src/
│   │   ├── components/              # Layout, Modal, and theme primitives
│   │   ├── context/                 # ThemeContext (Dark / Light mode)
│   │   ├── pages/                   # Six primary application views:
│   │   │   ├── OverviewPage.tsx     # KPI metrics, sales charts, recent orders
│   │   │   ├── ProductsPage.tsx     # Full CRUD, search, filter, dual-DB sync
│   │   │   ├── OrdersInventoryPage.tsx # Order lifecycle, stock adjust, audit log
│   │   │   ├── NetworkExplorerPage.tsx # Cytoscape interactive graph visualization
│   │   │   ├── LogisticsPage.tsx    # Dijkstra shortest path & supplier impact
│   │   │   └── AnalyticsPage.tsx    # 6 MongoDB aggregations & graph centrality
│   │   ├── services/
│   │   │   └── api.ts               # Typed REST client
│   │   ├── styles/
│   │   │   └── index.css            # Tailwind directives & CSS tokens
│   │   ├── App.tsx                  # Client router
│   │   └── main.tsx                 # DOM root mount
│   ├── package.json                 # Frontend dependencies (React, Recharts, Cytoscape)
│   └── vite.config.ts               # Vite bundler configuration & backend proxy
├── .env.example                     # Environment template (NO credentials exposed)
├── ANTIGRAVITY_HANDOVER.md          # Comprehensive engineering audit & handover log
├── README.md                        # Primary documentation & setup instructions
└── requirements.txt                 # Python backend dependencies
```

---

## 4. Environment Setup & Configuration

Copy `.env.example` to `.env` in the project root:

```powershell
cp .env.example .env
```

Ensure your `.env` contains the required keys:
```env
# MongoDB Connection Configuration
MONGO_URI=mongodb+srv://<username>:<password>@<cluster-url>/?retryWrites=true&w=majority
MONGO_DB_NAME=sutrachain_db

# Neo4j Connection Configuration
NEO4J_URI=neo4j+s://<instance-id>.databases.neo4j.io
NEO4J_USER=neo4j
NEO4J_PASSWORD=<your-neo4j-password>

# API Server Configuration
PORT=8000
```
*(Never commit `.env` to source control. `.gitignore` is pre-configured to exclude it.)*

---

## 5. Startup Instructions (Windows PowerShell)

Open two Windows PowerShell terminals in `c:\Users\asmin\sutra_chain`.

### Terminal 1: Backend Server (FastAPI)
```powershell
cd c:\Users\asmin\sutra_chain
.\venv\Scripts\uvicorn.exe backend.main:app --host 127.0.0.1 --port 8000 --reload
```
- **Backend API:** `http://127.0.0.1:8000`
- **Interactive Swagger Docs:** `http://127.0.0.1:8000/docs`
- **Database Health Probe:** `http://127.0.0.1:8000/api/health`

### Terminal 2: Frontend Server (React + Vite)
```powershell
cd c:\Users\asmin\sutra_chain\frontend
npm run dev
```
- **Frontend Application URL:** `http://localhost:5173` or `http://127.0.0.1:5173`

---

## 6. Running Tests & Health Verification

To execute the automated end-to-end integration test suite against live databases:

```powershell
cd c:\Users\asmin\sutra_chain
.\venv\Scripts\python.exe backend\tests\test_backend.py
```

Expected output:
```
Running tests...
[OK] test_database_health passed
[OK] test_product_crud_and_sync passed
[OK] test_mongodb_aggregations passed
[OK] test_neo4j_graph_queries passed

=== ALL BACKEND INTEGRATION TESTS PASSED ===
```

To run the frontend production build verification:
```powershell
cd c:\Users\asmin\sutra_chain\frontend
npm run build
```

---

## 7. Database Verification & Seed Utilities

The existing database clusters already contain seeded, validated academic datasets:
- **MongoDB Atlas (`sutrachain_db`):** 51 Products, 40 Orders, 58 Inventory Logs, 20 Vendors, 30 Users.
- **Neo4j Aura (`neo4j`):** 137 Nodes, 356 Relationships.

If a safe, non-destructive re-indexing or re-seeding is required:
```powershell
# Safe idempotent MongoDB index and seed check:
.\venv\Scripts\python.exe database\mongo_init.py

# Safe idempotent Neo4j graph constraint and topology seed:
.\venv\Scripts\python.exe database\neo4j_init.py
```

---

## 8. Summary of API Endpoints

### System & Health
- `GET /` — API root identification.
- `GET /api/health` — Real-time MongoDB & Neo4j connectivity status and counts.

### Products (MongoDB + Neo4j Dual-Sync)
- `GET /api/products` — Filtered catalog with pagination and search.
- `GET /api/products/{id}` — Single product details.
- `POST /api/products` — Atomic product insertion across MongoDB and Neo4j.
- `PUT /api/products/{id}` — Update product attributes in both databases.
- `DELETE /api/products/{id}` — Clean deletion from MongoDB and graph detachment in Neo4j.

### Orders & Inventory (MongoDB)
- `GET /api/orders` — Orders list with status filtering.
- `GET /api/orders/{id}` — Single order record with line items.
- `PATCH /api/orders/{id}/status` — Transition order lifecycle status.
- `PATCH /api/inventory/{product_id}` — Atomic stock increment/decrement with audit logging.
- `GET /api/inventory/logs` — Immutable audit log of stock transactions.

### Analytics (MongoDB Aggregation Pipelines)
- `GET /api/analytics/low-stock` — Stock risk threshold identification.
- `GET /api/analytics/top-sales` — Top-selling products by quantity and revenue.
- `GET /api/analytics/revenue-by-category` — Grouped financial aggregation across product categories.
- `GET /api/analytics/order-status` — Order status distribution and order valuation.
- `GET /api/analytics/vendor-performance` — Vendor catalog sizing, pricing, and ratings.
- `GET /api/analytics/inventory-activity` — Inbound/outbound stock delta velocities.

### Graph Analytics & Logistics (Neo4j Cypher)
- `GET /api/graph/stats` — Node label and relationship type metrics.
- `GET /api/graph/topology` — Cytoscape graph payload with label filters.
- `GET /api/routes/optimal` — **Algorithm 1:** Dijkstra shortest-path routing (distance, time, cost).
- `GET /api/routes/alternatives` — Multi-path alternate route exploration.
- `GET /api/graph/supplier-impact/{id}` — **Algorithm 2:** Cascading supplier disruption impact.
- `GET /api/graph/centrality` — Degree centrality ranking for supply network bottlenecks.
- `GET /api/graph/warehouse-stock/{id}` — Warehouse storage breakdown.
- `GET /api/graph/alternative-suppliers/{product_id}` — Backup supplier recommendation engine.
- `GET /api/graph/zone-coverage/{zone_id}` — Hub and warehouse coverage for delivery zones.
- `GET /api/graph/network-resilience` — Single-point-of-failure transit hub vulnerability scan.
- `GET /api/graph/corridors` — Active interstate transit corridors.
- `GET /api/graph/product-chain/{product_id}` — End-to-end multi-echelon traceability.

---

## 9. Academic Review 3 Rubric Compliance

| Rubric Requirement | Target Criteria | Actual Measured Status | Evidence |
| :--- | :--- | :--- | :--- |
| **Polyglot Architecture** | MongoDB + Neo4j | Fully Integrated | `database.py`, `crud.py` |
| **MongoDB Collections** | $\ge 5$ collections | 5 Collections Present | `products`, `orders`, `vendors`, `users`, `inventory_logs` |
| **MongoDB Aggregations** | $\ge 5$ complex pipelines | 6 Meaningful Aggregations | Revenue by Cat, Top Sales, Low Stock, Status, Vendor Perf, Inventory Act |
| **MongoDB Indexes** | $\ge 2$ purposeful indexes | 3 Compound & Text Indexes | Compound `category_1_price_1`, Text search, Timestamp |
| **Neo4j Node Scale** | $\ge 100$ nodes | 137 Genuine Nodes | 20 Suppliers, 50 Products, 11 Warehouses, 16 Hubs, 40 Zones |
| **Neo4j Relationships** | $\ge 6$ distinct types | 6 Meaningful Types | `SUPPLIES`, `STOCKED_AT`, `CONNECTS_TO`, `DELIVERS_TO`, `SERVES_ZONE`, `SOURCES_FROM` |
| **Graph Queries** | $\ge 10$ Cypher queries | 12 Distinct Endpoints | Routes, Alternatives, Impact, Centrality, Stock, Coverage, Resilience, etc. |
| **Graph Algorithms** | $\ge 2$ real algorithms | 2 Verified Algorithms | 1. Dijkstra Shortest Path (`routes/optimal`)<br>2. Cascading Supplier Impact (`supplier-impact`) |
| **Frontend Integration**| 6 Real Connected Pages | 6/6 Fully Functional | No mock data; real REST calls to FastAPI backend |
| **Cross-DB Sync** | Consistent identifiers | Verified Dual-DB Sync | Stable IDs (`PROD-*`, `WH-*`, `VEND-*`), atomic sync in `crud.py` |

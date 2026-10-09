# SutraChain — Review 3 Demonstration Script

**Project Title:** SutraChain: Graph-Driven Multi-Vendor E-Commerce & Supply Chain Platform  
**Academic Review:** Review 3 Capstone Evaluation  
**Presenters:** Asmin Sinha (24BAI0181) & Rishit Bhansali (24BCI0137)  
**Estimated Demonstration Duration:** 7 – 10 Minutes  

---

## Pre-Demo Checklist (Do Before Evaluator Arrives)

1. Open PowerShell Terminal 1 and start FastAPI:
   ```powershell
   cd c:\Users\asmin\sutra_chain
   .\venv\Scripts\uvicorn.exe backend.main:app --host 127.0.0.1 --port 8000 --reload
   ```
2. Open PowerShell Terminal 2 and start Vite:
   ```powershell
   cd c:\Users\asmin\sutra_chain\frontend
   npm run dev
   ```
3. Open Web Browser tabs:
   - Tab A: `http://localhost:5173` (Frontend Application)
   - Tab B: `http://127.0.0.1:8000/docs` (Swagger API Documentation)
   - Tab C: `http://127.0.0.1:8000/api/health` (Real-Time Database Health Check)

---

## Step-by-Step Demonstration Walkthrough

### Step 1: Introduction & Architecture Justification (1.5 Mins)
- **Spoken Talking Point:**
  > *"Good afternoon, Professor. Today we present SutraChain, an enterprise-grade platform solving a critical problem in modern multi-vendor commerce: polyglot data persistence.*
  > *Traditional e-commerce architectures force complex logistics networks into relational or document databases, leading to prohibitive multi-table JOINs or nested lookups.*
  > *SutraChain decouples responsibilities: MongoDB Atlas handles flexible transactional product catalogs, customer orders, and atomic inventory logs. Simultaneously, Neo4j Aura models the multi-tier supply chain graph—suppliers, warehouses, transit hubs, and retail zones—enabling real-time Dijkstra route optimization and cascading failure simulations."*
- **Action:**
  - Show Tab C (`/api/health`). Point out that **both MongoDB Atlas and Neo4j Aura are live and connected**, reporting 137 nodes and 356 relationships.

---

### Step 2: Overview Dashboard & System Metrics (1 Min)
- **Rubric Criterion:** Complete connected frontend, high-level metrics, and live charts.
- **Action in UI:**
  - Switch to Tab A (`http://localhost:5173`).
  - Point to the KPI Cards:
    - Total Products: `51`
    - Total Orders: `40`
    - Low-Stock Alerts: Calculated dynamically from the database.
    - System Revenue: Aggregated from order line items.
    - Graph Logistics Nodes: `137` Nodes, `356` Relationships.
  - Show the **Category Revenue** bar chart and **Order Pipeline** donut chart—explain that these are rendered directly from MongoDB aggregation pipelines, with zero hardcoded mock values.

---

### Step 3: Product Catalogue & Cross-Database Synchronization (2 Mins)
- **Rubric Criterion:** MongoDB CRUD operations, compound/text indexing, and polyglot consistency.
- **Action in UI:**
  - Navigate to **"Product Catalogue"** (`/products`).
  - Demonstrate search: Type `"Industrial"` or `"Battery"` into the search box. Point out the instant filtering supported by MongoDB compound and text indexes.
  - Demonstrate CRUD & Dual-DB Sync:
    1. Click **"+ Add Product"**.
    2. Input:
       - Product ID: `PROD-DEMO-01`
       - Name: `Precision Pressure Sensor v2`
       - Category: `Industrial`
       - Price: `350`
       - Stock Quantity: `120`
       - Vendor ID: `VEND-8801`
    3. Click **"Create Product"**.
    4. Observe the success notification confirming:
       - MongoDB persistence: `True`
       - Neo4j graph synchronization: `True`
    5. Show the new row in the table.
    6. Click Edit, change price to `375.00`, and save.
    7. Click Delete, confirm deletion, and observe immediate removal from both databases.

---

### Step 4: Orders & Atomic Inventory Audit Logging (1.5 Mins)
- **Rubric Criterion:** Orders management, transactional state transitions, and atomic stock changes.
- **Action in UI:**
  - Navigate to **"Orders & Inventory"** (`/orders-inventory`).
  - On the **Orders** tab, showcase the order pipeline (`DELIVERED`, `IN_TRANSIT`, `PROCESSING`).
  - Click the status dropdown on an order to transition it (e.g., `SHIPPED` $\to$ `IN_TRANSIT`).
  - Switch to the **Inventory & Stock** tab:
    1. Click **"Adjust Stock"** on any product.
    2. Add `+25` units with Reason `"RESTOCK RECEIPT"`.
    3. Apply adjustment: Point out the atomic `$inc` update in MongoDB and the instantaneous generation of an immutable record in the **Inventory Audit Log** table below.

---

### Step 5: Supply Network Explorer (1.5 Mins)
- **Rubric Criterion:** Interactive graph visualization, 100+ nodes, 6 relationship types.
- **Action in UI:**
  - Navigate to **"Supply Network Explorer"** (`/network`).
  - Showcase the Cytoscape canvas:
    - 137 nodes color-coded by echelon: Green (`Supplier`), Blue (`Product`), Orange (`Warehouse`), Purple (`TransitHub`), Rose (`RetailerZone`).
    - 356 relationships representing `SUPPLIES`, `STOCKED_AT`, `CONNECTS_TO`, `DELIVERS_TO`, `SERVES_ZONE`, `SOURCES_FROM`.
  - Interact with controls: Pan, zoom in/out, click **"Fit / Reset"**.
  - Filter by label (e.g., click `TransitHub` to view the inter-state routing backbone).
  - Click on a warehouse node (e.g., `WH-01`): The right drawer opens displaying its city, capacity, connected transit corridors, and inventory breakdown.

---

### Step 6: Logistics & Route Intelligence (Dijkstra Algorithm & Impact Analysis) (2 Mins)
- **Rubric Criterion:** Two genuine graph algorithms / complex graph analytics.
- **Action in UI:**
  - Navigate to **"Logistics & Routes"** (`/logistics`).
  - **Algorithm 1: Dijkstra Shortest Path Logistics Routing:**
    1. Select Source Warehouse: `WH-01 (North Hub DC - Delhi NCR)`.
    2. Select Destination Zone: `ZONE-70001 (New Delhi Central)`.
    3. Click **"Calculate Optimal Route"**.
    4. Highlight results: The algorithm traverses intermediate transit hubs, calculating exact total distance (km), transit hours, and freight shipping cost in INR.
    5. Point out the alternative paths listed below for resilience fallback.
  - **Algorithm 2: Cascading Supplier Disruption Impact Analysis:**
    1. Select Supplier: `VEND-8801`.
    2. Click **"Run Impact Simulation"**.
    3. Highlight the cascading traversal: The system computes how a failure at `VEND-8801` ripples downstream to affect 4 products, 3 regional warehouses, and multiple retail delivery zones.

---

### Step 7: Advanced Polyglot Analytics & Conclusion (1 Min)
- **Rubric Criterion:** 5+ MongoDB aggregation pipelines, degree centrality, professional UI.
- **Action in UI:**
  - Navigate to **"Analytics & Reports"** (`/analytics`).
  - Switch tabs:
    - **Sales Tab:** Top revenue-generating products & category breakdown.
    - **Inventory Tab:** Stock turnover velocity and low-stock risk matrix.
    - **Vendor Tab:** Vendor catalog depth and quality ratings.
    - **Graph Tab:** Degree Centrality ranking identifying the most critical transit hubs in the national distribution network.
  - Toggle Dark/Light mode in the header to demonstrate responsive, accessible UI theming.
  - **Closing Statement:**
    > *"In summary, SutraChain successfully demonstrates polyglot persistence at scale: transactional integrity in MongoDB combined with deep topological intelligence in Neo4j, fully integrated into a responsive, real-time interface. Thank you, Professor. We are ready for questions."*

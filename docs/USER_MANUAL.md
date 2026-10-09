# SutraChain — User Operational Manual

**SutraChain: Graph-Driven Multi-Vendor E-Commerce & Supply Chain Platform**  
*System Documentation for Academic Review & Evaluation*

---

## 1. Getting Started

### 1.1 Prerequisites
- **Operating System:** Windows 10/11 (or macOS / Linux)
- **Runtime:** Python 3.10+ (Current environment: Python 3.14 venv) & Node.js 18+
- **Database Access:** MongoDB Atlas Cluster & Neo4j Aura Database (pre-configured in `.env`)

### 1.2 Starting the System
1. **Launch the Backend API:**
   ```powershell
   cd c:\Users\asmin\sutra_chain
   .\venv\Scripts\uvicorn.exe backend.main:app --host 127.0.0.1 --port 8000 --reload
   ```
   *Verify backend:* Open browser at `http://127.0.0.1:8000/api/health` to confirm `status: "healthy"` for both databases.

2. **Launch the Frontend Client:**
   ```powershell
   cd c:\Users\asmin\sutra_chain\frontend
   npm run dev
   ```
   *Access application:* Open browser at `http://localhost:5173`

---

## 2. Navigating the Six Application Pages

The application is structured into six dedicated modules accessible via the top navigation bar:

```
[Overview] | [Product Catalogue] | [Orders & Inventory] | [Supply Network Explorer] | [Logistics & Routes] | [Analytics & Reports]
```

---

### Page 1: Overview Dashboard (`/`)
- **Primary Purpose:** Executive KPI command center displaying high-level transactional and supply chain metrics.
- **Key Metrics Displayed:**
  - Total Products Cataloged (MongoDB count)
  - Total Transactional Orders (MongoDB count)
  - Critical Stock Alerts (Threshold $< 30$ units)
  - Cumulative System Revenue (Calculated from real order line items)
  - Total Graph Logistics Nodes & Active Edges (Neo4j live count)
- **Interactive Visualizations:**
  - **Category Revenue Distribution:** Bar chart showing gross sales per product category.
  - **Order Pipeline Status:** Donut chart showing order distribution (`DELIVERED`, `IN_TRANSIT`, `PROCESSING`, `SHIPPED`).
  - **Recent Orders Feed:** Real-time table showing latest orders with status pills and timestamps.
  - **Stock Risk Ticker:** Quick view of top low-stock items with one-click navigation to restock.

---

### Page 2: Product Catalogue (`/products`)
- **Primary Purpose:** Full lifecycle management of multi-vendor product documents with cross-database graph synchronization.
- **Features & How to Use:**
  1. **Search & Filter:**
     - Enter keywords in the search bar to execute regex/text search across product name, category, and specifications.
     - Filter by category dropdown (`Electronics`, `Industrial`, `Apparel`, `Office`, `Automotive`).
     - Filter by stock status (`IN_STOCK`, `LOW`, `OUT_OF_STOCK`).
     - Sort by price, stock quantity, or creation date ascending/descending.
  2. **Create New Product (Dual-Database Sync):**
     - Click **"+ Add Product"** button.
     - Fill in Product ID (e.g., `PROD-NEW-101`), Name, Category, Price, Initial Stock, and Vendor ID.
     - Click **"Create Product"**.
     - *System Action:* Inserts document into MongoDB `products` and creates a `(:Product)` node in Neo4j connected via `[:SUPPLIES]` to the supplier and `[:STOCKED_AT]` to warehouse.
  3. **Edit Product:**
     - Click the Edit icon (pencil) on any product row.
     - Update price or stock level and click **"Save Changes"**.
     - Updates persist in MongoDB and update graph node properties in Neo4j.
  4. **Delete Product:**
     - Click the Delete icon (trash can) on any row and confirm deletion.
     - Removes MongoDB document and detaches/deletes the corresponding Neo4j node.

---

### Page 3: Orders & Inventory Management (`/orders-inventory`)
- **Primary Purpose:** Order fulfillment tracking and atomic inventory adjustments with immutable audit logging.
- **Features & How to Use:**
  1. **Orders Tab:**
     - View all customer orders with customer ID, total value, and timestamp.
     - Filter by order status (`ALL`, `PENDING`, `PROCESSING`, `SHIPPED`, `IN_TRANSIT`, `DELIVERED`).
     - Click **"View Route"** to inspect the designated logistics delivery chain for that order.
     - Change status inline using the status selector dropdown to advance the order pipeline.
  2. **Inventory Tab:**
     - Inspect current inventory levels across warehouses.
     - Click **"Adjust Stock"** on any item:
       - Enter positive delta to simulate inbound supplier delivery receipt (`RESTOCK RECEIPT`).
       - Enter negative delta to simulate damaged inventory write-off or manual correction (`AUDIT ADJUSTMENT`).
       - Select target warehouse facility.
       - Click **"Apply Adjustment"**.
     - Inspect the **Immutable Inventory Audit Log** table below, displaying timestamped audit records with previous and updated stock balances.

---

### Page 4: Supply Network Explorer (`/network`)
- **Primary Purpose:** Interactive Cytoscape.js canvas visualizing the multi-tier supply chain graph topology.
- **Features & How to Use:**
  1. **Interactive Graph Canvas:**
     - Color-coded node taxonomy:
       - Green: `Supplier`
       - Blue: `Product`
       - Orange: `Warehouse`
       - Purple: `TransitHub`
       - Rose: `RetailerZone`
     - Pan by dragging the canvas; zoom using mouse wheel or the dedicated Zoom +/- controls.
     - Click **"Fit / Reset"** to recalculate the concentric/cose topology layout.
  2. **Label Filtering:**
     - Use the label filter pills (`ALL`, `Supplier`, `Product`, `Warehouse`, `TransitHub`, `RetailerZone`) to isolate specific echelons.
  3. **Node Inspection Drawer:**
     - Click any node to open the side drawer displaying node properties (city, capacity, reliability score, price, tier) and connected edges.

---

### Page 5: Logistics & Route Intelligence (`/logistics`)
- **Primary Purpose:** Execution of real graph algorithms for route optimization and risk assessment.
- **Algorithm 1: Optimal Shipping Route (Dijkstra Shortest Path):**
  - Select a **Source Warehouse** (e.g., `WH-01 North Hub DC - Delhi NCR`).
  - Select a **Destination Retailer Zone** (e.g., `ZONE-70001 New Delhi Central`).
  - Click **"Calculate Optimal Route"**.
  - *Result Display:* Renders the exact multi-hop route path, total distance in km, estimated transit duration in hours, and total freight cost in INR.
  - Also presents alternative routes discovered by bounded Cypher path matching.
- **Algorithm 2: Supplier Disruption Impact Analysis:**
  - Select a **Supplier / Vendor** (e.g., `VEND-8801`).
  - Click **"Run Impact Simulation"**.
  - *Result Display:* Traverses downstream graph relationships:
    - Lists all catalog products supplied by this vendor.
    - Identifies all regional warehouses currently holding those products.
    - Pinpoints all downstream consumer delivery zones impacted if this supplier faces operational disruption.

---

### Page 6: Advanced Analytics & Reports (`/analytics`)
- **Primary Purpose:** Comprehensive reporting dashboard executing 6 MongoDB analytical aggregation pipelines and Neo4j graph centrality analytics.
- **Analytics Tabs:**
  1. **Sales & Revenue Tab:**
     - Top 10 revenue-generating products ranked by volume and gross sales.
     - Category-wise revenue breakdown table with average transaction values.
  2. **Inventory Velocity Tab:**
     - Inbound vs. outbound stock movements aggregated by event reason.
     - Low-stock risk matrix identifying SKUs requiring replenishment.
  3. **Vendor Performance Tab:**
     - Vendor catalog depth, average product pricing, and vendor reliability ratings.
  4. **Graph Centrality Tab:**
     - Degree centrality ranking of logistics transit hubs and warehouses.
     - Identifies high-interchange hubs and single-point-of-failure bottlenecks across India's supply network.

---

## 3. System Preferences & Error Handling

- **Theme Switching:** Click the Sun/Moon toggle icon in the top-right header to switch between Dark and Light mode. Preferences are persisted in `localStorage`.
- **System Health Pill:** The header displays a live health indicator. Clicking it presents the real-time connectivity status of MongoDB Atlas and Neo4j Aura.
- **Graceful Error Handling:** If a network interruption occurs, the UI displays clear, non-cryptic error banners with retry buttons rather than breaking the application view.

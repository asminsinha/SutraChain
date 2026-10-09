from contextlib import asynccontextmanager
from typing import Optional
from fastapi import FastAPI, Query, Path, Body
from fastapi.middleware.cors import CORSMiddleware
from backend import crud, schemas, database

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Ensure database connections are initialized
    database.init_databases()
    yield
    # Shutdown: Close database connections cleanly
    await database.close_connections()

app = FastAPI(
    title="SutraChain Hybrid API",
    description="Polyglot Persistence Engine combining MongoDB (Transactional Commerce) and Neo4j (Supply Chain Graph Analytics)",
    version="2.0.0",
    lifespan=lifespan
)

# CORS Middleware for Local Frontend Development & Controlled Origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "*"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- SYSTEM & HEALTH ---

@app.get("/", tags=["System"])
def root():
    return {
        "system": "SutraChain NoSQL & Graph Intelligence Platform",
        "status": "online",
        "version": "2.0.0",
        "databases": ["MongoDB Atlas", "Neo4j Aura"]
    }

@app.get("/api/health", tags=["System"])
async def health_check():
    """Returns actual real-time connection status of MongoDB and Neo4j without revealing credentials."""
    return await database.check_health()

# --- PRODUCT CRUD (MongoDB with Neo4j Sync) ---

@app.post("/api/products", response_model=Dict[str, Any] if False else None, tags=["Products"])
async def create_new_product(product: schemas.ProductCreate):
    """Creates a new product document in MongoDB and synchronises it as a node in Neo4j."""
    return await crud.create_product(product)

@app.get("/api/products", tags=["Products"])
async def read_products(
    limit: int = Query(50, ge=1, le=100),
    skip: int = Query(0, ge=0),
    search: Optional[str] = Query(None, description="Search query by name, product_id, or category"),
    category: Optional[str] = Query(None, description="Filter by category"),
    vendor_id: Optional[str] = Query(None, description="Filter by vendor ID"),
    stock_status: Optional[str] = Query(None, description="Stock filter: LOW, OUT_OF_STOCK, IN_STOCK"),
    sort_by: str = Query("created_at", description="Sort field: price, name, stock_quantity, created_at"),
    sort_order: int = Query(-1, description="Sort order: 1 (asc) or -1 (desc)")
):
    """Lists products with pagination, full-text / regex search, and category/stock filtering."""
    return await crud.get_all_products(
        limit=limit,
        skip=skip,
        search=search,
        category=category,
        vendor_id=vendor_id,
        stock_status=stock_status,
        sort_by=sort_by,
        sort_order=sort_order
    )

@app.get("/api/products/{product_id}", tags=["Products"])
async def read_single_product(product_id: str = Path(..., description="Unique product ID (e.g. PROD-1020)")):
    """Fetches details for an individual product from MongoDB."""
    return await crud.get_product_by_id(product_id)

@app.put("/api/products/{product_id}", tags=["Products"])
async def update_existing_product(
    product_id: str = Path(..., description="Product ID to update"),
    updates: schemas.ProductUpdate = Body(...)
):
    """Updates product attributes in MongoDB and synchronises property changes to Neo4j."""
    return await crud.update_product(product_id, updates)

@app.delete("/api/products/{product_id}", tags=["Products"])
async def delete_existing_product(product_id: str = Path(..., description="Product ID to delete")):
    """Deletes a product from MongoDB and cleanly detaches and deletes its graph node in Neo4j."""
    return await crud.delete_product(product_id)

# --- ORDERS & INVENTORY (MongoDB) ---

@app.get("/api/orders", tags=["Orders & Inventory"])
async def read_orders(
    limit: int = Query(50, ge=1, le=100),
    skip: int = Query(0, ge=0),
    status: Optional[str] = Query(None, description="Filter by status: DELIVERED, IN_TRANSIT, PROCESSING, SHIPPED, PENDING"),
    customer_id: Optional[str] = Query(None)
):
    """Retrieves order records with customer details and routing steps."""
    return await crud.get_all_orders(limit=limit, skip=skip, status=status, customer_id=customer_id)

@app.get("/api/orders/{order_id}", tags=["Orders & Inventory"])
async def read_single_order(order_id: str):
    """Fetches a specific order by ID."""
    return await crud.get_order_by_id(order_id)

@app.patch("/api/orders/{order_id}/status", tags=["Orders & Inventory"])
async def modify_order_status(order_id: str, payload: schemas.OrderStatusUpdate):
    """Updates the status of an existing order."""
    return await crud.update_order_status(order_id, payload.status)

@app.patch("/api/inventory/{product_id}", tags=["Orders & Inventory"])
async def modify_inventory(product_id: str, payload: schemas.InventoryAdjustment):
    """Performs an atomic inventory stock adjustment and writes an audit log in inventory_logs."""
    return await crud.adjust_inventory(product_id, payload)

@app.get("/api/inventory/logs", tags=["Orders & Inventory"])
async def read_inventory_logs(
    limit: int = Query(50, ge=1, le=100),
    skip: int = Query(0, ge=0),
    product_id: Optional[str] = Query(None)
):
    """Retrieves historical stock change audit records."""
    return await crud.get_inventory_logs(limit=limit, skip=skip, product_id=product_id)

# --- MONGODB AGGREGATION ANALYTICS (6 Endpoints) ---

@app.get("/api/analytics/low-stock", tags=["Analytics (MongoDB Aggregations)"])
async def read_low_stock(threshold: int = Query(30, ge=1, le=500)):
    """Aggregation 1: Low-Stock Risk Matrix identifying items below threshold."""
    return await crud.get_low_stock_products(threshold)

@app.get("/api/analytics/top-sales", tags=["Analytics (MongoDB Aggregations)"])
async def read_top_sales(limit: int = Query(10, ge=1, le=50)):
    """Aggregation 2: Top-selling products ranked by sales quantity and gross revenue."""
    return await crud.get_sales_analytics(limit)

@app.get("/api/analytics/revenue-by-category", tags=["Analytics (MongoDB Aggregations)"])
async def read_revenue_by_category():
    """Aggregation 3: Revenue, sales volume, and transaction count grouped by category."""
    return await crud.get_revenue_by_category()

@app.get("/api/analytics/order-status", tags=["Analytics (MongoDB Aggregations)"])
async def read_order_status_distribution():
    """Aggregation 4: Order status distribution, total order value, and average order size."""
    return await crud.get_order_status_distribution()

@app.get("/api/analytics/vendor-performance", tags=["Analytics (MongoDB Aggregations)"])
async def read_vendor_performance():
    """Aggregation 5: Vendor catalog size, ratings, and average catalog price."""
    return await crud.get_vendor_performance()

@app.get("/api/analytics/inventory-activity", tags=["Analytics (MongoDB Aggregations)"])
async def read_inventory_activity():
    """Aggregation 6: Inventory movement velocity and net stock deltas grouped by event reason."""
    return await crud.get_inventory_activity_metrics()

# --- NEO4J GRAPH QUERIES & ANALYTICS (12 Cypher Endpoints) ---

@app.get("/api/graph/stats", tags=["Supply Chain Graph (Neo4j)"])
async def read_graph_statistics():
    """Cypher Query 1: Total node and relationship counts broken down by label and type."""
    return await crud.get_graph_stats()

@app.get("/api/graph/topology", tags=["Supply Chain Graph (Neo4j)"])
async def read_graph_topology(
    limit_nodes: int = Query(150, ge=10, le=300),
    label_filter: Optional[str] = Query(None, description="Filter nodes by label: Supplier, Product, Warehouse, TransitHub, RetailerZone")
):
    """Cypher Query 2: Full or filtered Cytoscape-formatted graph topology elements (nodes and edges)."""
    return await crud.get_graph_topology(limit_nodes=limit_nodes, label_filter=label_filter)

@app.get("/api/routes/optimal", tags=["Logistics & Graph Analytics"])
async def find_optimal_shipping_route(
    start_warehouse: str = Query("WH-01", description="Source warehouse identifier (e.g. WH-01 to WH-08)"),
    destination_zone: str = Query("ZONE-70001", description="Target retailer delivery zone (e.g. ZONE-70001 to ZONE-70040)")
):
    """Genuine Graph Algorithm 1: Shortest Path Dijkstra Traversal with distance (km), transit hours, and freight cost calculation."""
    return await crud.get_optimal_shipping_route(start_warehouse, destination_zone)

@app.get("/api/routes/alternatives", tags=["Logistics & Graph Analytics"])
async def find_alternative_shipping_routes(
    start_warehouse: str = Query("WH-01"),
    destination_zone: str = Query("ZONE-70001"),
    max_paths: int = Query(3, ge=1, le=5)
):
    """Cypher Query 4: Bounded multi-path search exploring alternative logistics routes."""
    return await crud.get_alternative_shipping_routes(start_warehouse, destination_zone, max_paths=max_paths)

@app.get("/api/graph/supplier-impact/{supplier_id}", tags=["Logistics & Graph Analytics"])
async def analyze_supplier_impact(supplier_id: str = Path(..., description="Supplier ID (e.g. VEND-8801 to VEND-8820)")):
    """Genuine Graph Algorithm 2: Downstream cascading impact analysis tracking supplied products, affected warehouses, and downstream delivery zones."""
    return await crud.get_supplier_impact(supplier_id)

@app.get("/api/graph/centrality", tags=["Supply Chain Graph (Neo4j)"])
async def read_network_centrality():
    """Cypher Query 6: Network degree centrality identifying bottleneck transit hubs and high-interchange nodes."""
    return await crud.get_graph_centrality_ranking()

@app.get("/api/graph/warehouse-stock/{warehouse_id}", tags=["Supply Chain Graph (Neo4j)"])
async def read_warehouse_graph_stock(warehouse_id: str = Path(..., description="Warehouse ID (e.g. WH-01)")):
    """Cypher Query 7: Products and quantities stocked at the given warehouse."""
    return await crud.get_warehouse_stock(warehouse_id)

@app.get("/api/graph/alternative-suppliers/{product_id}", tags=["Supply Chain Graph (Neo4j)"])
async def read_alternative_suppliers(product_id: str = Path(..., description="Product ID (e.g. PROD-1020)")):
    """Cypher Query 8: Recommends backup suppliers in the same product category."""
    return await crud.get_alternative_suppliers(product_id)

@app.get("/api/graph/zone-coverage/{zone_id}", tags=["Supply Chain Graph (Neo4j)"])
async def read_zone_coverage(zone_id: str = Path(..., description="Retailer Zone ID (e.g. ZONE-70001)")):
    """Cypher Query 9: Servicing transit hubs and warehouses for a given delivery zone."""
    return await crud.get_zone_coverage(zone_id)

@app.get("/api/graph/network-resilience", tags=["Supply Chain Graph (Neo4j)"])
async def read_network_resilience():
    """Cypher Query 10: Single-point-of-failure audit on transit hubs."""
    return await crud.get_network_resilience_audit()

@app.get("/api/graph/corridors", tags=["Supply Chain Graph (Neo4j)"])
async def read_transit_corridors():
    """Cypher Query 11: Active transit corridors with distances, transit hours, and freight costs."""
    return await crud.get_corridors_summary()

@app.get("/api/graph/product-chain/{product_id}", tags=["Supply Chain Graph (Neo4j)"])
async def read_product_traceability(product_id: str = Path(..., description="Product ID (e.g. PROD-1020)")):
    """Cypher Query 12: End-to-end supply chain traceability from supplier to warehouse to transit hub."""
    return await crud.get_product_traceability(product_id)

# --- VENDORS & USERS (MongoDB) ---

@app.get("/api/vendors", tags=["Vendors & Users"])
async def read_vendors():
    """Lists all verified commercial vendors."""
    return await crud.get_all_vendors()

@app.get("/api/users", tags=["Vendors & Users"])
async def read_users():
    """Lists customer and administrator users."""
    return await crud.get_all_users()
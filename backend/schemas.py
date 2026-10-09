from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field

# --- PRODUCT SCHEMAS ---

class ProductSpecs(BaseModel):
    color: Optional[str] = "Standard"
    warranty_months: Optional[int] = 12
    weight_kg: Optional[float] = 1.0
    sku: Optional[str] = None

class ProductCreate(BaseModel):
    product_id: str = Field(..., description="Unique product identifier (e.g. PROD-1099)")
    name: str = Field(..., min_length=2, description="Product commercial name")
    category: str = Field(..., description="Product category")
    price: float = Field(..., gt=0, description="Unit sales price in USD/INR")
    stock_quantity: int = Field(..., ge=0, description="Available inventory count")
    vendor_id: Optional[str] = Field(None, description="Associated vendor ID (e.g. VEND-8801)")
    specs: Optional[ProductSpecs] = Field(default_factory=ProductSpecs)

class ProductUpdate(BaseModel):
    name: Optional[str] = None
    category: Optional[str] = None
    price: Optional[float] = Field(None, gt=0)
    stock_quantity: Optional[int] = Field(None, ge=0)
    vendor_id: Optional[str] = None
    specs: Optional[ProductSpecs] = None

class ProductResponse(BaseModel):
    product_id: str
    name: str
    category: str
    price: float
    stock_quantity: int
    stock_level: Optional[int] = None
    vendor_id: Optional[str] = None
    specs: Optional[Dict[str, Any]] = None
    created_at: Optional[str] = None

class ProductListResponse(BaseModel):
    total: int
    page: int
    limit: int
    products: List[ProductResponse]

# --- ORDER SCHEMAS ---

class OrderItem(BaseModel):
    product_id: str
    quantity: int = Field(..., alias="qty")
    unit_price: float

    class Config:
        populate_by_name = True

class OrderResponse(BaseModel):
    order_id: str
    customer_id: str
    order_date: str
    total_amount: float
    status: str
    items: List[Dict[str, Any]]
    assigned_route: Optional[List[str]] = None

class OrderStatusUpdate(BaseModel):
    status: str = Field(..., description="New order status: PENDING, PROCESSING, SHIPPED, IN_TRANSIT, DELIVERED, CANCELLED")

# --- INVENTORY SCHEMAS ---

class InventoryAdjustment(BaseModel):
    change_qty: int = Field(..., description="Quantity delta (+ to restock, - to deduct)")
    reason: str = Field(..., description="Reason for adjustment: ORDER CHECKOUT, RESTOCK RECEIPT, DAMAGE, etc.")
    warehouse_id: Optional[str] = Field("WH-01", description="Warehouse where inventory changes")
    reference_order_id: Optional[str] = None

class InventoryLogResponse(BaseModel):
    log_id: str
    product_id: str
    warehouse_id: str
    change_qty: int
    reason: str
    reference_order_id: Optional[str] = None
    timestamp: str

# --- GRAPH & ROUTE SCHEMAS ---

class RouteNode(BaseModel):
    id: str
    name: str
    label: str
    city: Optional[str] = None
    state: Optional[str] = None

class RouteEdge(BaseModel):
    source: str
    target: str
    type: str
    dist_km: Optional[float] = 0.0
    hours: Optional[float] = 0.0
    cost: Optional[float] = 0.0

class OptimalRouteResponse(BaseModel):
    success: bool
    start_warehouse: str
    destination_zone: str
    total_hops: int
    total_distance_km: float
    estimated_transit_hours: float
    estimated_shipping_cost: float
    path_nodes: List[Dict[str, Any]]
    path_edges: List[Dict[str, Any]]
    message: Optional[str] = None

class SupplierImpactResponse(BaseModel):
    supplier_id: str
    supplier_name: str
    tier: Optional[str] = None
    reliability_score: Optional[float] = None
    supplied_products_count: int
    supplied_products: List[Dict[str, Any]]
    affected_warehouses_count: int
    affected_warehouses: List[Dict[str, Any]]
    downstream_retailer_zones_count: int
    downstream_retailer_zones: List[Dict[str, Any]]

class GraphStatsResponse(BaseModel):
    total_nodes: int
    total_relationships: int
    nodes_by_label: Dict[str, int]
    relationships_by_type: Dict[str, int]

class CytoscapeNodeData(BaseModel):
    id: str
    label: str
    name: str
    type: str
    extra: Optional[Dict[str, Any]] = None

class CytoscapeNode(BaseModel):
    data: CytoscapeNodeData

class CytoscapeEdgeData(BaseModel):
    id: str
    source: str
    target: str
    label: str
    dist_km: Optional[float] = None
    cost: Optional[float] = None
    hours: Optional[float] = None

class CytoscapeEdge(BaseModel):
    data: CytoscapeEdgeData

class GraphTopologyResponse(BaseModel):
    elements: Dict[str, List[Any]]
    total_nodes: int
    total_edges: int

# --- HEALTH SCHEMA ---

class HealthResponse(BaseModel):
    status: str
    mongodb: Dict[str, Any]
    neo4j: Dict[str, Any]

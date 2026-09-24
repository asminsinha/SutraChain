from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend import crud

app = FastAPI(title="SutraChain Hybrid API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def root():
    return {"status": "online", "system": "SutraChain NoSQL & Graph Backend"}

# --- FULL CRUD ENDPOINTS (MongoDB) ---

@app.post("/api/products")
async def create_new_product(product: crud.ProductSchema):
    return await crud.create_product(product)

@app.get("/api/products")
async def read_products(limit: int = 20):
    return await crud.get_all_products(limit)

@app.get("/api/products/{product_id}")
async def read_single_product(product_id: str):
    return await crud.get_product_by_id(product_id)

@app.put("/api/products/{product_id}")
async def update_existing_product(product_id: str, updates: crud.ProductUpdateSchema):
    return await crud.update_product(product_id, updates)

@app.delete("/api/products/{product_id}")
async def delete_existing_product(product_id: str):
    return await crud.delete_product(product_id)

# --- ADVANCED AGGREGATION ENDPOINTS ---

@app.get("/api/analytics/low-stock")
async def read_low_stock():
    return await crud.get_low_stock_products()

@app.get("/api/analytics/top-sales")
async def read_top_sales():
    return await crud.get_sales_analytics()

# --- NEO4J GRAPH ENDPOINTS ---

@app.get("/api/routes/optimal")
async def find_route(start_warehouse: str = "WH-WEST-01", destination_zone: str = "ZONE-70001"):
    return await crud.get_optimal_shipping_route(start_warehouse, destination_zone)

@app.get("/api/graph/supplier-impact/{supplier_id}")
async def analyze_supplier(supplier_id: str):
    return await crud.get_supplier_impact(supplier_id)
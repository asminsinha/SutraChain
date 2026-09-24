from backend.database import db, neo4j_driver
from pydantic import BaseModel
from typing import Optional

# --- SCHEMAS ---
class ProductSchema(BaseModel):
    product_id: str
    name: str
    category: str
    price: float
    stock_quantity: int

class ProductUpdateSchema(BaseModel):
    name: Optional[str] = None
    price: Optional[float] = None
    stock_quantity: Optional[int] = None

# --- MONGODB OPERATIONS ---

# 1. CREATE
async def create_product(product: ProductSchema):
    doc = product.dict()
    # Store with _id set to product_id to match your existing MongoDB dataset structure
    doc["_id"] = doc["product_id"]
    await db.products.insert_one(doc)
    doc.pop("_id", None)
    return {"message": "Product created successfully", "data": doc}

# 2. READ
async def get_all_products(limit: int = 20):
    products = await db.products.find({}).limit(limit).to_list(length=limit)
    for p in products:
        if "product_id" not in p and "_id" in p:
            p["product_id"] = p["_id"]
        p.pop("_id", None)
        # Normalize stock field name
        if "stock_quantity" not in p and "stock_level" in p:
            p["stock_quantity"] = p["stock_level"]
    return products

async def get_product_by_id(product_id: str):
    # Search by both _id and product_id so it matches PROD-1029 regardless of insertion style
    product = await db.products.find_one({
        "$or": [{"_id": product_id}, {"product_id": product_id}]
    })
    if product:
        if "product_id" not in product:
            product["product_id"] = str(product["_id"])
        product.pop("_id", None)
        if "stock_quantity" not in product and "stock_level" in product:
            product["stock_quantity"] = product["stock_level"]
    return product

# 3. UPDATE
async def update_product(product_id: str, updates: ProductUpdateSchema):
    update_data = {k: v for k, v in updates.dict().items() if v is not None}
    if not update_data:
        return {"message": "No valid fields provided for update"}
    
    result = await db.products.update_one(
        {"$or": [{"_id": product_id}, {"product_id": product_id}]},
        {"$set": update_data}
    )
    if result.modified_count > 0:
        return {"message": f"Product {product_id} updated successfully"}
    return {"message": "Product not found or no changes made"}

# 4. DELETE
async def delete_product(product_id: str):
    result = await db.products.delete_one(
        {"$or": [{"_id": product_id}, {"product_id": product_id}]}
    )
    if result.deleted_count > 0:
        return {"message": f"Product {product_id} deleted successfully"}
    return {"message": "Product not found"}

# --- AGGREGATIONS ---
async def get_low_stock_products(threshold: int = 200):
    pipeline = [
        {
            "$match": {
                "$or": [
                    {"stock_quantity": {"$lte": threshold}},
                    {"stock_level": {"$lte": threshold}}
                ]
            }
        },
        {
            "$project": {
                "_id": 0,
                "product_id": {"$ifNull": ["$product_id", "$_id"]},
                "name": 1,
                "category": 1,
                "stock_quantity": {"$ifNull": ["$stock_quantity", "$stock_level"]},
                "price": 1
            }
        }
    ]
    return await db.products.aggregate(pipeline).to_list(length=100)

async def get_sales_analytics():
    pipeline = [
        {"$unwind": "$items"},
        {"$group": {
            "_id": "$items.product_id",
            "total_quantity_sold": {"$sum": "$items.quantity"},
            "total_revenue": {"$sum": {"$multiply": ["$items.quantity", "$items.unit_price"]}}
        }},
        {"$sort": {"total_revenue": -1}},
        {"$limit": 5}
    ]
    return await db.orders.aggregate(pipeline).to_list(length=5)

# --- NEO4J GRAPH OPERATIONS ---
async def get_optimal_shipping_route(start_warehouse: str, destination_zone: str):
    cypher_query = """
    MATCH p = shortestPath((w:Warehouse {id: $start_wh})-[:CONNECTS_TO|DELIVERS_TO*]-(z:RetailerZone {id: $dest_zone}))
    RETURN [n IN nodes(p) | {id: n.id, name: n.name, label: labels(n)[0]}] AS path_nodes,
           length(p) AS total_hops
    """
    async with neo4j_driver.session() as session:
        result = await session.run(cypher_query, start_wh=start_warehouse, dest_zone=destination_zone)
        record = await result.single()
        if record:
            return {"path": record["path_nodes"], "hops": record["total_hops"]}
        return {"message": "No route found between specified points."}

async def get_supplier_impact(supplier_id: str):
    cypher_query = """
    MATCH (s:Supplier {id: $sup_id})-[:SUPPLIES]->(p:Product)-[:STOCKED_AT]->(w:Warehouse)
    RETURN coalesce(s.name, s.id) AS supplier_name, 
           collect(DISTINCT p.id) AS supplied_products, 
           collect(DISTINCT w.id) AS affected_warehouses
    """
    async with neo4j_driver.session() as session:
        result = await session.run(cypher_query, sup_id=supplier_id)
        record = await result.single()
        if record:
            return dict(record)
        return {"message": "Supplier not found or no downstream supply links."}
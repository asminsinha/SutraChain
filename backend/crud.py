import datetime
from typing import List, Dict, Any, Optional
from fastapi import HTTPException
from backend.database import db, neo4j_driver
from backend.schemas import ProductCreate, ProductUpdate, InventoryAdjustment

# =====================================================================
# 1. PRODUCT CRUD OPERATIONS (MongoDB + Neo4j Synchronisation)
# =====================================================================

async def get_all_products(
    limit: int = 50,
    skip: int = 0,
    search: Optional[str] = None,
    category: Optional[str] = None,
    vendor_id: Optional[str] = None,
    stock_status: Optional[str] = None,
    sort_by: str = "created_at",
    sort_order: int = -1
) -> Dict[str, Any]:
    query: Dict[str, Any] = {}

    if search:
        query["$or"] = [
            {"name": {"$regex": search, "$options": "i"}},
            {"_id": {"$regex": search, "$options": "i"}},
            {"product_id": {"$regex": search, "$options": "i"}},
            {"category": {"$regex": search, "$options": "i"}}
        ]

    if category and category != "ALL":
        query["category"] = category

    if vendor_id:
        query["vendor_id"] = vendor_id

    if stock_status == "LOW":
        query["$or"] = [
            {"stock_quantity": {"$lte": 30}},
            {"stock_level": {"$lte": 30}}
        ]
    elif stock_status == "OUT_OF_STOCK":
        query["$or"] = [
            {"stock_quantity": {"$lte": 0}},
            {"stock_level": {"$lte": 0}}
        ]
    elif stock_status == "IN_STOCK":
        query["$or"] = [
            {"stock_quantity": {"$gt": 30}},
            {"stock_level": {"$gt": 30}}
        ]

    total = await db.products.count_documents(query)
    
    # Sort field mapping
    valid_sorts = {"price": "price", "name": "name", "stock_quantity": "stock_quantity", "created_at": "created_at"}
    actual_sort = valid_sorts.get(sort_by, "created_at")

    cursor = db.products.find(query).sort(actual_sort, sort_order).skip(skip).limit(limit)
    raw_products = await cursor.to_list(length=limit)

    products = []
    for p in raw_products:
        p_id = p.get("product_id") or str(p.get("_id"))
        p["product_id"] = p_id
        p["stock_quantity"] = p.get("stock_quantity", p.get("stock_level", 0))
        p.pop("_id", None)
        products.append(p)

    return {
        "total": total,
        "page": (skip // limit) + 1 if limit > 0 else 1,
        "limit": limit,
        "products": products
    }

async def get_product_by_id(product_id: str) -> Dict[str, Any]:
    doc = await db.products.find_one({"$or": [{"_id": product_id}, {"product_id": product_id}]})
    if not doc:
        raise HTTPException(status_code=404, detail=f"Product with ID '{product_id}' not found.")
    
    doc["product_id"] = doc.get("product_id") or str(doc.get("_id"))
    doc["stock_quantity"] = doc.get("stock_quantity", doc.get("stock_level", 0))
    doc.pop("_id", None)
    return doc

async def create_product(product: ProductCreate) -> Dict[str, Any]:
    # Check duplicate
    existing = await db.products.find_one({"$or": [{"_id": product.product_id}, {"product_id": product.product_id}]})
    if existing:
        raise HTTPException(status_code=409, detail=f"Product with ID '{product.product_id}' already exists.")

    doc = product.model_dump()
    doc["_id"] = doc["product_id"]
    doc["stock_level"] = doc["stock_quantity"]
    doc["created_at"] = datetime.datetime.now(datetime.timezone.utc).isoformat()

    # 1. Persist to MongoDB
    await db.products.insert_one(doc)

    # 2. Sync to Neo4j Graph
    neo4j_synced = False
    try:
        async with neo4j_driver.session() as session:
            await session.run("""
                MERGE (p:Product {id: $prod_id})
                SET p.name = $name,
                    p.category = $category,
                    p.unit_price = $price,
                    p.fragility = 'STANDARD'
            """, prod_id=product.product_id, name=product.name, category=product.category, price=product.price)
            
            # If vendor supplied, link to Supplier
            if product.vendor_id:
                await session.run("""
                    MATCH (s:Supplier {id: $sup_id}), (p:Product {id: $prod_id})
                    MERGE (s)-[r:SUPPLIES]->(p)
                    SET r.lead_time_days = 4, r.contract_rate = $price
                """, sup_id=product.vendor_id, prod_id=product.product_id, price=product.price)
            
            # Link to default Warehouse WH-01
            await session.run("""
                MATCH (p:Product {id: $prod_id}), (w:Warehouse {id: 'WH-01'})
                MERGE (p)-[r:STOCKED_AT]->(w)
                SET r.qty = $qty, r.reorder_level = 30
            """, prod_id=product.product_id, qty=product.stock_quantity)
            
            neo4j_synced = True
    except Exception as e:
        print(f"Warning: Neo4j sync failed for created product {product.product_id}: {e}")

    # Record Initial Inventory Log
    now_ts = int(datetime.datetime.now(datetime.timezone.utc).timestamp() * 1000)
    log_id = f"LOG-NEW-{product.product_id}-{now_ts}"
    await db.inventory_logs.insert_one({
        "_id": log_id,
        "log_id": log_id,
        "product_id": product.product_id,
        "warehouse_id": "WH-01",
        "change_qty": product.stock_quantity,
        "reason": "INITIAL CATALOG CREATION",
        "reference_order_id": None,
        "timestamp": doc["created_at"]
    })

    doc.pop("_id", None)
    return {
        "message": "Product created successfully",
        "data": doc,
        "cross_db_sync": {"mongodb": True, "neo4j": neo4j_synced}
    }

async def update_product(product_id: str, updates: ProductUpdate) -> Dict[str, Any]:
    update_data = {k: v for k, v in updates.model_dump().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="No fields provided for update.")

    if "stock_quantity" in update_data:
        update_data["stock_level"] = update_data["stock_quantity"]

    update_data["updated_at"] = datetime.datetime.now(datetime.timezone.utc).isoformat()

    result = await db.products.update_one(
        {"$or": [{"_id": product_id}, {"product_id": product_id}]},
        {"$set": update_data}
    )

    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail=f"Product with ID '{product_id}' not found.")

    # Neo4j synchronisation
    neo4j_synced = False
    try:
        cypher_sets = []
        params = {"prod_id": product_id}
        if "name" in update_data:
            cypher_sets.append("p.name = $name")
            params["name"] = update_data["name"]
        if "category" in update_data:
            cypher_sets.append("p.category = $category")
            params["category"] = update_data["category"]
        if "price" in update_data:
            cypher_sets.append("p.unit_price = $price")
            params["price"] = update_data["price"]

        if cypher_sets:
            set_clause = ", ".join(cypher_sets)
            async with neo4j_driver.session() as session:
                await session.run(f"MATCH (p:Product {{id: $prod_id}}) SET {set_clause}", **params)
            neo4j_synced = True
    except Exception as e:
        print(f"Warning: Neo4j update sync failed for product {product_id}: {e}")

    updated_doc = await get_product_by_id(product_id)
    return {
        "message": f"Product {product_id} updated successfully",
        "data": updated_doc,
        "cross_db_sync": {"mongodb": True, "neo4j": neo4j_synced}
    }

async def delete_product(product_id: str) -> Dict[str, Any]:
    result = await db.products.delete_one({"$or": [{"_id": product_id}, {"product_id": product_id}]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail=f"Product with ID '{product_id}' not found.")

    # Neo4j synchronisation - Detach and delete product node
    neo4j_deleted = False
    try:
        async with neo4j_driver.session() as session:
            await session.run("MATCH (p:Product {id: $prod_id}) DETACH DELETE p", prod_id=product_id)
            neo4j_deleted = True
    except Exception as e:
        print(f"Warning: Neo4j delete sync failed for product {product_id}: {e}")

    return {
        "message": f"Product {product_id} deleted successfully from database",
        "cross_db_sync": {"mongodb": True, "neo4j": neo4j_deleted}
    }

# =====================================================================
# 2. ORDERS & INVENTORY MANAGEMENT (MongoDB Operations)
# =====================================================================

async def get_all_orders(
    limit: int = 50,
    skip: int = 0,
    status: Optional[str] = None,
    customer_id: Optional[str] = None
) -> Dict[str, Any]:
    query: Dict[str, Any] = {}
    if status and status != "ALL":
        query["status"] = status
    if customer_id:
        query["customer_id"] = customer_id

    total = await db.orders.count_documents(query)
    raw_orders = await db.orders.find(query).sort("order_date", -1).skip(skip).limit(limit).to_list(length=limit)

    orders = []
    for o in raw_orders:
        o["order_id"] = o.get("order_id") or str(o.get("_id"))
        o.pop("_id", None)
        orders.append(o)

    return {"total": total, "page": (skip // limit) + 1 if limit > 0 else 1, "limit": limit, "orders": orders}

async def get_order_by_id(order_id: str) -> Dict[str, Any]:
    doc = await db.orders.find_one({"$or": [{"_id": order_id}, {"order_id": order_id}]})
    if not doc:
        raise HTTPException(status_code=404, detail=f"Order '{order_id}' not found.")
    doc["order_id"] = doc.get("order_id") or str(doc.get("_id"))
    doc.pop("_id", None)
    return doc

async def update_order_status(order_id: str, new_status: str) -> Dict[str, Any]:
    valid_statuses = ["PENDING", "PROCESSING", "SHIPPED", "IN_TRANSIT", "DELIVERED", "CANCELLED"]
    if new_status not in valid_statuses:
        raise HTTPException(status_code=400, detail=f"Invalid status '{new_status}'. Allowed: {valid_statuses}")

    result = await db.orders.update_one(
        {"$or": [{"_id": order_id}, {"order_id": order_id}]},
        {"$set": {"status": new_status, "updated_at": datetime.datetime.now(datetime.timezone.utc).isoformat()}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail=f"Order '{order_id}' not found.")

    return {"message": f"Order {order_id} status updated to {new_status}"}

async def adjust_inventory(product_id: str, adj: InventoryAdjustment) -> Dict[str, Any]:
    # 1. Fetch current product
    product = await db.products.find_one({"$or": [{"_id": product_id}, {"product_id": product_id}]})
    if not product:
        raise HTTPException(status_code=404, detail=f"Product '{product_id}' not found.")

    current_stock = product.get("stock_quantity", product.get("stock_level", 0))
    new_stock = current_stock + adj.change_qty

    if new_stock < 0:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot reduce stock by {abs(adj.change_qty)}. Available stock is only {current_stock}."
        )

    # 2. Atomic stock update
    await db.products.update_one(
        {"$or": [{"_id": product_id}, {"product_id": product_id}]},
        {"$set": {"stock_quantity": new_stock, "stock_level": new_stock}}
    )

    # 3. Create Audit Log
    now_iso = datetime.datetime.now(datetime.timezone.utc).isoformat()
    log_id = f"LOG-ADJ-{int(datetime.datetime.now(datetime.timezone.utc).timestamp()*1000)}"
    log_doc = {
        "_id": log_id,
        "log_id": log_id,
        "product_id": product_id,
        "warehouse_id": adj.warehouse_id or "WH-01",
        "change_qty": adj.change_qty,
        "reason": adj.reason,
        "reference_order_id": adj.reference_order_id,
        "timestamp": now_iso
    }
    await db.inventory_logs.insert_one(log_doc)
    log_doc.pop("_id", None)

    return {
        "message": "Stock adjusted successfully",
        "product_id": product_id,
        "previous_stock": current_stock,
        "new_stock": new_stock,
        "audit_log": log_doc
    }

async def get_inventory_logs(limit: int = 50, skip: int = 0, product_id: Optional[str] = None) -> Dict[str, Any]:
    query: Dict[str, Any] = {}
    if product_id:
        query["product_id"] = product_id

    total = await db.inventory_logs.count_documents(query)
    raw_logs = await db.inventory_logs.find(query).sort("timestamp", -1).skip(skip).limit(limit).to_list(length=limit)
    
    logs = []
    for l in raw_logs:
        l["log_id"] = l.get("log_id") or str(l.get("_id"))
        l.pop("_id", None)
        logs.append(l)

    return {"total": total, "logs": logs}

# =====================================================================
# 3. MONGODB AGGREGATION PIPELINES (6 Deep Analytics Endpoints)
# =====================================================================

# Aggregation 1: Low-Stock Risk Matrix
async def get_low_stock_products(threshold: int = 30) -> List[Dict[str, Any]]:
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
                "price": 1,
                "vendor_id": 1,
                "stock_quantity": {"$ifNull": ["$stock_quantity", "$stock_level"]},
                "risk_level": {
                    "$cond": {
                        "if": {"$lte": [{"$ifNull": ["$stock_quantity", "$stock_level"]}, 10]},
                        "then": "CRITICAL",
                        "else": "WARNING"
                    }
                }
            }
        },
        {"$sort": {"stock_quantity": 1}},
        {"$limit": 50}
    ]
    return await db.products.aggregate(pipeline).to_list(length=50)

# Aggregation 2: Top-Selling Products by Sales Volume & Revenue
async def get_sales_analytics(limit: int = 10) -> List[Dict[str, Any]]:
    pipeline = [
        {"$unwind": "$items"},
        {
            "$project": {
                "product_id": "$items.product_id",
                "quantity": {"$ifNull": ["$items.quantity", "$items.qty"]},
                "unit_price": "$items.unit_price"
            }
        },
        {
            "$group": {
                "_id": "$product_id",
                "total_quantity_sold": {"$sum": "$quantity"},
                "total_revenue": {"$sum": {"$multiply": ["$quantity", "$unit_price"]}},
                "order_occurrences": {"$sum": 1}
            }
        },
        {"$sort": {"total_revenue": -1}},
        {"$limit": limit},
        {
            "$lookup": {
                "from": "products",
                "localField": "_id",
                "foreignField": "_id",
                "as": "prod_info"
            }
        },
        {
            "$project": {
                "_id": 0,
                "product_id": "$_id",
                "total_quantity_sold": 1,
                "total_revenue": {"$round": ["$total_revenue", 2]},
                "order_occurrences": 1,
                "name": {
                    "$ifNull": [
                        {"$arrayElemAt": ["$prod_info.name", 0]},
                        "$_id"
                    ]
                },
                "category": {
                    "$ifNull": [
                        {"$arrayElemAt": ["$prod_info.category", 0]},
                        "General"
                    ]
                }
            }
        }
    ]
    return await db.orders.aggregate(pipeline).to_list(length=limit)

# Aggregation 3: Revenue and Volume by Product Category
async def get_revenue_by_category() -> List[Dict[str, Any]]:
    pipeline = [
        {"$unwind": "$items"},
        {
            "$lookup": {
                "from": "products",
                "localField": "items.product_id",
                "foreignField": "_id",
                "as": "product_doc"
            }
        },
        {
            "$project": {
                "category": {
                    "$ifNull": [
                        {"$arrayElemAt": ["$product_doc.category", 0]},
                        "Uncategorized"
                    ]
                },
                "quantity": {"$ifNull": ["$items.quantity", "$items.qty"]},
                "unit_price": "$items.unit_price"
            }
        },
        {
            "$group": {
                "_id": "$category",
                "total_revenue": {"$sum": {"$multiply": ["$quantity", "$unit_price"]}},
                "units_sold": {"$sum": "$quantity"},
                "transaction_count": {"$sum": 1}
            }
        },
        {
            "$project": {
                "_id": 0,
                "category": "$_id",
                "total_revenue": {"$round": ["$total_revenue", 2]},
                "units_sold": 1,
                "transaction_count": 1
            }
        },
        {"$sort": {"total_revenue": -1}}
    ]
    return await db.orders.aggregate(pipeline).to_list(length=20)

# Aggregation 4: Order Status Breakdown & Fulfillment Rate
async def get_order_status_distribution() -> List[Dict[str, Any]]:
    pipeline = [
        {
            "$group": {
                "_id": "$status",
                "order_count": {"$sum": 1},
                "total_value": {"$sum": "$total_amount"},
                "avg_order_value": {"$avg": "$total_amount"}
            }
        },
        {
            "$project": {
                "_id": 0,
                "status": "$_id",
                "order_count": 1,
                "total_value": {"$round": ["$total_value", 2]},
                "avg_order_value": {"$round": ["$avg_order_value", 2]}
            }
        },
        {"$sort": {"order_count": -1}}
    ]
    return await db.orders.aggregate(pipeline).to_list(length=10)

# Aggregation 5: Vendor Sales & Rating Performance
async def get_vendor_performance() -> List[Dict[str, Any]]:
    pipeline = [
        {
            "$lookup": {
                "from": "products",
                "localField": "_id",
                "foreignField": "vendor_id",
                "as": "vendor_products"
            }
        },
        {
            "$project": {
                "_id": 0,
                "vendor_id": {"$ifNull": ["$vendor_id", "$_id"]},
                "business_name": 1,
                "rating": 1,
                "verification_status": 1,
                "origin_warehouse_id": 1,
                "product_catalog_count": {"$size": "$vendor_products"},
                "avg_catalog_price": {
                    "$round": [{"$avg": "$vendor_products.price"}, 2]
                }
            }
        },
        {"$sort": {"rating": -1}},
        {"$limit": 20}
    ]
    return await db.vendors.aggregate(pipeline).to_list(length=20)

# Aggregation 6: Inventory Movement Velocity by Reason
async def get_inventory_activity_metrics() -> List[Dict[str, Any]]:
    pipeline = [
        {
            "$group": {
                "_id": "$reason",
                "event_count": {"$sum": 1},
                "net_quantity_delta": {"$sum": "$change_qty"},
                "affected_products_count": {"$addToSet": "$product_id"}
            }
        },
        {
            "$project": {
                "_id": 0,
                "reason": "$_id",
                "event_count": 1,
                "net_quantity_delta": 1,
                "distinct_products_affected": {"$size": "$affected_products_count"}
            }
        },
        {"$sort": {"event_count": -1}}
    ]
    return await db.inventory_logs.aggregate(pipeline).to_list(length=10)

# =====================================================================
# 4. NEO4J GRAPH OPERATIONS & GENUINE GRAPH ANALYTICS
# =====================================================================

# Query 1: Graph Statistics
async def get_graph_stats() -> Dict[str, Any]:
    async with neo4j_driver.session() as session:
        # Node counts by label
        l_res = await session.run("""
            MATCH (n) 
            RETURN labels(n)[0] AS label, count(n) AS count 
            ORDER BY count DESC
        """)
        nodes_by_label = {rec["label"]: rec["count"] async for rec in l_res}
        
        # Rel counts by type
        r_res = await session.run("""
            MATCH ()-[r]->() 
            RETURN type(r) AS type, count(r) AS count 
            ORDER BY count DESC
        """)
        rels_by_type = {rec["type"]: rec["count"] async for rec in r_res}

        total_nodes = sum(nodes_by_label.values())
        total_rels = sum(rels_by_type.values())

        return {
            "total_nodes": total_nodes,
            "total_relationships": total_rels,
            "nodes_by_label": nodes_by_label,
            "relationships_by_type": rels_by_type
        }

# Query 2: Complete / Filtered Graph Topology for Cytoscape.js
async def get_graph_topology(
    limit_nodes: int = 150,
    label_filter: Optional[str] = None
) -> Dict[str, Any]:
    async with neo4j_driver.session() as session:
        if label_filter and label_filter != "ALL":
            node_query = """
                MATCH (n) WHERE $label IN labels(n)
                RETURN n.id AS id, coalesce(n.name, n.id) AS name, labels(n)[0] AS type, properties(n) AS props
                LIMIT $limit
            """
            n_res = await session.run(node_query, label=label_filter, limit=limit_nodes)
        else:
            node_query = """
                MATCH (n)
                RETURN n.id AS id, coalesce(n.name, n.id) AS name, labels(n)[0] AS type, properties(n) AS props
                LIMIT $limit
            """
            n_res = await session.run(node_query, limit=limit_nodes)

        nodes_list = []
        node_ids = set()
        async for r in n_res:
            nid = r["id"]
            node_ids.add(nid)
            props = dict(r["props"])
            props.pop("id", None)
            nodes_list.append({
                "data": {
                    "id": nid,
                    "name": r["name"],
                    "label": r["type"],
                    "type": r["type"],
                    "extra": props
                }
            })

        # Fetch relationships connecting these loaded nodes
        rel_query = """
            MATCH (a)-[r]->(b)
            WHERE a.id IN $nids AND b.id IN $nids
            RETURN a.id AS source, b.id AS target, type(r) AS rel_type, properties(r) AS props
            LIMIT 400
        """
        r_res = await session.run(rel_query, nids=list(node_ids))
        edges_list = []
        edge_counter = 0
        async for rec in r_res:
            edge_counter += 1
            p = dict(rec["props"])
            edges_list.append({
                "data": {
                    "id": f"e_{rec['source']}_{rec['target']}_{edge_counter}",
                    "source": rec["source"],
                    "target": rec["target"],
                    "label": rec["rel_type"],
                    "dist_km": p.get("dist_km"),
                    "cost": p.get("cost"),
                    "hours": p.get("hours")
                }
            })

        return {
            "elements": {
                "nodes": nodes_list,
                "edges": edges_list
            },
            "total_nodes": len(nodes_list),
            "total_edges": len(edges_list)
        }

# Query 3: Genuine Graph Algorithm 1 - Shortest-Path Logistics with Cost & Transit Hours Calculation
async def get_optimal_shipping_route(start_warehouse: str, destination_zone: str) -> Dict[str, Any]:
    cypher_query = """
    MATCH (w:Warehouse {id: $start_wh}), (z:RetailerZone {id: $dest_zone})
    MATCH p = shortestPath((w)-[:CONNECTS_TO|DELIVERS_TO*]-(z))
    RETURN [n IN nodes(p) | {id: n.id, name: coalesce(n.name, n.id), label: labels(n)[0], city: coalesce(n.city, n.state, '')}] AS path_nodes,
           [r IN relationships(p) | {source: startNode(r).id, target: endNode(r).id, type: type(r), dist_km: coalesce(r.dist_km, 0.0), hours: coalesce(r.hours, 0.0), cost: coalesce(r.cost, 0.0)}] AS path_edges,
           length(p) AS total_hops
    """
    async with neo4j_driver.session() as session:
        result = await session.run(cypher_query, start_wh=start_warehouse, dest_zone=destination_zone)
        record = await result.single()
        if record:
            path_nodes = record["path_nodes"]
            path_edges = record["path_edges"]
            total_hops = record["total_hops"]

            total_dist = sum(e.get("dist_km", 0.0) for e in path_edges)
            total_hours = sum(e.get("hours", 0.0) for e in path_edges)
            total_cost = sum(e.get("cost", 0.0) for e in path_edges)

            return {
                "success": True,
                "start_warehouse": start_warehouse,
                "destination_zone": destination_zone,
                "total_hops": total_hops,
                "total_distance_km": round(total_dist, 1),
                "estimated_transit_hours": round(total_hours, 1),
                "estimated_shipping_cost": round(total_cost, 2),
                "path_nodes": path_nodes,
                "path_edges": path_edges,
                "message": f"Optimal path discovered with {total_hops} hops across the active transit network."
            }

        return {
            "success": False,
            "start_warehouse": start_warehouse,
            "destination_zone": destination_zone,
            "total_hops": 0,
            "total_distance_km": 0.0,
            "estimated_transit_hours": 0.0,
            "estimated_shipping_cost": 0.0,
            "path_nodes": [],
            "path_edges": [],
            "message": f"No active path found between warehouse '{start_warehouse}' and zone '{destination_zone}'."
        }

# Query 4: Alternative Shipping Paths (Bounded Multi-Route Explorer)
async def get_alternative_shipping_routes(start_warehouse: str, destination_zone: str, max_paths: int = 3) -> List[Dict[str, Any]]:
    cypher_query = """
    MATCH (w:Warehouse {id: $start_wh}), (z:RetailerZone {id: $dest_zone})
    MATCH p = (w)-[:CONNECTS_TO|DELIVERS_TO*1..4]-(z)
    WITH p, length(p) AS hops,
         reduce(dist = 0.0, r IN relationships(p) | dist + coalesce(r.dist_km, 0.0)) AS total_dist,
         reduce(hrs = 0.0, r IN relationships(p) | hrs + coalesce(r.hours, 0.0)) AS total_hrs,
         reduce(c = 0.0, r IN relationships(p) | c + coalesce(r.cost, 0.0)) AS total_cost
    ORDER BY total_cost ASC, hops ASC
    LIMIT $max_paths
    RETURN [n IN nodes(p) | {id: n.id, name: coalesce(n.name, n.id), label: labels(n)[0]}] AS path_nodes,
           [r IN relationships(p) | {source: startNode(r).id, target: endNode(r).id, type: type(r)}] AS path_edges,
           hops, total_dist, total_hrs, total_cost
    """
    async with neo4j_driver.session() as session:
        result = await session.run(cypher_query, start_wh=start_warehouse, dest_zone=destination_zone, max_paths=max_paths)
        paths = []
        async for rec in result:
            paths.append({
                "hops": rec["hops"],
                "total_distance_km": round(rec["total_dist"], 1),
                "estimated_transit_hours": round(rec["total_hrs"], 1),
                "estimated_shipping_cost": round(rec["total_cost"], 2),
                "path_nodes": rec["path_nodes"],
                "path_edges": rec["path_edges"]
            })
        return paths

# Query 5: Genuine Graph Analytics 2 - Supplier Cascading Impact & Vulnerability Analysis
async def get_supplier_impact(supplier_id: str) -> Dict[str, Any]:
    cypher_query = """
    MATCH (s:Supplier {id: $sup_id})
    OPTIONAL MATCH (s)-[:SUPPLIES]->(p:Product)
    OPTIONAL MATCH (p)-[:STOCKED_AT]->(w:Warehouse)
    OPTIONAL MATCH (w)-[:CONNECTS_TO*1..2]->(h:TransitHub)-[:DELIVERS_TO]->(z:RetailerZone)
    RETURN coalesce(s.name, s.id) AS supplier_name,
           s.tier AS tier,
           s.reliability_score AS reliability_score,
           collect(DISTINCT {id: p.id, name: p.name, category: p.category}) AS supplied_products,
           collect(DISTINCT {id: w.id, name: w.name, city: w.city}) AS affected_warehouses,
           collect(DISTINCT {id: z.id, name: z.name, city: z.city}) AS downstream_retailer_zones
    """
    async with neo4j_driver.session() as session:
        result = await session.run(cypher_query, sup_id=supplier_id)
        record = await result.single()
        if not record or not record["supplier_name"]:
            raise HTTPException(status_code=404, detail=f"Supplier '{supplier_id}' not found.")

        # Clean null elements
        prods = [p for p in record["supplied_products"] if p.get("id")]
        whs = [w for w in record["affected_warehouses"] if w.get("id")]
        zones = [z for z in record["downstream_retailer_zones"] if z.get("id")]

        return {
            "supplier_id": supplier_id,
            "supplier_name": record["supplier_name"],
            "tier": record["tier"],
            "reliability_score": record["reliability_score"],
            "supplied_products_count": len(prods),
            "supplied_products": prods,
            "affected_warehouses_count": len(whs),
            "affected_warehouses": whs,
            "downstream_retailer_zones_count": len(zones),
            "downstream_retailer_zones": zones
        }

# Query 6: Network Degree Centrality & Strategic Bottleneck Ranking
async def get_graph_centrality_ranking() -> List[Dict[str, Any]]:
    cypher_query = """
    MATCH (n)
    WHERE labels(n)[0] IN ['TransitHub', 'Warehouse', 'Supplier']
    WITH n, labels(n)[0] AS label,
         count { (n)--() } AS total_degree,
         count { (n)-->() } AS out_degree,
         count { (n)<--() } AS in_degree
    ORDER BY total_degree DESC
    LIMIT 15
    RETURN n.id AS node_id,
           coalesce(n.name, n.id) AS name,
           label,
           total_degree,
           out_degree,
           in_degree,
           CASE 
               WHEN total_degree >= 10 THEN 'CRITICAL BOTTLENECK'
               WHEN total_degree >= 6 THEN 'HIGH INTERCHANGE'
               ELSE 'STANDARD NODE'
           END AS criticality
    """
    async with neo4j_driver.session() as session:
        result = await session.run(cypher_query)
        ranking = [dict(rec) async for rec in result]
        return ranking

# Query 7: Warehouse Stock & Inventory Allocation in Graph
async def get_warehouse_stock(warehouse_id: str) -> Dict[str, Any]:
    cypher_query = """
    MATCH (w:Warehouse {id: $wh_id})
    OPTIONAL MATCH (p:Product)-[r:STOCKED_AT]->(w)
    RETURN w.id AS warehouse_id,
           w.name AS name,
           w.city AS city,
           w.capacity_sqft AS capacity_sqft,
           collect({
               product_id: p.id,
               name: p.name,
               category: p.category,
               unit_price: p.unit_price,
               stocked_qty: r.qty,
               reorder_level: r.reorder_level,
               aisle: r.aisle
           }) AS inventory_items
    """
    async with neo4j_driver.session() as session:
        res = await session.run(cypher_query, wh_id=warehouse_id)
        rec = await res.single()
        if not rec or not rec["warehouse_id"]:
            raise HTTPException(status_code=404, detail=f"Warehouse '{warehouse_id}' not found.")
        return dict(rec)

# Query 8: Alternative Supplier Recommendations for a Product
async def get_alternative_suppliers(product_id: str) -> List[Dict[str, Any]]:
    cypher_query = """
    MATCH (p:Product {id: $prod_id})
    MATCH (current_sup:Supplier)-[:SUPPLIES]->(p)
    MATCH (alt_sup:Supplier)-[r:SUPPLIES]->(other_prod:Product)
    WHERE other_prod.category = p.category AND alt_sup.id <> current_sup.id
    WITH alt_sup, count(DISTINCT other_prod) AS category_experience, avg(r.lead_time_days) AS avg_lead_time
    ORDER BY alt_sup.reliability_score DESC, category_experience DESC
    LIMIT 5
    RETURN alt_sup.id AS supplier_id,
           alt_sup.name AS supplier_name,
           alt_sup.tier AS tier,
           alt_sup.reliability_score AS reliability_score,
           alt_sup.city AS city,
           category_experience,
           round(avg_lead_time, 1) AS estimated_lead_time_days
    """
    async with neo4j_driver.session() as session:
        res = await session.run(cypher_query, prod_id=product_id)
        return [dict(r) async for r in res]

# Query 9: Delivery Zone Servicing Network & SLA Coverage
async def get_zone_coverage(zone_id: str) -> Dict[str, Any]:
    cypher_query = """
    MATCH (z:RetailerZone {id: $zone_id})
    OPTIONAL MATCH (h:TransitHub)-[d:DELIVERS_TO]->(z)
    OPTIONAL MATCH (w:Warehouse)-[s:SERVES_ZONE]->(z)
    RETURN z.id AS zone_id,
           z.name AS name,
           z.city AS city,
           z.urgency_sla_hours AS sla_hours,
           collect(DISTINCT {hub_id: h.id, name: h.name, dist_km: d.dist_km, transit_hours: d.hours, cost: d.cost, priority: d.priority}) AS direct_hubs,
           collect(DISTINCT {warehouse_id: w.id, name: w.name, sla_hours: s.sla_hours, freight_tier: s.freight_tier}) AS serving_warehouses
    """
    async with neo4j_driver.session() as session:
        res = await session.run(cypher_query, zone_id=zone_id)
        rec = await res.single()
        if not rec or not rec["zone_id"]:
            raise HTTPException(status_code=404, detail=f"Delivery Zone '{zone_id}' not found.")
        return dict(rec)

# Query 10: Network Resilience & Single-Point-of-Failure Audit
async def get_network_resilience_audit() -> Dict[str, Any]:
    cypher_query = """
    MATCH (h:TransitHub)
    WHERE count { (h)-[:DELIVERS_TO]->(:RetailerZone) } > 0
    WITH h,
         count { (h)-[:DELIVERS_TO]->(:RetailerZone) } AS exclusive_deliveries,
         count { ()-[:CONNECTS_TO]->(h) } AS feeder_connections
    RETURN h.id AS hub_id,
           h.name AS name,
           h.status AS status,
           exclusive_deliveries,
           feeder_connections,
           CASE
               WHEN feeder_connections <= 1 THEN 'HIGH RISK: SINGLE FEEDER CORRIDOR'
               WHEN exclusive_deliveries >= 5 THEN 'HIGH LOAD HUB'
               ELSE 'RESILIENT'
           END AS risk_assessment
    ORDER BY exclusive_deliveries DESC
    """
    async with neo4j_driver.session() as session:
        res = await session.run(cypher_query)
        audits = [dict(r) async for r in res]
        return {"audit_timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat(), "hub_resilience": audits}

# Query 11: Active Transit Corridors Matrix
async def get_corridors_summary() -> List[Dict[str, Any]]:
    cypher_query = """
    MATCH (a)-[r:CONNECTS_TO]->(b)
    RETURN a.id AS origin_id,
           coalesce(a.name, a.id) AS origin_name,
           labels(a)[0] AS origin_type,
           b.id AS dest_id,
           coalesce(b.name, b.id) AS dest_name,
           labels(b)[0] AS dest_type,
           r.dist_km AS dist_km,
           r.hours AS transit_hours,
           r.cost AS freight_cost,
           r.status AS status
    ORDER BY r.cost ASC
    LIMIT 30
    """
    async with neo4j_driver.session() as session:
        res = await session.run(cypher_query)
        return [dict(r) async for r in res]

# Query 12: Product End-to-End Supply Traceability
async def get_product_traceability(product_id: str) -> Dict[str, Any]:
    cypher_query = """
    MATCH (p:Product {id: $prod_id})
    OPTIONAL MATCH (s:Supplier)-[sup:SUPPLIES]->(p)
    OPTIONAL MATCH (p)-[st:STOCKED_AT]->(w:Warehouse)
    OPTIONAL MATCH (w)-[:CONNECTS_TO]->(h:TransitHub)
    RETURN p.id AS product_id,
           p.name AS product_name,
           p.category AS category,
           collect(DISTINCT {supplier_id: s.id, name: s.name, lead_time_days: sup.lead_time_days, contract_rate: sup.contract_rate}) AS suppliers,
           collect(DISTINCT {warehouse_id: w.id, name: w.name, qty: st.qty, aisle: st.aisle}) AS warehouses,
           collect(DISTINCT {hub_id: h.id, name: h.name}) AS connected_hubs
    """
    async with neo4j_driver.session() as session:
        res = await session.run(cypher_query, prod_id=product_id)
        rec = await res.single()
        if not rec or not rec["product_id"]:
            raise HTTPException(status_code=404, detail=f"Product '{product_id}' not found in graph.")
        return dict(rec)

# =====================================================================
# 5. VENDORS & USERS (MongoDB Operations)
# =====================================================================

async def get_all_vendors() -> List[Dict[str, Any]]:
    vendors = await db.vendors.find({}).to_list(length=50)
    for v in vendors:
        v["vendor_id"] = v.get("vendor_id") or str(v.get("_id"))
        v.pop("_id", None)
    return vendors

async def get_all_users() -> List[Dict[str, Any]]:
    users = await db.users.find({}).to_list(length=50)
    for u in users:
        u["user_id"] = u.get("user_id") or str(u.get("_id"))
        u.pop("_id", None)
    return users
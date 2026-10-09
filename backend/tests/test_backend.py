import os
import sys
import asyncio
from pathlib import Path
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(BASE_DIR))
load_dotenv(BASE_DIR / ".env")

from backend.database import check_health, init_databases
from backend import crud, schemas


async def test_database_health():
    init_databases()
    health = await check_health()
    assert health["status"] in ["healthy", "degraded"]
    assert health["mongodb"]["status"] == "connected"
    assert health["neo4j"]["status"] == "connected"
    assert health["neo4j"]["nodes_count"] >= 100


async def test_product_crud_and_sync():
    init_databases()
    # 1. Create unique test product
    test_id = "PROD-TEST-999"
    # Clean up if leftover
    try:
        await crud.delete_product(test_id)
    except Exception:
        pass

    new_prod = schemas.ProductCreate(
        product_id=test_id,
        name="Automated Test Actuator",
        category="Industrial",
        price=199.99,
        stock_quantity=45,
        vendor_id="VEND-8801"
    )
    res = await crud.create_product(new_prod)
    assert res["data"]["product_id"] == test_id
    assert res["cross_db_sync"]["mongodb"] is True
    assert res["cross_db_sync"]["neo4j"] is True

    # 2. Read single product
    fetched = await crud.get_product_by_id(test_id)
    assert fetched["product_id"] == test_id
    assert fetched["name"] == "Automated Test Actuator"

    # 3. Update product
    update_res = await crud.update_product(test_id, schemas.ProductUpdate(price=249.50, stock_quantity=50))
    assert update_res["data"]["price"] == 249.50
    assert update_res["data"]["stock_quantity"] == 50

    # 4. Delete product
    del_res = await crud.delete_product(test_id)
    assert "deleted" in del_res["message"].lower()


async def test_mongodb_aggregations():
    init_databases()
    # 1. Low stock
    low_stock = await crud.get_low_stock_products(threshold=40)
    assert isinstance(low_stock, list)

    # 2. Top sales
    top_sales = await crud.get_sales_analytics(limit=5)
    assert isinstance(top_sales, list)
    assert len(top_sales) > 0
    assert "total_revenue" in top_sales[0]

    # 3. Revenue by category
    cat_rev = await crud.get_revenue_by_category()
    assert isinstance(cat_rev, list)
    assert len(cat_rev) > 0

    # 4. Order status
    ord_status = await crud.get_order_status_distribution()
    assert isinstance(ord_status, list)
    assert len(ord_status) > 0

    # 5. Vendor performance
    vendors = await crud.get_vendor_performance()
    assert isinstance(vendors, list)
    assert len(vendors) > 0

async def test_neo4j_graph_queries():
    init_databases()
    # 1. Graph stats
    stats = await crud.get_graph_stats()
    assert stats["total_nodes"] >= 100
    assert len(stats["nodes_by_label"]) == 5
    assert len(stats["relationships_by_type"]) >= 6

    # 2. Optimal route (Dijkstra)
    route = await crud.get_optimal_shipping_route("WH-01", "ZONE-70001")
    assert route["success"] is True
    assert route["total_hops"] >= 1
    assert route["total_distance_km"] > 0
    assert route["estimated_shipping_cost"] > 0

    # 3. Supplier impact
    impact = await crud.get_supplier_impact("VEND-8801")
    assert impact["supplied_products_count"] > 0
    assert impact["affected_warehouses_count"] > 0

    # 4. Centrality ranking
    centrality = await crud.get_graph_centrality_ranking()
    assert len(centrality) > 0

if __name__ == "__main__":
    async def run_all():
        print("Running tests...")
        await test_database_health()
        print("[OK] test_database_health passed")
        await test_product_crud_and_sync()
        print("[OK] test_product_crud_and_sync passed")
        await test_mongodb_aggregations()
        print("[OK] test_mongodb_aggregations passed")
        await test_neo4j_graph_queries()
        print("[OK] test_neo4j_graph_queries passed")
        print("\n=== ALL BACKEND INTEGRATION TESTS PASSED ===")
    asyncio.run(run_all())

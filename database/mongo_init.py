import os
import datetime
from pymongo import MongoClient, TEXT, ASCENDING
from dotenv import load_dotenv

load_dotenv()

MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017")
DB_NAME = os.getenv("MONGO_DB_NAME", "sutrachain_db")

client = MongoClient(MONGO_URI)
db = client[DB_NAME]

def setup_mongodb():
    print("--- 1. Clearing Existing MongoDB Collections ---")
    for col in ["products", "orders", "vendors", "users", "inventory_logs"]:
        db[col].drop()

    print("--- 2. Creating Database Indexes ---") #
    # Compound Index for Catalog Filtering & Sorting
    db.products.create_index([("category", ASCENDING), ("price", ASCENDING)])
    # Full-Text Search Index for Product Discovery
    db.products.create_index([("name", TEXT), ("specs.color", TEXT)])
    print("✓ Indexes created successfully.")

    print("--- 3. Seeding Sample Documents (50+ Records) ---") #[cite: 1]
    
    # Collection 1: vendors[cite: 1]
    vendors = [
        {"_id": f"VEND-{8801+i}", "business_name": f"Vendor {i+1} Tech", "email": f"contact@vendor{i+1}.com", "verification_status": "VERIFIED", "origin_warehouse_id": f"WH-WEST-0{i%3+1}", "rating": round(4.0 + (i * 0.1) % 1.0, 2)}
        for i in range(10)
    ]
    db.vendors.insert_many(vendors)

    # Collection 2: users[cite: 1]
    users = [
        {"_id": f"USER-{4401+i}", "full_name": f"Customer {i+1}", "email": f"user{i+1}@example.com", "role": "CUSTOMER", "delivery_zone_id": f"ZONE-7000{i%5+1}"}
        for i in range(15)
    ]
    db.users.insert_many(users)

    # Collection 3: products[cite: 1]
    categories = ["Electronics", "Apparel", "Home Appliance", "Groceries"]
    products = [
        {
            "_id": f"PROD-{1020+i}",
            "name": f"Smart Item Model {i+1}",
            "category": categories[i % len(categories)],
            "vendor_id": f"VEND-{8801+(i%10)}",
            "price": round(29.99 + (i * 12.5), 2),
            "stock_quantity": 10 if i % 4 == 0 else 150 + i * 5,  # Creates stock risk items[cite: 1]
            "specs": {"color": "Matte Black" if i % 2 == 0 else "Silver", "warranty_months": 12},
            "created_at": datetime.datetime.now(datetime.timezone.utc).isoformat()
        }
        for i in range(20)
    ]
    db.products.insert_many(products)

    # Collection 4: orders[cite: 1]
    orders = [
        {
            "_id": f"ORD-{9901+i}",
            "customer_id": f"USER-{4401+(i%15)}",
            "order_date": datetime.datetime.now(datetime.timezone.utc).isoformat(),
            "total_amount": round(149.99 + i * 10, 2),
            "status": "IN_TRANSIT" if i % 2 == 0 else "DELIVERED",
            "items": [
                {"product_id": f"PROD-{1020+(i%20)}", "qty": (i % 3) + 1, "unit_price": round(29.99 + ((i%20) * 12.5), 2)}
            ],
            "assigned_route": [f"WH-WEST-0{i%3+1}", "HUB-CENTRAL", "HUB-NORTH", f"ZONE-7000{i%5+1}"]
        }
        for i in range(20)
    ]
    db.orders.insert_many(orders)

    # Collection 5: inventory_logs[cite: 1]
    logs = [
        {
            "_id": f"LOG-882{10+i}",
            "product_id": f"PROD-{1020+(i%20)}",
            "warehouse_id": f"WH-WEST-0{i%3+1}",
            "change_qty": -1,
            "reason": "ORDER CHECKOUT",
            "reference_order_id": f"ORD-{9901+(i%20)}",
            "timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat()
        }
        for i in range(15)
    ]
    db.inventory_logs.insert_many(logs)

    total_docs = sum(db[col].count_documents({}) for col in db.list_collection_names())
    print(f"✓ Total MongoDB documents loaded: {total_docs} across 5 collections.")

if __name__ == "__main__":
    setup_mongodb()
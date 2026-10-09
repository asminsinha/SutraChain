import os
import sys
import datetime
from pathlib import Path
from pymongo import MongoClient, TEXT, ASCENDING
from dotenv import load_dotenv

try:
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')
except Exception:
    pass

BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BASE_DIR / ".env")

MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017")
DB_NAME = os.getenv("MONGO_DB_NAME", "sutrachain_db")

def get_mongo_client():
    return MongoClient(MONGO_URI)

def setup_mongodb(drop_existing: bool = False):
    client = get_mongo_client()
    db = client[DB_NAME]
    
    print(f"Connecting to MongoDB database: {DB_NAME}")
    
    if drop_existing:
        print("--- Clearing Existing Collections for Clean Seed ---")
        for col in ["products", "orders", "vendors", "users", "inventory_logs"]:
            db[col].drop()
    
    print("--- Setting up Indexes ---")
    index_defs = [
        (db.products, [("category", ASCENDING), ("price", ASCENDING)]),
        (db.products, [("name", TEXT), ("specs.color", TEXT)]),
        (db.products, [("vendor_id", ASCENDING)]),
        (db.orders, [("order_date", ASCENDING), ("status", ASCENDING)]),
        (db.orders, [("customer_id", ASCENDING)]),
        (db.inventory_logs, [("timestamp", ASCENDING)]),
        (db.inventory_logs, [("product_id", ASCENDING)])
    ]
    for coll, idx in index_defs:
        try:
            coll.create_index(idx)
        except Exception as e:
            print(f"Index notice for {coll.name}: {e}")
    print("[OK] Indexes verified / created successfully.")

    print("--- Seeding MongoDB Collections (Idempotent Upserts) ---")
    
    # 1. Vendors (20 vendors)
    vendors = [
        {
            "_id": f"VEND-{8801+i}",
            "vendor_id": f"VEND-{8801+i}",
            "business_name": f"Vendor {i+1} " + ["Logistics Tech", "Electronics Co", "Global Supplies", "Apex Industries", "Nexus Components"][i % 5],
            "email": f"contact@vendor{i+1}tech.com",
            "verification_status": "VERIFIED" if i % 6 != 0 else "PENDING",
            "origin_warehouse_id": f"WH-0{ (i % 8) + 1 }",
            "rating": round(4.0 + (i * 0.05) % 0.9, 2),
            "created_at": "2026-01-15T00:00:00Z"
        }
        for i in range(20)
    ]
    for v in vendors:
        db.vendors.update_one({"_id": v["_id"]}, {"$set": v}, upsert=True)
    print(f"[OK] Seeded {len(vendors)} Vendors.")

    # 2. Users (30 customers)
    users = [
        {
            "_id": f"USER-{4401+i}",
            "user_id": f"USER-{4401+i}",
            "full_name": f"Customer {i+1} " + ["Sharma", "Verma", "Patel", "Reddy", "Singh", "Gupta", "Nair", "Das"][i % 8],
            "email": f"customer{i+1}@sutrachain.org",
            "role": "ADMIN" if i == 0 else "CUSTOMER",
            "delivery_zone_id": f"ZONE-700{str((i % 40) + 1).zfill(2)}",
            "created_at": "2026-02-01T00:00:00Z"
        }
        for i in range(30)
    ]
    for u in users:
        db.users.update_one({"_id": u["_id"]}, {"$set": u}, upsert=True)
    print(f"[OK] Seeded {len(users)} Users.")

    # 3. Products (50 products)
    categories = ["Electronics", "Industrial", "Apparel", "Home Appliance", "Automotive", "Medical Devices"]
    products = []
    base_names = [
        "Smart Edge Gateway", "Industrial Sensor Node", "Thermal Relay Switch", "Optic Transceiver",
        "Microcontroller DevKit", "Rugged Tablet Pro", "Servo Motor Controller", "Power Inverter 5kW",
        "Smart Pneumatic Valve", "LiFePO4 Battery Pack", "Precision Multimeter", "IoT Vibration Sensor",
        "Fiber Optic Router", "Embedded GPU Unit", "Pressure Transducer", "Digital Flow Meter",
        "Brushless DC Motor", "Solid State Relay", "High-Torque Actuator", "Signal Isolator module"
    ]
    for i in range(50):
        name = f"{base_names[i % len(base_names)]} v{ (i // len(base_names)) + 1 }.0"
        cat = categories[i % len(categories)]
        vendor_id = f"VEND-{8801 + (i % 20)}"
        price = round(45.0 + (i * 18.75), 2)
        stock = 15 if (i % 5 == 0) else (120 + (i * 8)) # creates distinct low-stock alerts
        prod = {
            "_id": f"PROD-{1020+i}",
            "product_id": f"PROD-{1020+i}",
            "name": name,
            "category": cat,
            "vendor_id": vendor_id,
            "price": price,
            "stock_quantity": stock,
            "stock_level": stock, # compatibility
            "specs": {
                "color": ["Matte Black", "Silver Metallic", "Industrial Gray", "Navy Blue"][i % 4],
                "warranty_months": 12 if i % 2 == 0 else 24,
                "weight_kg": round(0.5 + (i * 0.2), 2),
                "sku": f"SKU-{cat[:3].upper()}-{1020+i}"
            },
            "created_at": (datetime.datetime.now(datetime.timezone.utc) - datetime.timedelta(days=50-i)).isoformat()
        }
        products.append(prod)
        db.products.update_one({"_id": prod["_id"]}, {"$set": prod}, upsert=True)
    print(f"[OK] Seeded {len(products)} Products.")

    # 4. Orders (40 orders with reconciled qty/quantity fields)
    statuses = ["DELIVERED", "IN_TRANSIT", "PROCESSING", "SHIPPED", "PENDING"]
    orders = []
    for i in range(40):
        prod_idx = i % 50
        prod_id = f"PROD-{1020+prod_idx}"
        unit_p = round(45.0 + (prod_idx * 18.75), 2)
        qty = (i % 4) + 1
        ord_doc = {
            "_id": f"ORD-{9901+i}",
            "order_id": f"ORD-{9901+i}",
            "customer_id": f"USER-{4401 + (i % 30)}",
            "order_date": (datetime.datetime.now(datetime.timezone.utc) - datetime.timedelta(days=40-i)).isoformat(),
            "total_amount": round(unit_p * qty + 15.0, 2),
            "status": statuses[i % len(statuses)],
            "items": [
                {
                    "product_id": prod_id,
                    "qty": qty,
                    "quantity": qty, # Normalized for both aggregations
                    "unit_price": unit_p
                }
            ],
            "assigned_route": [
                f"WH-0{(i % 8) + 1}",
                f"HUB-0{(i % 12) + 1}",
                f"ZONE-700{str((i % 40) + 1).zfill(2)}"
            ]
        }
        orders.append(ord_doc)
        db.orders.update_one({"_id": ord_doc["_id"]}, {"$set": ord_doc}, upsert=True)
    print(f"[OK] Seeded {len(orders)} Orders.")

    # 5. Inventory Logs (40 audit logs)
    reasons = ["ORDER CHECKOUT", "RESTOCK RECEIPT", "CYCLE COUNT ADJUSTMENT", "DAMAGED TRANSFER"]
    logs = []
    for i in range(40):
        prod_idx = (i * 3) % 50
        log_doc = {
            "_id": f"LOG-882{str(10+i).zfill(3)}",
            "log_id": f"LOG-882{str(10+i).zfill(3)}",
            "product_id": f"PROD-{1020+prod_idx}",
            "warehouse_id": f"WH-0{(i % 8) + 1}",
            "change_qty": -((i % 3) + 1) if i % 2 == 0 else (50 + i * 5),
            "reason": reasons[i % len(reasons)],
            "reference_order_id": f"ORD-{9901 + (i % 40)}" if i % 2 == 0 else None,
            "timestamp": (datetime.datetime.now(datetime.timezone.utc) - datetime.timedelta(hours=80-i*2)).isoformat()
        }
        logs.append(log_doc)
        db.inventory_logs.update_one({"_id": log_doc["_id"]}, {"$set": log_doc}, upsert=True)
    print(f"[OK] Seeded {len(logs)} Inventory Logs.")

    total_docs = sum(db[col].count_documents({}) for col in ["products", "orders", "vendors", "users", "inventory_logs"])
    print(f"[OK] Completed MongoDB setup! Total documents across 5 collections: {total_docs}")
    client.close()

if __name__ == "__main__":
    setup_mongodb(drop_existing=False)
import os
import sys
from pathlib import Path
from neo4j import GraphDatabase
from dotenv import load_dotenv

try:
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')
except Exception:
    pass

BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BASE_DIR / ".env")

NEO4J_URI = os.getenv("NEO4J_URI", "bolt://localhost:7687")
NEO4J_USER = os.getenv("NEO4J_USER", "neo4j")
NEO4J_PASSWORD = os.getenv("NEO4J_PASSWORD", "password")

def get_neo4j_driver():
    return GraphDatabase.driver(NEO4J_URI, auth=(NEO4J_USER, NEO4J_PASSWORD))

def setup_neo4j(clear_existing: bool = False):
    driver = get_neo4j_driver()
    with driver.session() as session:
        print("=== 1. Checking & Creating Uniqueness Constraints ===")
        labels = ["Supplier", "Product", "Warehouse", "TransitHub", "RetailerZone"]
        for lbl in labels:
            try:
                session.run(f"CREATE CONSTRAINT IF NOT EXISTS FOR (n:{lbl}) REQUIRE n.id IS UNIQUE")
            except Exception as e:
                print(f"Constraint note for {lbl}: {e}")
        print("[OK] Uniqueness constraints verified.")

        if clear_existing:
            print("--- Clearing Existing Graph Nodes & Relationships ---")
            session.run("MATCH (n) DETACH DELETE n")

        print("=== 2. Seeding Nodes using MERGE (130+ Distinct Nodes) ===")

        # A. 20 Suppliers
        suppliers_data = [
            {
                "id": f"VEND-{8801+i}",
                "name": f"Supplier {i+1} " + ["Logistics", "Apex", "Precision", "TechCore", "Nexus"][i % 5],
                "tier": "TIER-1" if i % 3 == 0 else "TIER-2",
                "reliability_score": round(0.85 + (i * 0.007) % 0.14, 2),
                "city": ["Mumbai", "Bengaluru", "Chennai", "Delhi", "Hyderabad", "Pune", "Kolkata", "Ahmedabad"][i % 8]
            }
            for i in range(20)
        ]
        session.run("""
            UNWIND $suppliers AS s
            MERGE (sup:Supplier {id: s.id})
            SET sup.name = s.name,
                sup.tier = s.tier,
                sup.reliability_score = s.reliability_score,
                sup.city = s.city
        """, suppliers=suppliers_data)
        print(f"[OK] Seeded {len(suppliers_data)} Suppliers.")

        # B. 50 Products
        categories = ["Electronics", "Industrial", "Apparel", "Home Appliance", "Automotive", "Medical Devices"]
        base_names = [
            "Smart Edge Gateway", "Industrial Sensor Node", "Thermal Relay Switch", "Optic Transceiver",
            "Microcontroller DevKit", "Rugged Tablet Pro", "Servo Motor Controller", "Power Inverter 5kW",
            "Smart Pneumatic Valve", "LiFePO4 Battery Pack", "Precision Multimeter", "IoT Vibration Sensor",
            "Fiber Optic Router", "Embedded GPU Unit", "Pressure Transducer", "Digital Flow Meter",
            "Brushless DC Motor", "Solid State Relay", "High-Torque Actuator", "Signal Isolator module"
        ]
        products_data = [
            {
                "id": f"PROD-{1020+i}",
                "name": f"{base_names[i % len(base_names)]} v{ (i // len(base_names)) + 1 }.0",
                "category": categories[i % len(categories)],
                "unit_price": round(45.0 + (i * 18.75), 2),
                "fragility": "HIGH" if i % 4 == 0 else "STANDARD"
            }
            for i in range(50)
        ]
        session.run("""
            UNWIND $products AS p
            MERGE (prod:Product {id: p.id})
            SET prod.name = p.name,
                prod.category = p.category,
                prod.unit_price = p.unit_price,
                prod.fragility = p.fragility
        """, products=products_data)
        print(f"[OK] Seeded {len(products_data)} Products.")

        # C. 8 Warehouses
        warehouses_data = [
            {"id": "WH-01", "name": "North Hub Distribution Center", "city": "Delhi NCR", "capacity_sqft": 150000, "region": "North"},
            {"id": "WH-02", "name": "West Coast Gateway Facility", "city": "Mumbai Port", "capacity_sqft": 220000, "region": "West"},
            {"id": "WH-03", "name": "South Peninsular Warehouse", "city": "Bengaluru Tech Park", "capacity_sqft": 180000, "region": "South"},
            {"id": "WH-04", "name": "Eastern Corridor Depot", "city": "Kolkata Hub", "capacity_sqft": 120000, "region": "East"},
            {"id": "WH-05", "name": "Central Plains Fulfillment Center", "city": "Nagpur Logistics Park", "capacity_sqft": 200000, "region": "Central"},
            {"id": "WH-06", "name": "Deccan Mega Storage", "city": "Hyderabad", "capacity_sqft": 160000, "region": "South"},
            {"id": "WH-07", "name": "Western Industrial Warehouse", "city": "Ahmedabad", "capacity_sqft": 140000, "region": "West"},
            {"id": "WH-08", "name": "Southern Maritime Depository", "city": "Chennai Harbor", "capacity_sqft": 190000, "region": "South"}
        ]
        session.run("""
            UNWIND $warehouses AS w
            MERGE (wh:Warehouse {id: w.id})
            SET wh.name = w.name,
                wh.city = w.city,
                wh.capacity_sqft = w.capacity_sqft,
                wh.region = w.region
        """, warehouses=warehouses_data)
        print(f"[OK] Seeded {len(warehouses_data)} Warehouses.")

        # D. 12 Transit Hubs
        transit_hubs_data = [
            {"id": "HUB-01", "name": "Delhi Northern Sortation Hub", "state": "Delhi", "capacity_tpd": 450, "status": "ACTIVE"},
            {"id": "HUB-02", "name": "Jaipur Express Sorting Facility", "state": "Rajasthan", "capacity_tpd": 280, "status": "ACTIVE"},
            {"id": "HUB-03", "name": "Mumbai Western Consolidation Hub", "state": "Maharashtra", "capacity_tpd": 600, "status": "ACTIVE"},
            {"id": "HUB-04", "name": "Pune Industrial Transit Node", "state": "Maharashtra", "capacity_tpd": 320, "status": "ACTIVE"},
            {"id": "HUB-05", "name": "Ahmedabad Logistics Interchange", "state": "Gujarat", "capacity_tpd": 350, "status": "ACTIVE"},
            {"id": "HUB-06", "name": "Bengaluru Southern Core Hub", "state": "Karnataka", "capacity_tpd": 520, "status": "ACTIVE"},
            {"id": "HUB-07", "name": "Hyderabad Central Crossdock", "state": "Telangana", "capacity_tpd": 410, "status": "ACTIVE"},
            {"id": "HUB-08", "name": "Chennai Coastal Relay Depot", "state": "Tamil Nadu", "capacity_tpd": 390, "status": "ACTIVE"},
            {"id": "HUB-09", "name": "Kolkata Eastern Gateway Hub", "state": "West Bengal", "capacity_tpd": 380, "status": "ACTIVE"},
            {"id": "HUB-10", "name": "Nagpur Central Transshipment", "state": "Maharashtra", "capacity_tpd": 550, "status": "ACTIVE"},
            {"id": "HUB-11", "name": "Lucknow North-Central Depot", "state": "Uttar Pradesh", "capacity_tpd": 290, "status": "ACTIVE"},
            {"id": "HUB-12", "name": "Kochi Maritime Logistics Terminal", "state": "Kerala", "capacity_tpd": 240, "status": "ACTIVE"}
        ]
        session.run("""
            UNWIND $hubs AS h
            MERGE (hub:TransitHub {id: h.id})
            SET hub.name = h.name,
                hub.state = h.state,
                hub.capacity_tpd = h.capacity_tpd,
                hub.status = h.status
        """, hubs=transit_hubs_data)
        print(f"[OK] Seeded {len(transit_hubs_data)} Transit Hubs.")

        # E. 40 Retailer Delivery Zones
        zone_cities = [
            "New Delhi Central", "South Delhi Zone", "Gurugram Tech Hub", "Noida Sector 62", "Chandigarh Sector 17",
            "Mumbai South", "Bandra-Kurla Complex", "Navi Mumbai Vashi", "Pune Hinjawadi", "Pune Kothrud",
            "Ahmedabad SG Highway", "Surat Ring Road", "Vadodara Alkapuri", "Indore Vijay Nagar", "Bhopal MP Nagar",
            "Bengaluru Whitefield", "Bengaluru Koramangala", "Bengaluru Electronic City", "Mysuru Central", "Mangaluru Port",
            "Hyderabad Hitec City", "Hyderabad Banjara Hills", "Secunderabad Station", "Visakhapatnam Beach", "Vijayawada Benz Circle",
            "Chennai OMR", "Chennai Anna Nagar", "Coimbatore Gandhipuram", "Madurai Town", "Kochi Marine Drive",
            "Kolkata Salt Lake Sector V", "Kolkata Park Street", "Howrah Terminal", "Bhubaneswar Patia", "Ranchi Main Road",
            "Patna Boring Road", "Lucknow Hazratganj", "Kanpur Mall Road", "Varanasi Cantt", "Jaipur Malviya Nagar"
        ]
        retailer_zones_data = [
            {
                "id": f"ZONE-700{str(i+1).zfill(2)}",
                "name": f"Delivery Zone {i+1} ({zone_cities[i]})",
                "city": zone_cities[i],
                "avg_daily_demand": 120 + (i * 15) % 300,
                "urgency_sla_hours": 4 if i % 3 == 0 else 8
            }
            for i in range(40)
        ]
        session.run("""
            UNWIND $zones AS z
            MERGE (zone:RetailerZone {id: z.id})
            SET zone.name = z.name,
                zone.city = z.city,
                zone.avg_daily_demand = z.avg_daily_demand,
                zone.urgency_sla_hours = z.urgency_sla_hours
        """, zones=retailer_zones_data)
        print(f"[OK] Seeded {len(retailer_zones_data)} Retailer Zones.")

        print("=== 3. Seeding 6 Distinct Relationship Types with MERGE ===")

        # 1. SUPPLIES (Supplier -> Product)
        session.run("""
            UNWIND range(0, 49) AS i
            WITH i, 'VEND-' + toString(8801 + (i % 20)) AS sup_id, 'PROD-' + toString(1020 + i) AS prod_id
            MATCH (s:Supplier {id: sup_id}), (p:Product {id: prod_id})
            MERGE (s)-[r:SUPPLIES]->(p)
            SET r.lead_time_days = 3 + (i % 7),
                r.contract_rate = round(30.0 + (i * 12.0), 2),
                r.quality_grade = 'A'
        """)
        session.run("""
            UNWIND range(0, 19) AS i
            WITH i, 'VEND-' + toString(8801 + ((i + 7) % 20)) AS sup_id, 'PROD-' + toString(1020 + (i * 2)) AS prod_id
            MATCH (s:Supplier {id: sup_id}), (p:Product {id: prod_id})
            MERGE (s)-[r:SUPPLIES]->(p)
            SET r.lead_time_days = 2 + (i % 5),
                r.contract_rate = round(28.0 + (i * 11.5), 2),
                r.quality_grade = 'A+'
        """)
        print("[OK] Created SUPPLIES relationships.")

        # 2. STOCKED_AT (Product -> Warehouse)
        session.run("""
            UNWIND range(0, 49) AS i
            WITH i, 'PROD-' + toString(1020 + i) AS prod_id, 'WH-0' + toString((i % 8) + 1) AS wh_id
            MATCH (p:Product {id: prod_id}), (w:Warehouse {id: wh_id})
            MERGE (p)-[r:STOCKED_AT]->(w)
            SET r.qty = 100 + (i * 14) % 300,
                r.reorder_level = 30,
                r.aisle = 'Aisle-' + toString((i % 12) + 1)
        """)
        session.run("""
            UNWIND range(0, 24) AS i
            WITH i, 'PROD-' + toString(1020 + (i * 2)) AS prod_id, 'WH-0' + toString(((i + 3) % 8) + 1) AS wh_id
            MATCH (p:Product {id: prod_id}), (w:Warehouse {id: wh_id})
            MERGE (p)-[r:STOCKED_AT]->(w)
            SET r.qty = 80 + (i * 10) % 200,
                r.reorder_level = 25,
                r.aisle = 'Buffer-' + toString((i % 6) + 1)
        """)
        print("[OK] Created STOCKED_AT relationships.")

        # 3. CONNECTS_TO (Warehouse -> TransitHub & TransitHub -> TransitHub)
        wh_hub_links = [
            ("WH-01", "HUB-01", 35.0, 1.0, 8.5), ("WH-01", "HUB-02", 280.0, 5.0, 24.0),
            ("WH-02", "HUB-03", 25.0, 0.8, 6.0), ("WH-02", "HUB-04", 150.0, 3.2, 18.0),
            ("WH-03", "HUB-06", 30.0, 0.9, 7.5), ("WH-03", "HUB-08", 340.0, 6.5, 30.0),
            ("WH-04", "HUB-09", 40.0, 1.2, 9.0), ("WH-04", "HUB-10", 650.0, 12.0, 48.0),
            ("WH-05", "HUB-10", 20.0, 0.6, 5.0), ("WH-05", "HUB-07", 500.0, 9.5, 42.0),
            ("WH-06", "HUB-07", 28.0, 0.8, 6.5), ("WH-06", "HUB-06", 570.0, 10.0, 45.0),
            ("WH-07", "HUB-05", 22.0, 0.7, 5.5), ("WH-07", "HUB-03", 520.0, 9.0, 40.0),
            ("WH-08", "HUB-08", 26.0, 0.8, 6.5), ("WH-08", "HUB-12", 680.0, 13.0, 52.0)
        ]
        session.run("""
            UNWIND $links AS l
            MATCH (w:Warehouse {id: l[0]}), (h:TransitHub {id: l[1]})
            MERGE (w)-[r:CONNECTS_TO]->(h)
            SET r.dist_km = l[2],
                r.hours = l[3],
                r.cost = l[4],
                r.status = 'ACTIVE'
        """, links=wh_hub_links)

        hub_corridors = [
            ("HUB-01", "HUB-02", 260.0, 4.5, 22.0), ("HUB-01", "HUB-11", 500.0, 8.0, 38.0),
            ("HUB-02", "HUB-05", 640.0, 11.0, 48.0), ("HUB-03", "HUB-04", 150.0, 2.8, 14.0),
            ("HUB-03", "HUB-05", 520.0, 9.0, 42.0), ("HUB-04", "HUB-06", 840.0, 14.0, 62.0),
            ("HUB-04", "HUB-07", 560.0, 9.5, 44.0), ("HUB-05", "HUB-10", 860.0, 15.0, 65.0),
            ("HUB-06", "HUB-07", 570.0, 9.5, 43.0), ("HUB-06", "HUB-08", 350.0, 6.0, 28.0),
            ("HUB-06", "HUB-12", 540.0, 9.0, 40.0), ("HUB-07", "HUB-08", 630.0, 10.5, 46.0),
            ("HUB-07", "HUB-10", 500.0, 8.5, 38.0), ("HUB-08", "HUB-12", 690.0, 12.0, 50.0),
            ("HUB-09", "HUB-10", 980.0, 17.0, 72.0), ("HUB-09", "HUB-11", 960.0, 16.5, 70.0),
            ("HUB-10", "HUB-01", 1080.0, 18.0, 80.0), ("HUB-10", "HUB-11", 620.0, 10.5, 45.0)
        ]
        session.run("""
            UNWIND $corridors AS c
            MATCH (h1:TransitHub {id: c[0]}), (h2:TransitHub {id: c[1]})
            MERGE (h1)-[r1:CONNECTS_TO]->(h2)
            SET r1.dist_km = c[2], r1.hours = c[3], r1.cost = c[4], r1.status = 'ACTIVE'
            MERGE (h2)-[r2:CONNECTS_TO]->(h1)
            SET r2.dist_km = c[2], r2.hours = c[3], r2.cost = c[4], r2.status = 'ACTIVE'
        """, corridors=hub_corridors)
        print("[OK] Created CONNECTS_TO network corridors.")

        # 4. DELIVERS_TO (TransitHub -> RetailerZone)
        session.run("""
            UNWIND range(0, 39) AS i
            WITH i, 'HUB-0' + toString((i % 12) + 1) AS hub_id, 'ZONE-700' + substring('00' + toString(i + 1), size('00' + toString(i + 1)) - 2) AS zone_id
            MATCH (h:TransitHub {id: hub_id}), (z:RetailerZone {id: zone_id})
            MERGE (h)-[r:DELIVERS_TO]->(z)
            SET r.dist_km = round(15.0 + (i * 3.5) % 45.0, 1),
                r.hours = round(0.5 + (i * 0.1) % 1.5, 1),
                r.cost = round(4.5 + (i * 0.8) % 8.0, 2),
                r.priority = 'STANDARD'
        """)
        session.run("""
            UNWIND range(0, 39) AS i
            WITH i, 'HUB-0' + toString(((i + 5) % 12) + 1) AS hub_id, 'ZONE-700' + substring('00' + toString(i + 1), size('00' + toString(i + 1)) - 2) AS zone_id
            MATCH (h:TransitHub {id: hub_id}), (z:RetailerZone {id: zone_id})
            MERGE (h)-[r:DELIVERS_TO]->(z)
            SET r.dist_km = round(35.0 + (i * 4.0) % 60.0, 1),
                r.hours = round(1.2 + (i * 0.15) % 2.0, 1),
                r.cost = round(7.5 + (i * 1.0) % 12.0, 2),
                r.priority = 'BACKUP'
        """)
        print("[OK] Created DELIVERS_TO last-mile relationships.")

        # 5. SERVES_ZONE (Warehouse -> RetailerZone direct territorial SLA mapping)
        session.run("""
            UNWIND range(0, 39) AS i
            WITH i, 'WH-0' + toString((i % 8) + 1) AS wh_id, 'ZONE-700' + substring('00' + toString(i + 1), size('00' + toString(i + 1)) - 2) AS zone_id
            MATCH (w:Warehouse {id: wh_id}), (z:RetailerZone {id: zone_id})
            MERGE (w)-[r:SERVES_ZONE]->(z)
            SET r.sla_hours = CASE WHEN i % 2 = 0 THEN 24 ELSE 48 END,
                r.freight_tier = 'EXPRESS_REGIONAL',
                r.min_order_value = 500.0
        """)
        print("[OK] Created SERVES_ZONE relationships.")

        # 6. SOURCES_FROM (Warehouse -> Supplier replenishment link)
        session.run("""
            UNWIND range(0, 19) AS i
            WITH i, 'WH-0' + toString((i % 8) + 1) AS wh_id, 'VEND-' + toString(8801 + i) AS sup_id
            MATCH (w:Warehouse {id: wh_id}), (s:Supplier {id: sup_id})
            MERGE (w)-[r:SOURCES_FROM]->(s)
            SET r.lead_time_days = 4 + (i % 6),
                r.reliability_rating = s.reliability_score,
                r.contract_type = 'DIRECT_SUPPLY'
        """)
        print("[OK] Created SOURCES_FROM relationships.")

        # Graph totals verification
        nodes_cnt = session.run("MATCH (n) RETURN count(n) AS c").single()["c"]
        edges_cnt = session.run("MATCH ()-[r]->() RETURN count(r) AS c").single()["c"]
        labels_cnt = session.run("CALL db.labels() YIELD label RETURN count(label) AS c").single()["c"]
        reltypes_cnt = session.run("CALL db.relationshipTypes() YIELD relationshipType RETURN count(relationshipType) AS c").single()["c"]

        print(f"\n=======================================================")
        print(f"[OK] NEO4J GRAPH INITIALIZATION COMPLETE!")
        print(f"[OK] Total Nodes: {nodes_cnt} (Requirement >= 100)")
        print(f"[OK] Total Relationships: {edges_cnt}")
        print(f"[OK] Node Labels ({labels_cnt}): Supplier, Product, Warehouse, TransitHub, RetailerZone")
        print(f"[OK] Relationship Types ({reltypes_cnt}): SUPPLIES, STOCKED_AT, CONNECTS_TO, DELIVERS_TO, SERVES_ZONE, SOURCES_FROM (Requirement >= 6)")
        print(f"=======================================================\n")

    driver.close()

if __name__ == "__main__":
    setup_neo4j(clear_existing=False)
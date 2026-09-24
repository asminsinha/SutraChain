import os
from neo4j import GraphDatabase
from dotenv import load_dotenv

load_dotenv()

NEO4J_URI = os.getenv("NEO4J_URI", "bolt://localhost:7687")
NEO4J_USER = os.getenv("NEO4J_USER", "neo4j")
NEO4J_PASSWORD = os.getenv("NEO4J_PASSWORD", "password")

driver = GraphDatabase.driver(NEO4J_URI, auth=(NEO4J_USER, NEO4J_PASSWORD))

def setup_neo4j():
    with driver.session() as session:
        print("--- 1. Clearing Existing Neo4j Database ---")
        session.run("MATCH (n) DETACH DELETE n")

        print("--- 2. Seeding Node Labels & Relationships (50+ Graph Elements) ---")
        
        # Individual Cypher statements executed sequentially
        statements = [
            # Create Suppliers
            "UNWIND range(0, 9) AS i CREATE (:Supplier {id: 'VEND-' + toString(8801 + i), name: 'Supplier ' + toString(i+1)})",
            
            # Create Products
            "UNWIND range(0, 19) AS i CREATE (:Product {id: 'PROD-' + toString(1020 + i), name: 'Product ' + toString(i+1)})",
            
            # Create Warehouses
            """CREATE (:Warehouse {id: 'WH-WEST-01', name: 'West Regional Warehouse'}),
                      (:Warehouse {id: 'WH-WEST-02', name: 'East Regional Warehouse'}),
                      (:Warehouse {id: 'WH-WEST-03', name: 'South Regional Warehouse'})""",
            
            # Create Transit Hubs
            """CREATE (:TransitHub {id: 'HUB-CENTRAL', name: 'Central Transit Hub', status: 'ACTIVE'}),
                      (:TransitHub {id: 'HUB-NORTH', name: 'North Transit Hub', status: 'ACTIVE'}),
                      (:TransitHub {id: 'HUB-SOUTH', name: 'South Transit Hub', status: 'ACTIVE'}),
                      (:TransitHub {id: 'HUB-EAST', name: 'East Transit Hub', status: 'ACTIVE'})""",
            
            # Create Retailer Delivery Zones
            "UNWIND range(1, 5) AS i CREATE (:RetailerZone {id: 'ZONE-7000' + toString(i), name: 'Delivery Zone ' + toString(i)})",
            
            # Connect Suppliers -> SUPPLIES -> Products
            """MATCH (s:Supplier), (p:Product)
               WHERE p.id = 'PROD-' + toString(1020 + (toInteger(substring(s.id, 5)) % 20))
               CREATE (s)-[:SUPPLIES]->(p)""",
            
            # Connect Products -> STOCKED_AT -> Warehouses
            """MATCH (p:Product), (w:Warehouse)
               WHERE w.id = 'WH-WEST-0' + toString((toInteger(substring(p.id, 5)) % 3) + 1)
               CREATE (p)-[:STOCKED_AT {qty: 200, reorder_level: 50}]->(w)""",
            
            # Connect Warehouses -> CONNECTS_TO -> Transit Hubs
            """MATCH (w:Warehouse {id: 'WH-WEST-01'}), (h:TransitHub {id: 'HUB-CENTRAL'})
               CREATE (w)-[:CONNECTS_TO {dist_km: 120, hours: 2.0, cost: 15.0, status: 'ACTIVE'}]->(h)""",
            
            """MATCH (w:Warehouse {id: 'WH-WEST-02'}), (h:TransitHub {id: 'HUB-EAST'})
               CREATE (w)-[:CONNECTS_TO {dist_km: 80, hours: 1.5, cost: 10.0, status: 'ACTIVE'}]->(h)""",
            
            """MATCH (w:Warehouse {id: 'WH-WEST-03'}), (h:TransitHub {id: 'HUB-SOUTH'})
               CREATE (w)-[:CONNECTS_TO {dist_km: 95, hours: 1.8, cost: 12.0, status: 'ACTIVE'}]->(h)""",
            
            # Interconnect Transit Hubs
            """MATCH (h1:TransitHub {id: 'HUB-CENTRAL'}), (h2:TransitHub {id: 'HUB-NORTH'})
               CREATE (h1)-[:CONNECTS_TO {dist_km: 45, hours: 1.0, cost: 5.0, status: 'ACTIVE'}]->(h2)""",
            
            """MATCH (h1:TransitHub {id: 'HUB-SOUTH'}), (h2:TransitHub {id: 'HUB-NORTH'})
               CREATE (h1)-[:CONNECTS_TO {dist_km: 60, hours: 1.2, cost: 7.0, status: 'ACTIVE'}]->(h2)""",
            
            """MATCH (h1:TransitHub {id: 'HUB-EAST'}), (h2:TransitHub {id: 'HUB-CENTRAL'})
               CREATE (h1)-[:CONNECTS_TO {dist_km: 50, hours: 1.1, cost: 6.0, status: 'ACTIVE'}]->(h2)""",
            
            # Connect Transit Hubs -> DELIVERS_TO -> Retailer Zones
            """MATCH (h:TransitHub {id: 'HUB-NORTH'}), (z:RetailerZone)
               CREATE (h)-[:DELIVERS_TO {hours: 0.5, cost: 3.5}]->(z)"""
        ]

        for stmt in statements:
            session.run(stmt)

        # Count total graph elements
        nodes = session.run("MATCH (n) RETURN count(n) AS c").single()["c"]
        edges = session.run("MATCH ()-[r]->() RETURN count(r) AS c").single()["c"]
        print(f"✓ Total Neo4j Graph elements loaded: {nodes} Nodes, {edges} Relationships.")

if __name__ == "__main__":
    setup_neo4j()
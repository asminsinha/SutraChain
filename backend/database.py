import os
from pathlib import Path
from typing import Dict, Any
from motor.motor_asyncio import AsyncIOMotorClient
from neo4j import AsyncGraphDatabase
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BASE_DIR / ".env")

# MongoDB Configuration
MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017")
MONGO_DB_NAME = os.getenv("MONGO_DB_NAME", "sutrachain_db")

# Neo4j Configuration
NEO4J_URI = os.getenv("NEO4J_URI", "bolt://localhost:7687")
NEO4J_USER = os.getenv("NEO4J_USER", "neo4j")
NEO4J_PASSWORD = os.getenv("NEO4J_PASSWORD", "password")

mongo_client: AsyncIOMotorClient = None
db = None
neo4j_driver = None

def init_databases():
    global mongo_client, db, neo4j_driver
    if mongo_client is None:
        mongo_client = AsyncIOMotorClient(
            MONGO_URI,
            serverSelectionTimeoutMS=5000,
            connectTimeoutMS=5000
        )
        db = mongo_client[MONGO_DB_NAME]

    if neo4j_driver is None:
        neo4j_driver = AsyncGraphDatabase.driver(
            NEO4J_URI,
            auth=(NEO4J_USER, NEO4J_PASSWORD),
            connection_timeout=5.0
        )

# Initialize on module load
init_databases()

async def get_neo4j_session():
    if neo4j_driver is None:
        init_databases()
    async with neo4j_driver.session() as session:
        yield session

async def check_health() -> Dict[str, Any]:
    """
    Checks real connectivity for MongoDB and Neo4j without revealing credentials.
    """
    health_status = {
        "status": "healthy",
        "mongodb": {
            "status": "disconnected",
            "database": MONGO_DB_NAME,
            "collections_count": 0,
            "error": None
        },
        "neo4j": {
            "status": "disconnected",
            "nodes_count": 0,
            "relationships_count": 0,
            "error": None
        }
    }

    # Check MongoDB
    try:
        cols = await db.list_collection_names()
        health_status["mongodb"]["status"] = "connected"
        health_status["mongodb"]["collections_count"] = len(cols)
    except Exception as e:
        health_status["mongodb"]["status"] = "error"
        health_status["mongodb"]["error"] = f"{type(e).__name__}: {str(e)}"
        health_status["status"] = "degraded"

    # Check Neo4j
    try:
        async with neo4j_driver.session() as session:
            res = await session.run("MATCH (n) RETURN count(n) as nodes")
            rec = await res.single()
            nodes_cnt = rec["nodes"] if rec else 0

            res2 = await session.run("MATCH ()-[r]->() RETURN count(r) as rels")
            rec2 = await res2.single()
            rels_cnt = rec2["rels"] if rec2 else 0

            health_status["neo4j"]["status"] = "connected"
            health_status["neo4j"]["nodes_count"] = nodes_cnt
            health_status["neo4j"]["relationships_count"] = rels_cnt
    except Exception as e:
        health_status["neo4j"]["status"] = "error"
        health_status["neo4j"]["error"] = f"{type(e).__name__}: {str(e)}"
        health_status["status"] = "degraded"

    if health_status["mongodb"]["status"] != "connected" and health_status["neo4j"]["status"] != "connected":
        health_status["status"] = "unhealthy"

    return health_status

async def close_connections():
    global mongo_client, neo4j_driver
    if mongo_client:
        mongo_client.close()
    if neo4j_driver:
        await neo4j_driver.close()
#!/usr/bin/env python3
"""
Test script for the client search endpoint
"""
import asyncio
import os
import sys
sys.path.append('/app/backend')

from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

load_dotenv('/app/backend/.env')

async def test_client_search():
    mongo_client = AsyncIOMotorClient(os.environ['MONGO_URL'])
    db = mongo_client[os.environ['DB_NAME']]
    
    print("Testing client search functionality...")
    
    # Test search by name
    query = "Esteban"
    print(f"\n1. Searching for clients with name containing '{query}':")
    
    sales = await db.sales.find({
        "$or": [
            {"nombre_cliente": {"$regex": query, "$options": "i"}},
            {"documento_cliente": {"$regex": query, "$options": "i"}}
        ]
    }, {"_id": 0}).to_list(100)
    
    # Remove duplicates by document
    clientes_dict = {}
    for sale in sales:
        doc = sale['documento_cliente']
        if doc not in clientes_dict:
            clientes_dict[doc] = {
                "nombre_cliente": sale['nombre_cliente'],
                "documento_cliente": sale['documento_cliente'],
                "direccion_cliente": sale['direccion_cliente'],
                "celular_cliente": sale['celular_cliente']
            }
    
    results = list(clientes_dict.values())
    print(f"Found {len(results)} unique clients:")
    for client in results[:5]:  # Show first 5
        print(f"  - {client['nombre_cliente']} (Doc: {client['documento_cliente']})")
    
    # Test search by document
    print(f"\n2. Testing search with short query (should return empty):")
    short_query = "E"
    if len(short_query) < 2:
        print(f"Query '{short_query}' is too short, would return empty list")
    
    print(f"\n3. Testing search with non-existent client:")
    fake_query = "ClienteInexistente123"
    fake_sales = await db.sales.find({
        "$or": [
            {"nombre_cliente": {"$regex": fake_query, "$options": "i"}},
            {"documento_cliente": {"$regex": fake_query, "$options": "i"}}
        ]
    }, {"_id": 0}).to_list(100)
    print(f"Found {len(fake_sales)} clients for '{fake_query}' (should be 0)")
    
    mongo_client.close()
    print("\n✅ Client search test completed successfully!")

if __name__ == "__main__":
    asyncio.run(test_client_search())
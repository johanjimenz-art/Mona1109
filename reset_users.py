#!/usr/bin/env python3
"""
Script para limpiar usuarios y recrear el admin
"""
from motor.motor_asyncio import AsyncIOMotorClient
import asyncio
import os

# MongoDB local
MONGO_URL = "mongodb://localhost:27017"
DB_NAME = "test_database"

async def main():
    print("=" * 60)
    print("RESETEO DE USUARIOS - ClothTrack")
    print("=" * 60)
    print()
    
    # Conectar a MongoDB
    print("📥 Conectando a MongoDB...")
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]
    
    # Limpiar todos los usuarios
    print("🗑️  Eliminando usuarios existentes...")
    result = await db.users.delete_many({})
    print(f"   ✅ {result.deleted_count} usuarios eliminados")
    
    client.close()
    
    print()
    print("=" * 60)
    print("✅ USUARIOS LIMPIADOS")
    print("=" * 60)
    print()
    print("Ahora puedes crear el admin con:")
    print("  python create_admin.py")
    print()

if __name__ == "__main__":
    asyncio.run(main())

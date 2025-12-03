#!/usr/bin/env python3
"""
Script para recrear todos los usuarios con contraseñas
"""
from motor.motor_asyncio import AsyncIOMotorClient
import asyncio
import bcrypt
import json
from datetime import datetime
from zoneinfo import ZoneInfo

# Colombia timezone
COLOMBIA_TZ = ZoneInfo("America/Bogota")

def now_colombia():
    """Get current datetime in Colombia timezone"""
    return datetime.now(COLOMBIA_TZ)

# MongoDB local
MONGO_URL = "mongodb://localhost:27017"
DB_NAME = "test_database"
BACKUP_FILE = "/app/backup_full_20251203_230533.json"

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

async def main():
    print("=" * 60)
    print("RECREACIÓN DE USUARIOS CON CONTRASEÑAS")
    print("=" * 60)
    print()
    
    # Cargar backup para obtener datos de usuarios
    print("📂 Cargando datos de usuarios desde backup...")
    with open(BACKUP_FILE, 'r', encoding='utf-8') as f:
        backup_data = json.load(f)
    
    users_data = backup_data.get('users', [])
    print(f"   ✅ {len(users_data)} usuarios encontrados")
    print()
    
    # Conectar a MongoDB
    print("📥 Conectando a MongoDB...")
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]
    
    # Limpiar usuarios existentes
    print("🗑️  Eliminando usuarios existentes...")
    result = await db.users.delete_many({})
    print(f"   ✅ {result.deleted_count} usuarios eliminados")
    print()
    
    # Contraseña por defecto para todos
    default_password = "Monin1109."
    
    # Recrear cada usuario
    print("👥 Recreando usuarios con contraseñas...")
    for user_data in users_data:
        username = user_data['username']
        
        # Crear nuevo usuario con contraseña
        new_user = {
            'id': user_data['id'],
            'username': username,
            'password_hash': hash_password(default_password),
            'role': user_data.get('role', 'user'),
            'permissions': user_data.get('permissions', {
                'inventario': False,
                'venta': False,
                'despacho': False,
                'descuentos': False
            }),
            'created_by': user_data.get('created_by', 'system'),
            'created_at': user_data.get('created_at', now_colombia().isoformat())
        }
        
        await db.users.insert_one(new_user)
        role_label = "🔑 ADMIN" if new_user['role'] == 'admin' else "👤 Usuario"
        print(f"   ✅ {role_label}: {username}")
    
    client.close()
    
    print()
    print("=" * 60)
    print("✅ USUARIOS RECREADOS EXITOSAMENTE")
    print("=" * 60)
    print()
    print("🔐 Credenciales para TODOS los usuarios:")
    print(f"   Contraseña: {default_password}")
    print()
    print("📋 Lista de usuarios:")
    for user_data in users_data:
        role = "ADMIN" if user_data.get('role') == 'admin' else "Usuario"
        print(f"   - {user_data['username']} ({role})")
    print()
    print("🎉 Ya puedes iniciar sesión!")
    print()

if __name__ == "__main__":
    asyncio.run(main())

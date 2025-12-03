#!/usr/bin/env python3
"""
Script para importar datos desde el archivo de backup
"""
import json
from motor.motor_asyncio import AsyncIOMotorClient
import asyncio
import os

# MongoDB local
MONGO_URL = "mongodb://localhost:27017"
DB_NAME = "test_database"
BACKUP_FILE = "/app/backup_data_20251016_154603.json"

async def main():
    print("=" * 60)
    print("IMPORTACIÓN DE DATOS DESDE BACKUP - ClothTrack")
    print("=" * 60)
    print()
    
    # 1. Cargar backup
    print(f"📂 Cargando backup desde: {BACKUP_FILE}")
    try:
        with open(BACKUP_FILE, 'r', encoding='utf-8') as f:
            exported_data = json.load(f)
        print("✅ Backup cargado exitosamente")
        print()
    except Exception as e:
        print(f"❌ Error cargando backup: {e}")
        return
    
    # 2. Conectar a MongoDB local
    print("📥 Conectando a MongoDB local...")
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]
    print("✅ Conexión establecida")
    print()
    
    # 3. Importar datos
    # Importar usuarios
    if 'users' in exported_data and exported_data['users']:
        print(f"👥 Importando {len(exported_data['users'])} usuarios...")
        # Limpiar colección existente
        await db.users.delete_many({})
        # Insertar usuarios
        for user in exported_data['users']:
            await db.users.insert_one(user)
        print(f"   ✅ {len(exported_data['users'])} usuarios importados")
    else:
        print("⚠️  No hay usuarios para importar")
    
    # Importar productos
    if 'products' in exported_data and exported_data['products']:
        print(f"📦 Importando {len(exported_data['products'])} productos...")
        await db.products.delete_many({})
        for product in exported_data['products']:
            await db.products.insert_one(product)
        print(f"   ✅ {len(exported_data['products'])} productos importados")
    else:
        print("⚠️  No hay productos para importar")
    
    # Importar ventas
    if 'sales' in exported_data and exported_data['sales']:
        print(f("🛒 Importando {len(exported_data['sales'])} ventas...")
        await db.sales.delete_many({})
        for sale in exported_data['sales']:
            await db.sales.insert_one(sale)
        print(f"   ✅ {len(exported_data['sales'])} ventas importadas")
    else:
        print("⚠️  No hay ventas para importar")
    
    # Importar notificaciones
    if 'notifications' in exported_data and exported_data['notifications']:
        print(f"🔔 Importando {len(exported_data['notifications'])} notificaciones...")
        await db.notifications.delete_many({})
        for notif in exported_data['notifications']:
            await db.notifications.insert_one(notif)
        print(f"   ✅ {len(exported_data['notifications'])} notificaciones importadas")
    else:
        print("⚠️  No hay notificaciones para importar")
    
    # Importar ventas a crédito si existen
    if 'credit_sales' in exported_data and exported_data['credit_sales']:
        print(f"💳 Importando {len(exported_data['credit_sales'])} ventas a crédito...")
        await db.credit_sales.delete_many({})
        for credit in exported_data['credit_sales']:
            await db.credit_sales.insert_one(credit)
        print(f"   ✅ {len(exported_data['credit_sales'])} ventas a crédito importadas")
    
    # Importar pagos si existen
    if 'payments' in exported_data and exported_data['payments']:
        print(f"💰 Importando {len(exported_data['payments'])} pagos...")
        await db.payments.delete_many({})
        for payment in exported_data['payments']:
            await db.payments.insert_one(payment)
        print(f"   ✅ {len(exported_data['payments'])} pagos importados")
    
    client.close()
    
    print()
    print("=" * 60)
    print("✅ IMPORTACIÓN COMPLETADA EXITOSAMENTE")
    print("=" * 60)
    print()
    print("📊 RESUMEN:")
    print(f"   - Usuarios: {len(exported_data.get('users', []))}")
    print(f"   - Productos: {len(exported_data.get('products', []))}")
    print(f"   - Ventas: {len(exported_data.get('sales', []))}")
    print(f"   - Notificaciones: {len(exported_data.get('notifications', []))}")
    print(f"   - Ventas a crédito: {len(exported_data.get('credit_sales', []))}")
    print(f"   - Pagos: {len(exported_data.get('payments', []))}")
    print()
    print("🎉 Todos los datos han sido restaurados!")
    print("🔑 Puedes iniciar sesión con: SEBASTIAN MONA / Monin1109")
    print()

if __name__ == "__main__":
    asyncio.run(main())

#!/usr/bin/env python3
"""
Script para migrar datos desde producción a local
"""
import requests
import json
from motor.motor_asyncio import AsyncIOMotorClient
import asyncio
import os
from datetime import datetime

# Configuración
PROD_URL = "https://pos-system-56.preview.emergentagent.com/api"
USERNAME = "SEBASTIAN MONA"
PASSWORD = "Monin1109."

# MongoDB local
MONGO_URL = "mongodb://localhost:27017"
DB_NAME = "test_database"

async def main():
    print("=" * 60)
    print("MIGRACIÓN DE DATOS - ClothTrack")
    print("=" * 60)
    print()
    
    # 1. Login en producción
    print("📡 Conectando a producción...")
    try:
        login_response = requests.post(
            f"{PROD_URL}/auth/login",
            json={"username": USERNAME, "password": PASSWORD},
            timeout=10
        )
        
        if login_response.status_code != 200:
            print(f"❌ Error en login: {login_response.status_code}")
            print(f"   Respuesta: {login_response.text}")
            return
        
        token = login_response.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}
        print("✅ Login exitoso")
        print()
    except Exception as e:
        print(f"❌ Error conectando a producción: {e}")
        return
    
    # 2. Exportar datos desde producción
    exported_data = {}
    
    # Exportar usuarios
    print("👥 Exportando usuarios...")
    try:
        response = requests.get(f"{PROD_URL}/users", headers=headers, timeout=10)
        if response.status_code == 200:
            exported_data['users'] = response.json()
            print(f"   ✅ {len(exported_data['users'])} usuarios exportados")
        else:
            print(f"   ⚠️  No se pudieron exportar usuarios (código {response.status_code})")
            exported_data['users'] = []
    except Exception as e:
        print(f"   ❌ Error exportando usuarios: {e}")
        exported_data['users'] = []
    
    # Exportar productos
    print("📦 Exportando productos...")
    try:
        response = requests.get(f"{PROD_URL}/products", headers=headers, timeout=10)
        if response.status_code == 200:
            exported_data['products'] = response.json()
            print(f"   ✅ {len(exported_data['products'])} productos exportados")
        else:
            print(f"   ⚠️  No se pudieron exportar productos (código {response.status_code})")
            exported_data['products'] = []
    except Exception as e:
        print(f"   ❌ Error exportando productos: {e}")
        exported_data['products'] = []
    
    # Exportar ventas
    print("🛒 Exportando ventas...")
    try:
        response = requests.get(f"{PROD_URL}/sales", headers=headers, timeout=10)
        if response.status_code == 200:
            exported_data['sales'] = response.json()
            print(f"   ✅ {len(exported_data['sales'])} ventas exportadas")
        else:
            print(f"   ⚠️  No se pudieron exportar ventas (código {response.status_code})")
            exported_data['sales'] = []
    except Exception as e:
        print(f"   ❌ Error exportando ventas: {e}")
        exported_data['sales'] = []
    
    # Exportar notificaciones
    print("🔔 Exportando notificaciones...")
    try:
        response = requests.get(f"{PROD_URL}/notifications", headers=headers, timeout=10)
        if response.status_code == 200:
            exported_data['notifications'] = response.json()
            print(f"   ✅ {len(exported_data['notifications'])} notificaciones exportadas")
        else:
            print(f"   ⚠️  No se pudieron exportar notificaciones (código {response.status_code})")
            exported_data['notifications'] = []
    except Exception as e:
        print(f"   ❌ Error exportando notificaciones: {e}")
        exported_data['notifications'] = []
    
    print()
    
    # 3. Guardar backup
    backup_file = f"/app/backup_data_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
    print(f"💾 Guardando backup en: {backup_file}")
    with open(backup_file, 'w', encoding='utf-8') as f:
        json.dump(exported_data, f, indent=2, ensure_ascii=False, default=str)
    print(f"   ✅ Backup guardado")
    print()
    
    # 4. Importar a MongoDB local
    print("📥 Importando datos a MongoDB local...")
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]
    
    # Importar usuarios
    if exported_data['users']:
        print(f"   Importando {len(exported_data['users'])} usuarios...")
        # Limpiar colección existente
        await db.users.delete_many({})
        # Insertar usuarios
        for user in exported_data['users']:
            # Convertir datetime strings a formato ISO
            if isinstance(user.get('created_at'), str):
                user['created_at'] = user['created_at']
            await db.users.insert_one(user)
        print(f"   ✅ Usuarios importados")
    
    # Importar productos
    if exported_data['products']:
        print(f"   Importando {len(exported_data['products'])} productos...")
        await db.products.delete_many({})
        for product in exported_data['products']:
            if isinstance(product.get('created_at'), str):
                product['created_at'] = product['created_at']
            await db.products.insert_one(product)
        print(f"   ✅ Productos importados")
    
    # Importar ventas
    if exported_data['sales']:
        print(f"   Importando {len(exported_data['sales'])} ventas...")
        await db.sales.delete_many({})
        for sale in exported_data['sales']:
            if isinstance(sale.get('created_at'), str):
                sale['created_at'] = sale['created_at']
            if isinstance(sale.get('updated_at'), str):
                sale['updated_at'] = sale['updated_at']
            await db.sales.insert_one(sale)
        print(f"   ✅ Ventas importadas")
    
    # Importar notificaciones
    if exported_data['notifications']:
        print(f"   Importando {len(exported_data['notifications'])} notificaciones...")
        await db.notifications.delete_many({})
        for notif in exported_data['notifications']:
            if isinstance(notif.get('created_at'), str):
                notif['created_at'] = notif['created_at']
            await db.notifications.insert_one(notif)
        print(f"   ✅ Notificaciones importadas")
    
    client.close()
    
    print()
    print("=" * 60)
    print("✅ MIGRACIÓN COMPLETADA EXITOSAMENTE")
    print("=" * 60)
    print()
    print("📊 RESUMEN:")
    print(f"   - Usuarios: {len(exported_data['users'])}")
    print(f"   - Productos: {len(exported_data['products'])}")
    print(f"   - Ventas: {len(exported_data['sales'])}")
    print(f"   - Notificaciones: {len(exported_data['notifications'])}")
    print()
    print(f"   Backup guardado en: {backup_file}")
    print()
    print("🎉 Puedes iniciar sesión con tus credenciales existentes!")
    print()

if __name__ == "__main__":
    asyncio.run(main())

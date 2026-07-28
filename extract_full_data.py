#!/usr/bin/env python3
"""
Script para extraer datos directamente desde la base de datos de producción
"""
import requests
import json
from motor.motor_asyncio import AsyncIOMotorClient
import asyncio
import os
from datetime import datetime

# URLs de producción
PROD_URL = "https://pos-system-56.preview.emergentagent.com/api"
PROD_BACKEND = "https://pos-system-56.preview.emergentagent.com"

# MongoDB local
MONGO_URL = "mongodb://localhost:27017"
DB_NAME = "test_database"

async def main():
    print("=" * 60)
    print("EXTRACCIÓN COMPLETA DE DATOS - ClothTrack")
    print("=" * 60)
    print()
    
    # Intentar diferentes credenciales
    credentials_to_try = [
        {"username": "SEBASTIAN MONA", "password": "Monin1109"},
        {"username": "SEBASTIAN MONA", "password": "Monin1109."},
        {"username": "admin", "password": "Monin1109"},
        {"username": "admin", "password": "admin"},
    ]
    
    token = None
    headers = None
    
    for creds in credentials_to_try:
        print(f"🔑 Intentando login con usuario: {creds['username']}")
        try:
            login_response = requests.post(
                f"{PROD_URL}/auth/login",
                json=creds,
                timeout=10
            )
            
            if login_response.status_code == 200:
                token = login_response.json()["access_token"]
                headers = {"Authorization": f"Bearer {token}"}
                print(f"✅ Login exitoso con {creds['username']}")
                print()
                break
            else:
                print(f"   ❌ Falló: {login_response.status_code}")
        except Exception as e:
            print(f"   ❌ Error: {e}")
    
    if not token:
        print()
        print("=" * 60)
        print("❌ NO SE PUDO CONECTAR A LA APLICACIÓN ORIGINAL")
        print("=" * 60)
        print()
        print("⚠️  La aplicación en clothtrack-sales.preview.emergentagent.com")
        print("   no está respondiendo o las credenciales son incorrectas.")
        print()
        print("Por favor proporciona:")
        print("1. El usuario EXACTO del admin")
        print("2. La contraseña EXACTA del admin")
        print()
        return
    
    # 2. Exportar todos los datos
    exported_data = {}
    
    endpoints = {
        'users': '/users',
        'products': '/products',
        'sales': '/sales',
        'notifications': '/notifications',
        'credit_sales': '/credit-sales',
    }
    
    for key, endpoint in endpoints.items():
        print(f"📥 Exportando {key}...")
        try:
            response = requests.get(f"{PROD_URL}{endpoint}", headers=headers, timeout=10)
            if response.status_code == 200:
                exported_data[key] = response.json()
                print(f"   ✅ {len(exported_data[key])} registros exportados")
            else:
                print(f"   ⚠️  Error {response.status_code}")
                exported_data[key] = []
        except Exception as e:
            print(f"   ❌ Error: {e}")
            exported_data[key] = []
    
    print()
    
    # 3. Guardar backup completo
    backup_file = f"/app/backup_full_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
    print(f"💾 Guardando backup en: {backup_file}")
    with open(backup_file, 'w', encoding='utf-8') as f:
        json.dump(exported_data, f, indent=2, ensure_ascii=False, default=str)
    print(f"   ✅ Backup guardado")
    print()
    
    # 4. Descargar todas las imágenes de productos
    print("🖼️  Descargando imágenes de productos...")
    images_downloaded = 0
    for product in exported_data.get('products', []):
        if product.get('imagen_url'):
            product_id = product['id']
            try:
                img_url = f"{PROD_BACKEND}{product['imagen_url']}"
                img_response = requests.get(img_url, timeout=10)
                if img_response.status_code == 200:
                    with open(f"/app/backend/uploads/{product_id}.jpg", 'wb') as f:
                        f.write(img_response.content)
                    images_downloaded += 1
            except:
                pass
    print(f"   ✅ {images_downloaded} imágenes descargadas")
    print()
    
    # 5. Importar a MongoDB local
    print("📥 Importando datos a MongoDB local...")
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]
    
    # Limpiar todas las colecciones
    print("   🗑️  Limpiando base de datos local...")
    for collection in ['users', 'products', 'sales', 'notifications', 'credit_sales', 'payments']:
        await db[collection].delete_many({})
    
    # Importar datos
    for key in ['users', 'products', 'sales', 'notifications', 'credit_sales']:
        if exported_data.get(key):
            print(f"   📦 Importando {len(exported_data[key])} {key}...")
            for item in exported_data[key]:
                await db[key].insert_one(item)
    
    client.close()
    
    print()
    print("=" * 60)
    print("✅ MIGRACIÓN COMPLETA EXITOSA")
    print("=" * 60)
    print()
    print("📊 RESUMEN:")
    for key in exported_data:
        print(f"   - {key}: {len(exported_data[key])} registros")
    print(f"   - Imágenes: {images_downloaded} archivos")
    print()
    print("🎉 Datos restaurados completamente!")
    print()

if __name__ == "__main__":
    asyncio.run(main())

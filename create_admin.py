#!/usr/bin/env python3
"""
Script para crear el usuario admin inicial
"""
import requests
import json

API_URL = "http://localhost:8001/api"

def main():
    print("=" * 60)
    print("CREACIÓN DE USUARIO ADMINISTRADOR - ClothTrack")
    print("=" * 60)
    print()
    
    # Datos del admin
    username = "SEBASTIAN MONA"
    password = "Monin1109"
    
    print(f"👤 Creando usuario administrador: {username}")
    print()
    
    # Crear admin
    try:
        response = requests.post(
            f"{API_URL}/auth/setup-admin",
            json={
                "username": username,
                "password": password
            },
            timeout=10
        )
        
        if response.status_code == 200:
            data = response.json()
            print("✅ Usuario administrador creado exitosamente!")
            print()
            print(f"   Usuario: {data['username']}")
            print(f"   Rol: {data['role']}")
            print(f"   Token: {data['access_token'][:50]}...")
            print()
            print("🎉 Ya puedes iniciar sesión con estas credenciales!")
        else:
            print(f"❌ Error al crear admin: {response.status_code}")
            print(f"   Respuesta: {response.text}")
            
            # Si el admin ya existe, intentar login
            if "already exists" in response.text.lower():
                print()
                print("ℹ️  El admin ya existe. Intentando login...")
                login_response = requests.post(
                    f"{API_URL}/auth/login",
                    json={
                        "username": username,
                        "password": password
                    },
                    timeout=10
                )
                
                if login_response.status_code == 200:
                    print("✅ Login exitoso!")
                    print()
                    data = login_response.json()
                    print(f"   Usuario: {data['username']}")
                    print(f"   Rol: {data['role']}")
                else:
                    print(f"❌ Error en login: {login_response.status_code}")
                    print(f"   Respuesta: {login_response.text}")
    except Exception as e:
        print(f"❌ Error: {e}")
    
    print()
    print("=" * 60)

if __name__ == "__main__":
    main()

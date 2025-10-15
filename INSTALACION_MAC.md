# Cloth ON-OF - Sistema de Gestión de Inventario

## Instalación en Mac

### Requisitos Previos

1. **Python 3.9 o superior**
   ```bash
   # Verificar versión de Python
   python3 --version
   ```

2. **Node.js 16 o superior y Yarn**
   ```bash
   # Verificar versión de Node.js
   node --version
   
   # Instalar Yarn si no lo tienes
   npm install -g yarn
   ```

3. **MongoDB**
   ```bash
   # Instalar MongoDB usando Homebrew
   brew tap mongodb/brew
   brew install mongodb-community
   
   # Iniciar MongoDB
   brew services start mongodb-community
   ```

### Pasos de Instalación

#### 1. Descargar el Proyecto

Descarga o clona el proyecto en tu Mac.

#### 2. Configurar el Backend

```bash
# Ir al directorio backend
cd backend

# Crear entorno virtual de Python
python3 -m venv venv

# Activar entorno virtual
source venv/bin/activate

# Instalar dependencias
pip install -r requirements.txt

# Verificar archivo .env
# Asegúrate que backend/.env contenga:
# MONGO_URL="mongodb://localhost:27017"
# DB_NAME="cloth_onof_db"
# CORS_ORIGINS="http://localhost:3000"
# JWT_SECRET_KEY="tu-clave-secreta-segura"
```

#### 3. Configurar el Frontend

```bash
# Ir al directorio frontend
cd ../frontend

# Instalar dependencias
yarn install

# Actualizar archivo .env
# Asegúrate que frontend/.env contenga:
# REACT_APP_BACKEND_URL=http://localhost:8001
```

### Ejecutar la Aplicación

#### Opción 1: Ejecutar Backend y Frontend por separado

**Terminal 1 - Backend:**
```bash
cd backend
source venv/bin/activate
uvicorn server:app --host 0.0.0.0 --port 8001 --reload
```

**Terminal 2 - Frontend:**
```bash
cd frontend
yarn start
```

La aplicación estará disponible en: **http://localhost:3000**

#### Opción 2: Script de Inicio Automático

Crea un archivo `start.sh` en la raíz del proyecto:

```bash
#!/bin/bash

# Iniciar MongoDB si no está corriendo
brew services start mongodb-community

# Iniciar Backend
cd backend
source venv/bin/activate
uvicorn server:app --host 0.0.0.0 --port 8001 --reload &
BACKEND_PID=$!

# Iniciar Frontend
cd ../frontend
yarn start &
FRONTEND_PID=$!

echo "Backend PID: $BACKEND_PID"
echo "Frontend PID: $FRONTEND_PID"
echo "Aplicación iniciada en http://localhost:3000"

# Esperar a que el usuario presione Ctrl+C
trap "kill $BACKEND_PID $FRONTEND_PID; exit" INT
wait
```

Hacer el script ejecutable:
```bash
chmod +x start.sh
./start.sh
```

### Detener la Aplicación

Presiona `Ctrl+C` en cada terminal donde se ejecutan los servicios.

Para detener MongoDB:
```bash
brew services stop mongodb-community
```

## Uso de la Aplicación

1. **Registro/Login**: Crea una cuenta con usuario y contraseña
2. **Dashboard**: Visualiza estadísticas de inventario y ventas
3. **Inventario**: Gestiona productos (agregar, editar, eliminar)
4. **Ventas**: Realiza ventas con carrito de compras
5. **Historial**: Revisa todas las ventas realizadas

## Funcionalidades

### Gestión de Inventario
- Descripción de producto
- Referencia única
- Color
- Costo de fabricación
- Talla
- Precio de venta
- Cantidad en stock

### Sistema de Ventas
- Datos del cliente (nombre, documento, dirección, celular)
- Búsqueda de productos por referencia, talla y color
- Carrito de compras
- Validación de stock
- Resta automática de inventario

### Reportes
- Total de productos
- Total de ventas
- Ingresos totales
- Valor del stock
- Historial detallado de ventas

## Solución de Problemas

### MongoDB no se conecta
```bash
# Verificar que MongoDB esté corriendo
brew services list

# Reiniciar MongoDB
brew services restart mongodb-community
```

### Puerto ya en uso
```bash
# Verificar procesos en puerto 8001 o 3000
lsof -i :8001
lsof -i :3000

# Matar proceso si es necesario
kill -9 <PID>
```

### Error de dependencias
```bash
# Reinstalar dependencias backend
cd backend
pip install -r requirements.txt --force-reinstall

# Reinstalar dependencias frontend
cd frontend
rm -rf node_modules
yarn install
```

## Backup de Datos

Para hacer backup de tu base de datos:

```bash
# Exportar base de datos
mongodump --db cloth_onof_db --out ./backup

# Restaurar base de datos
mongorestore --db cloth_onof_db ./backup/cloth_onof_db
```

## Soporte

Para cualquier problema o pregunta sobre la instalación, consulta la documentación o contacta al equipo técnico.

---

**Cloth ON-OF** - Sistema de Gestión de Inventario Interno

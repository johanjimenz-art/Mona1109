# Cloth ON-OF - Guía de Instalación Simplificada para Mac

## 📋 ¿Qué necesitas antes de empezar?

Esta aplicación necesita 3 programas instalados en tu Mac:
1. **Homebrew** - Para instalar otros programas fácilmente
2. **Python** - Para el servidor de la aplicación
3. **Node.js** - Para la interfaz visual
4. **MongoDB** - Para guardar los datos

---

## 🚀 PASO 1: Instalar Homebrew (si no lo tienes)

1. Abre la aplicación **Terminal** en tu Mac:
   - Ve a: **Aplicaciones → Utilidades → Terminal**
   - O busca "Terminal" en Spotlight (Cmd + Espacio)

2. Copia y pega este comando en la Terminal y presiona Enter:
```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

3. Sigue las instrucciones que aparecen en pantalla (puede pedirte tu contraseña de Mac)

4. Espera a que termine la instalación (puede tomar varios minutos)

---

## 🐍 PASO 2: Instalar Python

1. En la Terminal, escribe:
```bash
brew install python@3.11
```

2. Presiona Enter y espera a que termine

3. Verifica que se instaló correctamente escribiendo:
```bash
python3 --version
```

Deberías ver algo como: `Python 3.11.x`

---

## 📦 PASO 3: Instalar Node.js y Yarn

1. En la Terminal, escribe:
```bash
brew install node
```

2. Presiona Enter y espera

3. Luego instala Yarn escribiendo:
```bash
npm install -g yarn
```

4. Verifica escribiendo:
```bash
node --version
yarn --version
```

---

## 💾 PASO 4: Instalar MongoDB (Base de datos)

1. En la Terminal, escribe estos comandos UNO POR UNO:

```bash
brew tap mongodb/brew
```
Presiona Enter, espera a que termine.

```bash
brew install mongodb-community
```
Presiona Enter, espera a que termine.

```bash
brew services start mongodb-community
```
Presiona Enter. ¡MongoDB ya está corriendo!

---

## 📁 PASO 5: Preparar la Aplicación

1. **Descarga** la carpeta de la aplicación en tu Mac (donde quieras, por ejemplo en Documentos)

2. En Terminal, ve a esa carpeta. Por ejemplo, si la pusiste en Documentos:
```bash
cd ~/Documents/cloth-onof
```
(Reemplaza "cloth-onof" con el nombre de tu carpeta)

---

## ⚙️ PASO 6: Configurar el Backend (Servidor)

1. Ve a la carpeta backend:
```bash
cd backend
```

2. Crea un entorno para Python:
```bash
python3 -m venv venv
```

3. Actívalo:
```bash
source venv/bin/activate
```
Verás `(venv)` al inicio de tu línea en Terminal

4. Instala las dependencias:
```bash
pip install -r requirements.txt
```
Espera a que termine (puede tomar varios minutos)

5. Edita el archivo de configuración:
```bash
nano .env
```

6. Asegúrate que tenga esto (usa las flechas para moverte, edita lo necesario):
```
MONGO_URL="mongodb://localhost:27017"
DB_NAME="cloth_onof_db"
CORS_ORIGINS="http://localhost:3000"
JWT_SECRET_KEY="miClaveSecreta123"
```

7. Guarda y sal: presiona `Ctrl + X`, luego `Y`, luego `Enter`

---

## 🎨 PASO 7: Configurar el Frontend (Interfaz)

1. Sal de la carpeta backend y ve a frontend:
```bash
cd ../frontend
```

2. Instala las dependencias:
```bash
yarn install
```
Espera a que termine (puede tomar varios minutos)

3. Edita el archivo de configuración:
```bash
nano .env
```

4. Asegúrate que tenga:
```
REACT_APP_BACKEND_URL=http://localhost:8001
```

5. Guarda y sal: `Ctrl + X`, luego `Y`, luego `Enter`

---

## ▶️ PASO 8: Iniciar la Aplicación

**Necesitarás abrir 2 ventanas de Terminal:**

### Terminal 1 - Iniciar el Backend:

1. Ve a la carpeta backend:
```bash
cd ~/Documents/cloth-onof/backend
```
(Ajusta la ruta según donde pusiste la aplicación)

2. Activa el entorno:
```bash
source venv/bin/activate
```

3. Inicia el servidor:
```bash
uvicorn server:app --host 0.0.0.0 --port 8001 --reload
```

Verás mensajes que indican que el servidor está corriendo. **NO CIERRES ESTA VENTANA**

### Terminal 2 - Iniciar el Frontend:

1. Abre una NUEVA ventana de Terminal (Cmd + N)

2. Ve a la carpeta frontend:
```bash
cd ~/Documents/cloth-onof/frontend
```

3. Inicia la interfaz:
```bash
yarn start
```

En unos segundos se abrirá automáticamente tu navegador con la aplicación en:
**http://localhost:3000**

**NO CIERRES ESTA VENTANA**

---

## 🎉 ¡Listo! Ya puedes usar la aplicación

- Se abrirá en tu navegador automáticamente
- Crea tu primera cuenta con usuario y contraseña
- Empieza a gestionar tu inventario

---

## 🛑 Para CERRAR la aplicación

1. En cada ventana de Terminal presiona: `Ctrl + C`
2. Cierra las ventanas de Terminal

---

## 🔄 Para usar la aplicación OTRO DÍA

Solo necesitas repetir el PASO 8:
- Abrir 2 Terminales
- Iniciar Backend en una
- Iniciar Frontend en otra
- ¡Listo!

---

## ❓ ¿Problemas?

### "No se puede conectar a la base de datos"
```bash
brew services restart mongodb-community
```

### "Puerto ya en uso"
Cierra todas las ventanas de Terminal y vuelve a intentar

### "Comando no encontrado"
Verifica que instalaste todo en los PASOS 1-4

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

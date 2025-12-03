# 📄 Sistema de Facturas y Búsqueda Implementado

## ✅ Características Implementadas

### 🎯 Sistema de Numeración de Facturas

**Backend:**
- ✅ Campo `numero_factura` en cada venta
- ✅ Generación automática con formato: **FAC-YYYYMMDD-XXXX**
- ✅ Ejemplos: FAC-20251016-0001, FAC-20251016-0002, etc.
- ✅ Número secuencial por día

**Frontend:**
- ✅ Muestra número de factura en cada venta
- ✅ Color azul destacado para fácil identificación

---

### 🔍 Sistema de Búsqueda Avanzada

**Filtros disponibles:**
1. **Por Nombre:** Busca en nombre del cliente
2. **Por Cédula:** Busca por documento
3. **Por Factura:** Busca por número de factura (FAC-20251016-0001)

**Características:**
- ✅ Búsqueda en tiempo real
- ✅ No distingue mayúsculas/minúsculas
- ✅ Muestra contador de resultados
- ✅ Mensaje claro cuando no hay resultados

---

### 📥 Generación de Facturas PDF

**Formato:**
- ✅ **Vertical** (no muy ancho) - A4 Portrait
- ✅ **Logo ON-OF** en el header (centrado)
- ✅ Diseño profesional y limpio

**Contenido del PDF:**

```
┌─────────────────────────────────┐
│      [LOGO ON-OF]               │
│                                 │
│    FACTURA DE VENTA             │
│    Número: FAC-20251016-0001    │
│    Fecha: 16/10/2025 14:30      │
│                                 │
│  ┌─────────────────────────┐   │
│  │ DATOS DEL CLIENTE       │   │
│  │ Nombre: Juan Pérez      │   │
│  │ Documento: 1234567890   │   │
│  │ Dirección: Calle 123    │   │
│  └─────────────────────────┘   │
│                                 │
│  DETALLE DE PRODUCTOS           │
│  ┌────────────────────────────┐│
│  │Ref│Desc│Talla│Cant│Precio││
│  ├────────────────────────────┤│
│  │123│Cam.│  M  │ 2  │$50,000││
│  │456│Pant│  L  │ 1  │$70,000││
│  └────────────────────────────┘│
│                                 │
│              ┌──────────────┐   │
│              │Subtotal: $... │   │
│              │Descuento: -$..│   │
│              │TOTAL: $120,000│   │
│              └──────────────┘   │
│                                 │
│  Gracias por su compra          │
│  Cloth ON-OF                    │
└─────────────────────────────────┘
```

**Detalles incluidos:**
- ✅ Logo en header
- ✅ Número de factura destacado
- ✅ Fecha y hora de venta
- ✅ Datos completos del cliente
- ✅ Tabla de productos con:
  - Referencia
  - Descripción (truncada a 25 caracteres)
  - Talla
  - Cantidad
  - Precio unitario
  - Descuento (si aplica)
  - Subtotal
- ✅ Subtotal antes de descuentos
- ✅ Descuento total (en verde si aplica)
- ✅ Total final (en grande y bold)
- ✅ Footer con mensaje de agradecimiento

---

## 🎨 Interfaz de Usuario

### Barra de Búsqueda:

```
┌─────────────────────────────────────────────┐
│ 🔍 Buscar Ventas                            │
├─────────────────────────────────────────────┤
│ Buscar por:  [Nombre ▼]                     │
│ Término:     [Juan Pérez_________]          │
│                                             │
│ Mostrando 3 de 25 ventas                    │
└─────────────────────────────────────────────┘
```

### Card de Venta:

```
┌─────────────────────────────────────────────┐
│ Juan Pérez              [Pendiente]         │
│ Documento: 1234567890   16/10/2025 14:30   │
│ Dirección: Calle 123                        │
│ Celular: 3001234567     Total: $120,000    │
│ Factura: FAC-20251016-0001 ← AZUL          │
│─────────────────────────────────────────────│
│ Productos (3)           [Ver Detalle ▼]     │
│─────────────────────────────────────────────│
│ [📥 Descargar Factura]  [Marcar En Camino] │
└─────────────────────────────────────────────┘
```

---

## 📋 Cómo Usar el Sistema

### 1. Buscar Ventas

1. Ir a **Dashboard** → **Historial Completo**
2. Seleccionar tipo de búsqueda:
   - **Nombre:** Para buscar por cliente
   - **Cédula:** Para buscar por documento
   - **Factura:** Para buscar número específico
3. Escribir término de búsqueda
4. Resultados se filtran automáticamente

**Ejemplos de búsqueda:**
- Por nombre: "Juan" (encuentra "Juan Pérez", "Juan Carlos", etc.)
- Por cédula: "1234" (encuentra "1234567890", "12345", etc.)
- Por factura: "FAC-2025" (encuentra todas las facturas de 2025)

### 2. Descargar Factura

1. En el historial, encontrar la venta
2. Click en botón **"📥 Descargar Factura"** (azul)
3. PDF se descarga automáticamente
4. Nombre del archivo: `Factura_FAC-20251016-0001.pdf`

### 3. Ver Detalle de Productos

1. Click en **"Ver Detalle"** en la venta
2. Se expande mostrando todos los productos
3. Para cada producto muestra:
   - Imagen (si tiene)
   - Referencia y descripción
   - Talla y cantidad
   - Precio, descuento y subtotal

---

## 🔐 Permisos

**Todos los usuarios pueden:**
- ✅ Ver historial de ventas
- ✅ Buscar ventas
- ✅ Descargar facturas en PDF
- ✅ Ver detalle de productos

**Solo admin puede:**
- ✅ Ver precios y totales
- ✅ Cambiar estado de despacho
- ✅ Ver descuentos aplicados
- ✅ Ver quién registró la venta

---

## 💡 Características Especiales del PDF

### Diseño Optimizado:
- **Ancho fijo:** A4 (210mm) - no muy ancho
- **Formato vertical:** Para fácil lectura e impresión
- **Márgenes:** 15mm uniformes
- **Logo centrado:** 40mm de ancho

### Tabla Responsiva:
- Columnas con anchos optimizados
- Descripciones truncadas para ajustar
- Grid visible para claridad
- Headers con fondo negro

### Información Clara:
- Número de factura destacado
- Fecha en formato español
- Totales en caja separada
- Descuentos en verde

---

## 🎯 Ejemplo de Búsqueda

**Caso 1: Cliente llama pidiendo su factura**
```
Cliente: "Hola, soy Juan Pérez"
Vendedor: 
1. Abre Historial
2. Selecciona "Nombre"
3. Escribe "Juan Perez"
4. Encuentra la venta
5. Descarga factura
```

**Caso 2: Buscar factura específica**
```
Cliente: "Mi número de factura es FAC-20251016-0001"
Vendedor:
1. Selecciona "Factura"
2. Escribe "FAC-20251016-0001"
3. Encuentra inmediatamente
4. Descarga factura
```

**Caso 3: Buscar por cédula**
```
Cliente: "Mi cédula es 1234567890"
Vendedor:
1. Selecciona "Cédula"
2. Escribe "1234567890"
3. Encuentra todas las compras del cliente
4. Selecciona la correcta
```

---

## ✨ Ventajas del Sistema

1. **Profesional:** Facturas con logo y formato empresarial
2. **Rápido:** Búsqueda instantánea
3. **Flexible:** Múltiples formas de buscar
4. **Fácil:** Un solo click para descargar
5. **Completo:** Toda la información necesaria
6. **Legal:** Número de factura único por venta
7. **Imprimible:** Formato A4 listo para imprimir
8. **Trazable:** Cada factura tiene número único

---

## 📊 Formato del Número de Factura

**Estructura:** FAC-YYYYMMDD-XXXX

- **FAC:** Prefijo fijo
- **YYYYMMDD:** Fecha (año-mes-día)
- **XXXX:** Secuencial del día (0001, 0002, etc.)

**Ejemplos:**
- Primera venta del 16/10/2025: `FAC-20251016-0001`
- Segunda venta del 16/10/2025: `FAC-20251016-0002`
- Primera venta del 17/10/2025: `FAC-20251017-0001` (reinicia)

---

## 🚀 Estado del Sistema

- ✅ **Backend:** Generación automática de números
- ✅ **Frontend:** Búsqueda implementada
- ✅ **PDF:** Generación con logo
- ✅ **Formato:** Vertical, profesional
- ✅ **Librerías:** jspdf y jspdf-autotable instaladas

**¡Sistema 100% funcional y listo para usar!** 🎊

---

## 🧪 Prueba el Sistema

1. Realiza una venta nueva
2. Ve al Historial Completo
3. Verás el número de factura en azul
4. Usa la búsqueda para encontrarla
5. Descarga la factura en PDF
6. Verifica que incluya logo y todos los datos

**¡Disfruta tu nuevo sistema de facturas!** 📄

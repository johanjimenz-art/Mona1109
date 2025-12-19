from fastapi import FastAPI, APIRouter, HTTPException, Depends, UploadFile, File
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.responses import FileResponse, StreamingResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta
from zoneinfo import ZoneInfo

# Colombia timezone
COLOMBIA_TZ = ZoneInfo("America/Bogota")


def now_colombia():
    """Get current datetime in Colombia timezone"""
    return datetime.now(COLOMBIA_TZ)

import bcrypt
import jwt
import base64
import shutil
from openpyxl import Workbook
from openpyxl.styles import Font, Alignment, PatternFill
import io

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# JWT Configuration
SECRET_KEY = os.environ.get('JWT_SECRET_KEY', 'your-secret-key-change-in-production')
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24  # 24 hours

security = HTTPBearer()

# Create uploads directory
UPLOADS_DIR = ROOT_DIR / 'uploads'
UPLOADS_DIR.mkdir(exist_ok=True)

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# ============ Models ============

class UserPermissions(BaseModel):
    inventario: bool = False
    venta: bool = False
    despacho: bool = False
    descuentos: bool = False

class User(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    username: str
    password_hash: str
    role: str = "user"  # "admin" or "user"
    permissions: UserPermissions = Field(default_factory=UserPermissions)
    created_by: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: now_colombia())

class UserCreate(BaseModel):
    username: str
    password: str
    role: str = "user"
    permissions: Optional[UserPermissions] = None

class UserUpdate(BaseModel):
    permissions: Optional[UserPermissions] = None

class UserLogin(BaseModel):
    username: str
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str
    username: str
    role: str
    permissions: UserPermissions

class Product(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    descripcion: str
    referencia: str
    color: str
    costo_fabricacion: Optional[float] = None
    talla: str
    precio_venta: float
    cantidad_stock: int  # Stock total (suma de ambas ubicaciones)
    stock_estudio: int = 0  # Stock en Estudio ON-OF
    stock_bodega: int = 0  # Stock en Bodega
    imagen_url: Optional[str] = None
    aprobado: bool = False
    created_by: Optional[str] = None  # Hacer opcional para productos viejos
    created_at: datetime = Field(default_factory=lambda: now_colombia())

class ProductCreate(BaseModel):
    descripcion: str
    referencia: str
    color: str
    costo_fabricacion: Optional[float] = None
    talla: str
    precio_venta: float
    cantidad_stock: int

class ProductUpdate(BaseModel):
    descripcion: Optional[str] = None
    referencia: Optional[str] = None
    color: Optional[str] = None
    costo_fabricacion: Optional[float] = None
    talla: Optional[str] = None
    precio_venta: Optional[float] = None
    cantidad_stock: Optional[int] = None
    aprobado: Optional[bool] = None

class SaleItem(BaseModel):
    product_id: str
    referencia: str
    descripcion: str
    talla: str
    color: str
    precio_venta: float
    cantidad: int
    descuento: float = 0.0  # Descuento en valor absoluto
    descuento_porcentaje: float = 0.0  # Descuento en porcentaje
    subtotal: float
    imagen_url: Optional[str] = None

class Sale(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    numero_factura: Optional[str] = None  # Se genera automáticamente
    nombre_cliente: str
    documento_cliente: str
    direccion_cliente: str
    celular_cliente: str
    items: List[SaleItem]
    subtotal: float = 0.0  # Subtotal antes de descuentos
    descuento_total: float = 0.0  # Total de descuentos aplicados
    total: float
    estado_despacho: str = "pendiente"  # pendiente, en_camino, despachado
    observaciones: Optional[str] = None  # Campo para observaciones
    aplicado_por: Optional[str] = None  # Quien aplicó descuentos
    created_by: Optional[str] = None  # Hacer opcional para ventas viejas
    created_at: datetime = Field(default_factory=lambda: now_colombia())
    updated_at: datetime = Field(default_factory=lambda: now_colombia())

class SaleCreate(BaseModel):
    nombre_cliente: str
    documento_cliente: str
    direccion_cliente: str
    celular_cliente: str
    items: List[SaleItem]
    observaciones: Optional[str] = None
    subtotal: Optional[float] = None
    descuento_total: Optional[float] = None
    aplicado_por: Optional[str] = None

class SaleUpdateStatus(BaseModel):
    estado_despacho: str
    observaciones: Optional[str] = None

class Notification(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    tipo: str  # nueva_venta, cambio_estado
    mensaje: str
    sale_id: str
    leido: bool = False
    created_at: datetime = Field(default_factory=lambda: now_colombia())


class CreditSale(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    sale_id: str
    nombre_cliente: str
    documento_cliente: str
    celular_cliente: str
    total: float
    abono_inicial: float
    saldo_pendiente: float
    fecha_pago: datetime
    estado: str = "pendiente"  # pendiente, vencido, pagado
    observaciones: Optional[str] = None
    created_by: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: now_colombia())
    updated_at: datetime = Field(default_factory=lambda: now_colombia())

class CreditSaleCreate(BaseModel):
    sale_id: str
    abono_inicial: float
    fecha_pago: datetime
    observaciones: Optional[str] = None

class CreditSaleUpdate(BaseModel):
    saldo_pendiente: Optional[float] = None
    fecha_pago: Optional[str] = None
    observaciones: Optional[str] = None

class Payment(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    credit_sale_id: str
    monto: float
    fecha_pago: datetime = Field(default_factory=lambda: now_colombia())
    observaciones: Optional[str] = None
    registrado_por: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: now_colombia())

class PaymentCreate(BaseModel):
    monto: float
    observaciones: Optional[str] = None

# ============ Auth Helper Functions ============

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))

def create_access_token(data: dict):
    to_encode = data.copy()
    expire = now_colombia() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    
    # Ensure permissions are serialized properly
    if "permissions" in to_encode and isinstance(to_encode["permissions"], UserPermissions):
        to_encode["permissions"] = to_encode["permissions"].model_dump()
    
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        token = credentials.credentials
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        role: str = payload.get("role")
        permissions_dict: dict = payload.get("permissions", {})
        if username is None:
            raise HTTPException(status_code=401, detail="Invalid authentication credentials")
        return {
            "username": username, 
            "role": role,
            "permissions": UserPermissions(**permissions_dict)
        }
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token has expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

async def get_admin_user(current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return current_user

def check_permission(permission_name: str):
    async def permission_checker(current_user: dict = Depends(get_current_user)):
        # Admin always has all permissions
        if current_user["role"] == "admin":
            return current_user
        
        # Check specific permission
        permissions = current_user["permissions"]
        if not getattr(permissions, permission_name, False):
            raise HTTPException(
                status_code=403, 
                detail=f"You don't have permission to access {permission_name}"
            )
        return current_user
    return permission_checker

# ============ Auth Routes ============

@api_router.post("/auth/register", response_model=Token)
async def register(user_data: UserCreate, current_user: dict = Depends(get_admin_user)):
    # Only admins can create new users
    existing_user = await db.users.find_one({"username": user_data.username})
    if existing_user:
        raise HTTPException(status_code=400, detail="Username already registered")
    
    # Set permissions
    permissions = user_data.permissions or UserPermissions()
    
    user = User(
        username=user_data.username,
        password_hash=hash_password(user_data.password),
        role=user_data.role,
        permissions=permissions,
        created_by=current_user["username"]
    )
    
    doc = user.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    # Convert permissions to dict if it's not already
    if isinstance(doc['permissions'], UserPermissions):
        doc['permissions'] = doc['permissions'].model_dump()
    await db.users.insert_one(doc)
    
    access_token = create_access_token(data={
        "sub": user.username, 
        "role": user.role,
        "permissions": permissions.model_dump() if isinstance(permissions, UserPermissions) else permissions
    })
    return Token(
        access_token=access_token, 
        token_type="bearer", 
        username=user.username, 
        role=user.role,
        permissions=permissions
    )

@api_router.post("/auth/setup-admin", response_model=Token)
async def setup_admin(user_data: UserCreate):
    # Check if any admin exists
    existing_admin = await db.users.find_one({"role": "admin"})
    if existing_admin:
        raise HTTPException(status_code=400, detail="Admin already exists. Contact your administrator.")
    
    # Create first admin with all permissions
    admin_permissions = UserPermissions(inventario=True, venta=True, despacho=True, descuentos=True)
    
    user = User(
        username=user_data.username,
        password_hash=hash_password(user_data.password),
        role="admin",
        permissions=admin_permissions,
        created_by="system"
    )
    
    doc = user.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    # Convert permissions to dict if it's not already
    if isinstance(doc['permissions'], UserPermissions):
        doc['permissions'] = doc['permissions'].model_dump()
    await db.users.insert_one(doc)
    
    access_token = create_access_token(data={
        "sub": user.username, 
        "role": "admin",
        "permissions": admin_permissions.model_dump()
    })
    return Token(
        access_token=access_token, 
        token_type="bearer", 
        username=user.username, 
        role="admin",
        permissions=admin_permissions
    )

@api_router.post("/auth/login", response_model=Token)
async def login(user_data: UserLogin):
    user = await db.users.find_one({"username": user_data.username})
    if not user or not verify_password(user_data.password, user['password_hash']):
        raise HTTPException(status_code=401, detail="Invalid username or password")
    
    permissions = UserPermissions(**user.get('permissions', {}))
    
    access_token = create_access_token(data={
        "sub": user['username'], 
        "role": user['role'],
        "permissions": permissions.model_dump()
    })
    return Token(
        access_token=access_token, 
        token_type="bearer", 
        username=user['username'], 
        role=user['role'],
        permissions=permissions
    )

@api_router.get("/auth/me")
async def get_me(current_user: dict = Depends(get_current_user)):
    return {
        "username": current_user["username"],
        "role": current_user["role"],
        "permissions": current_user["permissions"].model_dump()
    }

@api_router.get("/auth/check-admin")
async def check_admin():
    admin = await db.users.find_one({"role": "admin"})
    return {"admin_exists": admin is not None}

# ============ User Management (Admin only) ============

@api_router.get("/users")
async def get_users(current_user: dict = Depends(get_admin_user)):
    users = await db.users.find({}, {"_id": 0, "password_hash": 0}).to_list(1000)
    for user in users:
        if isinstance(user.get('created_at'), str):
            user['created_at'] = datetime.fromisoformat(user['created_at'])
    return users

@api_router.put("/users/{user_id}/permissions")
async def update_user_permissions(
    user_id: str,
    permissions_data: UserUpdate,
    current_user: dict = Depends(get_admin_user)
):
    if not permissions_data.permissions:
        raise HTTPException(status_code=400, detail="No permissions provided")
    
    result = await db.users.update_one(
        {"id": user_id},
        {"$set": {"permissions": permissions_data.permissions.model_dump()}}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    
    return {"message": "Permissions updated successfully"}


@api_router.put("/users/{user_id}/reset-password")
async def reset_user_password(
    user_id: str,
    new_password: str,
    current_user: dict = Depends(get_admin_user)
):
    """Admin can reset any user's password"""
    password_hash = hash_password(new_password)
    
    result = await db.users.update_one(
        {"id": user_id},
        {"$set": {"password_hash": password_hash}}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    
    return {"message": "Password reset successfully"}

@api_router.post("/auth/request-password-reset")
async def request_password_reset(username: str):
    """User requests password reset - creates notification for admin"""
    user = await db.users.find_one({"username": username}, {"_id": 0})
    
    if not user:
        # Don't reveal if user exists or not for security
        return {"message": "Si el usuario existe, se ha notificado al administrador"}
    
    # Create notification for admin
    await create_notification(
        tipo="reset_password",
        mensaje=f"Solicitud de recuperación de contraseña de: {username}",
        user_id=user['id']
    )
    
    return {"message": "Solicitud enviada al administrador. Te contactarán pronto."}


# ============ Product Routes ============

@api_router.post("/products", response_model=Product)
async def create_product(
    product_data: ProductCreate, 
    current_user: dict = Depends(get_admin_user)  # SOLO ADMIN
):
    product = Product(
        **product_data.model_dump(),
        created_by=current_user["username"],
        aprobado=True  # Admin products are auto-approved
    )
    
    doc = product.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    await db.products.insert_one(doc)
    
    return product

@api_router.post("/products/{product_id}/upload-image")
async def upload_product_image(
    product_id: str,
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user)
):
    # Validate file type
    if not file.content_type or not file.content_type.startswith('image/jpeg'):
        raise HTTPException(status_code=400, detail="Only JPEG images are allowed")
    
    # Check file size (1MB max)
    content = await file.read()
    if len(content) > 1 * 1024 * 1024:  # 1MB
        raise HTTPException(status_code=400, detail="Image size must be less than 1MB")
    
    # Save file
    filename = f"{product_id}.jpg"
    file_path = UPLOADS_DIR / filename
    
    with open(file_path, 'wb') as f:
        f.write(content)
    
    # Update product with image URL
    imagen_url = f"/api/products/{product_id}/image"
    await db.products.update_one(
        {"id": product_id},
        {"$set": {"imagen_url": imagen_url}}
    )
    
    return {"imagen_url": imagen_url}

@api_router.get("/products/{product_id}/image")
async def get_product_image(product_id: str):
    file_path = UPLOADS_DIR / f"{product_id}.jpg"
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Image not found")
    return FileResponse(file_path, media_type="image/jpeg")

@api_router.get("/products", response_model=List[Product])
async def get_products(current_user: dict = Depends(get_current_user)):
    # Admin or users with inventario or venta permission can see products
    if current_user["role"] != "admin":
        permissions = current_user["permissions"]
        if not (permissions.inventario or permissions.venta):
            raise HTTPException(status_code=403, detail="You don't have permission to view products")
    
    products = await db.products.find({}, {"_id": 0}).to_list(1000)
    
    for product in products:
        if isinstance(product['created_at'], str):
            product['created_at'] = datetime.fromisoformat(product['created_at'])
        
        # Hide costo_fabricacion for non-admin users
        if current_user["role"] != "admin":
            product['costo_fabricacion'] = None
    
    return products

@api_router.get("/products/grouped")
async def get_products_grouped(current_user: dict = Depends(get_current_user)):
    # Admin or users with inventario or venta permission can see products
    if current_user["role"] != "admin":
        permissions = current_user["permissions"]
        if not (permissions.inventario or permissions.venta):
            raise HTTPException(status_code=403, detail="You don't have permission to view products")
    
    products = await db.products.find({}, {"_id": 0}).to_list(1000)
    
    # Group by referencia
    grouped = {}
    for product in products:
        if isinstance(product['created_at'], str):
            product['created_at'] = datetime.fromisoformat(product['created_at'])
        
        # Hide costo_fabricacion for non-admin users
        if current_user["role"] != "admin":
            product['costo_fabricacion'] = None
        
        ref = product['referencia']
        if ref not in grouped:
            grouped[ref] = {
                "referencia": ref,
                "descripcion": product['descripcion'],
                "color": product['color'],
                "precio_venta": product['precio_venta'],
                "costo_fabricacion": product.get('costo_fabricacion'),
                "imagen_url": product.get('imagen_url'),
                "tallas": [],
                "stock_total": 0
            }
        
        grouped[ref]["tallas"].append({
            "id": product['id'],
            "talla": product['talla'],
            "cantidad_stock": product['cantidad_stock'],
            "aprobado": product.get('aprobado', False)
        })
        grouped[ref]["stock_total"] += product['cantidad_stock']
    
    return list(grouped.values())

@api_router.get("/products/search")
async def search_products(referencia: str, talla: str, color: str, current_user: dict = Depends(get_current_user)):
    product = await db.products.find_one({
        "referencia": referencia,
        "talla": talla,
        "color": color,
        "aprobado": True  # Only search approved products
    }, {"_id": 0})
    
    if not product:
        raise HTTPException(status_code=404, detail="Product not found or not approved")
    
    if isinstance(product['created_at'], str):
        product['created_at'] = datetime.fromisoformat(product['created_at'])
    
    # Hide costo_fabricacion for non-admin users
    if current_user["role"] != "admin":
        product['costo_fabricacion'] = None
    
    return product

@api_router.put("/products/{product_id}", response_model=Product)
async def update_product(product_id: str, product_data: ProductUpdate, current_user: dict = Depends(get_current_user)):
    update_dict = {k: v for k, v in product_data.model_dump().items() if v is not None}
    
    # Only admin can update costo_fabricacion and aprobado
    if current_user["role"] != "admin":
        update_dict.pop('costo_fabricacion', None)
        update_dict.pop('aprobado', None)
    
    if not update_dict:
        raise HTTPException(status_code=400, detail="No fields to update")
    
    result = await db.products.update_one({"id": product_id}, {"$set": update_dict})
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Product not found")
    
    product = await db.products.find_one({"id": product_id}, {"_id": 0})
    if isinstance(product['created_at'], str):
        product['created_at'] = datetime.fromisoformat(product['created_at'])
    
    # Hide costo_fabricacion for non-admin users
    if current_user["role"] != "admin":
        product['costo_fabricacion'] = None
    
    return product

@api_router.delete("/products/{product_id}")
async def delete_product(product_id: str, current_user: dict = Depends(get_admin_user)):
    result = await db.products.delete_one({"id": product_id})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Product not found")
    
    # Delete image if exists
    file_path = UPLOADS_DIR / f"{product_id}.jpg"
    if file_path.exists():
        file_path.unlink()
    
    return {"message": "Product deleted successfully"}

# ============ Sales Routes ============

async def create_notification(tipo: str, mensaje: str, sale_id: str):
    notification = Notification(
        tipo=tipo,
        mensaje=mensaje,
        sale_id=sale_id
    )
    doc = notification.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    await db.notifications.insert_one(doc)


async def generate_invoice_number():
    """Generate unique invoice number with format: FAC-YYYYMMDD-XXXX"""
    today = now_colombia().strftime('%Y%m%d')
    
    # Count today's sales
    today_start = now_colombia().replace(hour=0, minute=0, second=0, microsecond=0)
    count = await db.sales.count_documents({
        "created_at": {"$gte": today_start.isoformat()}
    })
    
    sequential = str(count + 1).zfill(4)
    return f"FAC-{today}-{sequential}"


@api_router.post("/sales", response_model=Sale)
async def create_sale(sale_data: SaleCreate, current_user: dict = Depends(get_current_user)):
    total = sum(item.subtotal for item in sale_data.items)
    
    # Generate invoice number
    numero_factura = await generate_invoice_number()
    
    # Update inventory for each item
    for item in sale_data.items:
        product = await db.products.find_one({"id": item.product_id})
        
        if not product:
            raise HTTPException(status_code=404, detail=f"Product {item.referencia} not found")
        
        if not product.get('aprobado', False):
            raise HTTPException(status_code=400, detail=f"Product {item.referencia} is not approved")
        
        if product['cantidad_stock'] < item.cantidad:
            raise HTTPException(
                status_code=400, 
                detail=f"Insufficient stock for {item.referencia}. Available: {product['cantidad_stock']}, Requested: {item.cantidad}"
            )
        
        # Reduce stock
        new_stock = product['cantidad_stock'] - item.cantidad
        await db.products.update_one(
            {"id": item.product_id},
            {"$set": {"cantidad_stock": new_stock}}
        )
    
    # Create sale
    sale = Sale(
        numero_factura=numero_factura,
        nombre_cliente=sale_data.nombre_cliente,
        documento_cliente=sale_data.documento_cliente,
        direccion_cliente=sale_data.direccion_cliente,
        celular_cliente=sale_data.celular_cliente,
        items=[item.model_dump() for item in sale_data.items],
        subtotal=sale_data.subtotal if hasattr(sale_data, 'subtotal') and sale_data.subtotal else total,
        descuento_total=sale_data.descuento_total if hasattr(sale_data, 'descuento_total') and sale_data.descuento_total else 0,
        total=total,
        observaciones=sale_data.observaciones if hasattr(sale_data, 'observaciones') else None,
        aplicado_por=sale_data.aplicado_por if hasattr(sale_data, 'aplicado_por') else None,
        created_by=current_user["username"]
    )
    
    doc = sale.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    doc['updated_at'] = doc['updated_at'].isoformat()
    await db.sales.insert_one(doc)
    
    # Create notification
    await create_notification(
        tipo="nueva_venta",
        mensaje=f"Nueva venta de {sale_data.nombre_cliente} - Total: ${total:,.0f}",
        sale_id=sale.id
    )
    
    return sale

@api_router.get("/sales/today/detail")
async def get_today_sales_detail(current_user: dict = Depends(get_current_user)):
    # Obtener ventas de hoy
    today_start = now_colombia().replace(hour=0, minute=0, second=0, microsecond=0)
    today_end = now_colombia().replace(hour=23, minute=59, second=59, microsecond=999999)
    
    sales = await db.sales.find({
        "created_at": {
            "$gte": today_start.isoformat(),
            "$lte": today_end.isoformat()
        }
    }, {"_id": 0}).sort("created_at", -1).to_list(1000)
    
    # Procesar ventas
    detailed_sales = []
    for sale in sales:
        if isinstance(sale['created_at'], str):
            sale['created_at'] = datetime.fromisoformat(sale['created_at'])
        if isinstance(sale.get('updated_at'), str):
            sale['updated_at'] = datetime.fromisoformat(sale['updated_at'])
        detailed_sales.append(sale)
    
    return detailed_sales

@api_router.get("/sales", response_model=List[Sale])
async def get_sales(current_user: dict = Depends(get_current_user)):
    sales = await db.sales.find({}, {"_id": 0}).sort("created_at", -1).to_list(1000)
    
    for sale in sales:
        if isinstance(sale['created_at'], str):
            sale['created_at'] = datetime.fromisoformat(sale['created_at'])
        if isinstance(sale.get('updated_at'), str):
            sale['updated_at'] = datetime.fromisoformat(sale['updated_at'])
    
    return sales

@api_router.get("/clientes/buscar")
async def search_clients(
    q: str,
    current_user: dict = Depends(get_current_user)
):
    """Buscar clientes por nombre o documento"""
    if not q or len(q) < 2:
        return []
    
    # Buscar en ventas por nombre o documento
    sales = await db.sales.find({
        "$or": [
            {"nombre_cliente": {"$regex": q, "$options": "i"}},
            {"documento_cliente": {"$regex": q, "$options": "i"}}
        ]
    }, {"_id": 0}).to_list(100)
    
    # Eliminar duplicados por documento y obtener datos únicos de clientes
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
    
    return list(clientes_dict.values())

@api_router.get("/sales/recent")
async def get_recent_sales(current_user: dict = Depends(get_current_user)):
    """Get sales from last 10 days only"""
    ten_days_ago = now_colombia() - timedelta(days=10)
    
    sales = await db.sales.find({
        "created_at": {"$gte": ten_days_ago.isoformat()}
    }, {"_id": 0}).to_list(1000)
    
    # Convert datetime objects
    for sale in sales:
        if isinstance(sale.get('created_at'), str):
            sale['created_at'] = datetime.fromisoformat(sale['created_at'])
        if isinstance(sale.get('updated_at'), str):
            sale['updated_at'] = datetime.fromisoformat(sale['updated_at'])
    
    return sales

@api_router.get("/sales/export-excel")
async def export_sales_to_excel(current_user: dict = Depends(get_current_user)):
    """Export ALL sales to Excel with proper formatting"""
    try:
        from openpyxl import Workbook
        from openpyxl.styles import Font, Alignment, PatternFill, Border, Side
        from openpyxl.utils import get_column_letter
        from io import BytesIO
        
        # Get ALL sales
        sales = await db.sales.find({}, {"_id": 0}).sort("created_at", -1).to_list(10000)
        
        # Create workbook
        wb = Workbook()
        ws = wb.active
        ws.title = "Historial Ventas"
        
        # Define headers with organized columns
        headers = [
            "FECHA COMPRA", "HORA", "No. FACTURA",
            "CLIENTE", "DOCUMENTO", "TELÉFONO", "DIRECCIÓN",
            "REFERENCIA", "DESCRIPCIÓN", "TALLA", "COLOR", "CANTIDAD", "PRECIO UNITARIO",
            "SUBTOTAL", "DESCUENTO", "TOTAL VENTA",
            "TIPO VENTA", "ABONO INICIAL", "SALDO PENDIENTE", "ESTADO CRÉDITO",
            "ESTADO DESPACHO", "ATENDIDO POR", "OBSERVACIONES"
        ]
        
        # Style for headers
        header_font = Font(bold=True, size=11, color="FFFFFF")
        header_fill = PatternFill(start_color="000000", end_color="000000", fill_type="solid")
        header_alignment = Alignment(horizontal="center", vertical="center", wrap_text=True)
        border = Border(
            left=Side(style='thin'),
            right=Side(style='thin'),
            top=Side(style='thin'),
            bottom=Side(style='thin')
        )
        
        # Write headers
        for col_num, header in enumerate(headers, 1):
            cell = ws.cell(row=1, column=col_num, value=header)
            cell.font = header_font
            cell.fill = header_fill
            cell.alignment = header_alignment
            cell.border = border
        
        # Set column widths
        column_widths = {
            'A': 12, 'B': 8, 'C': 18,  # Fecha, Hora, Factura
            'D': 25, 'E': 13, 'F': 12, 'G': 30,  # Cliente info
            'H': 12, 'I': 30, 'J': 8, 'K': 12, 'L': 10, 'M': 13,  # Producto info
            'N': 12, 'O': 12, 'P': 13,  # Precios
            'Q': 12, 'R': 13, 'S': 15, 'T': 15,  # Crédito
            'U': 15, 'V': 15, 'W': 35  # Estado y observaciones
        }
        
        for col, width in column_widths.items():
            ws.column_dimensions[col].width = width
        
        # Write data
        row_num = 2
        for sale in sales:
            # Parse date
            if isinstance(sale.get('created_at'), str):
                sale_date = datetime.fromisoformat(sale['created_at'])
            else:
                sale_date = sale.get('created_at', datetime.now())
            
            fecha = sale_date.strftime('%d/%m/%Y')
            hora = sale_date.strftime('%H:%M')
            
            # Get credit info
            credit_info = await db.credit_sales.find_one({"sale_id": sale['id']}, {"_id": 0})
            tipo_venta = "CRÉDITO" if credit_info else "CONTADO"
            
            # Process each item in the sale
            items = sale.get('items', [])
            for item in items:
                row_data = [
                    fecha,
                    hora,
                    sale.get('numero_factura', 'N/A'),
                    sale.get('nombre_cliente', ''),
                    sale.get('documento_cliente', ''),
                    sale.get('celular_cliente', ''),
                    sale.get('direccion_cliente', ''),
                    item.get('referencia', ''),
                    item.get('descripcion', ''),
                    item.get('talla', ''),
                    item.get('color', 'N/A'),
                    item.get('cantidad', 0),
                    item.get('precio_venta', 0),
                    item.get('subtotal', 0),
                    sale.get('descuento_total', 0) if items.index(item) == 0 else 0,
                    sale.get('total', 0) if items.index(item) == 0 else 0,
                    tipo_venta,
                    credit_info.get('abono_inicial', 0) if credit_info and items.index(item) == 0 else (0 if items.index(item) == 0 else ''),
                    credit_info.get('saldo_pendiente', 0) if credit_info and items.index(item) == 0 else (0 if items.index(item) == 0 else ''),
                    credit_info.get('estado', '').upper() if credit_info and items.index(item) == 0 else ('' if items.index(item) > 0 else 'N/A'),
                    sale.get('estado_despacho', 'pendiente').upper() if items.index(item) == 0 else '',
                    sale.get('created_by', '') if items.index(item) == 0 else '',
                    sale.get('observaciones', '') if items.index(item) == 0 else ''
                ]
                
                # Write row
                for col_num, value in enumerate(row_data, 1):
                    cell = ws.cell(row=row_num, column=col_num, value=value)
                    cell.border = border
                    cell.alignment = Alignment(vertical="center")
                    
                    # Format currency columns
                    if col_num in [13, 14, 15, 16, 18, 19]:  # Precio columns
                        if isinstance(value, (int, float)) and value != 0:
                            cell.number_format = '"$"#,##0'
                
                row_num += 1
        
        # Freeze first row
        ws.freeze_panes = 'A2'
        
        # Save to BytesIO
        output = BytesIO()
        wb.save(output)
        output.seek(0)
        
        # Return as streaming response
        from fastapi.responses import StreamingResponse
        
        fecha_actual = now_colombia().strftime('%Y-%m-%d')
        filename = f"Historial_Ventas_Completo_{fecha_actual}.xlsx"
        
        return StreamingResponse(
            output,
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": f"attachment; filename={filename}"}
        )
        
    except Exception as e:
        logger.error(f"Error exporting Excel: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error al exportar: {str(e)}")

@api_router.get("/sales/pending", response_model=List[Sale])
async def get_pending_sales(current_user: dict = Depends(get_current_user)):
    # Users with despacho permission or admin can see pending sales
    if current_user["role"] != "admin":
        if not current_user["permissions"].despacho:
            raise HTTPException(status_code=403, detail="You don't have permission to view dispatch")
    
    sales = await db.sales.find(
        {"estado_despacho": {"$in": ["pendiente", "en_camino"]}}, 
        {"_id": 0}
    ).sort("created_at", -1).to_list(1000)
    
    for sale in sales:
        if isinstance(sale['created_at'], str):
            sale['created_at'] = datetime.fromisoformat(sale['created_at'])
        if isinstance(sale.get('updated_at'), str):
            sale['updated_at'] = datetime.fromisoformat(sale['updated_at'])
    
    return sales

@api_router.get("/sales/{sale_id}", response_model=Sale)
async def get_sale(sale_id: str, current_user: dict = Depends(get_current_user)):
    sale = await db.sales.find_one({"id": sale_id}, {"_id": 0})
    
    if not sale:
        raise HTTPException(status_code=404, detail="Sale not found")
    
    if isinstance(sale['created_at'], str):
        sale['created_at'] = datetime.fromisoformat(sale['created_at'])
    if isinstance(sale.get('updated_at'), str):
        sale['updated_at'] = datetime.fromisoformat(sale['updated_at'])
    
    return sale

@api_router.put("/sales/{sale_id}/status")
async def update_sale_status(
    sale_id: str,
    status_data: SaleUpdateStatus,
    current_user: dict = Depends(get_current_user)
):
    if status_data.estado_despacho not in ["pendiente", "en_camino", "despachado"]:
        raise HTTPException(status_code=400, detail="Invalid status")
    
    update_dict = {
        "estado_despacho": status_data.estado_despacho,
        "updated_at": now_colombia().isoformat()
    }
    
    if status_data.observaciones is not None:
        update_dict["observaciones"] = status_data.observaciones
    
    result = await db.sales.update_one(
        {"id": sale_id},
        {"$set": update_dict}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Sale not found")
    
    # Create notification
    status_labels = {
        "pendiente": "Pendiente",
        "en_camino": "En Camino",
        "despachado": "Despachado"
    }
    
    sale = await db.sales.find_one({"id": sale_id}, {"_id": 0})
    
    await create_notification(
        tipo="cambio_estado",
        mensaje=f"Venta de {sale['nombre_cliente']} cambió a: {status_labels[status_data.estado_despacho]}",
        sale_id=sale_id
    )
    
    return {"message": "Status updated successfully"}

# ============ Notifications ============

@api_router.get("/notifications")
async def get_notifications(current_user: dict = Depends(get_current_user)):
    notifications = await db.notifications.find(
        {},
        {"_id": 0}
    ).sort("created_at", -1).limit(50).to_list(50)
    
    for notif in notifications:
        if isinstance(notif['created_at'], str):
            notif['created_at'] = datetime.fromisoformat(notif['created_at'])
    
    return notifications

@api_router.put("/notifications/{notification_id}/read")
async def mark_notification_read(notification_id: str, current_user: dict = Depends(get_current_user)):
    result = await db.notifications.update_one(
        {"id": notification_id},
        {"$set": {"leido": True}}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Notification not found")
    
    return {"message": "Notification marked as read"}

@api_router.get("/notifications/unread/count")
async def get_unread_count(current_user: dict = Depends(get_current_user)):
    count = await db.notifications.count_documents({"leido": False})
    return {"count": count}

# ============ Export Routes ============

@api_router.get("/sales/export/excel")
async def export_sales_excel(current_user: dict = Depends(get_admin_user)):
    try:
        # Obtener todas las ventas
        sales = await db.sales.find({}, {"_id": 0}).sort("created_at", -1).to_list(10000)
        
        # Crear workbook
        wb = Workbook()
        ws = wb.active
        ws.title = "Ventas"
        
        # Estilos
        header_fill = PatternFill(start_color="000000", end_color="000000", fill_type="solid")
        header_font = Font(color="FFFFFF", bold=True)
        
        # Headers
        headers = ["Fecha", "Hora", "Cliente", "Documento", "Dirección", "Teléfono", 
                   "Referencia", "Descripción", "Talla", "Color", "Cantidad", "Precio Unit.", 
                   "Subtotal", "Total Venta", "Estado Despacho", "Observaciones", "Vendido Por"]
        
        for col, header in enumerate(headers, 1):
            cell = ws.cell(row=1, column=col, value=header)
            cell.fill = header_fill
            cell.font = header_font
            cell.alignment = Alignment(horizontal="center", vertical="center")
        
        # Datos
        row = 2
        for sale in sales:
            created_at = sale.get('created_at')
            if isinstance(created_at, str):
                created_at = datetime.fromisoformat(created_at)
            
            fecha = created_at.strftime("%d/%m/%Y")
            hora = created_at.strftime("%H:%M")
            
            # Una fila por cada item
            for item in sale.get('items', []):
                ws.cell(row=row, column=1, value=fecha)
                ws.cell(row=row, column=2, value=hora)
                ws.cell(row=row, column=3, value=sale.get('nombre_cliente', ''))
                ws.cell(row=row, column=4, value=sale.get('documento_cliente', ''))
                ws.cell(row=row, column=5, value=sale.get('direccion_cliente', ''))
                ws.cell(row=row, column=6, value=sale.get('celular_cliente', ''))
                ws.cell(row=row, column=7, value=item.get('referencia', ''))
                ws.cell(row=row, column=8, value=item.get('descripcion', ''))
                ws.cell(row=row, column=9, value=item.get('talla', ''))
                ws.cell(row=row, column=10, value=item.get('color', ''))
                ws.cell(row=row, column=11, value=item.get('cantidad', 0))
                ws.cell(row=row, column=12, value=item.get('precio_venta', 0))
                ws.cell(row=row, column=13, value=item.get('subtotal', 0))
                ws.cell(row=row, column=14, value=sale.get('total', 0))
                ws.cell(row=row, column=15, value=sale.get('estado_despacho', ''))
                ws.cell(row=row, column=16, value=sale.get('observaciones', ''))
                ws.cell(row=row, column=17, value=sale.get('created_by', ''))
                row += 1
        
        # Ajustar ancho de columnas
        for col in range(1, len(headers) + 1):
            ws.column_dimensions[chr(64 + col)].width = 15
        
        # Guardar en memoria
        excel_file = io.BytesIO()
        wb.save(excel_file)
        excel_file.seek(0)
        
        # Nombre del archivo con fecha
        filename = f"ventas_{datetime.now().strftime('%Y%m%d_%H%M%S')}.xlsx"
        
        return StreamingResponse(
            excel_file,
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": f"attachment; filename={filename}"}
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al generar Excel: {str(e)}")

# ============ Stats Route ============

@api_router.get("/stats")
async def get_stats(current_user: dict = Depends(get_current_user)):
    # Total unidades en stock (suma de cantidad_stock de todos los productos aprobados)
    products = await db.products.find(
        {"aprobado": True},
        {"_id": 0, "cantidad_stock": 1, "precio_venta": 1, "costo_fabricacion": 1}
    ).to_list(10000)
    
    total_units_in_stock = sum(p['cantidad_stock'] for p in products)
    
    # Valor del stock usando precio de venta
    total_stock_value = sum(p['cantidad_stock'] * p['precio_venta'] for p in products)
    
    # Valor del stock usando costo de fabricación
    total_stock_value_fabricacion = sum(p['cantidad_stock'] * p.get('costo_fabricacion', 0) for p in products)
    
    # Obtener ventas de hoy
    today_start = now_colombia().replace(hour=0, minute=0, second=0, microsecond=0)
    today_end = now_colombia().replace(hour=23, minute=59, second=59, microsecond=999999)
    
    today_sales = await db.sales.find({
        "created_at": {
            "$gte": today_start.isoformat(),
            "$lte": today_end.isoformat()
        }
    }, {"_id": 0, "items": 1, "total": 1}).to_list(10000)
    
    # Calcular unidades vendidas hoy
    today_units_sold = 0
    today_revenue = 0
    
    for sale in today_sales:
        today_revenue += sale.get('total', 0)
        for item in sale.get('items', []):
            today_units_sold += item.get('cantidad', 0)
    
    stats = {
        "total_units_in_stock": total_units_in_stock,
        "today_units_sold": today_units_sold,
        "total_stock_value": total_stock_value,
        "total_stock_value_fabricacion": total_stock_value_fabricacion
    }
    
    # Count credits
    total_credits = await db.credit_sales.count_documents({"estado": {"$in": ["pendiente", "vencido"]}})
    stats["total_credits_pending"] = total_credits
    
    # Only admins see revenue
    if current_user["role"] == "admin":
        stats["today_revenue"] = today_revenue
    
    return stats


# ============ Credit Sales Routes ============

@api_router.post("/credit-sales", response_model=CreditSale)
async def create_credit_sale(
    credit_data: CreditSaleCreate,
    current_user: dict = Depends(get_current_user)
):
    # Get sale info
    sale = await db.sales.find_one({"id": credit_data.sale_id}, {"_id": 0})
    if not sale:
        raise HTTPException(status_code=404, detail="Sale not found")
    
    # Calculate saldo pendiente
    saldo_pendiente = sale['total'] - credit_data.abono_inicial
    
    credit_sale = CreditSale(
        sale_id=credit_data.sale_id,
        nombre_cliente=sale['nombre_cliente'],
        documento_cliente=sale['documento_cliente'],
        celular_cliente=sale['celular_cliente'],
        total=sale['total'],
        abono_inicial=credit_data.abono_inicial,
        saldo_pendiente=saldo_pendiente,
        fecha_pago=credit_data.fecha_pago,
        observaciones=credit_data.observaciones,
        created_by=current_user["username"]
    )
    
    doc = credit_sale.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    doc['updated_at'] = doc['updated_at'].isoformat()
    doc['fecha_pago'] = doc['fecha_pago'].isoformat()
    await db.credit_sales.insert_one(doc)
    
    # Create notification
    await create_notification(
        tipo="credito_nuevo",
        mensaje=f"Nueva venta a crédito de {sale['nombre_cliente']} - Saldo: ${saldo_pendiente:,.0f}",
        sale_id=credit_data.sale_id
    )
    
    return credit_sale

@api_router.get("/credit-sales")
async def get_credit_sales(
    estado: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    query = {}
    if estado:
        query["estado"] = estado
    
    credit_sales = await db.credit_sales.find(query, {"_id": 0}).sort("fecha_pago", 1).to_list(1000)
    
    for credit in credit_sales:
        if isinstance(credit.get('created_at'), str):
            credit['created_at'] = datetime.fromisoformat(credit['created_at'])
        if isinstance(credit.get('updated_at'), str):
            credit['updated_at'] = datetime.fromisoformat(credit['updated_at'])
        if isinstance(credit.get('fecha_pago'), str):
            credit['fecha_pago'] = datetime.fromisoformat(credit['fecha_pago'])
    
    return credit_sales

@api_router.get("/credit-sales/{credit_id}")
async def get_credit_sale(
    credit_id: str,
    current_user: dict = Depends(get_current_user)
):
    credit = await db.credit_sales.find_one({"id": credit_id}, {"_id": 0})
    
    if not credit:
        raise HTTPException(status_code=404, detail="Credit sale not found")
    
    if isinstance(credit.get('created_at'), str):
        credit['created_at'] = datetime.fromisoformat(credit['created_at'])
    if isinstance(credit.get('updated_at'), str):
        credit['updated_at'] = datetime.fromisoformat(credit['updated_at'])
    if isinstance(credit.get('fecha_pago'), str):
        credit['fecha_pago'] = datetime.fromisoformat(credit['fecha_pago'])
    
    # Get payments for this credit
    payments = await db.payments.find({"credit_sale_id": credit_id}, {"_id": 0}).sort("created_at", -1).to_list(100)
    for payment in payments:
        if isinstance(payment.get('created_at'), str):
            payment['created_at'] = datetime.fromisoformat(payment['created_at'])
        if isinstance(payment.get('fecha_pago'), str):
            payment['fecha_pago'] = datetime.fromisoformat(payment['fecha_pago'])
    
    credit['payments'] = payments
    
    return credit

@api_router.post("/credit-sales/{credit_id}/payments", response_model=Payment)
async def create_payment(
    credit_id: str,
    payment_data: PaymentCreate,
    current_user: dict = Depends(get_current_user)
):
    # Get credit sale
    credit = await db.credit_sales.find_one({"id": credit_id}, {"_id": 0})
    if not credit:
        raise HTTPException(status_code=404, detail="Credit sale not found")
    
    # Validate payment amount
    if payment_data.monto <= 0:
        raise HTTPException(status_code=400, detail="Payment amount must be positive")
    
    if payment_data.monto > credit['saldo_pendiente']:
        raise HTTPException(status_code=400, detail="Payment amount exceeds remaining balance")
    
    # Create payment
    payment = Payment(
        credit_sale_id=credit_id,
        monto=payment_data.monto,
        observaciones=payment_data.observaciones,
        registrado_por=current_user["username"]
    )
    
    doc = payment.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    doc['fecha_pago'] = doc['fecha_pago'].isoformat()
    await db.payments.insert_one(doc)
    
    # Update credit sale
    new_saldo = credit['saldo_pendiente'] - payment_data.monto
    new_estado = "pagado" if new_saldo <= 0 else credit['estado']
    
    await db.credit_sales.update_one(
        {"id": credit_id},
        {
            "$set": {
                "saldo_pendiente": new_saldo,
                "estado": new_estado,
                "updated_at": now_colombia().isoformat()
            }
        }
    )
    
    # Create notification
    await create_notification(
        tipo="pago_abono",
        mensaje=f"Abono de ${payment_data.monto:,.0f} - {credit['nombre_cliente']} - Saldo: ${new_saldo:,.0f}",
        sale_id=credit['sale_id']
    )
    
    return payment

@api_router.get("/credit-sales/alerts/upcoming")
async def get_upcoming_payment_alerts(current_user: dict = Depends(get_current_user)):
    """Get credits with payments due in the next 2 days"""
    today = now_colombia().replace(hour=0, minute=0, second=0, microsecond=0)
    two_days_later = today + timedelta(days=2)
    
    credits = await db.credit_sales.find({
        "estado": "pendiente",
        "fecha_pago": {
            "$gte": today.isoformat(),
            "$lte": two_days_later.isoformat()
        }
    }, {"_id": 0}).to_list(1000)
    
    for credit in credits:
        if isinstance(credit.get('fecha_pago'), str):
            credit['fecha_pago'] = datetime.fromisoformat(credit['fecha_pago'])
        if isinstance(credit.get('created_at'), str):
            credit['created_at'] = datetime.fromisoformat(credit['created_at'])
        if isinstance(credit.get('updated_at'), str):
            credit['updated_at'] = datetime.fromisoformat(credit['updated_at'])
    
    return credits


@api_router.put("/credit-sales/{credit_id}")
async def update_credit_sale(
    credit_id: str,
    update_request: CreditSaleUpdate,
    current_user: dict = Depends(get_admin_user)
):
    """Admin can update credit sale details"""
    update_data = {}
    
    if update_request.saldo_pendiente is not None:
        update_data["saldo_pendiente"] = update_request.saldo_pendiente
        update_data["estado"] = "pagado" if update_request.saldo_pendiente <= 0 else "pendiente"
    
    if update_request.fecha_pago is not None:
        # Parse the date string
        try:
            fecha_dt = datetime.fromisoformat(update_request.fecha_pago.replace('Z', '+00:00'))
            update_data["fecha_pago"] = fecha_dt.isoformat()
        except:
            update_data["fecha_pago"] = update_request.fecha_pago
    
    if update_request.observaciones is not None:
        update_data["observaciones"] = update_request.observaciones
    
    if update_data:
        update_data["updated_at"] = now_colombia().isoformat()
        
        result = await db.credit_sales.update_one(
            {"id": credit_id},
            {"$set": update_data}
        )
        
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Credit sale not found")
    
    return {"message": "Credit sale updated successfully"}

@api_router.delete("/credit-sales/{credit_id}")
async def delete_credit_sale(
    credit_id: str,
    current_user: dict = Depends(get_admin_user)
):
    """Admin can delete credit sale"""
    result = await db.credit_sales.delete_one({"id": credit_id})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Credit sale not found")
    
    # Also delete related payments
    await db.payments.delete_many({"credit_sale_id": credit_id})
    
    return {"message": "Credit sale deleted successfully"}

@api_router.put("/sales/{sale_id}")
async def update_sale(
    sale_id: str,
    items: Optional[List[SaleItem]] = None,
    subtotal: Optional[float] = None,
    descuento_total: Optional[float] = None,
    total: Optional[float] = None,
    observaciones: Optional[str] = None,
    current_user: dict = Depends(get_admin_user)
):
    """Admin can update sale details"""
    update_data = {}
    
    if items is not None:
        update_data["items"] = [item.model_dump() for item in items]
    
    if subtotal is not None:
        update_data["subtotal"] = subtotal
    
    if descuento_total is not None:
        update_data["descuento_total"] = descuento_total
    
    if total is not None:
        update_data["total"] = total
    
    if observaciones is not None:
        update_data["observaciones"] = observaciones
    
    if update_data:
        update_data["updated_at"] = now_colombia().isoformat()
        
        result = await db.sales.update_one(
            {"id": sale_id},
            {"$set": update_data}
        )
        
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Sale not found")
    
    return {"message": "Sale updated successfully"}

@api_router.delete("/sales/{sale_id}")
async def delete_sale(
    sale_id: str,
    restore_stock: bool = True,
    current_user: dict = Depends(get_admin_user)
):
    """Admin can delete sale and optionally restore stock"""
    sale = await db.sales.find_one({"id": sale_id}, {"_id": 0})
    
    if not sale:
        raise HTTPException(status_code=404, detail="Sale not found")
    
    # Restore stock if requested
    if restore_stock:
        for item in sale.get("items", []):
            await db.products.update_one(
                {"id": item["product_id"]},
                {"$inc": {"cantidad_stock": item["cantidad"]}}
            )
    
    # Delete the sale
    await db.sales.delete_one({"id": sale_id})
    
    # Delete related credit if exists
    await db.credit_sales.delete_many({"sale_id": sale_id})
    
    # Delete related notifications
    await db.notifications.delete_many({"sale_id": sale_id})
    
    return {"message": "Sale deleted successfully", "stock_restored": restore_stock}

@api_router.get("/credit-sales/alerts/overdue")
async def get_overdue_payment_alerts(current_user: dict = Depends(get_current_user)):
    """Get credits with overdue payments"""
    today = now_colombia().replace(hour=0, minute=0, second=0, microsecond=0)
    
    credits = await db.credit_sales.find({
        "estado": "pendiente",
        "fecha_pago": {
            "$lt": today.isoformat()
        }
    }, {"_id": 0}).to_list(1000)
    
    # Mark as vencido
    for credit in credits:
        if credit.get('estado') == 'pendiente':
            await db.credit_sales.update_one(
                {"id": credit['id']},
                {"$set": {"estado": "vencido"}}
            )
            credit['estado'] = 'vencido'
        
        if isinstance(credit.get('fecha_pago'), str):
            credit['fecha_pago'] = datetime.fromisoformat(credit['fecha_pago'])
        if isinstance(credit.get('created_at'), str):
            credit['created_at'] = datetime.fromisoformat(credit['created_at'])
        if isinstance(credit.get('updated_at'), str):
            credit['updated_at'] = datetime.fromisoformat(credit['updated_at'])
    
    return credits


# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# ============ Cambios Endpoints ============

class CambioCreate(BaseModel):
    sale_id: str
    numero_factura: str
    cliente: str
    documento_cliente: str
    producto_original: dict
    producto_nuevo: dict
    diferencia_precio: float
    con_etiqueta: bool
    buen_estado: bool
    observaciones: Optional[str] = None
    realizado_por: str

@api_router.post("/cambios")
async def create_cambio(
    cambio_data: CambioCreate,
    current_user: dict = Depends(get_current_user)
):
    """Procesar un cambio de producto"""
    try:
        # Crear registro del cambio
        cambio = {
            "id": str(uuid.uuid4()),
            "sale_id": cambio_data.sale_id,
            "numero_factura": cambio_data.numero_factura,
            "cliente": cambio_data.cliente,
            "documento_cliente": cambio_data.documento_cliente,
            "producto_original": cambio_data.producto_original,
            "producto_nuevo": cambio_data.producto_nuevo,
            "diferencia_precio": cambio_data.diferencia_precio,
            "con_etiqueta": cambio_data.con_etiqueta,
            "buen_estado": cambio_data.buen_estado,
            "observaciones": cambio_data.observaciones,
            "realizado_por": cambio_data.realizado_por,
            "created_at": now_colombia().isoformat(),
            "created_by": current_user["username"]
        }
        
        await db.cambios.insert_one(cambio)
        
        # Actualizar inventario: devolver producto original y descontar nuevo
        # Producto original vuelve al inventario
        await db.products.update_one(
            {"id": cambio_data.producto_original["product_id"]},
            {"$inc": {"cantidad_stock": 1}}
        )
        
        # Producto nuevo sale del inventario
        producto_nuevo = await db.products.find_one({"id": cambio_data.producto_nuevo["product_id"]})
        if not producto_nuevo or producto_nuevo["cantidad_stock"] < 1:
            raise HTTPException(status_code=400, detail="Producto nuevo sin stock")
        
        await db.products.update_one(
            {"id": cambio_data.producto_nuevo["product_id"]},
            {"$inc": {"cantidad_stock": -1}}
        )
        
        # Crear notificación si hay diferencia de precio
        if cambio_data.diferencia_precio != 0:
            notification = {
                "id": str(uuid.uuid4()),
                "tipo": "cambio_diferencia",
                "titulo": f"Cambio con diferencia de precio",
                "mensaje": f"Cliente {cambio_data.cliente} - Diferencia: ${abs(cambio_data.diferencia_precio):,.0f}",
                "leida": False,
                "created_at": now_colombia().isoformat()
            }
            await db.notifications.insert_one(notification)
        
        return {"message": "Cambio procesado exitosamente", "cambio_id": cambio["id"]}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/cambios")
async def get_cambios(current_user: dict = Depends(get_current_user)):
    """Obtener historial de cambios"""
    cambios = await db.cambios.find({}, {"_id": 0}).to_list(1000)
    return cambios

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
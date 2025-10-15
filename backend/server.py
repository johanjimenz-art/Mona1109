from fastapi import FastAPI, APIRouter, HTTPException, Depends, UploadFile, File
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.responses import FileResponse
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
import bcrypt
import jwt
import base64
import shutil

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

class User(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    username: str
    password_hash: str
    role: str = "user"  # "admin" or "user"
    permissions: UserPermissions = Field(default_factory=UserPermissions)
    created_by: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

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
    cantidad_stock: int
    imagen_url: Optional[str] = None
    aprobado: bool = False
    created_by: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

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
    subtotal: float
    imagen_url: Optional[str] = None

class Sale(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    nombre_cliente: str
    documento_cliente: str
    direccion_cliente: str
    celular_cliente: str
    items: List[SaleItem]
    total: float
    estado_despacho: str = "pendiente"  # pendiente, en_camino, despachado
    created_by: Optional[str] = None  # Hacer opcional para ventas viejas
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class SaleCreate(BaseModel):
    nombre_cliente: str
    documento_cliente: str
    direccion_cliente: str
    celular_cliente: str
    items: List[SaleItem]

class SaleUpdateStatus(BaseModel):
    estado_despacho: str

class Notification(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    tipo: str  # nueva_venta, cambio_estado
    mensaje: str
    sale_id: str
    leido: bool = False
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

# ============ Auth Helper Functions ============

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))

def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
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
    doc['permissions'] = doc['permissions'].model_dump()
    await db.users.insert_one(doc)
    
    access_token = create_access_token(data={
        "sub": user.username, 
        "role": user.role,
        "permissions": permissions.model_dump()
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
    admin_permissions = UserPermissions(inventario=True, venta=True, despacho=True)
    
    user = User(
        username=user_data.username,
        password_hash=hash_password(user_data.password),
        role="admin",
        permissions=admin_permissions,
        created_by="system"
    )
    
    doc = user.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
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

@api_router.post("/sales", response_model=Sale)
async def create_sale(sale_data: SaleCreate, current_user: dict = Depends(get_current_user)):
    total = sum(item.subtotal for item in sale_data.items)
    
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
        nombre_cliente=sale_data.nombre_cliente,
        documento_cliente=sale_data.documento_cliente,
        direccion_cliente=sale_data.direccion_cliente,
        celular_cliente=sale_data.celular_cliente,
        items=[item.model_dump() for item in sale_data.items],
        total=total,
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

@api_router.get("/sales", response_model=List[Sale])
async def get_sales(current_user: dict = Depends(get_current_user)):
    sales = await db.sales.find({}, {"_id": 0}).sort("created_at", -1).to_list(1000)
    
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
    
    result = await db.sales.update_one(
        {"id": sale_id},
        {"$set": {
            "estado_despacho": status_data.estado_despacho,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
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

# ============ Stats Route ============

@api_router.get("/stats")
async def get_stats(current_user: dict = Depends(get_current_user)):
    total_products = await db.products.count_documents({"aprobado": True})
    total_sales = await db.sales.count_documents({})
    
    stats = {
        "total_products": total_products,
        "total_sales": total_sales
    }
    
    # Only admins see financial data
    if current_user["role"] == "admin":
        sales = await db.sales.find({}, {"_id": 0, "total": 1}).to_list(10000)
        total_revenue = sum(sale['total'] for sale in sales)
        
        products = await db.products.find(
            {"aprobado": True},
            {"_id": 0, "cantidad_stock": 1, "precio_venta": 1}
        ).to_list(10000)
        total_stock_value = sum(p['cantidad_stock'] * p['precio_venta'] for p in products)
        
        stats["total_revenue"] = total_revenue
        stats["total_stock_value"] = total_stock_value
    
    return stats

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
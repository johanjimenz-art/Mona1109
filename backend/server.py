from fastapi import FastAPI, APIRouter, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
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

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# ============ Models ============

class User(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    username: str
    password_hash: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class UserCreate(BaseModel):
    username: str
    password: str

class UserLogin(BaseModel):
    username: str
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str
    username: str

class Product(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    descripcion: str
    referencia: str
    color: str
    costo_fabricacion: float
    talla: str
    precio_venta: float
    cantidad_stock: int
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ProductCreate(BaseModel):
    descripcion: str
    referencia: str
    color: str
    costo_fabricacion: float
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

class SaleItem(BaseModel):
    product_id: str
    referencia: str
    descripcion: str
    talla: str
    color: str
    precio_venta: float
    cantidad: int
    subtotal: float

class Sale(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    nombre_cliente: str
    documento_cliente: str
    direccion_cliente: str
    celular_cliente: str
    items: List[SaleItem]
    total: float
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class SaleCreate(BaseModel):
    nombre_cliente: str
    documento_cliente: str
    direccion_cliente: str
    celular_cliente: str
    items: List[SaleItem]

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
        if username is None:
            raise HTTPException(status_code=401, detail="Invalid authentication credentials")
        return username
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token has expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

# ============ Auth Routes ============

@api_router.post("/auth/register", response_model=Token)
async def register(user_data: UserCreate):
    # Check if user exists
    existing_user = await db.users.find_one({"username": user_data.username})
    if existing_user:
        raise HTTPException(status_code=400, detail="Username already registered")
    
    # Create user
    user = User(
        username=user_data.username,
        password_hash=hash_password(user_data.password)
    )
    
    doc = user.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    await db.users.insert_one(doc)
    
    # Create token
    access_token = create_access_token(data={"sub": user.username})
    return Token(access_token=access_token, token_type="bearer", username=user.username)

@api_router.post("/auth/login", response_model=Token)
async def login(user_data: UserLogin):
    # Find user
    user = await db.users.find_one({"username": user_data.username})
    if not user or not verify_password(user_data.password, user['password_hash']):
        raise HTTPException(status_code=401, detail="Invalid username or password")
    
    # Create token
    access_token = create_access_token(data={"sub": user['username']})
    return Token(access_token=access_token, token_type="bearer", username=user['username'])

@api_router.get("/auth/me")
async def get_me(username: str = Depends(get_current_user)):
    return {"username": username}

# ============ Product Routes ============

@api_router.post("/products", response_model=Product)
async def create_product(product_data: ProductCreate, username: str = Depends(get_current_user)):
    product = Product(**product_data.model_dump())
    
    doc = product.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    await db.products.insert_one(doc)
    
    return product

@api_router.get("/products", response_model=List[Product])
async def get_products(username: str = Depends(get_current_user)):
    products = await db.products.find({}, {"_id": 0}).to_list(1000)
    
    for product in products:
        if isinstance(product['created_at'], str):
            product['created_at'] = datetime.fromisoformat(product['created_at'])
    
    return products

@api_router.get("/products/search")
async def search_products(referencia: str, talla: str, color: str, username: str = Depends(get_current_user)):
    product = await db.products.find_one({
        "referencia": referencia,
        "talla": talla,
        "color": color
    }, {"_id": 0})
    
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    if isinstance(product['created_at'], str):
        product['created_at'] = datetime.fromisoformat(product['created_at'])
    
    return product

@api_router.put("/products/{product_id}", response_model=Product)
async def update_product(product_id: str, product_data: ProductUpdate, username: str = Depends(get_current_user)):
    update_dict = {k: v for k, v in product_data.model_dump().items() if v is not None}
    
    if not update_dict:
        raise HTTPException(status_code=400, detail="No fields to update")
    
    result = await db.products.update_one({"id": product_id}, {"$set": update_dict})
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Product not found")
    
    product = await db.products.find_one({"id": product_id}, {"_id": 0})
    if isinstance(product['created_at'], str):
        product['created_at'] = datetime.fromisoformat(product['created_at'])
    
    return product

@api_router.delete("/products/{product_id}")
async def delete_product(product_id: str, username: str = Depends(get_current_user)):
    result = await db.products.delete_one({"id": product_id})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Product not found")
    
    return {"message": "Product deleted successfully"}

# ============ Sales Routes ============

@api_router.post("/sales", response_model=Sale)
async def create_sale(sale_data: SaleCreate, username: str = Depends(get_current_user)):
    # Calculate total
    total = sum(item.subtotal for item in sale_data.items)
    
    # Update inventory for each item
    for item in sale_data.items:
        product = await db.products.find_one({"id": item.product_id})
        
        if not product:
            raise HTTPException(status_code=404, detail=f"Product {item.referencia} not found")
        
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
        total=total
    )
    
    doc = sale.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    await db.sales.insert_one(doc)
    
    return sale

@api_router.get("/sales", response_model=List[Sale])
async def get_sales(username: str = Depends(get_current_user)):
    sales = await db.sales.find({}, {"_id": 0}).sort("created_at", -1).to_list(1000)
    
    for sale in sales:
        if isinstance(sale['created_at'], str):
            sale['created_at'] = datetime.fromisoformat(sale['created_at'])
    
    return sales

@api_router.get("/sales/{sale_id}", response_model=Sale)
async def get_sale(sale_id: str, username: str = Depends(get_current_user)):
    sale = await db.sales.find_one({"id": sale_id}, {"_id": 0})
    
    if not sale:
        raise HTTPException(status_code=404, detail="Sale not found")
    
    if isinstance(sale['created_at'], str):
        sale['created_at'] = datetime.fromisoformat(sale['created_at'])
    
    return sale

# ============ Stats Route ============

@api_router.get("/stats")
async def get_stats(username: str = Depends(get_current_user)):
    total_products = await db.products.count_documents({})
    total_sales = await db.sales.count_documents({})
    
    # Calculate total revenue
    sales = await db.sales.find({}, {"_id": 0, "total": 1}).to_list(10000)
    total_revenue = sum(sale['total'] for sale in sales)
    
    # Calculate total stock value
    products = await db.products.find({}, {"_id": 0, "cantidad_stock": 1, "precio_venta": 1}).to_list(10000)
    total_stock_value = sum(p['cantidad_stock'] * p['precio_venta'] for p in products)
    
    return {
        "total_products": total_products,
        "total_sales": total_sales,
        "total_revenue": total_revenue,
        "total_stock_value": total_stock_value
    }

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
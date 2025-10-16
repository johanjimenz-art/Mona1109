import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { ArrowLeft, Plus, Trash2, ShoppingCart, Image as ImageIcon, ChevronDown } from 'lucide-react';
import { toast } from 'sonner';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function Sales() {
  const navigate = useNavigate();
  const [clientData, setClientData] = useState({
    nombre_cliente: '',
    documento_cliente: '',
    direccion_cliente: '',
    celular_cliente: ''
  });
  const [cart, setCart] = useState([]);
  const [searchData, setSearchData] = useState({
    referencia: '',
    talla: '',
    color: ''
  });
  const [cantidad, setCantidad] = useState(1);
  const [products, setProducts] = useState([]);
  const [uniqueReferencias, setUniqueReferencias] = useState([]);
  const [availableTallas, setAvailableTallas] = useState([]);
  const [availableColors, setAvailableColors] = useState([]);

  const handleClientChange = (e) => {
    setClientData({ ...clientData, [e.target.name]: e.target.value });
  };

  const handleSearchChange = (e) => {
    setSearchData({ ...searchData, [e.target.name]: e.target.value });
  };

  const addToCart = async () => {
    if (!searchData.referencia || !searchData.talla || !searchData.color) {
      toast.error('Complete todos los campos de búsqueda');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${API}/products/search?referencia=${searchData.referencia}&talla=${searchData.talla}&color=${searchData.color}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const product = response.data;

      if (product.cantidad_stock < cantidad) {
        toast.error(`Stock insuficiente. Disponible: ${product.cantidad_stock}`);
        return;
      }

      // Check if product already in cart
      const existingIndex = cart.findIndex(item => item.product_id === product.id);
      if (existingIndex >= 0) {
        const newCart = [...cart];
        const newCantidad = newCart[existingIndex].cantidad + cantidad;
        if (newCantidad > product.cantidad_stock) {
          toast.error(`Stock insuficiente. Disponible: ${product.cantidad_stock}`);
          return;
        }
        newCart[existingIndex].cantidad = newCantidad;
        newCart[existingIndex].subtotal = newCantidad * product.precio_venta;
        setCart(newCart);
      } else {
        const item = {
          product_id: product.id,
          referencia: product.referencia,
          descripcion: product.descripcion,
          talla: product.talla,
          color: product.color,
          precio_venta: product.precio_venta,
          cantidad: cantidad,
          subtotal: cantidad * product.precio_venta,
          imagen_url: product.imagen_url
        };
        setCart([...cart, item]);
      }

      setSearchData({ referencia: '', talla: '', color: '' });
      setCantidad(1);
      toast.success('Producto agregado al carrito');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Producto no encontrado');
    }
  };

  const removeFromCart = (index) => {
    const newCart = cart.filter((_, i) => i !== index);
    setCart(newCart);
    toast.success('Producto removido del carrito');
  };

  const calculateTotal = () => {
    return cart.reduce((sum, item) => sum + item.subtotal, 0);
  };

  const handleSubmitSale = async () => {
    if (!clientData.nombre_cliente || !clientData.documento_cliente || !clientData.direccion_cliente || !clientData.celular_cliente) {
      toast.error('Complete todos los datos del cliente');
      return;
    }

    if (cart.length === 0) {
      toast.error('Agregue productos al carrito');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `${API}/sales`,
        {
          ...clientData,
          items: cart
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      toast.success('Venta realizada exitosamente. Se ha enviado notificación al equipo.');
      setClientData({
        nombre_cliente: '',
        documento_cliente: '',
        direccion_cliente: '',
        celular_cliente: ''
      });
      setCart([]);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error al realizar la venta');
    }
  };

  return (
    <div className="min-h-screen bg-white">
      <div className="border-b-4 border-black bg-white">
        <div className="max-w-7xl mx-auto px-8 py-6 flex items-center gap-4">
          <Button
            data-testid="back-btn"
            onClick={() => navigate('/')}
            variant="outline"
            className="border-2 border-black rounded-none hover:bg-black hover:text-white"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <h1 className="text-3xl font-bold text-black" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
            Realizar Venta
          </h1>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Column */}
          <div className="space-y-8">
            {/* Client Data */}
            <div className="bg-white border-4 border-black p-6">
              <h2 className="text-xl font-bold mb-4" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                Datos del Cliente
              </h2>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="nombre_cliente" className="text-black font-medium mb-2 block">Nombre</Label>
                  <Input
                    id="nombre_cliente"
                    data-testid="nombre-cliente-input"
                    name="nombre_cliente"
                    value={clientData.nombre_cliente}
                    onChange={handleClientChange}
                    className="rounded-none border-2 border-black"
                  />
                </div>
                <div>
                  <Label htmlFor="documento_cliente" className="text-black font-medium mb-2 block">Documento</Label>
                  <Input
                    id="documento_cliente"
                    data-testid="documento-cliente-input"
                    name="documento_cliente"
                    value={clientData.documento_cliente}
                    onChange={handleClientChange}
                    className="rounded-none border-2 border-black"
                  />
                </div>
                <div>
                  <Label htmlFor="direccion_cliente" className="text-black font-medium mb-2 block">Dirección</Label>
                  <Input
                    id="direccion_cliente"
                    data-testid="direccion-cliente-input"
                    name="direccion_cliente"
                    value={clientData.direccion_cliente}
                    onChange={handleClientChange}
                    className="rounded-none border-2 border-black"
                  />
                </div>
                <div>
                  <Label htmlFor="celular_cliente" className="text-black font-medium mb-2 block">Celular</Label>
                  <Input
                    id="celular_cliente"
                    data-testid="celular-cliente-input"
                    name="celular_cliente"
                    value={clientData.celular_cliente}
                    onChange={handleClientChange}
                    className="rounded-none border-2 border-black"
                  />
                </div>
              </div>
            </div>

            {/* Product Search */}
            <div className="bg-white border-4 border-black p-6">
              <h2 className="text-xl font-bold mb-4" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                Buscar Producto
              </h2>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="referencia" className="text-black font-medium mb-2 block">Referencia</Label>
                    <Input
                      id="referencia"
                      data-testid="referencia-search-input"
                      name="referencia"
                      value={searchData.referencia}
                      onChange={handleSearchChange}
                      className="rounded-none border-2 border-black"
                    />
                  </div>
                  <div>
                    <Label htmlFor="talla" className="text-black font-medium mb-2 block">Talla</Label>
                    <Input
                      id="talla"
                      data-testid="talla-search-input"
                      name="talla"
                      value={searchData.talla}
                      onChange={handleSearchChange}
                      className="rounded-none border-2 border-black"
                    />
                  </div>
                  <div>
                    <Label htmlFor="color" className="text-black font-medium mb-2 block">Color</Label>
                    <Input
                      id="color"
                      data-testid="color-search-input"
                      name="color"
                      value={searchData.color}
                      onChange={handleSearchChange}
                      className="rounded-none border-2 border-black"
                    />
                  </div>
                  <div>
                    <Label htmlFor="cantidad" className="text-black font-medium mb-2 block">Cantidad</Label>
                    <Input
                      id="cantidad"
                      data-testid="cantidad-search-input"
                      type="number"
                      min="1"
                      value={cantidad}
                      onChange={(e) => setCantidad(parseInt(e.target.value) || 1)}
                      className="rounded-none border-2 border-black"
                    />
                  </div>
                </div>
                <Button
                  data-testid="add-to-cart-btn"
                  onClick={addToCart}
                  className="w-full bg-black text-white hover:bg-gray-800 rounded-none h-12"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Agregar al Carrito
                </Button>
              </div>
            </div>
          </div>

          {/* Right Column - Cart */}
          <div>
            <div className="bg-white border-4 border-black p-6 sticky top-8">
              <div className="flex items-center gap-2 mb-6">
                <ShoppingCart className="w-6 h-6" />
                <h2 className="text-xl font-bold" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                  Carrito de Compra
                </h2>
              </div>

              <div className="space-y-4 mb-6 max-h-96 overflow-y-auto">
                {cart.map((item, index) => (
                  <div key={index} className="border-2 border-black p-4" data-testid={`cart-item-${index}`}>
                    <div className="flex gap-4">
                      {item.imagen_url ? (
                        <img 
                          src={`${BACKEND_URL}${item.imagen_url}`} 
                          alt={item.descripcion}
                          className="w-16 h-16 object-cover border-2 border-black"
                        />
                      ) : (
                        <div className="w-16 h-16 border-2 border-black flex items-center justify-center bg-gray-200">
                          <ImageIcon className="w-8 h-8 text-gray-400" />
                        </div>
                      )}
                      <div className="flex-1">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <p className="font-bold">{item.referencia}</p>
                            <p className="text-sm text-gray-600">{item.descripcion}</p>
                            <p className="text-sm">Talla: {item.talla} | Color: {item.color}</p>
                          </div>
                          <Button
                            data-testid={`remove-cart-item-btn-${index}`}
                            onClick={() => removeFromCart(index)}
                            variant="outline"
                            size="sm"
                            className="border-2 border-black rounded-none hover:bg-red-600 hover:text-white hover:border-red-600"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                        <div className="flex justify-between items-center mt-2 pt-2 border-t-2 border-black">
                          <span className="text-sm">Cantidad: {item.cantidad}</span>
                          <span className="font-bold">${item.subtotal.toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                {cart.length === 0 && (
                  <p className="text-center text-gray-500 py-8" data-testid="empty-cart">El carrito está vacío</p>
                )}
              </div>

              <div className="border-t-4 border-black pt-4 mb-6">
                <div className="flex justify-between items-center">
                  <span className="text-xl font-bold">Total:</span>
                  <span className="text-3xl font-bold" data-testid="cart-total">${calculateTotal().toLocaleString()}</span>
                </div>
              </div>

              <Button
                data-testid="complete-sale-btn"
                onClick={handleSubmitSale}
                disabled={cart.length === 0}
                className="w-full bg-black text-white hover:bg-gray-800 rounded-none h-14 text-lg font-bold"
              >
                Completar Venta
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
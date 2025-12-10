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
    talla: ''
  });
  const [cantidad, setCantidad] = useState(1);
  const [products, setProducts] = useState([]);
  const [uniqueReferencias, setUniqueReferencias] = useState([]);
  const [availableTallas, setAvailableTallas] = useState([]);
  const [observaciones, setObservaciones] = useState('');
  
  // Credit sale states
  const [isCredit, setIsCredit] = useState(false);
  const [creditData, setCreditData] = useState({
    abono_inicial: '',
    fecha_pago: '',
    observaciones: ''
  });

  // Get user permissions
  const permissions = JSON.parse(localStorage.getItem('permissions') || '{}');
  const canApplyDiscount = permissions.descuentos || false;
  const role = localStorage.getItem('role');

  const fetchProducts = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API}/products`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Filter only approved products
      const approvedProducts = response.data.filter(p => p.aprobado);
      setProducts(approvedProducts);
      
      // Get unique references
      const refs = [...new Set(approvedProducts.map(p => p.referencia))];
      setUniqueReferencias(refs);
    } catch (error) {
      toast.error('Error al cargar productos');
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  useEffect(() => {
    // Update available tallas when referencia changes
    if (searchData.referencia) {
      const filtered = products.filter(p => p.referencia === searchData.referencia);
      const tallas = [...new Set(filtered.map(p => p.talla))];
      setAvailableTallas(tallas);
      
      // Reset talla if not available
      if (!tallas.includes(searchData.talla)) {
        setSearchData(prev => ({ ...prev, talla: '' }));
      }
    } else {
      setAvailableTallas([]);
    }
  }, [searchData.referencia, products]);

  const handleClientChange = (e) => {
    setClientData({ ...clientData, [e.target.name]: e.target.value });
  };

  const getProductBySelection = () => {
    return products.find(p => 
      p.referencia === searchData.referencia && 
      p.talla === searchData.talla && 
      p.aprobado
    );
  };

  const getProductImage = (referencia) => {
    const product = products.find(p => p.referencia === referencia && p.imagen_url);
    return product?.imagen_url;
  };


  const addToCart = async () => {
    if (!searchData.referencia || !searchData.talla) {
      toast.error('Complete todos los campos de búsqueda');
      return;
    }

    const product = getProductBySelection();
    
    if (!product) {
      toast.error('Producto no encontrado o no aprobado');
      return;
    }

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
      newCart[existingIndex].subtotal = newCantidad * product.precio_venta - (newCart[existingIndex].descuento || 0);
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
        descuento: 0,
        descuento_porcentaje: 0,
        subtotal: cantidad * product.precio_venta,
        imagen_url: product.imagen_url
      };
      setCart([...cart, item]);
    }

    setSearchData({ referencia: '', talla: '' });
    setCantidad(1);
    toast.success('Producto agregado al carrito');
  };

  const removeFromCart = (index) => {
    const newCart = cart.filter((_, i) => i !== index);
    setCart(newCart);
    toast.success('Producto removido del carrito');
  };


  const applyDiscount = (index, discountValue, isPercentage) => {
    if (!canApplyDiscount && role !== 'admin') {
      toast.error('No tienes permiso para aplicar descuentos');
      return;
    }

    const newCart = [...cart];
    const item = newCart[index];
    const basePrice = item.precio_venta * item.cantidad;

    if (isPercentage) {
      const percentage = parseFloat(discountValue) || 0;
      if (percentage < 0 || percentage > 100) {
        toast.error('El porcentaje debe estar entre 0 y 100');
        return;
      }
      item.descuento_porcentaje = percentage;
      item.descuento = (basePrice * percentage) / 100;
    } else {
      const discount = parseFloat(discountValue) || 0;
      if (discount < 0 || discount > basePrice) {
        toast.error('El descuento no puede ser mayor al precio total del producto');
        return;
      }
      item.descuento = discount;
      item.descuento_porcentaje = basePrice > 0 ? (discount / basePrice) * 100 : 0;
    }

    item.subtotal = basePrice - item.descuento;
    setCart(newCart);
  };


  const calculateTotal = () => {
    return cart.reduce((sum, item) => sum + item.subtotal, 0);
  };


  const calculateSubtotalBeforeDiscount = () => {
    return cart.reduce((sum, item) => sum + (item.precio_venta * item.cantidad), 0);
  };

  const calculateTotalDiscount = () => {
    return cart.reduce((sum, item) => sum + (item.descuento || 0), 0);
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

    // Validate credit data if is credit sale
    if (isCredit) {
      if (!creditData.abono_inicial || parseFloat(creditData.abono_inicial) < 0) {
        toast.error('Ingrese un abono inicial válido');
        return;
      }
      if (!creditData.fecha_pago) {
        toast.error('Seleccione la fecha de pago');
        return;
      }
      
      const total = calculateTotal();
      if (parseFloat(creditData.abono_inicial) > total) {
        toast.error('El abono inicial no puede ser mayor al total');
        return;
      }
    }

    try {
      const token = localStorage.getItem('token');
      const username = localStorage.getItem('username');
      
      const subtotalBeforeDiscount = calculateSubtotalBeforeDiscount();
      const totalDiscount = calculateTotalDiscount();
      const total = calculateTotal();
      
      // Create sale first
      const saleResponse = await axios.post(
        `${API}/sales`,
        {
          ...clientData,
          items: cart,
          subtotal: subtotalBeforeDiscount,
          descuento_total: totalDiscount,
          total: total,
          aplicado_por: totalDiscount > 0 ? username : null
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // If credit sale, create credit record
      if (isCredit) {
        await axios.post(
          `${API}/credit-sales`,
          {
            sale_id: saleResponse.data.id,
            abono_inicial: parseFloat(creditData.abono_inicial),
            fecha_pago: new Date(creditData.fecha_pago).toISOString(),
            observaciones: creditData.observaciones
          },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        toast.success('Venta a crédito registrada exitosamente');
      } else {
        toast.success('Venta realizada exitosamente');
      }

      // Reset form
      setClientData({
        nombre_cliente: '',
        documento_cliente: '',
        direccion_cliente: '',
        celular_cliente: ''
      });
      setCart([]);
      setIsCredit(false);
      setCreditData({
        abono_inicial: '',
        fecha_pago: '',
        observaciones: ''
      });
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
                <div>
                  <Label htmlFor="referencia" className="text-black font-medium mb-2 block">Referencia</Label>
                  <Select 
                    value={searchData.referencia} 
                    onValueChange={(value) => setSearchData({ ...searchData, referencia: value })}
                  >
                    <SelectTrigger className="rounded-none border-2 border-black h-10" data-testid="referencia-select">
                      <SelectValue placeholder="Selecciona una referencia" />
                    </SelectTrigger>
                    <SelectContent className="max-h-60 border-2 border-black rounded-none">
                      {uniqueReferencias.map((ref) => {
                        const productInfo = products.find(p => p.referencia === ref);
                        const imageUrl = getProductImage(ref);
                        return (
                          <SelectItem key={ref} value={ref} className="py-2">
                            <div className="flex items-center gap-2">
                              {imageUrl ? (
                                <img 
                                  src={`${BACKEND_URL}${imageUrl}`}
                                  alt={ref}
                                  className="w-8 h-8 object-cover border border-black"
                                />
                              ) : (
                                <div className="w-8 h-8 border border-black flex items-center justify-center bg-gray-200">
                                  <ImageIcon className="w-4 h-4 text-gray-400" />
                                </div>
                              )}
                              <div className="text-sm">
                                <p className="font-medium">{ref}</p>
                                {productInfo && (
                                  <p className="text-xs text-gray-600">{productInfo.descripcion}</p>
                                )}
                              </div>
                            </div>
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="talla" className="text-black font-medium mb-2 block">Talla</Label>
                  <Select 
                    value={searchData.talla} 
                    onValueChange={(value) => setSearchData({ ...searchData, talla: value })}
                    disabled={!searchData.referencia}
                  >
                    <SelectTrigger className="rounded-none border-2 border-black h-10" data-testid="talla-select">
                      <SelectValue placeholder="Selecciona talla" />
                    </SelectTrigger>
                    <SelectContent className="border-2 border-black rounded-none">
                      {availableTallas.map((talla) => (
                        <SelectItem key={talla} value={talla}>{talla}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
                    className="rounded-none border-2 border-black h-10"
                  />
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
                  <div key={index} className="border-2 border-black p-3" data-testid={`cart-item-${index}`}>
                    <div className="flex gap-3">
                      {item.imagen_url ? (
                        <img 
                          src={`${BACKEND_URL}${item.imagen_url}`} 
                          alt={item.descripcion}
                          className="w-12 h-12 object-cover border-2 border-black flex-shrink-0"
                        />
                      ) : (
                        <div className="w-12 h-12 border-2 border-black flex items-center justify-center bg-gray-200 flex-shrink-0">
                          <ImageIcon className="w-6 h-6 text-gray-400" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex-1 min-w-0 pr-2">
                            <p className="font-bold text-sm truncate">{item.referencia}</p>
                            <p className="text-xs text-gray-600 truncate">{item.descripcion}</p>
                            <p className="text-xs">Talla: {item.talla} | Color: {item.color}</p>
                            <p className="text-xs text-gray-700">Precio: ${item.precio_venta.toLocaleString()} x {item.cantidad}</p>
                          </div>
                          <Button
                            data-testid={`remove-cart-item-btn-${index}`}
                            onClick={() => removeFromCart(index)}
                            variant="outline"
                            size="sm"
                            className="border-2 border-black rounded-none hover:bg-red-600 hover:text-white hover:border-red-600 flex-shrink-0 h-8 w-8 p-0"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>

                        {/* Discount Section - Only if user has permission */}
                        {(canApplyDiscount || role === 'admin') && (
                          <div className="mb-2 p-2 bg-gray-50 border border-gray-300">
                            <p className="text-xs font-bold mb-1">Aplicar Descuento:</p>
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <Input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  placeholder="$ Monto"
                                  className="h-7 text-xs border-black"
                                  onBlur={(e) => {
                                    if (e.target.value) {
                                      applyDiscount(index, e.target.value, false);
                                    }
                                  }}
                                />
                              </div>
                              <div>
                                <Input
                                  type="number"
                                  min="0"
                                  max="100"
                                  step="1"
                                  placeholder="% Porcentaje"
                                  className="h-7 text-xs border-black"
                                  onBlur={(e) => {
                                    if (e.target.value) {
                                      applyDiscount(index, e.target.value, true);
                                    }
                                  }}
                                />
                              </div>
                            </div>
                            {item.descuento > 0 && (
                              <p className="text-xs text-green-600 font-bold mt-1">
                                Descuento aplicado: ${item.descuento.toLocaleString()} ({item.descuento_porcentaje.toFixed(1)}%)
                              </p>
                            )}
                          </div>
                        )}

                        <div className="flex justify-between items-center pt-2 border-t-2 border-black">
                          <span className="text-xs">Cantidad: {item.cantidad}</span>
                          <div className="text-right">
                            {item.descuento > 0 && (
                              <p className="text-xs text-gray-500 line-through">
                                ${(item.precio_venta * item.cantidad).toLocaleString()}
                              </p>
                            )}
                            <span className="font-bold text-sm">${item.subtotal.toLocaleString()}</span>
                          </div>
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
                {calculateTotalDiscount() > 0 && (
                  <>
                    <div className="flex justify-between items-center text-sm mb-1">
                      <span className="text-gray-600">Subtotal:</span>
                      <span className="text-gray-600">${calculateSubtotalBeforeDiscount().toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm mb-2">
                      <span className="text-green-600 font-bold">Descuento Total:</span>
                      <span className="text-green-600 font-bold">-${calculateTotalDiscount().toLocaleString()}</span>
                    </div>
                  </>
                )}
                <div className="flex justify-between items-center">
                  <span className="text-xl font-bold">Total:</span>
                  <span className="text-3xl font-bold" data-testid="cart-total">${calculateTotal().toLocaleString()}</span>
                </div>
              </div>

              {/* Credit Sale Option */}
              <div className="mb-6 border-2 border-black p-4">
                <div className="flex items-center gap-2 mb-4">
                  <input
                    type="checkbox"
                    id="is-credit"
                    checked={isCredit}
                    onChange={(e) => setIsCredit(e.target.checked)}
                    className="w-4 h-4 border-2 border-black"
                  />
                  <label htmlFor="is-credit" className="font-bold cursor-pointer">
                    Venta a Crédito
                  </label>
                </div>

                {isCredit && (
                  <div className="space-y-3 border-t-2 border-black pt-3">
                    <div>
                      <Label htmlFor="abono-inicial" className="text-sm">Abono Inicial ($)</Label>
                      <Input
                        id="abono-inicial"
                        type="number"
                        min="0"
                        step="0.01"
                        value={creditData.abono_inicial}
                        onChange={(e) => setCreditData({ ...creditData, abono_inicial: e.target.value })}
                        className="rounded-none border-2 border-black h-10"
                        placeholder="0.00"
                      />
                    </div>
                    <div>
                      <Label htmlFor="fecha-pago" className="text-sm">Fecha de Pago</Label>
                      <Input
                        id="fecha-pago"
                        type="date"
                        value={creditData.fecha_pago}
                        onChange={(e) => setCreditData({ ...creditData, fecha_pago: e.target.value })}
                        className="rounded-none border-2 border-black h-10"
                        min={new Date().toISOString().split('T')[0]}
                      />
                    </div>
                    <div>
                      <Label htmlFor="credit-observations" className="text-sm">Observaciones</Label>
                      <Input
                        id="credit-observations"
                        value={creditData.observaciones}
                        onChange={(e) => setCreditData({ ...creditData, observaciones: e.target.value })}
                        className="rounded-none border-2 border-black h-10"
                        placeholder="Notas adicionales"
                      />
                    </div>
                    {creditData.abono_inicial && (
                      <div className="bg-gray-100 p-2 border-2 border-black">
                        <p className="text-sm">
                          <span className="font-bold">Saldo Pendiente:</span> $
                          {(calculateTotal() - parseFloat(creditData.abono_inicial || 0)).toLocaleString()}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <Button
                data-testid="complete-sale-btn"
                onClick={handleSubmitSale}
                disabled={cart.length === 0}
                className="w-full bg-black text-white hover:bg-gray-800 rounded-none h-14 text-lg font-bold"
              >
                {isCredit ? 'Registrar Venta a Crédito' : 'Completar Venta'}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
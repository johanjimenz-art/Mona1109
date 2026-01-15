import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { ArrowLeft, Plus, Trash2, ShoppingCart, Image as ImageIcon, ChevronDown } from 'lucide-react';
import { toast } from './ui/simple-toast';
import jsPDF from 'jspdf';
import { formatInTimeZone } from 'date-fns-tz';
import { es } from 'date-fns/locale';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;
const COLOMBIA_TZ = 'America/Bogota';

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
  const [loading, setLoading] = useState(false);
  const [lastSale, setLastSale] = useState(null);
  const [showInvoiceButton, setShowInvoiceButton] = useState(false);
  
  // Client search states
  const [clientSuggestions, setClientSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [searchTimeout, setSearchTimeout] = useState(null);
  
  // Credit sale states
  const [isCredit, setIsCredit] = useState(false);
  const [creditData, setCreditData] = useState({
    abono_inicial: '',
    fecha_pago: '',
    observaciones: ''
  });
  
  // Costo de domicilio y estampado
  const [costoDomicilio, setCostoDomicilio] = useState(0);
  const [costoEstampado, setCostoEstampado] = useState(0);

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

  const generateInvoicePDF = async (sale) => {
    try {
      // Buscar si esta venta tiene un crédito asociado
      let creditInfo = null;
      try {
        const token = localStorage.getItem('token');
        const creditResponse = await axios.get(`${API}/credit-sales`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        creditInfo = creditResponse.data.find(c => c.sale_id === sale.id);
      } catch (error) {
        console.log('No se pudo obtener info de crédito:', error);
      }

      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: [80, 500]
      });

      const pageWidth = 80;
      const margin = 5;
      const contentWidth = pageWidth - (margin * 2);
      let yPosition = margin;

      // Title
      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      doc.text('ON-OF', pageWidth / 2, yPosition, { align: 'center' });
      yPosition += 6;
      
      doc.setFontSize(12);
      doc.text('FACTURA DE VENTA', pageWidth / 2, yPosition, { align: 'center' });
      yPosition += 8;

      // Invoice details
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.text(`No: ${sale.numero_factura || 'N/A'}`, pageWidth / 2, yPosition, { align: 'center' });
      yPosition += 5;
      
      const saleDate = new Date(sale.created_at);
      doc.text(formatInTimeZone(saleDate, COLOMBIA_TZ, 'dd/MM/yyyy HH:mm', { locale: es }), pageWidth / 2, yPosition, { align: 'center' });
      yPosition += 7;

      // Separator
      doc.setLineWidth(0.3);
      doc.line(margin, yPosition, pageWidth - margin, yPosition);
      yPosition += 5;

      // Client info
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.text('CLIENTE:', margin, yPosition);
      yPosition += 4;
      
      doc.setFont('helvetica', 'normal');
      doc.text(sale.nombre_cliente, margin, yPosition, { maxWidth: contentWidth });
      yPosition += 4;
      doc.text(`Doc: ${sale.documento_cliente}`, margin, yPosition);
      yPosition += 4;
      doc.text(`Tel: ${sale.celular_cliente}`, margin, yPosition);
      yPosition += 4;
      doc.text(sale.direccion_cliente, margin, yPosition, { maxWidth: contentWidth });
      yPosition += 6;

      // Separator
      doc.line(margin, yPosition, pageWidth - margin, yPosition);
      yPosition += 5;

      // Products
      doc.setFont('helvetica', 'bold');
      doc.text('DETALLE DE PRODUCTOS', margin, yPosition);
      yPosition += 5;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      
      sale.items.forEach((item, index) => {
        // Get values with fallbacks for different data structures
        const descripcion = item.descripcion || item.nombre || 'Producto';
        const precioUnitario = item.precio_venta || item.precio_unitario || 0;
        const descuentoPorcentaje = item.descuento_porcentaje || 0;
        
        doc.setFont('helvetica', 'bold');
        doc.text(item.referencia || '', margin, yPosition);
        yPosition += 4;
        
        doc.setFont('helvetica', 'normal');
        doc.text(descripcion.substring(0, 30), margin + 2, yPosition, { maxWidth: contentWidth - 2 });
        yPosition += 4;
        
        doc.text(`Talla: ${item.talla || 'N/A'}`, margin + 2, yPosition);
        doc.text(`Cant: ${item.cantidad || 1}`, pageWidth - margin - 20, yPosition);
        yPosition += 4;
        
        doc.text(`Precio unit: $${precioUnitario.toLocaleString()}`, margin + 2, yPosition);
        yPosition += 4;
        
        const precioTotal = precioUnitario * (item.cantidad || 1);
        doc.text(`Precio total: $${precioTotal.toLocaleString()}`, margin + 2, yPosition);
        yPosition += 4;
        
        if (item.descuento > 0) {
          doc.setTextColor(200, 0, 0);
          const descuentoText = descuentoPorcentaje > 0 
            ? `Descuento: -$${item.descuento.toLocaleString()} (${descuentoPorcentaje.toFixed(1)}%)`
            : `Descuento: -$${item.descuento.toLocaleString()}`;
          doc.text(descuentoText, margin + 2, yPosition);
          doc.setTextColor(0, 0, 0);
          yPosition += 4;
        }
        
        doc.setFont('helvetica', 'bold');
        doc.text(`Subtotal: $${(item.subtotal || 0).toLocaleString()}`, margin + 2, yPosition);
        doc.setFont('helvetica', 'normal');
        yPosition += 6;
        
        if (index < sale.items.length - 1) {
          doc.setDrawColor(200);
          doc.setLineWidth(0.1);
          doc.line(margin + 2, yPosition, pageWidth - margin - 2, yPosition);
          yPosition += 4;
        }
      });

      // Final separator
      doc.setDrawColor(0);
      doc.setLineWidth(0.3);
      doc.line(margin, yPosition, pageWidth - margin, yPosition);
      yPosition += 5;

      // Totals
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      
      // Calcular valores
      const costoDomicilio = sale.costo_domicilio || 0;
      const costoEstampado = sale.costo_estampado || 0;
      const descuentoTotal = sale.descuento_total || 0;
      
      // Calcular subtotal de productos (total - domicilio - estampado)
      const subtotalProductos = (sale.total || 0) - costoDomicilio - costoEstampado;
      
      // Calcular el total final correcto
      const totalFinal = subtotalProductos + costoDomicilio + costoEstampado;
      
      // Siempre mostrar subtotal de productos si hay domicilio, estampado o descuento
      if (descuentoTotal > 0 || costoDomicilio > 0 || costoEstampado > 0) {
        doc.text('Subtotal productos:', margin, yPosition);
        doc.text(`$${subtotalProductos.toLocaleString()}`, pageWidth - margin, yPosition, { align: 'right' });
        yPosition += 5;
      }
      
      if (descuentoTotal > 0) {
        doc.setTextColor(0, 150, 0);
        doc.text('Descuento aplicado:', margin, yPosition);
        doc.text(`-$${descuentoTotal.toLocaleString()}`, pageWidth - margin, yPosition, { align: 'right' });
        doc.setTextColor(0, 0, 0);
        yPosition += 5;
      }
      
      // Costo de domicilio discriminado
      if (costoDomicilio > 0) {
        doc.setTextColor(0, 100, 200);
        doc.text('Domicilio:', margin, yPosition);
        doc.text(`+$${costoDomicilio.toLocaleString()}`, pageWidth - margin, yPosition, { align: 'right' });
        doc.setTextColor(0, 0, 0);
        yPosition += 5;
      }
      
      // Costo de estampado discriminado
      if (costoEstampado > 0) {
        doc.setTextColor(128, 0, 128); // Purple
        doc.text('Estampado:', margin, yPosition);
        doc.text(`+$${costoEstampado.toLocaleString()}`, pageWidth - margin, yPosition, { align: 'right' });
        doc.setTextColor(0, 0, 0);
        yPosition += 5;
      }
      
      // Línea separadora antes del total
      if (descuentoTotal > 0 || costoDomicilio > 0 || costoEstampado > 0) {
        doc.setDrawColor(0);
        doc.setLineWidth(0.2);
        doc.line(margin + 30, yPosition, pageWidth - margin, yPosition);
        yPosition += 3;
      }
      
      // TOTAL FINAL (productos + domicilio + estampado)
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.text('TOTAL:', margin, yPosition);
      doc.text(`$${totalFinal.toLocaleString()}`, pageWidth - margin, yPosition, { align: 'right' });
      yPosition += 8;

      // Credit info if exists
      if (creditInfo) {
        doc.setLineWidth(0.3);
        doc.line(margin, yPosition, pageWidth - margin, yPosition);
        yPosition += 5;
        
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.setTextColor(0, 100, 200);
        doc.text('VENTA A CRÉDITO', pageWidth / 2, yPosition, { align: 'center' });
        yPosition += 6;
        
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.setTextColor(0, 0, 0);
        
        doc.text('Abono inicial:', margin, yPosition);
        doc.text(`$${creditInfo.abono_inicial.toLocaleString()}`, pageWidth - margin, yPosition, { align: 'right' });
        yPosition += 5;
        
        doc.text('Saldo pendiente:', margin, yPosition);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(200, 0, 0);
        doc.text(`$${creditInfo.saldo_pendiente.toLocaleString()}`, pageWidth - margin, yPosition, { align: 'right' });
        doc.setTextColor(0, 0, 0);
        doc.setFont('helvetica', 'normal');
        yPosition += 5;
        
        const fechaPago = new Date(creditInfo.fecha_pago);
        doc.text('Fecha de pago:', margin, yPosition);
        doc.text(formatInTimeZone(fechaPago, COLOMBIA_TZ, 'dd/MM/yyyy', { locale: es }), pageWidth - margin, yPosition, { align: 'right' });
        yPosition += 5;
        
        doc.text('Estado:', margin, yPosition);
        const estadoText = creditInfo.estado === 'pagado' ? 'PAGADO' : 
                          creditInfo.estado === 'pendiente' ? 'PENDIENTE' : 'VENCIDO';
        const estadoColor = creditInfo.estado === 'pagado' ? [0, 150, 0] : 
                           creditInfo.estado === 'pendiente' ? [200, 150, 0] : [200, 0, 0];
        doc.setTextColor(...estadoColor);
        doc.text(estadoText, pageWidth - margin, yPosition, { align: 'right' });
        doc.setTextColor(0, 0, 0);
        yPosition += 6;
        
        if (creditInfo.observaciones) {
          doc.setFontSize(8);
          doc.text('Observaciones crédito:', margin, yPosition);
          yPosition += 4;
          const obsLines = doc.splitTextToSize(creditInfo.observaciones, contentWidth);
          doc.text(obsLines, margin + 2, yPosition);
          yPosition += (obsLines.length * 4) + 2;
        }
      }

      // Sale observations
      if (sale.observaciones) {
        doc.setLineWidth(0.3);
        doc.line(margin, yPosition, pageWidth - margin, yPosition);
        yPosition += 5;
        
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.text('OBSERVACIONES:', margin, yPosition);
        yPosition += 4;
        
        doc.setFont('helvetica', 'normal');
        const obsLines = doc.splitTextToSize(sale.observaciones, contentWidth);
        doc.text(obsLines, margin, yPosition);
        yPosition += (obsLines.length * 4) + 4;
      }

      // Separator
      doc.setLineWidth(0.3);
      doc.line(margin, yPosition, pageWidth - margin, yPosition);
      yPosition += 5;

      // Footer
      doc.setFontSize(7);
      doc.setFont('helvetica', 'italic');
      doc.setTextColor(80, 80, 80);
      doc.text('Gracias por su compra', pageWidth / 2, yPosition, { align: 'center' });
      yPosition += 4;
      doc.text('ON-OF', pageWidth / 2, yPosition, { align: 'center' });
      
      if (sale.created_by) {
        yPosition += 4;
        doc.setFontSize(6);
        doc.text(`Atendido por: ${sale.created_by}`, pageWidth / 2, yPosition, { align: 'center' });
      }
      
      // Policy section
      yPosition += 8;
      doc.setLineWidth(0.2);
      doc.line(margin, yPosition, pageWidth - margin, yPosition);
      yPosition += 4;
      
      doc.setFontSize(4.5);
      doc.setFont('helvetica', 'italic');
      doc.setTextColor(60, 60, 60);
      
      const policyText = `POLÍTICA DE CAMBIO Y GARANTÍA – ON–OF: ON–OF ofrece a sus clientes un periodo de hasta tres (3) meses desde la fecha de compra para realizar cambios de prendas, siempre que estas se encuentren en buen estado, sin signos de uso excesivo, sin manchas, suciedad ni olores, y con la etiqueta original en buen estado, presentando además el comprobante de compra. Los cambios aplican únicamente por otra prenda del mismo valor o abonando la diferencia si se elige una de mayor precio. No se realizan devoluciones de dinero. Quedan excluidas de cambio las prendas de ropa interior, trajes de baño y productos adquiridos en promociones especiales o remates, salvo defecto de fabricación. Asimismo, todas nuestras prendas cuentan con una garantía de seis (6) meses por defectos de fabricación, incluyendo costuras dañadas, desprendimiento de accesorios o fallas de origen en la tela. Esta garantía no cubre daños ocasionados por mal uso, lavado inadecuado, desgaste natural o intervenciones posteriores a la compra. La evaluación del producto es obligatoria y puede tardar entre 24 y 72 horas. Según el resultado, ON–OF podrá proceder con la reparación, reposición o cambio por una prenda equivalente en caso de no haber disponibilidad del mismo modelo. ON–OF se reserva el derecho de rechazar solicitudes que no cumplan con las condiciones aquí establecidas. Al efectuar la compra, el cliente acepta íntegramente esta política.`;
      
      const policyLines = doc.splitTextToSize(policyText, 60);
      doc.text(policyLines, margin, yPosition, { maxWidth: 60, align: 'justify' });
      yPosition += (policyLines.length * 2.5);

      // Save PDF
      const clientNameClean = sale.nombre_cliente.replace(/[^a-zA-Z0-9]/g, '_');
      const fileName = `Factura_${sale.numero_factura || sale.id}_${clientNameClean}.pdf`;
      doc.save(fileName);
      toast.success('Factura descargada exitosamente');
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('Error al generar la factura');
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (searchTimeout) {
        clearTimeout(searchTimeout);
      }
    };
  }, [searchTimeout]);

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

  const searchClients = async (query) => {
    if (!query || query.length < 2) {
      setClientSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API}/clientes/buscar?q=${encodeURIComponent(query)}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setClientSuggestions(response.data);
      setShowSuggestions(response.data.length > 0);
    } catch (error) {
      console.error('Error searching clients:', error);
      setClientSuggestions([]);
      setShowSuggestions(false);
    }
  };

  const handleClientChange = (e) => {
    const { name, value } = e.target;
    setClientData({ ...clientData, [name]: value });

    // Search clients when typing in name or document fields
    if (name === 'nombre_cliente' || name === 'documento_cliente') {
      // Clear previous timeout
      if (searchTimeout) {
        clearTimeout(searchTimeout);
      }

      // Set new timeout for search
      const timeout = setTimeout(() => {
        searchClients(value);
      }, 300); // 300ms delay
      
      setSearchTimeout(timeout);
    }
  };

  const selectClient = (client) => {
    setClientData({
      nombre_cliente: client.nombre_cliente,
      documento_cliente: client.documento_cliente,
      direccion_cliente: client.direccion_cliente,
      celular_cliente: client.celular_cliente
    });
    setShowSuggestions(false);
    setClientSuggestions([]);
    toast.success('Cliente seleccionado');
  };

  const getProductBySelection = () => {
    return products.find(p => 
      p.referencia === searchData.referencia && 
      p.talla === searchData.talla && 
      p.aprobado
    );
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
    setShowInvoiceButton(false); // Ocultar botón al agregar nuevo producto
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
    const subtotal = cart.reduce((sum, item) => sum + item.subtotal, 0);
    return subtotal + (parseFloat(costoDomicilio) || 0) + (parseFloat(costoEstampado) || 0);
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
          costo_domicilio: parseFloat(costoDomicilio) || 0,
          costo_estampado: parseFloat(costoEstampado) || 0,
          total: total,
          aplicado_por: totalDiscount > 0 ? username : null,
          observaciones: observaciones || null
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

      // Guardar la última venta y mostrar botón de descarga
      setLastSale(saleResponse.data);
      setShowInvoiceButton(true);

      // Reset form
      setClientData({
        nombre_cliente: '',
        documento_cliente: '',
        direccion_cliente: '',
        celular_cliente: ''
      });
      setCart([]);
      setObservaciones('');
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
                <div className="relative">
                  <Label htmlFor="nombre_cliente" className="text-black font-medium mb-2 block">Nombre</Label>
                  <Input
                    id="nombre_cliente"
                    data-testid="nombre-cliente-input"
                    name="nombre_cliente"
                    value={clientData.nombre_cliente}
                    onChange={handleClientChange}
                    onFocus={() => {
                      if (clientSuggestions.length > 0) {
                        setShowSuggestions(true);
                      }
                    }}
                    onBlur={() => {
                      // Delay hiding suggestions to allow clicking
                      setTimeout(() => setShowSuggestions(false), 200);
                    }}
                    className="rounded-none border-2 border-black"
                    placeholder="Escriba el nombre del cliente..."
                    autoComplete="off"
                  />
                  
                  {/* Client Suggestions Dropdown */}
                  {showSuggestions && clientSuggestions.length > 0 && (
                    <div className="absolute z-50 w-full mt-1 bg-white border-2 border-black max-h-60 overflow-y-auto">
                      {clientSuggestions.map((client, index) => (
                        <div
                          key={index}
                          className="p-3 hover:bg-gray-100 cursor-pointer border-b border-gray-200 last:border-b-0"
                          onClick={() => selectClient(client)}
                        >
                          <div className="font-medium text-sm">{client.nombre_cliente}</div>
                          <div className="text-xs text-gray-600">Doc: {client.documento_cliente}</div>
                          <div className="text-xs text-gray-600">Tel: {client.celular_cliente}</div>
                          <div className="text-xs text-gray-500 truncate">{client.direccion_cliente}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div className="relative">
                  <Label htmlFor="documento_cliente" className="text-black font-medium mb-2 block">Documento</Label>
                  <Input
                    id="documento_cliente"
                    data-testid="documento-cliente-input"
                    name="documento_cliente"
                    value={clientData.documento_cliente}
                    onChange={handleClientChange}
                    onFocus={() => {
                      if (clientSuggestions.length > 0) {
                        setShowSuggestions(true);
                      }
                    }}
                    onBlur={() => {
                      // Delay hiding suggestions to allow clicking
                      setTimeout(() => setShowSuggestions(false), 200);
                    }}
                    className="rounded-none border-2 border-black"
                    placeholder="Escriba el documento del cliente..."
                    autoComplete="off"
                  />
                  
                  {/* Client Suggestions Dropdown for Document field */}
                  {showSuggestions && clientSuggestions.length > 0 && (
                    <div className="absolute z-50 w-full mt-1 bg-white border-2 border-black max-h-60 overflow-y-auto">
                      {clientSuggestions.map((client, index) => (
                        <div
                          key={index}
                          className="p-3 hover:bg-gray-100 cursor-pointer border-b border-gray-200 last:border-b-0"
                          onClick={() => selectClient(client)}
                        >
                          <div className="font-medium text-sm">{client.nombre_cliente}</div>
                          <div className="text-xs text-gray-600">Doc: {client.documento_cliente}</div>
                          <div className="text-xs text-gray-600">Tel: {client.celular_cliente}</div>
                          <div className="text-xs text-gray-500 truncate">{client.direccion_cliente}</div>
                        </div>
                      ))}
                    </div>
                  )}
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
              
              {/* Observaciones generales de la venta */}
              <div className="mt-4">
                <Label htmlFor="observaciones" className="text-black font-medium mb-2 block">
                  Observaciones de la Venta (opcional)
                </Label>
                <Input
                  id="observaciones"
                  data-testid="observaciones-input"
                  value={observaciones}
                  onChange={(e) => setObservaciones(e.target.value)}
                  className="rounded-none border-2 border-black"
                  placeholder="Notas, instrucciones especiales, etc."
                />
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
                  <select
                    id="referencia"
                    data-testid="referencia-select"
                    value={searchData.referencia}
                    onChange={(e) => setSearchData({ ...searchData, referencia: e.target.value })}
                    className="w-full h-10 px-3 border-2 border-black bg-white text-sm focus:outline-none focus:ring-2 focus:ring-black"
                  >
                    <option value="">Selecciona una referencia</option>
                    {uniqueReferencias.map((ref) => {
                      const productInfo = products.find(p => p.referencia === ref);
                      return (
                        <option key={ref} value={ref}>
                          {ref} - {productInfo?.descripcion || ''}
                        </option>
                      );
                    })}
                  </select>
                </div>

                <div>
                  <Label htmlFor="talla" className="text-black font-medium mb-2 block">Talla</Label>
                  <select
                    id="talla"
                    data-testid="talla-select"
                    value={searchData.talla}
                    onChange={(e) => setSearchData({ ...searchData, talla: e.target.value })}
                    disabled={!searchData.referencia}
                    className="w-full h-10 px-3 border-2 border-black bg-white text-sm focus:outline-none focus:ring-2 focus:ring-black disabled:bg-gray-100 disabled:cursor-not-allowed"
                  >
                    <option value="">Selecciona talla</option>
                    {availableTallas.map((talla) => (
                      <option key={talla} value={talla}>{talla}</option>
                    ))}
                  </select>
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
                
                {/* Costo de Domicilio */}
                <div className="flex justify-between items-center gap-4 mb-3 py-2 border-t border-gray-300">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">🚚 Domicilio:</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm">$</span>
                    <Input
                      type="number"
                      min="0"
                      step="100"
                      value={costoDomicilio}
                      onChange={(e) => setCostoDomicilio(e.target.value)}
                      className="w-24 h-8 rounded-none border-2 border-black text-right"
                      placeholder="0"
                    />
                  </div>
                </div>
                {parseFloat(costoDomicilio) > 0 && (
                  <div className="flex justify-between items-center text-sm mb-2">
                    <span className="text-blue-600">Costo Domicilio:</span>
                    <span className="text-blue-600">+${parseFloat(costoDomicilio).toLocaleString()}</span>
                  </div>
                )}

                {/* Costo de Estampado */}
                <div className="flex justify-between items-center gap-4 mb-3 py-2 border-t border-gray-300">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">🎨 Estampado:</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm">$</span>
                    <Input
                      type="number"
                      min="0"
                      step="100"
                      value={costoEstampado}
                      onChange={(e) => setCostoEstampado(e.target.value)}
                      className="w-24 h-8 rounded-none border-2 border-purple-600 text-right"
                      placeholder="0"
                    />
                  </div>
                </div>
                {parseFloat(costoEstampado) > 0 && (
                  <div className="flex justify-between items-center text-sm mb-2">
                    <span className="text-purple-600">Costo Estampado:</span>
                    <span className="text-purple-600">+${parseFloat(costoEstampado).toLocaleString()}</span>
                  </div>
                )}
                
                <div className="flex justify-between items-center border-t-2 border-black pt-2">
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

              {showInvoiceButton && lastSale && (
                <Button
                  data-testid="download-invoice-btn"
                  onClick={async () => await generateInvoicePDF(lastSale)}
                  className="w-full bg-blue-600 text-white hover:bg-blue-700 rounded-none h-14 text-lg font-bold mt-4"
                >
                  📄 Descargar Factura de Última Venta
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
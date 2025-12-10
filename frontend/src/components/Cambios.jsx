import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { ArrowLeft, Search, RefreshCw, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { formatInTimeZone } from 'date-fns-tz';
import { es } from 'date-fns/locale';
import jsPDF from 'jspdf';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;
const COLOMBIA_TZ = 'America/Bogota';

export default function Cambios() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [sales, setSales] = useState([]);
  const [selectedSale, setSelectedSale] = useState(null);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [products, setProducts] = useState([]);
  const [newProduct, setNewProduct] = useState(null);
  const [searchNewProduct, setSearchNewProduct] = useState({ referencia: '', talla: '' });
  const [uniqueReferencias, setUniqueReferencias] = useState([]);
  const [availableTallas, setAvailableTallas] = useState([]);
  const [withTag, setWithTag] = useState(true);
  const [goodCondition, setGoodCondition] = useState(true);
  const [observations, setObservations] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchProducts();
  }, []);

  useEffect(() => {
    if (searchNewProduct.referencia && products.length > 0) {
      const productsWithRef = products.filter(p => p.referencia === searchNewProduct.referencia);
      const tallas = [...new Set(productsWithRef.map(p => p.talla))];
      setAvailableTallas(tallas);
    } else {
      setAvailableTallas([]);
    }
  }, [searchNewProduct.referencia, products]);

  const fetchProducts = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API}/products`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const approvedProducts = response.data.filter(p => p.aprobado);
      setProducts(approvedProducts);
      const refs = [...new Set(approvedProducts.map(p => p.referencia))];
      setUniqueReferencias(refs);
    } catch (error) {
      toast.error('Error al cargar productos');
    }
  };

  const searchSales = async () => {
    if (!searchTerm.trim()) {
      toast.error('Ingresa nombre, documento o número de factura');
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API}/sales`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      const filtered = response.data.filter(sale => 
        sale.nombre_cliente.toLowerCase().includes(searchTerm.toLowerCase()) ||
        sale.documento_cliente.includes(searchTerm) ||
        (sale.numero_factura && sale.numero_factura.includes(searchTerm))
      );

      // Filtrar ventas dentro de los últimos 3 meses
      const threeMonthsAgo = new Date();
      threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

      const recentSales = filtered.filter(sale => {
        const saleDate = new Date(sale.created_at);
        return saleDate >= threeMonthsAgo;
      });

      setSales(recentSales);
      
      if (recentSales.length === 0) {
        toast.error('No se encontraron ventas dentro de los últimos 3 meses');
      }
    } catch (error) {
      toast.error('Error al buscar ventas');
    } finally {
      setLoading(false);
    }
  };

  const selectSale = (sale) => {
    setSelectedSale(sale);
    setSelectedProduct(null);
    setNewProduct(null);
  };

  const selectProductToChange = (product) => {
    setSelectedProduct(product);
    setNewProduct(null);
    setSearchNewProduct({ referencia: '', talla: '' });
  };

  const selectNewProduct = () => {
    if (!searchNewProduct.referencia || !searchNewProduct.talla) {
      toast.error('Selecciona referencia y talla del nuevo producto');
      return;
    }

    const product = products.find(p => 
      p.referencia === searchNewProduct.referencia && 
      p.talla === searchNewProduct.talla
    );

    if (!product) {
      toast.error('Producto no encontrado');
      return;
    }

    if (product.cantidad_stock < 1) {
      toast.error('Producto sin stock');
      return;
    }

    setNewProduct(product);
  };

  const calculateDifference = () => {
    if (!selectedProduct || !newProduct) return 0;
    return newProduct.precio_venta - selectedProduct.precio_venta;
  };

  const generateCambioInvoice = (cambioData) => {
    try {
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
      doc.setTextColor(200, 0, 0);
      doc.text('COMPROBANTE DE CAMBIO', pageWidth / 2, yPosition, { align: 'center' });
      doc.setTextColor(0, 0, 0);
      yPosition += 8;

      // Invoice and date
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.text(`Factura Original: ${selectedSale.numero_factura}`, pageWidth / 2, yPosition, { align: 'center' });
      yPosition += 5;
      
      const cambioDate = new Date();
      doc.text(formatInTimeZone(cambioDate, COLOMBIA_TZ, 'dd/MM/yyyy HH:mm', { locale: es }), pageWidth / 2, yPosition, { align: 'center' });
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
      doc.text(selectedSale.nombre_cliente, margin, yPosition, { maxWidth: contentWidth });
      yPosition += 4;
      doc.text(`Doc: ${selectedSale.documento_cliente}`, margin, yPosition);
      yPosition += 6;

      // Separator
      doc.line(margin, yPosition, pageWidth - margin, yPosition);
      yPosition += 5;

      // Original product
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(200, 0, 0);
      doc.text('❌ PRODUCTO DEVUELTO:', margin, yPosition);
      doc.setTextColor(0, 0, 0);
      yPosition += 5;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.text(selectedProduct.referencia, margin + 2, yPosition);
      yPosition += 4;
      doc.text(selectedProduct.descripcion.substring(0, 30), margin + 2, yPosition, { maxWidth: contentWidth - 2 });
      yPosition += 4;
      doc.text(`Talla: ${selectedProduct.talla} | Color: ${selectedProduct.color || 'N/A'}`, margin + 2, yPosition);
      yPosition += 4;
      doc.text(`Precio: $${selectedProduct.precio_venta.toLocaleString()}`, margin + 2, yPosition);
      yPosition += 6;

      // New product
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(0, 150, 0);
      doc.text('✅ PRODUCTO NUEVO:', margin, yPosition);
      doc.setTextColor(0, 0, 0);
      yPosition += 5;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.text(newProduct.referencia, margin + 2, yPosition);
      yPosition += 4;
      doc.text(newProduct.descripcion.substring(0, 30), margin + 2, yPosition, { maxWidth: contentWidth - 2 });
      yPosition += 4;
      doc.text(`Talla: ${newProduct.talla} | Color: ${newProduct.color || 'N/A'}`, margin + 2, yPosition);
      yPosition += 4;
      doc.text(`Precio: $${newProduct.precio_venta.toLocaleString()}`, margin + 2, yPosition);
      yPosition += 6;

      // Separator
      doc.setDrawColor(0);
      doc.setLineWidth(0.3);
      doc.line(margin, yPosition, pageWidth - margin, yPosition);
      yPosition += 5;

      // Price difference
      const difference = calculateDifference();
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.text('DIFERENCIA DE PRECIO:', margin, yPosition);
      yPosition += 5;

      if (difference === 0) {
        doc.setTextColor(0, 150, 0);
        doc.text('Cambio directo - Sin costo', margin + 2, yPosition);
      } else if (difference > 0) {
        doc.setTextColor(200, 0, 0);
        doc.text(`Cliente debe pagar: $${difference.toLocaleString()}`, margin + 2, yPosition);
      } else {
        doc.setTextColor(0, 150, 0);
        doc.text(`A favor del cliente: $${Math.abs(difference).toLocaleString()}`, margin + 2, yPosition);
      }
      doc.setTextColor(0, 0, 0);
      yPosition += 8;

      // Observations
      if (observations) {
        doc.setLineWidth(0.2);
        doc.line(margin, yPosition, pageWidth - margin, yPosition);
        yPosition += 4;
        
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.text('OBSERVACIONES:', margin, yPosition);
        yPosition += 4;
        
        doc.setFont('helvetica', 'normal');
        const obsLines = doc.splitTextToSize(observations, contentWidth);
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
      yPosition += 4;
      doc.setFontSize(6);
      doc.text(`Realizado por: ${cambioData.realizado_por}`, pageWidth / 2, yPosition, { align: 'center' });
      yPosition += 8;

      // Policy
      doc.setLineWidth(0.2);
      doc.line(margin, yPosition, pageWidth - margin, yPosition);
      yPosition += 4;
      
      doc.setFontSize(4.5);
      doc.setFont('helvetica', 'italic');
      doc.setTextColor(60, 60, 60);
      
      const policyText = `POLÍTICA DE CAMBIO Y GARANTÍA – ON–OF: ON–OF ofrece a sus clientes un periodo de hasta tres (3) meses desde la fecha de compra para realizar cambios de prendas, siempre que estas se encuentren en buen estado, sin signos de uso excesivo, sin manchas, suciedad ni olores, y con la etiqueta original en buen estado, presentando además el comprobante de compra. Los cambios aplican únicamente por otra prenda del mismo valor o abonando la diferencia si se elige una de mayor precio. No se realizan devoluciones de dinero. Quedan excluidas de cambio las prendas de ropa interior, trajes de baño y productos adquiridos en promociones especiales o remates, salvo defecto de fabricación. Asimismo, todas nuestras prendas cuentan con una garantía de seis (6) meses por defectos de fabricación, incluyendo costuras dañadas, desprendimiento de accesorios o fallas de origen en la tela. Esta garantía no cubre daños ocasionados por mal uso, lavado inadecuado, desgaste natural o intervenciones posteriores a la compra. La evaluación del producto es obligatoria y puede tardar entre 24 y 72 horas. Según el resultado, ON–OF podrá proceder con la reparación, reposición o cambio por una prenda equivalente en caso de no haber disponibilidad del mismo modelo. ON–OF se reserva el derecho de rechazar solicitudes que no cumplan con las condiciones aquí establecidas. Al efectuar la compra, el cliente acepta íntegramente esta política.`;
      
      const policyLines = doc.splitTextToSize(policyText, 60);
      doc.text(policyLines, margin, yPosition, { maxWidth: 60, align: 'justify' });

      // Save PDF
      const clientNameClean = selectedSale.nombre_cliente.replace(/[^a-zA-Z0-9]/g, '_');
      const fileName = `Cambio_${selectedSale.numero_factura}_${clientNameClean}.pdf`;
      doc.save(fileName);
      toast.success('Comprobante de cambio descargado');
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('Error al generar comprobante');
    }
  };

  const processCambio = async () => {
    if (!selectedSale || !selectedProduct || !newProduct) {
      toast.error('Completa todos los pasos');
      return;
    }

    if (!withTag || !goodCondition) {
      toast.error('El producto debe estar con etiqueta y en buen estado según la política');
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const username = localStorage.getItem('username');
      
      const cambioData = {
        sale_id: selectedSale.id,
        numero_factura: selectedSale.numero_factura,
        cliente: selectedSale.nombre_cliente,
        documento_cliente: selectedSale.documento_cliente,
        producto_original: {
          product_id: selectedProduct.product_id,
          referencia: selectedProduct.referencia,
          descripcion: selectedProduct.descripcion,
          talla: selectedProduct.talla,
          color: selectedProduct.color,
          precio_venta: selectedProduct.precio_venta
        },
        producto_nuevo: {
          product_id: newProduct.id,
          referencia: newProduct.referencia,
          descripcion: newProduct.descripcion,
          talla: newProduct.talla,
          color: newProduct.color,
          precio_venta: newProduct.precio_venta
        },
        diferencia_precio: calculateDifference(),
        con_etiqueta: withTag,
        buen_estado: goodCondition,
        observaciones: observations,
        realizado_por: username
      };

      await axios.post(`${API}/cambios`, cambioData, {
        headers: { Authorization: `Bearer ${token}` }
      });

      toast.success('Cambio procesado exitosamente');
      
      // Generar factura del cambio
      generateCambioInvoice(cambioData);
      
      // Reset
      setSelectedSale(null);
      setSelectedProduct(null);
      setNewProduct(null);
      setSearchTerm('');
      setSales([]);
      setSearchNewProduct({ referencia: '', talla: '' });
      setObservations('');
      setWithTag(true);
      setGoodCondition(true);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error al procesar cambio');
    } finally {
      setLoading(false);
    }
  };

  const difference = calculateDifference();

  return (
    <div className="min-h-screen bg-white p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Button
              onClick={() => navigate('/')}
              variant="outline"
              className="border-2 border-black rounded-none"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Volver
            </Button>
            <h1 className="text-3xl font-bold">🔄 Cambios de Productos</h1>
          </div>
        </div>

        {/* Paso 1: Buscar Cliente/Factura */}
        {!selectedSale && (
          <Card className="border-4 border-black rounded-none mb-6">
            <CardHeader className="bg-black text-white">
              <CardTitle className="flex items-center gap-2">
                <Search className="w-6 h-6" />
                Paso 1: Buscar Cliente o Factura
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="flex gap-4">
                <div className="flex-1">
                  <Label>Nombre, Documento o # Factura</Label>
                  <Input
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && searchSales()}
                    placeholder="Buscar..."
                    className="border-2 border-black rounded-none"
                  />
                </div>
                <Button
                  onClick={searchSales}
                  disabled={loading}
                  className="bg-black text-white hover:bg-gray-800 rounded-none mt-6"
                >
                  <Search className="w-4 h-4 mr-2" />
                  Buscar
                </Button>
              </div>

              {sales.length > 0 && (
                <div className="mt-6 space-y-4">
                  <p className="font-bold">{sales.length} venta(s) encontrada(s) (últimos 3 meses):</p>
                  {sales.map(sale => (
                    <Card
                      key={sale.id}
                      className="border-2 border-gray-300 rounded-none cursor-pointer hover:border-black"
                      onClick={() => selectSale(sale)}
                    >
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-bold text-lg">{sale.nombre_cliente}</p>
                            <p className="text-sm text-gray-600">Doc: {sale.documento_cliente}</p>
                            <p className="text-sm text-gray-600">Factura: {sale.numero_factura}</p>
                            <p className="text-sm text-gray-600">
                              Fecha: {formatInTimeZone(new Date(sale.created_at), COLOMBIA_TZ, 'dd/MM/yyyy', { locale: es })}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-xl">${sale.total.toLocaleString()}</p>
                            <p className="text-sm text-gray-600">{sale.items.length} producto(s)</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Paso 2: Seleccionar Producto a Cambiar */}
        {selectedSale && !selectedProduct && (
          <Card className="border-4 border-black rounded-none mb-6">
            <CardHeader className="bg-black text-white">
              <CardTitle className="flex items-center gap-2">
                <RefreshCw className="w-6 h-6" />
                Paso 2: Seleccionar Producto a Cambiar
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="mb-4 p-4 bg-gray-100 border-2 border-black">
                <p className="font-bold">{selectedSale.nombre_cliente}</p>
                <p className="text-sm">Factura: {selectedSale.numero_factura}</p>
                <Button
                  onClick={() => setSelectedSale(null)}
                  variant="outline"
                  className="border-2 border-black rounded-none mt-2"
                  size="sm"
                >
                  Cambiar cliente
                </Button>
              </div>

              <div className="space-y-4">
                {selectedSale.items.map((item, idx) => (
                  <Card
                    key={idx}
                    className="border-2 border-gray-300 rounded-none cursor-pointer hover:border-black"
                    onClick={() => selectProductToChange(item)}
                  >
                    <CardContent className="p-4">
                      <div className="flex gap-4">
                        {item.imagen_url && (
                          <img
                            src={`${BACKEND_URL}${item.imagen_url}`}
                            alt={item.descripcion}
                            className="w-20 h-20 object-cover border-2 border-black"
                          />
                        )}
                        <div className="flex-1">
                          <p className="font-bold">{item.referencia}</p>
                          <p className="text-sm">{item.descripcion}</p>
                          <p className="text-sm">Talla: {item.talla} | Color: {item.color || 'N/A'}</p>
                          <p className="font-bold mt-2">${item.precio_venta.toLocaleString()}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Paso 3: Seleccionar Nuevo Producto */}
        {selectedProduct && !newProduct && (
          <Card className="border-4 border-black rounded-none mb-6">
            <CardHeader className="bg-black text-white">
              <CardTitle>Paso 3: Seleccionar Nuevo Producto</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="mb-4 p-4 bg-gray-100 border-2 border-black">
                <p className="font-bold">Producto a cambiar:</p>
                <p>{selectedProduct.referencia} - {selectedProduct.descripcion}</p>
                <p className="text-sm">Talla: {selectedProduct.talla}</p>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <Label>Referencia Nueva</Label>
                  <select
                    value={searchNewProduct.referencia}
                    onChange={(e) => setSearchNewProduct({...searchNewProduct, referencia: e.target.value, talla: ''})}
                    className="w-full p-2 border-2 border-black rounded-none"
                  >
                    <option value="">Seleccionar...</option>
                    {uniqueReferencias.map(ref => (
                      <option key={ref} value={ref}>{ref}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label>Talla Nueva</Label>
                  <select
                    value={searchNewProduct.talla}
                    onChange={(e) => setSearchNewProduct({...searchNewProduct, talla: e.target.value})}
                    className="w-full p-2 border-2 border-black rounded-none"
                    disabled={!searchNewProduct.referencia}
                  >
                    <option value="">Seleccionar...</option>
                    {availableTallas.map(talla => (
                      <option key={talla} value={talla}>{talla}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Mostrar productos disponibles con fotos */}
              {searchNewProduct.referencia && (
                <div className="mb-4">
                  <p className="font-bold mb-2">Productos disponibles con esta referencia:</p>
                  <div className="grid grid-cols-2 gap-4">
                    {products
                      .filter(p => p.referencia === searchNewProduct.referencia)
                      .map(product => (
                        <Card
                          key={product.id}
                          className={`border-2 rounded-none cursor-pointer ${
                            searchNewProduct.talla === product.talla 
                              ? 'border-green-500 bg-green-50' 
                              : 'border-gray-300 hover:border-black'
                          }`}
                          onClick={() => setSearchNewProduct({...searchNewProduct, talla: product.talla})}
                        >
                          <CardContent className="p-4">
                            {product.imagen_url ? (
                              <img
                                src={`${BACKEND_URL}${product.imagen_url}`}
                                alt={product.descripcion}
                                className="w-full h-32 object-cover border-2 border-black mb-2"
                              />
                            ) : (
                              <div className="w-full h-32 border-2 border-black flex items-center justify-center bg-gray-200 mb-2">
                                <p className="text-gray-500">Sin imagen</p>
                              </div>
                            )}
                            <p className="font-bold text-sm">{product.referencia}</p>
                            <p className="text-xs">{product.descripcion}</p>
                            <p className="text-sm">Talla: <span className="font-bold">{product.talla}</span></p>
                            <p className="text-sm">Color: {product.color || 'N/A'}</p>
                            <p className="font-bold mt-1">${product.precio_venta.toLocaleString()}</p>
                            <p className={`text-xs ${product.cantidad_stock > 0 ? 'text-green-600' : 'text-red-600'}`}>
                              Stock: {product.cantidad_stock}
                            </p>
                          </CardContent>
                        </Card>
                      ))}
                  </div>
                </div>
              )}

              <Button
                onClick={selectNewProduct}
                disabled={!searchNewProduct.referencia || !searchNewProduct.talla}
                className="bg-black text-white hover:bg-gray-800 rounded-none"
              >
                Confirmar Nuevo Producto
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Paso 4: Confirmar Cambio */}
        {newProduct && (
          <Card className="border-4 border-black rounded-none mb-6">
            <CardHeader className="bg-black text-white">
              <CardTitle>Paso 4: Confirmar Cambio</CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              {/* Resumen del cambio */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 border-2 border-red-500 bg-red-50">
                  <p className="font-bold text-red-900 mb-2">❌ Producto Original:</p>
                  <p className="font-bold">{selectedProduct.referencia}</p>
                  <p className="text-sm">{selectedProduct.descripcion}</p>
                  <p className="text-sm">Talla: {selectedProduct.talla}</p>
                  <p className="font-bold mt-2">${selectedProduct.precio_venta.toLocaleString()}</p>
                </div>
                <div className="p-4 border-2 border-green-500 bg-green-50">
                  <p className="font-bold text-green-900 mb-2">✅ Producto Nuevo:</p>
                  <p className="font-bold">{newProduct.referencia}</p>
                  <p className="text-sm">{newProduct.descripcion}</p>
                  <p className="text-sm">Talla: {newProduct.talla}</p>
                  <p className="font-bold mt-2">${newProduct.precio_venta.toLocaleString()}</p>
                </div>
              </div>

              {/* Diferencia de precio */}
              <div className="p-4 border-4 border-black">
                <p className="font-bold text-lg mb-2">💰 Diferencia de Precio:</p>
                {difference === 0 && (
                  <p className="text-green-600 text-xl font-bold">Cambio directo - Mismo precio</p>
                )}
                {difference > 0 && (
                  <p className="text-red-600 text-xl font-bold">Cliente debe pagar: ${difference.toLocaleString()}</p>
                )}
                {difference < 0 && (
                  <p className="text-green-600 text-xl font-bold">Cliente a favor: ${Math.abs(difference).toLocaleString()}</p>
                )}
              </div>

              {/* Validaciones */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={withTag}
                    onChange={(e) => setWithTag(e.target.checked)}
                    className="w-5 h-5"
                  />
                  <Label>¿Producto con etiqueta original en buen estado?</Label>
                  {withTag ? <CheckCircle className="w-5 h-5 text-green-600" /> : <XCircle className="w-5 h-5 text-red-600" />}
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={goodCondition}
                    onChange={(e) => setGoodCondition(e.target.checked)}
                    className="w-5 h-5"
                  />
                  <Label>¿Producto en buen estado (sin uso excesivo, manchas, olores)?</Label>
                  {goodCondition ? <CheckCircle className="w-5 h-5 text-green-600" /> : <XCircle className="w-5 h-5 text-red-600" />}
                </div>
              </div>

              {/* Observaciones */}
              <div>
                <Label>Observaciones (opcional)</Label>
                <Input
                  value={observations}
                  onChange={(e) => setObservations(e.target.value)}
                  placeholder="Notas adicionales sobre el cambio..."
                  className="border-2 border-black rounded-none"
                />
              </div>

              {/* Botones */}
              <div className="flex gap-4">
                <Button
                  onClick={processCambio}
                  disabled={loading || !withTag || !goodCondition}
                  className="flex-1 bg-green-600 text-white hover:bg-green-700 rounded-none h-14 text-lg font-bold"
                >
                  {loading ? 'Procesando...' : 'Confirmar Cambio'}
                </Button>
                <Button
                  onClick={() => {
                    setNewProduct(null);
                    setSearchNewProduct({ referencia: '', talla: '' });
                  }}
                  variant="outline"
                  className="border-2 border-black rounded-none"
                >
                  Cambiar Producto
                </Button>
              </div>

              {(!withTag || !goodCondition) && (
                <div className="p-4 bg-yellow-50 border-2 border-yellow-500">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-6 h-6 text-yellow-600 flex-shrink-0 mt-1" />
                    <div>
                      <p className="font-bold text-yellow-900">⚠️ No cumple con la política de cambios</p>
                      <p className="text-sm text-yellow-800">El producto debe estar con etiqueta y en buen estado para procesar el cambio.</p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

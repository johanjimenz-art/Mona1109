import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { ArrowLeft, Package, Truck, CheckCircle, Image as ImageIcon, Download, Search, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { formatInTimeZone } from 'date-fns-tz';
import { es } from 'date-fns/locale';
import jsPDF from 'jspdf';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;
const COLOMBIA_TZ = 'America/Bogota';

export default function SalesHistory() {
  const navigate = useNavigate();
  const [sales, setSales] = useState([]);
  const [filteredSales, setFilteredSales] = useState([]);
  const [expandedSale, setExpandedSale] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchBy, setSearchBy] = useState('nombre'); // nombre, documento, factura
  const role = localStorage.getItem('role');
  const isAdmin = role === 'admin';

  useEffect(() => {
    fetchSales();
  }, []);

  useEffect(() => {
    filterSales();
  }, [searchTerm, searchBy, sales]);

  const fetchSales = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API}/sales`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSales(response.data);
      setFilteredSales(response.data);
    } catch (error) {
      toast.error('Error al cargar ventas');
    }
  };

  const filterSales = () => {
    if (!searchTerm.trim()) {
      setFilteredSales(sales);
      return;
    }

    const term = searchTerm.toLowerCase();
    const filtered = sales.filter(sale => {
      switch (searchBy) {
        case 'nombre':
          return sale.nombre_cliente.toLowerCase().includes(term);
        case 'documento':
          return sale.documento_cliente.toLowerCase().includes(term);
        case 'factura':
          return sale.numero_factura?.toLowerCase().includes(term);
        default:
          return true;
      }
    });

    setFilteredSales(filtered);
  };

  const handleUpdateStatus = async (saleId, newStatus) => {
    try {
      const token = localStorage.getItem('token');
      await axios.put(
        `${API}/sales/${saleId}/status`,
        { estado_despacho: newStatus },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success('Estado actualizado');
      fetchSales();
    } catch (error) {
      toast.error('Error al actualizar estado');
    }
  };

  const handleDeleteSale = async (saleId, restoreStock = true) => {
    const confirmMessage = restoreStock
      ? '¿Eliminar esta venta y restaurar el inventario? Esta acción no se puede deshacer.'
      : '¿Eliminar esta venta SIN restaurar el inventario? Esta acción no se puede deshacer.';
    
    if (!window.confirm(confirmMessage)) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API}/sales/${saleId}`, {
        params: { restore_stock: restoreStock },
        headers: { Authorization: `Bearer ${token}` }
      });
      
      toast.success(restoreStock 
        ? 'Venta eliminada e inventario restaurado' 
        : 'Venta eliminada');
      fetchSales();
      setExpandedSale(null);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error al eliminar venta');
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
        format: [80, 500] // 8cm de ancho, altura suficiente para todo el contenido
      });

      const pageWidth = 80;
      const margin = 5;
      const contentWidth = pageWidth - (margin * 2);
      let yPosition = margin;

      // Title - Centered
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

      // Separator line
      doc.setLineWidth(0.3);
      doc.line(margin, yPosition, pageWidth - margin, yPosition);
      yPosition += 5;

      // Client information
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

      // Separator line
      doc.line(margin, yPosition, pageWidth - margin, yPosition);
      yPosition += 5;

      // Products header
      doc.setFont('helvetica', 'bold');
      doc.text('DETALLE DE PRODUCTOS', margin, yPosition);
      yPosition += 5;

      // Products
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      
      sale.items.forEach((item, index) => {
        // Product reference and description
        doc.setFont('helvetica', 'bold');
        doc.text(item.referencia, margin, yPosition);
        yPosition += 4;
        
        doc.setFont('helvetica', 'normal');
        doc.text(item.descripcion.substring(0, 30), margin + 2, yPosition, { maxWidth: contentWidth - 2 });
        yPosition += 4;
        
        // Talla and cantidad
        doc.text(`Talla: ${item.talla}`, margin + 2, yPosition);
        doc.text(`Cant: ${item.cantidad}`, pageWidth - margin - 20, yPosition);
        yPosition += 4;
        
        // Price per unit
        doc.text(`Precio unit: $${item.precio_venta.toLocaleString()}`, margin + 2, yPosition);
        yPosition += 4;
        
        // Full price (price * quantity)
        const precioTotal = item.precio_venta * item.cantidad;
        doc.text(`Precio total: $${precioTotal.toLocaleString()}`, margin + 2, yPosition);
        yPosition += 4;
        
        // Discount if applied
        if (item.descuento > 0) {
          doc.setTextColor(200, 0, 0);
          doc.text(`Descuento: -$${item.descuento.toLocaleString()} (${item.descuento_porcentaje.toFixed(1)}%)`, margin + 2, yPosition);
          doc.setTextColor(0, 0, 0);
          yPosition += 4;
        }
        
        // Subtotal after discount
        doc.setFont('helvetica', 'bold');
        doc.text(`Subtotal: $${item.subtotal.toLocaleString()}`, margin + 2, yPosition);
        doc.setFont('helvetica', 'normal');
        yPosition += 6;
        
        // Separator between products
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

      // Totals section
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      
      if (sale.descuento_total > 0) {
        // Subtotal before discount
        doc.text('Subtotal:', margin, yPosition);
        doc.text(`$${(sale.subtotal || sale.total).toLocaleString()}`, pageWidth - margin, yPosition, { align: 'right' });
        yPosition += 5;
        
        // Total discount
        doc.setTextColor(0, 150, 0);
        doc.text('Descuento total:', margin, yPosition);
        doc.text(`-$${sale.descuento_total.toLocaleString()}`, pageWidth - margin, yPosition, { align: 'right' });
        doc.setTextColor(0, 0, 0);
        yPosition += 6;
      }
      
      // Grand total
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.text('TOTAL:', margin, yPosition);
      doc.text(`$${sale.total.toLocaleString()}`, pageWidth - margin, yPosition, { align: 'right' });
      yPosition += 8;

      // Credit information if exists
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

      // Sale observations if exist
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

      // Separator line
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
      
      // Usar ancho MUCHO más pequeño para evitar cortes
      const policyLines = doc.splitTextToSize(policyText, 65);
      doc.text(policyLines, margin, yPosition, { maxWidth: 65 });
      yPosition += (policyLines.length * 2.5);

      // Save PDF with client name
      const clientNameClean = sale.nombre_cliente.replace(/[^a-zA-Z0-9]/g, '_');
      const fileName = `Factura_${sale.numero_factura || sale.id}_${clientNameClean}.pdf`;
      doc.save(fileName);
      toast.success('Factura descargada exitosamente');
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('Error al generar la factura: ' + error.message);
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      pendiente: { bg: 'bg-yellow-500', text: 'Pendiente', icon: Package },
      en_camino: { bg: 'bg-blue-500', text: 'En Camino', icon: Truck },
      despachado: { bg: 'bg-green-500', text: 'Despachado', icon: CheckCircle }
    };
    const badge = badges[status] || badges.pendiente;
    const Icon = badge.icon;
    return (
      <span className={`inline-flex items-center gap-1 px-3 py-1 text-xs font-bold text-white ${badge.bg}`}>
        <Icon className="w-3 h-3" />
        {badge.text}
      </span>
    );
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
            Historial de Ventas
          </h1>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-8 py-8">
        {/* Search Section */}
        <div className="bg-white border-4 border-black p-6 mb-8">
          <div className="flex items-center gap-2 mb-4">
            <Search className="w-5 h-5" />
            <h2 className="text-xl font-bold">Buscar Ventas</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label className="text-sm font-medium mb-2 block">Buscar por:</Label>
              <select
                value={searchBy}
                onChange={(e) => setSearchBy(e.target.value)}
                className="w-full h-10 px-3 border-2 border-black rounded-none"
              >
                <option value="nombre">Nombre del Cliente</option>
                <option value="documento">Cédula</option>
                <option value="factura">Número de Factura</option>
              </select>
            </div>
            
            <div className="md:col-span-2">
              <Label className="text-sm font-medium mb-2 block">Término de búsqueda:</Label>
              <Input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={
                  searchBy === 'nombre' ? 'Ej: Juan Pérez' :
                  searchBy === 'documento' ? 'Ej: 1234567890' :
                  'Ej: FAC-20251016-0001'
                }
                className="rounded-none border-2 border-black h-10"
              />
            </div>
          </div>
          
          {searchTerm && (
            <div className="mt-4 text-sm text-gray-600">
              Mostrando {filteredSales.length} de {sales.length} ventas
            </div>
          )}
        </div>

        {/* Sales List */}
        <div className="space-y-6">
          {filteredSales.length === 0 ? (
            <div className="bg-white border-4 border-black p-12 text-center">
              <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-xl font-bold text-gray-600 mb-2">
                {searchTerm ? 'No se encontraron resultados' : 'No hay ventas registradas'}
              </p>
              <p className="text-gray-500">
                {searchTerm ? 'Intenta con otro término de búsqueda' : 'Las ventas aparecerán aquí cuando se realicen'}
              </p>
            </div>
          ) : (
            filteredSales.map((sale) => (
              <div key={sale.id} className="bg-white border-4 border-black p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-xl font-bold">{sale.nombre_cliente}</h3>
                      {getStatusBadge(sale.estado_despacho)}
                    </div>
                    <p className="text-sm text-gray-600">Documento: {sale.documento_cliente}</p>
                    <p className="text-sm text-gray-600">Dirección: {sale.direccion_cliente}</p>
                    <p className="text-sm text-gray-600">Celular: {sale.celular_cliente}</p>
                    {sale.numero_factura && (
                      <p className="text-sm font-bold text-blue-600 mt-2">
                        Factura: {sale.numero_factura}
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-600">
                      {formatInTimeZone(new Date(sale.created_at), COLOMBIA_TZ, 'dd/MM/yyyy HH:mm', { locale: es })}
                    </p>
                    {isAdmin && (
                      <>
                        {sale.descuento_total > 0 && (
                          <>
                            <p className="text-xs text-gray-500 mt-2">Subtotal: ${(sale.subtotal || sale.total).toLocaleString()}</p>
                            <p className="text-xs text-green-600">Descuento: -${sale.descuento_total.toLocaleString()}</p>
                          </>
                        )}
                        <p className="text-2xl font-bold mt-1">${sale.total.toLocaleString()}</p>
                      </>
                    )}
                    {sale.created_by && (
                      <p className="text-xs text-gray-500 mt-1">Registrado por: {sale.created_by}</p>
                    )}
                  </div>
                </div>

                <div className="border-t-2 border-black pt-4 mb-4">
                  <div className="flex justify-between items-center mb-3">
                    <h4 className="font-bold">Productos ({sale.items.length})</h4>
                    <Button
                      onClick={() => setExpandedSale(expandedSale === sale.id ? null : sale.id)}
                      variant="outline"
                      size="sm"
                      className="border-2 border-black rounded-none hover:bg-black hover:text-white"
                    >
                      {expandedSale === sale.id ? 'Ocultar' : 'Ver'} Detalle
                    </Button>
                  </div>

                  {expandedSale === sale.id && (
                    <div className="space-y-3">
                      {sale.items.map((item, idx) => (
                        <div key={idx} className="border-2 border-black p-3 flex gap-3">
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
                            <p className="font-bold">{item.referencia}</p>
                            <p className="text-sm text-gray-600">{item.descripcion}</p>
                            <p className="text-sm">Talla: {item.talla} | Cantidad: {item.cantidad}</p>
                            <div className="flex justify-between items-center mt-2">
                              <div>
                                <span className="text-sm text-gray-600">Precio: ${item.precio_venta.toLocaleString()}</span>
                                {item.descuento > 0 && (
                                  <span className="text-sm text-green-600 ml-2">Desc: -${item.descuento.toLocaleString()}</span>
                                )}
                              </div>
                              <span className="font-bold">${item.subtotal.toLocaleString()}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                      
                      {/* Mostrar observaciones si existen */}
                      {sale.observaciones && (
                        <div className="border-2 border-blue-500 bg-blue-50 p-3 mt-3">
                          <p className="font-bold text-sm text-blue-900 mb-1">📝 Observaciones:</p>
                          <p className="text-sm text-gray-700">{sale.observaciones}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="flex gap-2 flex-wrap">
                  <Button
                    onClick={async () => await generateInvoicePDF(sale)}
                    className="bg-blue-600 text-white hover:bg-blue-700 rounded-none"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Descargar Factura
                  </Button>

                  {isAdmin && sale.estado_despacho === 'pendiente' && (
                    <Button
                      onClick={() => handleUpdateStatus(sale.id, 'en_camino')}
                      variant="outline"
                      className="border-2 border-black rounded-none hover:bg-blue-500 hover:text-white hover:border-blue-500"
                    >
                      <Truck className="w-4 h-4 mr-2" />
                      Marcar En Camino
                    </Button>
                  )}

                  {isAdmin && sale.estado_despacho === 'en_camino' && (
                    <Button
                      onClick={() => handleUpdateStatus(sale.id, 'despachado')}
                      variant="outline"
                      className="border-2 border-black rounded-none hover:bg-green-500 hover:text-white hover:border-green-500"
                    >
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Marcar Despachado
                    </Button>
                  )}

                  {isAdmin && (
                    <>
                      <Button
                        onClick={() => handleDeleteSale(sale.id, true)}
                        variant="outline"
                        className="border-2 border-orange-500 text-orange-600 rounded-none hover:bg-orange-50"
                      >
                        Anular Venta (Restaurar Stock)
                      </Button>
                      <Button
                        onClick={() => handleDeleteSale(sale.id, false)}
                        variant="outline"
                        className="border-2 border-red-500 text-red-600 rounded-none hover:bg-red-50"
                      >
                        Eliminar Venta (Sin Restaurar)
                      </Button>
                    </>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
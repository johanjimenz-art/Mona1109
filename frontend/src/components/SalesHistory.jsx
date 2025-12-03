import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { ArrowLeft, Package, Truck, CheckCircle, Image as ImageIcon, Download, Search, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

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

  const generateInvoicePDF = async (sale) => {
    try {
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 15;
      const contentWidth = pageWidth - (margin * 2);
      let yPosition = margin;

      // Try to load and add logo
      let logoLoaded = false;
      try {
        const response = await fetch('/logo.png');
        const blob = await response.blob();
        const reader = new FileReader();
        
        await new Promise((resolve, reject) => {
          reader.onloadend = () => {
            try {
              const base64data = reader.result;
              const logoWidth = 40;
              const logoHeight = 15; // Fixed height for consistency
              doc.addImage(base64data, 'PNG', (pageWidth - logoWidth) / 2, yPosition, logoWidth, logoHeight);
              yPosition += logoHeight + 10;
              logoLoaded = true;
              resolve();
            } catch (e) {
              reject(e);
            }
          };
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
      } catch (error) {
        console.log('Logo not loaded, continuing without it');
        yPosition += 5;
      }

      // Title
      doc.setFontSize(20);
      doc.setFont('helvetica', 'bold');
      doc.text('FACTURA DE VENTA', pageWidth / 2, yPosition, { align: 'center' });
      yPosition += 10;

      // Invoice number
      doc.setFontSize(12);
      doc.setFont('helvetica', 'normal');
      doc.text(`Número: ${sale.numero_factura || 'N/A'}`, pageWidth / 2, yPosition, { align: 'center' });
      yPosition += 8;

      // Date
      doc.setFontSize(10);
      const saleDate = new Date(sale.created_at);
      doc.text(`Fecha: ${format(saleDate, 'dd/MM/yyyy HH:mm', { locale: es })}`, pageWidth / 2, yPosition, { align: 'center' });
      yPosition += 12;

      // Client information box
      doc.setDrawColor(0);
      doc.setLineWidth(0.5);
      doc.rect(margin, yPosition, contentWidth, 25);
      
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text('DATOS DEL CLIENTE', margin + 3, yPosition + 6);
      
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.text(`Nombre: ${sale.nombre_cliente}`, margin + 3, yPosition + 11);
      doc.text(`Documento: ${sale.documento_cliente}`, margin + 3, yPosition + 16);
      doc.text(`Dirección: ${sale.direccion_cliente}`, margin + 3, yPosition + 21);
      
      yPosition += 30;

      // Products table
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text('DETALLE DE PRODUCTOS', margin, yPosition);
      yPosition += 5;

      const tableData = sale.items.map(item => [
        item.referencia,
        item.descripcion.substring(0, 25),
        item.talla,
        item.cantidad,
        `$${item.precio_venta.toLocaleString()}`,
        item.descuento > 0 ? `-$${item.descuento.toLocaleString()}` : '-',
        `$${item.subtotal.toLocaleString()}`
      ]);

      doc.autoTable({
        startY: yPosition,
        head: [['Ref', 'Descripción', 'Talla', 'Cant', 'Precio', 'Desc', 'Subtotal']],
        body: tableData,
        theme: 'grid',
        headStyles: {
          fillColor: [0, 0, 0],
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          fontSize: 9
        },
        bodyStyles: {
          fontSize: 8
        },
        columnStyles: {
          0: { cellWidth: 20 },
          1: { cellWidth: 35 },
          2: { cellWidth: 15 },
          3: { cellWidth: 15 },
          4: { cellWidth: 25 },
          5: { cellWidth: 20 },
          6: { cellWidth: 25 }
        },
        margin: { left: margin, right: margin }
      });

      yPosition = doc.lastAutoTable.finalY + 10;

      // Totals box
      const totalsBoxY = yPosition;
      const totalsBoxHeight = sale.descuento_total > 0 ? 25 : 15;
      
      doc.setDrawColor(0);
      doc.rect(pageWidth - margin - 60, totalsBoxY, 60, totalsBoxHeight);
      
      let totalsY = totalsBoxY + 6;
      doc.setFontSize(10);
      
      if (sale.descuento_total > 0) {
        doc.setFont('helvetica', 'normal');
        doc.text('Subtotal:', pageWidth - margin - 57, totalsY);
        doc.text(`$${(sale.subtotal || sale.total).toLocaleString()}`, pageWidth - margin - 5, totalsY, { align: 'right' });
        totalsY += 5;
        
        doc.setTextColor(0, 150, 0);
        doc.text('Descuento:', pageWidth - margin - 57, totalsY);
        doc.text(`-$${sale.descuento_total.toLocaleString()}`, pageWidth - margin - 5, totalsY, { align: 'right' });
        doc.setTextColor(0, 0, 0);
        totalsY += 5;
      }
      
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.text('TOTAL:', pageWidth - margin - 57, totalsY);
      doc.text(`$${sale.total.toLocaleString()}`, pageWidth - margin - 5, totalsY, { align: 'right' });

      // Footer
      const footerY = pageHeight - 20;
      doc.setFontSize(8);
      doc.setFont('helvetica', 'italic');
      doc.setTextColor(100, 100, 100);
      doc.text('Gracias por su compra', pageWidth / 2, footerY, { align: 'center' });
      doc.text('Cloth ON-OF - Sistema de Gestión de Inventario', pageWidth / 2, footerY + 4, { align: 'center' });

      // Save PDF
      const fileName = `Factura_${sale.numero_factura || sale.id}.pdf`;
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
                      {format(new Date(sale.created_at), 'dd/MM/yyyy HH:mm', { locale: es })}
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
                    </div>
                  )}
                </div>

                <div className="flex gap-2 flex-wrap">
                  <Button
                    onClick={() => generateInvoicePDF(sale)}
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
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
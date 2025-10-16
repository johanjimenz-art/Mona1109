import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Button } from './ui/button';
import { ArrowLeft, Package, Truck, CheckCircle, Image as ImageIcon, Download } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function SalesHistory() {
  const navigate = useNavigate();
  const [sales, setSales] = useState([]);
  const [expandedSale, setExpandedSale] = useState(null);

  useEffect(() => {
    fetchSales();
  }, []);

  const fetchSales = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API}/sales`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSales(response.data);
    } catch (error) {
      toast.error('Error al cargar historial');
    }
  };

  const updateStatus = async (saleId, newStatus) => {
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

  const getStatusInfo = (status) => {
    const statusMap = {
      pendiente: {
        label: 'Pendiente',
        icon: Package,
        color: 'text-yellow-600 bg-yellow-50 border-yellow-600'
      },
      en_camino: {
        label: 'En Camino',
        icon: Truck,
        color: 'text-blue-600 bg-blue-50 border-blue-600'
      },
      despachado: {
        label: 'Despachado',
        icon: CheckCircle,
        color: 'text-green-600 bg-green-50 border-green-600'
      }
    };
    return statusMap[status] || statusMap.pendiente;
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
            Historial de Ventas y Despachos
          </h1>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-8 py-8">
        <div className="space-y-4">
          {sales.map((sale, index) => {
            const statusInfo = getStatusInfo(sale.estado_despacho);
            const StatusIcon = statusInfo.icon;
            
            return (
              <div key={sale.id} className="bg-white border-4 border-black" data-testid={`sale-item-${index}`}>
                <button
                  data-testid={`sale-toggle-btn-${index}`}
                  onClick={() => setExpandedSale(expandedSale === sale.id ? null : sale.id)}
                  className="w-full p-6 text-left hover:bg-gray-50 transition-colors"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <p className="font-bold text-lg">{sale.nombre_cliente}</p>
                        <div className={`flex items-center gap-2 px-3 py-1 border-2 ${statusInfo.color}`}>
                          <StatusIcon className="w-4 h-4" />
                          <span className="text-sm font-medium">{statusInfo.label}</span>
                        </div>
                      </div>
                      <p className="text-sm text-gray-600 mt-1">Doc: {sale.documento_cliente}</p>
                      <p className="text-sm text-gray-600">Tel: {sale.celular_cliente}</p>
                      <p className="text-sm text-gray-600">Vendido por: {sale.created_by}</p>
                      <p className="text-sm text-gray-600 mt-2">
                        {format(new Date(sale.created_at), "d 'de' MMMM 'de' yyyy, HH:mm", { locale: es })}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-3xl font-bold">${sale.total.toLocaleString()}</p>
                      <p className="text-sm text-gray-600 mt-1">{sale.items.length} producto(s)</p>
                    </div>
                  </div>
                </button>

                {expandedSale === sale.id && (
                  <div className="border-t-4 border-black p-6 bg-gray-50">
                    <div className="mb-6">
                      <h3 className="font-bold mb-3 text-lg">Cambiar Estado de Despacho</h3>
                      <div className="flex gap-3">
                        <Button
                          data-testid={`status-pendiente-btn-${index}`}
                          onClick={() => updateStatus(sale.id, 'pendiente')}
                          disabled={sale.estado_despacho === 'pendiente'}
                          className={`flex items-center gap-2 border-2 rounded-none ${
                            sale.estado_despacho === 'pendiente'
                              ? 'bg-yellow-600 text-white border-yellow-600'
                              : 'bg-white text-black border-black hover:bg-yellow-600 hover:text-white hover:border-yellow-600'
                          }`}
                        >
                          <Package className="w-4 h-4" />
                          Pendiente
                        </Button>
                        <Button
                          data-testid={`status-en-camino-btn-${index}`}
                          onClick={() => updateStatus(sale.id, 'en_camino')}
                          disabled={sale.estado_despacho === 'en_camino'}
                          className={`flex items-center gap-2 border-2 rounded-none ${
                            sale.estado_despacho === 'en_camino'
                              ? 'bg-blue-600 text-white border-blue-600'
                              : 'bg-white text-black border-black hover:bg-blue-600 hover:text-white hover:border-blue-600'
                          }`}
                        >
                          <Truck className="w-4 h-4" />
                          En Camino
                        </Button>
                        <Button
                          data-testid={`status-despachado-btn-${index}`}
                          onClick={() => updateStatus(sale.id, 'despachado')}
                          disabled={sale.estado_despacho === 'despachado'}
                          className={`flex items-center gap-2 border-2 rounded-none ${
                            sale.estado_despacho === 'despachado'
                              ? 'bg-green-600 text-white border-green-600'
                              : 'bg-white text-black border-black hover:bg-green-600 hover:text-white hover:border-green-600'
                          }`}
                        >
                          <CheckCircle className="w-4 h-4" />
                          Despachado
                        </Button>
                      </div>
                    </div>

                    {/* Mostrar observaciones si existen */}
                    {sale.observaciones && (
                      <div className="mb-6 p-4 border-2 border-blue-500 bg-blue-50">
                        <h4 className="font-bold text-sm text-blue-900 mb-2">📝 Observaciones del Despacho:</h4>
                        <p className="text-gray-800">{sale.observaciones}</p>
                      </div>
                    )}

                    <h3 className="font-bold mb-4 text-lg">Detalles de la Venta</h3>
                    <div className="mb-4">
                      <p className="text-sm"><span className="font-medium">Dirección:</span> {sale.direccion_cliente}</p>
                    </div>
                    <div className="space-y-3">
                      {sale.items.map((item, itemIndex) => (
                        <div key={itemIndex} className="bg-white border-2 border-black p-4">
                          <div className="flex gap-4">
                            {item.imagen_url ? (
                              <img 
                                src={`${BACKEND_URL}${item.imagen_url}`} 
                                alt={item.descripcion}
                                className="w-20 h-20 object-cover border-2 border-black"
                              />
                            ) : (
                              <div className="w-20 h-20 border-2 border-black flex items-center justify-center bg-gray-200">
                                <ImageIcon className="w-10 h-10 text-gray-400" />
                              </div>
                            )}
                            <div className="flex-1 flex justify-between">
                              <div>
                                <p className="font-bold">{item.referencia}</p>
                                <p className="text-sm text-gray-600">{item.descripcion}</p>
                                <p className="text-sm">Talla: {item.talla} | Color: {item.color}</p>
                                <p className="text-sm">Cantidad: {item.cantidad} × ${item.precio_venta.toLocaleString()}</p>
                              </div>
                              <div className="text-right">
                                <p className="font-bold text-lg">${item.subtotal.toLocaleString()}</p>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {sales.length === 0 && (
            <div className="text-center py-12 text-gray-500 border-4 border-black bg-white" data-testid="no-sales">
              No hay ventas registradas
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Button } from './ui/button';
import { ArrowLeft, Package, Truck, CheckCircle, Image as ImageIcon } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function Dispatch() {
  const navigate = useNavigate();
  const [pendingSales, setPendingSales] = useState([]);
  const [expandedSale, setExpandedSale] = useState(null);
  const [observaciones, setObservaciones] = useState({});

  useEffect(() => {
    fetchPendingSales();
    // Actualizar cada 30 segundos
    const interval = setInterval(fetchPendingSales, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchPendingSales = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API}/sales/pending`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setPendingSales(response.data);
    } catch (error) {
      if (error.response?.status === 403) {
        toast.error('No tienes permiso para ver despachos');
        navigate('/');
      } else {
        toast.error('Error al cargar despachos pendientes');
      }
    }
  };

  const updateStatus = async (saleId, newStatus) => {
    try {
      const token = localStorage.getItem('token');
      await axios.put(
        `${API}/sales/${saleId}/status`,
        { 
          estado_despacho: newStatus,
          observaciones: observaciones[saleId] || null
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success('Estado actualizado');
      setObservaciones(prev => ({ ...prev, [saleId]: '' })); // Limpiar observaciones
      fetchPendingSales();
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
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-black" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
              Gestión de Despachos
            </h1>
            <p className="text-gray-600 mt-1">Ventas pendientes de envío</p>
          </div>
          <Button
            onClick={fetchPendingSales}
            variant="outline"
            className="border-2 border-black rounded-none hover:bg-black hover:text-white"
          >
            Actualizar
          </Button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-8 py-8">
        {pendingSales.length > 0 ? (
          <div className="space-y-4">
            {pendingSales.map((sale, index) => {
              const statusInfo = getStatusInfo(sale.estado_despacho);
              const StatusIcon = statusInfo.icon;
              
              return (
                <div key={sale.id} className="bg-white border-4 border-black" data-testid={`dispatch-item-${index}`}>
                  <button
                    data-testid={`dispatch-toggle-btn-${index}`}
                    onClick={() => setExpandedSale(expandedSale === sale.id ? null : sale.id)}
                    className="w-full p-6 text-left hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <p className="font-bold text-xl">{sale.nombre_cliente}</p>
                          <div className={`flex items-center gap-2 px-3 py-1 border-2 ${statusInfo.color}`}>
                            <StatusIcon className="w-4 h-4" />
                            <span className="text-sm font-medium">{statusInfo.label}</span>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <p className="text-gray-600">Documento: {sale.documento_cliente}</p>
                            <p className="text-gray-600">Teléfono: {sale.celular_cliente}</p>
                          </div>
                          <div>
                            <p className="text-gray-600">Dirección: {sale.direccion_cliente}</p>
                            <p className="text-gray-600 mt-1">
                              {format(new Date(sale.created_at), "d 'de' MMM, HH:mm", { locale: es })}
                            </p>
                          </div>
                        </div>
                        {sale.created_by && (
                          <p className="text-sm text-gray-500 mt-2">Vendido por: {sale.created_by}</p>
                        )}
                      </div>
                      <div className="text-right ml-4">
                        <p className="text-3xl font-bold">${sale.total.toLocaleString()}</p>
                        <p className="text-sm text-gray-600 mt-1">{sale.items.length} producto(s)</p>
                      </div>
                    </div>
                  </button>

                  {expandedSale === sale.id && (
                    <div className="border-t-4 border-black p-6 bg-gray-50">
                      <div className="mb-6">
                        <h3 className="font-bold mb-3 text-lg">Actualizar Estado</h3>
                        
                        {/* Campo de observaciones */}
                        <div className="mb-4">
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Observaciones / Notas del Despacho
                          </label>
                          <textarea
                            data-testid={`observaciones-textarea-${index}`}
                            value={observaciones[sale.id] || ''}
                            onChange={(e) => setObservaciones(prev => ({ ...prev, [sale.id]: e.target.value }))}
                            placeholder="Ej: Cliente solicita entrega en horario de la tarde, Paquete frágil, etc."
                            className="w-full p-3 border-2 border-black rounded-none min-h-[80px] focus:outline-none focus:ring-2 focus:ring-black"
                          />
                          {sale.observaciones && (
                            <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200">
                              <p className="text-xs font-medium text-yellow-800">Última observación:</p>
                              <p className="text-sm text-gray-700">{sale.observaciones}</p>
                            </div>
                          )}
                        </div>
                        
                        <div className="flex gap-3 flex-wrap">
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

                      <h3 className="font-bold mb-4 text-lg">Productos en el Pedido</h3>
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
                              <div className="flex-1">
                                <p className="font-bold text-lg">{item.referencia}</p>
                                <p className="text-gray-600">{item.descripcion}</p>
                                <p className="text-sm mt-1">
                                  <span className="font-medium">Talla:</span> {item.talla} | 
                                  <span className="font-medium"> Color:</span> {item.color}
                                </p>
                                <p className="text-sm font-medium mt-1">
                                  Cantidad: {item.cantidad} × ${item.precio_venta.toLocaleString()} = ${item.subtotal.toLocaleString()}
                                </p>
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
          </div>
        ) : (
          <div className="text-center py-20 border-4 border-black bg-white" data-testid="no-dispatches">
            <Package className="w-20 h-20 mx-auto text-gray-400 mb-4" />
            <h2 className="text-2xl font-bold text-gray-700 mb-2">No hay despachos pendientes</h2>
            <p className="text-gray-600">Todas las ventas están despachadas o no hay ventas registradas</p>
          </div>
        )}
      </div>
    </div>
  );
}
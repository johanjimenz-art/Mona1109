import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Button } from './ui/button';
import { ArrowLeft } from 'lucide-react';
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

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
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
        <div className="space-y-4">
          {sales.map((sale, index) => (
            <div key={sale.id} className="bg-white border-4 border-black" data-testid={`sale-item-${index}`}>
              <button
                data-testid={`sale-toggle-btn-${index}`}
                onClick={() => setExpandedSale(expandedSale === sale.id ? null : sale.id)}
                className="w-full p-6 text-left hover:bg-gray-50 transition-colors"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-bold text-lg">{sale.nombre_cliente}</p>
                    <p className="text-sm text-gray-600 mt-1">Doc: {sale.documento_cliente}</p>
                    <p className="text-sm text-gray-600">Tel: {sale.celular_cliente}</p>
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
                  <h3 className="font-bold mb-4 text-lg">Detalles de la Venta</h3>
                  <div className="mb-4">
                    <p className="text-sm"><span className="font-medium">Dirección:</span> {sale.direccion_cliente}</p>
                  </div>
                  <div className="space-y-3">
                    {sale.items.map((item, itemIndex) => (
                      <div key={itemIndex} className="bg-white border-2 border-black p-4">
                        <div className="flex justify-between">
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
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}

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
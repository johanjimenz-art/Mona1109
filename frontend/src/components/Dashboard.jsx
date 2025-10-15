import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Button } from './ui/button';
import { Package, ShoppingCart, History, LogOut, TrendingUp } from 'lucide-react';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function Dashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const username = localStorage.getItem('username');

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API}/stats`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setStats(response.data);
    } catch (error) {
      toast.error('Error al cargar estadísticas');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('username');
    navigate('/login');
    toast.success('Sesión cerrada');
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="border-b-4 border-black bg-white">
        <div className="max-w-7xl mx-auto px-8 py-6 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-black" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
              ClothTrack
            </h1>
            <p className="text-gray-600 mt-1">Bienvenido, {username}</p>
          </div>
          <Button
            data-testid="logout-btn"
            onClick={handleLogout}
            variant="outline"
            className="border-2 border-black rounded-none hover:bg-black hover:text-white"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Cerrar Sesión
          </Button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-8 py-12">
        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
            <div className="bg-white border-4 border-black p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm font-medium">Total Productos</p>
                  <p className="text-3xl font-bold text-black mt-2" data-testid="total-products">{stats.total_products}</p>
                </div>
                <Package className="w-10 h-10 text-black" />
              </div>
            </div>

            <div className="bg-white border-4 border-black p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm font-medium">Total Ventas</p>
                  <p className="text-3xl font-bold text-black mt-2" data-testid="total-sales">{stats.total_sales}</p>
                </div>
                <ShoppingCart className="w-10 h-10 text-black" />
              </div>
            </div>

            <div className="bg-white border-4 border-black p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm font-medium">Ingresos Totales</p>
                  <p className="text-3xl font-bold text-black mt-2" data-testid="total-revenue">${stats.total_revenue.toLocaleString()}</p>
                </div>
                <TrendingUp className="w-10 h-10 text-black" />
              </div>
            </div>

            <div className="bg-white border-4 border-black p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm font-medium">Valor Stock</p>
                  <p className="text-3xl font-bold text-black mt-2" data-testid="stock-value">${stats.total_stock_value.toLocaleString()}</p>
                </div>
                <Package className="w-10 h-10 text-black" />
              </div>
            </div>
          </div>
        )}

        {/* Navigation Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <button
            data-testid="inventory-nav-btn"
            onClick={() => navigate('/inventory')}
            className="bg-white border-4 border-black p-8 hover:translate-x-1 hover:translate-y-1 hover:shadow-none shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] transition-all"
          >
            <Package className="w-16 h-16 text-black mx-auto mb-4" />
            <h3 className="text-2xl font-bold text-black mb-2" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
              Inventario
            </h3>
            <p className="text-gray-600">Gestiona tus productos y stock</p>
          </button>

          <button
            data-testid="sales-nav-btn"
            onClick={() => navigate('/sales')}
            className="bg-white border-4 border-black p-8 hover:translate-x-1 hover:translate-y-1 hover:shadow-none shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] transition-all"
          >
            <ShoppingCart className="w-16 h-16 text-black mx-auto mb-4" />
            <h3 className="text-2xl font-bold text-black mb-2" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
              Ventas
            </h3>
            <p className="text-gray-600">Realiza nuevas ventas</p>
          </button>

          <button
            data-testid="history-nav-btn"
            onClick={() => navigate('/sales-history')}
            className="bg-white border-4 border-black p-8 hover:translate-x-1 hover:translate-y-1 hover:shadow-none shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] transition-all"
          >
            <History className="w-16 h-16 text-black mx-auto mb-4" />
            <h3 className="text-2xl font-bold text-black mb-2" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
              Historial
            </h3>
            <p className="text-gray-600">Revisa ventas realizadas</p>
          </button>
        </div>
      </div>
    </div>
  );
}
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Button } from './ui/button';
import { Package, ShoppingCart, History, LogOut, TrendingUp, Users, Bell } from 'lucide-react';
import { toast } from 'sonner';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function Dashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const username = localStorage.getItem('username');
  const role = localStorage.getItem('role');
  const isAdmin = role === 'admin';

  useEffect(() => {
    fetchStats();
    fetchNotifications();
    fetchUnreadCount();
    
    const interval = setInterval(() => {
      fetchNotifications();
      fetchUnreadCount();
    }, 30000);
    
    return () => clearInterval(interval);
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

  const fetchNotifications = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API}/notifications`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setNotifications(response.data.slice(0, 5));
    } catch (error) {
      console.error('Error fetching notifications');
    }
  };

  const fetchUnreadCount = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API}/notifications/unread/count`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUnreadCount(response.data.count);
    } catch (error) {
      console.error('Error fetching unread count');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('username');
    localStorage.removeItem('role');
    navigate('/login');
    toast.success('Sesión cerrada');
  };

  const markAsRead = async (notificationId) => {
    try {
      const token = localStorage.getItem('token');
      await axios.put(`${API}/notifications/${notificationId}/read`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchNotifications();
      fetchUnreadCount();
    } catch (error) {
      console.error('Error marking notification as read');
    }
  };

  return (
    <div className="min-h-screen bg-white">
      <div className="border-b-4 border-black bg-white">
        <div className="max-w-7xl mx-auto px-8 py-6 flex justify-between items-center">
          <div>
            <h1 className="text-3xl text-black brand-name">
              Cloth <span className="brand-bold">ON-OF</span>
            </h1>
            <p className="text-gray-600 mt-1">Bienvenido, {username} {isAdmin && '(Admin)'}</p>
          </div>
          <div className="flex items-center gap-4">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  data-testid="notifications-btn"
                  variant="outline"
                  className="relative border-2 border-black rounded-none hover:bg-gray-100"
                >
                  <Bell className="w-5 h-5" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-2 -right-2 bg-black text-white text-xs w-5 h-5 rounded-full flex items-center justify-center">
                      {unreadCount}
                    </span>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-80 border-2 border-black rounded-none" align="end">
                <div className="p-2">
                  <h3 className="font-bold mb-2">Notificaciones</h3>
                  {notifications.length === 0 ? (
                    <p className="text-sm text-gray-500 py-4">No hay notificaciones</p>
                  ) : (
                    <div className="space-y-2">
                      {notifications.map((notif) => (
                        <div
                          key={notif.id}
                          className={`p-2 text-sm border-2 border-black cursor-pointer ${
                            notif.leido ? 'bg-gray-100' : 'bg-white'
                          }`}
                          onClick={() => {
                            markAsRead(notif.id);
                            navigate('/sales-history');
                          }}
                        >
                          <p className="font-medium">{notif.mensaje}</p>
                          <p className="text-xs text-gray-500 mt-1">
                            {new Date(notif.created_at).toLocaleString('es')}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </DropdownMenuContent>
            </DropdownMenu>

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
      </div>

      <div className="max-w-7xl mx-auto px-8 py-12">
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

            {isAdmin && (
              <>
                <div className="bg-white border-4 border-black p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-600 text-sm font-medium">Ingresos Totales</p>
                      <p className="text-3xl font-bold text-black mt-2" data-testid="total-revenue">${stats.total_revenue?.toLocaleString()}</p>
                    </div>
                    <TrendingUp className="w-10 h-10 text-black" />
                  </div>
                </div>

                <div className="bg-white border-4 border-black p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-600 text-sm font-medium">Valor Stock</p>
                      <p className="text-3xl font-bold text-black mt-2" data-testid="stock-value">${stats.total_stock_value?.toLocaleString()}</p>
                    </div>
                    <Package className="w-10 h-10 text-black" />
                  </div>
                </div>
              </>
            )}
          </div>
        )}

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
            <p className="text-gray-600">Revisa ventas y despachos</p>
          </button>

          {isAdmin && (
            <button
              data-testid="users-nav-btn"
              onClick={() => navigate('/users')}
              className="bg-white border-4 border-black p-8 hover:translate-x-1 hover:translate-y-1 hover:shadow-none shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] transition-all"
            >
              <Users className="w-16 h-16 text-black mx-auto mb-4" />
              <h3 className="text-2xl font-bold text-black mb-2" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                Usuarios
              </h3>
              <p className="text-gray-600">Gestiona usuarios del sistema</p>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
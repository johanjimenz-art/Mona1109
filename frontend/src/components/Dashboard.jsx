import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Button } from './ui/button';
import { Package, ShoppingCart, History, LogOut, TrendingUp, Users, Bell, CreditCard, RefreshCw } from 'lucide-react';
import { toast } from '../lib/toast';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from './ui/dialog';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function Dashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [todaySales, setTodaySales] = useState([]);
  const [showSalesModal, setShowSalesModal] = useState(false);
  const [loadingSales, setLoadingSales] = useState(false);
  const username = localStorage.getItem('username');
  const role = localStorage.getItem('role');
  const isAdmin = role === 'admin';
  
  // Get permissions
  const permissions = JSON.parse(localStorage.getItem('permissions') || '{}');

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

  const fetchTodaySales = async () => {
    setLoadingSales(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API}/sales/today/detail`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setTodaySales(response.data);
    } catch (error) {
      toast.error('Error al cargar ventas del día');
    } finally {
      setLoadingSales(false);
    }
  };

  const handleOpenSalesModal = () => {
    setShowSalesModal(true);
    fetchTodaySales();
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
          <div className="flex items-center gap-4">
            <img 
              src="/logo.png" 
              alt="Control ON-OF" 
              className="h-36 object-contain"
            />
            <div>
              <p className="text-gray-600 mt-1">Bienvenido, {username} {isAdmin && '(Admin)'}</p>
            </div>
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
                          className={`p-2 text-sm border-2 cursor-pointer ${
                            notif.tipo === 'reset_password' 
                              ? 'border-orange-500 bg-orange-50' 
                              : 'border-black'
                          } ${
                            notif.leido ? 'bg-gray-100' : 'bg-white'
                          }`}
                          onClick={() => {
                            markAsRead(notif.id);
                            if (notif.tipo === 'reset_password') {
                              navigate('/users');
                            } else {
                              navigate('/sales-history');
                            }
                          }}
                        >
                          <p className="font-medium">
                            {notif.tipo === 'reset_password' && '🔑 '}
                            {notif.mensaje}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            {new Date(notif.created_at).toLocaleString('es-CO', { timeZone: 'America/Bogota' })}
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
                  <p className="text-gray-600 text-sm font-medium">Total Unidades en Stock</p>
                  <p className="text-3xl font-bold text-black mt-2" data-testid="total-products">{stats.total_units_in_stock}</p>
                  <p className="text-xs text-gray-500 mt-1">Todas las tallas</p>
                </div>
                <Package className="w-10 h-10 text-black" />
              </div>
            </div>

            <Dialog open={showSalesModal} onOpenChange={setShowSalesModal}>
              <DialogTrigger asChild>
                <button 
                  onClick={handleOpenSalesModal}
                  className="bg-white border-4 border-black p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all text-left"
                  data-testid="units-sold-today-btn"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-600 text-sm font-medium">Unidades Vendidas Hoy</p>
                      <p className="text-3xl font-bold text-black mt-2" data-testid="total-sales">{stats.today_units_sold}</p>
                      <p className="text-xs text-blue-600 mt-1 font-medium">Click para ver detalle</p>
                    </div>
                    <ShoppingCart className="w-10 h-10 text-black" />
                  </div>
                </button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto border-4 border-black rounded-none">
                <DialogHeader>
                  <DialogTitle className="text-2xl font-bold">Resumen de Ventas de Hoy</DialogTitle>
                  <DialogDescription>
                    {new Date().toLocaleDateString('es-CO', { timeZone: 'America/Bogota', weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                  </DialogDescription>
                </DialogHeader>
                
                {loadingSales ? (
                  <div className="py-8 text-center text-gray-500">Cargando ventas...</div>
                ) : todaySales.length === 0 ? (
                  <div className="py-8 text-center text-gray-500">No hay ventas registradas hoy</div>
                ) : (
                  <div className="space-y-4">
                    {todaySales.map((sale) => (
                      <div key={sale.id} className="border-2 border-black p-4 bg-gray-50">
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <h3 className="font-bold text-lg">{sale.nombre_cliente}</h3>
                            <p className="text-sm text-gray-600">{new Date(sale.created_at).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm text-gray-600">Total</p>
                            <p className="text-xl font-bold">${sale.total.toLocaleString()}</p>
                          </div>
                        </div>
                        
                        <div className="space-y-2">
                          <h4 className="font-semibold text-sm text-gray-700 border-b border-gray-300 pb-1">Productos vendidos:</h4>
                          {sale.items.map((item, idx) => (
                            <div key={idx} className="flex justify-between items-center py-2 border-b border-gray-200 last:border-0">
                              <div className="flex items-center gap-3 flex-1">
                                {item.imagen_url && (
                                  <img 
                                    src={`${BACKEND_URL}${item.imagen_url}`}
                                    alt={item.descripcion}
                                    className="w-12 h-12 object-cover border border-black"
                                  />
                                )}
                                <div>
                                  <p className="font-medium">{item.referencia}</p>
                                  <p className="text-xs text-gray-600">{item.descripcion}</p>
                                </div>
                              </div>
                              <div className="text-sm text-gray-700">
                                <span className="font-medium">Color:</span> {item.color}
                              </div>
                              <div className="text-sm text-gray-700">
                                <span className="font-medium">Talla:</span> {item.talla}
                              </div>
                              <div className="text-sm text-gray-700">
                                <span className="font-medium">Cant:</span> {item.cantidad}
                              </div>
                              <div className="text-right">
                                <p className="font-bold">${item.subtotal.toLocaleString()}</p>
                                <p className="text-xs text-gray-500">${item.precio_venta.toLocaleString()} c/u</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                    
                    <div className="border-t-4 border-black pt-4 mt-4">
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="text-gray-600">Total de ventas: {todaySales.length}</p>
                          <p className="text-gray-600">Total unidades: {stats.today_units_sold}</p>
                        </div>
                        {isAdmin && (
                          <div className="text-right">
                            <p className="text-gray-600">Ingresos totales</p>
                            <p className="text-2xl font-bold">${todaySales.reduce((sum, sale) => sum + sale.total, 0).toLocaleString()}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </DialogContent>
            </Dialog>

            {isAdmin && (
              <>
                <div className="bg-white border-4 border-black p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-600 text-sm font-medium">Ingresos de Hoy</p>
                      <p className="text-3xl font-bold text-black mt-2" data-testid="total-revenue">${stats.today_revenue?.toLocaleString()}</p>
                      <p className="text-xs text-gray-500 mt-1">{new Date().toLocaleDateString('es-CO', { timeZone: 'America/Bogota' })}</p>
                    </div>
                    <TrendingUp className="w-10 h-10 text-black" />
                  </div>
                </div>

                <div className="bg-white border-4 border-black p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-600 text-sm font-medium">Valor Total del Stock</p>
                      <p className="text-3xl font-bold text-black mt-2" data-testid="stock-value">${stats.total_stock_value?.toLocaleString()}</p>
                      <p className="text-xs text-gray-500 mt-1">Precio de venta</p>
                    </div>
                    <Package className="w-10 h-10 text-black" />
                  </div>
                </div>

                <div className="bg-white border-4 border-black p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-600 text-sm font-medium">Costo de Fabricación Total</p>
                      <p className="text-3xl font-bold text-green-700 mt-2" data-testid="stock-value-fabricacion">${stats.total_stock_value_fabricacion?.toLocaleString()}</p>
                      <p className="text-xs text-gray-500 mt-1">Inventario completo</p>
                    </div>
                    <Package className="w-10 h-10 text-green-700" />
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* Navigation Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Inventario - Admin o usuarios con permisos de inventario o venta */}
          {(isAdmin || permissions.inventario || permissions.venta) && (
            <button
              data-testid="inventory-nav-btn"
              onClick={() => navigate('/inventory')}
              className="bg-white border-4 border-black p-8 hover:translate-x-1 hover:translate-y-1 hover:shadow-none shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] transition-all"
            >
              <Package className="w-16 h-16 text-black mx-auto mb-4" />
              <h3 className="text-2xl font-bold text-black mb-2" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                Inventario
              </h3>
              <p className="text-gray-600">
                {isAdmin ? 'Gestiona tus productos y stock' : 'Ver productos disponibles'}
              </p>
            </button>
          )}

          {/* Ventas - Admin o usuarios con permiso de venta */}
          {(isAdmin || permissions.venta) && (
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
          )}

          {/* Despacho - Admin o usuarios con permiso de despacho */}
          {(isAdmin || permissions.despacho) && (
            <button
              data-testid="dispatch-nav-btn"
              onClick={() => navigate('/dispatch')}
              className="bg-white border-4 border-black p-8 hover:translate-x-1 hover:translate-y-1 hover:shadow-none shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] transition-all"
            >
              <History className="w-16 h-16 text-black mx-auto mb-4" />
              <h3 className="text-2xl font-bold text-black mb-2" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                Despacho
              </h3>
              <p className="text-gray-600">Gestiona envíos pendientes</p>
            </button>
          )}

          {/* Historial completo - Todos los usuarios */}
          <button
            data-testid="history-nav-btn"
            onClick={() => navigate('/sales-history')}
            className="bg-white border-4 border-black p-8 hover:translate-x-1 hover:translate-y-1 hover:shadow-none shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] transition-all"
          >
            <History className="w-16 h-16 text-black mx-auto mb-4" />
            <h3 className="text-2xl font-bold text-black mb-2" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
              Historial Completo
            </h3>
            <p className="text-gray-600">Todas las ventas realizadas</p>
          </button>


          {/* Créditos - Todos los usuarios */}
          <button
            data-testid="credits-nav-btn"
            onClick={() => navigate('/credits')}
            className="bg-white border-4 border-black p-8 hover:translate-x-1 hover:translate-y-1 hover:shadow-none shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] transition-all"
          >
            <CreditCard className="w-16 h-16 text-black mx-auto mb-4" />
            <h3 className="text-2xl font-bold text-black mb-2" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
              Créditos
            </h3>
            <p className="text-gray-600">Gestiona ventas a crédito</p>
            {stats && stats.total_credits_pending > 0 && (
              <div className="mt-2 bg-red-500 text-white px-3 py-1 inline-block">
                {stats.total_credits_pending} pendientes
              </div>
            )}
          </button>

          {/* Cambios - Todos los usuarios */}
          <button
            data-testid="cambios-nav-btn"
            onClick={() => navigate('/cambios')}
            className="bg-white border-4 border-black p-8 hover:translate-x-1 hover:translate-y-1 hover:shadow-none shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] transition-all"
          >
            <RefreshCw className="w-16 h-16 text-black mx-auto mb-4" />
            <h3 className="text-2xl font-bold text-black mb-2" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
              Cambios
            </h3>
            <p className="text-gray-600">Cambios de talla, color o producto</p>
          </button>


          {/* Usuarios - Solo admin */}
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
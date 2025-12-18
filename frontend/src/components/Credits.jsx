import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { ArrowLeft, DollarSign, Calendar, AlertTriangle, CheckCircle, Clock } from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from './ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function Credits() {
  const navigate = useNavigate();
  const [credits, setCredits] = useState([]);
  const [upcomingAlerts, setUpcomingAlerts] = useState([]);
  const [overdueAlerts, setOverdueAlerts] = useState([]);
  const [selectedCredit, setSelectedCredit] = useState(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentObservations, setPaymentObservations] = useState('');
  const [editData, setEditData] = useState({
    saldo_pendiente: '',
    fecha_pago: '',
    observaciones: ''
  });
  const [loading, setLoading] = useState(false);
  const [userRole, setUserRole] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredCredits, setFilteredCredits] = useState([]);

  useEffect(() => {
    const role = localStorage.getItem('role');
    setUserRole(role);
    fetchCredits();
    fetchAlerts();
  }, []);

  const fetchCredits = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API}/credit-sales`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setCredits(response.data || []);
    } catch (error) {
      console.error('Error al cargar créditos:', error);
      setCredits([]);
      toast.error('Error al cargar créditos');
    }
  };

  const fetchAlerts = async () => {
    try {
      const token = localStorage.getItem('token');
      
      const [upcomingRes, overdueRes] = await Promise.all([
        axios.get(`${API}/credit-sales/alerts/upcoming`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get(`${API}/credit-sales/alerts/overdue`, {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);
      
      setUpcomingAlerts(upcomingRes.data || []);
      setOverdueAlerts(overdueRes.data || []);
    } catch (error) {
      console.error('Error al cargar alertas:', error);
      setUpcomingAlerts([]);
      setOverdueAlerts([]);
    }
  };

  const handleRegisterPayment = async () => {
    if (!paymentAmount || parseFloat(paymentAmount) <= 0) {
      toast.error('Ingrese un monto válido');
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `${API}/credit-sales/${selectedCredit.id}/payments`,
        {
          monto: parseFloat(paymentAmount),
          observaciones: paymentObservations
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      toast.success('Abono registrado exitosamente');
      setShowPaymentModal(false);
      setPaymentAmount('');
      setPaymentObservations('');
      setSelectedCredit(null);
      fetchCredits();
      fetchAlerts();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error al registrar abono');
    } finally {
      setLoading(false);
    }
  };

  const handleEditCredit = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const updateData = {};
      
      if (editData.saldo_pendiente !== '') {
        updateData.saldo_pendiente = parseFloat(editData.saldo_pendiente);
      }
      if (editData.fecha_pago !== '') {
        updateData.fecha_pago = new Date(editData.fecha_pago).toISOString();
      }
      if (editData.observaciones !== '') {
        updateData.observaciones = editData.observaciones;
      }

      await axios.put(
        `${API}/credit-sales/${selectedCredit.id}`,
        updateData,
        { 
          headers: { Authorization: `Bearer ${token}` },
          params: updateData
        }
      );

      toast.success('Crédito actualizado exitosamente');
      setShowEditModal(false);
      setEditData({ saldo_pendiente: '', fecha_pago: '', observaciones: '' });
      setSelectedCredit(null);
      fetchCredits();
      fetchAlerts();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error al actualizar crédito');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCredit = async (creditId) => {
    if (!window.confirm('¿Está seguro de eliminar este crédito? Esta acción no se puede deshacer.')) {
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API}/credit-sales/${creditId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      toast.success('Crédito eliminado exitosamente');
      fetchCredits();
      fetchAlerts();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error al eliminar crédito');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (estado) => {
    const badges = {
      pendiente: { color: 'bg-yellow-500', text: 'Pendiente', icon: Clock },
      vencido: { color: 'bg-red-500', text: 'Vencido', icon: AlertTriangle },
      pagado: { color: 'bg-green-500', text: 'Pagado', icon: CheckCircle }
    };
    const badge = badges[estado] || badges.pendiente;
    const Icon = badge.icon;
    return (
      <span className={`inline-flex items-center gap-1 px-3 py-1 text-xs font-bold text-white ${badge.color}`}>
        <Icon className="w-3 h-3" />
        {badge.text}
      </span>
    );
  };

  const getDaysUntilPayment = (fechaPago) => {
    const today = new Date();
    const paymentDate = new Date(fechaPago);
    const diffTime = paymentDate - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
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
            Gestión de Créditos
          </h1>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-8 py-8">
        {/* Alerts Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* Upcoming Payments */}
          <div className="bg-yellow-50 border-4 border-yellow-500 p-6">
            <div className="flex items-center gap-2 mb-4">
              <Clock className="w-6 h-6 text-yellow-700" />
              <h2 className="text-xl font-bold text-yellow-900">Próximos Pagos (2 días)</h2>
            </div>
            {upcomingAlerts.length === 0 ? (
              <p className="text-yellow-700">No hay pagos próximos</p>
            ) : (
              <div className="space-y-2">
                {upcomingAlerts.map((credit) => (
                  <div key={credit.id} className="bg-white border-2 border-yellow-500 p-3">
                    <p className="font-bold">{credit.nombre_cliente}</p>
                    <p className="text-sm">Saldo: ${credit.saldo_pendiente.toLocaleString()}</p>
                    <p className="text-sm">
                      Vence en: {getDaysUntilPayment(credit.fecha_pago)} días
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Overdue Payments */}
          <div className="bg-red-50 border-4 border-red-500 p-6">
            <div className="flex items-center gap-2 mb-4">
              <AlertTriangle className="w-6 h-6 text-red-700" />
              <h2 className="text-xl font-bold text-red-900">Pagos Vencidos</h2>
            </div>
            {overdueAlerts.length === 0 ? (
              <p className="text-red-700">No hay pagos vencidos</p>
            ) : (
              <div className="space-y-2">
                {overdueAlerts.map((credit) => (
                  <div key={credit.id} className="bg-white border-2 border-red-500 p-3">
                    <p className="font-bold">{credit.nombre_cliente}</p>
                    <p className="text-sm">Saldo: ${credit.saldo_pendiente.toLocaleString()}</p>
                    <p className="text-sm text-red-600">
                      Vencido hace {Math.abs(getDaysUntilPayment(credit.fecha_pago))} días
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Credits List */}
        <div className="bg-white border-4 border-black p-6">
          <h2 className="text-2xl font-bold mb-6" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
            Todos los Créditos
          </h2>

          <Tabs defaultValue="all" className="w-full">
            <TabsList className="border-2 border-black rounded-none mb-6">
              <TabsTrigger value="all" className="data-[state=active]:bg-black data-[state=active]:text-white">
                Todos
              </TabsTrigger>
              <TabsTrigger value="pendiente" className="data-[state=active]:bg-yellow-500 data-[state=active]:text-white">
                Pendientes
              </TabsTrigger>
              <TabsTrigger value="vencido" className="data-[state=active]:bg-red-500 data-[state=active]:text-white">
                Vencidos
              </TabsTrigger>
              <TabsTrigger value="pagado" className="data-[state=active]:bg-green-500 data-[state=active]:text-white">
                Pagados
              </TabsTrigger>
            </TabsList>

            {['all', 'pendiente', 'vencido', 'pagado'].map((tab) => (
              <TabsContent key={tab} value={tab}>
                <div className="space-y-4">
                  {(credits || [])
                    .filter((c) => tab === 'all' || c.estado === tab)
                    .map((credit) => (
                      <div key={credit.id} className="border-2 border-black p-4">
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <h3 className="text-lg font-bold">{credit.nombre_cliente}</h3>
                            <p className="text-sm text-gray-600">{credit.documento_cliente}</p>
                            <p className="text-sm text-gray-600">{credit.celular_cliente}</p>
                          </div>
                          <div className="text-right">
                            {getStatusBadge(credit.estado)}
                          </div>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-3">
                          <div>
                            <p className="text-xs text-gray-600">Total</p>
                            <p className="font-bold">${credit.total.toLocaleString()}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-600">Abono Inicial</p>
                            <p className="font-bold">${credit.abono_inicial.toLocaleString()}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-600">Saldo Pendiente</p>
                            <p className="font-bold text-red-600">${credit.saldo_pendiente.toLocaleString()}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-600">Fecha de Pago</p>
                            <p className="font-bold">
                              {new Date(credit.fecha_pago).toLocaleDateString('es')}
                            </p>
                          </div>
                        </div>

                        {credit.observaciones && (
                          <div className="mb-3">
                            <p className="text-xs text-gray-600">Observaciones:</p>
                            <p className="text-sm">{credit.observaciones}</p>
                          </div>
                        )}

                        <div className="flex gap-2">
                          {credit.estado !== 'pagado' && (
                            <Button
                              onClick={() => {
                                setSelectedCredit(credit);
                                setShowPaymentModal(true);
                              }}
                              className="flex-1 bg-black text-white hover:bg-gray-800 rounded-none"
                            >
                              <DollarSign className="w-4 h-4 mr-2" />
                              Registrar Abono
                            </Button>
                          )}
                          
                          {userRole === 'admin' && (
                            <>
                              <Button
                                onClick={() => {
                                  setSelectedCredit(credit);
                                  setEditData({
                                    saldo_pendiente: credit.saldo_pendiente,
                                    fecha_pago: new Date(credit.fecha_pago).toISOString().split('T')[0],
                                    observaciones: credit.observaciones || ''
                                  });
                                  setShowEditModal(true);
                                }}
                                variant="outline"
                                className="border-2 border-black rounded-none hover:bg-gray-100"
                              >
                                Editar
                              </Button>
                              <Button
                                onClick={() => handleDeleteCredit(credit.id)}
                                variant="outline"
                                className="border-2 border-red-500 text-red-500 rounded-none hover:bg-red-50"
                                disabled={loading}
                              >
                                Eliminar
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    ))}
                </div>
              </TabsContent>
            ))}
          </Tabs>
        </div>
      </div>

      {/* Payment Modal */}
      <Dialog open={showPaymentModal} onOpenChange={setShowPaymentModal}>
        <DialogContent className="border-4 border-black rounded-none">
          <DialogHeader>
            <DialogTitle>Registrar Abono</DialogTitle>
            <DialogDescription>
              {selectedCredit && (
                <>
                  <p className="font-bold text-black mt-2">{selectedCredit.nombre_cliente}</p>
                  <p className="text-sm">Saldo pendiente: ${selectedCredit.saldo_pendiente.toLocaleString()}</p>
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-4">
            <div>
              <Label htmlFor="payment-amount">Monto del Abono</Label>
              <Input
                id="payment-amount"
                type="number"
                min="0"
                step="0.01"
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
                className="rounded-none border-2 border-black"
                placeholder="0.00"
              />
            </div>

            <div>
              <Label htmlFor="payment-observations">Observaciones (opcional)</Label>
              <Input
                id="payment-observations"
                value={paymentObservations}
                onChange={(e) => setPaymentObservations(e.target.value)}
                className="rounded-none border-2 border-black"
                placeholder="Notas adicionales"
              />
            </div>

            <Button
              onClick={handleRegisterPayment}
              disabled={loading}
              className="w-full bg-black text-white hover:bg-gray-800 rounded-none h-12"
            >
              {loading ? 'Procesando...' : 'Registrar Abono'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Credit Modal (Admin Only) */}
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent className="border-4 border-black rounded-none">
          <DialogHeader>
            <DialogTitle>Editar Crédito (Admin)</DialogTitle>
            <DialogDescription>
              {selectedCredit && (
                <>
                  <p className="font-bold text-black mt-2">{selectedCredit.nombre_cliente}</p>
                  <p className="text-sm">Documento: {selectedCredit.documento_cliente}</p>
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-4">
            <div>
              <Label htmlFor="edit-saldo">Saldo Pendiente</Label>
              <Input
                id="edit-saldo"
                type="number"
                min="0"
                step="0.01"
                value={editData.saldo_pendiente}
                onChange={(e) => setEditData({...editData, saldo_pendiente: e.target.value})}
                className="rounded-none border-2 border-black"
                placeholder="Nuevo saldo pendiente"
              />
              <p className="text-xs text-gray-500 mt-1">
                Saldo actual: ${selectedCredit?.saldo_pendiente.toLocaleString()}
              </p>
            </div>

            <div>
              <Label htmlFor="edit-fecha">Fecha de Pago</Label>
              <Input
                id="edit-fecha"
                type="date"
                value={editData.fecha_pago}
                onChange={(e) => setEditData({...editData, fecha_pago: e.target.value})}
                className="rounded-none border-2 border-black"
              />
            </div>

            <div>
              <Label htmlFor="edit-observations">Observaciones</Label>
              <Input
                id="edit-observations"
                value={editData.observaciones}
                onChange={(e) => setEditData({...editData, observaciones: e.target.value})}
                className="rounded-none border-2 border-black"
                placeholder="Actualizar observaciones"
              />
            </div>

            <div className="flex gap-2">
              <Button
                onClick={handleEditCredit}
                disabled={loading}
                className="flex-1 bg-black text-white hover:bg-gray-800 rounded-none h-12"
              >
                {loading ? 'Guardando...' : 'Guardar Cambios'}
              </Button>
              <Button
                onClick={() => {
                  setShowEditModal(false);
                  setEditData({ saldo_pendiente: '', fecha_pago: '', observaciones: '' });
                }}
                variant="outline"
                className="border-2 border-black rounded-none h-12"
              >
                Cancelar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

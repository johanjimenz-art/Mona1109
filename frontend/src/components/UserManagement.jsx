import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { ArrowLeft, Plus, UserPlus, Edit } from 'lucide-react';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function UserManagement() {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditingPermissions, setIsEditingPermissions] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    role: 'user',
    permissions: {
      inventario: false,
      venta: false,
      despacho: false,
      descuentos: false
    }
  });
  const [permissionsToEdit, setPermissionsToEdit] = useState({
    inventario: false,
    venta: false,
    despacho: false,
    descuentos: false
  });

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API}/users`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUsers(response.data);
    } catch (error) {
      toast.error('Error al cargar usuarios');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem('token');

    try {
      await axios.post(`${API}/auth/register`, formData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Usuario creado exitosamente');
      setIsDialogOpen(false);
      setFormData({ 
        username: '', 
        password: '', 
        role: 'user',
        permissions: {
          inventario: false,
          venta: false,
          despacho: false,
          descuentos: false
        }
      });
      fetchUsers();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error al crear usuario');
    }
  };

  const handleEditPermissions = (user) => {
    setSelectedUser(user);
    setPermissionsToEdit(user.permissions || {
      inventario: false,
      venta: false,
      despacho: false,
      descuentos: false
    });
    setIsEditingPermissions(true);
  };

  const handleUpdatePermissions = async () => {
    try {
      const token = localStorage.getItem('token');
      await axios.put(
        `${API}/users/${selectedUser.id}/permissions`,
        { permissions: permissionsToEdit },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success('Permisos actualizados');
      setIsEditingPermissions(false);
      fetchUsers();
    } catch (error) {
      toast.error('Error al actualizar permisos');
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handlePermissionChange = (permission) => {
    setFormData({
      ...formData,
      permissions: {
        ...formData.permissions,
        [permission]: !formData.permissions[permission]
      }
    });
  };

  const handleEditPermissionChange = (permission) => {
    setPermissionsToEdit({
      ...permissionsToEdit,
      [permission]: !permissionsToEdit[permission]
    });
  };

  return (
    <div className="min-h-screen bg-white">
      <div className="border-b-4 border-black bg-white">
        <div className="max-w-7xl mx-auto px-8 py-6 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Button
              data-testid="back-btn"
              onClick={() => navigate('/')}
              variant="outline"
              className="border-2 border-black rounded-none hover:bg-black hover:text-white"
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <h1 className="text-3xl font-bold text-black" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
              Gestión de Usuarios y Permisos
            </h1>
          </div>

          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) {
              setFormData({ 
                username: '', 
                password: '', 
                role: 'user',
                permissions: {
                  inventario: false,
                  venta: false,
                  despacho: false,
                  descuentos: false
                }
              });
            }
          }}>
            <DialogTrigger asChild>
              <Button
                data-testid="add-user-btn"
                className="bg-black text-white hover:bg-gray-800 rounded-none"
              >
                <UserPlus className="w-4 h-4 mr-2" />
                Crear Usuario
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md border-4 border-black rounded-none shadow-[12px_12px_0px_0px_rgba(0,0,0,1)]">
              <DialogHeader>
                <DialogTitle className="text-2xl font-bold" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                  Crear Nuevo Usuario
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="username" className="text-black font-medium mb-2 block">Usuario</Label>
                  <Input
                    id="username"
                    data-testid="username-input"
                    name="username"
                    value={formData.username}
                    onChange={handleChange}
                    required
                    className="rounded-none border-2 border-black"
                  />
                </div>
                <div>
                  <Label htmlFor="password" className="text-black font-medium mb-2 block">Contraseña</Label>
                  <Input
                    id="password"
                    data-testid="password-input"
                    name="password"
                    type="password"
                    value={formData.password}
                    onChange={handleChange}
                    required
                    minLength={6}
                    className="rounded-none border-2 border-black"
                  />
                </div>
                
                <div>
                  <Label className="text-black font-medium mb-3 block">Permisos de Acceso</Label>
                  <div className="space-y-2 border-2 border-black p-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.permissions.inventario}
                        onChange={() => handlePermissionChange('inventario')}
                        className="w-5 h-5 border-2 border-black"
                      />
                      <span>Inventario - Gestionar productos</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.permissions.venta}
                        onChange={() => handlePermissionChange('venta')}
                        className="w-5 h-5 border-2 border-black"
                      />
                      <span>Venta - Realizar ventas</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.permissions.despacho}
                        onChange={() => handlePermissionChange('despacho')}
                        className="w-5 h-5 border-2 border-black"
                      />
                      <span>Despacho - Gestionar envíos</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.permissions.descuentos}
                        onChange={() => handlePermissionChange('descuentos')}
                        className="w-5 h-5 border-2 border-black"
                      />
                      <span>Descuentos - Aplicar descuentos</span>
                    </label>
                  </div>
                </div>

                <Button
                  data-testid="save-user-btn"
                  type="submit"
                  className="w-full bg-black text-white hover:bg-gray-800 rounded-none h-12"
                >
                  Crear Usuario
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Edit Permissions Dialog */}
      <Dialog open={isEditingPermissions} onOpenChange={setIsEditingPermissions}>
        <DialogContent className="max-w-md border-4 border-black rounded-none shadow-[12px_12px_0px_0px_rgba(0,0,0,1)]">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
              Editar Permisos de {selectedUser?.username}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2 border-2 border-black p-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={permissionsToEdit.inventario}
                  onChange={() => handleEditPermissionChange('inventario')}
                  className="w-5 h-5 border-2 border-black"
                />
                <span>Inventario - Gestionar productos</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={permissionsToEdit.venta}
                  onChange={() => handleEditPermissionChange('venta')}
                  className="w-5 h-5 border-2 border-black"
                />
                <span>Venta - Realizar ventas</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={permissionsToEdit.despacho}
                  onChange={() => handleEditPermissionChange('despacho')}
                  className="w-5 h-5 border-2 border-black"
                />
                <span>Despacho - Gestionar envíos</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={permissionsToEdit.descuentos}
                  onChange={() => handleEditPermissionChange('descuentos')}
                  className="w-5 h-5 border-2 border-black"
                />
                <span>Descuentos - Aplicar descuentos</span>
              </label>
            </div>
            <Button
              onClick={handleUpdatePermissions}
              className="w-full bg-black text-white hover:bg-gray-800 rounded-none h-12"
            >
              Guardar Cambios
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <div className="max-w-7xl mx-auto px-8 py-8">
        <div className="bg-white border-4 border-black">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b-4 border-black bg-black text-white">
                  <th className="px-6 py-4 text-left font-bold">Usuario</th>
                  <th className="px-6 py-4 text-left font-bold">Rol</th>
                  <th className="px-6 py-4 text-left font-bold">Permisos</th>
                  <th className="px-6 py-4 text-left font-bold">Creado Por</th>
                  <th className="px-6 py-4 text-left font-bold">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user, index) => (
                  <tr key={user.id} className={index % 2 === 0 ? 'bg-gray-50' : 'bg-white'} data-testid={`user-row-${index}`}>
                    <td className="px-6 py-4 font-medium">{user.username}</td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 border-2 border-black ${
                        user.role === 'admin' ? 'bg-black text-white' : 'bg-white text-black'
                      }`}>
                        {user.role === 'admin' ? 'Admin' : 'Usuario'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {user.role === 'admin' ? (
                        <span className="text-sm">Todos los permisos</span>
                      ) : (
                        <div className="flex gap-2 flex-wrap">
                          {user.permissions?.inventario && <span className="px-2 py-1 bg-blue-100 border border-blue-600 text-xs">Inventario</span>}
                          {user.permissions?.venta && <span className="px-2 py-1 bg-green-100 border border-green-600 text-xs">Venta</span>}
                          {user.permissions?.despacho && <span className="px-2 py-1 bg-yellow-100 border border-yellow-600 text-xs">Despacho</span>}
                          {!user.permissions?.inventario && !user.permissions?.venta && !user.permissions?.despacho && (
                            <span className="text-sm text-gray-500">Sin permisos</span>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4">{user.created_by || 'Sistema'}</td>
                    <td className="px-6 py-4">
                      {user.role !== 'admin' && (
                        <Button
                          onClick={() => handleEditPermissions(user)}
                          variant="outline"
                          size="sm"
                          className="border-2 border-black rounded-none hover:bg-black hover:text-white"
                        >
                          <Edit className="w-4 h-4 mr-1" />
                          Editar Permisos
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {users.length === 0 && (
              <div className="text-center py-12 text-gray-500" data-testid="no-users">
                No hay usuarios registrados
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
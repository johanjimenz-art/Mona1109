import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { ArrowLeft, Plus, UserPlus } from 'lucide-react';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function UserManagement() {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    role: 'user'
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
      setFormData({ username: '', password: '', role: 'user' });
      fetchUsers();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error al crear usuario');
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
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
              Gestión de Usuarios
            </h1>
          </div>

          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) {
              setFormData({ username: '', password: '', role: 'user' });
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
                  <Label htmlFor="role" className="text-black font-medium mb-2 block">Rol</Label>
                  <select
                    id="role"
                    data-testid="role-select"
                    name="role"
                    value={formData.role}
                    onChange={handleChange}
                    className="w-full h-10 rounded-none border-2 border-black px-3"
                  >
                    <option value="user">Usuario Normal</option>
                    <option value="admin">Administrador</option>
                  </select>
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

      <div className="max-w-7xl mx-auto px-8 py-8">
        <div className="bg-white border-4 border-black">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b-4 border-black bg-black text-white">
                  <th className="px-6 py-4 text-left font-bold">Usuario</th>
                  <th className="px-6 py-4 text-left font-bold">Rol</th>
                  <th className="px-6 py-4 text-left font-bold">Creado Por</th>
                  <th className="px-6 py-4 text-left font-bold">Fecha Creación</th>
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
                    <td className="px-6 py-4">{user.created_by || 'Sistema'}</td>
                    <td className="px-6 py-4">{new Date(user.created_at).toLocaleDateString('es')}</td>
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
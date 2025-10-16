import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { toast } from 'sonner';
import { Lock } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function Login({ setIsAuthenticated }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await axios.post(`${API}/auth/login`, {
        username,
        password
      });

      localStorage.setItem('token', response.data.access_token);
      localStorage.setItem('username', response.data.username);
      localStorage.setItem('role', response.data.role);
      localStorage.setItem('permissions', JSON.stringify(response.data.permissions));
      setIsAuthenticated(true);
      toast.success('Inicio de sesión exitoso');
      navigate('/');
    } catch (error) {
      toast.error(
        error.response?.data?.detail || 'Error al iniciar sesión'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="w-full max-w-md px-8">
        <div className="text-center mb-12">
          <div className="flex justify-center mb-6">
            <img 
              src="/logo.png" 
              alt="Control ON-OF" 
              className="h-24 object-contain"
            />
          </div>
          <p className="text-gray-600">Sistema de Gestión de Inventario</p>
        </div>

        <div className="bg-white border-2 border-black p-8 rounded-none shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <Label htmlFor="username" className="text-black font-medium mb-2 block">
                Usuario
              </Label>
              <Input
                id="username"
                data-testid="username-input"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                className="rounded-none border-2 border-black focus:ring-0 focus:border-black h-12"
                placeholder="Ingrese su usuario"
              />
            </div>

            <div>
              <Label htmlFor="password" className="text-black font-medium mb-2 block">
                Contraseña
              </Label>
              <Input
                id="password"
                data-testid="password-input"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="rounded-none border-2 border-black focus:ring-0 focus:border-black h-12"
                placeholder="Ingrese su contraseña"
              />
            </div>

            <Button
              data-testid="submit-btn"
              type="submit"
              disabled={loading}
              className="w-full h-12 bg-black text-white hover:bg-gray-800 rounded-none font-medium text-base shadow-[4px_4px_0px_0px_rgba(0,0,0,0.3)]"
            >
              {loading ? 'Procesando...' : 'Iniciar Sesión'}
            </Button>
          </form>
        </div>

        <div className="mt-6 text-center text-sm text-gray-600">
          <p>Solo usuarios autorizados pueden acceder</p>
        </div>
      </div>
    </div>
  );
}
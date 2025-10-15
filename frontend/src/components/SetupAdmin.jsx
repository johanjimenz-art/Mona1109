import { useState } from 'react';
import axios from 'axios';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { toast } from 'sonner';
import { Shield } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function SetupAdmin({ onSetupComplete }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      toast.error('Las contraseñas no coinciden');
      return;
    }
    
    if (password.length < 6) {
      toast.error('La contraseña debe tener al menos 6 caracteres');
      return;
    }

    setLoading(true);

    try {
      const response = await axios.post(`${API}/auth/setup-admin`, {
        username,
        password
      });

      localStorage.setItem('token', response.data.access_token);
      localStorage.setItem('username', response.data.username);
      localStorage.setItem('role', response.data.role);
      
      toast.success('Administrador creado exitosamente');
      onSetupComplete();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error al crear administrador');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="w-full max-w-md px-8">
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-black rounded-full mb-6">
            <Shield className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-4xl text-black mb-2 brand-name">
            Configuración Inicial
          </h1>
          <p className="text-gray-600">Crea la cuenta de administrador principal</p>
        </div>

        <div className="bg-white border-2 border-black p-8 rounded-none shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <Label htmlFor="username" className="text-black font-medium mb-2 block">
                Usuario Administrador
              </Label>
              <Input
                id="username"
                data-testid="username-input"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                className="rounded-none border-2 border-black focus:ring-0 focus:border-black h-12"
                placeholder="Ingrese usuario"
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
                minLength={6}
                className="rounded-none border-2 border-black focus:ring-0 focus:border-black h-12"
                placeholder="Mínimo 6 caracteres"
              />
            </div>

            <div>
              <Label htmlFor="confirmPassword" className="text-black font-medium mb-2 block">
                Confirmar Contraseña
              </Label>
              <Input
                id="confirmPassword"
                data-testid="confirm-password-input"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                className="rounded-none border-2 border-black focus:ring-0 focus:border-black h-12"
                placeholder="Repita la contraseña"
              />
            </div>

            <Button
              data-testid="setup-btn"
              type="submit"
              disabled={loading}
              className="w-full h-12 bg-black text-white hover:bg-gray-800 rounded-none font-medium text-base shadow-[4px_4px_0px_0px_rgba(0,0,0,0.3)]"
            >
              {loading ? 'Creando...' : 'Crear Administrador'}
            </Button>
          </form>
        </div>

        <div className="mt-6 text-center text-sm text-gray-600">
          <p>⚠️ Guarda estas credenciales en un lugar seguro</p>
        </div>
      </div>
    </div>
  );
}
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { toast } from '../lib/toast';
import { Lock } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function Login({ setIsAuthenticated }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showResetDialog, setShowResetDialog] = useState(false);
  const [resetUsername, setResetUsername] = useState('');
  const [resetting, setResetting] = useState(false);
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


  const handleRequestPasswordReset = async () => {
    if (!resetUsername) {
      toast.error('Por favor ingresa tu nombre de usuario');
      return;
    }

    setResetting(true);
    try {
      await axios.post(`${API}/auth/request-password-reset`, null, {
        params: { username: resetUsername }
      });
      
      toast.success('Solicitud enviada al administrador. Pronto recibirás tu nueva contraseña.');
      setShowResetDialog(false);
      setResetUsername('');
    } catch (error) {
      toast.error('Error al enviar solicitud');
    } finally {
      setResetting(false);
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
              className="h-36 object-contain"
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
          
          <div className="mt-4 text-center">
            <button
              type="button"
              onClick={() => {
                setResetUsername(username);
                setShowResetDialog(true);
              }}
              className="text-sm text-gray-600 hover:text-black underline"
            >
              ¿Olvidaste tu contraseña?
            </button>
          </div>
        </div>

        <div className="mt-6 text-center text-sm text-gray-600">
          <p>Solo usuarios autorizados pueden acceder</p>
        </div>
      </div>

      {/* Password Reset Dialog */}
      <Dialog open={showResetDialog} onOpenChange={setShowResetDialog}>
        <DialogContent className="border-4 border-black rounded-none max-w-md">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold">Recuperar Contraseña</DialogTitle>
            <DialogDescription>
              Ingresa tu nombre de usuario. El administrador recibirá una notificación y te asignará una nueva contraseña.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-4">
            <div>
              <Label htmlFor="reset-username" className="text-black font-medium mb-2 block">
                Nombre de Usuario
              </Label>
              <Input
                id="reset-username"
                type="text"
                value={resetUsername}
                onChange={(e) => setResetUsername(e.target.value)}
                className="rounded-none border-2 border-black focus:ring-0 focus:border-black h-12"
                placeholder="Ingresa tu usuario"
              />
            </div>

            <Button
              onClick={handleRequestPasswordReset}
              disabled={resetting}
              className="w-full bg-black text-white hover:bg-gray-800 rounded-none h-12"
            >
              {resetting ? 'Enviando...' : 'Solicitar Recuperación'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
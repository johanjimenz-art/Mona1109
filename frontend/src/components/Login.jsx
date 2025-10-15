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
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const endpoint = isLogin ? '/auth/login' : '/auth/register';
      const response = await axios.post(`${API}${endpoint}`, {
        username,
        password
      });

      localStorage.setItem('token', response.data.access_token);
      localStorage.setItem('username', response.data.username);
      setIsAuthenticated(true);
      toast.success(isLogin ? 'Inicio de sesión exitoso' : 'Registro exitoso');
      navigate('/');
    } catch (error) {
      toast.error(
        error.response?.data?.detail || 
        (isLogin ? 'Error al iniciar sesión' : 'Error al registrarse')
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="w-full max-w-md px-8">
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-black rounded-full mb-6">
            <Lock className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-4xl text-black mb-2 brand-name">
            Cloth <span className="brand-bold">ON-OF</span>
          </h1>
          <p className="text-gray-600">Sistema de Gestión de Inventario</p>
        </div>

        <div className="bg-white border-2 border-black p-8 rounded-none shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
          <div className="flex gap-2 mb-8">
            <Button
              data-testid="login-tab-btn"
              type="button"
              onClick={() => setIsLogin(true)}
              variant={isLogin ? 'default' : 'outline'}
              className={`flex-1 rounded-none ${
                isLogin 
                  ? 'bg-black text-white hover:bg-gray-800' 
                  : 'bg-white text-black border-2 border-black hover:bg-gray-100'
              }`}
            >
              Iniciar Sesión
            </Button>
            <Button
              data-testid="register-tab-btn"
              type="button"
              onClick={() => setIsLogin(false)}
              variant={!isLogin ? 'default' : 'outline'}
              className={`flex-1 rounded-none ${
                !isLogin 
                  ? 'bg-black text-white hover:bg-gray-800' 
                  : 'bg-white text-black border-2 border-black hover:bg-gray-100'
              }`}
            >
              Registrarse
            </Button>
          </div>

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
              {loading ? 'Procesando...' : (isLogin ? 'Iniciar Sesión' : 'Registrarse')}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
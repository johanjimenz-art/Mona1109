import { useState, useEffect, createContext, useContext, useCallback } from 'react';

// Context para el sistema de toast
const ToastContext = createContext(null);

// Hook para usar el toast
export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

// Componente Toast individual
const Toast = ({ message, type, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const bgColor = type === 'success' ? 'bg-green-500' : 
                  type === 'error' ? 'bg-red-500' : 
                  type === 'warning' ? 'bg-yellow-500' : 'bg-blue-500';

  return (
    <div className={`${bgColor} text-white px-4 py-3 rounded shadow-lg flex items-center gap-2 min-w-[250px]`}>
      {type === 'success' && <span>✓</span>}
      {type === 'error' && <span>✕</span>}
      {type === 'warning' && <span>⚠</span>}
      {type === 'info' && <span>ℹ</span>}
      <span className="flex-1">{message}</span>
      <button onClick={onClose} className="ml-2 hover:opacity-70">×</button>
    </div>
  );
};

// Provider del sistema de toast
export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = 'info') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const toast = {
    success: (msg) => addToast(msg, 'success'),
    error: (msg) => addToast(msg, 'error'),
    warning: (msg) => addToast(msg, 'warning'),
    info: (msg) => addToast(msg, 'info'),
  };

  return (
    <ToastContext.Provider value={toast}>
      {children}
      {/* Toast container - NO USA PORTALES */}
      <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2">
        {toasts.map(t => (
          <Toast 
            key={t.id} 
            message={t.message} 
            type={t.type} 
            onClose={() => removeToast(t.id)} 
          />
        ))}
      </div>
    </ToastContext.Provider>
  );
};

// Función global para toast (compatibilidad con código existente)
let globalToast = null;

export const setGlobalToast = (toastFn) => {
  globalToast = toastFn;
};

export const toast = {
  success: (msg) => globalToast?.success(msg),
  error: (msg) => globalToast?.error(msg),
  warning: (msg) => globalToast?.warning(msg),
  info: (msg) => globalToast?.info(msg),
};

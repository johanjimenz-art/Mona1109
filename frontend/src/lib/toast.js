// Sistema de toast ultra-simple SIN portales
// Usa un div fijo en el DOM que se actualiza con vanilla JS

let toastContainer = null;
let toastTimeout = null;

const getContainer = () => {
  if (!toastContainer) {
    toastContainer = document.getElementById('toast-container');
    if (!toastContainer) {
      toastContainer = document.createElement('div');
      toastContainer.id = 'toast-container';
      toastContainer.style.cssText = `
        position: fixed;
        top: 16px;
        right: 16px;
        z-index: 99999;
        display: flex;
        flex-direction: column;
        gap: 8px;
        pointer-events: none;
      `;
      document.body.appendChild(toastContainer);
    }
  }
  return toastContainer;
};

const showToast = (message, type = 'info') => {
  const container = getContainer();
  
  // Limpiar toast anterior
  if (toastTimeout) {
    clearTimeout(toastTimeout);
  }
  
  const colors = {
    success: { bg: '#22c55e', icon: '✓' },
    error: { bg: '#ef4444', icon: '✕' },
    warning: { bg: '#f59e0b', icon: '⚠' },
    info: { bg: '#3b82f6', icon: 'ℹ' }
  };
  
  const { bg, icon } = colors[type] || colors.info;
  
  container.innerHTML = `
    <div style="
      background: ${bg};
      color: white;
      padding: 12px 16px;
      border-radius: 6px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      display: flex;
      align-items: center;
      gap: 8px;
      font-family: system-ui, -apple-system, sans-serif;
      font-size: 14px;
      pointer-events: auto;
      animation: slideIn 0.2s ease-out;
    ">
      <span style="font-size: 16px;">${icon}</span>
      <span>${message}</span>
    </div>
  `;
  
  // Auto-ocultar después de 3 segundos
  toastTimeout = setTimeout(() => {
    if (container) {
      container.innerHTML = '';
    }
  }, 3000);
};

// Agregar estilos de animación
if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = `
    @keyframes slideIn {
      from { transform: translateX(100%); opacity: 0; }
      to { transform: translateX(0); opacity: 1; }
    }
  `;
  document.head.appendChild(style);
}

export const toast = {
  success: (msg) => showToast(msg, 'success'),
  error: (msg) => showToast(msg, 'error'),
  warning: (msg) => showToast(msg, 'warning'),
  info: (msg) => showToast(msg, 'info'),
  message: (msg) => showToast(msg, 'info'),
};

// Componente vacío para compatibilidad (no renderiza nada)
export const Toaster = () => null;

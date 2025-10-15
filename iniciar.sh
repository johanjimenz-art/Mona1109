#!/bin/bash

echo "🚀 Iniciando Cloth ON-OF..."
echo ""

# Colores para mensajes
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Verificar si MongoDB está corriendo
echo "📦 Verificando MongoDB..."
if ! pgrep -x "mongod" > /dev/null; then
    echo "${YELLOW}Iniciando MongoDB...${NC}"
    brew services start mongodb-community
    sleep 2
fi
echo "${GREEN}✓ MongoDB corriendo${NC}"
echo ""

# Obtener la ruta del script
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# Iniciar Backend
echo "🔧 Iniciando Backend..."
cd "$SCRIPT_DIR/backend"

# Activar entorno virtual y iniciar servidor
source venv/bin/activate
uvicorn server:app --host 0.0.0.0 --port 8001 --reload > /tmp/cloth_backend.log 2>&1 &
BACKEND_PID=$!
echo "${GREEN}✓ Backend iniciado (PID: $BACKEND_PID)${NC}"
echo ""

# Esperar un poco para que el backend inicie
sleep 3

# Iniciar Frontend
echo "🎨 Iniciando Frontend..."
cd "$SCRIPT_DIR/frontend"
yarn start > /tmp/cloth_frontend.log 2>&1 &
FRONTEND_PID=$!
echo "${GREEN}✓ Frontend iniciado (PID: $FRONTEND_PID)${NC}"
echo ""

echo "=========================================="
echo "${GREEN}✅ Cloth ON-OF está corriendo!${NC}"
echo "=========================================="
echo ""
echo "📱 Abre tu navegador en: http://localhost:3000"
echo ""
echo "Logs:"
echo "  Backend:  tail -f /tmp/cloth_backend.log"
echo "  Frontend: tail -f /tmp/cloth_frontend.log"
echo ""
echo "⚠️  Para detener la aplicación: presiona Ctrl+C"
echo ""

# Función para limpiar al salir
cleanup() {
    echo ""
    echo "🛑 Deteniendo Cloth ON-OF..."
    kill $BACKEND_PID 2>/dev/null
    kill $FRONTEND_PID 2>/dev/null
    # Buscar y matar procesos de React en caso de que no se hayan cerrado
    pkill -f "react-scripts" 2>/dev/null
    echo "${GREEN}✓ Aplicación detenida${NC}"
    exit 0
}

# Capturar Ctrl+C
trap cleanup INT TERM

# Mantener el script corriendo
while true; do
    sleep 1
done

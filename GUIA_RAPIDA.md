# 🎯 Guía RÁPIDA - Cloth ON-OF

## Si ya tienes todo instalado (Python, Node.js, MongoDB):

### Primera vez:

1. **Abre Terminal** y ve a la carpeta de la aplicación:
```bash
cd /ruta/a/tu/carpeta/cloth-onof
```

2. **Instala dependencias del Backend** (solo primera vez):
```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cd ..
```

3. **Instala dependencias del Frontend** (solo primera vez):
```bash
cd frontend
yarn install
cd ..
```

4. **Haz el script ejecutable** (solo primera vez):
```bash
chmod +x iniciar.sh
```

### Cada vez que quieras usar la app:

```bash
./iniciar.sh
```

¡Y listo! Se abrirá automáticamente en tu navegador.

**Para cerrar:** Presiona `Ctrl + C` en la Terminal

---

## Si NO tienes nada instalado:

Sigue la guía completa en el archivo **INSTALACION_MAC.md**

Es un proceso de una sola vez de unos 20-30 minutos.

---

## Video Tutorial (próximamente)

Si necesitas ayuda visual, podemos crear un video mostrando el proceso completo.

---

## Archivos importantes:

- `INSTALACION_MAC.md` - Guía detallada paso a paso
- `iniciar.sh` - Script para iniciar la app fácilmente
- `backend/.env` - Configuración del servidor
- `frontend/.env` - Configuración de la interfaz

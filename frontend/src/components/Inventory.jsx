import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { ArrowLeft, Plus, Pencil, Trash2, Upload, CheckCircle, XCircle, Image as ImageIcon } from 'lucide-react';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function Inventory() {
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const role = localStorage.getItem('role');
  const isAdmin = role === 'admin';
  const permissions = JSON.parse(localStorage.getItem('permissions') || '{}');
  const canModify = isAdmin; // Solo admin puede modificar
  
  const [formData, setFormData] = useState({
    descripcion: '',
    referencia: '',
    color: '',
    costo_fabricacion: '',
    talla: '',
    precio_venta: '',
    cantidad_stock: ''
  });

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API}/products`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setProducts(response.data);
    } catch (error) {
      toast.error('Error al cargar productos');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem('token');

    try {
      const data = {
        ...formData,
        costo_fabricacion: formData.costo_fabricacion ? parseFloat(formData.costo_fabricacion) : null,
        precio_venta: parseFloat(formData.precio_venta),
        cantidad_stock: parseInt(formData.cantidad_stock)
      };

      let productId;
      if (editingProduct) {
        await axios.put(`${API}/products/${editingProduct.id}`, data, {
          headers: { Authorization: `Bearer ${token}` }
        });
        productId = editingProduct.id;
        toast.success('Producto actualizado');
      } else {
        const response = await axios.post(`${API}/products`, data, {
          headers: { Authorization: `Bearer ${token}` }
        });
        productId = response.data.id;
        toast.success(isAdmin ? 'Producto creado' : 'Producto creado - Pendiente de aprobación');
      }

      // Upload image if selected
      if (selectedFile && productId) {
        await uploadImage(productId, selectedFile);
      }

      setIsDialogOpen(false);
      setEditingProduct(null);
      setSelectedFile(null);
      setFormData({
        descripcion: '',
        referencia: '',
        color: '',
        costo_fabricacion: '',
        talla: '',
        precio_venta: '',
        cantidad_stock: ''
      });
      fetchProducts();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error al guardar producto');
    }
  };

  const uploadImage = async (productId, file) => {
    setUploadingImage(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const token = localStorage.getItem('token');
      await axios.post(`${API}/products/${productId}/upload-image`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });
      toast.success('Imagen subida exitosamente');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error al subir imagen');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/jpeg')) {
      toast.error('Solo se permiten imágenes JPEG');
      return;
    }

    // Validate file size (1MB)
    if (file.size > 1 * 1024 * 1024) {
      toast.error('La imagen debe ser menor a 1MB');
      return;
    }

    setSelectedFile(file);
  };

  const handleEdit = (product) => {
    setEditingProduct(product);
    setFormData({
      descripcion: product.descripcion,
      referencia: product.referencia,
      color: product.color,
      costo_fabricacion: product.costo_fabricacion?.toString() || '',
      talla: product.talla,
      precio_venta: product.precio_venta.toString(),
      cantidad_stock: product.cantidad_stock.toString()
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (productId) => {
    if (!window.confirm('¿Está seguro de eliminar este producto?')) return;

    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API}/products/${productId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Producto eliminado');
      fetchProducts();
    } catch (error) {
      toast.error('Error al eliminar producto');
    }
  };

  const handleApprove = async (productId) => {
    try {
      const token = localStorage.getItem('token');
      await axios.put(`${API}/products/${productId}`, { aprobado: true }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Producto aprobado');
      fetchProducts();
    } catch (error) {
      toast.error('Error al aprobar producto');
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
              Gestión de Inventario
            </h1>
          </div>

          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) {
              setEditingProduct(null);
              setSelectedFile(null);
              setFormData({
                descripcion: '',
                referencia: '',
                color: '',
                costo_fabricacion: '',
                talla: '',
                precio_venta: '',
                cantidad_stock: ''
              });
            }
          }}>
            <DialogTrigger asChild>
              <Button
                data-testid="add-product-btn"
                className="bg-black text-white hover:bg-gray-800 rounded-none"
              >
                <Plus className="w-4 h-4 mr-2" />
                Agregar Producto
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl border-4 border-black rounded-none shadow-[12px_12px_0px_0px_rgba(0,0,0,1)]">
              <DialogHeader>
                <DialogTitle className="text-2xl font-bold" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                  {editingProduct ? 'Editar Producto' : 'Agregar Producto'}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="descripcion" className="text-black font-medium mb-2 block">Descripción</Label>
                    <Input
                      id="descripcion"
                      data-testid="descripcion-input"
                      name="descripcion"
                      value={formData.descripcion}
                      onChange={handleChange}
                      required
                      className="rounded-none border-2 border-black"
                    />
                  </div>
                  <div>
                    <Label htmlFor="referencia" className="text-black font-medium mb-2 block">Referencia</Label>
                    <Input
                      id="referencia"
                      data-testid="referencia-input"
                      name="referencia"
                      value={formData.referencia}
                      onChange={handleChange}
                      required
                      className="rounded-none border-2 border-black"
                    />
                  </div>
                  <div>
                    <Label htmlFor="color" className="text-black font-medium mb-2 block">Color</Label>
                    <Input
                      id="color"
                      data-testid="color-input"
                      name="color"
                      value={formData.color}
                      onChange={handleChange}
                      required
                      className="rounded-none border-2 border-black"
                    />
                  </div>
                  <div>
                    <Label htmlFor="talla" className="text-black font-medium mb-2 block">Talla</Label>
                    <Input
                      id="talla"
                      data-testid="talla-input"
                      name="talla"
                      value={formData.talla}
                      onChange={handleChange}
                      required
                      className="rounded-none border-2 border-black"
                    />
                  </div>
                  {isAdmin && (
                    <div>
                      <Label htmlFor="costo_fabricacion" className="text-black font-medium mb-2 block">Costo Fabricación</Label>
                      <Input
                        id="costo_fabricacion"
                        data-testid="costo-input"
                        name="costo_fabricacion"
                        type="number"
                        step="0.01"
                        value={formData.costo_fabricacion}
                        onChange={handleChange}
                        className="rounded-none border-2 border-black"
                      />
                    </div>
                  )}
                  <div>
                    <Label htmlFor="precio_venta" className="text-black font-medium mb-2 block">Precio Venta</Label>
                    <Input
                      id="precio_venta"
                      data-testid="precio-input"
                      name="precio_venta"
                      type="number"
                      step="0.01"
                      value={formData.precio_venta}
                      onChange={handleChange}
                      required
                      className="rounded-none border-2 border-black"
                    />
                  </div>
                  <div>
                    <Label htmlFor="cantidad_stock" className="text-black font-medium mb-2 block">Cantidad Stock</Label>
                    <Input
                      id="cantidad_stock"
                      data-testid="cantidad-input"
                      name="cantidad_stock"
                      type="number"
                      value={formData.cantidad_stock}
                      onChange={handleChange}
                      required
                      className="rounded-none border-2 border-black"
                    />
                  </div>
                </div>

                {/* Image Upload */}
                <div>
                  <Label className="text-black font-medium mb-2 block">Imagen del Producto (JPEG, máx 1MB)</Label>
                  <div className="flex items-center gap-4">
                    <Input
                      type="file"
                      accept="image/jpeg"
                      onChange={handleFileSelect}
                      className="rounded-none border-2 border-black"
                    />
                    {selectedFile && (
                      <span className="text-sm text-green-600">✓ {selectedFile.name}</span>
                    )}
                  </div>
                </div>

                <Button
                  data-testid="save-product-btn"
                  type="submit"
                  disabled={uploadingImage}
                  className="w-full bg-black text-white hover:bg-gray-800 rounded-none h-12"
                >
                  {uploadingImage ? 'Subiendo...' : (editingProduct ? 'Actualizar' : 'Guardar')}
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
                  <th className="px-6 py-4 text-left font-bold">Imagen</th>
                  <th className="px-6 py-4 text-left font-bold">Referencia</th>
                  <th className="px-6 py-4 text-left font-bold">Descripción</th>
                  <th className="px-6 py-4 text-left font-bold">Talla</th>
                  <th className="px-6 py-4 text-left font-bold">Color</th>
                  {isAdmin && <th className="px-6 py-4 text-left font-bold">Costo Fab.</th>}
                  <th className="px-6 py-4 text-left font-bold">Precio Venta</th>
                  <th className="px-6 py-4 text-left font-bold">Stock</th>
                  <th className="px-6 py-4 text-left font-bold">Estado</th>
                  <th className="px-6 py-4 text-left font-bold">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {products.map((product, index) => (
                  <tr key={product.id} className={index % 2 === 0 ? 'bg-gray-50' : 'bg-white'} data-testid={`product-row-${index}`}>
                    <td className="px-6 py-4">
                      {product.imagen_url ? (
                        <img 
                          src={`${BACKEND_URL}${product.imagen_url}`} 
                          alt={product.descripcion}
                          className="w-12 h-12 object-cover border-2 border-black"
                        />
                      ) : (
                        <div className="w-12 h-12 border-2 border-black flex items-center justify-center bg-gray-200">
                          <ImageIcon className="w-6 h-6 text-gray-400" />
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 font-medium">{product.referencia}</td>
                    <td className="px-6 py-4">{product.descripcion}</td>
                    <td className="px-6 py-4">{product.talla}</td>
                    <td className="px-6 py-4">{product.color}</td>
                    {isAdmin && <td className="px-6 py-4">${product.costo_fabricacion?.toLocaleString() || 'N/A'}</td>}
                    <td className="px-6 py-4">${product.precio_venta.toLocaleString()}</td>
                    <td className="px-6 py-4">
                      <span className={`font-bold ${product.cantidad_stock < 5 ? 'text-red-600' : 'text-black'}`}>
                        {product.cantidad_stock}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {product.aprobado ? (
                        <CheckCircle className="w-5 h-5 text-green-600" />
                      ) : (
                        <XCircle className="w-5 h-5 text-red-600" />
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2">
                        <Button
                          data-testid={`edit-product-btn-${index}`}
                          onClick={() => handleEdit(product)}
                          variant="outline"
                          size="sm"
                          className="border-2 border-black rounded-none hover:bg-black hover:text-white"
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        {isAdmin && (
                          <>
                            {!product.aprobado && (
                              <Button
                                data-testid={`approve-product-btn-${index}`}
                                onClick={() => handleApprove(product.id)}
                                variant="outline"
                                size="sm"
                                className="border-2 border-green-600 text-green-600 rounded-none hover:bg-green-600 hover:text-white"
                              >
                                <CheckCircle className="w-4 h-4" />
                              </Button>
                            )}
                            <Button
                              data-testid={`delete-product-btn-${index}`}
                              onClick={() => handleDelete(product.id)}
                              variant="outline"
                              size="sm"
                              className="border-2 border-black rounded-none hover:bg-red-600 hover:text-white hover:border-red-600"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {products.length === 0 && (
              <div className="text-center py-12 text-gray-500" data-testid="no-products">
                No hay productos en el inventario
              </div>
            )}
          </div>
        </div>

        {!isAdmin && (
          <div className="mt-4 p-4 border-2 border-yellow-500 bg-yellow-50">
            <p className="text-sm text-gray-700">
              ⚠️ Los productos que crees necesitan ser aprobados por un administrador antes de aparecer en ventas.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { ArrowLeft, Plus, Pencil, Trash2, Upload, CheckCircle, XCircle, Image as ImageIcon, Search } from 'lucide-react';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function Inventory() {
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [groupedProducts, setGroupedProducts] = useState([]);
  const [filteredGroupedProducts, setFilteredGroupedProducts] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedRef, setExpandedRef] = useState(null);
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
    fetchGroupedProducts();
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

  const fetchGroupedProducts = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API}/products/grouped`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setGroupedProducts(response.data);
      setFilteredGroupedProducts(response.data);
    } catch (error) {
      toast.error('Error al cargar productos agrupados');
    }
  };

  // Filtrar productos cuando cambia el término de búsqueda
  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredGroupedProducts(groupedProducts);
    } else {
      const filtered = groupedProducts.filter(group =>
        group.referencia.toLowerCase().includes(searchTerm.toLowerCase()) ||
        group.descripcion.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredGroupedProducts(filtered);
    }
  }, [searchTerm, groupedProducts]);

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
      fetchGroupedProducts();
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
      fetchGroupedProducts();
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
      fetchGroupedProducts();
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
              {canModify ? 'Gestión de Inventario' : 'Consultar Inventario'}
            </h1>
          </div>

          {canModify && (
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
          )}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-8 py-8">
        <div className="bg-white border-4 border-black">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b-4 border-black bg-black text-white">
                  <th className="px-6 py-4 text-left font-bold w-12"></th>
                  <th className="px-6 py-4 text-left font-bold">Imagen</th>
                  <th className="px-6 py-4 text-left font-bold">Referencia</th>
                  <th className="px-6 py-4 text-left font-bold">Descripción</th>
                  <th className="px-6 py-4 text-left font-bold">Color</th>
                  {isAdmin && <th className="px-6 py-4 text-left font-bold">Costo Fab.</th>}
                  <th className="px-6 py-4 text-left font-bold">Precio Venta</th>
                  <th className="px-6 py-4 text-left font-bold">Stock Total</th>
                </tr>
              </thead>
              <tbody>
                {groupedProducts.map((group, index) => (
                  <>
                    <tr 
                      key={group.referencia} 
                      className={`cursor-pointer hover:bg-gray-100 ${index % 2 === 0 ? 'bg-gray-50' : 'bg-white'}`}
                      onClick={() => setExpandedRef(expandedRef === group.referencia ? null : group.referencia)}
                      data-testid={`product-group-${index}`}
                    >
                      <td className="px-6 py-4">
                        <button className="text-2xl font-bold">
                          {expandedRef === group.referencia ? '−' : '+'}
                        </button>
                      </td>
                      <td className="px-6 py-4">
                        {group.imagen_url ? (
                          <img 
                            src={`${BACKEND_URL}${group.imagen_url}`} 
                            alt={group.descripcion}
                            className="w-16 h-16 object-cover border-2 border-black"
                          />
                        ) : (
                          <div className="w-16 h-16 border-2 border-black flex items-center justify-center bg-gray-200">
                            <ImageIcon className="w-8 h-8 text-gray-400" />
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 font-bold text-lg">{group.referencia}</td>
                      <td className="px-6 py-4">{group.descripcion}</td>
                      <td className="px-6 py-4">{group.color}</td>
                      {isAdmin && <td className="px-6 py-4">${group.costo_fabricacion?.toLocaleString() || 'N/A'}</td>}
                      <td className="px-6 py-4 font-medium">${group.precio_venta.toLocaleString()}</td>
                      <td className="px-6 py-4">
                        <span className={`font-bold text-lg ${group.stock_total < 10 ? 'text-red-600' : 'text-black'}`}>
                          {group.stock_total} unidades
                        </span>
                      </td>
                    </tr>
                    
                    {/* Expandir tallas */}
                    {expandedRef === group.referencia && (
                      <tr>
                        <td colSpan={isAdmin ? 8 : 7} className="p-0">
                          <div className="bg-blue-50 border-t-2 border-b-2 border-blue-200">
                            <div className="p-4">
                              <h4 className="font-bold text-sm text-blue-900 mb-3">📏 Desglose por Tallas:</h4>
                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                {group.tallas.map((talla, tallaIndex) => {
                                  const product = products.find(p => p.id === talla.id);
                                  return (
                                    <div key={talla.id} className="bg-white border-2 border-black p-4">
                                      <div className="flex justify-between items-start mb-2">
                                        <div>
                                          <span className="font-bold text-xl">Talla {talla.talla}</span>
                                          {!talla.aprobado && (
                                            <span className="ml-2 text-xs bg-yellow-200 border border-yellow-600 px-2 py-1">Pendiente</span>
                                          )}
                                        </div>
                                        <span className={`text-2xl font-bold ${talla.cantidad_stock < 3 ? 'text-red-600' : 'text-green-600'}`}>
                                          {talla.cantidad_stock}
                                        </span>
                                      </div>
                                      {canModify && product && (
                                        <div className="flex gap-2 mt-3">
                                          <Button
                                            data-testid={`edit-size-btn-${index}-${tallaIndex}`}
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              handleEdit(product);
                                            }}
                                            size="sm"
                                            className="flex-1 bg-black text-white hover:bg-gray-800 rounded-none"
                                          >
                                            <Pencil className="w-3 h-3 mr-1" />
                                            Editar
                                          </Button>
                                          <Button
                                            data-testid={`delete-size-btn-${index}-${tallaIndex}`}
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              handleDelete(product.id);
                                            }}
                                            size="sm"
                                            variant="outline"
                                            className="border-2 border-red-600 text-red-600 rounded-none hover:bg-red-600 hover:text-white"
                                          >
                                            <Trash2 className="w-3 h-3" />
                                          </Button>
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                ))}
              </tbody>
            </table>
            {groupedProducts.length === 0 && (
              <div className="text-center py-12 text-gray-500" data-testid="no-products">
                No hay productos en el inventario
              </div>
            )}
          </div>
        </div>

        {!canModify && (
          <div className="mt-4 p-4 border-2 border-blue-500 bg-blue-50">
            <p className="text-sm text-gray-700">
              ℹ️ Estás viendo el inventario en modo consulta. Solo puedes ver los productos disponibles y sus cantidades.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
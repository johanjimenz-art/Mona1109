import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { ArrowLeft, Plus, Pencil, Trash2, Upload, CheckCircle, XCircle, Image as ImageIcon, Search, ArrowRightLeft, AlertTriangle, Warehouse, Store } from 'lucide-react';
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
    cantidad_stock: '',
    stock_estudio: '',
    stock_bodega: ''
  });
  
  // Estados para transferencias
  const [showTransferDialog, setShowTransferDialog] = useState(false);
  const [transferProduct, setTransferProduct] = useState(null);
  const [transferData, setTransferData] = useState({
    cantidad: 1,
    origen: 'bodega',
    destino: 'estudio'
  });
  const [stockAlerts, setStockAlerts] = useState([]);

  useEffect(() => {
    fetchProducts();
    fetchGroupedProducts();
    fetchStockAlerts();
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

  const fetchStockAlerts = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API}/products/stock-alerts`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setStockAlerts(response.data);
    } catch (error) {
      console.error('Error al cargar alertas de stock:', error);
    }
  };

  const handleTransfer = async () => {
    if (!transferProduct) return;
    
    try {
      const token = localStorage.getItem('token');
      await axios.post(`${API}/products/transfer`, {
        product_id: transferProduct.id,
        cantidad: parseInt(transferData.cantidad),
        origen: transferData.origen,
        destino: transferData.destino
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      toast.success(`Transferencia exitosa: ${transferData.cantidad} unidades`);
      setShowTransferDialog(false);
      setTransferProduct(null);
      setTransferData({ cantidad: 1, origen: 'bodega', destino: 'estudio' });
      fetchProducts();
      fetchGroupedProducts();
      fetchStockAlerts();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error en la transferencia');
    }
  };

  const openTransferDialog = (product) => {
    setTransferProduct(product);
    setTransferData({
      cantidad: 1,
      origen: 'bodega',
      destino: 'estudio'
    });
    setShowTransferDialog(true);
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
      // Calcular stock total como suma de estudio + bodega
      const stockEstudio = parseInt(formData.stock_estudio) || 0;
      const stockBodega = parseInt(formData.stock_bodega) || 0;
      const stockTotal = stockEstudio + stockBodega;
      
      const data = {
        ...formData,
        costo_fabricacion: formData.costo_fabricacion ? parseFloat(formData.costo_fabricacion) : null,
        precio_venta: parseFloat(formData.precio_venta),
        cantidad_stock: stockTotal,
        stock_estudio: stockEstudio,
        stock_bodega: stockBodega
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
        cantidad_stock: '',
        stock_estudio: '',
        stock_bodega: ''
      });
      fetchProducts();
      fetchGroupedProducts();
      fetchStockAlerts();
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
      cantidad_stock: product.cantidad_stock.toString(),
      stock_estudio: (product.stock_estudio || 0).toString(),
      stock_bodega: (product.stock_bodega || 0).toString()
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
      {/* Header */}
      <div className="border-b-4 border-black bg-white">
        <div className="max-w-7xl mx-auto px-8 py-6">
          <div className="flex justify-between items-center mb-4">
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
                cantidad_stock: '',
                stock_estudio: '',
                stock_bodega: ''
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
                  <div className="col-span-2">
                    <Label className="text-black font-medium mb-2 block">📦 Stock por Ubicación</Label>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-3 border-2 border-green-500 bg-green-50">
                        <Label htmlFor="stock_estudio" className="text-green-700 font-medium mb-1 block flex items-center gap-1">
                          <Store className="w-4 h-4" /> Estudio ON-OF
                        </Label>
                        <Input
                          id="stock_estudio"
                          data-testid="stock-estudio-input"
                          name="stock_estudio"
                          type="number"
                          min="0"
                          value={formData.stock_estudio}
                          onChange={handleChange}
                          placeholder="0"
                          className="rounded-none border-2 border-green-500"
                        />
                      </div>
                      <div className="p-3 border-2 border-blue-500 bg-blue-50">
                        <Label htmlFor="stock_bodega" className="text-blue-700 font-medium mb-1 block flex items-center gap-1">
                          <Warehouse className="w-4 h-4" /> Bodega
                        </Label>
                        <Input
                          id="stock_bodega"
                          data-testid="stock-bodega-input"
                          name="stock_bodega"
                          type="number"
                          min="0"
                          value={formData.stock_bodega}
                          onChange={handleChange}
                          placeholder="0"
                          className="rounded-none border-2 border-blue-500"
                        />
                      </div>
                    </div>
                    <p className="text-sm text-gray-500 mt-2">
                      Stock Total: <strong>{(parseInt(formData.stock_estudio) || 0) + (parseInt(formData.stock_bodega) || 0)}</strong> unidades
                    </p>
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
          
          {/* Búsqueda */}
          <div className="relative mt-4">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <Input
              data-testid="search-input"
              type="text"
              placeholder="Buscar por referencia o descripción..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 rounded-none border-2 border-black h-12"
            />
          </div>
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
                  <th className="px-6 py-4 text-left font-bold">🏪 Estudio</th>
                  <th className="px-6 py-4 text-left font-bold">📦 Bodega</th>
                </tr>
              </thead>
              <tbody>
                {filteredGroupedProducts.map((group, index) => (
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
                      <td className="px-6 py-4">
                        <span className={`font-bold ${(group.stock_estudio || 0) <= 2 ? 'text-orange-600' : 'text-green-600'}`}>
                          {group.stock_estudio || 0}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-bold text-blue-600">
                          {group.stock_bodega || 0}
                        </span>
                      </td>
                    </tr>
                    
                    {/* Expandir tallas */}
                    {expandedRef === group.referencia && (
                      <tr>
                        <td colSpan={isAdmin ? 10 : 9} className="p-0">
                          <div className="bg-blue-50 border-t-2 border-b-2 border-blue-200">
                            <div className="p-4">
                              <h4 className="font-bold text-sm text-blue-900 mb-3">📏 Desglose por Tallas:</h4>
                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                {group.tallas.map((talla, tallaIndex) => {
                                  const product = products.find(p => p.id === talla.id);
                                  const stockEstudio = product?.stock_estudio || 0;
                                  const stockBodega = product?.stock_bodega || 0;
                                  const alertaEstudio = stockEstudio <= 2 && stockBodega > 0;
                                  
                                  return (
                                    <div key={talla.id} className={`bg-white border-2 p-4 ${alertaEstudio ? 'border-orange-500' : 'border-black'}`}>
                                      <div className="flex justify-between items-start mb-2">
                                        <div>
                                          <span className="font-bold text-xl">Talla {talla.talla}</span>
                                          {!talla.aprobado && (
                                            <span className="ml-2 text-xs bg-yellow-200 border border-yellow-600 px-2 py-1">Pendiente</span>
                                          )}
                                          {alertaEstudio && (
                                            <span className="ml-2 text-xs bg-orange-200 border border-orange-600 px-2 py-1 flex items-center gap-1 inline-flex">
                                              <AlertTriangle className="w-3 h-3" /> Stock bajo
                                            </span>
                                          )}
                                        </div>
                                        <span className={`text-2xl font-bold ${talla.cantidad_stock < 3 ? 'text-red-600' : 'text-green-600'}`}>
                                          {talla.cantidad_stock}
                                        </span>
                                      </div>
                                      
                                      {/* Detalle por ubicación */}
                                      <div className="grid grid-cols-2 gap-2 mb-3 text-sm">
                                        <div className={`p-2 rounded ${stockEstudio <= 2 ? 'bg-orange-100' : 'bg-green-100'}`}>
                                          <div className="flex items-center gap-1">
                                            <Store className="w-4 h-4" />
                                            <span className="font-medium">Estudio:</span>
                                          </div>
                                          <span className={`text-lg font-bold ${stockEstudio <= 2 ? 'text-orange-600' : 'text-green-600'}`}>
                                            {stockEstudio}
                                          </span>
                                        </div>
                                        <div className="p-2 bg-blue-100 rounded">
                                          <div className="flex items-center gap-1">
                                            <Warehouse className="w-4 h-4" />
                                            <span className="font-medium">Bodega:</span>
                                          </div>
                                          <span className="text-lg font-bold text-blue-600">{stockBodega}</span>
                                        </div>
                                      </div>
                                      {/* Botón de transferencia - visible para todos */}
                                      {(stockBodega > 0 || stockEstudio > 0) && (
                                        <Button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            openTransferDialog(product);
                                          }}
                                          size="sm"
                                          className={`w-full mb-2 rounded-none ${alertaEstudio ? 'bg-orange-500 hover:bg-orange-600' : 'bg-blue-600 hover:bg-blue-700'} text-white`}
                                        >
                                          <ArrowRightLeft className="w-3 h-3 mr-1" />
                                          Transferir Stock
                                        </Button>
                                      )}
                                      
                                      {canModify && product && (
                                        <div className="flex gap-2">
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
            {filteredGroupedProducts.length === 0 && (
              <div className="text-center py-12 text-gray-500" data-testid="no-products">
                {searchTerm ? 'No se encontraron productos con ese criterio' : 'No hay productos en el inventario'}
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

        {/* Alertas de Stock Bajo en Estudio */}
        {stockAlerts.length > 0 && (
          <div className="mt-6 p-4 border-4 border-orange-500 bg-orange-50">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="w-6 h-6 text-orange-600" />
              <h3 className="text-lg font-bold text-orange-900">
                ⚠️ Stock Bajo en Estudio ({stockAlerts.length} productos)
              </h3>
            </div>
            <p className="text-sm text-orange-800 mb-3">
              Los siguientes productos tienen ≤ 2 unidades en el Estudio y hay stock disponible en Bodega para transferir:
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
              {stockAlerts.map((alert) => (
                <div key={alert.id} className="bg-white border-2 border-orange-400 p-3 flex justify-between items-center">
                  <div>
                    <p className="font-bold text-sm">{alert.referencia} - {alert.talla}</p>
                    <p className="text-xs text-gray-600">{alert.descripcion}</p>
                    <p className="text-xs">
                      🏪 Estudio: <span className="text-orange-600 font-bold">{alert.stock_estudio}</span> | 
                      📦 Bodega: <span className="text-blue-600 font-bold">{alert.stock_bodega}</span>
                    </p>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => {
                      const product = products.find(p => p.id === alert.id);
                      if (product) openTransferDialog(product);
                    }}
                    className="bg-orange-500 hover:bg-orange-600 text-white rounded-none"
                  >
                    <ArrowRightLeft className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Diálogo de Transferencia */}
      <Dialog open={showTransferDialog} onOpenChange={setShowTransferDialog}>
        <DialogContent className="border-4 border-black rounded-none">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ArrowRightLeft className="w-5 h-5" />
              Transferir Stock
            </DialogTitle>
          </DialogHeader>
          
          {transferProduct && (
            <div className="space-y-4">
              <div className="bg-gray-100 p-3 border-2 border-black">
                <p className="font-bold">{transferProduct.referencia}</p>
                <p className="text-sm">{transferProduct.descripcion} - Talla {transferProduct.talla}</p>
                <div className="flex gap-4 mt-2">
                  <span className="text-sm">🏪 Estudio: <strong className="text-green-600">{transferProduct.stock_estudio || 0}</strong></span>
                  <span className="text-sm">📦 Bodega: <strong className="text-blue-600">{transferProduct.stock_bodega || 0}</strong></span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="font-bold">Origen</Label>
                  <select
                    value={transferData.origen}
                    onChange={(e) => setTransferData({
                      ...transferData,
                      origen: e.target.value,
                      destino: e.target.value === 'bodega' ? 'estudio' : 'bodega'
                    })}
                    className="w-full p-2 border-2 border-black rounded-none"
                  >
                    <option value="bodega">📦 Bodega</option>
                    <option value="estudio">🏪 Estudio</option>
                  </select>
                </div>
                <div>
                  <Label className="font-bold">Destino</Label>
                  <select
                    value={transferData.destino}
                    onChange={(e) => setTransferData({
                      ...transferData,
                      destino: e.target.value,
                      origen: e.target.value === 'bodega' ? 'estudio' : 'bodega'
                    })}
                    className="w-full p-2 border-2 border-black rounded-none"
                  >
                    <option value="estudio">🏪 Estudio</option>
                    <option value="bodega">📦 Bodega</option>
                  </select>
                </div>
              </div>

              <div>
                <Label className="font-bold">Cantidad a Transferir</Label>
                <Input
                  type="number"
                  min="1"
                  max={transferData.origen === 'bodega' 
                    ? (transferProduct.stock_bodega || 0) 
                    : (transferProduct.stock_estudio || 0)}
                  value={transferData.cantidad}
                  onChange={(e) => setTransferData({...transferData, cantidad: parseInt(e.target.value) || 1})}
                  className="border-2 border-black rounded-none"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Disponible en {transferData.origen === 'bodega' ? 'Bodega' : 'Estudio'}: {' '}
                  {transferData.origen === 'bodega' 
                    ? (transferProduct.stock_bodega || 0) 
                    : (transferProduct.stock_estudio || 0)} unidades
                </p>
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={handleTransfer}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white rounded-none h-12"
                >
                  <ArrowRightLeft className="w-4 h-4 mr-2" />
                  Confirmar Transferencia
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowTransferDialog(false)}
                  className="border-2 border-black rounded-none h-12"
                >
                  Cancelar
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
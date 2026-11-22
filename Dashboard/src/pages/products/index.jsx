import { productStatus, productLabels } from '@/utils/business';
import { useBusinessClock } from '@/hooks/useBusinessClock';
import { Link } from 'react-router-dom';
import { ErrorState } from '@/components/ui/Feedback';
import { PermissionButton } from '@/components/RoleGuard';
import Pagination from '@/components/tables/Pagination';
import { usePagination } from '@/hooks/usePagination';
import { useState, useEffect, useMemo } from 'react';
import {
  Search,
  Plus,
  Download,
  Package,
  ShoppingCart,
  AlertTriangle,
  Edit,
  Trash2,
  Loader2,
  UtensilsCrossed,
  Gift,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { toast } from 'sonner';
import { productService } from '@/services/productService';
import ProductFormModal from '@/components/ProductFormModal';
import { ConfirmModal } from '@/components/ui/confirm-modal';
export default function ProductsPage() {
  const now = useBusinessClock();
  const [products, setProducts] = useState([]);
  const [activeTab, setActiveTab] = useState('Food');
  const [stockFilter, setStockFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [productToEdit, setProductToEdit] = useState(null);
  // State cho Confirm Delete
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState(null);
  const isMerch = (p) => 'merchName' in p;
  const getName = (p) => (isMerch(p) ? p.merchName : p.pName);
  const getType = (p) => (isMerch(p) ? 'Merchandise' : 'Food');
  const getQty = (p) => (isMerch(p) ? p.availNum : p.quantity);
  const getStatus = (p) => productStatus(p, now);
  // Fetch dữ liệu thực tế
  const fetchProducts = async () => {
    try {
      setIsLoading(true);
      setLoadError('');
      const data = await productService.getAll();
      setProducts(data);
    } catch (error) {
      setLoadError(error.message || 'Không thể tải dữ liệu.');
      toast.error('Không thể tải danh sách sản phẩm.');
    } finally {
      setIsLoading(false);
    }
  };
  useEffect(() => {
    fetchProducts();
  }, []);
  const handleSaveProduct = async (data) => {
    try {
      if (productToEdit) {
        await productService.update(productToEdit.productId, data, productToEdit.itemType);
        toast.success('Cập nhật sản phẩm thành công!');
      } else {
        await productService.create(data);
        toast.success('Thêm sản phẩm mới thành công!');
      }
      fetchProducts();
      setIsModalOpen(false);
    } catch (error) {
      toast.error('Lỗi khi lưu sản phẩm.');
      throw error;
    }
  };
  const handleDelete = async (p) => {
    setProductToDelete(p);
    setIsConfirmOpen(true);
  };
  const confirmDelete = async () => {
    if (!productToDelete) return;
    try {
      await productService.delete(productToDelete.productId, productToDelete.itemType);
      toast.success('Đã xóa sản phẩm thành công.');
      fetchProducts();
    } catch (error) {
      toast.error('Lỗi khi xóa sản phẩm.');
      throw error; // Để ConfirmModal handle loading state
    }
  };
  // Tính toán số liệu thống kê
  const stats = useMemo(() => {
    const totalItems = products.length;
    const merchandiseCount = products.filter((p) => isMerch(p)).length;
    const lowStockAlerts = products.filter((p) => Number(getQty(p)) <= 10).length;
    return {
      totalItems: totalItems,
      merchandiseCount: merchandiseCount,
      lowStockAlerts,
    };
  }, [products]);
  const filteredProducts = useMemo(() => {
    return products.filter(
      (p) =>
        getType(p) === activeTab &&
        (!stockFilter || getStatus(p) === stockFilter) &&
        (getName(p).toLowerCase().includes(searchQuery.toLowerCase()) ||
          p.productId.toString().toLowerCase().includes(searchQuery.toLowerCase())),
    );
  }, [products, activeTab, searchQuery, stockFilter, now]);
  const pagination = usePagination(filteredProducts, 10, searchQuery + activeTab + stockFilter);
  const getStatusStyle = (status) => {
    switch (status) {
      case 'ACTIVE':
        return 'text-emerald-600 bg-emerald-50';
      case 'PREACTIVE':
        return 'text-amber-600 bg-amber-50';
      case 'OUT_OF_STOCK':
        return 'text-rose-600 bg-rose-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };
  if (isLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-indigo-500" />
      </div>
    );
  }
  if (loadError) return <ErrorState error={loadError} retry={fetchProducts} />;
  return (
    <div className="w-full max-w-[1600px] mx-auto min-h-screen pb-20 px-4">
      {/* Header Section */}
      <div className="flex items-end justify-between mb-10">
        <div>
          <span className="text-[11px] font-bold text-indigo-500 uppercase tracking-[2px] mb-1 block">
            Inventory
          </span>
          <h1 className="text-2xl font-semibold">Sản phẩm</h1>
          <p className="text-gray-500 font-medium">
            Quản lý kho hàng từ bắp nước đến các vật phẩm sưu tầm.
          </p>
        </div>
        <PermissionButton
          permission="products:create"
          onClick={() => {
            setProductToEdit(null);
            setIsModalOpen(true);
          }}
          className="bg-[#4a4bd7] hover:bg-indigo-700 text-white px-8 py-3 rounded-xl font-bold shadow-lg shadow-indigo-100 transition-all flex items-center gap-2 uppercase text-xs"
        >
          <Plus className="w-5 h-5" /> Thêm sản phẩm
        </PermissionButton>
      </div>

      <Link to="/products/categories" className="btn-secondary mb-4">
        Quản lý danh mục sản phẩm
      </Link>
      {/* Overview Cards */}
      <div className="grid grid-cols-2 gap-6 mb-10">
        <div className="bg-white p-6 rounded-[32px] shadow-sm border border-gray-100 transition-transform hover:scale-[1.02]">
          <div className="flex justify-between items-start mb-4">
            <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 shadow-inner">
              <Package className="w-6 h-6" />
            </div>
            <span className="text-[10px] font-black text-indigo-600 bg-indigo-50 px-2 py-1 rounded-lg uppercase">
              Inventory
            </span>
          </div>
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
            Tổng mặt hàng
          </p>
          <p className="text-4xl font-black text-gray-800 mt-1">{stats.totalItems}</p>
        </div>

        <div
          className={`bg-white p-6 rounded-[32px] shadow-sm border transition-transform hover:scale-[1.02] ${stats.lowStockAlerts > 0 ? 'border-rose-100 bg-rose-50/10' : 'border-gray-100'}`}
        >
          <div className="flex justify-between items-start mb-4">
            <div
              className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-inner ${stats.lowStockAlerts > 0 ? 'bg-rose-50 text-rose-600' : 'bg-gray-50 text-gray-400'}`}
            >
              <AlertTriangle className="w-6 h-6" />
            </div>
            {stats.lowStockAlerts > 0 && (
              <span className="text-[10px] font-black text-rose-600 bg-rose-50 px-2 py-1 rounded-lg uppercase animate-pulse">
                Cảnh báo
              </span>
            )}
          </div>
          <p
            className={`text-[10px] font-black uppercase tracking-widest ${stats.lowStockAlerts > 0 ? 'text-rose-500' : 'text-gray-400'}`}
          >
            Sắp hết hàng
          </p>
          <p className="text-4xl font-black text-gray-800 mt-1">{stats.lowStockAlerts}</p>
        </div>
      </div>

      {/* Management Section */}
      <div className="bg-white rounded-[32px] shadow-sm border border-gray-100 overflow-hidden">
        {/* Tabs */}
        <div className="flex border-b border-gray-100 px-6 pt-4 bg-gray-50/30">
          <button
            onClick={() => setActiveTab('Food')}
            className={`px-8 py-5 text-xs font-black uppercase tracking-widest transition-all border-b-2 flex items-center gap-2 ${activeTab === 'Food' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-400'}`}
          >
            <UtensilsCrossed className="w-4 h-4" /> Food & Drink (
            {products.length - stats.merchandiseCount})
          </button>
          <button
            onClick={() => setActiveTab('Merchandise')}
            className={`px-8 py-5 text-xs font-black uppercase tracking-widest transition-all border-b-2 flex items-center gap-2 ${activeTab === 'Merchandise' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-400'}`}
          >
            <Gift className="w-4 h-4" /> Merchandise ({stats.merchandiseCount})
          </button>
        </div>

        {/* Controls */}
        <div className="p-8 flex items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Tìm theo tên hoặc mã sản phẩm..."
              className="w-full pl-12 pr-4 py-3.5 bg-gray-50 border-none rounded-2xl text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none transition-all shadow-inner"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <select
            className="form-control w-auto"
            aria-label="Trạng thái sản phẩm"
            value={stockFilter}
            onChange={(e) => setStockFilter(e.target.value)}
          >
            <option value="">Tất cả trạng thái</option>
            {Object.entries(productLabels).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="text-[10px] font-black text-gray-400 uppercase tracking-widest bg-gray-50/50 border-b border-gray-100">
                <th className="px-8 py-5">Product ID</th>
                <th className="px-8 py-5">Chi tiết sản phẩm</th>
                <th className="px-8 py-5">Danh mục</th>
                <th className="px-8 py-5">Đơn giá</th>
                <th className="px-8 py-5">Số lượng tồn</th>
                <th className="px-8 py-5">Trạng thái</th>
                <th className="px-8 py-5 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredProducts.length > 0 ? (
                pagination.items.map((p, i) => (
                  <tr
                    key={p.productId || i}
                    className="hover:bg-indigo-50/20 transition-colors group cursor-pointer"
                  >
                    <td className="px-8 py-5">
                      <span className="font-mono font-black text-indigo-600 text-xs bg-indigo-50 px-3 py-1 rounded-lg">
                        #{p.productId}
                      </span>
                    </td>
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-gray-50 rounded-2xl overflow-hidden flex items-center justify-center border border-gray-100 shadow-inner">
                          {p.imgUrl ? (
                            <img
                              src={p.imgUrl}
                              alt={getName(p)}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <Package className="w-6 h-6 text-gray-300" />
                          )}
                        </div>
                        <div>
                          <p className="text-sm font-black text-gray-800 leading-tight uppercase tracking-tighter">
                            {getName(p)}
                          </p>
                          <p className="text-[11px] text-gray-400 font-bold mt-1 line-clamp-1 italic">
                            {p.description || 'Chưa có mô tả'}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-5">
                      <span className="text-[10px] font-black text-gray-500 bg-gray-100 px-3 py-1 rounded-lg uppercase">
                        {getType(p)}
                      </span>
                    </td>
                    <td className="px-8 py-5 text-sm font-black text-gray-800">
                      {Number(p.price).toLocaleString('vi-VN')} ₫
                    </td>
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-3">
                        <span>{getQty(p)}</span>
                      </div>
                    </td>
                    <td className="px-8 py-5">
                      <div
                        className={`flex items-center gap-1.5 font-black text-[10px] uppercase px-3 py-1 rounded-full w-fit ${getStatusStyle(getStatus(p))}`}
                      >
                        <div
                          className={`w-1.5 h-1.5 rounded-full ${getStatus(p) === 'ACTIVE' ? 'bg-emerald-500' : getStatus(p) === 'PREACTIVE' ? 'bg-amber-500' : 'bg-rose-500'}`}
                        />
                        {productLabels[getStatus(p)]}
                      </div>
                    </td>
                    <td className="px-8 py-5 text-right">
                      <div className="flex justify-end gap-2  transition-opacity">
                        <PermissionButton
                          permission="products:update"
                          aria-label={'Sửa ' + getName(p)}
                          onClick={(e) => {
                            e.stopPropagation();
                            setProductToEdit(p);
                            setIsModalOpen(true);
                          }}
                          className="p-2.5 text-gray-400 hover:text-indigo-600 hover:bg-white rounded-xl transition-all shadow-sm border border-transparent hover:border-indigo-100"
                        >
                          <Edit className="w-4 h-4" />
                        </PermissionButton>
                        <PermissionButton
                          permission="products:delete"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(p);
                          }}
                          className="p-2.5 text-gray-400 hover:text-rose-600 hover:bg-white rounded-xl transition-all shadow-sm border border-transparent hover:border-rose-100"
                        >
                          <Trash2 className="w-4 h-4" />
                        </PermissionButton>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={7}
                    className="px-8 py-20 text-center text-gray-400 font-black uppercase tracking-widest text-xs"
                  >
                    Không tìm thấy sản phẩm nào trong danh mục này
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="p-8 bg-gray-50/50 flex items-center justify-between border-t border-gray-100">
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
            Hiển thị {filteredProducts.length} trên tổng số {products.length} sản phẩm
          </p>
          <div className="flex gap-2"></div>
        </div>
      </div>

      <ProductFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveProduct}
        initialData={productToEdit}
      />
      <ConfirmModal
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        onConfirm={confirmDelete}
        title="Xác nhận xóa"
        description={`Bạn có chắc chắn muốn xóa sản phẩm "${productToDelete ? getName(productToDelete) : ''}"? Hành động này không thể hoàn tác.`}
      />
      <Pagination {...pagination} />
    </div>
  );
}

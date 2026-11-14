import { onlineOrderLabels } from '@/utils/apiContract';
import OrderStats from '@/components/orders/OrderStats';
import { inHomeBranch as inBranchScope } from '@/utils/schedule';
import { canCancelOrder, canConfirmOrder, normalizeOrderStatus } from '@/utils/business';
import { ErrorState } from '@/components/ui/Feedback';
import { can } from '@/utils/permissions';
import StatusBadge from '@/components/ui/StatusBadge';
import { PermissionButton } from '@/components/RoleGuard';
import Pagination from '@/components/tables/Pagination';
import { usePagination } from '@/hooks/usePagination';
import { useState, useEffect, useMemo } from 'react';
import {
  Search,
  Plus,
  FileText,
  Clock,
  Download,
  Ticket,
  RefreshCcw,
  DollarSign,
  Loader2,
  Trash2,
  Edit3,
} from 'lucide-react';
import { toast } from 'sonner';
import { orderService } from '@/services/orderService';
import { branchService } from '@/services/branchService';
import { useAuthStore } from '@/stores/authStore';
import OrderFormModal from '@/components/OrderFormModal';
import { ConfirmModal } from '@/components/ui/confirm-modal';
export default function OrdersPage() {
  const [orders, setOrders] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [orderToConfirm, setOrderToConfirm] = useState(null);
  const [orderToCancel, setOrderToCancel] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  // State cho Modal Add/Edit
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  // State cho Confirm Delete
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [orderToDelete, setOrderToDelete] = useState(null);
  const { user } = useAuthStore();
  const isManager = user?.role === 'MANAGER';
  const isStaff = user?.role === 'STAFF';
  const isAdmin = user?.role === 'ADMIN';
  const managerBranchId = user?.branchId;
  const [branches, setBranches] = useState([]);
  const [selectedBranchId, setSelectedBranchId] = useState('all');
  const activeBranchId = !isAdmin
    ? managerBranchId
    : selectedBranchId !== 'all'
      ? Number(selectedBranchId)
      : undefined;
  useEffect(() => {
    const fetchBranches = async () => {
      try {
        const bData = await branchService.getAll();
        setBranches(
          Array.isArray(bData) ? bData.filter((b) => inBranchScope(user, b.branchId)) : [],
        );
      } catch (err) {}
    };
    if (isAdmin) {
      fetchBranches();
    }
  }, [isAdmin, isManager, isStaff]);
  // Fetch dữ liệu từ Service
  const fetchOrders = async () => {
    try {
      setIsLoading(true);
      setLoadError('');
      if (!isAdmin && !managerBranchId) throw new Error('Tài khoản chưa được cấp chi nhánh.');
      const data = await orderService.getAll(activeBranchId);
      if (!Array.isArray(data) || data.some((o) => !inBranchScope(user, o.branchId)))
        throw new Error('API trả đơn hàng ngoài phạm vi được cấp quyền.');
      setOrders(data.map((o) => ({ ...o, orderStatus: normalizeOrderStatus(o.orderStatus) })));
    } catch (error) {
      setLoadError(error.message || 'Không thể tải dữ liệu.');
      toast.error('Không thể nạp danh sách hóa đơn từ máy chủ.');
    } finally {
      setIsLoading(false);
    }
  };
  useEffect(() => {
    fetchOrders();
  }, [activeBranchId]);
  // Chức năng Xóa
  const handleDelete = (id) => {
    setOrderToDelete(id);
    setIsConfirmOpen(true);
  };
  const confirmDelete = async () => {
    if (orderToDelete === null) return;
    try {
      await orderService.delete(orderToDelete);
      toast.success('Đã xóa hóa đơn thành công.');
      setOrders((prev) => prev.filter((o) => o.orderId !== orderToDelete));
    } catch (error) {
      toast.error('Lỗi khi xóa hóa đơn.');
      throw error;
    }
  };
  const confirmPayment = async () => {
    if (!orderToConfirm || !canConfirmOrder(user, orderToConfirm))
      throw new Error('Đơn hàng không đủ điều kiện xác nhận.');
    const updated = await orderService.confirmPayment(orderToConfirm.orderId);
    if (
      String(updated?.orderId) !== String(orderToConfirm.orderId) ||
      normalizeOrderStatus(updated.orderStatus) !== 'PAID'
    )
      throw new Error('API chưa xác nhận thanh toán. Vui lòng tải lại đơn hàng.');
    setOrders((prev) =>
      prev.map((o) =>
        o.orderId === updated.orderId
          ? { ...updated, orderStatus: normalizeOrderStatus(updated.orderStatus) }
          : o,
      ),
    );
    toast.success('Đã xác nhận thanh toán.');
  };
  const cancelOrder = async () => {
    if (!orderToCancel || !canCancelOrder(user, orderToCancel))
      throw new Error('Đơn không đủ điều kiện hủy.');
    const updated = await orderService.cancel(orderToCancel.orderId);
    if (
      String(updated?.orderId) !== String(orderToCancel.orderId) ||
      normalizeOrderStatus(updated.orderStatus) !== 'CANCELLED' ||
      !inBranchScope(user, updated.branchId)
    )
      throw new Error('API chưa xác nhận hủy đơn. Vui lòng tải lại để đối chiếu.');
    setOrders((prev) =>
      prev.map((o) =>
        o.orderId === orderToCancel.orderId ? { ...updated, orderStatus: 'CANCELLED' } : o,
      ),
    );
    toast.success('Đã hủy đơn hàng.');
  };
  const filteredOrders = useMemo(() => {
    return orders.filter(
      (order) =>
        (!statusFilter || order.orderStatus === statusFilter) &&
        [String(order.orderId), order.customer?.cName, order.customer?.email].some((v) =>
          v?.toLowerCase().includes(searchQuery.toLowerCase()),
        ),
    );
  }, [orders, searchQuery, statusFilter]);
  const pagination = usePagination(filteredOrders, 10, searchQuery + statusFilter);
  if (isLoading) {
    return (
      <div className="flex h-[80vh] flex-col items-center justify-center gap-4">
        <Loader2 className="w-12 h-12 animate-spin text-indigo-500" />
        <p className="text-[10px] font-black text-gray-400 uppercase tracking-[4px]">
          Syncing Transactions...
        </p>
      </div>
    );
  }
  if (loadError) return <ErrorState error={loadError} retry={fetchOrders} />;
  return (
    <div className="w-full max-w-[1600px] mx-auto min-h-screen pb-20 px-4">
      {/* Header Section */}
      <div className="flex items-end justify-between mb-6">
        <div>
          <span className="text-[11px] font-bold text-indigo-500 uppercase tracking-[2px] mb-1 block">
            Sales
          </span>
          <h1 className="text-2xl font-semibold">Đơn hàng và vé</h1>
          <div className="flex items-center gap-3 mt-1">
            <p className="text-gray-500 text-sm font-medium">
              Giám sát giao dịch thời gian thực và quản lý vé đặt.
            </p>
            {isAdmin && (
              <select
                aria-label="Chi nhánh đơn hàng"
                value={selectedBranchId}
                onChange={(e) => setSelectedBranchId(e.target.value)}
                className="bg-white border border-gray-200 text-gray-700 rounded-xl px-3 py-1 text-sm font-bold shadow-sm outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer ml-2"
              >
                <option value="all">Toàn bộ chi nhánh</option>
                {branches.map((b) => (
                  <option key={b.branchId} value={b.branchId}>
                    {b.bName}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>
        <div className="flex gap-3">
          <PermissionButton
            permission="orders:create"
            onClick={() => {
              setSelectedOrder(null);
              setIsModalOpen(true);
            }}
            className="bg-[#4a4bd7] hover:bg-indigo-700 text-white px-8 py-3 rounded-2xl font-black flex items-center gap-2 shadow-lg shadow-indigo-100 transition-all uppercase text-xs tracking-widest active:scale-95"
          >
            <Plus className="w-5 h-5" /> Tạo hóa đơn
          </PermissionButton>
        </div>
      </div>

      <OrderStats orders={orders} role={user.role} />

      {/* Table Section */}
      <div className="bg-white rounded-[32px] shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-8 border-b border-gray-50 flex items-center justify-between bg-gray-50/30">
          <h2 className="text-xl font-black text-gray-800 tracking-tight uppercase">
            Giao dịch gần đây
          </h2>
          <select
            aria-label="Lọc trạng thái đơn"
            className="form-control w-auto"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">Tất cả trạng thái</option>
            <option value="PENDING">Chờ xử lý</option>
            <option value="PAID">Đã thanh toán</option>
            <option value="CANCELLED">Đã hủy</option>
            {Object.entries(onlineOrderLabels)
              .filter(([status]) => orders.some((order) => order.orderStatus === status))
              .map(([status, label]) => (
                <option key={status} value={status}>
                  {label}
                </option>
              ))}
          </select>
          <div className="relative w-80">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Tìm theo ID hoặc tên khách..."
              className="w-full pl-12 pr-4 py-3 bg-white border border-gray-200 rounded-2xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-bold"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="text-[10px] font-black text-gray-400 uppercase tracking-widest bg-gray-50/50">
                <th className="px-8 py-5 text-center">ID</th>
                <th className="px-8 py-5">Khách hàng</th>
                <th className="px-8 py-5">Tổng tiền</th>
                <th className="px-8 py-5">Trạng thái</th>
                <th className="px-8 py-5">Thanh toán</th>
                <th className="px-8 py-5">Thời gian</th>
                <th className="px-8 py-5 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 font-bold">
              {pagination.items.map((order, i) => (
                <tr
                  key={order.orderId || i}
                  className="hover:bg-indigo-50/20 transition-colors group cursor-pointer"
                >
                  <td className="px-8 py-5 text-center">
                    <span className="font-mono font-black text-indigo-600 text-xs bg-indigo-50 px-3 py-1 rounded-lg">
                      #{order.orderId}
                    </span>
                  </td>
                  <td className="px-8 py-5">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center text-[10px] font-black text-white shadow-lg shadow-indigo-100 uppercase">
                        {order.customer?.cName?.[0] || 'G'}
                      </div>
                      <div>
                        <p className="text-sm font-black text-gray-800 leading-tight">
                          {order.customer?.cName || 'Guest Customer'}
                        </p>
                        <p className="text-[11px] text-gray-400 font-medium">
                          {order.customer?.email || 'No email provided'}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-5 text-sm font-black text-gray-800">
                    {order.total.toLocaleString('vi-VN', { style: 'currency', currency: 'VND' })}
                  </td>
                  <td className="px-8 py-5">
                    {order.orderStatus === 'PAID' ? (
                      <span className="text-emerald-700">Đã xử lý</span>
                    ) : (
                      <StatusBadge value={order.orderStatus} />
                    )}
                    {canConfirmOrder(user, order) && (
                      <button className="btn-primary mt-2" onClick={() => setOrderToConfirm(order)}>
                        Xác nhận
                      </button>
                    )}
                  </td>
                  <td className="px-8 py-5">
                    <div className="flex items-center gap-2 text-[10px] font-black uppercase text-gray-500 bg-gray-100 w-fit px-3 py-1.5 rounded-lg border border-gray-200/50">
                      <FileText className="w-3.5 h-3.5 text-gray-400" />
                      {order.paymentMethod}
                    </div>
                  </td>
                  <td className="px-8 py-5 text-[11px] font-bold text-gray-500 uppercase tracking-tight">
                    {order.orderTime}
                  </td>
                  <td className="px-8 py-5 text-right">
                    <div className="flex justify-end gap-2">
                      <PermissionButton
                        permission="orders:read"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedOrder(order);
                          setIsModalOpen(true);
                        }}
                        className="p-2.5 bg-white shadow-sm rounded-xl text-indigo-600 hover:bg-indigo-50 border border-indigo-100"
                        title="Xem chi tiết"
                      >
                        <Edit3 className="w-4 h-4" />
                      </PermissionButton>
                      {canCancelOrder(user, order) && (
                        <button className="btn-danger" onClick={() => setOrderToCancel(order)}>
                          Hủy đơn
                        </button>
                      )}
                      <PermissionButton
                        permission="orders:delete"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(order.orderId);
                        }}
                        className="p-2.5 bg-white shadow-sm rounded-xl text-rose-500 hover:bg-rose-50 border border-rose-100"
                        title="Xóa"
                      >
                        <Trash2 className="w-4 h-4" />
                      </PermissionButton>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* OrderFormModal */}
      <OrderFormModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedOrder(null);
        }}
        onSuccess={fetchOrders}
        initialData={selectedOrder}
      />
      <ConfirmModal
        key={orderToConfirm?.orderId || 'none'}
        isOpen={!!orderToConfirm}
        onClose={() => setOrderToConfirm(null)}
        onConfirm={confirmPayment}
        title="Xác nhận thanh toán"
        description={
          orderToConfirm
            ? 'Xác nhận đã nhận thanh toán ' +
              Number(orderToConfirm.total).toLocaleString('vi-VN') +
              ' ₫ cho đơn hàng #' +
              orderToConfirm.orderId +
              ' và chuyển trạng thái sang Đã xử lý?'
            : ''
        }
      />
      <ConfirmModal
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        onConfirm={confirmDelete}
        title="Xác nhận xóa hóa đơn"
        description={`Bạn có chắc chắn muốn xóa hóa đơn #${orderToDelete}? Hành động này sẽ gỡ bỏ vĩnh viễn giao dịch khỏi hệ thống.`}
      />
      <ConfirmModal
        key={orderToCancel?.orderId || 'cancel'}
        isOpen={!!orderToCancel}
        onClose={() => setOrderToCancel(null)}
        onConfirm={cancelOrder}
        title="Hủy đơn hàng?"
        description={
          'Hủy đơn chờ thanh toán #' +
          orderToCancel?.orderId +
          '. Đơn vẫn được giữ trong lịch sử; ghế được giải phóng sau khi máy chủ xác nhận.'
        }
        confirmText="Hủy đơn"
        cancelText="Quay lại"
      />
      <Pagination {...pagination} />
    </div>
  );
}

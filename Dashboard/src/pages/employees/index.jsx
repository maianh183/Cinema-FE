import { canManageEmployee } from '@/utils/business';
import api from '@/services/api';
import { can } from '@/utils/permissions';
import { ErrorState } from '@/components/ui/Feedback';
import { PermissionButton } from '@/components/RoleGuard';
import Pagination from '@/components/tables/Pagination';
import { usePagination } from '@/hooks/usePagination';
import { Link } from 'react-router-dom';
import { useState, useMemo, useEffect } from 'react';
import {
  Plus,
  Search,
  CalendarClock,
  MoreVertical,
  X,
  Edit,
  Trash2,
  Mail,
  Loader2,
  Shield,
} from 'lucide-react';
import { toast } from 'sonner';
import { employeeService } from '@/services/employeeService';
import FileUpload from '@/components/FileUpload';
import { ConfirmModal } from '@/components/ui/confirm-modal';
import { useAuthStore } from '@/stores/authStore';
import { branchService } from '@/services/branchService';
export default function EmployeesPage() {
  const [employees, setEmployees] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRole, setSelectedRole] = useState('All Roles');
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [branches, setBranches] = useState([]);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [openMenuId, setOpenMenuId] = useState(null);
  const [viewOnly, setViewOnly] = useState(false);
  const [statusEmployee, setStatusEmployee] = useState(null);
  const [saveError, setSaveError] = useState('');
  const [branchFilter, setBranchFilter] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const [permissionCatalog, setPermissionCatalog] = useState([]);
  const [permissions, setPermissions] = useState(null);
  // State cho Confirm Delete
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [employeeToDelete, setEmployeeToDelete] = useState(null);
  const { user } = useAuthStore();
  useEffect(() => {
    if (can(user, 'employees', 'assign-role'))
      api
        .get('/permissions')
        .then((r) => setPermissionCatalog(r.data))
        .catch((e) => toast.error(e.message));
  }, [user]);
  useEffect(() => {
    setPermissions(selectedEmployee?.permissions || null);
  }, [selectedEmployee]);
  const rawRole = user?.role || '';
  const isManager = rawRole.toUpperCase() === 'MANAGER' || rawRole.toUpperCase() === 'ROLE_MANAGER';
  const managerBranchId = user?.branchId;
  useEffect(() => {}, [user, rawRole, isManager, managerBranchId]);
  useEffect(() => {
    if (selectedEmployee) {
      setAvatarUrl(selectedEmployee.avatarUrl || '');
    } else {
      setAvatarUrl('');
    }
  }, [selectedEmployee]);
  // Fetch dữ liệu thực từ Backend
  const fetchEmployees = async () => {
    try {
      setIsLoading(true);
      setLoadError('');
      let data;
      if (user.role !== 'ADMIN' && !managerBranchId)
        throw new Error('Tài khoản chưa được cấp phạm vi chi nhánh.');
      if (user.role !== 'ADMIN') {
        data = await employeeService.getByBranch(managerBranchId);
      } else {
        // PHP must independently enforce access on every result.
        data = await employeeService.getAll();
      }
      setEmployees(Array.isArray(data) ? data : []);
    } catch (error) {
      setLoadError(error.message || 'Không thể tải dữ liệu.');
      toast.error('Không thể nạp danh sách nhân viên.');
      setEmployees([]);
    } finally {
      setIsLoading(false);
    }
  };
  useEffect(() => {
    fetchEmployees();
    // Fetch branches for Admin
    if (!isManager) {
      branchService
        .getAll()
        .then((data) => setBranches(Array.isArray(data) ? data : []))
        .catch((error) => toast.error(error.message));
    }
  }, []);
  const filteredEmployees = useMemo(() => {
    return employees.filter((emp) => {
      const matchSearch =
        emp.eName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        emp.eUserId.toString().toLowerCase().includes(searchQuery.toLowerCase());
      const matchRole =
        selectedRole === 'All Roles' || emp.userType?.toUpperCase() === selectedRole;
      return matchSearch && matchRole && (!branchFilter || String(emp.branchId) === branchFilter);
    });
  }, [employees, searchQuery, selectedRole, branchFilter]);
  const pagination = usePagination(
    filteredEmployees,
    10,
    searchQuery + selectedRole + branchFilter,
  );
  // Màu sắc badge dựa trên Role
  const getThemeStyles = (role) => {
    const r = role.toLowerCase();
    if (r.includes('manager')) return 'bg-purple-100 text-purple-700';
    if (r.includes('projectionist')) return 'bg-emerald-100 text-emerald-700';
    if (r.includes('supervisor')) return 'bg-amber-100 text-amber-700';
    return 'bg-indigo-100 text-indigo-700';
  };
  const handleSaveForm = async (e) => {
    e.preventDefault();
    if (
      isSaving ||
      uploading ||
      viewOnly ||
      !canManageEmployee(user, selectedEmployee, selectedEmployee ? 'update' : 'create')
    )
      return;
    setSaveError('');
    setIsSaving(true);
    const formData = new FormData(e.currentTarget);
    // Thu thập dữ liệu từ Form
    const formBranchId = formData.get('branchId') ? Number(formData.get('branchId')) : 0;
    // Ưu tiên branchId từ Store nếu là MANAGER, ngược lại lấy từ Form
    let finalBranchId = formBranchId;
    if (isManager && managerBranchId !== undefined && managerBranchId !== null) {
      finalBranchId = managerBranchId;
    }
    const employeeData = {
      eUserId: selectedEmployee ? selectedEmployee.eUserId : `E${Date.now()}`,
      eName: formData.get('name'),
      email: formData.get('email'),
      phoneNumber: formData.get('phoneNumber'),
      sex: formData.get('sex'),
      userType: formData.get('role') || selectedEmployee?.userType || 'STAFF',
      ...(can(user, 'employees', 'assign-role') && permissions ? { permissions } : {}),
      branchId: finalBranchId,
      salary: Number(formData.get('salary')),
      avatarUrl: avatarUrl,
    };
    // Nếu là nhân viên mới, có thể thêm mật khẩu mặc định hoặc từ input
    if (!selectedEmployee) {
      employeeData.ePassword = formData.get('password');
    }
    if (
      !employeeData.eName?.trim() ||
      !employeeData.email?.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/) ||
      employeeData.salary < 0 ||
      !employeeData.branchId ||
      (!selectedEmployee && (!employeeData.ePassword || employeeData.ePassword.length < 10))
    ) {
      setSaveError(
        'Nhập họ tên, email, chi nhánh, lương và mật khẩu ít nhất 10 ký tự cho nhân viên mới.',
      );
      setIsSaving(false);
      return;
    }
    try {
      const saved = await employeeService.save(employeeData, selectedEmployee?.eUserId);
      if (!saved?.eUserId) throw new Error('API chưa trả về hồ sơ nhân viên đã lưu.');
      setEmployees((prev) =>
        selectedEmployee
          ? prev.map((row) => (String(row.eUserId) === String(saved.eUserId) ? saved : row))
          : [saved, ...prev],
      );
      toast.success(selectedEmployee ? 'Cập nhật hồ sơ thành công!' : 'Đã đăng ký nhân viên mới!');
      setIsDrawerOpen(false);
    } catch (error) {
      setSaveError(error.message || 'Lỗi khi lưu thông tin vào hệ thống');
    } finally {
      setIsSaving(false);
    }
  };
  const handleDelete = (id) => {
    setEmployeeToDelete(id);
    setIsConfirmOpen(true);
  };
  const confirmDelete = async () => {
    if (
      !employeeToDelete ||
      !canManageEmployee(
        user,
        employees.find((e) => e.eUserId === employeeToDelete),
        'delete',
      )
    )
      return;
    try {
      await employeeService.delete(employeeToDelete);
      setEmployees((prev) => prev.filter((e) => e.eUserId !== employeeToDelete));
      toast.success('Đã xóa nhân viên');
      setOpenMenuId(null);
    } catch (error) {
      toast.error('Lỗi khi thực hiện lệnh xóa');
      throw error;
    }
  };
  const handleToggleStatus = async () => {
    const emp = statusEmployee;
    if (!emp || !canManageEmployee(user, emp))
      throw new Error('Không có quyền quản lý tài khoản này.');
    await (emp.isActive
      ? employeeService.deactivate(emp.eUserId)
      : employeeService.activate(emp.eUserId));
    // Acknowledge only after reading the server's current state.
    const updated = await employeeService.getById(emp.eUserId);
    setEmployees((prev) => prev.map((e) => (e.eUserId === updated.eUserId ? updated : e)));
    toast.success('Đã cập nhật trạng thái tài khoản.');
  };
  if (loadError) return <ErrorState error={loadError} retry={fetchEmployees} />;
  return (
    <div className="w-full max-w-[1600px] mx-auto min-h-screen pb-10">
      {/* Menu Overlay */}
      {openMenuId && <div className="fixed inset-0 z-10" onClick={() => setOpenMenuId(null)} />}

      <div className="flex items-end justify-between mb-10 px-4">
        <div>
          <span className="text-[11px] font-bold text-indigo-500 uppercase tracking-[2px] mb-1 block">
            Personnel
          </span>
          <h1 className="text-2xl font-semibold">Nhân viên</h1>
        </div>
        <div className="flex gap-3">
          <Link
            to="/employees/workshift"
            className="bg-white flex items-center gap-2 px-6 py-3 rounded-xl shadow-sm border border-gray-100 font-black hover:bg-gray-50 transition-all text-sm"
          >
            <CalendarClock className="w-5 h-5 text-indigo-500" /> QUẢN LÝ CA LÀM
          </Link>
          <PermissionButton
            permission="employees:create"
            onClick={() => {
              setSelectedEmployee(null);
              setPermissions(null);
              setViewOnly(false);
              setSaveError('');
              setIsDrawerOpen(true);
            }}
            className="bg-[#4a4bd7] hover:bg-indigo-700 flex items-center gap-2 px-6 py-3 rounded-xl font-black text-white transition-all shadow-lg shadow-indigo-100 text-sm"
          >
            <Plus className="w-5 h-5" /> THÊM NHÂN VIÊN
          </PermissionButton>
        </div>
      </div>

      {/* Stats Bento */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10 px-4">
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex flex-col justify-between h-[120px] border-l-4 border-indigo-500 transition-transform hover:scale-[1.02]">
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
            Tổng nhân sự
          </p>
          <span className="text-4xl font-black text-[#2d3337]">{employees.length}</span>
        </div>
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex flex-col justify-between h-[120px] border-l-4 border-purple-500 transition-transform hover:scale-[1.02]">
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
            Vị trí công việc
          </p>
          <span className="text-4xl font-black text-[#2d3337]">
            {Array.from(new Set(employees.map((e) => e.userType))).length}
          </span>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-[32px] shadow-sm border border-gray-100 overflow-hidden mx-4">
        <div className="bg-gray-50/30 border-b border-gray-100 p-6 flex items-center justify-between">
          <div className="relative w-[350px]">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Tìm theo tên hoặc ID nhân viên..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-white border border-gray-200 rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500 transition-all shadow-inner"
            />
          </div>
          {!isManager && (
            <select
              aria-label="Lọc chi nhánh"
              className="form-control w-auto"
              value={branchFilter}
              onChange={(e) => setBranchFilter(e.target.value)}
            >
              <option value="">Tất cả chi nhánh</option>
              {branches.map((b) => (
                <option key={b.branchId} value={b.branchId}>
                  {b.bName}
                </option>
              ))}
            </select>
          )}
          <select
            value={selectedRole}
            onChange={(e) => setSelectedRole(e.target.value)}
            className="bg-white border border-gray-200 px-5 py-3 rounded-2xl text-sm font-black outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
          >
            <option value="All Roles">Tất cả vai trò</option>
            <option value="ADMIN">Quản trị viên</option>
            <option value="MANAGER">Quản lý</option>
            <option value="STAFF">Nhân viên</option>
          </select>
        </div>

        <div className="w-full overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50/50 border-b border-gray-100 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                <th className="px-8 py-5">Nhân sự</th>
                <th className="px-8 py-5">Vai trò</th>
                <th className="px-8 py-5 text-center">Chi nhánh</th>
                <th className="px-8 py-5">Liên hệ</th>
                <th className="px-8 py-5">Trạng thái</th>
                <th className="px-8 py-5 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="py-20 text-center">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto text-indigo-500" />
                  </td>
                </tr>
              ) : filteredEmployees.length > 0 ? (
                pagination.items.map((emp, i) => (
                  <tr
                    key={emp.eUserId || i}
                    className="hover:bg-indigo-50/30 transition-colors group"
                  >
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center text-white font-black text-sm shadow-lg shadow-indigo-100 overflow-hidden">
                          {emp.avatarUrl ? (
                            <img
                              src={emp.avatarUrl}
                              alt={emp.eName}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <span>{emp.eName?.charAt(0)}</span>
                          )}
                        </div>
                        <div>
                          <p className="text-sm font-black text-gray-800 leading-tight">
                            {emp.eName}
                          </p>
                          <p className="text-[10px] text-gray-400 font-black mt-1 uppercase tracking-tighter">
                            Mã NV: #{emp.eUserId}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-5">
                      <span
                        className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider ${getThemeStyles(emp.userType)}`}
                      >
                        {emp.userType}
                      </span>
                    </td>
                    <td className="px-8 py-5 text-sm font-black text-gray-600 text-center">
                      {emp.branchId}
                    </td>
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-2 text-xs font-bold text-gray-500">
                        <Mail className="w-3.5 h-3.5 text-gray-300" /> {emp.email}
                      </div>
                    </td>
                    <td className="px-8 py-5">
                      <div
                        className={`flex items-center gap-2 font-black text-[10px] uppercase ${emp.isActive ? 'text-emerald-600' : 'text-gray-400'}`}
                      >
                        <div
                          className={`w-1.5 h-1.5 rounded-full ${emp.isActive ? 'bg-emerald-500' : 'bg-gray-300'}`}
                        />
                        {emp.isActive ? 'Đang làm' : 'Đã nghỉ'}
                      </div>
                    </td>
                    <td className="px-8 py-5 text-right relative">
                      <div className="flex flex-wrap justify-end gap-2">
                        <button
                          className="btn-secondary"
                          onClick={() => {
                            setSelectedEmployee(emp);
                            setViewOnly(true);
                            setSaveError('');
                            setIsDrawerOpen(true);
                          }}
                        >
                          Chi tiết
                        </button>
                        {canManageEmployee(user, emp) && (
                          <>
                            <button
                              className="btn-secondary"
                              onClick={() => {
                                setSelectedEmployee(emp);
                                setViewOnly(false);
                                setSaveError('');
                                setIsDrawerOpen(true);
                              }}
                            >
                              Chỉnh sửa
                            </button>
                            <button
                              className="btn-secondary"
                              onClick={() => setStatusEmployee(emp)}
                            >
                              {emp.isActive ? 'Khóa tài khoản' : 'Kích hoạt'}
                            </button>
                          </>
                        )}
                        {canManageEmployee(user, emp, 'delete') && (
                          <button
                            className="btn-secondary text-red-600"
                            onClick={() => handleDelete(emp.eUserId)}
                          >
                            Xóa
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={5}
                    className="py-20 text-center text-gray-400 font-bold uppercase tracking-widest text-xs"
                  >
                    Không tìm thấy nhân sự
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Side Drawer Form */}
      {isDrawerOpen && (
        <>
          <div
            className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm z-40 transition-opacity"
            onClick={() => setIsDrawerOpen(false)}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Hồ sơ nhân viên"
            style={{ width: 'min(100vw, 500px)', maxWidth: '100vw', maxHeight: '100dvh' }}
            className="fixed right-0 top-0 bottom-0 bg-white shadow-2xl z-50 flex flex-col animate-in slide-in-from-right duration-300"
          >
            <div className="p-8 border-b border-gray-100 flex justify-between items-center bg-gray-50/20">
              <div>
                <h2 className="text-2xl font-black text-gray-800 tracking-tight uppercase">
                  {viewOnly
                    ? 'Thông tin nhân viên'
                    : selectedEmployee
                      ? 'Chỉnh sửa nhân viên'
                      : 'Thêm nhân viên'}
                </h2>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[2px] mt-1">
                  Phòng quản lý nguồn nhân lực
                </p>
              </div>
              <button
                onClick={() => setIsDrawerOpen(false)}
                className="p-3 bg-white border border-gray-200 rounded-2xl hover:bg-gray-100 transition-colors shadow-sm"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={handleSaveForm}
              className="flex-1 min-h-0 overflow-y-auto p-6 space-y-5 custom-scrollbar"
            >
              {saveError && (
                <p role="alert" className="text-red-600">
                  {saveError}
                </p>
              )}
              <fieldset disabled={viewOnly || isSaving} className="space-y-5">
                <div className="flex flex-col items-center pb-4 border-b border-gray-50">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">
                    Ảnh đại diện
                  </label>
                  <div className="w-full">
                    {viewOnly ? (
                      avatarUrl ? (
                        <img
                          src={avatarUrl}
                          alt="Ảnh đại diện"
                          className="h-32 mx-auto rounded-xl"
                        />
                      ) : (
                        <p className="text-sm text-gray-500">Chưa có ảnh đại diện</p>
                      )
                    ) : (
                      <FileUpload
                        folderName="employees"
                        onUploadingChange={setUploading}
                        initialPreviewUrl={avatarUrl}
                        onUploadSuccess={(url) => setAvatarUrl(url)}
                        className="w-full"
                      />
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2 col-span-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">
                      Họ và tên khai sinh
                    </label>
                    <input
                      aria-label="Họ và tên khai sinh"
                      name="name"
                      type="text"
                      required
                      defaultValue={selectedEmployee?.eName}
                      className="w-full px-5 py-3.5 bg-gray-50 border border-gray-100 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-sm"
                      placeholder="VD: Vũ Như Đại"
                    />
                  </div>

                  <div className="space-y-2 col-span-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">
                      Email công việc
                    </label>
                    <input
                      aria-label="Email công việc"
                      name="email"
                      type="email"
                      required
                      defaultValue={selectedEmployee?.email}
                      className="w-full px-5 py-3.5 bg-gray-50 border border-gray-100 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-sm"
                      placeholder="email@cinema.com"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">
                      Số điện thoại
                    </label>
                    <input
                      aria-label="Số điện thoại"
                      name="phoneNumber"
                      type="text"
                      defaultValue={selectedEmployee?.phoneNumber}
                      className="w-full px-5 py-3.5 bg-gray-50 border border-gray-100 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-sm"
                      placeholder="090..."
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">
                      Giới tính
                    </label>
                    <select
                      aria-label="Giới tính"
                      name="sex"
                      defaultValue={selectedEmployee?.sex || 'M'}
                      className="w-full px-5 py-3.5 bg-gray-50 border border-gray-100 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-sm cursor-pointer"
                    >
                      <option value="M">Nam</option>
                      <option value="F">Nữ</option>
                      <option value="O">Khác</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">
                      Vị trí đảm nhiệm
                    </label>
                    <select
                      aria-label="Vị trí đảm nhiệm"
                      disabled={!can(user, 'employees', 'assign-role')}
                      name="role"
                      defaultValue={selectedEmployee?.userType || 'STAFF'}
                      className="w-full px-5 py-3.5 bg-gray-50 border border-gray-100 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-sm cursor-pointer uppercase"
                    >
                      <option value="STAFF">Staff</option>
                      {user.role === 'ADMIN' && <option value="MANAGER">Manager</option>}
                      {user.role === 'ADMIN' && <option value="ADMIN">Admin</option>}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">
                      Chi nhánh
                    </label>
                    {isManager ? (
                      <input name="branchId" type="hidden" value={managerBranchId || ''} />
                    ) : null}
                    <select
                      aria-label="Chi nhánh"
                      name="branchId"
                      disabled={isManager}
                      defaultValue={selectedEmployee?.branchId ?? managerBranchId ?? ''}
                      className={`w-full px-5 py-3.5 ${isManager ? 'bg-gray-100' : 'bg-gray-50'} border border-gray-100 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-sm cursor-pointer`}
                    >
                      {!isManager && <option value="">Chọn chi nhánh...</option>}
                      {isManager ? (
                        <option value={managerBranchId}>
                          {managerBranchId} (Chi nhánh của bạn)
                        </option>
                      ) : (
                        branches.map((b) => (
                          <option key={b.branchId} value={b.branchId}>
                            {b.bName} (ID: {b.branchId})
                          </option>
                        ))
                      )}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">
                      Lương cơ bản ($)
                    </label>
                    <input
                      aria-label="Lương cơ bản ($)"
                      name="salary"
                      type="number"
                      defaultValue={selectedEmployee?.salary}
                      className="w-full px-5 py-3.5 bg-gray-50 border border-gray-100 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-sm"
                      placeholder="3000"
                    />
                  </div>

                  {!selectedEmployee && (
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">
                        Mật khẩu
                      </label>
                      <input
                        aria-label="Mật khẩu"
                        name="password"
                        type="password"
                        required
                        minLength={10}
                        className="w-full px-5 py-3.5 bg-gray-50 border border-gray-100 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-sm"
                        placeholder="******"
                      />
                    </div>
                  )}
                </div>

                <div className="pt-4 space-y-4 bg-white">
                  {!viewOnly &&
                    can(user, 'employees', 'assign-role') &&
                    permissionCatalog.length > 0 && (
                      <fieldset className="w-full max-h-60 overflow-y-auto border rounded-xl p-4">
                        <legend className="text-sm">Quyền được backend cho phép cấp</legend>
                        <p className="text-xs text-gray-500 mb-2">
                          Chưa chọn tùy chỉnh: backend áp dụng quyền theo vai trò. Chọn ô để gửi
                          danh sách quyền cụ thể.
                        </p>
                        {permissionCatalog.map((p) => (
                          <label key={p.key} className="flex gap-2 text-xs py-1">
                            <input
                              type="checkbox"
                              checked={permissions?.includes(p.key) || false}
                              onChange={(e) =>
                                setPermissions(
                                  e.target.checked
                                    ? [...(permissions || []), p.key]
                                    : (permissions || []).filter((k) => k !== p.key),
                                )
                              }
                            />
                            {p.label}
                          </label>
                        ))}
                      </fieldset>
                    )}
                </div>
              </fieldset>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsDrawerOpen(false)}
                  className="flex-1 py-4 bg-gray-50 text-gray-400 rounded-xl font-bold hover:bg-gray-100 transition-all uppercase text-[10px] tracking-widest border border-gray-100"
                >
                  Hủy
                </button>
                {!viewOnly && (
                  <PermissionButton
                    permission={selectedEmployee ? 'employees:update' : 'employees:create'}
                    type="submit"
                    disabled={isSaving || uploading}
                    className="flex-[2] py-4 bg-indigo-600 text-white rounded-xl font-black shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all uppercase text-[10px] tracking-widest flex items-center justify-center gap-2"
                  >
                    {isSaving ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : selectedEmployee ? (
                      'Lưu thay đổi'
                    ) : (
                      'Thêm nhân viên'
                    )}
                  </PermissionButton>
                )}
              </div>
            </form>
          </div>
        </>
      )}
      <ConfirmModal
        key={statusEmployee?.eUserId || 'status'}
        isOpen={!!statusEmployee}
        onClose={() => setStatusEmployee(null)}
        title={
          statusEmployee?.isActive ? 'Khóa tài khoản nhân viên' : 'Kích hoạt tài khoản nhân viên'
        }
        description={statusEmployee?.eName}
        onConfirm={handleToggleStatus}
      />
      <ConfirmModal
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        onConfirm={confirmDelete}
        title="Xác nhận xóa nhân sự"
        description={`Bạn có chắc chắn muốn xóa nhân viên #${employeeToDelete}? Hồ sơ nhân sự sẽ bị gỡ bỏ khỏi hệ thống chi nhánh.`}
      />
      <Pagination {...pagination} />
    </div>
  );
}

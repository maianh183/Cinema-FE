import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Menu, LogOut } from 'lucide-react';
import { toast } from 'sonner';
import { useSidebar } from './SidebarContext';
import { useAuthStore } from '@/stores/authStore';
import { authService } from '@/services/authService';
export default function Header() {
  const { toggleSidebar, toggleMobileSidebar } = useSidebar();
  const user = useAuthStore((s) => s.user);
  const [busy, setBusy] = useState(false);
  async function performLogout() {
    setBusy(true);
    try {
      await authService.logout();
    } catch (e) {
      toast.error('Đã xóa phiên trên thiết bị; máy chủ chưa xác nhận đăng xuất: ' + e.message);
    } finally {
      setBusy(false);
    }
  }
  function logout() {
    const event = new CustomEvent('dashboard:before-action', {
      cancelable: true,
      detail: performLogout,
    });
    if (window.dispatchEvent(event)) performLogout();
  }
  return (
    <header className="sticky top-0 z-20 h-20 border-b border-gray-200 bg-white/95 backdrop-blur px-4 sm:px-6 flex items-center justify-between gap-3">
      <div className="flex items-center gap-4">
        <button
          className="btn-secondary p-2.5"
          aria-label="Bật tắt menu"
          onClick={() => (window.innerWidth < 1280 ? toggleMobileSidebar() : toggleSidebar())}
        >
          <Menu size={22} />
        </button>
        <span className="hidden md:block text-sm text-gray-500">
          Không gian vận hành doanh nghiệp
        </span>
      </div>
      <div className="flex items-center gap-3">
        <Link to="/profile" className="flex gap-3 items-center">
          <div className="w-10 h-10 rounded-full bg-indigo-50 text-indigo-700 flex items-center justify-center overflow-hidden font-semibold">
            {user.avatar ? (
              <img src={user.avatar} alt="" className="w-full h-full object-cover" />
            ) : (
              user.name?.charAt(0)
            )}
          </div>
          <div className="hidden sm:block">
            <p className="text-sm font-semibold">{user.name}</p>
            <p className="text-xs text-gray-500">
              {user.role}
              {user.branchId ? ' · CN ' + user.branchId : ''}
            </p>
          </div>
        </Link>
        <button
          onClick={logout}
          disabled={busy}
          aria-label="Đăng xuất"
          title="Đăng xuất"
          className="btn-secondary p-2.5"
        >
          <LogOut size={18} />
        </button>
      </div>
    </header>
  );
}

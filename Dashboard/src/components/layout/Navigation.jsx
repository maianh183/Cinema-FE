import { NavLink } from 'react-router-dom';
import {
  Film,
  CalendarDays,
  MapPin,
  Armchair,
  Users,
  UserRound,
  CalendarClock,
  Receipt,
  Ticket,
  ShoppingBag,
  CircleHelp,
  Newspaper,
  MessageSquare,
  ChartColumn,
  CircleUser,
  Mail,
  FileText,
  X,
} from 'lucide-react';
import { useSidebar } from './SidebarContext';
import { useAuthStore } from '@/stores/authStore';
import { modules, can } from '@/utils/permissions';
const icons = [
  Film,
  CalendarDays,
  MapPin,
  Armchair,
  Users,
  UserRound,
  CalendarClock,
  Receipt,
  Ticket,
  ShoppingBag,
  CircleHelp,
  Newspaper,
  MessageSquare,
  MessageSquare,
  ChartColumn,
  CircleUser,
  Mail,
  FileText,
];
export default function Navigation() {
  const { isExpanded, isMobileOpen, setIsMobileOpen } = useSidebar();
  const user = useAuthStore((s) => s.user);
  const expanded = isExpanded || isMobileOpen;
  return (
    <>
      <aside
        className={
          'app-sidebar fixed top-0 left-0 bottom-0 z-40 bg-white border-r border-gray-200 flex flex-col transition-all ' +
          (expanded ? 'w-[290px]' : 'w-[90px]') +
          ' ' +
          (isMobileOpen ? 'translate-x-0' : '-translate-x-full xl:translate-x-0')
        }
      >
        <div className="h-20 px-6 flex items-center gap-3 shrink-0">
          <Film className="text-indigo-600 shrink-0" size={30} />
          {expanded && (
            <span className="text-2xl font-bold tracking-tight">
              CineFlow
              <span className="block text-[10px] tracking-[3px] text-gray-400 font-medium">
                QUẢN TRỊ NỘI BỘ
              </span>
            </span>
          )}
          <button
            aria-label="Đóng menu"
            onClick={() => setIsMobileOpen(false)}
            className="ml-auto xl:hidden"
          >
            <X />
          </button>
        </div>
        <nav aria-label="Điều hướng chính" className="overflow-y-auto flex-1 p-3 space-y-1">
          {modules.map(([module, path, label], i) => {
            const Icon = icons[i];
            if (!can(user, module)) return null;
            return (
              <NavLink
                key={path}
                to={path}
                end
                title={label}
                onClick={() => setIsMobileOpen(false)}
                className={({ isActive }) =>
                  'flex items-center gap-3 rounded-lg px-4 py-2.5 text-sm font-medium ' +
                  (isActive ? 'bg-indigo-50 text-indigo-700' : 'text-gray-600 hover:bg-gray-50')
                }
              >
                <Icon size={20} className="shrink-0" />
                {expanded && label}
              </NavLink>
            );
          })}
        </nav>
        <div className="p-5 border-t text-xs text-gray-400">
          {expanded ? 'CineFlow · TailAdmin Free' : 'CF'}
        </div>
      </aside>
      {isMobileOpen && (
        <button
          aria-label="Đóng menu bên"
          className="fixed inset-0 z-30 bg-black/40 xl:hidden"
          onClick={() => setIsMobileOpen(false)}
        />
      )}
    </>
  );
}

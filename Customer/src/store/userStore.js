import { create } from 'zustand';
import { authService } from '../services/customer.js';
import { setCsrf } from '../services/api.js';
export const useUserStore = create((set) => ({
  user: null,
  ready: false,
  error: null,
  setUser: (user) => {
    if (user?.role !== 'CUSTOMER') throw Error('Vui lòng dùng tài khoản khách hàng.');
    setCsrf(user.csrfToken);
    set({ user, ready: true, error: null });
  },
  restore: async () => {
    try {
      const user = await authService.me();
      if (user.role !== 'CUSTOMER') throw Error('Tài khoản này không thuộc khu vực khách hàng.');
      set({ user, ready: true, error: null });
    } catch (e) {
      set({
        user: null,
        ready: true,
        error: e.status === 401 ? null : e.message,
      });
    }
  },
  clearUser: () => {
    setCsrf(null);
    set({ user: null, ready: true });
  },
  logout: async () => {
    await authService.logout();
    setCsrf(null);
    set({ user: null });
    window.dispatchEvent(new Event('cms:logout'));
  },
}));
if (typeof window !== 'undefined')
  window.addEventListener('cms:session-expired', () => useUserStore.getState().clearUser());

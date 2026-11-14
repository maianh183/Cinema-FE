import { create } from 'zustand';
import { normalizeUser } from '@/utils/permissions';
export const useAuthStore = create((set, get) => ({
  accessToken: null,
  csrfToken: null,
  user: null,
  ready: false,
  sessionVersion: 0,
  expired: false,
  setTokens: (accessToken, csrfToken) =>
    set({ accessToken: accessToken || null, csrfToken: csrfToken || null }),
  setUser: (user) =>
    set((state) => ({
      user: normalizeUser(user),
      csrfToken: user.csrfToken || state.csrfToken,
      ready: true,
      expired: false,
    })),
  logout: (expired = false) =>
    set((s) => ({
      accessToken: null,
      csrfToken: null,
      user: null,
      ready: true,
      expired,
      sessionVersion: s.sessionVersion + 1,
    })),
  isAuthenticated: () => !!get().user,
}));
const channel =
  typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('cinema-session') : null;
if (channel)
  channel.onmessage = (e) => {
    if (e.data === 'logout') useAuthStore.getState().logout();
  };
export function broadcastLogout() {
  channel?.postMessage('logout');
}
// Remove insecure credentials left by the old Next frontend. Never persist new tokens.
if (typeof window !== 'undefined') {
  localStorage.removeItem('auth-storage');
  for (const name of ['accessToken', 'refreshToken'])
    document.cookie = name + '=; Max-Age=0; path=/';
}

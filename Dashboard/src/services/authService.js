import api from './api';
import { useAuthStore, broadcastLogout } from '@/stores/authStore';
import { sessionUser } from '@/utils/apiContract';
export const authService = {
  login: async (data) => {
    const result = (
      await api.post('/auth/login', {
        provider: 'LOCAL',
        email: data.email,
        password: data.password,
      })
    ).data;
    try {
      // Nested S-N login is optional. Token-only legacy login still requires /me.
      if (result?.user) sessionUser(result);
      useAuthStore
        .getState()
        .setTokens(result?.accessToken, result?.csrfToken ?? result?.user?.csrfToken);
      useAuthStore.getState().setUser(await authService.getMe());
    } catch (error) {
      useAuthStore.getState().logout();
      throw error;
    }
    return result;
  },
  getMe: async () => sessionUser((await api.get('/auth/me')).data),
  restore: async () => {
    try {
      const result = await authService.getMe();
      useAuthStore.getState().setUser(result);
    } catch {
      useAuthStore.getState().logout();
    }
  },
  logout: async () => {
    try {
      await api.post('/auth/logout');
    } finally {
      useAuthStore.getState().logout();
      broadcastLogout();
    }
  },
  updateProfile: async (data) => (await api.put('/auth/profile', data)).data,
  changePassword: async (data) => (await api.post('/auth/change-password', data)).data,
};

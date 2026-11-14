import api from './api';
export const systemService = {
  getSettings: async () => {
    const response = await api.get('/system/settings');
    return response.data;
  },
  updateSettings: async (settings) => {
    const response = await api.put('/system/settings', settings);
    return response.data;
  },
  // Gửi email xác nhận & nhắc lịch (Manual trigger if needed)
  triggerEmailReminder: async (orderId) => {
    const response = await api.post(`/system/emails/remind/${orderId}`);
    return response.data;
  },
  // Đồng bộ ghế thời gian thực (Trigger sync)
  syncSeats: async (showtimeId) => {
    const response = await api.post(`/system/sync-seats/${showtimeId}`);
    return response.data;
  },
};

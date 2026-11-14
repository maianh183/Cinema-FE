import { fullList } from '@/utils/apiContract';
import api from './api';
export const customerService = {
  // Lấy danh sách tất cả khách hàng
  getAll: async () => {
    const response = await api.get('/customers');
    return fullList(response);
  },
  // Lấy chi tiết một khách hàng
  getById: async (id) => {
    const response = await api.get(`/customers/${id}`);
    return response.data;
  },
  // Tra cứu khách hàng tại quầy
  getByPhone: async (phone) => {
    const response = await api.get(`/customers/phone?phone=${phone}`);
    return response.data;
  },
  // Tạo mới khách hàng
  create: async (data) => {
    const response = await api.post('/customers', data);
    return response.data;
  },
  // Vô hiệu hóa tài khoản
  deactivate: async (id) => {
    await api.patch(`/customers/${id}/deactivate`);
  },
  // Kích hoạt tài khoản
  activate: async (id) => {
    await api.patch(`/customers/${id}/activate`);
  },
};

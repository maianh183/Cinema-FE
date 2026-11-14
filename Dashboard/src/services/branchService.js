import { fullList } from '@/utils/apiContract';
import api from './api';
export const branchService = {
  // Lấy danh sách chi nhánh
  getAll: async () => {
    const response = await api.get('/branches');
    return fullList(response);
  },
  // Thêm chi nhánh
  create: async (data) => {
    const response = await api.post('/branches', data);
    return response.data;
  },
  // Cập nhật chi nhánh
  update: async (id, data) => {
    const response = await api.put(`/branches/${id}`, data);
    return response.data;
  },
  // Xóa chi nhánh
  delete: async (id) => {
    await api.delete(`/branches/${id}`);
  },
};

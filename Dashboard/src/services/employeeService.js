import { fullList } from '@/utils/apiContract';
import api from './api';
export const employeeService = {
  getById: async (id) => (await api.get('/employees/' + encodeURIComponent(id))).data,
  // Lấy danh sách tất cả nhân viên
  getAll: async () => {
    const response = await api.get('/employees');
    return fullList(response);
  },
  getByBranch: async (branchId) => {
    const response = await api.get(`/employees/branch/${branchId}`);
    return fullList(response);
  },
  // Lưu thông tin nhân viên
  save: async (data, id) => {
    if (id) return (await api.put(`/employees/${id}`, data)).data;
    return (await api.post('/employees', data)).data;
  },
  // Xóa thông tin nhân viên
  delete: async (id) => {
    await api.delete(`/employees/${id}`);
  },
  // Ngừng kích hoạt tài khoản
  deactivate: async (id) => {
    await api.patch(`/employees/${id}/deactivate`);
  },
  // Kích hoạt tài khoản
  activate: async (id) => {
    await api.patch(`/employees/${id}/activate`);
  },
  // Phân ca làm việc cho nhân viên
  assignWorkShifts: async (id, requests) => {
    await api.put(`/employees/${id}/work-shifts`, requests);
  },
  // Gỡ ca làm việc của nhân viên
  unassignWorkShift: async (id, startTime, endTime, wDate, branchId) => {
    await api.delete(`/employees/${id}/work-shifts`, {
      params: { startTime, endTime, wDate, branchId },
    });
  },
};

import {fullList} from '@/utils/apiContract';
import api from './api';
export const showtimeService = {
    // Lấy toàn bộ danh sách suất chiếu
    getAll: async () => {
        const response = await api.get('/showtimes');
        return fullList(response);
    },
    // Lấy danh sách suất chiếu theo chi nhánh
    getByBranch: async (branchId) => {
        const response = await api.get(`/showtimes?branchId=${branchId}`);
        return fullList(response);
    },
    // Tạo mới một suất chiếu
    create: async (data) => {
        const response = await api.post('/showtimes', data);
        return response.data;
    },
    // Cập nhật suất chiếu hiện có
    update: async (id, data) => {
        const response = await api.put(`/showtimes/${id}`, data);
        return response.data;
    },
    // Xóa suất chiếu
    delete: async (id) => {
        await api.delete(`/showtimes/${id}`);
    }
};

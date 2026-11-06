import {fullList} from '@/utils/apiContract';
import api from './api';
export const couponService = {
    // Lấy toàn bộ mã giảm giá
    getAll: async () => {
        const response = await api.get('/coupons');
        return fullList(response);
    },
    // Tạo mã mới
    create: async (data) => {
        const response = await api.post('/coupons', data);
        return response.data;
    },
    // Cập nhật mã
    update: async (id, data) => {
        const response = await api.patch(`/coupons/${id}`, data);
        return response.data;
    },
    // Xóa mã
    delete: async (id) => {
        await api.delete(`/coupons/${id}`);
    }
};

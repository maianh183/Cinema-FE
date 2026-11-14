import { fullList } from '@/utils/apiContract';
import api from './api';
export const productService = {
  // Lấy toàn bộ danh sách sản phẩm (tổng hợp từ cả 2 API)
  getAll: async () => {
    const [foodDrinks, merchandise] = await Promise.all([
      api.get('/food-drinks'),
      api.get('/merchandise'),
    ]);
    // Đảm bảo mỗi item có itemType để phân biệt nếu BE chưa trả về
    const fd = fullList(foodDrinks).map((item) => ({ ...item, itemType: 'FOOD_DRINK' }));
    const mc = fullList(merchandise).map((item) => ({ ...item, itemType: 'MERCHANDISE' }));
    return [...fd, ...mc];
  },
  // Lấy danh sách Food & Drinks
  getFoodDrinks: async () => {
    const response = await api.get('/food-drinks');
    return fullList(response).map((item) => ({ ...item, itemType: 'FOOD_DRINK' }));
  },
  // Lấy danh sách Merchandise
  getMerchandise: async () => {
    const response = await api.get('/merchandise');
    return fullList(response).map((item) => ({ ...item, itemType: 'MERCHANDISE' }));
  },
  // Lấy chi tiết một sản phẩm (cần biết type để gọi đúng API)
  getById: async (id, type) => {
    const endpoint = type === 'FOOD_DRINK' ? '/food-drinks' : '/merchandise';
    const response = await api.get(`${endpoint}/${id}`);
    return { ...response.data, itemType: type };
  },
  // Tạo sản phẩm mới
  create: async (data) => {
    const isMerch = 'merchName' in data;
    const endpoint = isMerch ? '/merchandise' : '/food-drinks';
    const response = await api.post(endpoint, data);
    return { ...response.data, itemType: isMerch ? 'MERCHANDISE' : 'FOOD_DRINK' };
  },
  // Cập nhật thông tin sản phẩm
  update: async (id, data, type) => {
    const endpoint = type === 'FOOD_DRINK' ? '/food-drinks' : '/merchandise';
    const response = await api.put(`${endpoint}/${id}`, data);
    return { ...response.data, itemType: type };
  },
  // Xóa sản phẩm
  delete: async (id, type) => {
    const endpoint = type === 'FOOD_DRINK' ? '/food-drinks' : '/merchandise';
    await api.delete(`${endpoint}/${id}`);
  },
};

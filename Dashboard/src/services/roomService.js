import { fullList } from '@/utils/apiContract';
import api from './api';
export const roomService = {
  getAll: async () => {
    const response = await api.get('/rooms');
    return fullList(response);
  },
  getSeats: async (branchId, roomId, showtimeId) => {
    const response = await api.get(`/seats/branches/${branchId}/rooms/${roomId}`, {
      params: { showtimeId },
    });
    return fullList(response);
  },
  getByBranch: async (branchId) => {
    const response = await api.get(`/rooms?branchId=${branchId}`);
    return fullList(response);
  },
  updateLayout: async (branchId, roomId, layout) => {
    const response = await api.post(`/seats/branches/${branchId}/rooms/${roomId}/bulk`, layout);
    return response.data;
  },
  syncSeats: async (branchId, roomId, layout) => {
    const response = await api.post(`/seats/branches/${branchId}/rooms/${roomId}/bulk`, layout);
    return response.data;
  },
  create: async (data) => {
    const response = await api.post('/rooms', data);
    return response.data;
  },
  update: async (branchId, roomId, data) => {
    const response = await api.put(`/rooms/${branchId}/${roomId}`, data);
    return response.data;
  },
  delete: async (branchId, roomId) => {
    await api.delete(`/rooms/${branchId}/${roomId}`);
  },
};

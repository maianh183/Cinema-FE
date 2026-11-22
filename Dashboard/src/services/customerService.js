import { fullList } from '@/utils/apiContract';
import api from './api';
import { useAuthStore } from '@/stores/authStore';
import { can } from '@/utils/permissions';
import {
  validateCustomerProfile,
  customerProfileDto,
  customerAccountError,
} from '@/utils/customerAccount';

const resetRequests = new Set();
const resetCooldowns = new Map();
function accountAccess(id, action) {
  const { user } = useAuthStore.getState();
  if (!can(user, 'customers', action))
    throw Object.assign(new Error('Bạn không có quyền thực hiện thao tác này.'), { status: 403 });
  if (typeof id !== 'string' || !id.trim() || id === 'me')
    throw new Error('Mã khách hàng không hợp lệ.');
}
function resetKey(id) {
  const { user, sessionVersion } = useAuthStore.getState();
  return JSON.stringify([sessionVersion, user?.id, id]);
}
export function passwordResetWait(id) {
  return Math.max(0, Math.ceil(((resetCooldowns.get(resetKey(id)) || 0) - Date.now()) / 1000));
}
export const customerService = {
  updateProfile: async (id, data) => {
    accountAccess(id, 'edit-profile');
    const payload = validateCustomerProfile(data);
    let response;
    try {
      response = await api.patch(`/customers/${encodeURIComponent(id)}/profile`, payload, {
        requireSuccessEnvelope: true,
      });
    } catch (error) {
      throw customerAccountError(error);
    }
    return customerProfileDto(response.data, id);
  },
  requestPasswordReset: async (id) => {
    accountAccess(id, 'reset-password');
    const key = resetKey(id);
    if (resetRequests.has(key) || passwordResetWait(id))
      throw Object.assign(new Error('Vui lòng chờ trước khi gửi lại yêu cầu.'), { status: 429 });
    resetRequests.add(key);
    resetCooldowns.set(key, Date.now() + 60000);
    try {
      const { data } = await api.post(
        `/customers/${encodeURIComponent(id)}/password-reset`,
        {},
        { requireSuccessEnvelope: true },
      );
      if (data?.requested !== true)
        throw Object.assign(new Error('Invalid acknowledgement'), { status: 502 });
      return { requested: true };
    } catch (error) {
      if ((error.response?.status || error.status) === 429) {
        const value = error.response?.headers?.['retry-after'];
        const seconds = /^\d+$/.test(String(value))
          ? Number(value)
          : (Date.parse(value) - Date.now()) / 1000;
        if (Number.isFinite(seconds))
          resetCooldowns.set(key, Date.now() + Math.max(60, seconds) * 1000);
      }
      throw customerAccountError(error);
    } finally {
      resetRequests.delete(key);
    }
  },
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

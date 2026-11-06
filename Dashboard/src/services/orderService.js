import api, {getFullList} from './api';
import {orderDto} from '@/utils/apiContract';
import {useAuthStore} from '@/stores/authStore';
import {canConfirmOrder,canCancelOrder} from '@/utils/business';
const read=(data,id)=>orderDto(data,useAuthStore.getState().user,id);
async function transition(id,action,status,allowed) {
    const current=await orderService.getById(id);
    if(!allowed(useAuthStore.getState().user,current))throw new Error('Đơn hàng không đủ điều kiện '+(action==='cancel'?'hủy.':'xác nhận.'));
    const result=read((await api.post(`/orders/${encodeURIComponent(id)}/${action}`,{})).data,id);
    if(result.orderStatus!==status||result.source!=='STAFF'||result.branchId!==current.branchId)
        throw new Error(action==='cancel'?'API chưa xác nhận hủy đơn. Vui lòng tải lại để đối chiếu.':'API chưa xác nhận thanh toán. Vui lòng tải lại đơn hàng.');
    return result;
}
export const orderService = {
    // Lấy danh sách toàn bộ hóa đơn/vé
    getAll: async (branchId) => {
        const rows = await getFullList('/orders', { params: { branchId } });
        return rows.map(row=>read(row));
    },
    // Lấy chi tiết một hóa đơn cụ thể
    getById: async (id) => {
        const response = await api.get(`/orders/${id}`);
        return read(response.data,id);
    },
    // Tạo hóa đơn mới
    create: async (data) => {
        const response = await api.post('/orders', data);
        const result=read(response.data);
        if(result.source!=='STAFF'||result.orderStatus!=='PENDING')throw new Error('API chưa xác nhận đơn PENDING tại quầy.');
        return result;
    },
    // Proposed atomic PHP endpoint; no fallback to arbitrary status updates.
    confirmPayment: id => transition(id,'confirm-payment','PAID',canConfirmOrder),
    cancel: id => transition(id,'cancel','CANCELLED',canCancelOrder),
    // Cập nhật thông tin chung
    update: async (id, data) => {
        const response = await api.put(`/orders/${id}`, data);
        return response.data;
    },
    // Xóa hóa đơn
    delete: async (id) => {
        await api.delete(`/orders/${id}`);
    },
};

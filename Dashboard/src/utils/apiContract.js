import {normalizeUser} from './permissions';
import {inHomeBranch} from './schedule';
import {normalizeOrderStatus} from './business';

// Shared draft-1.0 read adapters. These do not establish PHP capabilities or enums.
export function fullList(response) {
  const data=response.data, nested=data&&!Array.isArray(data)&&Array.isArray(data.items);
  const rows=nested?data.items:data;
  if(!Array.isArray(rows))throw new Error('API phải trả toàn bộ danh sách theo hợp đồng.');
  for(const meta of [response.pagination,...(nested?[data]:[])].filter(value=>value!=null)) {
    if(!Number.isSafeInteger(meta.total)||meta.total!==rows.length||(meta.page!=null&&meta.page!==1))
      throw new Error('Danh sách chưa đầy đủ (O-06). Cần đồng bộ PHP/service/UI trước khi dùng phân trang server.');
  }
  return rows;
}
export function sessionUser(data) {
  const value=data?.user??data;
  const user=normalizeUser(value);
  if(!user||typeof user.id!=='string'||!user.id.trim())throw new Error('API chưa trả định danh phiên nhân sự hợp lệ.');
  return {...user,csrfToken:data?.csrfToken??user.csrfToken};
}
export function numericId(value,name='ID') {
  if(!Number.isSafeInteger(value)||value<1)throw new Error(`${name} phải là số nguyên dương trong DTO.`);
  return value;
}
export function orderDto(data,user,expectedId) {
  if(!data||typeof data!=='object')throw new Error('API chưa trả đơn hàng hợp lệ.');
  numericId(data.orderId,'orderId');numericId(data.branchId,'branchId');
  if(expectedId!=null&&String(data.orderId)!==String(expectedId))throw new Error('API trả sai mã đơn hàng.');
  if(!inHomeBranch(user,data.branchId))throw new Error('API trả đơn hàng ngoài phạm vi được cấp quyền.');
  if(!Number.isFinite(data.total)||data.total<0||typeof data.orderStatus!=='string'||!data.orderStatus.trim())throw new Error('API chưa xác nhận tổng tiền/trạng thái đơn hàng.');
  for(const ticket of data.ticketDetails||[]) {
    if(ticket.showtimeId!=null)numericId(ticket.showtimeId,'ticket.showtimeId');
    if(ticket.timeId!=null&&ticket.timeId!==ticket.showtimeId)throw new Error('Snapshot vé có timeId/showtimeId không khớp.');
  }
  // Unknown/legacy statuses remain visible, never inferred from paymentMethod/paymentStatus.
  return {...data,orderStatus:normalizeOrderStatus(data.orderStatus)};
}
export const onlineOrderLabels={AWAITING_PAYMENT:'Chờ thanh toán online',EXPIRED:'Hết hạn thanh toán'};
export const productKey=product=>`${product.itemType}:${product.productId}`;
export const orderBlocksSeat=order=>['PENDING','PAID','AWAITING_PAYMENT'].includes(normalizeOrderStatus(order.orderStatus));

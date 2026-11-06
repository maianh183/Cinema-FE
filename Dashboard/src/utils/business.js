import { can } from './permissions';
import {inBranchScope,inHomeBranch} from './schedule';

// Date-only values are business dates in Asia/Ho_Chi_Minh, inclusive at day end.
export function businessTime(value, end = false) {
  if (!value || typeof value !== 'string') return NaN;
  const dateOnly = /^\d{4}-\d{2}-\d{2}$/.test(value);
  if (dateOnly && (!Number.isFinite(Date.parse(value)) || new Date(value).toISOString().slice(0, 10) !== value)) return NaN;
  return Date.parse(dateOnly ? value + (end ? 'T23:59:59.999+07:00' : 'T00:00:00+07:00') : /(?:Z|[+-]\d{2}:\d{2})$/.test(value) ? value : value + '+07:00');
}
export const normalizeOrderStatus = value => String(value || '').trim().toUpperCase();
export function canConfirmOrder(user, order) {
  return can(user, 'orders', 'confirm-payment') && normalizeOrderStatus(order.orderStatus) === 'PENDING'
    && order.source === 'STAFF' && !!order.createdByEmployeeId
    && Number.isFinite(Number(order.total)) && Number(order.total) >= 0
    && !!order.branchId && inHomeBranch(user,order.branchId);
}
export function canCancelOrder(user,order) {
  return can(user,'orders','cancel')&&normalizeOrderStatus(order.orderStatus)==='PENDING'
    &&order.source==='STAFF'&&!!order.createdByEmployeeId&&!!order.branchId&&inHomeBranch(user,order.branchId);
}
export const couponLabels = { PREACTIVE:'Chưa hoạt động', ACTIVE:'Đang hoạt động', EXPIRED:'Hết hạn', INVALID:'Dữ liệu không hợp lệ' };
export function couponStatus(coupon, now = Date.now()) {
  const start = businessTime(coupon.startDate), end = businessTime(coupon.endDate, true);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) return 'INVALID';
  if (now > end) return 'EXPIRED';
  return now < start ? 'PREACTIVE' : 'ACTIVE';
}
export function couponUsage(coupon) {
  if ([coupon.releaseNum,coupon.availNum].some(value=>value===null||value===undefined||value==='')) return null;
  const total = Number(coupon.releaseNum), available = Number(coupon.availNum);
  if (!Number.isInteger(total) || !Number.isInteger(available) || total < 0 || available < 0 || available > total) return null;
  return total === 0 ? 0 : (total - available) / total * 100;
}
export function nextCouponAvailable(previous, releaseNum) {
  const next = Number(releaseNum);
  if (!Number.isInteger(next) || next < 0) throw new Error('Số lượng phát hành phải là số nguyên không âm.');
  if (!previous) return next;
  if (couponUsage(previous) === null) throw new Error('Số lượng voucher từ API không nhất quán. Vui lòng tải lại dữ liệu.');
  const old = Number(previous.releaseNum), used = old - Number(previous.availNum);
  if (next < old) throw new Error('Số lượng phát hành không được nhỏ hơn số lượng hiện tại.');
  if (next < used) throw new Error('Số lượng phát hành không thể nhỏ hơn số đã dùng.');
  return next - used;
}
export const productLabels = { PREACTIVE:'Chưa mở bán', ACTIVE:'Đang kinh doanh', OUT_OF_STOCK:'Hết hàng', EXPIRED:'Ngừng kinh doanh', UNKNOWN:'Chưa có lịch kinh doanh', INVALID:'Dữ liệu không hợp lệ' };
export function productStatus(product, now = Date.now()) {
  const stock = Number(product.quantity ?? product.availNum);
  if (!Number.isInteger(stock) || stock < 0) return 'INVALID';
  if (!product.startDate || !product.endDate) return 'UNKNOWN';
  const start = businessTime(product.startDate), end = businessTime(product.endDate, true);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) return 'INVALID';
  if (now > end) return 'EXPIRED';
  if (now < start) return 'PREACTIVE';
  return stock === 0 ? 'OUT_OF_STOCK' : 'ACTIVE';
}
export function showtimeEnd(day, startTime, runTime) {
  const start = businessTime(day + 'T' + startTime);
  const duration = Number(runTime);
  if (!Number.isFinite(start) || !Number.isInteger(duration) || duration < 1 || duration > 600) throw new Error('Phim cần thời lượng hợp lệ (1–600 phút) để tính lịch chiếu.');
  const local = new Date(start + (duration + 420) * 60000).toISOString();
  return { endDate: local.slice(0,10), endTime: local.slice(11,19) };
}
export function showtimeInterval(showtime) {
  const start = businessTime(showtime.day + 'T' + showtime.startTime);
  let end = businessTime((showtime.endDate || showtime.day) + 'T' + showtime.endTime);
  if (!showtime.endDate && end <= start) end += 86400000;
  return [start, end];
}
export function showtimesOverlap(a, b) {
  if (String(a.branchId) !== String(b.branchId) || String(a.roomId) !== String(b.roomId)) return false;
  const [as,ae] = showtimeInterval(a), [bs,be] = showtimeInterval(b);
  return as < be && bs < ae;
}
export function canManageEmployee(user, employee, action = 'update') {
  return can(user, 'employees', action) && (!employee || (String(employee.eUserId) !== String(user.id)
    && (user.role === 'ADMIN' || (user.branchId != null && String(employee.branchId) === String(user.branchId) && employee.userType === 'STAFF'))));
}

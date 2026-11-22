export const todayVN = (now = new Date()) =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
export const money = (n) =>
  Number.isFinite(Number(n)) ? Number(n).toLocaleString('vi-VN') + ' ₫' : 'Chưa có giá';
export const dateTime = (v) =>
  Number.isFinite(Date.parse(v))
    ? new Date(v).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })
    : '—';
export const validRating = (n) => typeof n === 'number' && Number.isInteger(n) && n >= 1 && n <= 5;
export function dateBoundary(value, end = false) {
  if (!value) return NaN;
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    if (!Number.isFinite(Date.parse(value)) || new Date(value).toISOString().slice(0, 10) !== value)
      return NaN;
    return Date.parse(value + (end ? 'T23:59:59.999+07:00' : 'T00:00:00+07:00'));
  }
  return /(?:Z|[+-]\d{2}:\d{2})$/.test(value) ? Date.parse(value) : NaN;
}
export function periodStatus(item, now = Date.now()) {
  if (!item.startDate || !item.endDate) return 'UNKNOWN';
  const start = dateBoundary(item.startDate),
    end = dateBoundary(item.endDate, true);
  if (!Number.isFinite(start) || !Number.isFinite(end) || start > end) return 'INVALID';
  return now < start ? 'PREACTIVE' : now > end ? 'EXPIRED' : 'ACTIVE';
}
export const stock = (p) => (p.itemType === 'MERCHANDISE' ? p.availNum : p.quantity);
export function productStatus(p, now = Date.now()) {
  const status = periodStatus(p, now),
    count = stock(p);
  if (!Number.isInteger(count) || count < 0 || !Number.isFinite(p.price) || p.price < 0)
    return 'INVALID';
  return status === 'ACTIVE' && count === 0 ? 'OUT_OF_STOCK' : status;
}
export function couponDiscount(c, total, now = Date.now()) {
  if (
    periodStatus(c, now) !== 'ACTIVE' ||
    !Number.isInteger(c.availNum) ||
    c.availNum <= 0 ||
    c.availNum > c.releaseNum ||
    !Number.isFinite(c.saleOff) ||
    c.saleOff <= 0 ||
    c.saleOff > 100 ||
    !Number.isFinite(total) ||
    total < 0 ||
    total < (c.minOrderTotal ?? 0)
  )
    return 0;
  return Math.min(
    total,
    Math.round((total * c.saleOff) / 100),
    c.maxDiscount > 0 ? c.maxDiscount : Infinity,
  );
}
export const productKey = (p) => `${p.itemType}:${p.productId}`;
export const productName = (p) => p.pName || p.merchName;
export const seatKey = (s) => `${s.sRow}-${s.sColumn}`;
export function isFutureShowtime(s, now = Date.now()) {
  return (
    !['CANCELLED', 'FINISHED', 'COMPLETED', 'ON_AIR'].includes(s.status) &&
    Date.parse(`${s.day}T${s.startTime}+07:00`) > now
  );
}
export function safeUrl(value) {
  try {
    const u = new URL(value, window.location.origin);
    return ['https:', 'http:'].includes(u.protocol) ? u.href : '';
  } catch {
    return '';
  }
}
export function validateComment(p) {
  if (!Number.isInteger(p.movieId) || !validRating(p.rating))
    throw Error('Chọn phim và điểm nguyên từ 1 đến 5 sao.');
  if ((p.content ?? '').trim().length > 2000) throw Error('Nội dung tối đa 2000 ký tự.');
  return {
    movieId: p.movieId,
    rating: p.rating,
    content: p.content?.trim() || null,
  };
}
export function validateReview(p, rooms) {
  if (!Number.isInteger(p.branchId) || !p.content?.trim() || p.content.trim().length > 2000)
    throw Error('Đánh giá cần nội dung từ 1 đến 2000 ký tự.');
  if (p.roomId != null && !rooms.some((r) => r.branchId === p.branchId && r.roomId === p.roomId))
    throw Error('Phòng không thuộc chi nhánh.');
  return {
    branchId: p.branchId,
    roomId: p.roomId ?? null,
    content: p.content.trim(),
  };
}

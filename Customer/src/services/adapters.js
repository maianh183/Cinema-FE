// Explicit Shared draft-1.0 boundary. UI aliases stay local; OPEN fields are not inferred.
import { periodStatus, validRating } from '../lib/business.js';

export const pick = (value, fields) =>
  Object.fromEntries(
    fields
      .split(' ')
      .filter((key) => Object.hasOwn(value, key))
      .map((key) => [key, value[key]]),
  );
const object = (value) => value && typeof value === 'object' && !Array.isArray(value);
const invalid = (message) => {
  throw new Error(message);
};
export function numericId(value, name = 'ID') {
  if (!Number.isSafeInteger(value) || value <= 0)
    invalid(`${name} phải là số nguyên dương, không phải chuỗi hoặc ID khách hàng.`);
  return value;
}
export function routeId(value, name = 'ID') {
  return numericId(
    typeof value === 'string' && /^[1-9]\d*$/.test(value) ? Number(value) : value,
    name,
  );
}
const stringId = (value, name) => {
  if (typeof value !== 'string' || !value.trim())
    invalid(`${name} phải là chuỗi định danh hợp lệ.`);
  return value;
};

export function responseData(envelope, { list = false } = {}) {
  if (list && Array.isArray(envelope)) return envelope; // Documented legacy full list.
  if (!object(envelope) || envelope.success !== true || !Object.hasOwn(envelope, 'data')) {
    throw Object.assign(new Error(envelope?.message || 'Phản hồi máy chủ không hợp lệ.'), {
      errors: envelope?.errors,
    });
  }
  if (!list) return envelope.data;
  const nested = object(envelope.data) && Array.isArray(envelope.data.items);
  const rows = nested ? envelope.data.items : envelope.data;
  if (!Array.isArray(rows)) invalid('API danh sách phải trả toàn bộ mảng; xem API_CONTRACT.md.');
  const metadata = [envelope.meta, ...(nested ? [envelope.data] : [])].filter(
    (meta) => meta != null,
  );
  for (const meta of metadata) {
    if (
      !object(meta) ||
      !Number.isSafeInteger(meta.total) ||
      meta.total !== rows.length ||
      (meta.page != null && meta.page !== 1)
    ) {
      invalid(
        'Danh sách phân trang chưa đầy đủ. Cần đồng bộ PHP, service và UI trước khi dùng server pagination.',
      );
    }
  }
  return rows;
}

function alias(value, names, previous, fallback = '') {
  for (const name of names) if (Object.hasOwn(value, name)) return value[name];
  return previous ?? fallback;
}
export function customerFromResponse(response, previous = null) {
  const user = object(response?.user) ? response.user : response;
  if (!object(user)) invalid('Máy chủ chưa trả hồ sơ khách hàng hợp lệ.');
  if (
    !Object.keys(
      pick(
        user,
        'cUserId id userId cName name fullName phoneNumber phone sex gender birthday dob avatarUrl',
      ),
    ).length
  )
    invalid('Response chưa xác nhận hồ sơ đã lưu.');
  const ids = [user.cUserId, user.id, user.userId].filter((id) => id != null);
  if (ids.some((id) => id !== ids[0])) invalid('Các alias định danh khách hàng không khớp.');
  const userId = stringId(ids[0] ?? previous?.userId, 'cUserId');
  if (previous && previous.userId !== userId)
    invalid('Máy chủ trả hồ sơ khác khách hàng của phiên.');
  const role = (user.role ?? previous?.role)?.replace?.(/^ROLE_/, '');
  if (role !== 'CUSTOMER')
    invalid('Vui lòng dùng tài khoản khách hàng; response phải xác nhận role CUSTOMER.');
  // No accessToken, salary, employee identifiers, permissions or internal branch scope.
  return {
    userId,
    fullName: alias(user, ['cName', 'name', 'fullName'], previous?.fullName),
    email: alias(user, ['email'], previous?.email),
    role,
    phone: alias(user, ['phoneNumber', 'phone'], previous?.phone),
    gender: alias(user, ['sex', 'gender'], previous?.gender),
    dob: alias(user, ['birthday', 'dob'], previous?.dob),
    avatarUrl: alias(user, ['avatarUrl'], previous?.avatarUrl),
    csrfToken: response.csrfToken ?? user.csrfToken ?? previous?.csrfToken ?? null,
  };
}
export function profileRequest(values, { mock = false, previous = null } = {}) {
  const body = {
    cName: values.fullName?.trim(),
    phoneNumber: values.phone,
    sex: values.gender,
  };
  if (Object.hasOwn(values, 'dob')) {
    if (mock)
      body.birthday = values.dob; // Demo-only capability, not PHP confirmation (O-03).
    else if ((values.dob || '') !== (previous?.dob || '')) {
      invalid(
        'Ngày sinh chưa được PHP xác nhận hỗ trợ (O-03). Dữ liệu biểu mẫu chưa được lưu; không gửi trường birthday/dob chưa thống nhất.',
      );
    }
  }
  return body;
}

const fields = {
  movie:
    'movieId mName slug descript runTime releaseDate closingDate ageRating posterUrl trailerUrl genres actors formats isDub isSub',
  branch: 'branchId bName bAddress phoneNumbers totalRooms',
  room: 'branchId roomId rType rCapacity basePrice totalSeats',
  showtime:
    'timeId movieId movieName branchId branchName roomId rType rPrice formatName day startTime endDate endTime status',
  seat: 'branchId roomId sRow sColumn sType sPrice sStatus isBooked holdStatus rowName number',
  product:
    'productId itemType pName pType merchName price quantity availNum imgUrl startDate endDate description',
  coupon: 'couponId startDate endDate saleOff releaseNum availNum minOrderTotal maxDiscount',
  comment:
    'commentId movieId movieTitle userId authorName avatarUrl rating content createdAt contentStatus',
  review: 'reviewId branchId branchName roomId userId authorName content createdAt contentStatus',
  faq: 'id question answer sortOrder status',
  news: 'id title slug seoTitle metaDescription tags content category imageUrl status createdAt',
};
const ids = {
  movie: ['movieId'],
  branch: ['branchId'],
  room: ['branchId', 'roomId'],
  showtime: ['timeId', 'movieId', 'branchId', 'roomId'],
  seat: ['branchId', 'roomId', 'sRow', 'sColumn'],
  product: ['productId'],
  coupon: ['couponId'],
  comment: ['commentId', 'movieId'],
  review: ['reviewId', 'branchId'],
  faq: ['id'],
  news: ['id'],
};
export function publicDto(type, data, scope = {}) {
  if (!object(data)) invalid(`DTO ${type} không hợp lệ.`);
  for (const key of ids[type]) numericId(data[key], key);
  for (const [key, expected] of Object.entries(scope)) {
    if (data[key] !== expected) invalid(`DTO ${type} không khớp ${key} đã yêu cầu.`);
  }
  if (type === 'review' && data.roomId != null) numericId(data.roomId, 'roomId');
  if (type === 'comment' && !validRating(data.rating)) invalid('Điểm phim phải là số nguyên 1–5.');
  if (type === 'product' && !['FOOD_DRINK', 'MERCHANDISE'].includes(data.itemType))
    invalid('Sản phẩm thiếu itemType hợp lệ.');
  if (type === 'showtime' && (!Number.isFinite(data.rPrice) || data.rPrice < 0))
    invalid('Chưa có giá hiển thị rPrice hợp lệ; cần PHP chốt O-05.');
  if (
    type === 'seat' &&
    (typeof data.isBooked !== 'boolean' ||
      typeof data.sStatus !== 'boolean' ||
      !['FREE', 'OWN', 'OTHER'].includes(data.holdStatus) ||
      !Number.isFinite(data.sPrice))
  )
    invalid('Máy chủ chưa trả trạng thái ghế đầy đủ theo suất chiếu.');
  if (type === 'news' && data.tags != null && typeof data.tags !== 'string')
    invalid('News.tags phải là chuỗi theo hợp đồng chung.');
  if (type === 'coupon' && (Object.hasOwn(data, 'isActive') || Object.hasOwn(data, 'releaseDate')))
    invalid('Voucher legacy cần migration O-08; không tự suy diễn isActive/releaseDate.');
  const result = pick(data, fields[type]);
  if (type === 'movie') {
    const catalogNames = {
      genres: ['genre', 'genreName', 'name'],
      actors: ['fullName', 'actorName', 'name'],
      formats: ['formatName', 'format', 'name'],
    };
    for (const [key, names] of Object.entries(catalogNames)) {
      if (Array.isArray(result[key]))
        result[key] = result[key].map((entry) => {
          // The existing UI accepts display strings; never pass an arbitrary object to React.
          const name =
            typeof entry === 'string'
              ? entry
              : object(entry)
                ? names.map((field) => entry[field]).find((value) => typeof value === 'string')
                : null;
          if (typeof name !== 'string') invalid(`Catalog phim ${key} thiếu tên hiển thị hợp lệ.`);
          return name;
        });
    }
  }
  return result;
}
export function publicCoupons(rows, now = Date.now()) {
  return rows
    .map((row) => publicDto('coupon', row))
    .filter(
      (coupon) =>
        periodStatus(coupon, now) === 'ACTIVE' &&
        Number.isInteger(coupon.availNum) &&
        coupon.availNum > 0 &&
        Number.isInteger(coupon.releaseNum) &&
        coupon.availNum <= coupon.releaseNum,
    );
}
export function reportRequest(values) {
  if (!['MOVIE_COMMENT', 'CINEMA_REVIEW'].includes(values.targetType))
    invalid('Loại nội dung báo cáo không hợp lệ.');
  numericId(values.targetId, 'targetId');
  if (
    typeof values.reason !== 'string' ||
    !values.reason.trim() ||
    values.reason.trim().length > 1000
  )
    invalid('Lý do báo cáo cần từ 1 đến 1000 ký tự.');
  return {
    targetType: values.targetType,
    targetId: values.targetId,
    reason: values.reason.trim(),
  };
}
export function reportResponse(row, expected) {
  numericId(row?.reportId ?? row?.id, 'reportId');
  if (
    row.status !== 'PENDING' ||
    (row.targetId != null && row.targetId !== expected.targetId) ||
    (row.targetType != null && row.targetType !== expected.targetType)
  )
    invalid('Máy chủ chưa xác nhận đúng báo cáo PENDING.');
  return {
    ...pick(row, 'targetType targetId reason reportedAt status resolutionAction'),
    reportId: row.reportId ?? row.id,
  };
}
export function orderRequest(values) {
  stringId(values.reservationId, 'reservationId');
  stringId(values.idempotencyKey, 'idempotencyKey');
  if (!Array.isArray(values.addons)) invalid('Danh sách sản phẩm trong đơn không hợp lệ.');
  const addons = values.addons.map((item) => {
    numericId(item.productId, 'productId');
    numericId(item.quantity, 'quantity');
    if (!['FOOD_DRINK', 'MERCHANDISE'].includes(item.itemType))
      invalid('Sản phẩm thiếu itemType hợp lệ.');
    return pick(item, 'itemType productId quantity');
  });
  return {
    reservationId: values.reservationId,
    addons,
    ...(values.couponId != null ? { couponId: numericId(values.couponId, 'couponId') } : {}),
    idempotencyKey: values.idempotencyKey,
  };
}
export function orderResponse(row, expectedId, { source } = {}) {
  numericId(row?.orderId, 'orderId');
  if (expectedId != null && row.orderId !== expectedId) invalid('Máy chủ trả sai mã đơn hàng.');
  if (
    typeof row.orderStatus !== 'string' ||
    !row.orderStatus ||
    !Number.isFinite(row.total) ||
    row.total < 0
  )
    invalid('Máy chủ chưa xác nhận trạng thái và tổng tiền đơn hàng.');
  if (row.source != null && !['STAFF', 'CUSTOMER'].includes(row.source))
    invalid('Nguồn đơn hàng không hợp lệ.');
  if (source && row.source !== source)
    invalid('Máy chủ chưa xác nhận nguồn CUSTOMER cho đơn vừa tạo.');
  if (row.orderStatus === 'PENDING' && row.source !== 'STAFF')
    invalid('PENDING chỉ dành cho đơn STAFF tại quầy; enum đơn online còn OPEN (O-01).');
  const order = pick(
    row,
    'orderId source branchId orderStatus orderTime total originalTotal discountAmount expiresAt paymentMethod ticketDetails addonDetails',
  );
  if (row.branchId != null) numericId(row.branchId, 'branchId');
  if (row.ticketDetails != null) {
    if (!Array.isArray(row.ticketDetails)) invalid('Snapshot vé không hợp lệ.');
    order.ticketDetails = row.ticketDetails.map((ticket) => {
      numericId(ticket.showtimeId, 'ticket.showtimeId (FK timeId)');
      if (ticket.timeId != null && ticket.timeId !== ticket.showtimeId)
        invalid('Snapshot showtimeId/timeId không khớp.');
      return pick(
        ticket,
        'ticketId showtimeId movieId movieName branchId branchName roomId sRow sColumn seatName showtime price',
      );
    });
  }
  if (row.addonDetails != null) {
    if (!Array.isArray(row.addonDetails)) invalid('Snapshot sản phẩm không hợp lệ.');
    order.addonDetails = row.addonDetails.map((item) => {
      numericId(item.productId, 'productId');
      if (!['FOOD_DRINK', 'MERCHANDISE'].includes(item.itemType))
        invalid('Snapshot sản phẩm thiếu itemType.');
      return pick(item, 'productId itemType pName merchName quantity price');
    });
  }
  // Preserve unknown/legacy statuses verbatim. Never derive PAID or source from a payment.
  return order;
}
export function paymentResponse(row, { mock = false } = {}) {
  if (mock && row?.demo === true) return pick(row, 'demo orderId message');
  let url;
  try {
    url = new URL(row?.paymentUrl);
  } catch {
    invalid('Máy chủ chưa trả liên kết thanh toán hợp lệ.');
  }
  if (url.protocol !== 'https:' || url.username || url.password)
    invalid('Máy chủ chưa trả liên kết thanh toán HTTPS hợp lệ.');
  return { paymentUrl: url.href };
}
export function reservationResponse(row, expected = {}) {
  if (!object(row)) invalid('Máy chủ chưa xác nhận giữ ghế.');
  stringId(row.reservationId, 'reservationId');
  for (const key of ['timeId', 'branchId', 'roomId']) numericId(row[key], key);
  for (const [key, value] of Object.entries(expected))
    if (row[key] !== value) invalid('Máy chủ trả sai lượt giữ ghế/suất chiếu.');
  if (
    !Array.isArray(row.seats) ||
    !row.seats.length ||
    !Number.isFinite(Date.parse(row.expiresAt)) ||
    !/(?:Z|[+-]\d{2}:\d{2})$/.test(row.expiresAt)
  )
    invalid('Giữ ghế thiếu ghế hoặc thời hạn có múi giờ.');
  return {
    ...pick(row, 'reservationId timeId branchId roomId expiresAt'),
    seats: row.seats.map((seat) => ({
      sRow: numericId(seat.sRow, 'sRow'),
      sColumn: numericId(seat.sColumn, 'sColumn'),
    })),
  };
}
export function paymentHistory(row) {
  numericId(row?.paymentId, 'paymentId');
  numericId(row.orderId, 'orderId');
  if (!Number.isFinite(row.amount) || row.amount < 0 || typeof row.paymentStatus !== 'string')
    invalid('Lịch sử thanh toán không hợp lệ.');
  return pick(
    row,
    'paymentId orderId amount paymentMethod paymentStatus paymentTime transactionId',
  );
}

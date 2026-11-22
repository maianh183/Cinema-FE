import { editorialApi } from './siteContent';
import { customerAccountApi } from './customerAccounts';
import { orderDraft } from './orderDraft';
import { orderBlocksSeat } from '../utils/apiContract';
import { statistics } from './statistics';
import { datedSchedules } from './datedSchedules';
import { workSchedules } from './workSchedules';
import { contentReports } from './contentReports';
import { inBranchScope, inHomeBranch } from '../utils/schedule';
import {
  canCancelOrder,
  canConfirmOrder,
  normalizeOrderStatus,
  nextCouponAvailable,
  businessTime,
  canManageEmployee,
  showtimesOverlap,
} from '../utils/business';
import { AxiosError } from 'axios';
import { makeData, mockPermissions } from './data.js';
import { can, modules } from '../utils/permissions.js';
let db = makeData();
let session = null;
let passwords = new Map(db.employees.map((e) => [e.email, 'Demo@12345']));
export function resetMock() {
  db = makeData();
  session = null;
  passwords = new Map(db.employees.map((e) => [e.email, 'Demo@12345']));
}
const clone = (value) => JSON.parse(JSON.stringify(value));
const idKeys = {
  movies: 'movieId',
  branches: 'branchId',
  customers: 'cUserId',
  employees: 'eUserId',
  showtimes: 'timeId',
  orders: 'orderId',
  coupons: 'couponId',
  'food-drinks': 'productId',
  merchandise: 'productId',
};
const scopeKeys = new Set([
  'branches',
  'rooms',
  'seats',
  'employees',
  'showtimes',
  'orders',
  'work-shifts',
]);
export async function mockAdapter(config) {
  await new Promise((resolve) => setTimeout(resolve, 60));
  const parsed = new URL(config.url, 'http://mock.test');
  const path = decodeURIComponent(parsed.pathname).replace(/^\/|\/$/g, '');
  const parts = path.split('/');
  let resource = parts[0],
    id = parts[1];
  const method = config.method.toUpperCase();
  const params = { ...Object.fromEntries(parsed.searchParams), ...config.params };
  let body =
    config.data instanceof FormData
      ? config.data
      : typeof config.data === 'string'
        ? JSON.parse(config.data || '{}')
        : config.data || {};
  function ok(data, status = 200, meta) {
    return {
      data: { success: true, data: clone(data), ...(meta ? { meta } : {}) },
      status,
      statusText: 'OK',
      headers: {},
      config,
    };
  }
  function fail(status, message, errors) {
    throw new AxiosError(message, 'ERR_BAD_RESPONSE', config, null, {
      status,
      data: { success: false, message, ...(errors ? { errors } : {}) },
      config,
      headers: {},
      statusText: 'Error',
    });
  }
  const visible = (key, rows) =>
    rows.filter(
      (row) =>
        !scopeKeys.has(key) ||
        session?.role === 'ADMIN' ||
        (key === 'orders'
          ? inHomeBranch(session, row.branchId)
          : inBranchScope(session, row.branchId)),
    );
  if (path === 'auth/csrf' && method === 'GET') return ok({ csrfToken: 'mock-csrf' });
  if (path === 'auth/login') {
    const employee = db.employees.find((e) => e.email === body.email && e.isActive);
    if (!employee || body.password !== passwords.get(employee.email))
      fail(401, 'Email hoặc mật khẩu không đúng.');
    session = {
      id: employee.eUserId,
      name: employee.eName,
      email: employee.email,
      role: employee.userType,
      branchId: employee.branchId,
      branchIds: employee.branchIds,
      avatar: employee.avatarUrl,
      permissions: employee.permissions || mockPermissions[employee.userType],
    };
    return ok({ user: { ...session, csrfToken: 'mock-csrf' }, csrfToken: 'mock-csrf' });
  }
  const editorialResult = editorialApi({
    db,
    session,
    resource,
    id,
    parts,
    method,
    params,
    body,
    ok,
    fail,
  });
  if (editorialResult) return editorialResult;
  if (!session) fail(401, 'Phiên đăng nhập đã hết hạn.');
  const accountResult = customerAccountApi({
    db,
    session,
    resource,
    id,
    parts,
    method,
    body,
    ok,
    fail,
  });
  if (accountResult) return accountResult;
  if (
    resource === 'customers' &&
    id &&
    !['GET', 'DELETE'].includes(method) &&
    !(method === 'PATCH' && parts.length === 3 && ['activate', 'deactivate'].includes(parts[2]))
  )
    fail(403, 'Chỉ khách hàng được thay đổi thông tin cá nhân của mình.');
  if (path === 'auth/me') return ok({ ...session, csrfToken: 'mock-csrf' });
  if (path === 'auth/logout') {
    session = null;
    return ok(null);
  }
  if (path === 'auth/profile') {
    session = {
      ...session,
      ...Object.fromEntries(
        Object.entries(body).filter(([key]) =>
          ['name', 'avatarUrl', 'phoneNumber', 'birthday'].includes(key),
        ),
      ),
    };
    if ('avatarUrl' in body) session.avatar = body.avatarUrl;
    return ok(session);
  }
  if (path === 'auth/change-password') {
    if (body.oldPassword !== passwords.get(session.email))
      fail(422, 'Mật khẩu hiện tại không đúng.');
    if (!body.newPassword || body.newPassword.length < 10)
      fail(422, 'Mật khẩu mới cần ít nhất 10 ký tự.');
    passwords.set(session.email, body.newPassword);
    return ok(null);
  }
  const context = { db, session, resource, id, parts, method, params, body, ok, fail };
  const datedResult = datedSchedules(context);
  if (datedResult) return datedResult;
  const scheduleResult = workSchedules(context);
  if (scheduleResult) return scheduleResult;
  const contentResult = contentReports(context);
  if (contentResult) return contentResult;
  if (path === 'permissions') {
    if (!can(session, 'employees', 'assign-role')) fail(403, 'Không có quyền cấp quyền nhân viên.');
    return ok(
      modules
        .filter(
          ([module]) =>
            session.role === 'ADMIN' || !['contacts', 'website-content'].includes(module),
        )
        .map(([module, path, label]) => [
          module === 'my-schedule' ? 'workshifts' : module,
          path,
          label,
        ])
        .flatMap(([module, , label]) =>
          (module === 'website-content'
            ? ['read', 'update']
            : module === 'contacts'
              ? ['read', 'update', 'delete']
              : module === 'cinema-reviews'
                ? ['read']
                : module === 'customers'
                  ? [
                      'read',
                      'update',
                      'delete',
                      ...(session.role === 'ADMIN' ? ['edit-profile', 'reset-password'] : []),
                    ]
                  : [
                      'read',
                      'create',
                      'update',
                      'delete',
                      ...(module === 'employees'
                        ? ['assign-role']
                        : module === 'orders'
                          ? ['confirm-payment', 'cancel']
                          : module === 'workshifts'
                            ? ['read-own']
                            : []),
                    ]
          ).map((action) => ({
            key: module + ':' + action,
            label:
              label +
              ' · ' +
              (module === 'customers' && action === 'update' ? 'Khóa/mở khóa tài khoản' : action),
          })),
        ),
    );
  }
  let module =
    {
      'food-drinks': 'products',
      merchandise: 'products',
      'work-shifts': 'workshifts',
      statistics: 'reports',
      system: 'settings',
      files: 'media',
      seats: 'rooms',
      catalog: 'movies',
      categories: 'news',
    }[resource] || resource;
  let action =
    method === 'GET'
      ? 'read'
      : method === 'DELETE'
        ? 'delete'
        : method === 'POST'
          ? 'create'
          : 'update';
  if (resource === 'categories')
    module = (params.type || body.type) === 'PRODUCT' ? 'products' : 'news';
  if (path === 'statistics/overview') module = 'dashboard';
  if (path.endsWith('/confirm-payment')) action = 'confirm-payment';
  if (resource === 'orders' && parts[2] === 'cancel') action = 'cancel';
  if (resource === 'comment-reports' && parts[2] === 'resolve')
    action = body.action === 'DELETE' ? 'delete' : 'update';
  if (resource === 'seats' && method === 'POST') action = 'update';
  if (resource === 'employees' && path.includes('work-shifts')) {
    module = 'workshifts';
    action = method === 'DELETE' ? 'delete' : 'update';
  }
  const lookup =
    method === 'GET' &&
    [
      'branches',
      'movies',
      'showtimes',
      'rooms',
      'seats',
      'food-drinks',
      'merchandise',
      'catalog',
      'categories',
      'employees',
      'customers',
    ].includes(resource) &&
    ['orders', 'showtimes', 'rooms', 'workshifts', 'movies', 'products', 'cinema-reviews'].some(
      (m) => can(session, m, 'read'),
    );
  if (resource === 'employees' && session.role === 'STAFF')
    fail(403, 'Không có quyền xem danh sách nhân sự.');
  if (!can(session, module, action) && !lookup)
    fail(403, 'Bạn không có quyền thực hiện thao tác này.');
  if (resource === 'statistics') return statistics(db, session, params, id, path, ok);
  if (path === 'system/settings') {
    if (method !== 'GET') db.settings = { ...db.settings, ...body };
    return ok(db.settings);
  }
  if (resource === 'files') {
    const file = body.get?.('file');
    if (!file) fail(422, 'Chưa chọn file.');
    const url = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
    const item = {
      id: Date.now(),
      name: file.name,
      url,
      mimeType: file.type,
      size: file.size,
      createdAt: new Date().toISOString(),
    };
    db.media.unshift(item);
    return ok(item, 201);
  }
  if (resource === 'catalog') {
    resource = parts.slice(0, 2).join('/');
    id = parts[2];
    body = { ...body, ...params };
  }
  if (resource === 'seats') {
    const branchId = Number(parts[2]),
      roomId = Number(parts[4]);
    if (!inBranchScope(session, branchId)) fail(403, 'Ngoài phạm vi chi nhánh.');
    if (method === 'POST') {
      db.seats = db.seats
        .filter((s) => !(s.branchId === branchId && s.roomId === roomId))
        .concat(body);
      return ok(body);
    }
    if (
      params.showtimeId &&
      !db.showtimes.some(
        (s) =>
          s.timeId === Number(params.showtimeId) && s.branchId === branchId && s.roomId === roomId,
      )
    )
      fail(422, 'Suất chiếu không thuộc phòng này.');
    return ok(
      db.seats
        .filter((s) => s.branchId === branchId && s.roomId === roomId)
        .map((s) => ({
          ...s,
          isBooked: params.showtimeId
            ? db.orders.some(
                (o) =>
                  orderBlocksSeat(o) &&
                  o.ticketDetails.some(
                    (t) =>
                      t.showtimeId === Number(params.showtimeId) &&
                      t.sRow === s.sRow &&
                      t.sColumn === s.sColumn,
                  ),
              )
            : false,
        })),
    );
  }
  let rows = db[resource];
  if (!Array.isArray(rows)) fail(501, 'Mock chưa hỗ trợ endpoint: ' + path);
  const key =
    idKeys[resource] ||
    { 'catalog/genres': 'genre', 'catalog/formats': 'fName', 'catalog/actors': 'fullName' }[
      resource
    ] ||
    'id';
  if (id === 'branch') {
    params.branchId = parts[2];
    id = null;
  }
  if (resource === 'customers' && id === 'phone') {
    const found = rows.find((r) => r.phoneNumber === params.phone);
    if (!found) fail(404, 'Không tìm thấy khách hàng.');
    return ok(found);
  }
  if (resource === 'work-shifts' && id === 'detail') id = null;
  const matches = (r) =>
    resource === 'rooms' && id
      ? Number(r.branchId) === Number(id) && Number(r.roomId) === Number(parts[2])
      : resource === 'work-shifts' && params.startTime
        ? r.startTime === params.startTime &&
          r.endTime === params.endTime &&
          r.wDate === Number(params.wDate)
        : String(r[key]) === String(id);
  if (
    resource === 'orders' &&
    ['confirm-payment', 'cancel'].includes(parts[2]) &&
    method !== 'POST'
  )
    fail(405, 'Phương thức không hợp lệ.');
  if (method === 'GET') {
    let list = visible(resource, rows);
    if (resource === 'showtimes')
      list = list.map((s) => ({
        ...s,
        movieName: db.movies.find((m) => m.movieId === s.movieId)?.mName,
        branchName: db.branches.find((b) => b.branchId === s.branchId)?.bName,
      }));
    if (id) {
      const found = list.find(matches);
      if (!found) fail(404, 'Không tìm thấy dữ liệu.');
      return ok(found);
    }
    if (params.branchId) list = list.filter((r) => Number(r.branchId) === Number(params.branchId));
    if (params.q)
      list = list.filter((r) =>
        JSON.stringify(r)
          .toLocaleLowerCase('vi')
          .includes(String(params.q).toLocaleLowerCase('vi')),
      );
    for (const field of ['status', 'type', 'targetType', 'targetId', 'category'])
      if (params[field]) list = list.filter((r) => String(r[field]) === String(params[field]));
    if (resource === 'faq') list.sort((a, b) => a.sortOrder - b.sortOrder);
    const total = list.length;
    if (params.page) {
      const size = Number(params.pageSize) || 10;
      list = list.slice((Number(params.page) - 1) * size, Number(params.page) * size);
      return ok(list, 200, { total, page: Number(params.page), pageSize: size });
    }
    return ok(list);
  }
  if (resource === 'employees') {
    const employee = id ? visible('employees', db.employees).find(matches) : null;
    if (
      method !== 'GET' &&
      !canManageEmployee(
        session,
        employee,
        method === 'DELETE' ? 'delete' : id ? 'update' : 'create',
      )
    )
      fail(403, 'Chỉ được quản lý nhân viên trong phạm vi được cấp quyền.');
    if (session.role !== 'ADMIN' && body.userType && body.userType !== 'STAFF')
      fail(403, 'Chỉ được gán vai trò STAFF trong phạm vi chi nhánh.');
    if (
      (body.permissions ||
        (body.userType &&
          (employee ? body.userType !== employee.userType : body.userType !== 'STAFF'))) &&
      !can(session, 'employees', 'assign-role')
    )
      fail(403, 'Không có quyền cấp vai trò hoặc quyền hạn.');
  }
  if (
    resource === 'showtimes' &&
    ['POST', 'PUT'].includes(method) &&
    db.showtimes.some((row) => String(row.timeId) !== String(id) && showtimesOverlap(row, body))
  )
    fail(409, 'Suất chiếu bị trùng lịch trong phòng.');
  if (scopeKeys.has(resource) && body.branchId && !inBranchScope(session, body.branchId))
    fail(403, 'Ngoài phạm vi chi nhánh.');
  if (resource === 'coupons' && ['POST', 'PUT', 'PATCH'].includes(method)) {
    if ('releaseDate' in body || 'isActive' in body)
      fail(422, 'Ngày phát hành và kích hoạt thủ công không còn được hỗ trợ.');
    if (
      !Number.isFinite(businessTime(body.startDate)) ||
      !Number.isFinite(businessTime(body.endDate, true)) ||
      businessTime(body.startDate) > businessTime(body.endDate, true)
    )
      fail(422, 'Khoảng thời gian hiệu lực không hợp lệ.');
  }
  if (method === 'POST' && !id) {
    if (resource === 'coupons') {
      try {
        body = { ...body, availNum: nextCouponAvailable(null, body.releaseNum) };
      } catch (e) {
        fail(422, e.message);
      }
    }
    if (resource === 'employees') {
      passwords.set(body.email, body.ePassword);
      const { ePassword, ...publicData } = body;
      body = publicData;
    }
    if (resource === 'movies')
      body = {
        ...body,
        genres: body.genreIds || [],
        formats: body.formatIds || [],
        actors: body.actorIds || [],
      };
    if (resource === 'showtimes')
      body = {
        ...body,
        movieName: db.movies.find((m) => m.movieId === body.movieId)?.mName,
        branchName: db.branches.find((b) => b.branchId === body.branchId)?.bName,
        rType: '2D',
        rPrice: 80000,
        status: 'SCHEDULED',
      };
    if (resource === 'orders') body = orderDraft(db, session, body, fail);
    const prefix = resource === 'employees' ? 'NV' : resource === 'customers' ? 'KH' : null;
    const nextId = prefix
      ? prefix +
        String(
          Math.max(0, ...rows.map((r) => Number(String(r[key]).replace(/^\D+/, '')) || 0)) + 1,
        ).padStart(3, '0')
      : Math.max(0, ...rows.map((r) => Number(r[key]) || 0)) + 1;
    const recordId = body[key] || nextId;
    if (rows.some((r) => String(r[key]) === String(recordId))) fail(409, 'Mã bản ghi đã tồn tại.');
    const item = {
      ...(resource === 'coupons' ? {} : { isActive: true }),
      createdAt: new Date().toISOString(),
      ...body,
      [key]: recordId,
    };
    if (resource === 'work-shifts') {
      item.branchId = body.branchId || session.branchId;
      item.employees = [];
    }
    rows.unshift(item);
    return ok(item, 201);
  }
  const target = visible(resource, rows).find(matches);
  if (!target) fail(404, 'Không tìm thấy dữ liệu trong phạm vi được cấp quyền.');
  if (resource === 'orders' && parts[2] === 'cancel') {
    if (method !== 'POST') fail(405, 'Phương thức không hợp lệ.');
    if (normalizeOrderStatus(target.orderStatus) !== 'PENDING')
      fail(409, 'Chỉ được hủy đơn đang chờ thanh toán.');
    if (!canCancelOrder(session, target)) fail(403, 'Không có quyền hủy đơn này.');
    Object.assign(target, {
      orderStatus: 'CANCELLED',
      cancelledBy: session.id,
      cancelledAt: new Date().toISOString(),
    });
    return ok(target);
  }
  if (resource === 'orders' && parts[2] === 'confirm-payment') {
    if (normalizeOrderStatus(target.orderStatus) !== 'PENDING')
      fail(409, 'Đơn đã được xử lý hoặc không còn chờ thanh toán.');
    if (!canConfirmOrder(session, target)) fail(403, 'Đơn hàng không đủ điều kiện xác nhận.');
    Object.assign(target, {
      orderStatus: 'PAID',
      confirmedBy: session.id,
      paidAt: new Date().toISOString(),
    });
    return ok(target);
  }
  if (resource === 'orders' && 'orderStatus' in body)
    fail(422, 'Sử dụng quy trình xác nhận thanh toán riêng.');
  if (resource === 'coupons' && method !== 'DELETE') {
    try {
      body = { ...body, availNum: nextCouponAvailable(target, body.releaseNum) };
    } catch (e) {
      fail(422, e.message);
    }
  }
  if (method === 'DELETE') {
    if (
      resource === 'employees' &&
      (db['work-schedules'].some((s) => s.employeeId === target.eUserId) ||
        db.orders.some((o) => o.createdByEmployeeId === target.eUserId))
    )
      fail(409, 'Nhân viên đang có lịch hoặc lịch sử giao dịch; hãy khóa tài khoản nếu cần.');
    if (
      resource === 'movies' &&
      (db.showtimes.some((s) => s.movieId === target.movieId) ||
        db['movie-comments'].some((c) => c.movieId === target.movieId))
    )
      fail(409, 'Phim đang được lịch chiếu hoặc bình luận tham chiếu.');
    if (
      resource === 'branches' &&
      (db.employees.some((e) => e.branchId === target.branchId) ||
        db.rooms.some((r) => r.branchId === target.branchId))
    )
      fail(409, 'Chi nhánh còn nhân sự/phòng chiếu.');
    if (
      resource === 'rooms' &&
      db.showtimes.some((s) => s.branchId === target.branchId && s.roomId === target.roomId)
    )
      fail(409, 'Phòng đang có lịch chiếu.');
    if (
      resource === 'showtimes' &&
      db.orders.some((o) => o.ticketDetails.some((t) => t.showtimeId === target.timeId))
    )
      fail(409, 'Suất chiếu đã có đơn hàng.');
    if (
      resource === 'customers' &&
      (db.orders.some((o) => o.customer?.cUserId === target.cUserId) ||
        db['movie-comments'].some((c) => c.userId === target.cUserId) ||
        db['cinema-reviews'].some((r) => r.userId === target.cUserId))
    )
      fail(409, 'Khách hàng có dữ liệu liên quan; cần quy trình ẩn danh phía máy chủ.');
    if (
      ['food-drinks', 'merchandise'].includes(resource) &&
      db.orders.some((o) => o.addonDetails.some((a) => a.productId === target.productId))
    )
      fail(409, 'Sản phẩm đã có lịch sử đơn hàng.');
    if (resource === 'rooms')
      db.seats = db.seats.filter(
        (s) => s.branchId !== target.branchId || s.roomId !== target.roomId,
      );
    if (
      resource === 'media' &&
      ['movies', 'food-drinks', 'merchandise', 'news', 'site-content'].some((key) =>
        JSON.stringify(db[key]).includes(target.url),
      )
    )
      fail(409, 'Ảnh đang được nội dung sử dụng, hãy gỡ liên kết trước.');
    db[resource] = rows.filter((r) => r !== target);
    return ok(null);
  }
  if (resource === 'employees' && body.email && body.email !== target.email) {
    passwords.set(body.email, passwords.get(target.email));
    passwords.delete(target.email);
  }
  if (parts[2] === 'activate' || parts[2] === 'deactivate')
    body = { isActive: parts[2] === 'activate' };
  if (resource === 'movies')
    body = {
      ...body,
      genres: body.genreIds || target.genres,
      formats: body.formatIds || target.formats,
      actors: body.actorIds || target.actors,
    };
  Object.assign(target, body);
  return ok(target);
}

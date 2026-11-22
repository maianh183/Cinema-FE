import { can } from '../utils/permissions';
import { validateCustomerProfile, customerProfileDto } from '../utils/customerAccount';

// Development simulation only. No mail, credentials or second recovery-token system.
const states = new WeakMap();
export function customerAccountApi({ db, session, resource, id, parts, method, body, ok, fail }) {
  if (
    resource !== 'customers' ||
    parts.length !== 3 ||
    !['profile', 'password-reset'].includes(parts[2])
  )
    return;
  if (!session) fail(401, 'Phiên đăng nhập đã hết hạn.');
  const action = parts[2] === 'profile' ? 'edit-profile' : 'reset-password';
  if (!can(session, 'customers', action)) fail(403, 'Không có quyền quản lý tài khoản khách hàng.');
  if (method !== (action === 'edit-profile' ? 'PATCH' : 'POST'))
    fail(405, 'Phương thức không hợp lệ.');
  const customer = db.customers.find((row) => row.cUserId === id);
  if (!customer) fail(404, 'Không tìm thấy khách hàng.');
  if (!states.has(db)) states.set(db, { requests: new Map(), audit: [] });
  const state = states.get(db);
  if (action === 'edit-profile') {
    let profile;
    try {
      profile = validateCustomerProfile(body);
    } catch (error) {
      fail(422, error.message, error.errors);
    }
    Object.assign(customer, profile, { updatedAt: new Date().toISOString() });
    state.audit.push({ actor: session.id, customerId: id, action, at: Date.now() });
    return ok(customerProfileDto(customer, id));
  }
  if (!body || typeof body !== 'object' || Array.isArray(body) || Object.keys(body).length)
    fail(422, 'Body phải rỗng.');
  if (Date.now() - (state.requests.get(id) ?? -Infinity) < 60000)
    fail(429, 'Vui lòng chờ trước khi gửi lại.');
  state.requests.set(id, Date.now());
  if (!customer.isActive || customer.emailVerified !== true)
    fail(409, 'Tài khoản bị khóa hoặc email chưa được xác minh.');
  state.audit.push({ actor: session.id, customerId: id, action, at: Date.now() });
  return ok({ requested: true, simulated: true });
}

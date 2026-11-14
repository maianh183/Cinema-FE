export const roles = ['ADMIN', 'MANAGER', 'STAFF'];
export function normalizeUser(user) {
  if (!user) return null;
  const role = String(user.role || user.userType || '')
    .toUpperCase()
    .replace(/^ROLE_/, '');
  if (!roles.includes(role)) throw new Error('Tài khoản này không thuộc nhân sự nội bộ.');
  return {
    ...user,
    role,
    name: user.name || user.fullName || user.eName || user.email,
    avatar: user.avatar || user.avatarUrl || '',
    permissions: Array.isArray(user.permissions) ? user.permissions : [],
  };
}
export function can(user, module, action = 'read') {
  if (module === 'settings') return false;
  if (module === 'my-schedule')
    return (
      action === 'read' && (can(user, 'workshifts', 'read-own') || can(user, 'workshifts', 'read'))
    );
  if (
    user?.role === 'STAFF' &&
    ((module === 'workshifts' && action !== 'read-own') ||
      ['cinema-reviews', 'comment-reports'].includes(module))
  )
    return false;
  if (module === 'customers' && action === 'reset-password') return false;
  if (
    ['website-content', 'contacts'].includes(module) &&
    (user?.role !== 'ADMIN' ||
      !(module === 'contacts' ? ['read', 'update', 'delete'] : ['read', 'update']).includes(action))
  )
    return false;
  if (module === 'branches' && user?.role !== 'ADMIN') return false;
  return (
    !!user &&
    roles.includes(user.role) &&
    (user.permissions?.includes('*') ||
      user.permissions?.includes(module + ':*') ||
      user.permissions?.includes(module + ':' + action))
  );
}
export const modules = [
  ['movies', '/movies', 'Phim'],
  ['showtimes', '/showtimes', 'Lịch chiếu'],
  ['branches', '/branches', 'Chi nhánh'],
  ['rooms', '/rooms', 'Phòng & ghế'],
  ['customers', '/customers', 'Khách hàng'],
  ['employees', '/employees', 'Nhân viên'],
  ['my-schedule', '/my-schedule', 'Lịch làm việc'],
  ['orders', '/orders', 'Đơn hàng và vé'],
  ['coupons', '/coupons', 'Mã giảm giá'],
  ['products', '/products', 'Sản phẩm'],
  ['faq', '/faq', 'Hỏi đáp'],
  ['news', '/news', 'Tin tức'],
  ['cinema-reviews', '/cinema-reviews', 'Đánh giá'],
  ['comment-reports', '/comment-reports', 'Báo cáo bình luận và đánh giá'],
  ['reports', '/reports_analytics', 'Báo cáo'],
  ['profile', '/profile', 'Tài khoản cá nhân'],
  ['contacts', '/contacts', 'Liên hệ'],
  ['website-content', '/website-content', 'Nội dung website'],
];

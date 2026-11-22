export function managedBranchIds(user) {
  return [
    ...new Set(
      (Array.isArray(user?.branchIds) ? user.branchIds : [user?.branchId])
        .filter((id) => id !== null && id !== undefined && id !== '')
        .map(String),
    ),
  ];
}
export function inBranchScope(user, branchId) {
  return (
    user?.role === 'ADMIN' ||
    (branchId != null && managedBranchIds(user).includes(String(branchId)))
  );
}
// Orders and dated schedules now use the employee's assigned branch, even if
// other modules grant a manager additional branch scopes.
export function inHomeBranch(user, branchId) {
  return (
    user?.role === 'ADMIN' ||
    (user?.branchId != null &&
      branchId != null &&
      String(user.branchId) === String(branchId) &&
      inBranchScope(user, branchId))
  );
}
export function validateShift(shift) {
  if (
    !Number.isInteger(Number(shift.wDate)) ||
    Number(shift.wDate) < 1 ||
    Number(shift.wDate) > 7 ||
    !String(shift.work || '').trim() ||
    !Number.isInteger(Number(shift.branchId)) ||
    Number(shift.branchId) < 1
  )
    throw new Error('Chọn chi nhánh, thứ làm việc và nhập tên ca/công việc.');
  const validTime = (value) => /^([01]\d|2[0-3]):[0-5]\d(?::00)?$/.test(value || '');
  if (
    !validTime(shift.startTime) ||
    !validTime(shift.endTime) ||
    shift.endTime.slice(0, 5) <= shift.startTime.slice(0, 5)
  )
    throw new Error('Giờ kết thúc phải sau giờ bắt đầu trong cùng ngày.');
}
export function shiftsConflict(a, b) {
  return (
    Number(a.wDate) === Number(b.wDate) &&
    a.startTime.slice(0, 5) < b.endTime.slice(0, 5) &&
    b.startTime.slice(0, 5) < a.endTime.slice(0, 5)
  );
}
export const shiftKey = (s) =>
  [s.branchId, s.wDate, s.startTime?.slice(0, 5), s.endTime?.slice(0, 5)].join('|');

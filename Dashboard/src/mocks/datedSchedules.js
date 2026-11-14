import { can } from '../utils/permissions';
import { inHomeBranch as inBranchScope } from '../utils/schedule';
import { validateSchedule, schedulesOverlap, dayNumber, eventInterval } from '../utils/calendar';
export function datedSchedules({ db, session, resource, id, method, params, body, ok, fail }) {
  if (resource !== 'work-schedules') return;
  const personal = id === 'me',
    action =
      method === 'GET'
        ? 'read'
        : method === 'POST'
          ? 'create'
          : method === 'DELETE'
            ? 'delete'
            : 'update';
  if (personal) {
    if (method !== 'GET' || !can(session, 'workshifts', 'read-own'))
      fail(403, 'Không có quyền xem lịch cá nhân.');
    if (Object.keys(params).some((k) => !['startDate', 'endDate'].includes(k) && params[k] != null))
      fail(422, 'Lịch cá nhân được xác định từ phiên.');
  } else if (session.role === 'STAFF' || !can(session, 'workshifts', action))
    fail(403, 'Không có quyền quản lý lịch.');
  const all = db['work-schedules'];
  const hydrate = (row) => ({
    ...row,
    employeeName: db.employees.find((e) => e.eUserId === row.employeeId)?.eName,
    branchName: db.branches.find((b) => b.branchId === row.branchId)?.bName,
  });
  if (method === 'GET') {
    if (
      !Number.isFinite(dayNumber(params.startDate)) ||
      !Number.isFinite(dayNumber(params.endDate)) ||
      params.endDate < params.startDate ||
      dayNumber(params.endDate) - dayNumber(params.startDate) > 62
    )
      fail(422, 'Khoảng lịch phải hợp lệ và tối đa 63 ngày.');
    if (params.branchId && !inBranchScope(session, params.branchId))
      fail(403, 'Ngoài phạm vi chi nhánh.');
    if (
      params.employeeId &&
      !db.employees.some(
        (e) => e.eUserId === params.employeeId && inBranchScope(session, e.branchId),
      )
    )
      fail(403, 'Không có quyền xem nhân viên này.');
    return ok(
      all
        .filter((row) => {
          const [start, end] = eventInterval({ ...row, date: row.workDate });
          return (
            (personal ? row.employeeId === session.id : inBranchScope(session, row.branchId)) &&
            (!params.branchId || String(row.branchId) === String(params.branchId)) &&
            (!params.employeeId || row.employeeId === params.employeeId) &&
            start < (dayNumber(params.endDate) + 1) * 1440 &&
            end > dayNumber(params.startDate) * 1440
          );
        })
        .map(hydrate),
    );
  }
  const target = id
    ? all.find(
        (row) => String(row.scheduleId) === String(id) && inBranchScope(session, row.branchId),
      )
    : null;
  if (id && !target) fail(404, 'Không tìm thấy lịch trong phạm vi quản lý.');
  if (method === 'DELETE') {
    db['work-schedules'] = all.filter((row) => row !== target);
    return ok(null);
  }
  if (!['POST', 'PUT'].includes(method) || (method === 'PUT' && !target))
    fail(405, 'Phương thức không hợp lệ.');
  try {
    validateSchedule(body);
  } catch (e) {
    fail(422, e.message);
  }
  if (!inBranchScope(session, body.branchId)) fail(403, 'Ngoài phạm vi chi nhánh.');
  const employee = db.employees.find(
    (e) =>
      e.eUserId === body.employeeId && e.isActive && Number(e.branchId) === Number(body.branchId),
  );
  if (!employee) fail(422, 'Nhân viên không thuộc chi nhánh hoặc đã ngừng hoạt động.');
  if (all.some((row) => row !== target && schedulesOverlap(row, body)))
    fail(409, 'Nhân viên đã có lịch trùng thời gian.');
  const next = {
    employeeId: body.employeeId,
    branchId: Number(body.branchId),
    workDate: body.workDate,
    endDate: body.endDate || body.workDate,
    startTime: body.startTime,
    endTime: body.endTime,
    work: body.work.trim(),
    position: String(body.position || '').trim(),
    status: 'ASSIGNED',
  };
  if (target) Object.assign(target, next);
  else {
    next.scheduleId = Math.max(0, ...all.map((row) => row.scheduleId)) + 1;
    all.push(next);
  }
  return ok(hydrate(target || next), target ? 200 : 201);
}

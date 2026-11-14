import { can } from '../utils/permissions';
import { inBranchScope } from '../utils/schedule';
export function contentReports({
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
}) {
  if (!['comment-reports', 'cinema-reviews', 'movie-comments'].includes(resource)) return;
  const isReport = resource === 'comment-reports';
  const permission = resource === 'movie-comments' ? 'comment-reports' : resource;
  const action = method === 'GET' ? 'read' : body.action === 'DELETE' ? 'delete' : 'update';
  if (session.role === 'STAFF' || !can(session, permission, action))
    fail(403, 'Không có quyền truy cập nội dung.');
  const targetFor = (r) =>
    (r.targetType === 'MOVIE_COMMENT'
      ? db['movie-comments']
      : r.targetType === 'CINEMA_REVIEW'
        ? db['cinema-reviews']
        : []
    ).find((t) => String(t.commentId ?? t.reviewId) === String(r.targetId));
  const visible = (r) =>
    resource === 'cinema-reviews'
      ? inBranchScope(session, r.branchId)
      : !isReport ||
        r.targetType === 'MOVIE_COMMENT' ||
        (r.targetType === 'CINEMA_REVIEW' && inBranchScope(session, targetFor(r)?.branchId));
  const hydrateTarget = (r, type) =>
    r
      ? {
          ...r,
          authorName: db.customers.find((c) => c.cUserId === r.userId)?.cName || r.authorName,
          ...(type === 'MOVIE_COMMENT'
            ? { movieTitle: db.movies.find((m) => m.movieId === r.movieId)?.mName || r.movieTitle }
            : {
                branchName:
                  db.branches.find((b) => b.branchId === r.branchId)?.bName || r.branchName,
              }),
        }
      : null;
  const hydrate = (r) =>
    isReport
      ? { ...r, reportId: r.id, target: hydrateTarget(targetFor(r), r.targetType) }
      : hydrateTarget(r, resource === 'movie-comments' ? 'MOVIE_COMMENT' : 'CINEMA_REVIEW');
  if (params.branchId && !inBranchScope(session, params.branchId))
    fail(403, 'Ngoài phạm vi chi nhánh.');
  const rows = db[resource].filter(visible);
  if (method === 'GET') {
    let list = rows.map(hydrate);
    if (id) {
      const row = list.find((r) => String(r.id ?? r.reviewId ?? r.commentId) === String(id));
      if (!row) fail(404, 'Không tìm thấy nội dung.');
      return ok(row);
    }
    if (!isReport) list = list.filter((r) => r.contentStatus !== 'DELETED');
    for (const field of ['branchId', 'roomId', 'status', 'targetType'])
      if (params[field]) list = list.filter((r) => String(r[field]) === String(params[field]));
    if (params.q)
      list = list.filter((r) =>
        JSON.stringify(r)
          .toLocaleLowerCase('vi')
          .includes(String(params.q).toLocaleLowerCase('vi')),
      );
    const total = list.length,
      size = Math.max(1, Math.min(100, Number(params.pageSize) || 10)),
      page = Math.max(1, Number(params.page) || 1);
    return ok(params.page ? list.slice((page - 1) * size, page * size) : list, 200, {
      total,
      page,
      pageSize: size,
    });
  }
  if (!isReport || method !== 'POST' || parts[2] !== 'resolve')
    fail(405, 'Chỉ hỗ trợ xử lý báo cáo qua endpoint nguyên tử.');
  const report = rows.find((r) => String(r.id) === String(id));
  if (!report) fail(404, 'Không tìm thấy báo cáo trong phạm vi quản lý.');
  if (report.status !== 'PENDING') fail(409, 'Báo cáo đã được xử lý.');
  if (!['DISMISS', 'DELETE'].includes(body.action)) fail(422, 'Hành động không hợp lệ.');
  const content = targetFor(report);
  if (!content) fail(409, 'Không tìm thấy nội dung gốc, cần tải lại báo cáo.');
  if (body.action === 'DELETE' && content.contentStatus === 'DELETED')
    fail(409, 'Nội dung đã bị xóa.');
  const result = {
    status: 'RESOLVED',
    resolutionAction: body.action,
    resolvedAt: new Date().toISOString(),
    resolvedBy: session.id,
  };
  // Mock policy: retain an audit tombstone and resolve every pending report for the deleted target.
  if (body.action === 'DELETE') {
    content.contentStatus = 'DELETED';
    for (const related of db['comment-reports'].filter(
      (r) =>
        r.targetType === report.targetType &&
        r.targetId === report.targetId &&
        r.status === 'PENDING',
    ))
      Object.assign(related, result);
  } else Object.assign(report, result);
  return ok(hydrate(report));
}

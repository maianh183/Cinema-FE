import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { commentReportService } from '@/services/commentReportService';
import { useAuthStore } from '@/stores/authStore';
import { can } from '@/utils/permissions';
import { contentTypes, formatContentTime } from '@/utils/contentModels';
import ContentTarget from '@/components/ContentTarget';
import { ErrorState, LoadingState, EmptyState } from '@/components/ui/Feedback';
import Pagination from '@/components/tables/Pagination';
import FormModal from '@/components/modals/FormModal';
import { ConfirmModal } from '@/components/ui/confirm-modal';
const statuses = { PENDING: 'Chưa xử lý', RESOLVED: 'Đã xử lý' };
const actions = { DISMISS: 'Bác bỏ báo cáo', DELETE: 'Xóa nội dung' };
const decisions = {
  DISMISS: 'Đã bác bỏ báo cáo, giữ nguyên nội dung',
  DELETE: 'Đã xóa nội dung vi phạm',
};
export default function CommentReports() {
  const user = useAuthStore((s) => s.user);
  const [rows, setRows] = useState([]),
    [total, setTotal] = useState(0),
    [page, setPage] = useState(1),
    [q, setQ] = useState(''),
    [status, setStatus] = useState(''),
    [targetType, setTargetType] = useState('');
  const [loading, setLoading] = useState(true),
    [error, setError] = useState(''),
    [revision, setRevision] = useState(0),
    [detail, setDetail] = useState(null),
    [pending, setPending] = useState(null);
  useEffect(() => {
    let current = true;
    setLoading(true);
    setError('');
    commentReportService
      .list({ page, pageSize: 10, q, status, targetType })
      .then((result) => {
        if (current) {
          setRows(result.items);
          setTotal(result.total);
        }
      })
      .catch((e) => current && setError(e.message))
      .finally(() => current && setLoading(false));
    return () => {
      current = false;
    };
  }, [page, q, status, targetType, revision]);
  async function resolve() {
    if (
      !pending ||
      pending.row.status !== 'PENDING' ||
      !can(user, 'comment-reports', pending.action === 'DELETE' ? 'delete' : 'update')
    )
      throw new Error('Không có quyền xử lý báo cáo.');
    const saved = await commentReportService.resolve(pending.row.id, pending.action);
    if (
      String(saved.id) !== String(pending.row.id) ||
      saved.status !== 'RESOLVED' ||
      saved.resolutionAction !== pending.action
    )
      throw new Error('API chưa xác nhận kết quả xử lý báo cáo. Hãy tải lại trước khi thử tiếp.');
    setRevision((v) => v + 1);
    setDetail(null);
    toast.success('Đã xử lý báo cáo.');
  }
  return (
    <section className="space-y-5">
      <h1 className="text-2xl font-semibold">Báo cáo bình luận và đánh giá</h1>
      <p className="text-sm text-gray-500">
        Mỗi quyết định được máy chủ lưu cùng trạng thái xử lý. Báo cáo đã xử lý không thể thực hiện
        lại.
      </p>
      <div className="flex flex-wrap gap-3">
        <input
          className="form-control flex-1"
          aria-label="Tìm báo cáo"
          placeholder="Tìm nội dung, người gửi, lý do…"
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setPage(1);
          }}
        />
        <select
          className="form-control w-auto"
          aria-label="Trạng thái báo cáo"
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(1);
          }}
        >
          <option value="">Tất cả trạng thái</option>
          {Object.entries(statuses).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
        <select
          className="form-control w-auto"
          aria-label="Đối tượng bị báo cáo"
          value={targetType}
          onChange={(e) => {
            setTargetType(e.target.value);
            setPage(1);
          }}
        >
          <option value="">Tất cả</option>
          {Object.entries(contentTypes).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
      </div>
      <div className="rounded-2xl border bg-white overflow-hidden">
        {loading ? (
          <LoadingState />
        ) : error ? (
          <ErrorState error={error} retry={() => setRevision((v) => v + 1)} />
        ) : !rows.length ? (
          <EmptyState />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50">
                <tr>
                  {[
                    'Mã / loại',
                    'Người gửi báo cáo',
                    'Nội dung bị báo cáo',
                    'Lý do',
                    'Thời gian',
                    'Trạng thái',
                    'Thao tác',
                  ].map((h) => (
                    <th className="p-4" key={h}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr className="border-t align-top" key={row.id}>
                    <td className="p-4">
                      #{row.id}
                      <p>{contentTypes[row.targetType] || 'Loại chưa hỗ trợ'}</p>
                    </td>
                    <td className="p-4">{row.reporterName || row.reporterId || '—'}</td>
                    <td className="p-4 min-w-64 max-w-md">
                      <ContentTarget type={row.targetType} target={row.target} />
                    </td>
                    <td className="p-4">{row.reason}</td>
                    <td className="p-4">{formatContentTime(row.reportedAt)}</td>
                    <td className="p-4">
                      {statuses[row.status] || row.status}
                      <p>{decisions[row.resolutionAction]}</p>
                    </td>
                    <td className="p-4">
                      <button className="btn-secondary" onClick={() => setDetail(row)}>
                        Chi tiết
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <Pagination page={page} pageSize={10} total={total} onChange={setPage} />
      </div>
      <FormModal
        open={!!detail}
        onClose={() => setDetail(null)}
        title={'Báo cáo #' + (detail?.id || '')}
      >
        {detail && (
          <>
            <p className="mb-3">{contentTypes[detail.targetType]}</p>
            <ContentTarget type={detail.targetType} target={detail.target} />
            <dl className="space-y-3 mt-4 text-sm">
              {[
                ['Người gửi báo cáo', detail.reporterName || detail.reporterId],
                ['Lý do báo cáo', detail.reason],
                ['Thời gian báo cáo', formatContentTime(detail.reportedAt)],
                ['Trạng thái', statuses[detail.status] || detail.status],
                ['Quyết định', decisions[detail.resolutionAction] || '—'],
                ['Thời gian xử lý', formatContentTime(detail.resolvedAt)],
              ].map(([k, v]) => (
                <div key={k}>
                  <dt className="font-semibold">{k}</dt>
                  <dd className="whitespace-pre-wrap break-words">{v}</dd>
                </div>
              ))}
            </dl>
          </>
        )}
        <div className="flex flex-wrap gap-2 mt-6">
          {detail?.status === 'PENDING' &&
            detail.target &&
            Object.entries(actions)
              .filter(
                ([action]) =>
                  can(user, 'comment-reports', action === 'DELETE' ? 'delete' : 'update') &&
                  (action !== 'DELETE' || detail.target.contentStatus !== 'DELETED'),
              )
              .map(([action, label]) => (
                <button
                  key={action}
                  disabled={!!pending}
                  className="btn-secondary"
                  onClick={() => setPending({ row: detail, action })}
                >
                  {label}
                </button>
              ))}
        </div>
      </FormModal>
      <ConfirmModal
        key={pending ? pending.row.id + pending.action : 'none'}
        isOpen={!!pending}
        onClose={() => setPending(null)}
        onConfirm={resolve}
        title={actions[pending?.action] || 'Xử lý báo cáo'}
        description={
          (pending?.action === 'DELETE'
            ? 'Xóa nội dung vi phạm theo chính sách máy chủ. Các báo cáo khác về cùng nội dung sẽ được máy chủ xử lý đồng bộ.'
            : 'Giữ nguyên nội dung và ghi nhận quyết định bác bỏ.') +
          ' Chỉ cập nhật sau khi máy chủ xác nhận.'
        }
      />
    </section>
  );
}

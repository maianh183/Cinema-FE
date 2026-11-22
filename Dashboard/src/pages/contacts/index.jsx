import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { useAuthStore } from '@/stores/authStore';
import { can } from '@/utils/permissions';
import { contactStatuses } from '@/utils/contacts';
import { contactService } from '@/services/contactService';
import Pagination from '@/components/tables/Pagination';
import FormModal from '@/components/modals/FormModal';
import { ConfirmModal } from '@/components/ui/confirm-modal';
import { LoadingState, ErrorState, EmptyState } from '@/components/ui/Feedback';
const time = (value) => new Date(value).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
export default function ContactsPage() {
  const user = useAuthStore((s) => s.user);
  const [page, setPage] = useState(1),
    [q, setQ] = useState(''),
    [status, setStatus] = useState(''),
    [revision, setRevision] = useState(0);
  const [data, setData] = useState(null),
    [error, setError] = useState(''),
    [loading, setLoading] = useState(true);
  const [detailId, setDetailId] = useState(null),
    [detail, setDetail] = useState(null),
    [detailError, setDetailError] = useState(''),
    [busy, setBusy] = useState(false),
    [pending, setPending] = useState(null);
  useEffect(() => {
    let live = true;
    setLoading(true);
    setError('');
    setData(null);
    Promise.all([
      contactService.list({ page, pageSize: 10, q, status }),
      contactService.list({ pageSize: 1 }),
      contactService.list({ pageSize: 1, status: 'UNREAD' }),
    ])
      .then(([list, all, unread]) => {
        if (!live) return;
        if (page > 1 && list.total <= (page - 1) * 10) {
          setPage(Math.max(1, Math.ceil(list.total / 10)));
          return;
        }
        setData({ ...list, all: all.total, unread: unread.total });
      })
      .catch((e) => live && setError(e.message))
      .finally(() => live && setLoading(false));
    return () => {
      live = false;
    };
  }, [page, q, status, revision, user]);
  async function open(id) {
    setDetailId(id);
    setDetail(null);
    setDetailError('');
    setBusy(true);
    try {
      setDetail(await contactService.detail(id));
    } catch (e) {
      setDetailError(e.message);
    } finally {
      setBusy(false);
    }
  }
  async function changeStatus(next) {
    if (busy || !can(user, 'contacts', 'update')) return;
    setBusy(true);
    setDetailError('');
    try {
      const saved = await contactService.status(detail.id, next);
      setDetail(saved);
      setRevision((v) => v + 1);
      toast.success('Đã cập nhật trạng thái liên hệ.');
    } catch (e) {
      setDetailError(e.message);
    } finally {
      setBusy(false);
    }
  }
  async function remove() {
    if (!can(user, 'contacts', 'delete')) throw new Error('Không có quyền xóa liên hệ.');
    await contactService.remove(pending.id);
    if (detailId === pending.id) {
      setDetailId(null);
      setDetail(null);
    }
    setRevision((v) => v + 1);
    toast.success('Đã xóa liên hệ.');
  }
  async function copy(value) {
    try {
      await navigator.clipboard.writeText(value);
      toast.success('Đã sao chép.');
    } catch {
      toast.error('Không thể sao chép tự động. Bạn có thể chọn và sao chép văn bản.');
    }
  }
  return (
    <section className="space-y-5">
      <h1 className="text-2xl font-semibold">Liên hệ</h1>
      <p className="text-sm text-gray-500">
        Liên hệ khách hàng trên toàn hệ thống · chỉ dành cho quản trị viên.
      </p>
      {data && (
        <div className="grid sm:grid-cols-2 gap-4">
          {[
            ['Tổng liên hệ', data.all],
            ['Chưa đọc', data.unread],
          ].map(([label, value]) => (
            <section key={label} aria-label={label} className="bg-white border rounded-2xl p-5">
              <h2 className="text-sm text-gray-500">{label}</h2>
              <p className="text-2xl font-semibold text-indigo-700">{value}</p>
            </section>
          ))}
        </div>
      )}
      <div className="flex flex-wrap gap-3">
        <label className="field flex-1 min-w-0">
          Tìm liên hệ
          <input
            className="form-control"
            maxLength={250}
            placeholder="Họ tên, email, điện thoại, chủ đề"
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setPage(1);
            }}
          />
        </label>
        <label className="field">
          Trạng thái
          <select
            aria-label="Lọc trạng thái liên hệ"
            className="form-control"
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
          >
            <option value="">Tất cả</option>
            {Object.entries(contactStatuses).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
      </div>
      {loading ? (
        <LoadingState />
      ) : error ? (
        <ErrorState error={error} retry={() => setRevision((v) => v + 1)} />
      ) : (
        data && (
          <div className="bg-white border rounded-2xl overflow-hidden">
            {!data.items.length ? (
              <EmptyState />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-gray-50">
                    <tr>
                      {[
                        'ID',
                        'Họ tên',
                        'Email',
                        'Điện thoại',
                        'Chủ đề',
                        'Thời gian gửi',
                        'Trạng thái',
                        'Thao tác',
                      ].map((label) => (
                        <th key={label} className="p-3 whitespace-nowrap">
                          {label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {data.items.map((row) => (
                      <tr key={row.id} className="border-t">
                        <td className="p-3">#{row.id}</td>
                        <td className="p-3">{row.fullName}</td>
                        <td className="p-3 break-all">{row.email}</td>
                        <td className="p-3">{row.phone || '—'}</td>
                        <td className="p-3 max-w-xs break-words">{row.subject}</td>
                        <td className="p-3">{time(row.createdAt)}</td>
                        <td className="p-3">
                          <span
                            className={
                              'rounded-lg px-2 py-1 text-xs ' +
                              (row.status === 'UNREAD'
                                ? 'bg-indigo-50 text-indigo-700'
                                : row.status === 'REPLIED'
                                  ? 'bg-teal-50 text-teal-700'
                                  : 'bg-gray-100 text-gray-700')
                            }
                          >
                            {contactStatuses[row.status]}
                          </span>
                        </td>
                        <td className="p-3">
                          <div className="flex gap-2">
                            <button
                              className="btn-secondary"
                              disabled={busy}
                              onClick={() => open(row.id)}
                            >
                              Chi tiết
                            </button>
                            {can(user, 'contacts', 'delete') && (
                              <button className="btn-danger" onClick={() => setPending(row)}>
                                Xóa
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <Pagination page={page} pageSize={10} total={data.total} onChange={setPage} />
          </div>
        )
      )}
      <FormModal
        open={detailId !== null}
        onClose={() => {
          setDetailId(null);
          setDetail(null);
        }}
        busy={busy}
        title={'Liên hệ #' + detailId}
        description="Mở chi tiết không tự thay đổi trạng thái."
      >
        {detailError && (
          <ErrorState error={detailError} retry={!detail ? () => open(detailId) : undefined} />
        )}
        {busy && !detail && <LoadingState />}
        {detail && (
          <div className="space-y-4 break-words">
            <h2 className="text-lg font-semibold">{detail.subject}</h2>
            <p>
              {detail.fullName} · {time(detail.createdAt)}
            </p>
            <div className="flex flex-wrap gap-3 items-center">
              <span className="break-all">{detail.email}</span>
              <button className="btn-secondary" onClick={() => copy(detail.email)}>
                Sao chép email
              </button>
              <span>{detail.phone || 'Không có điện thoại'}</span>
              {detail.phone && (
                <button className="btn-secondary" onClick={() => copy(detail.phone)}>
                  Sao chép điện thoại
                </button>
              )}
            </div>
            <p className="whitespace-pre-wrap rounded-xl bg-gray-50 p-4">{detail.content}</p>
            <p>Trạng thái: {contactStatuses[detail.status]}</p>
            {detail.readAt && <p className="text-sm">Đọc gần nhất: {time(detail.readAt)}</p>}
            {detail.repliedAt && (
              <p className="text-sm">
                Ghi nhận phản hồi: {time(detail.repliedAt)} · {detail.repliedBy || '—'}
              </p>
            )}
            <p className="text-sm text-gray-500">
              Đánh dấu đã phản hồi chỉ ghi nhận bạn đã trả lời qua kênh khác, không gửi email.
            </p>
            {can(user, 'contacts', 'update') && (
              <div className="flex flex-wrap gap-2">
                {Object.entries(contactStatuses).map(([value, label]) => (
                  <button
                    key={value}
                    className="btn-secondary"
                    disabled={busy || detail.status === value}
                    onClick={() => changeStatus(value)}
                  >
                    {label}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </FormModal>
      <ConfirmModal
        key={pending?.id || 'none'}
        isOpen={!!pending}
        onClose={() => setPending(null)}
        onConfirm={remove}
        title="Xóa liên hệ"
        description={
          'Xóa liên hệ #' +
          pending?.id +
          '? Thao tác này không gửi email và có thể không khôi phục được.'
        }
        confirmText="Xóa liên hệ"
      />
    </section>
  );
}

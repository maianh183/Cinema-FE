import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { customerService } from '@/services/customerService';
import api from '@/services/api';
import { can } from '@/utils/permissions';
import { useAuthStore } from '@/stores/authStore';
import FormModal from '@/components/modals/FormModal';
import { ConfirmModal } from '@/components/ui/confirm-modal';
import { ErrorState, LoadingState, EmptyState } from '@/components/ui/Feedback';
import Pagination from '@/components/tables/Pagination';
import { usePagination } from '@/hooks/usePagination';
export default function Customers() {
  const user = useAuthStore((s) => s.user);
  const [rows, setRows] = useState([]),
    [q, setQ] = useState(''),
    [status, setStatus] = useState(''),
    [tier, setTier] = useState(''),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(''),
    [revision, setRevision] = useState(0),
    [selected, setSelected] = useState(null),
    [confirm, setConfirm] = useState(null);
  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    customerService
      .getAll()
      .then((r) => active && setRows(r))
      .catch((e) => active && setError(e.message))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [revision]);
  const filtered = useMemo(
    () =>
      rows.filter(
        (r) =>
          (!q ||
            [r.cName, r.email, r.phoneNumber].some((v) =>
              v?.toLowerCase().includes(q.toLowerCase()),
            )) &&
          (!status || String(r.isActive) === status) &&
          (!tier || r.membershipTier === tier),
      ),
    [rows, q, status, tier],
  );
  const pagination = usePagination(filtered, 10, q + status + tier);
  async function execute() {
    const { row, action } = confirm;
    if (action === 'status')
      await (row.isActive
        ? customerService.deactivate(row.cUserId)
        : customerService.activate(row.cUserId));
    if (action === 'delete') await api.delete('/customers/' + encodeURIComponent(row.cUserId));
    setRevision((v) => v + 1);
    toast.success('Đã cập nhật tài khoản.');
  }
  return (
    <section className="space-y-5">
      <h1 className="text-2xl font-semibold">Khách hàng</h1>
      <div className="flex flex-wrap gap-3">
        <input
          className="form-control flex-1 min-w-48"
          aria-label="Tìm khách hàng"
          placeholder="Tìm tên, email, số điện thoại…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <select
          className="form-control w-auto"
          aria-label="Trạng thái"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          <option value="">Tất cả trạng thái</option>
          <option value="true">Hoạt động</option>
          <option value="false">Đã khóa</option>
        </select>
        <select
          className="form-control w-auto"
          aria-label="Hạng thành viên"
          value={tier}
          onChange={(e) => setTier(e.target.value)}
        >
          <option value="">Tất cả hạng thẻ</option>
          {['Normal', 'Premium', 'VIP'].map((t) => (
            <option key={t}>{t}</option>
          ))}
        </select>
      </div>
      <div className="bg-white rounded-2xl border overflow-hidden">
        {loading ? (
          <LoadingState />
        ) : error ? (
          <ErrorState error={error} retry={() => setRevision((v) => v + 1)} />
        ) : !filtered.length ? (
          <EmptyState />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50 text-gray-500">
                <tr>
                  {['Khách hàng', 'Hạng thẻ', 'Trạng thái', 'Thao tác'].map((h) => (
                    <th className="p-4" key={h}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pagination.items.map((row) => (
                  <tr key={row.cUserId} className="border-t">
                    <td className="p-4 font-medium">{row.cName}</td>
                    <td className="p-4">{row.membershipTier}</td>
                    <td className="p-4">{row.isActive ? 'Hoạt động' : 'Đã khóa'}</td>
                    <td className="p-4">
                      <div className="flex flex-wrap gap-2">
                        <button className="btn-secondary" onClick={() => setSelected(row)}>
                          Chi tiết
                        </button>
                        {can(user, 'customers', 'update') && (
                          <button
                            className="btn-secondary"
                            onClick={() => setConfirm({ row, action: 'status' })}
                          >
                            {row.isActive ? 'Khóa' : 'Mở khóa'}
                          </button>
                        )}
                        {can(user, 'customers', 'delete') && (
                          <button
                            className="btn-secondary text-red-600"
                            onClick={() => setConfirm({ row, action: 'delete' })}
                          >
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
        <Pagination {...pagination} />
      </div>
      <FormModal
        open={!!selected}
        onClose={() => setSelected(null)}
        title="Hồ sơ khách hàng"
        description="Thông tin chỉ xem. Khách hàng tự cập nhật hồ sơ trên ứng dụng dành cho khách hàng."
      >
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {selected &&
            [
              ['Họ tên', selected.cName],
              ['Email', selected.email],
              ['Điện thoại', selected.phoneNumber],
              ['Giới tính', { M: 'Nam', F: 'Nữ' }[selected.sex]],
              ['Mã khách hàng', selected.cUserId],
              ['Hạng thành viên', selected.membershipTier],
              [
                'Điểm tích lũy',
                selected.totalPoints == null ? '—' : selected.totalPoints + ' điểm',
              ],
              ['Trạng thái', selected.isActive ? 'Hoạt động' : 'Đã khóa'],
            ].map(([label, value]) => (
              <div key={label}>
                <dt className="text-sm text-gray-500">{label}</dt>
                <dd className="font-medium mt-1 break-words">{value ?? '—'}</dd>
              </div>
            ))}
        </dl>
      </FormModal>
      <ConfirmModal
        isOpen={!!confirm}
        onClose={() => setConfirm(null)}
        title={'Xác nhận thay đổi tài khoản'}
        description={
          confirm?.action === 'delete'
            ? 'Máy chủ quyết định xóa hoặc ẩn danh tài khoản theo lịch sử giao dịch.'
            : 'Thao tác sẽ thay đổi khả năng đăng nhập của khách hàng.'
        }
        onConfirm={execute}
      />
    </section>
  );
}

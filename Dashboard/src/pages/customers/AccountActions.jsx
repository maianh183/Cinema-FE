import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import FormModal from '@/components/modals/FormModal';
import { useUnsavedChanges } from '@/hooks/useUnsavedChanges';
import { customerService, passwordResetWait } from '@/services/customerService';
import { USE_MOCK } from '@/services/api';
import { useAuthStore } from '@/stores/authStore';
import { can } from '@/utils/permissions';

const profileFields = (row) => ({
  cName: row.cName || '',
  phoneNumber: row.phoneNumber || '',
  sex: row.sex || '',
});

export function CustomerProfileModal({ row, onClose, onSaved }) {
  const user = useAuthStore((state) => state.user);
  const [draft, setDraft] = useState(() => profileFields(row));
  const [saved, setSaved] = useState(() => profileFields(row));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [errors, setErrors] = useState({});
  const saving = useRef(false);
  const dirty = JSON.stringify(draft) !== JSON.stringify(saved);
  const permitted = can(user, 'customers', 'edit-profile');
  async function save() {
    if (saving.current) throw new Error('Vui lòng chờ lưu hoàn tất.');
    saving.current = true;
    setBusy(true);
    setError('');
    setErrors({});
    try {
      const result = await customerService.updateProfile(row.cUserId, draft);
      setSaved(profileFields(result));
      setDraft(profileFields(result));
      onSaved(result);
      toast.success('Đã cập nhật hồ sơ khách hàng.');
    } catch (e) {
      setError(e.message);
      setErrors(e.errors || {});
      throw e;
    } finally {
      saving.current = false;
      setBusy(false);
    }
  }
  const guard = useUnsavedChanges({
    dirty,
    onSave: save,
    onDiscard: () => {
      if (saving.current) throw new Error('Vui lòng chờ lưu hoàn tất.');
      setDraft(saved);
    },
    description: 'Bạn muốn lưu hồ sơ khách hàng đang chỉnh sửa trước khi tiếp tục không?',
  });
  function change(key, value) {
    setDraft((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: null }));
  }
  return (
    <>
      <FormModal
        open
        onClose={() => guard.request(onClose)}
        title="Chỉnh sửa khách hàng"
        busy={busy}
        description="Chỉ cập nhật họ tên, số điện thoại và giới tính. Các thông tin tài khoản khác được giữ nguyên."
      >
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            save()
              .then(onClose)
              .catch(() => {});
          }}
        >
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            {[
              ['Mã khách hàng', row.cUserId],
              ['Email đăng nhập', row.email],
              ['Ngày tạo', row.createdAt],
              ['Ngày sinh', row.birthday],
            ].map(([label, value]) => (
              <div key={label}>
                <dt className="text-gray-500">{label}</dt>
                <dd className="break-words">{value || '—'}</dd>
              </div>
            ))}
          </dl>
          {error && (
            <p role="alert" className="text-red-600">
              {error}
            </p>
          )}
          {!permitted && <p role="alert">Bạn không còn quyền chỉnh sửa hồ sơ.</p>}
          <fieldset disabled={busy || !permitted} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              ['cName', 'Họ và tên', 'text', 100],
              ['phoneNumber', 'Số điện thoại', 'tel', 16],
            ].map(([key, label, type, maxLength]) => (
              <label className="field" key={key}>
                {label}
                <input
                  className="form-control"
                  type={type}
                  value={draft[key]}
                  required
                  maxLength={maxLength}
                  aria-invalid={!!errors[key]}
                  aria-describedby={errors[key] ? `customer-${key}-error` : undefined}
                  onChange={(event) => change(key, event.target.value)}
                />
                {errors[key] && (
                  <span id={`customer-${key}-error`} className="text-red-600 text-sm">
                    {errors[key]}
                  </span>
                )}
              </label>
            ))}
            <label className="field">
              Giới tính
              <select
                className="form-control"
                value={draft.sex}
                required
                aria-invalid={!!errors.sex}
                onChange={(event) => change('sex', event.target.value)}
              >
                <option value="">Chọn giới tính</option>
                <option value="F">Nữ</option>
                <option value="M">Nam</option>
              </select>
              {errors.sex && <span className="text-red-600 text-sm">{errors.sex}</span>}
            </label>
          </fieldset>
          <div className="flex flex-wrap justify-end gap-3">
            <button
              type="button"
              className="btn-secondary"
              disabled={busy}
              onClick={() => guard.request(onClose)}
            >
              Hủy
            </button>
            <button className="btn-primary" disabled={busy || !dirty || !permitted}>
              {busy ? 'Đang lưu…' : 'Lưu hồ sơ'}
            </button>
          </div>
        </form>
      </FormModal>
      {guard.dialog}
    </>
  );
}

export function CustomerPasswordResetModal({ row, onClose }) {
  const user = useAuthStore((state) => state.user);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [wait, setWait] = useState(() => passwordResetWait(row.cUserId));
  const pending = useRef(false);
  useEffect(() => {
    const timer = setInterval(() => setWait(passwordResetWait(row.cUserId)), 1000);
    return () => clearInterval(timer);
  }, [row.cUserId]);
  async function send() {
    if (pending.current) return;
    pending.current = true;
    setBusy(true);
    setError('');
    try {
      await customerService.requestPasswordReset(row.cUserId);
      toast.success(
        USE_MOCK
          ? 'Mô phỏng đã tiếp nhận yêu cầu; không gửi email.'
          : 'Máy chủ đã tiếp nhận yêu cầu khôi phục mật khẩu.',
      );
      onClose();
    } catch (e) {
      setError(e.message);
    } finally {
      pending.current = false;
      setBusy(false);
      setWait(passwordResetWait(row.cUserId));
    }
  }
  return (
    <FormModal
      open
      onClose={onClose}
      busy={busy}
      title="Đặt lại mật khẩu khách hàng"
      description="Yêu cầu máy chủ gửi hướng dẫn khôi phục đến email đã xác minh. Thao tác này không tự đổi mật khẩu và không cung cấp mật khẩu hoặc token cho quản trị viên."
    >
      <dl className="space-y-2 mb-4">
        <div>
          <dt>Khách hàng</dt>
          <dd className="font-medium break-words">{row.cName}</dd>
        </div>
        <div>
          <dt>Email tài khoản</dt>
          <dd className="break-words">{row.email}</dd>
        </div>
      </dl>
      {USE_MOCK && (
        <p className="text-sm mb-4">
          Chế độ mô phỏng: không gửi email và không phát hành token khôi phục.
        </p>
      )}
      {error && (
        <p role="alert" className="text-red-600 mb-4">
          {error}
        </p>
      )}
      {wait > 0 && (
        <p role="status" className="text-sm mb-4">
          Có thể gửi lại sau {wait} giây.
        </p>
      )}
      <div className="flex flex-wrap justify-end gap-3">
        <button className="btn-secondary" disabled={busy} onClick={onClose}>
          Hủy
        </button>
        <button
          className="btn-primary"
          disabled={busy || wait > 0 || !can(user, 'customers', 'reset-password')}
          onClick={send}
        >
          {busy ? 'Đang gửi…' : 'Xác nhận gửi yêu cầu'}
        </button>
      </div>
    </FormModal>
  );
}

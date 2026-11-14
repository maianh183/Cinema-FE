import { useState } from 'react';
import { toast } from 'sonner';
import { useAuthStore } from '@/stores/authStore';
import { authService } from '@/services/authService';
import Fields from '@/components/forms/Fields';
import { validateFields } from '@/utils/validation';
import ComponentCard from '@/components/ui/ComponentCard';
const fields = [
  { name: 'name', label: 'Họ và tên', required: true, maxLength: 100 },
  { name: 'phoneNumber', label: 'Điện thoại', maxLength: 20 },
  { name: 'birthday', label: 'Ngày sinh', type: 'date' },
  { name: 'avatarUrl', label: 'Ảnh đại diện', type: 'image' },
];
export default function Profile() {
  const { user, setUser } = useAuthStore();
  const [values, setValues] = useState({ ...user, avatarUrl: user.avatar }),
    [password, setPassword] = useState({ oldPassword: '', newPassword: '', confirm: '' }),
    [errors, setErrors] = useState({}),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false),
    [uploading, setUploading] = useState(false);
  async function submit(e, changePassword = false) {
    e.preventDefault();
    if (busy || uploading) return;
    setError('');
    if (!changePassword) {
      const errs = validateFields(fields, values);
      setErrors(errs);
      if (Object.keys(errs).length) return;
    }
    if (
      changePassword &&
      (password.newPassword.length < 10 ||
        password.newPassword !== password.confirm ||
        password.newPassword === password.oldPassword)
    ) {
      setError('Mật khẩu mới cần ít nhất 10 ký tự, khác mật khẩu cũ và trùng xác nhận.');
      return;
    }
    setBusy(true);
    try {
      if (changePassword) {
        await authService.changePassword({
          oldPassword: password.oldPassword,
          newPassword: password.newPassword,
        });
        setPassword({ oldPassword: '', newPassword: '', confirm: '' });
      } else {
        const updated = await authService.updateProfile(
          Object.fromEntries(fields.map((f) => [f.name, values[f.name] || ''])),
        );
        setUser({ ...user, ...updated, avatar: updated.avatarUrl || updated.avatar || '' });
      }
      toast.success('Đã cập nhật tài khoản.');
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Tài khoản cá nhân</h1>
      {error && (
        <p role="alert" className="text-red-600">
          {error}
        </p>
      )}
      <ComponentCard title="Thông tin cá nhân" desc={user.email + ' · ' + user.role}>
        <form onSubmit={(e) => submit(e)} className="space-y-5">
          <Fields
            fields={fields}
            values={values}
            onChange={(k, v) => setValues({ ...values, [k]: v })}
            errors={errors}
            disabled={busy}
            onUploadingChange={setUploading}
          />
          <button className="btn-primary" disabled={busy || uploading}>
            Lưu hồ sơ
          </button>
        </form>
      </ComponentCard>
      <ComponentCard title="Đổi mật khẩu">
        <form onSubmit={(e) => submit(e, true)} className="space-y-4 max-w-lg">
          {[
            ['oldPassword', 'Mật khẩu hiện tại'],
            ['newPassword', 'Mật khẩu mới'],
            ['confirm', 'Xác nhận mật khẩu'],
          ].map(([k, label]) => (
            <label className="field" key={k}>
              {label}
              <input
                type="password"
                required
                minLength={k === 'oldPassword' ? 1 : 10}
                autoComplete={k === 'oldPassword' ? 'current-password' : 'new-password'}
                value={password[k]}
                onChange={(e) => setPassword({ ...password, [k]: e.target.value })}
              />
            </label>
          ))}
          <button className="btn-primary" disabled={busy}>
            Đổi mật khẩu
          </button>
        </form>
      </ComponentCard>
    </div>
  );
}

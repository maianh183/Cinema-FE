import { useState } from 'react';
import FormModal from '@/components/modals/FormModal';
import { validateSchedule } from '@/utils/calendar';
export default function WorkShiftForm({
  shift,
  date,
  branchSelectable = true,
  branches,
  employees,
  onClose,
  onSave,
}) {
  const [values, setValues] = useState({
    branchId: String(shift?.branchId || branches[0]?.branchId || ''),
    employeeId: shift?.employeeId || '',
    workDate: shift?.workDate || date,
    endDate: shift?.endDate || date,
    startTime: shift?.startTime?.slice(0, 5) || '',
    endTime: shift?.endTime?.slice(0, 5) || '',
    work: shift?.work || '',
    position: shift?.position || '',
  });
  const [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  function update(key, value) {
    setValues((v) => ({
      ...v,
      [key]: value,
      ...(key === 'branchId' ? { employeeId: '' } : key === 'workDate' ? { endDate: value } : {}),
    }));
  }
  async function save(e) {
    e.preventDefault();
    if (busy) return;
    setError('');
    try {
      validateSchedule(values);
      if (
        !employees.some(
          (emp) =>
            String(emp.eUserId) === values.employeeId && String(emp.branchId) === values.branchId,
        )
      )
        throw new Error('Chọn nhân viên thuộc chi nhánh của lịch.');
      setBusy(true);
      await onSave({
        ...values,
        branchId: Number(values.branchId),
        startTime: values.startTime + ':00',
        endTime: values.endTime + ':00',
      });
      onClose();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <FormModal
      open
      onClose={onClose}
      busy={busy}
      title={shift ? 'Chỉnh sửa lịch làm việc' : 'Thêm lịch làm việc'}
      description="Phân công theo ngày cụ thể. Với ca qua đêm, chọn ngày kết thúc là ngày hôm sau."
    >
      <form onSubmit={save} className="space-y-4">
        <fieldset disabled={busy} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {branchSelectable ? (
            <label className="field">
              Chi nhánh ca làm
              <select
                aria-label="Chi nhánh ca làm"
                required
                value={values.branchId}
                onChange={(e) => update('branchId', e.target.value)}
              >
                <option value="">Chọn chi nhánh</option>
                {branches.map((b) => (
                  <option key={b.branchId} value={b.branchId}>
                    {b.bName}
                  </option>
                ))}
              </select>
            </label>
          ) : (
            <p className="text-sm self-center">
              Chi nhánh:{' '}
              {branches.find((b) => String(b.branchId) === values.branchId)?.bName ||
                'Chưa được cấp'}
            </p>
          )}
          <label className="field">
            Nhân viên được phân công
            <select
              aria-label="Nhân viên được phân công"
              required
              value={values.employeeId}
              onChange={(e) => update('employeeId', e.target.value)}
            >
              <option value="">Chọn nhân viên</option>
              {employees
                .filter((e) => String(e.branchId) === values.branchId && e.isActive !== false)
                .map((e) => (
                  <option key={e.eUserId} value={e.eUserId}>
                    {e.eName}
                  </option>
                ))}
            </select>
          </label>
          <label className="field">
            Ngày làm việc
            <input
              type="date"
              required
              value={values.workDate}
              onChange={(e) => update('workDate', e.target.value)}
            />
          </label>
          <label className="field">
            Ngày kết thúc
            <input
              type="date"
              required
              min={values.workDate}
              value={values.endDate}
              onChange={(e) => update('endDate', e.target.value)}
            />
          </label>
          <label className="field">
            Giờ bắt đầu
            <input
              type="time"
              required
              value={values.startTime}
              onChange={(e) => update('startTime', e.target.value)}
            />
          </label>
          <label className="field">
            Giờ kết thúc
            <input
              type="time"
              required
              value={values.endTime}
              onChange={(e) => update('endTime', e.target.value)}
            />
          </label>
          <label className="field">
            Ca / công việc
            <input
              required
              maxLength={200}
              value={values.work}
              onChange={(e) => update('work', e.target.value)}
            />
          </label>
          <label className="field">
            Vị trí
            <input
              maxLength={100}
              value={values.position}
              onChange={(e) => update('position', e.target.value)}
            />
          </label>
        </fieldset>
        {error && (
          <p role="alert" className="text-red-600">
            {error}
          </p>
        )}
        <div className="flex justify-end gap-3">
          <button type="button" disabled={busy} className="btn-secondary" onClick={onClose}>
            Hủy
          </button>
          <button disabled={busy} className="btn-primary">
            {busy ? 'Đang lưu…' : 'Lưu lịch làm việc'}
          </button>
        </div>
      </form>
    </FormModal>
  );
}

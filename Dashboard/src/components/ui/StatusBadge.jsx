import { showtimeStatusColors, showtimeStatusLabels } from '@/utils/showtimeStatus';
import { onlineOrderLabels } from '@/utils/apiContract';
const labels = {
  PUBLISHED: 'Đã xuất bản',
  DRAFT: 'Bản nháp',
  HIDDEN: 'Đã ẩn',
  PENDING: 'Chờ xử lý',
  APPROVED: 'Đã duyệt',
  UNREAD: 'Chưa đọc',
  READ: 'Đã đọc',
  REPLIED: 'Đã phản hồi',
  PAID: 'Đã thanh toán',
  CANCELLED: 'Đã hủy',
  ACTIVE: 'Hoạt động',
  INACTIVE: 'Tạm khóa',
  ...showtimeStatusLabels,
};
export default function StatusBadge({ value }) {
  return (
    <span
      className={
        'inline-flex rounded-full px-2.5 py-1 text-xs font-medium ' +
        (showtimeStatusColors[value] ||
          (['PUBLISHED', 'APPROVED', 'PAID', 'ACTIVE'].includes(value)
            ? 'bg-emerald-50 text-emerald-700'
            : ['HIDDEN', 'CANCELLED', 'INACTIVE', 'EXPIRED'].includes(value)
              ? 'bg-gray-100 text-gray-600'
              : 'bg-amber-50 text-amber-700'))
      }
    >
      {onlineOrderLabels[value] || labels[value] || value}
    </span>
  );
}

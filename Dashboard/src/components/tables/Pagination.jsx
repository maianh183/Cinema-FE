export default function Pagination({ page, pageSize = 10, total, onChange }) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const current = Math.min(page, pages);
  return (
    <nav
      aria-label="Phân trang"
      className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 p-4 text-sm text-gray-500"
    >
      <span>
        {total === 0 ? 0 : (current - 1) * pageSize + 1}–{Math.min(current * pageSize, total)} /{' '}
        {total} bản ghi
      </span>
      <div className="flex items-center gap-3">
        <button
          className="btn-secondary"
          disabled={current <= 1}
          onClick={() => onChange(current - 1)}
        >
          Trước
        </button>
        <span>
          Trang {current}/{pages}
        </span>
        <button
          className="btn-secondary"
          disabled={current >= pages}
          onClick={() => onChange(current + 1)}
        >
          Sau
        </button>
      </div>
    </nav>
  );
}

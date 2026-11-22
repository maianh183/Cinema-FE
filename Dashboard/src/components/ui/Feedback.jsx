export function ErrorState({ error, retry }) {
  return (
    <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-6 text-red-800">
      <p>{error?.message || error || 'Không thể tải dữ liệu.'}</p>
      {retry && (
        <button className="btn-secondary mt-4" onClick={retry}>
          Thử lại
        </button>
      )}
    </div>
  );
}
export function LoadingState() {
  return (
    <div role="status" className="py-20 text-center text-gray-500">
      Đang tải dữ liệu…
    </div>
  );
}
export function EmptyState() {
  return <div className="py-16 text-center text-gray-500">Không có dữ liệu phù hợp.</div>;
}

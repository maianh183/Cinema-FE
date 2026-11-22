import { Receipt, Clock, DollarSign, Ticket } from 'lucide-react';
import { normalizeOrderStatus } from '@/utils/business';
export default function OrderStats({ orders, role }) {
  const paid = orders.filter((o) => normalizeOrderStatus(o.orderStatus) === 'PAID');
  const cards = [
    { label: 'Tổng số đơn hàng', value: orders.length, Icon: Receipt },
    {
      label: 'Đơn chưa xử lý',
      value: orders.filter(
        (o) => o.source === 'STAFF' && normalizeOrderStatus(o.orderStatus) === 'PENDING',
      ).length,
      Icon: Clock,
    },
  ];
  if (role !== 'STAFF')
    cards.push(
      {
        label: 'Tổng doanh thu',
        value: paid
          .reduce((n, o) => n + Number(o.total), 0)
          .toLocaleString('vi-VN', { style: 'currency', currency: 'VND' }),
        Icon: DollarSign,
      },
      {
        label: 'Vé đã bán',
        value: paid.reduce((n, o) => n + (o.ticketDetails?.length || 0), 0),
        Icon: Ticket,
      },
    );
  return (
    <div
      className={`grid grid-cols-1 sm:grid-cols-2 ${role === 'STAFF' ? '' : 'xl:grid-cols-4'} gap-4 mb-6`}
    >
      {cards.map(({ label, value, Icon }) => (
        <section key={label} aria-label={label} className="bg-white rounded-2xl border p-5">
          <Icon className="text-indigo-600 bg-indigo-50 rounded-lg p-2 mb-3" size={40} />
          <h2 className="text-sm text-gray-500">{label}</h2>
          <p className="text-2xl font-semibold mt-1" data-stat-value>
            {value}
          </p>
        </section>
      ))}
    </div>
  );
}

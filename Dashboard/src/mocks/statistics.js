import { inBranchScope } from '../utils/schedule';
import { businessTime } from '../utils/business';
export function statistics(db, session, params, id, path, ok) {
  const scoped = (row) =>
    inBranchScope(session, row.branchId) &&
    (!params.branchId || String(row.branchId) === String(params.branchId));
  const dated = (date) =>
    (!params.startDate || date >= params.startDate) && (!params.endDate || date <= params.endDate);
  const orders = db.orders.filter((o) => scoped(o) && dated(o.orderTime.slice(0, 10))),
    paid = orders.filter((o) => o.orderStatus === 'PAID');
  const tickets = paid.flatMap((o) => o.ticketDetails),
    revenue = paid.reduce((s, o) => s + o.total, 0);
  const daily = Object.values(
    paid.reduce((a, o) => {
      const date = o.orderTime.slice(0, 10);
      a[date] ||= { date, revenue: 0, ticketCount: 0 };
      a[date].revenue += o.total;
      a[date].ticketCount += o.ticketDetails.length;
      return a;
    }, {}),
  ).sort((a, b) => a.date.localeCompare(b.date));
  const occupancy = db.showtimes
    .filter((s) => scoped(s) && dated(s.day))
    .map((s) => {
      const capacity =
          db.rooms.find((r) => r.branchId === s.branchId && r.roomId === s.roomId)?.rCapacity || 0,
        ticketsSold = db.orders
          .filter((o) => o.orderStatus === 'PAID')
          .flatMap((o) => o.ticketDetails)
          .filter((t) => t.showtimeId === s.timeId).length;
      return {
        ...s,
        showtimeId: s.timeId,
        capacity,
        ticketsSold,
        occupancyRate: capacity ? (ticketsSold / capacity) * 100 : 0,
      };
    });
  if (id === 'overview')
    return ok({
      totalRevenue: revenue,
      ticketsSold: tickets.length,
      activeMovies: db.movies.filter(
        (m) =>
          businessTime(m.releaseDate) <= Date.now() &&
          businessTime(m.closingDate, true) >= Date.now(),
      ).length,
      totalMovies: db.movies.length,
      totalCustomers: db.customers.length,
      totalEmployees: db.employees.filter(scoped).length,
      totalShowtimes: db.showtimes.filter(scoped).length,
      totalOrders: orders.length,
      totalReviews: db['cinema-reviews'].filter((r) => scoped(r) && r.contentStatus !== 'DELETED')
        .length,
      averageRating: null,
      revenueTrends: daily,
      seatOccupancy: occupancy.reduce((n, s) => n + s.capacity, 0)
        ? (occupancy.reduce((n, s) => n + s.ticketsSold, 0) /
            occupancy.reduce((n, s) => n + s.capacity, 0)) *
          100
        : 0,
      recentOrders: [...orders].sort((a, b) => b.orderTime.localeCompare(a.orderTime)).slice(0, 5),
      latestMovies: db.movies.slice(-5),
    });
  if (path.endsWith('/daily')) return ok(daily);
  if (path.endsWith('/movie'))
    return ok(
      Object.values(
        tickets.reduce((a, t) => {
          a[t.movieId] ||= {
            movieId: t.movieId,
            movieName: t.movieName,
            revenue: 0,
            ticketCount: 0,
          };
          a[t.movieId].revenue += t.price;
          a[t.movieId].ticketCount++;
          return a;
        }, {}),
      ),
    );
  if (path.endsWith('/branch'))
    return ok(
      db.branches.filter(scoped).map((b) => ({
        branchId: b.branchId,
        branchName: b.bName,
        revenue: paid.filter((o) => o.branchId === b.branchId).reduce((s, o) => s + o.total, 0),
        ticketCount: paid
          .filter((o) => o.branchId === b.branchId)
          .reduce((s, o) => s + o.ticketDetails.length, 0),
      })),
    );
  if (id === 'occupancy') return ok(occupancy);
}

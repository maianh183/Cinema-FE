import test from 'node:test';
import assert from 'node:assert/strict';
import {
  dateBoundary,
  periodStatus,
  productStatus,
  couponDiscount,
  validRating,
  validateComment,
  validateReview,
  isFutureShowtime,
} from '../src/lib/business.js';
import { createRepository } from '../src/mocks/repository.js';
const now = Date.parse('2026-10-26T09:00:00+07:00');
const login = (repo) =>
  repo.request('POST', '/auth/login', {
    email: 'customer@cinema.test',
    password: 'DemoCinema123!',
  });
test('rating is an integer 1–5, optional content is trimmed', () => {
  for (const bad of [0, 6, 10, 1.5, '5', NaN, null]) assert.equal(validRating(bad), false);
  assert.deepEqual(validateComment({ movieId: 1, rating: 5, content: '   ' }), {
    movieId: 1,
    rating: 5,
    content: null,
  });
  assert.throws(() => validateComment({ movieId: 1, rating: 10 }));
});
test('Vietnam date boundaries and product windows fail closed', () => {
  assert.equal(periodStatus({ startDate: '2026-10-26', endDate: '2026-10-26' }, now), 'ACTIVE');
  assert.equal(dateBoundary('2026-10-26', true), Date.parse('2026-10-26T23:59:59.999+07:00'));
  const p = {
    itemType: 'FOOD_DRINK',
    price: 100,
    quantity: 2,
    startDate: '2026-10-27',
    endDate: '2026-10-28',
  };
  assert.equal(productStatus(p, now), 'PREACTIVE');
  assert.equal(productStatus({ ...p, startDate: '2026-10-25', quantity: 0 }, now), 'OUT_OF_STOCK');
  assert.equal(productStatus({ ...p, startDate: '' }, now), 'UNKNOWN');
  assert.equal(productStatus({ ...p, quantity: -1 }, now), 'INVALID');
  assert.equal(periodStatus({ ...p, startDate: '2026-02-30' }, now), 'INVALID');
});
test('voucher minimum, cap, stock and time are checked', () => {
  const c = {
    startDate: '2026-10-01',
    endDate: '2026-10-31',
    availNum: 2,
    releaseNum: 3,
    saleOff: 50,
    minOrderTotal: 100,
    maxDiscount: 60,
  };
  assert.equal(couponDiscount(c, 200, now), 60);
  assert.equal(couponDiscount(c, 90, now), 0);
  assert.equal(couponDiscount({ ...c, availNum: 0 }, 200, now), 0);
  assert.equal(couponDiscount({ ...c, startDate: '2026-11-01' }, 200, now), 0);
});
test('cinema review validates composite branch/room keys and has no rating', () => {
  const rows = [
    { branchId: 1, roomId: 1 },
    { branchId: 2, roomId: 2 },
  ];
  assert.throws(() => validateReview({ branchId: 1, roomId: 2, content: 'ok' }, rows));
  assert.throws(() => validateReview({ branchId: 1, content: '  ' }, rows));
  assert.deepEqual(validateReview({ branchId: 1, roomId: 1, content: ' ok ', rating: 5 }, rows), {
    branchId: 1,
    roomId: 1,
    content: 'ok',
  });
});
test('public fixture relationships and fields match the reference models', () => {
  const { db } = createRepository({ now: () => now });
  for (const c of db['movie-comments']) assert.ok(db.movies.some((m) => m.movieId === c.movieId));
  for (const r of db['cinema-reviews']) {
    assert.ok(db.branches.some((b) => b.branchId === r.branchId));
    if (r.roomId)
      assert.ok(db.rooms.some((x) => x.branchId === r.branchId && x.roomId === r.roomId));
    assert.equal('rating' in r, false);
  }
  assert.ok(!JSON.stringify(db.branches).includes('managerId'));
  assert.ok(!('employees' in db));
  for (const o of db.orders)
    for (const t of o.ticketDetails)
      assert.ok(
        db.showtimes.some(
          (s) => s.timeId === t.showtimeId && s.branchId === t.branchId && s.roomId === t.roomId,
        ),
      );
});
test('comment/report identity comes from session and reports do not remove content', async () => {
  const r = createRepository({ now: () => now });
  await assert.rejects(r.request('POST', '/movie-comments', { movieId: 1, rating: 5 }), {
    status: 401,
  });
  await login(r);
  const c = await r.request('POST', '/movie-comments', {
    movieId: 1,
    rating: 3,
    content: '',
    userId: 'ATTACKER',
  });
  assert.equal(c.userId, 'KH001');
  assert.equal(c.content, null);
  const report = await r.request('POST', '/comment-reports', {
    targetType: 'MOVIE_COMMENT',
    targetId: c.commentId,
    reason: 'Spam',
    reporterId: 'ATTACKER',
  });
  assert.equal(report.reporterId, 'KH001');
  assert.equal(report.status, 'PENDING');
  assert.equal(c.contentStatus, 'VISIBLE');
  await assert.rejects(
    r.request('POST', '/comment-reports', {
      targetType: 'MOVIE_COMMENT',
      targetId: c.commentId,
      reason: 'Spam',
    }),
    { status: 409 },
  );
  c.contentStatus = 'DELETED';
  assert.ok(
    !(await r.request('GET', '/public/movies/1/comments')).some((x) => x.commentId === c.commentId),
  );
});
test('public content never exposes drafts or hidden articles', async () => {
  const r = createRepository({ now: () => now });
  for (const path of ['/public/news', '/public/faq'])
    assert.ok((await r.request('GET', path)).every((x) => x.status === 'PUBLISHED'));
});
test('holds are scoped by showtime, conflict, expire and release', async () => {
  let clock = now;
  const r = createRepository({ now: () => clock });
  await login(r);
  const future = r.db.showtimes.filter((s) => isFutureShowtime(s, clock)),
    a = future[0],
    b = future.find(
      (s) => s.branchId === a.branchId && s.roomId === a.roomId && s.timeId !== a.timeId,
    );
  const hold = await r.request('POST', '/seat-reservations', {
    timeId: a.timeId,
    seats: [{ sRow: 1, sColumn: 2 }],
  });
  assert.equal(r.seatMap(a.timeId).find((s) => s.sRow === 1 && s.sColumn === 2).holdStatus, 'OWN');
  assert.equal(r.seatMap(b.timeId).find((s) => s.sRow === 1 && s.sColumn === 2).holdStatus, 'FREE');
  await r.request('POST', '/auth/register', {
    cName: 'Other',
    email: 'other@example.test',
    password: 'Password123!',
  });
  await assert.rejects(
    r.request('POST', '/seat-reservations', {
      timeId: a.timeId,
      seats: [{ sRow: 1, sColumn: 2 }],
    }),
    { status: 409 },
  );
  await assert.rejects(r.request('GET', '/seat-reservations/' + hold.reservationId), {
    status: 403,
  });
  clock += 600001;
  assert.equal(r.seatMap(a.timeId).find((s) => s.sRow === 1 && s.sColumn === 2).holdStatus, 'FREE');
});
test('checkout ignores client prices, is idempotent, and never fabricates PAID', async () => {
  const r = createRepository({ now: () => now });
  await login(r);
  const st = r.db.showtimes.find((s) => isFutureShowtime(s, now)),
    hold = await r.request('POST', '/seat-reservations', {
      timeId: st.timeId,
      seats: [{ sRow: 1, sColumn: 3 }],
    });
  const payload = {
    reservationId: hold.reservationId,
    addons: [],
    idempotencyKey: 'test-order',
    total: 1,
    orderStatus: 'PAID',
    branchId: 999,
  };
  const o = await r.request('POST', '/customer/orders', payload);
  assert.equal(o.total, st.rPrice);
  assert.equal(o.branchId, st.branchId);
  assert.equal(o.orderStatus, 'AWAITING_PAYMENT');
  assert.equal((await r.request('POST', '/customer/orders', payload)).orderId, o.orderId);
  assert.equal((await r.request('POST', `/customer/orders/${o.orderId}/payment`)).demo, true);
  assert.equal(
    (await r.request('GET', `/customer/orders/${o.orderId}`)).orderStatus,
    'AWAITING_PAYMENT',
  );
  await r.request('POST', '/auth/register', {
    cName: 'Other',
    email: 'other@example.test',
    password: 'Password123!',
  });
  await assert.rejects(r.request('GET', `/customer/orders/${o.orderId}`), {
    status: 403,
  });
});

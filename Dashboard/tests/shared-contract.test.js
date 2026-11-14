import { describe, it, expect } from 'vitest';
import {
  fullList,
  sessionUser,
  orderDto,
  productKey,
  orderBlocksSeat,
} from '../src/utils/apiContract';
import { canConfirmOrder, canCancelOrder, nextCouponAvailable } from '../src/utils/business';
import { can } from '../src/utils/permissions';
import { movieComment, cinemaReview, validMovieRating } from '../src/utils/contentModels';
import { orderDraft } from '../src/mocks/orderDraft';
import { mockAdapter, resetMock } from '../src/mocks/adapter';

const staff = {
  id: 'NV003',
  role: 'STAFF',
  branchId: 1,
  permissions: ['orders:confirm-payment', 'orders:cancel'],
};
const order = {
  orderId: 100,
  branchId: 1,
  source: 'STAFF',
  createdByEmployeeId: 'NV003',
  orderStatus: 'PENDING',
  total: 80000,
  ticketDetails: [{ showtimeId: 7 }],
};
describe('Shared contract read compatibility', () => {
  it('supports full arrays and complete envelopes, rejects silent truncation', () => {
    const rows = [order];
    expect(fullList({ data: rows })).toBe(rows);
    expect(fullList({ data: rows, pagination: { total: 1, page: 1 } })).toBe(rows);
    expect(fullList({ data: { items: rows, total: 1, page: 1 } })).toBe(rows);
    for (const response of [
      { data: rows, pagination: { total: 2, page: 1 } },
      { data: rows, pagination: { total: 1, page: 2 } },
      { data: { items: rows, total: 3 } },
      { data: {} },
    ])
      expect(() => fullList(response)).toThrow();
  });
  it('accepts nested session and legacy flat employee without granting CUSTOMER access', () => {
    expect(
      sessionUser({ user: { ...staff, role: 'ROLE_STAFF' }, csrfToken: 'csrf' }),
    ).toMatchObject({ id: 'NV003', role: 'STAFF', csrfToken: 'csrf' });
    expect(sessionUser(staff)).toMatchObject(staff);
    for (const user of [
      { ...staff, role: 'CUSTOMER', permissions: ['*'] },
      { ...staff, id: 3 },
    ])
      expect(() => sessionUser(user)).toThrow();
    expect(can({ role: 'CUSTOMER', permissions: ['*'] }, 'orders')).toBe(false);
    expect(can({ role: 'ADMIN', permissions: [] }, 'orders')).toBe(false);
  });
  for (const role of ['STAFF', 'MANAGER', 'ADMIN'])
    it(role + ' can only confirm/cancel eligible counter orders', () => {
      const user = { ...staff, role };
      expect(canConfirmOrder(user, order)).toBe(true);
      expect(canCancelOrder(user, order)).toBe(true);
      for (const patch of [
        { orderStatus: 'PAID' },
        { orderStatus: 'AWAITING_PAYMENT' },
        { orderStatus: 'EXPIRED' },
        { source: 'CUSTOMER' },
        { source: null },
      ]) {
        expect(canConfirmOrder(user, { ...order, ...patch })).toBe(false);
        expect(canCancelOrder(user, { ...order, ...patch })).toBe(false);
      }
      expect(canConfirmOrder({ ...user, permissions: [] }, order)).toBe(false);
    });
  it('preserves online/unknown states; rejects wrong IDs, scope, prices and FK aliases', () => {
    for (const orderStatus of ['AWAITING_PAYMENT', 'EXPIRED', 'UNRECOGNIZED'])
      expect(orderDto({ ...order, orderStatus }, staff).orderStatus).toBe(orderStatus);
    for (const patch of [
      { branchId: 2 },
      { orderId: '100' },
      { total: '80000' },
      { ticketDetails: [{ showtimeId: 7, timeId: 8 }] },
    ])
      expect(() => orderDto({ ...order, ...patch }, staff, 100)).toThrow();
    expect(() => orderDto(order, staff, 101)).toThrow();
    expect(orderDto({ ...order, branchId: 2 }, { ...staff, role: 'ADMIN' }).branchId).toBe(2);
    expect(() =>
      orderDto({ ...order, branchId: 2 }, { ...staff, role: 'MANAGER', branchIds: [1, 2] }),
    ).toThrow();
  });
  it('keeps MovieComment, CinemaReview and nullable comment semantics separate', () => {
    const comment = movieComment({ commentId: 1, movieId: 2, rating: 5, content: null });
    expect(comment.content).toBeNull();
    expect(validMovieRating(comment.rating)).toBe(true);
    for (const rating of [0, 6, 2.5, '5']) expect(validMovieRating(rating)).toBe(false);
    const review = cinemaReview({ reviewId: 1, branchId: 2, content: 'Review', rating: 5 });
    expect(review.roomId).toBeNull();
    expect(review).not.toHaveProperty('rating');
  });
  it('voucher release increase preserves used count, independent of merchandise stock', () => {
    expect(nextCouponAvailable({ releaseNum: 100, availNum: 70 }, 120)).toBe(90);
    expect(() => nextCouponAvailable({ releaseNum: 100, availNum: 70 }, 99)).toThrow();
  });
});

const draftFixture = () => ({
  customers: [],
  orders: [],
  branches: [{ branchId: 1, bName: 'Branch' }],
  movies: [{ movieId: 2, mName: 'Movie' }],
  showtimes: [
    {
      timeId: 7,
      branchId: 1,
      roomId: 1,
      movieId: 2,
      day: '2026-11-06',
      startTime: '10:00',
      rPrice: 1,
    },
  ],
  rooms: [
    { branchId: 2, roomId: 1, basePrice: 1 },
    { branchId: 1, roomId: 1, basePrice: 80000 },
  ],
  seats: [{ branchId: 1, roomId: 1, sRow: 1, sColumn: 1, sStatus: true, sPrice: 10000 }],
  'food-drinks': [{ productId: 1, pName: 'Drink', pType: 'DRINK', price: 20000, quantity: 10 }],
  merchandise: [{ productId: 1, merchName: 'Toy', price: 30000, availNum: 5 }],
});
const payload = {
  branchId: 1,
  tickets: [{ showtimeId: 7, branchId: 1, roomId: 1, sRow: 1, sColumn: 1, tPrice: 1 }],
};
const fail = (status, message) => {
  throw Object.assign(new Error(message), { status });
};
describe('POS shared IDs and authoritative mock pricing', () => {
  it('uses composite room and product keys, never client prices or derived rPrice', () => {
    const result = orderDraft(
      draftFixture(),
      staff,
      {
        ...payload,
        addons: [
          { productId: 1, itemType: 'FOOD_DRINK', quantity: 1, price: 1 },
          { productId: 1, itemType: 'MERCHANDISE', quantity: 2, price: 1 },
        ],
      },
      fail,
    );
    expect(result.total).toBe(170000);
    expect(result.ticketDetails[0]).toMatchObject({
      showtimeId: 7,
      branchId: 1,
      roomId: 1,
      price: 90000,
    });
    expect(new Set(result.addonDetails.map(productKey)).size).toBe(2);
    expect(() =>
      orderDraft(
        draftFixture(),
        staff,
        { ...payload, addons: [{ productId: 1, quantity: 1 }] },
        fail,
      ),
    ).toThrow();
  });
  it('blocks an online held seat without converting online status to counter pending', () => {
    const db = draftFixture();
    db.orders = [
      {
        ...order,
        source: 'CUSTOMER',
        orderStatus: 'AWAITING_PAYMENT',
        ticketDetails: [{ ticketId: 1, showtimeId: 7, sRow: 1, sColumn: 1 }],
      },
    ];
    expect(() => orderDraft(db, staff, payload, fail)).toThrow('Ghế đã được đặt');
    db.orders[0].orderStatus = 'EXPIRED';
    expect(orderDraft(db, staff, payload, fail).total).toBe(90000);
    expect(orderBlocksSeat({ orderStatus: 'AWAITING_PAYMENT' })).toBe(true);
    expect(orderBlocksSeat({ orderStatus: 'EXPIRED' })).toBe(false);
  });
  it('mock exposes nested cookie-session DTO and rejects non-POST confirm', async () => {
    resetMock();
    const request = (url, method = 'get', data = {}) =>
      mockAdapter({ url, method, data: JSON.stringify(data), headers: {} });
    expect((await request('/auth/csrf')).data.data.csrfToken).toBeTruthy();
    const result = (
      await request('/auth/login', 'post', { email: 'staff@cinema.test', password: 'Demo@12345' })
    ).data.data;
    expect(result.user.id).toBe('NV003');
    expect(result.csrfToken).toBeTruthy();
    await expect(request('/orders/100/confirm-payment', 'put')).rejects.toMatchObject({
      response: { status: 405 },
    });
    expect((await request('/orders/100')).data.data.orderStatus).toBe('PENDING');
  });
});

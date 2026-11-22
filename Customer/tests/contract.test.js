import test from 'node:test';
import assert from 'node:assert/strict';
import {
  responseData,
  customerFromResponse,
  profileRequest,
  numericId,
  routeId,
  publicDto,
  publicCoupons,
  reportRequest,
  reportResponse,
  orderRequest,
  orderResponse,
  paymentResponse,
  paymentHistory,
  reservationResponse,
} from '../src/services/adapters.js';
import { createRepository } from '../src/mocks/repository.js';
import { couponDiscount, productKey, stock } from '../src/lib/business.js';

test('list envelopes accept complete arrays and reject silent pagination or false success', () => {
  const rows = [{ movieId: 1 }];
  for (const envelope of [
    rows,
    { success: true, data: rows },
    { success: true, data: rows, meta: { total: 1, page: 1, pageSize: 10 } },
    { success: true, data: { items: rows, total: 1 } },
  ]) {
    assert.deepEqual(responseData(envelope, { list: true }), rows);
  }
  for (const envelope of [
    { success: true, data: rows, meta: { total: 2, page: 1 } },
    { success: true, data: rows, meta: { total: 1, page: 2 } },
    { success: true, data: { items: rows, total: 9 } },
    { success: true, data: { items: rows } },
    { success: true, data: null },
    { data: rows },
  ])
    assert.throws(() => responseData(envelope, { list: true }));
  const errors = { cName: ['Required'] };
  assert.throws(
    () => responseData({ success: false, message: 'Not saved', errors }),
    (error) => error.message === 'Not saved' && error.errors === errors,
  );
});

test('canonical, core session and legacy customer profiles map to the same UI aliases', () => {
  const common = {
    email: 'a@example.test',
    role: 'CUSTOMER',
    avatarUrl: '/avatar.png',
  };
  const expected = {
    userId: 'KH1',
    fullName: 'An',
    phone: '0901234567',
    gender: 'F',
    dob: '2000-01-01',
    ...common,
    csrfToken: 'csrf',
  };
  const variants = [
    {
      cUserId: 'KH1',
      cName: 'An',
      phoneNumber: '0901234567',
      sex: 'F',
      birthday: '2000-01-01',
      ...common,
      csrfToken: 'csrf',
    },
    {
      id: 'KH1',
      name: 'An',
      phoneNumber: '0901234567',
      sex: 'F',
      birthday: '2000-01-01',
      ...common,
      role: 'ROLE_CUSTOMER',
      csrfToken: 'csrf',
    },
    expected,
  ];
  for (const user of variants) {
    assert.deepEqual(customerFromResponse(user), expected);
    assert.deepEqual(
      customerFromResponse({
        user: {
          ...user,
          salary: 100,
          permissions: ['admin'],
          branchId: 1,
          accessToken: 'secret',
        },
        csrfToken: 'csrf',
      }),
      expected,
    );
  }
});

test('auth rejects token-only, internal roles, numeric customer IDs and conflicting identity', () => {
  for (const data of [
    { accessToken: 'token' },
    { cUserId: 1, role: 'CUSTOMER' },
    { id: 'NV1', role: 'ADMIN' },
    { id: 'KH1' },
    { cUserId: 'KH1', userId: 'KH2', role: 'CUSTOMER' },
  ]) {
    assert.throws(() => customerFromResponse(data));
  }
  const previous = customerFromResponse({ cUserId: 'KH1', role: 'CUSTOMER' });
  assert.throws(() => customerFromResponse({ cUserId: 'KH2', role: 'CUSTOMER' }, previous));
  assert.throws(() => customerFromResponse({}, previous));
});

test('profile writes canonical fields only; unsupported birthday is omitted from real requests', () => {
  const previous = customerFromResponse({
    cUserId: 'KH1',
    cName: 'An',
    role: 'CUSTOMER',
    birthday: '2000-01-01',
  });
  const values = {
    fullName: '  New  ',
    phone: '0901234567',
    gender: 'F',
    dob: '2000-01-01',
    userId: 'ATTACKER',
    role: 'ADMIN',
    email: 'other@test',
  };
  const canonical = { cName: 'New', phoneNumber: '0901234567', sex: 'F' };
  assert.deepEqual(profileRequest(values, { previous }), canonical);
  assert.equal(customerFromResponse({ cUserId: 'KH1', cName: 'New' }, previous).dob, '2000-01-01');
  for (const dob of ['', undefined, null, '2001-01-01']) {
    assert.deepEqual(profileRequest({ ...values, dob, birthday: dob }), canonical);
    assert.deepEqual(profileRequest({ ...values, dob }, { previous }), canonical);
    assert.equal(profileRequest({ ...values, dob }, { mock: true }).birthday, dob ?? '');
  }
  const { dob: omittedBirthday, ...withoutBirthday } = values;
  assert.equal(omittedBirthday, '2000-01-01');
  assert.deepEqual(profileRequest(withoutBirthday), canonical);
  assert.deepEqual(profileRequest(withoutBirthday, { mock: true }), canonical);
  assert.deepEqual(profileRequest(values), canonical);
  assert.deepEqual(profileRequest(values, { mock: true }), {
    ...canonical,
    birthday: '2000-01-01',
  });
});

test('DTO IDs stay numeric; only URL boundaries convert numeric route parameters', () => {
  assert.equal(routeId('42'), 42);
  for (const id of ['KH1', '1.5', '1e2', '-1', 0, -1, null, NaN]) assert.throws(() => routeId(id));
  assert.throws(() => numericId('1'));
  assert.throws(() => publicDto('movie', { movieId: '1' }));
  assert.throws(() => publicDto('room', { branchId: 2, roomId: 1 }, { branchId: 1 }));
  assert.deepEqual(
    publicDto('room', {
      branchId: 1,
      roomId: 1,
      managerId: 'NV1',
      salary: 100,
    }),
    { branchId: 1, roomId: 1 },
  );
  assert.throws(() =>
    publicDto('showtime', {
      showtimeId: 1,
      movieId: 1,
      branchId: 1,
      roomId: 1,
      rPrice: 100,
    }),
  );
  assert.throws(
    () =>
      publicDto('showtime', {
        timeId: 1,
        movieId: 1,
        branchId: 1,
        roomId: 1,
        basePrice: 100,
      }),
    /O-05/,
  );
});

test('public projections preserve composite product keys and exclude internal attributes', () => {
  const food = publicDto('product', {
    itemType: 'FOOD_DRINK',
    productId: 1,
    quantity: 4,
    price: 10,
    supplierSecret: 'private',
  });
  const merch = publicDto('product', {
    itemType: 'MERCHANDISE',
    productId: 1,
    availNum: 7,
    price: 10,
  });
  assert.notEqual(productKey(food), productKey(merch));
  assert.equal(stock(food), 4);
  assert.equal(stock(merch), 7);
  assert.equal('supplierSecret' in food, false);
  assert.throws(() => publicDto('product', { productId: 1 }));
  assert.throws(() => publicDto('news', { id: 1, tags: ['news'] }));
  assert.equal(publicDto('news', { id: 1, tags: 'news,cinema' }).tags, 'news,cinema');
  assert.throws(() => publicDto('comment', { commentId: 1, movieId: 1, rating: 4.5 }));
  const review = publicDto('review', {
    reviewId: 1,
    branchId: 1,
    roomId: null,
    rating: 5,
    movieId: 1,
    salary: 1,
  });
  assert.equal('rating' in review, false);
  assert.equal('movieId' in review, false);
  const movie = publicDto('movie', {
    movieId: 1,
    genres: [
      'Drama',
      { genre: 'Comedy', salary: 1 },
      { genreName: 'Action' },
      { name: 'Animation' },
    ],
    actors: [
      { fullName: 'Actor A', email: 'private@test' },
      { actorName: 'Actor B' },
      { name: 'Actor C' },
    ],
    formats: [{ formatName: '2D' }, { name: '3D' }],
  });
  assert.deepEqual(movie.genres, ['Drama', 'Comedy', 'Action', 'Animation']);
  assert.deepEqual(movie.actors, ['Actor A', 'Actor B', 'Actor C']);
  assert.deepEqual(movie.formats, ['2D', '3D']);
  assert.throws(() => publicDto('movie', { movieId: 1, genres: [{ genreId: 1 }] }));
});

test('public vouchers follow VN day boundaries, stock and legacy migration; zero cap remains unlimited', () => {
  const coupon = {
    couponId: 1,
    startDate: '2026-11-04',
    endDate: '2026-11-04',
    releaseNum: 5,
    availNum: 5,
    saleOff: 20,
    minOrderTotal: 0,
    maxDiscount: 0,
  };
  const start = Date.parse('2026-11-03T17:00:00Z'),
    end = Date.parse('2026-11-04T16:59:59.999Z');
  assert.equal(publicCoupons([coupon], start - 1).length, 0);
  assert.equal(publicCoupons([coupon], start).length, 1);
  assert.equal(publicCoupons([coupon], end).length, 1);
  assert.equal(publicCoupons([coupon], end + 1).length, 0);
  assert.equal(publicCoupons([{ ...coupon, availNum: 0 }], start).length, 0);
  assert.equal(publicCoupons([{ ...coupon, availNum: 6 }], start).length, 0);
  assert.throws(() => publicCoupons([{ ...coupon, isActive: false }], start), /O-08/);
  assert.equal(couponDiscount(coupon, 100000, start), 20000);
});

test('report writes are target-specific, session-owned and only acknowledge PENDING', () => {
  for (const targetType of ['MOVIE_COMMENT', 'CINEMA_REVIEW']) {
    const body = reportRequest({
      targetType,
      targetId: 1,
      reason: ' Spam ',
      reporterId: 'ATTACKER',
      status: 'RESOLVED',
    });
    assert.deepEqual(body, { targetType, targetId: 1, reason: 'Spam' });
    assert.equal(reportResponse({ reportId: 7, status: 'PENDING', ...body }, body).reportId, 7);
    assert.equal(reportResponse({ id: 7, status: 'PENDING' }, body).reportId, 7);
    assert.throws(() => reportResponse({ reportId: 7, status: 'RESOLVED' }, body));
    assert.throws(() => reportResponse({ reportId: 7, status: 'PENDING', targetId: 2 }, body));
  }
  assert.throws(() => reportRequest({ targetType: 'MOVIE', targetId: 1, reason: 'Spam' }));
  assert.throws(() =>
    reportRequest({
      targetType: 'MOVIE_COMMENT',
      targetId: '1',
      reason: 'Spam',
    }),
  );
});

test('order requests exclude client authority; response status/source are never fabricated', () => {
  const values = {
    reservationId: 'hold',
    addons: [{ itemType: 'MERCHANDISE', productId: 1, quantity: 2, price: 1 }],
    couponId: 2,
    idempotencyKey: 'key',
    total: 1,
    userId: 'KH2',
    source: 'STAFF',
    orderStatus: 'PAID',
  };
  assert.deepEqual(orderRequest(values), {
    reservationId: 'hold',
    addons: [{ itemType: 'MERCHANDISE', productId: 1, quantity: 2 }],
    couponId: 2,
    idempotencyKey: 'key',
  });
  assert.throws(() => orderRequest({ ...values, couponId: '2' }));
  const base = { orderId: 1, source: 'CUSTOMER', total: 100 };
  assert.throws(() =>
    orderResponse({ ...base, source: 'STAFF', orderStatus: 'PENDING' }, undefined, {
      source: 'CUSTOMER',
    }),
  );
  assert.throws(() =>
    orderResponse({ orderId: 1, orderStatus: 'AWAITING_PAYMENT', total: 100 }, undefined, {
      source: 'CUSTOMER',
    }),
  );
  for (const orderStatus of [
    'AWAITING_PAYMENT',
    'EXPIRED',
    'FAILED',
    'REFUNDED',
    'UNKNOWN_BACKEND_ENUM',
    'PAID',
  ]) {
    assert.equal(
      orderResponse({ ...base, orderStatus, paymentStatus: 'SUCCESS' }, 1).orderStatus,
      orderStatus,
    );
  }
  assert.throws(() => orderResponse({ ...base, orderStatus: 'PENDING' }), /O-01/);
  assert.equal(
    orderResponse({ ...base, source: 'STAFF', orderStatus: 'PENDING' }).orderStatus,
    'PENDING',
  );
  assert.throws(() => orderResponse({ ...base, orderStatus: 'PAID' }, 2));
  assert.throws(() => orderResponse({ ...base, orderId: '1', orderStatus: 'PAID' }));
  const ticket = { showtimeId: 7, timeId: 7 };
  assert.equal(
    orderResponse({ ...base, orderStatus: 'PAID', ticketDetails: [ticket] }).ticketDetails[0]
      .showtimeId,
    7,
  );
  assert.throws(() =>
    orderResponse({
      ...base,
      orderStatus: 'PAID',
      ticketDetails: [{ ...ticket, timeId: 8 }],
    }),
  );
});

test('payment initiation requires HTTPS and demo acknowledgments cannot escape Mock Mode', () => {
  for (const paymentUrl of [
    'http://example.test',
    'javascript:alert(1)',
    '/payment',
    'https://user:pass@example.test',
  ])
    assert.throws(() => paymentResponse({ paymentUrl }));
  assert.throws(() => paymentResponse({ demo: true, orderId: 1 }));
  assert.equal(paymentResponse({ demo: true, orderId: 1 }, { mock: true }).demo, true);
  assert.deepEqual(
    paymentResponse({
      paymentUrl: 'https://pay.example.test/session',
      demo: true,
    }),
    { paymentUrl: 'https://pay.example.test/session' },
  );
  const history = paymentHistory({
    paymentId: 1,
    orderId: 1,
    amount: 100,
    paymentStatus: 'FAILED',
    userId: 'KH1',
    secret: 'private',
  });
  assert.equal(history.paymentStatus, 'FAILED');
  assert.equal('secret' in history, false);
});

test('reservation validates identity, timeId and explicit timezone without sharing owner data', () => {
  const row = {
    reservationId: 'hold',
    timeId: 1,
    branchId: 1,
    roomId: 1,
    seats: [{ sRow: 1, sColumn: 2 }],
    expiresAt: '2026-11-04T13:00:00+07:00',
    userId: 'KH1',
  };
  assert.equal('userId' in reservationResponse(row, { timeId: 1 }), false);
  assert.throws(() => reservationResponse(row, { timeId: 2 }));
  assert.throws(() => reservationResponse({ ...row, expiresAt: '2026-11-04T13:00:00' }));
});

test('all public mock fixtures pass canonical DTO projection without rewriting seed data', async () => {
  const r = createRepository();
  for (const [key, type] of [
    ['movies', 'movie'],
    ['branches', 'branch'],
    ['rooms', 'room'],
    ['showtimes', 'showtime'],
    ['food-drinks', 'product'],
    ['merchandise', 'product'],
    ['coupons', 'coupon'],
    ['movie-comments', 'comment'],
    ['cinema-reviews', 'review'],
    ['faq', 'faq'],
    ['news', 'news'],
  ]) {
    for (const row of r.db[key]) assert.doesNotThrow(() => publicDto(type, row));
  }
  for (const row of await r.request('GET', `/public/showtimes/${r.db.showtimes[0].timeId}/seats`))
    assert.doesNotThrow(() => publicDto('seat', row));
});

test('mock canonical wire profile survives reload of legacy demo storage and retains birthday', async () => {
  const values = new Map();
  const storage = {
    getItem: (key) => values.get(key),
    setItem: (key, value) => values.set(key, value),
  };
  const r = createRepository({ storage });
  const response = await r.request('POST', '/auth/login', {
    email: 'customer@cinema.test',
    password: 'DemoCinema123!',
  });
  assert.equal(response.user.cUserId, 'KH001');
  assert.equal('password' in response.user, false);
  const before = customerFromResponse(response);
  const saved = await r.request('PUT', '/customers/me', {
    cName: 'Updated',
    phoneNumber: '0901234567',
    sex: 'F',
    role: 'ADMIN',
    cUserId: 'ATTACKER',
  });
  assert.equal(saved.cUserId, 'KH001');
  assert.equal(saved.role, 'CUSTOMER');
  assert.equal(saved.birthday, before.dob);
  const reloaded = customerFromResponse(
    await createRepository({ storage }).request('GET', '/auth/me'),
  );
  assert.equal(reloaded.fullName, 'Updated');
  assert.equal(reloaded.dob, before.dob);
});

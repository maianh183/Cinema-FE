import { test, expect } from '@playwright/test';
const reply = (route, data, status = 200) =>
  route.fulfill({
    status,
    contentType: 'application/json',
    body: JSON.stringify({ success: status === 200, data }),
  });
const customer = {
  id: 'KH001',
  name: 'Khách',
  email: 'test@example.test',
  role: 'ROLE_CUSTOMER',
  phoneNumber: '0901234567',
  sex: 'F',
  birthday: '2000-01-01',
  csrfToken: 'session-token',
};

test('movie object catalogs retain their public display names without leaking internal fields', async ({
  page,
}) => {
  await page.route('**/api/auth/me', (route) => reply(route, null, 401));
  await page.route('**/api/public/movies/slug/catalog-test', (route) =>
    reply(route, {
      movieId: 1,
      mName: 'Phim kiểm thử catalog',
      slug: 'catalog-test',
      runTime: 100,
      ageRating: 'P',
      releaseDate: '2026-11-04',
      genres: [{ genre: 'Hài' }, { genreName: 'Hành động' }],
      actors: [{ fullName: 'Diễn viên A', salary: 123456 }, { actorName: 'Diễn viên B' }],
    }),
  );
  await page.route('**/api/public/showtimes?*', (route) => reply(route, []));
  await page.route('**/api/public/movies/1/comments', (route) => reply(route, []));
  await page.goto('/movie/catalog-test');
  await expect(
    page.getByRole('heading', { name: 'Phim kiểm thử catalog', exact: true }),
  ).toBeVisible();
  await expect(page.locator('.hero-meta')).toContainText('Hài');
  await expect(page.locator('.hero-meta')).toContainText('Hành động');
  await expect(page.locator('.movie-facts')).toContainText('Diễn viên A, Diễn viên B');
  await expect(page.locator('body')).not.toContainText('[object Object]');
  const movie = await page.evaluate(async () =>
    (await import('/src/services/customer.js')).catalogService.movie('catalog-test'),
  );
  expect(movie.actors).toEqual(['Diễn viên A', 'Diễn viên B']);
});

test('nested canonical login, core session and canonical profile writes keep UI and birthday intact', async ({
  page,
}) => {
  let loggedIn = false,
    loginBody,
    profileBody,
    mutationToken,
    writes = 0;
  await page.route('**/api/auth/me', (route) =>
    reply(route, loggedIn ? customer : null, loggedIn ? 200 : 401),
  );
  await page.route('**/api/auth/csrf', (route) => reply(route, { csrfToken: 'guest-token' }));
  await page.route('**/api/auth/login', (route) => {
    loginBody = route.request().postDataJSON();
    expect(route.request().headers()['x-csrf-token']).toBe('guest-token');
    loggedIn = true;
    return reply(route, {
      user: {
        ...customer,
        cUserId: 'KH001',
        cName: 'Khách',
        salary: 100,
        permissions: ['orders:confirm-payment'],
      },
      csrfToken: 'login-token',
    });
  });
  await page.route('**/api/customers/me', (route) => {
    writes++;
    profileBody = route.request().postDataJSON();
    mutationToken = route.request().headers()['x-csrf-token'];
    return reply(route, { cUserId: 'KH001', ...profileBody });
  });
  await page.goto('/login');
  await page.getByLabel('Email', { exact: true }).fill(customer.email);
  await page.getByLabel('Mật khẩu', { exact: true }).fill('TestPassword123!');
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Tài khoản của bạn' })).toBeVisible();
  expect(loginBody).toEqual({
    email: customer.email,
    password: 'TestPassword123!',
    provider: 'LOCAL',
  });
  await page.getByLabel('Họ tên', { exact: true }).fill('Tên mới');
  await page.getByRole('button', { name: 'Lưu hồ sơ' }).click();
  await expect(page.getByText('Đã lưu hồ sơ.')).toBeVisible();
  expect(profileBody).toEqual({
    cName: 'Tên mới',
    phoneNumber: customer.phoneNumber,
    sex: 'F',
  });
  expect(mutationToken).toBe('login-token');
  await expect(page.getByLabel('Ngày sinh')).toHaveValue('2000-01-01');
  const user = await page.evaluate(
    async () => (await import('/src/store/userStore.js')).useUserStore.getState().user,
  );
  expect(user.role).toBe('CUSTOMER');
  expect(user.salary).toBeUndefined();
  expect(user.permissions).toBeUndefined();
  await expect(page.getByLabel('Ngày sinh')).not.toBeEditable();
  await expect(page.getByText(/Backend thật chưa hỗ trợ lưu ngày sinh/)).toBeVisible();
  expect(writes).toBe(1);
  await page.reload();
  await expect(page.getByLabel('Họ tên', { exact: true })).toHaveValue('Khách');
  await expect(page.getByLabel('Ngày sinh')).toHaveValue('2000-01-01');
});

test('live list adapters preserve total/error metadata and reject incomplete lists', async ({
  page,
}) => {
  await page.route('**/api/auth/me', (route) => reply(route, null, 401));
  let envelope;
  await page.route('**/api/public/movies', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(envelope),
    }),
  );
  await page.goto('/contact');
  const read = () =>
    page.evaluate(async () => {
      try {
        return {
          rows: await (await import('/src/services/api.js')).list('/public/movies'),
        };
      } catch (error) {
        return { message: error.message, errors: error.errors };
      }
    });
  const rows = [{ movieId: 1, mName: 'Full list' }];
  for (const value of [
    rows,
    { success: true, data: rows, meta: { total: 1, page: 1, pageSize: 10 } },
    { success: true, data: { items: rows, total: 1 } },
  ]) {
    envelope = value;
    expect((await read()).rows).toEqual(rows);
  }
  envelope = {
    success: true,
    data: rows,
    meta: { total: 100, page: 1, pageSize: 1 },
  };
  expect((await read()).message).toContain('phân trang chưa đầy đủ');
  envelope = {
    success: false,
    message: 'Validation failed',
    errors: { movieId: ['Invalid ID'] },
  };
  expect(await read()).toEqual({
    message: 'Validation failed',
    errors: { movieId: ['Invalid ID'] },
  });
});

test('live order boundary strips client authority, verifies IDs and disallows production demo payment', async ({
  page,
}) => {
  await page.route('**/api/auth/me', (route) => reply(route, customer));
  await page.route('**/api/auth/csrf', (route) => reply(route, { csrfToken: 'token' }));
  let body,
    paymentBody,
    readId = 42,
    status = 'AWAITING_PAYMENT',
    demo = true;
  await page.route('**/api/customer/orders', (route) => {
    body = route.request().postDataJSON();
    return reply(route, {
      orderId: 42,
      source: 'CUSTOMER',
      orderStatus: 'AWAITING_PAYMENT',
      total: 80000,
    });
  });
  await page.route('**/api/customer/orders/42', (route) =>
    reply(route, {
      orderId: readId,
      source: 'CUSTOMER',
      orderStatus: status,
      total: 80000,
    }),
  );
  await page.route('**/api/customer/orders/42/payment', (route) => {
    paymentBody = route.request().postDataJSON();
    return reply(
      route,
      demo ? { demo: true, orderId: 42 } : { paymentUrl: 'https://pay.example.test/session/42' },
    );
  });
  await page.goto('/contact');
  const order = await page.evaluate(async () =>
    (await import('/src/services/customer.js')).checkoutService.create({
      reservationId: 'hold',
      addons: [],
      idempotencyKey: 'key',
      total: 1,
      source: 'STAFF',
      orderStatus: 'PAID',
      userId: 'KH999',
    }),
  );
  expect(body).toEqual({
    reservationId: 'hold',
    addons: [],
    idempotencyKey: 'key',
  });
  expect(order.orderStatus).toBe('AWAITING_PAYMENT');
  expect(order.total).toBe(80000);
  const call = (method) =>
    page.evaluate(async (method) => {
      try {
        return {
          data: await (await import('/src/services/customer.js')).checkoutService[method]('42'),
        };
      } catch (error) {
        return { error: error.message };
      }
    }, method);
  expect((await call('payment')).error).toContain('thanh toán hợp lệ');
  expect(paymentBody).toEqual({});
  demo = false;
  expect((await call('payment')).data.paymentUrl).toBe('https://pay.example.test/session/42');
  readId = 43;
  expect((await call('order')).error).toContain('sai mã đơn hàng');
  readId = 42;
  status = 'PENDING';
  expect((await call('order')).error).toContain('O-01');
  status = 'UNKNOWN_BACKEND_STATUS';
  expect((await call('order')).data.orderStatus).toBe('UNKNOWN_BACKEND_STATUS');
});

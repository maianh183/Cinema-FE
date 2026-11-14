import { test, expect } from '@playwright/test';
const ok = (data) => ({
  status: 200,
  contentType: 'application/json',
  body: JSON.stringify({ success: true, data }),
});
const fail = (message) => ({
  status: 409,
  contentType: 'application/json',
  body: JSON.stringify({ message }),
});
const user = {
  id: 'NV003',
  name: 'HTTP User',
  role: 'STAFF',
  branchId: 1,
  permissions: ['orders:read', 'orders:cancel'],
  csrfToken: 'csrf',
};
const order = {
  orderId: 100,
  branchId: 1,
  orderStatus: 'PENDING',
  source: 'STAFF',
  createdByEmployeeId: 'NV003',
  total: 80000,
  ticketDetails: [],
  orderTime: '2026-10-25T10:00:00+07:00',
};
test('cancel HTTP failure and malformed response preserve pending; valid retry commits', async ({
  page,
}) => {
  let calls = 0;
  await page.route('**/api/**', (route) => {
    const req = route.request(),
      url = new URL(req.url());
    if (url.pathname === '/api/auth/me') return route.fulfill(ok(user));
    if (url.pathname === '/api/orders') {
      expect(url.searchParams.get('branchId')).toBe('1');
      return route.fulfill(ok([order]));
    }
    if (url.pathname === '/api/orders/100') return route.fulfill(ok(order));
    if (url.pathname === '/api/orders/100/cancel') {
      calls++;
      expect(req.method()).toBe('POST');
      expect(req.postDataJSON()).toEqual({});
      expect(req.headers()['x-csrf-token']).toBe('csrf');
      return route.fulfill(
        calls === 1
          ? fail('Không thể hủy đơn')
          : ok({ ...order, orderStatus: calls === 2 ? 'PENDING' : 'CANCELLED' }),
      );
    }
    return route.fulfill({ status: 404, body: 'Not found' });
  });
  await page.goto('/orders');
  const row = page.locator('tbody tr');
  await row.getByRole('button', { name: 'Hủy đơn' }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByRole('button', { name: 'Hủy đơn', exact: true }).click();
  await expect(dialog.getByRole('alert')).toContainText('Không thể hủy đơn');
  await expect(row).not.toContainText('Đã hủy');
  await dialog.getByRole('button', { name: 'Hủy đơn', exact: true }).click();
  await expect(dialog.getByRole('alert')).toContainText('API chưa xác nhận hủy đơn');
  await dialog.getByRole('button', { name: 'Hủy đơn', exact: true }).click();
  await expect(dialog).toHaveCount(0);
  await expect(row).toContainText('Đã hủy');
  expect(calls).toBe(3);
});
test('room save failure prevents navigation and keeps edited seats until retry succeeds', async ({
  page,
}) => {
  let writes = 0;
  const layout = [
    { branchId: 1, roomId: 1, sRow: 1, sColumn: 1, sType: 1, sPrice: 0, sStatus: true },
  ];
  await page.route('**/api/**', (route) => {
    const req = route.request(),
      path = new URL(req.url()).pathname;
    if (path === '/api/auth/me')
      return route.fulfill(
        ok({ ...user, role: 'MANAGER', permissions: ['rooms:*', 'customers:read'] }),
      );
    if (path === '/api/branches') return route.fulfill(ok([{ branchId: 1, bName: 'Rạp HTTP' }]));
    if (path === '/api/rooms')
      return route.fulfill(
        ok([{ branchId: 1, roomId: 1, rType: '2D', rCapacity: 1, basePrice: 80000 }]),
      );
    if (path.includes('/seats/')) {
      if (req.method() === 'POST') {
        writes++;
        expect(req.postDataJSON()[0].sType).toBe(2);
        return route.fulfill(
          writes === 1 ? fail('Sơ đồ vừa được cập nhật') : ok(req.postDataJSON()),
        );
      }
      return route.fulfill(ok(layout));
    }
    if (path === '/api/customers') return route.fulfill(ok([]));
    return route.fulfill({ status: 404, body: 'Unknown' });
  });
  await page.goto('/rooms');
  await page.getByRole('heading', { name: 'Room 1', exact: true }).click();
  await page.getByRole('button', { name: 'Chỉnh sửa sơ đồ' }).click();
  await page.getByRole('button', { name: 'VIP', exact: true }).click();
  await page.getByRole('button', { name: 'Ghế A1', exact: true }).click();
  await page
    .getByRole('navigation', { name: 'Điều hướng chính' })
    .getByRole('link', { name: 'Khách hàng', exact: true })
    .click();
  const dialog = page.getByRole('dialog');
  await dialog.getByRole('button', { name: 'Lưu và tiếp tục' }).click();
  await expect(dialog.getByRole('alert')).toContainText('Sơ đồ vừa được cập nhật');
  await expect(page).toHaveURL(/rooms/);
  await dialog.getByRole('button', { name: 'Ở lại', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Ghế A1', exact: true })).toHaveAttribute(
    'data-seat-type',
    '2',
  );
  await page
    .getByRole('navigation', { name: 'Điều hướng chính' })
    .getByRole('link', { name: 'Khách hàng', exact: true })
    .click();
  await dialog.getByRole('button', { name: 'Lưu và tiếp tục' }).click();
  await expect(page).toHaveURL(/customers/);
  expect(writes).toBe(2);
});
test('showtime calendar defaults to week and displays three different temporal badges', async ({
  page,
}) => {
  await page.clock.install({ time: new Date('2026-10-25T11:00:00+07:00') });
  await page.route('**/api/**', (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path === '/api/auth/me')
      return route.fulfill(ok({ ...user, role: 'MANAGER', permissions: ['showtimes:read'] }));
    if (path === '/api/branches') return route.fulfill(ok([{ branchId: 1, bName: 'Rạp 1' }]));
    if (path === '/api/movies')
      return route.fulfill(ok([{ movieId: 1, mName: 'Phim thử', runTime: 120 }]));
    if (path === '/api/showtimes')
      return route.fulfill(
        ok(
          [
            ['08:00', '10:00'],
            ['10:00', '12:00'],
            ['12:00', '14:00'],
          ].map(([startTime, endTime], i) => ({
            timeId: i + 1,
            movieId: 1,
            movieName: 'Phim thử',
            branchId: 1,
            roomId: 1,
            day: '2026-10-25',
            endDate: '2026-10-25',
            startTime,
            endTime,
            status: 'SCHEDULED',
          })),
        ),
      );
    return route.fulfill(ok([]));
  });
  await page.goto('/showtimes');
  await expect(page.getByRole('button', { name: 'Tuần', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  const badges = page.locator('[data-showtime-status]');
  await expect(badges).toHaveCount(3);
  const colors = [];
  for (const status of ['FINISHED', 'ON_AIR', 'SCHEDULED']) {
    const badge = page.locator(`[data-showtime-status="${status}"]`);
    await expect(badge).toBeVisible();
    colors.push(await badge.evaluate((el) => getComputedStyle(el).backgroundColor));
  }
  expect(new Set(colors).size).toBe(3);
  await page.clock.fastForward(60 * 60 * 1000);
  await expect(page.locator('[data-calendar-event="2"] [data-showtime-status]')).toHaveAttribute(
    'data-showtime-status',
    'FINISHED',
  );
  await expect(page.locator('[data-calendar-event="3"] [data-showtime-status]')).toHaveAttribute(
    'data-showtime-status',
    'ON_AIR',
  );
});

import { test, expect } from '@playwright/test';
const user = {
  id: 'NV1',
  name: 'HTTP Test',
  email: 'test@example.test',
  role: 'ADMIN',
  branchId: 1,
  permissions: ['*'],
  csrfToken: 'csrf-test',
};
const ok = (data) => ({
  status: 200,
  contentType: 'application/json',
  body: JSON.stringify({ success: true, data }),
});
test('production mode respects server permissions; no persisted tokens', async ({ page }) => {
  await page.route('**/api/**', (route) => {
    if (route.request().url().endsWith('/auth/me'))
      return route.fulfill(ok({ ...user, permissions: ['profile:read', 'profile:update'] }));
    return route.fulfill({
      status: 403,
      contentType: 'application/json',
      body: '{"message":"Không có quyền"}',
    });
  });
  await page.goto('/movies');
  await expect(page.getByRole('heading', { name: '403', exact: true })).toBeVisible();
  await expect(page.getByText('MOCK MODE', { exact: false })).toHaveCount(0);
  const saved = await page.evaluate(() => ({
    local: localStorage.getItem('auth-storage'),
    cookie: document.cookie,
  }));
  expect(saved.local).toBe(null);
  expect(saved.cookie).not.toContain('accessToken');
});
test('success:false keeps editor open and shows error', async ({ page }) => {
  await page.route('**/api/**', (route) => {
    const req = route.request();
    if (req.url().endsWith('/auth/me')) return route.fulfill(ok(user));
    if (req.method() === 'GET')
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: '{"success":true,"data":[],"meta":{"total":0,"page":1,"pageSize":10}}',
      });
    expect(req.headers()['x-csrf-token']).toBe('csrf-test');
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: '{"success":false,"message":"Dữ liệu bị từ chối bởi PHP"}',
    });
  });
  await page.goto('/faq');
  await page.getByRole('button', { name: 'Thêm mới', exact: true }).click();
  await page.getByLabel('Câu hỏi *').fill('Câu hỏi HTTP');
  await page.getByLabel('Câu trả lời *').fill('Nội dung');
  await page.getByRole('button', { name: 'Lưu thay đổi', exact: true }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.getByRole('alert')).toContainText('Dữ liệu bị từ chối bởi PHP');
  await expect(page.getByText('Đã lưu thay đổi.', { exact: true })).toHaveCount(0);
});
test('concurrent 401 responses refresh once and retry requests', async ({ page }) => {
  let refreshes = 0;
  const attempts = {};
  await page.route('**/api/**', async (route) => {
    const req = route.request();
    const path = new URL(req.url()).pathname;
    if (path === '/api/auth/me') return route.fulfill(ok(user));
    if (path === '/api/auth/refresh') {
      refreshes++;
      await new Promise((r) => setTimeout(r, 150));
      return route.fulfill(ok({ accessToken: 'fresh-test-token', csrfToken: 'csrf-test' }));
    }
    attempts[path] = (attempts[path] || 0) + 1;
    if (attempts[path] === 1)
      return route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: '{"message":"Expired"}',
      });
    expect(req.headers().authorization).toBe('Bearer fresh-test-token');
    return route.fulfill(ok([]));
  });
  await page.goto('/products');
  await expect(page.getByRole('heading', { name: 'Sản phẩm', exact: true })).toBeVisible();
  await expect(page.getByText('Không tìm thấy sản phẩm nào trong danh mục này')).toBeVisible();
  expect(refreshes).toBe(1);
  expect(attempts['/api/food-drinks']).toBe(2);
  expect(attempts['/api/merchandise']).toBe(2);
});
test('refresh failure ends session and displays expiry notice', async ({ page }) => {
  await page.route('**/api/**', (route) =>
    route.request().url().endsWith('/auth/me')
      ? route.fulfill(ok(user))
      : route.fulfill({
          status: 401,
          contentType: 'application/json',
          body: '{"message":"Expired"}',
        }),
  );
  await page.goto('/movies');
  await expect(page.getByRole('heading', { name: 'Đăng nhập nhân sự', exact: true })).toBeVisible();
  await expect(page.getByRole('alert')).toContainText('Phiên đăng nhập đã hết hạn');
});
test('403 list response is an error state, not empty success', async ({ page }) => {
  await page.route('**/api/**', (route) =>
    route.request().url().endsWith('/auth/me')
      ? route.fulfill(ok(user))
      : route.fulfill({
          status: 403,
          contentType: 'application/json',
          body: '{"message":"Denied"}',
        }),
  );
  await page.goto('/movies');
  await expect(page.getByRole('alert')).toContainText('Bạn không có quyền thực hiện thao tác này.');
  await expect(page.getByRole('button', { name: 'Thử lại', exact: true })).toBeVisible();
});

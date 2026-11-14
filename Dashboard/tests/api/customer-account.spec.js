import { test, expect } from '@playwright/test';

const permissions = ['customers:read', 'customers:edit-profile', 'customers:reset-password'];
const user = { id: 'NV001', name: 'Admin', role: 'ADMIN', permissions, csrfToken: 'csrf' };
const customer = {
  cUserId: 'KH001',
  cName: 'Khách hàng HTTP',
  email: 'customer@example.test',
  phoneNumber: '0901234567',
  sex: 'F',
  isActive: true,
  createdAt: '2026-01-01',
  membershipTier: 'VIP',
  totalPoints: 100,
};
const ok = (data) => ({
  status: 200,
  contentType: 'application/json',
  body: JSON.stringify({ success: true, data }),
});

async function setup(page, { session = user, mutate } = {}) {
  let current = { ...customer };
  await page.route('**/api/**', async (route) => {
    const request = route.request(),
      path = new URL(request.url()).pathname;
    if (path === '/api/auth/me') return route.fulfill(ok(session));
    if (request.method() !== 'GET') {
      expect(request.headers()['x-csrf-token']).toBe('csrf');
      if (mutate)
        return mutate(route, (saved) => {
          current = saved;
        });
      throw new Error('Unexpected mutation ' + path);
    }
    if (path === '/api/customers') return route.fulfill(ok([current]));
    if (path === '/api/customers/KH001') return route.fulfill(ok(current));
    return route.fulfill({ status: 404, body: 'Not found' });
  });
  await page.goto('/customers');
  await expect(page.locator('tbody tr')).toHaveCount(1);
}

test('profile validation, failures and malformed confirmations retain draft; saved response updates list and detail', async ({
  page,
}) => {
  let calls = 0;
  await setup(page, {
    mutate: async (route, save) => {
      const req = route.request();
      expect(req.method()).toBe('PATCH');
      expect(new URL(req.url()).pathname).toBe('/api/customers/KH001/profile');
      expect(req.postDataJSON()).toEqual({ cName: 'Tên mới', phoneNumber: '0912345678', sex: 'M' });
      calls++;
      if (calls === 1)
        return route.fulfill({
          status: 422,
          contentType: 'application/json',
          body: JSON.stringify({ message: 'SECRET server details' }),
        });
      if (calls === 2) return route.fulfill(ok({}));
      if (calls === 3) return route.fulfill(ok({ ...customer, cUserId: 'KH002' }));
      const stored = { ...customer, ...req.postDataJSON(), cName: 'Tên đã chuẩn hóa' };
      save(stored);
      return route.fulfill(ok({ ...stored, passwordHash: 'SECRET', token: 'SECRET' }));
    },
  });
  await page.getByRole('button', { name: 'Chi tiết', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Chỉnh sửa', exact: true }).click();
  let dialog = page.getByRole('dialog', { name: 'Chỉnh sửa khách hàng', exact: true });
  await expect(dialog.getByLabel('Họ và tên')).toHaveValue(customer.cName);
  await expect(dialog.getByText(customer.email, { exact: true })).toBeVisible();
  await expect(
    dialog.locator('input[type=email], input[type=password], input[type=date]'),
  ).toHaveCount(0);
  await dialog.getByLabel('Họ và tên').fill('Tên mới');
  await dialog.getByLabel('Số điện thoại').fill('invalid');
  await dialog.getByRole('button', { name: 'Lưu hồ sơ', exact: true }).click();
  await expect(dialog.getByText('Số điện thoại cần 8–15 chữ số', { exact: false })).toBeVisible();
  expect(calls).toBe(0);
  await dialog.getByLabel('Số điện thoại').fill('0912345678');
  await dialog.getByLabel('Giới tính').selectOption('M');
  for (let i = 0; i < 3; i++) {
    await dialog.getByRole('button', { name: 'Lưu hồ sơ', exact: true }).click();
    await expect(dialog.getByRole('alert')).toBeVisible();
    await expect(dialog.getByLabel('Họ và tên')).toHaveValue('Tên mới');
    await expect(dialog).not.toContainText('SECRET');
  }
  await dialog.getByRole('button', { name: 'Lưu hồ sơ', exact: true }).click();
  await expect(dialog).toHaveCount(0);
  await expect(page.getByRole('dialog', { name: 'Hồ sơ khách hàng' })).toContainText(
    'Tên đã chuẩn hóa',
  );
  await page.keyboard.press('Escape');
  await expect(page.locator('tbody tr')).toContainText('Tên đã chuẩn hóa');
  await expect(page.locator('body')).not.toContainText('SECRET');
  expect(calls).toBe(4);
});

test('dirty editor requires explicit stay/discard and preserves the draft', async ({ page }) => {
  await setup(page);
  await page.getByRole('button', { name: 'Chỉnh sửa', exact: true }).click();
  await page.getByLabel('Họ và tên').fill('Bản nháp');
  await page.getByRole('button', { name: 'Hủy', exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'Có thay đổi chưa lưu' })).toBeVisible();
  await page.getByRole('button', { name: 'Ở lại', exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'Có thay đổi chưa lưu' })).toHaveCount(0);
  await expect(page.getByLabel('Họ và tên')).toHaveValue('Bản nháp');
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog', { name: 'Có thay đổi chưa lưu' })).toBeVisible();
  await page.getByRole('button', { name: 'Bỏ thay đổi', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.locator('tbody tr')).toContainText(customer.cName);
});

for (const [role, granted] of [
  ['STAFF', permissions],
  ['MANAGER', permissions],
  ['ADMIN', ['customers:read', 'customers:update']],
  ['ADMIN', ['*']],
])
  test(role + ' with ' + granted.join(',') + ' cannot access account actions', async ({ page }) => {
    await setup(page, { session: { ...user, role, permissions: granted } });
    await expect(page.getByRole('button', { name: 'Chỉnh sửa', exact: true })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Đặt lại mật khẩu', exact: true })).toHaveCount(
      0,
    );
    await page.getByRole('button', { name: 'Chi tiết', exact: true }).click();
    await expect(page.getByRole('dialog')).toContainText(customer.email);
  });

test('reset confirms identity, posts empty body, shows only accepted acknowledgement and prevents rapid repeats', async ({
  page,
}) => {
  let calls = 0;
  await setup(page, {
    mutate: async (route) => {
      expect(new URL(route.request().url()).pathname).toBe('/api/customers/KH001/password-reset');
      expect(route.request().method()).toBe('POST');
      expect(route.request().postDataJSON()).toEqual({});
      calls++;
      return route.fulfill(ok({ requested: true, token: 'SECRET', passwordHash: 'SECRET' }));
    },
  });
  await page.getByRole('button', { name: 'Đặt lại mật khẩu', exact: true }).click();
  let dialog = page.getByRole('dialog');
  await expect(dialog).toContainText(customer.cName);
  await expect(dialog).toContainText(customer.email);
  await expect(dialog.locator('input')).toHaveCount(0);
  await dialog.getByRole('button', { name: 'Xác nhận gửi yêu cầu', exact: true }).click();
  await expect(
    page.getByText('Máy chủ đã tiếp nhận yêu cầu khôi phục mật khẩu.', { exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Đặt lại mật khẩu', exact: true }).click();
  await expect(
    page.getByRole('dialog').getByRole('button', { name: 'Xác nhận gửi yêu cầu', exact: true }),
  ).toBeDisabled();
  await expect(page.getByRole('dialog').getByRole('status')).toContainText('Có thể gửi lại sau');
  await expect(page.locator('body')).not.toContainText('SECRET');
  expect(calls).toBe(1);
});

for (const variant of ['invalid-ack', 'missing-envelope', '429'])
  test('reset ' + variant + ' never reports success or leaks backend details', async ({ page }) => {
    await setup(page, {
      mutate: (route) =>
        route.fulfill(
          variant === '429'
            ? {
                status: 429,
                headers: { 'Retry-After': '120' },
                contentType: 'application/json',
                body: JSON.stringify({ message: 'SECRET' }),
              }
            : variant === 'missing-envelope'
              ? {
                  status: 200,
                  contentType: 'application/json',
                  body: JSON.stringify({ requested: true }),
                }
              : ok({ requested: false, token: 'SECRET' }),
        ),
    });
    await page.getByRole('button', { name: 'Đặt lại mật khẩu', exact: true }).click();
    const dialog = page.getByRole('dialog');
    await dialog.getByRole('button', { name: 'Xác nhận gửi yêu cầu', exact: true }).click();
    await expect(dialog.getByRole('alert')).toBeVisible();
    await expect(dialog).toContainText(customer.email);
    await expect(
      dialog.getByRole('button', { name: 'Xác nhận gửi yêu cầu', exact: true }),
    ).toBeDisabled();
    await expect(
      page.getByText('Máy chủ đã tiếp nhận yêu cầu khôi phục mật khẩu.', { exact: true }),
    ).toHaveCount(0);
    await expect(page.locator('body')).not.toContainText('SECRET');
  });

for (const status of [403, 404, 409, 500, 'network'])
  test('profile ' + status + ' retains editable draft', async ({ page }) => {
    await setup(page, {
      mutate: (route) =>
        status === 'network'
          ? route.abort()
          : route.fulfill({
              status,
              contentType: 'application/json',
              body: JSON.stringify({ message: 'SECRET' }),
            }),
    });
    await page.getByRole('button', { name: 'Chỉnh sửa', exact: true }).click();
    await page.getByLabel('Họ và tên').fill('Bản nháp giữ lại');
    await page.getByRole('button', { name: 'Lưu hồ sơ', exact: true }).click();
    await expect(page.getByRole('dialog').getByRole('alert')).toBeVisible();
    await expect(page.getByLabel('Họ và tên')).toHaveValue('Bản nháp giữ lại');
    await expect(page.getByRole('button', { name: 'Lưu hồ sơ', exact: true })).toBeEnabled();
    await expect(page.locator('body')).not.toContainText('SECRET');
  });

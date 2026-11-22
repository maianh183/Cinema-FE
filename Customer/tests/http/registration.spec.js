import { test, expect } from '@playwright/test';

// These tests use the real HTTP transport (VITE_USE_MOCK=false) with intercepted API responses.
const reply = (route, data, status = 200) =>
  route.fulfill({
    status,
    contentType: 'application/json',
    body: JSON.stringify({ success: status === 200, data }),
  });
const customer = {
  cUserId: 'KH001',
  cName: 'Khách kiểm thử',
  email: 'test@example.test',
  phoneNumber: '0901234567',
  sex: 'F',
  role: 'CUSTOMER',
  csrfToken: 'test-csrf',
};
test.beforeEach(async ({ page }) => {
  await page.route('**/api/**', (route) => reply(route, null, 404));
  await page.route('**/api/auth/me', (route) => reply(route, customer));
  await page.route('**/api/auth/csrf', (route) => reply(route, { csrfToken: 'test-csrf' }));
});

test('real transport registers without birthday, preserves validation and saves empty-birthday profile', async ({
  page,
}) => {
  let registered = false;
  const bodies = [];
  await page.route('**/api/auth/me', (route) =>
    reply(route, registered ? customer : null, registered ? 200 : 401),
  );
  await page.route('**/api/auth/register', (route) => {
    bodies.push(route.request().postDataJSON());
    expect(route.request().headers()['x-csrf-token']).toBe('test-csrf');
    registered = true;
    return reply(route, customer);
  });
  let profileBody;
  await page.route('**/api/customers/me', (route) => {
    profileBody = route.request().postDataJSON();
    return reply(route, { ...customer, ...profileBody });
  });
  await page.goto('/register');
  expect(new URL(page.url()).protocol).toBe('http:');
  expect(await page.evaluate(async () => (await import('/src/services/api.js')).USE_MOCK)).toBe(
    false,
  );
  await expect(page.getByLabel('Ngày sinh')).toHaveCount(0);
  await page.getByLabel('Họ tên', { exact: true }).fill('  Khách kiểm thử  ');
  await page.getByLabel('Số điện thoại').fill(customer.phoneNumber);
  await page.getByLabel('Email', { exact: true }).fill(customer.email);
  await page.getByLabel('Mật khẩu', { exact: true }).fill('TestPassword123!');
  await page.getByLabel('Xác nhận mật khẩu', { exact: true }).fill('TestPassword123!');

  for (const [label, invalid, valid] of [
    ['Họ tên', '', '  Khách kiểm thử  '],
    ['Email', 'invalid', customer.email],
    ['Số điện thoại', '123', customer.phoneNumber],
    ['Mật khẩu', 'short', 'TestPassword123!'],
  ]) {
    const field = page.getByLabel(label, { exact: true });
    await field.fill(invalid);
    await page.getByRole('button', { name: 'Đăng ký', exact: true }).click();
    expect(await field.evaluate((input) => input.validity.valid)).toBe(false);
    expect(bodies).toHaveLength(0);
    await field.fill(valid);
  }
  await page.getByLabel('Xác nhận mật khẩu', { exact: true }).fill('DifferentPassword123!');
  await page.getByRole('button', { name: 'Đăng ký', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('mật khẩu xác nhận');
  expect(bodies).toHaveLength(0);
  await page.getByLabel('Xác nhận mật khẩu', { exact: true }).fill('TestPassword123!');
  await page.getByRole('button', { name: 'Đăng ký', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Tài khoản của bạn' })).toBeVisible();
  expect(bodies).toEqual([
    {
      cName: customer.cName,
      phoneNumber: customer.phoneNumber,
      sex: 'F',
      email: customer.email,
      password: 'TestPassword123!',
    },
  ]);
  await expect(page.getByLabel('Ngày sinh')).toHaveValue('');
  await page.getByRole('button', { name: 'Lưu hồ sơ' }).click();
  await expect(page.getByText('Đã lưu hồ sơ.')).toBeVisible();
  expect(profileBody).toEqual({
    cName: customer.cName,
    phoneNumber: customer.phoneNumber,
    sex: 'F',
  });

  // Even a caller bypassing the form cannot add unsupported birthday fields to the real API.
  await page.evaluate(async () =>
    (await import('/src/services/customer.js')).authService.register({
      fullName: 'Khách kiểm thử',
      phone: '0901234567',
      gender: 'F',
      email: 'test@example.test',
      password: 'TestPassword123!',
      dob: '2000-01-01',
      birthday: '2000-01-01',
    }),
  );
  expect(bodies[1]).toEqual(bodies[0]);
});

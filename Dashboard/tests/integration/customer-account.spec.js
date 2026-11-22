import { test, expect } from '@playwright/test';
import siteContent from '../../../Customer/src/mocks/site-content-seed.json' with { type: 'json' };

test('Dashboard profile write is visible when Customer reloads the same account through its existing auth service', async ({
  browser,
}) => {
  const dashboard = await browser.newContext();
  const customer = await browser.newContext();
  let stored = {
    cUserId: 'KH001',
    cName: 'Tên trước khi sửa',
    email: 'customer@example.test',
    phoneNumber: '0901234567',
    sex: 'F',
    birthday: '2000-01-01',
    isActive: true,
  };
  let writes = 0;
  const reply = (route, data) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, data }),
    });
  try {
    await dashboard.route('**/api/**', (route) => {
      const req = route.request(),
        path = new URL(req.url()).pathname;
      if (path === '/api/auth/me')
        return reply(route, {
          id: 'NV001',
          role: 'ADMIN',
          name: 'Admin',
          permissions: ['customers:read', 'customers:edit-profile'],
          csrfToken: 'admin-csrf',
        });
      if (path === '/api/customers' && req.method() === 'GET') return reply(route, [stored]);
      if (path === '/api/customers/KH001/profile' && req.method() === 'PATCH') {
        expect(req.headers()['x-csrf-token']).toBe('admin-csrf');
        expect(req.postDataJSON()).toEqual({
          cName: 'Tên sau khi sửa',
          phoneNumber: '0987654321',
          sex: 'M',
        });
        writes++;
        stored = { ...stored, ...req.postDataJSON() };
        return reply(route, stored);
      }
      throw new Error('Unexpected Dashboard endpoint: ' + req.method() + ' ' + path);
    });
    await customer.route('**/api/**', (route) => {
      const req = route.request(),
        path = new URL(req.url()).pathname;
      expect(req.method()).toBe('GET');
      if (path === '/api/auth/me')
        return reply(route, { ...stored, role: 'CUSTOMER', csrfToken: 'customer-csrf' });
      if (path === '/api/public/site-content') return reply(route, siteContent);
      return reply(route, []);
    });
    const customerPage = await customer.newPage();
    await customerPage.goto('http://127.0.0.1:5176/profile');
    await expect(customerPage.getByLabel('Họ tên', { exact: true })).toHaveValue(
      'Tên trước khi sửa',
    );
    const adminPage = await dashboard.newPage();
    await adminPage.goto('http://127.0.0.1:3004/customers');
    await adminPage.getByRole('button', { name: 'Chỉnh sửa', exact: true }).click();
    await adminPage.getByLabel('Họ và tên').fill('Tên sau khi sửa');
    await adminPage.getByLabel('Số điện thoại').fill('0987654321');
    await adminPage.getByLabel('Giới tính').selectOption('M');
    await adminPage.getByRole('button', { name: 'Lưu hồ sơ', exact: true }).click();
    await expect(adminPage.getByRole('dialog')).toHaveCount(0);
    await customerPage.reload();
    await expect(customerPage.getByLabel('Họ tên', { exact: true })).toHaveValue('Tên sau khi sửa');
    await expect(customerPage.getByLabel('Số điện thoại', { exact: true })).toHaveValue(
      '0987654321',
    );
    await expect(
      customerPage.getByRole('combobox', { name: 'Giới tính', exact: true }),
    ).toHaveValue('M');
    await expect(customerPage.getByText(stored.email, { exact: true })).toBeVisible();
    expect(stored.cUserId).toBe('KH001');
    expect(stored.birthday).toBe('2000-01-01');
    expect(writes).toBe(1);
  } finally {
    await dashboard.close();
    await customer.close();
  }
});

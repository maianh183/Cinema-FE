import { test, expect } from '@playwright/test';
const user = {
  id: 'NV001',
  name: 'Admin',
  role: 'ADMIN',
  branchId: 1,
  permissions: ['*'],
  csrfToken: 'csrf',
};
const contact = {
  id: 1,
  fullName: 'Contact HTTP',
  email: 'guest@example.test',
  phone: '0901234567',
  subject: 'Question',
  content: '<script>window.injected=true</script>',
  status: 'UNREAD',
  createdAt: '2026-11-06T08:00:00+07:00',
};
const ok = (data, meta) => ({
  status: 200,
  contentType: 'application/json',
  body: JSON.stringify({ success: true, data, ...(meta ? { meta } : {}) }),
});
const fail = (message) => ({
  status: 422,
  contentType: 'application/json',
  body: JSON.stringify({ success: false, message }),
});
test('contact PATCH failure and wrong acknowledgement do not change detail; correct retry updates counts', async ({
  page,
}) => {
  let attempts = 0,
    current = contact;
  await page.route('**/api/**', (route) => {
    const req = route.request(),
      url = new URL(req.url());
    if (url.pathname === '/api/auth/me') return route.fulfill(ok(user));
    if (req.method() === 'PATCH') {
      expect(req.postDataJSON()).toEqual({ status: 'READ' });
      expect(req.headers()['x-csrf-token']).toBe('csrf');
      attempts++;
      if (attempts === 1) return route.fulfill(fail('Chưa lưu được trạng thái'));
      if (attempts === 2) return route.fulfill(ok(current));
      current = { ...contact, status: 'READ' };
      return route.fulfill(ok(current));
    }
    if (url.pathname === '/api/contacts/1') return route.fulfill(ok(current));
    const rows =
      !url.searchParams.get('status') || url.searchParams.get('status') === current.status
        ? [current]
        : [];
    return route.fulfill(
      ok(rows, { total: rows.length, page: 1, pageSize: Number(url.searchParams.get('pageSize')) }),
    );
  });
  await page.goto('/contacts');
  await page.getByRole('button', { name: 'Chi tiết', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toContainText(contact.content);
  expect(await page.evaluate(() => window.injected)).toBeUndefined();
  for (const message of ['Chưa lưu được trạng thái', 'API chưa xác nhận trạng thái liên hệ']) {
    await dialog.getByRole('button', { name: 'Đã đọc', exact: true }).click();
    await expect(dialog.getByRole('alert')).toContainText(message);
    await expect(dialog).toContainText('Trạng thái: Chưa đọc');
  }
  await dialog.getByRole('button', { name: 'Đã đọc', exact: true }).click();
  await expect(dialog).toContainText('Trạng thái: Đã đọc');
  await page.keyboard.press('Escape');
  await expect(page.getByRole('region', { name: 'Chưa đọc', exact: true })).toContainText('0');
});
test('site upload and PUT errors retain old image/draft, then retry saves exact section only', async ({
  page,
}) => {
  const data = {
    global: {
      companyName: 'CineFlow',
      tagline: 'Cinema',
      logoUrl: '/uploads/old.png',
      contactEmail: 'info@example.test',
      hotline: '0901234567',
      address: 'Address',
      facebookUrl: '',
    },
    home: { headline: 'Welcome', subheadline: 'Intro', heroImageUrl: '' },
    about: { title: 'About', introduction: '', vision: '', mission: '', values: '' },
    services: { title: 'Services', introduction: '' },
    pricing: { title: 'Pricing', introduction: '', disclaimer: '' },
    contact: { title: 'Contact', introduction: '', workingHours: '', mapUrl: '' },
  };
  let writes = 0;
  await page.route('**/api/**', (route) => {
    const req = route.request(),
      url = new URL(req.url());
    if (url.pathname === '/api/auth/me') return route.fulfill(ok(user));
    if (url.pathname === '/api/files/upload') {
      expect(req.headers()['content-type']).toContain('multipart/form-data');
      return route.fulfill(fail('Upload bị từ chối'));
    }
    if (req.method() === 'PUT') {
      expect(url.pathname).toBe('/api/site-content/global');
      expect(Object.keys(req.postDataJSON()).sort()).toEqual(Object.keys(data.global).sort());
      writes++;
      return route.fulfill(writes === 1 ? fail('Xung đột nội dung') : ok(req.postDataJSON()));
    }
    return route.fulfill(ok(data));
  });
  await page.goto('/website-content');
  await expect(page.getByAltText('Ảnh đã chọn')).toHaveAttribute('src', '/uploads/old.png');
  await page
    .getByLabel('Upload ảnh', { exact: true })
    .setInputFiles({ name: 'new.png', mimeType: 'image/png', buffer: Buffer.from('image') });
  await expect(page.getByRole('alert')).toContainText('Upload bị từ chối');
  await expect(page.getByAltText('Ảnh đã chọn')).toHaveAttribute('src', '/uploads/old.png');
  await page.getByLabel('Tên doanh nghiệp *').fill('Updated');
  await page.getByRole('button', { name: 'Lưu nội dung', exact: true }).click();
  await expect(page.getByRole('alert').filter({ hasText: 'Xung đột nội dung' })).toBeVisible();
  await expect(page.getByLabel('Tên doanh nghiệp *')).toHaveValue('Updated');
  await expect(page.getByText('Có thay đổi chưa lưu', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Lưu nội dung', exact: true }).click();
  await expect(page.getByText('Không có thay đổi chưa lưu', { exact: true })).toBeVisible();
  expect(writes).toBe(2);
});

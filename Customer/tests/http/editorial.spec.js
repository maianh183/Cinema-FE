import { test, expect } from '@playwright/test';
import seed from '../../src/mocks/site-content-seed.json' with { type: 'json' };

const reply = (route, data, status = 200, extra = {}) =>
  route.fulfill({
    status,
    contentType: 'application/json',
    body: JSON.stringify({ success: status === 200, data, ...extra }),
  });
async function guest(page, getContent = () => seed) {
  await page.route('**/api/**', (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path === '/api/auth/me') return reply(route, null, 401);
    if (path === '/api/auth/csrf') return reply(route, { csrfToken: 'guest-csrf' });
    if (path === '/api/public/site-content') return reply(route, getContent());
    if (path === '/api/public/branches')
      return reply(route, [{ branchId: 1, bName: 'Rạp kiểm thử' }]);
    if (path === '/api/public/branches/1/rooms')
      return reply(route, [{ branchId: 1, roomId: 2, rType: 'IMAX', basePrice: 123000 }]);
    return reply(route, []);
  });
}
async function fillContact(page) {
  await page.getByLabel('Họ tên', { exact: true }).fill(' Khách thử ');
  await page.getByLabel('Email', { exact: true }).fill('guest@example.test');
  await page.getByLabel('Số điện thoại').fill('0901234567');
  await page.getByLabel('Chủ đề').fill('Hỗ trợ');
  await page.getByLabel('Nội dung', { exact: true }).fill('Giữ nguyên nội dung');
}
test('contact never resets on invalid receipts, 400/422/429/network; guest success resets once', async ({
  page,
}) => {
  test.setTimeout(60000);
  await guest(page);
  let mode,
    calls = 0,
    release;
  await page.route('**/api/contacts', async (route) => {
    calls++;
    expect(route.request().method()).toBe('POST');
    expect(route.request().headers()['x-csrf-token']).toBe('guest-csrf');
    expect(Object.keys(route.request().postDataJSON()).sort()).toEqual([
      'content',
      'email',
      'fullName',
      'phone',
      'subject',
    ]);
    if (mode === 'network') return route.abort('failed');
    if (mode === 'false')
      return reply(route, { id: 1, received: true }, 200, {
        success: false,
        message: 'Chưa lưu',
      });
    if (typeof mode === 'number')
      return reply(route, null, mode, {
        message: 'Kiểm tra dữ liệu',
        errors: { email: ['Email cần kiểm tra'] },
      });
    if (mode === 'pending') {
      await new Promise((resolve) => {
        release = resolve;
      });
      return reply(route, { id: 77, received: true });
    }
    return reply(route, mode);
  });
  await page.goto('/contact');
  await fillContact(page);
  const button = page.getByRole('button', { name: 'Gửi liên hệ', exact: true });
  for (const value of [
    400,
    422,
    429,
    'network',
    'false',
    { id: 1, received: false },
    { id: '1', received: true },
    { received: true },
  ]) {
    mode = value;
    await button.click();
    await expect(page.getByRole('alert')).toBeVisible();
    if (value === 429) await expect(page.getByRole('alert')).toContainText('quá nhiều');
    if (value === 'network')
      await expect(page.getByRole('alert')).toContainText('Chưa nhận được xác nhận');
    await expect(page.getByLabel('Nội dung', { exact: true })).toHaveValue('Giữ nguyên nội dung');
    await expect(page.getByText('Đã nhận thông tin liên hệ.')).toHaveCount(0);
  }
  mode = 'pending';
  const before = calls;
  await button.click();
  await expect(page.getByRole('button', { name: 'Đang gửi…' })).toBeDisabled();
  await expect.poll(() => !!release).toBe(true);
  await page.locator('form.form-width').evaluate((form) => form.requestSubmit());
  release();
  await expect(page.getByText('Đã nhận thông tin liên hệ.')).toBeVisible();
  expect(calls).toBe(before + 1);
  await expect(page.getByLabel('Nội dung', { exact: true })).toHaveValue('');
});
test('public editorial renders all sections and SEO, shares one fetch across navigation, keeps catalog prices', async ({
  page,
}) => {
  const content = structuredClone(seed);
  content.global.companyName = 'Rạp Đồng Bộ';
  content.global.contactEmail = 'company@example.test';
  content.global.logoUrl = '/logo-missing.png';
  content.global.facebookUrl = 'https://example.test/social';
  content.home.headline = 'Lời chào từ biên tập';
  content.about.title = 'Về chúng tôi từ API';
  content.services.introduction = 'Dịch vụ từ API';
  content.pricing.disclaimer = 'Văn bản biên tập không quyết định số tiền.';
  content.pricing.basePrice = 1;
  content.contact.mapUrl = 'https://example.test/map';
  await guest(page, () => content);
  const requests = [];
  page.on('request', (request) => {
    if (request.url().includes('/api/'))
      requests.push([request.method(), new URL(request.url()).pathname]);
  });
  await page.goto('/about');
  await expect(page.getByRole('heading', { name: content.about.title })).toBeVisible();
  await expect(page).toHaveTitle('Về chúng tôi từ API | Rạp Đồng Bộ');
  await expect(page.locator('meta[name="description"]')).toHaveAttribute(
    'content',
    content.about.introduction,
  );
  await expect(page.locator('.site-header .site-brand-logo')).toHaveAttribute(
    'src',
    '/placeholder-site.svg',
  );
  await page.locator('.site-footer').getByRole('link', { name: 'Dịch vụ', exact: true }).click();
  await expect(page.getByText('Dịch vụ từ API', { exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Phòng IMAX' })).toBeVisible();
  await page.locator('.site-footer').getByRole('link', { name: 'Bảng giá', exact: true }).click();
  await expect(page.getByText(content.pricing.disclaimer)).toBeVisible();
  await expect(page.locator('tbody')).toContainText('123.000');
  await page.locator('.site-footer').getByRole('link', { name: 'Liên hệ', exact: true }).click();
  await expect(page.getByRole('link', { name: 'Xem bản đồ vị trí doanh nghiệp' })).toHaveAttribute(
    'href',
    content.contact.mapUrl,
  );
  await expect(page.locator('.business-contact')).toContainText('company@example.test');
  await page.locator('.site-header .brand').click();
  await expect(page.getByRole('heading', { name: content.home.headline })).toBeVisible();
  expect(
    requests.filter(([, path]) => path === '/api/public/site-content').length,
  ).toBeLessThanOrEqual(2); // React StrictMode dev effect replay only.
  expect(
    requests.filter(([, path]) => /^\/api\/(?:contacts|site-content)(?:\/|$)/.test(path)),
  ).toEqual([]);
});
test('content errors, missing sections and unsafe URLs show fallback; retry and focus refresh current data', async ({
  page,
}) => {
  await guest(page);
  let mode = 'error';
  await page.route('**/api/public/site-content', (route) => {
    if (mode === 'error') return reply(route, null, 503);
    if (mode === 'invalid')
      return reply(route, {
        global: {
          ...seed.global,
          facebookUrl: 'javascript:alert(1)',
          logoUrl: 'data:image/svg+xml,<svg/>',
        },
        contact: { ...seed.contact, mapUrl: 'http://example.test' },
        about: { title: '<script>bad</script>' },
        contacts: [{ email: 'private@example.test' }],
      });
    return reply(route, { ...seed, contact: { ...seed.contact, title: mode } });
  });
  await page.goto('/contact');
  const retry = page.getByRole('button', { name: 'Tải lại nội dung' });
  await expect(retry).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Liên hệ', exact: true })).toBeVisible();
  await expect(page.getByLabel('Họ tên', { exact: true })).toBeVisible();
  mode = 'invalid';
  await retry.click();
  await expect(retry).toBeVisible();
  expect(await page.locator('a[href^="javascript:"],a[href^="http:"],iframe').count()).toBe(0);
  await expect(page.locator('body')).not.toContainText('private@example.test');
  mode = 'Liên hệ mới';
  await retry.click();
  await expect(page.getByRole('heading', { name: mode, exact: true })).toBeVisible();
  await expect(retry).toHaveCount(0);
  mode = 'Nội dung sau cập nhật';
  await page.evaluate(() => window.dispatchEvent(new Event('focus')));
  await expect(page.getByRole('heading', { name: mode, exact: true })).toBeVisible();
});
test('long editorial content remains readable at all target widths', async ({ page }) => {
  test.setTimeout(60000);
  const content = structuredClone(seed);
  content.global.companyName = 'TênDoanhNghiệp'.repeat(10);
  content.contact.introduction = 'NộiDungDài'.repeat(200);
  content.global.address = 'ĐịaChỉ'.repeat(80);
  await guest(page, () => content);
  for (const width of [375, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 950 });
    await page.goto('/contact');
    await expect(page.locator('.site-header .brand')).toContainText(content.global.companyName);
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1),
      `${width}px`,
    ).toBe(false);
    await expect(page.getByLabel('Nội dung', { exact: true })).toBeVisible();
    await page.locator('.site-header .brand').click();
    await expect(page.locator('.cinema-intro-title')).toHaveText(content.global.companyName);
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1),
      `home ${width}px`,
    ).toBe(false);
  }
});

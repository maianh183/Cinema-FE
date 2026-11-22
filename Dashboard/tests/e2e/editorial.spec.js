import { test, expect } from '@playwright/test';
async function login(page, role = 'admin') {
  await page.goto('/login');
  await page.getByLabel('Email', { exact: true }).fill(role + '@cinema.test');
  await page.getByLabel('Mật khẩu', { exact: true }).fill('Demo@12345');
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
  await expect(page.locator('header')).toBeVisible();
}
const nav = (page, name) =>
  page
    .getByRole('navigation', { name: 'Điều hướng chính' })
    .getByRole('link', { name, exact: true })
    .click();
test('admin contacts search/filter/detail/manual status/delete refresh list and global counts', async ({
  page,
}) => {
  await login(page);
  await nav(page, 'Liên hệ');
  await expect(page.locator('tbody tr')).toHaveCount(10);
  await expect(page.getByRole('region', { name: 'Tổng liên hệ', exact: true })).toContainText('24');
  await page.getByLabel('Tìm liên hệ').fill('contact24@example.test');
  await expect(page.locator('tbody tr')).toHaveCount(1);
  await page.getByRole('button', { name: 'Chi tiết', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toContainText('không gửi email');
  await expect(dialog).toContainText('Trạng thái: Đã phản hồi');
  await dialog.getByRole('button', { name: 'Chưa đọc', exact: true }).click();
  await expect(dialog).toContainText('Trạng thái: Chưa đọc');
  await page.keyboard.press('Escape');
  await expect(page.getByRole('region', { name: 'Chưa đọc', exact: true })).toContainText('9');
  await page
    .getByRole('combobox', { name: 'Lọc trạng thái liên hệ', exact: true })
    .selectOption('UNREAD');
  await page.getByRole('button', { name: 'Xóa', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Xóa liên hệ', exact: true }).click();
  await expect(page.getByText('Không có dữ liệu phù hợp.')).toBeVisible();
  await expect(page.getByRole('region', { name: 'Tổng liên hệ', exact: true })).toContainText('23');
});
test('section editor protects drafts, saves one section and leaves other sections intact', async ({
  page,
}) => {
  await login(page);
  await nav(page, 'Nội dung website');
  await page.getByLabel('Tên doanh nghiệp *').fill('CineFlow Updated');
  await page.getByRole('tab', { name: 'Giới thiệu', exact: true }).click();
  const guard = page.getByRole('dialog');
  await expect(guard).toContainText('nội dung đang chỉnh sửa');
  await guard.getByRole('button', { name: 'Ở lại', exact: true }).click();
  await expect(page.getByLabel('Tên doanh nghiệp *')).toHaveValue('CineFlow Updated');
  await page.getByRole('tab', { name: 'Giới thiệu', exact: true }).click();
  await guard.getByRole('button', { name: 'Lưu và tiếp tục', exact: true }).click();
  await expect(page.getByLabel('Tiêu đề *')).toHaveValue('Về CineFlow');
  await page.getByRole('tab', { name: 'Thông tin doanh nghiệp', exact: true }).click();
  await expect(page.getByLabel('Tên doanh nghiệp *')).toHaveValue('CineFlow Updated');
  await page.getByRole('tab', { name: 'Bảng giá', exact: true }).click();
  await page.getByLabel('Tiêu đề *').fill('<script>bad</script>');
  await page.getByRole('button', { name: 'Lưu nội dung', exact: true }).click();
  await expect(page.getByRole('alert').first()).toContainText('văn bản thuần');
  await expect(page.getByRole('complementary', { name: 'Xem trước nội dung' })).toContainText(
    '<script>bad</script>',
  );
  await nav(page, 'Liên hệ');
  await expect(guard).toBeVisible();
  await guard.getByRole('button', { name: 'Bỏ thay đổi', exact: true }).click();
  await expect(page.locator('main h1')).toHaveText('Liên hệ');
});
for (const role of ['manager', 'staff'])
  test(role + ' has no editorial menu or direct-route access', async ({ page }) => {
    await login(page, role);
    const menu = page.getByRole('navigation', { name: 'Điều hướng chính' });
    for (const name of ['Liên hệ', 'Nội dung website'])
      await expect(menu.getByRole('link', { name, exact: true })).toHaveCount(0);
    for (const path of ['/contacts', '/website-content']) {
      await page.evaluate((path) => {
        history.pushState({}, '', path);
        dispatchEvent(new PopStateEvent('popstate'));
      }, path);
      await expect(page.getByRole('heading', { name: '403', exact: true })).toBeVisible();
    }
  });
test('editor uploads through existing service and both new pages fit required widths', async ({
  page,
}) => {
  await login(page);
  await nav(page, 'Nội dung website');
  await page.getByLabel('Upload ảnh', { exact: true }).setInputFiles({
    name: 'logo.png',
    mimeType: 'image/png',
    buffer: Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
      'base64',
    ),
  });
  await expect(page.getByAltText('Ảnh đã chọn')).toHaveAttribute('src', /^data:image\/png/);
  await page.getByRole('button', { name: 'Lưu nội dung', exact: true }).click();
  await expect(page.getByText('Không có thay đổi chưa lưu', { exact: true })).toBeVisible();
  for (const width of [375, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    await expect
      .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
      .toBe(true);
  }
  await nav(page, 'Liên hệ');
  for (const width of [375, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    await expect
      .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
      .toBe(true);
  }
});

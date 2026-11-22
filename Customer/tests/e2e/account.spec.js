import { test, expect } from '@playwright/test';
test('register and save profile without optional birthday in Mock Mode', async ({ page }) => {
  await page.goto('/register');
  await page.getByLabel('Họ tên', { exact: true }).fill('Khách không có ngày sinh');
  await page.getByLabel('Số điện thoại').fill('0901111222');
  await expect(page.getByLabel('Ngày sinh (tùy chọn)')).not.toHaveAttribute('required');
  await page.getByLabel('Email', { exact: true }).fill('no-birthday@example.test');
  await page.getByLabel('Mật khẩu', { exact: true }).fill('NewPassword123!');
  await page.getByLabel('Xác nhận mật khẩu', { exact: true }).fill('NewPassword123!');
  await page.getByRole('button', { name: 'Đăng ký', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Tài khoản của bạn' })).toBeVisible();
  await expect(page.getByLabel('Ngày sinh')).toHaveValue('');
  await page.getByRole('button', { name: 'Lưu hồ sơ' }).click();
  await expect(page.getByText('Đã lưu hồ sơ.')).toBeVisible();
  await page.reload();
  await expect(page.getByLabel('Ngày sinh')).toHaveValue('');
});

test('register, profile, password, avatar, reload session and logout', async ({ page }) => {
  await page.goto('/register');
  await page.getByLabel('Họ tên', { exact: true }).fill('Thành viên kiểm thử');
  await page.getByLabel('Số điện thoại').fill('0901111222');
  await page.getByLabel('Ngày sinh').fill('2000-05-20');
  await page.getByLabel('Email', { exact: true }).fill('new@example.test');
  await page.getByLabel('Mật khẩu', { exact: true }).fill('NewPassword123!');
  await page.getByLabel('Xác nhận mật khẩu', { exact: true }).fill('NewPassword123!');
  await page.getByRole('button', { name: 'Đăng ký', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Tài khoản của bạn' })).toBeVisible();
  await expect(page.getByLabel('Ngày sinh')).toHaveValue('2000-05-20');
  await page.getByLabel('Họ tên', { exact: true }).fill('Tên mới');
  await page.getByRole('button', { name: 'Lưu hồ sơ' }).click();
  await expect(page.getByText('Đã lưu hồ sơ.')).toBeVisible();
  await page.getByLabel('Mật khẩu hiện tại').fill('NewPassword123!');
  await page.getByLabel('Mật khẩu mới', { exact: true }).fill('ChangedPassword123!');
  await page.getByLabel('Xác nhận mật khẩu mới').fill('ChangedPassword123!');
  await page.getByRole('button', { name: 'Đổi mật khẩu', exact: true }).click();
  await expect(page.getByText('Đã đổi mật khẩu.')).toBeVisible();
  await page.getByLabel('Chọn ảnh JPG, PNG hoặc WebP (tối đa 5 MB)').setInputFiles({
    name: 'avatar.png',
    mimeType: 'image/png',
    buffer: Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=',
      'base64',
    ),
  });
  await expect(page.getByText('Đã cập nhật ảnh đại diện.')).toBeVisible();
  await page.reload();
  await expect(page.getByLabel('Họ tên', { exact: true })).toHaveValue('Tên mới');
  await expect(page.getByLabel('Ngày sinh')).toHaveValue('2000-05-20');
  await page.getByRole('button', { name: 'Đăng xuất', exact: true }).click();
  await expect(page).toHaveURL(/\/login/);
  await page.getByLabel('Email', { exact: true }).fill('new@example.test');
  await page.getByLabel('Mật khẩu', { exact: true }).fill('ChangedPassword123!');
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Tài khoản của bạn' })).toBeVisible();
});
for (const width of [375, 768, 1024, 1440])
  test(`booking checkout cart and review layout ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/login');
    await page.getByLabel('Email', { exact: true }).fill('customer@cinema.test');
    await page.getByLabel('Mật khẩu', { exact: true }).fill('DemoCinema123!');
    await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Tài khoản của bạn' })).toBeVisible();
    await page.goto('/movie/phim-demo-1');
    await expect(page.getByRole('heading', { name: 'Bình luận phim' })).toBeVisible();
    await page.screenshot({
      path: `test-results/screenshots/movie-${width}.png`,
      fullPage: true,
    });
    await page.locator('.showtime-card').first().click();
    await expect(page.getByRole('heading', { name: 'Chọn ghế', exact: true })).toBeVisible();
    await page.getByRole('button', { name: /Ghế A2,/ }).click();
    expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1)).toBe(
      false,
    );
    await page.screenshot({
      path: `test-results/screenshots/seats-${width}.png`,
      fullPage: true,
    });
    await page.getByRole('button', { name: 'Giữ ghế & tiếp tục', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Tạo đơn & kiểm tra tổng tiền' })).toBeVisible();
    await page.screenshot({
      path: `test-results/screenshots/checkout-${width}.png`,
      fullPage: true,
    });
    expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1)).toBe(
      false,
    );
    await page.getByRole('link', { name: 'Thêm đồ ăn hoặc quà lưu niệm' }).click();
    await page.locator('.product-card').first().click();
    await page.getByRole('button', { name: 'Thêm vào giỏ', exact: true }).click();
    await page.getByRole('link', { name: 'Xem giỏ hàng', exact: true }).click();
    await expect(
      page.getByRole('link', { name: 'Quay lại thanh toán', exact: true }),
    ).toBeVisible();
    await page.screenshot({
      path: `test-results/screenshots/cart-${width}.png`,
      fullPage: true,
    });
    await page.goto('/cinemas');
    await expect(page.getByLabel('Nội dung đánh giá')).toBeVisible();
    await page.screenshot({
      path: `test-results/screenshots/cinema-${width}.png`,
      fullPage: true,
    });
    expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1)).toBe(
      false,
    );
  });

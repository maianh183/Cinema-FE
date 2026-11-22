import { test, expect } from '@playwright/test';
async function login(page) {
  await page.goto('/login');
  await page.getByLabel('Email', { exact: true }).fill('customer@cinema.test');
  await page.getByLabel('Mật khẩu', { exact: true }).fill('DemoCinema123!');
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Tài khoản của bạn' })).toBeVisible();
}
test('movie stars-only comment, report dialog, scoped cinema review', async ({ page }) => {
  await login(page);
  await page.goto('/movie/phim-demo-1');
  await expect(page.getByRole('heading', { name: 'Bình luận phim' })).toBeVisible();
  await page.getByRole('radio', { name: '4 sao' }).check();
  await page.getByRole('button', { name: 'Gửi bình luận', exact: true }).click();
  await expect(page.getByText('Đã gửi bình luận phim.')).toBeVisible();
  await expect(page.getByText('Người dùng này chỉ chấm điểm phim.').first()).toBeVisible();
  await page.getByRole('button', { name: 'Báo cáo', exact: true }).first().click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.getByRole('button', { name: 'Gửi báo cáo', exact: true }).click();
  await expect(
    page.getByText('Đã nhận báo cáo. Bộ phận quản lý sẽ xem xét nội dung.'),
  ).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.goto('/cinemas');
  await page.getByLabel('Nội dung đánh giá').fill('Đánh giá kiểm thử chi nhánh 1');
  await page.getByRole('button', { name: 'Gửi đánh giá', exact: true }).click();
  await expect(page.getByText('Đã gửi đánh giá cơ sở.')).toBeVisible();
  await page.getByRole('button', { name: /CineFlow Thủ Đức/ }).click();
  await expect(page.getByText('Đánh giá kiểm thử chi nhánh 1', { exact: true })).toHaveCount(0);
  await expect(page.getByLabel('Nội dung đánh giá')).toHaveValue('');
});
test('search, pagination, product cart, booking and untrusted payment URL', async ({ page }) => {
  await login(page);
  await page.goto('/movies');
  await expect(page.getByText('Trang 1 / 2')).toBeVisible();
  await page.getByRole('button', { name: 'Sau', exact: true }).click();
  await expect(page.getByText('Trang 2 / 2')).toBeVisible();
  await page.getByLabel('Tìm theo tên phim').fill('Hành trình');
  await expect(page.locator('.movie-grid h3').first()).toContainText('Hành trình');
  await page.goto('/products/1?type=FOOD_DRINK');
  await page.getByRole('button', { name: 'Thêm vào giỏ', exact: true }).click();
  await expect(page.getByText('Đã thêm vào giỏ hàng.')).toBeVisible();
  await page.goto('/cart');
  await expect(page.getByRole('spinbutton', { name: 'Số lượng' })).toHaveValue('1');
  await page.getByRole('spinbutton', { name: 'Số lượng' }).fill('2');
  await page.goto('/movie/phim-demo-1');
  await page.locator('.showtime-card').first().click();
  await page.getByRole('button', { name: /Ghế A2,/ }).click();
  await page.getByRole('button', { name: 'Giữ ghế & tiếp tục', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Thanh toán', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Tạo đơn & kiểm tra tổng tiền' }).click();
  await page.getByRole('button', { name: 'Tiếp tục thanh toán', exact: true }).click();
  await expect(page.getByText('Chờ thanh toán trực tuyến', { exact: true })).toBeVisible();
  const url = new URL(page.url());
  await page.goto(url.pathname + url.search + '&status=success');
  await expect(
    page.getByRole('heading', { name: 'Thanh toán thành công', exact: true }),
  ).toHaveCount(0);
  await expect(page.getByText('Chờ thanh toán trực tuyến', { exact: true })).toBeVisible();
});
test('contact validation, plain text news, FAQ and metadata', async ({ page }) => {
  await page.goto('/contact');
  await page.getByLabel('Họ tên', { exact: true }).fill('Khách kiểm thử');
  await page.getByLabel('Email', { exact: true }).fill('test@example.test');
  await page.getByLabel('Số điện thoại').fill('0901234567');
  await page.getByLabel('Chủ đề').fill('Hỗ trợ lịch chiếu');
  await page.getByLabel('Nội dung', { exact: true }).fill('Xin hỗ trợ');
  await page.getByRole('button', { name: 'Gửi liên hệ' }).click();
  await expect(page.getByText('Đã nhận thông tin liên hệ.')).toBeVisible();
  await page.goto('/faq');
  await expect(page.locator('details').first()).toBeVisible();
  await page.locator('summary').first().click();
  await page.goto('/news');
  await expect(page.locator('.news-card')).toHaveCount(4);
  await page.locator('.news-card').first().click();
  await expect(page.locator('.prose')).toContainText('Nội dung văn bản demo');
  await expect(page).toHaveTitle(/CineFlow/);
});
for (const width of [375, 768, 1024, 1440])
  test(`responsive public and member routes at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 });
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await login(page);
    for (const path of [
      '/',
      '/movies',
      '/movie/phim-demo-1',
      '/cinemas',
      '/products',
      '/cart',
      '/news',
      '/profile',
      '/history',
      '/pricing',
    ]) {
      await page.goto(path);
      await expect(page.locator('h1').first()).toBeVisible();
      await page.waitForTimeout(250);
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth + 1,
      );
      expect(overflow, path).toBe(false);
    }
    await page.goto('/');
    await page.screenshot({
      path: `test-results/screenshots/home-${width}.png`,
      fullPage: true,
    });
    expect(errors).toEqual([]);
  });

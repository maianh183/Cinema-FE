import { test, expect } from '@playwright/test';
import { todayVN, addDays } from '../../src/utils/calendar';
async function login(page, role) {
  await page.goto('/login');
  await page.getByLabel('Email', { exact: true }).fill(role + '@cinema.test');
  await page.getByLabel('Mật khẩu', { exact: true }).fill('Demo@12345');
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
  await expect(page.locator('header')).toBeVisible();
}
async function nav(page, name) {
  await page
    .getByRole('navigation', { name: 'Điều hướng chính' })
    .getByRole('link', { name, exact: true })
    .click();
}

test('staff creates a counter order then confirms payment and refreshes totals', async ({
  page,
}) => {
  await login(page, 'staff');
  await nav(page, 'Đơn hàng và vé');
  const total = page
      .getByRole('region', { name: 'Tổng số đơn hàng', exact: true })
      .locator('[data-stat-value]'),
    pending = page
      .getByRole('region', { name: 'Đơn chưa xử lý', exact: true })
      .locator('[data-stat-value]');
  await expect(total).toHaveText('16');
  const before = Number(await pending.textContent());
  await page.getByRole('button', { name: 'Tạo hóa đơn', exact: true }).click();
  await page
    .getByRole('button', { name: /P\.\d+.*\d{4}-\d{2}-\d{2}/ })
    .first()
    .click();
  await page.getByRole('button', { name: 'D10', exact: true }).click();
  await page.getByRole('button', { name: 'Tiếp tục', exact: true }).click();
  await page.getByRole('button', { name: 'Tiếp theo', exact: true }).click();
  await page.getByPlaceholder('Nhập SĐT để kiểm tra thành viên...').fill('0901000000');
  await page.getByRole('button', { name: 'Kiểm tra', exact: true }).click();
  await expect(page.getByText('Khách hàng Demo 1', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Tiếp tục thanh toán', exact: true }).click();
  await page.getByRole('button', { name: 'Hoàn tất & In vé', exact: true }).click();
  await expect(total).toHaveText('17');
  await expect(pending).toHaveText(String(before + 1));
  await page.getByPlaceholder('Tìm theo ID hoặc tên khách...').fill('148');
  await expect(page.locator('tbody tr')).toHaveCount(1);
  await page.getByRole('button', { name: 'Xác nhận', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Xác nhận', exact: true }).click();
  await expect(pending).toHaveText(String(before));
  await expect(total).toHaveText('17');
});
test('staff order statistics filters pagination and confirmation share one view', async ({
  page,
}) => {
  await login(page, 'staff');
  await nav(page, 'Đơn hàng và vé');
  const total = page.getByRole('region', { name: 'Tổng số đơn hàng', exact: true }),
    pending = page.getByRole('region', { name: 'Đơn chưa xử lý', exact: true });
  await expect(total.locator('[data-stat-value]')).toHaveText('16');
  const before = Number(await pending.locator('[data-stat-value]').textContent());
  await expect(page.getByText('Đơn đã hủy', { exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Sau', exact: true }).click();
  await expect(page.locator('tbody tr')).toHaveCount(6);
  await page.getByRole('button', { name: 'Trước', exact: true }).click();
  await page.getByPlaceholder('Tìm theo ID hoặc tên khách...').fill('100');
  await expect(page.locator('tbody tr')).toHaveCount(1);
  await page.getByRole('button', { name: 'Xác nhận', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Xác nhận', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(pending.locator('[data-stat-value]')).toHaveText(String(before - 1));
  await expect(total.locator('[data-stat-value]')).toHaveText('16');
  await expect(
    page.locator('tbody').getByRole('button', { name: 'Xác nhận', exact: true }),
  ).toHaveCount(0);
  await page.getByLabel('Lọc trạng thái đơn').selectOption('PENDING');
  await expect(page.locator('tbody tr')).toHaveCount(0);
  await page.getByPlaceholder('Tìm theo ID hoặc tên khách...').fill('');
  await expect(page.locator('tbody tr')).toHaveCount(before - 1);
});
test('staff calendar read-only, navigation and empty state retain calendar controls', async ({
  page,
}) => {
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await login(page, 'staff');
  await nav(page, 'Lịch làm việc');
  await expect(page.getByRole('button', { name: 'Tuần', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  const event = page.locator('[data-calendar-event]').first();
  await expect(event).toBeVisible();
  await event.click();
  await expect(page.getByRole('dialog')).toContainText('Nhân viên Demo');
  await expect(
    page.getByRole('dialog').getByRole('button', { name: /Chỉnh sửa|Hủy phân công/ }),
  ).toHaveCount(0);
  await page.getByRole('button', { name: 'Close', exact: true }).click();
  await expect(page.getByLabel('Nhân viên', { exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Thêm lịch làm việc' })).toHaveCount(0);
  await page.getByLabel('Ngày đang xem').fill('2026-12-31');
  await page.getByRole('button', { name: 'Ngày', exact: true }).click();
  await page.getByRole('button', { name: 'Khoảng tiếp theo' }).click();
  await expect(page.getByLabel('Ngày đang xem')).toHaveValue('2027-01-01');
  await page.getByRole('button', { name: 'Tháng', exact: true }).click();
  await expect(page.getByLabel('Ngày đang xem')).toHaveValue('2027-01-01');
  await page.getByLabel('Ngày đang xem').fill(addDays(todayVN(), 100));
  await expect(
    page.getByText('Bạn chưa có lịch làm việc trong khoảng thời gian này.', { exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Hôm nay', exact: true }).click();
  await expect(page.getByLabel('Ngày đang xem')).toHaveValue(todayVN());
  await expect(page.locator('[data-calendar-event]').first()).toBeVisible();
  expect(errors).toEqual([]);
});
test('manager unified dated schedule creates edits cancels and scopes employees', async ({
  page,
}) => {
  await login(page, 'manager');
  await nav(page, 'Lịch làm việc');
  await expect(page.getByRole('link', { name: 'Ca làm việc', exact: true })).toHaveCount(0);
  await expect(page.getByLabel('Chi nhánh', { exact: true })).toHaveCount(0);
  await expect(
    page.getByLabel('Nhân viên', { exact: true }).locator('option[value="NV004"]'),
  ).toHaveCount(0);
  const date = addDays(todayVN(), 70);
  await page.getByLabel('Ngày đang xem').fill(date);
  await page.getByRole('button', { name: 'Ngày', exact: true }).click();
  await page.getByRole('button', { name: 'Thêm lịch làm việc', exact: true }).click();
  const form = page.getByRole('dialog');
  await form.getByLabel('Nhân viên được phân công').selectOption('NV003');
  await form.getByLabel('Ca / công việc', { exact: true }).fill('Ca hồi quy');
  await form.getByLabel('Giờ bắt đầu').fill('09:00');
  await form.getByLabel('Giờ kết thúc').fill('12:00');
  await form.getByRole('button', { name: 'Lưu lịch làm việc' }).click();
  await expect(form).toHaveCount(0);
  let event = page.locator('[data-calendar-event]').filter({ hasText: 'Ca hồi quy' });
  await expect(event).toHaveAttribute('data-start-minute', '540');
  await expect(event).toHaveAttribute('data-end-minute', '720');
  await event.click();
  await page.getByRole('button', { name: 'Chỉnh sửa lịch', exact: true }).click();
  await form.getByLabel('Ca / công việc', { exact: true }).fill('Ca đã sửa');
  await form.getByRole('button', { name: 'Lưu lịch làm việc' }).click();
  await expect(form).toHaveCount(0);
  await page.locator('[data-calendar-event]').filter({ hasText: 'Ca đã sửa' }).click();
  await page.getByRole('button', { name: 'Hủy phân công', exact: true }).click();
  await page
    .getByRole('dialog')
    .last()
    .getByRole('button', { name: 'Xác nhận', exact: true })
    .click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByText('Không có lịch làm việc phù hợp.', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Hôm nay', exact: true }).click();
  await page.getByLabel('Chỉ xem lịch của tôi').check();
  await expect(page.getByRole('button', { name: 'Thêm lịch làm việc', exact: true })).toHaveCount(
    0,
  );
});
test('admin all branches and old schedule route redirect; removed settings and profile', async ({
  page,
}) => {
  await login(page, 'admin');
  await page.evaluate(() => {
    history.pushState({}, '', '/employees/workshift');
    dispatchEvent(new PopStateEvent('popstate'));
  });
  await expect(page).toHaveURL(/my-schedule/);
  await expect(page.getByLabel('Chi nhánh', { exact: true }).locator('option')).toHaveCount(5);
  await page.getByLabel('Chi nhánh', { exact: true }).selectOption('4');
  await expect(page.locator('[data-calendar-event]').first()).toContainText('Quận 7');
  await nav(page, 'Đánh giá');
  await expect(page.getByRole('navigation', { name: 'Phân trang' })).toContainText('32 bản ghi');
  await page.getByLabel('Chi nhánh', { exact: true }).selectOption('2');
  await expect(page.locator('tbody tr')).toHaveCount(8);
  await expect(page.getByRole('link', { name: 'Cấu hình', exact: true })).toHaveCount(0);
  await page.evaluate(() => {
    history.pushState({}, '', '/settings');
    dispatchEvent(new PopStateEvent('popstate'));
  });
  await expect(page.getByRole('heading', { name: '404', exact: true })).toBeVisible();
  await nav(page, 'Tài khoản cá nhân');
  await expect(page.getByRole('button', { name: 'Đổi mật khẩu', exact: true })).toBeVisible();
});
test('reviews and type-specific reports stay separate after seed expansion', async ({ page }) => {
  await login(page, 'manager');
  await nav(page, 'Đánh giá');
  await expect(page.getByRole('navigation', { name: 'Phân trang' })).toContainText('12 bản ghi');
  await page.getByRole('button', { name: 'Chi tiết', exact: true }).first().click();
  await expect(page.getByRole('dialog')).toContainText('Phòng: —');
  await expect(page.getByRole('dialog')).not.toContainText('Điểm phim');
  await page.getByRole('button', { name: 'Close', exact: true }).click();
  await nav(page, 'Báo cáo bình luận và đánh giá');
  await page.getByLabel('Đối tượng bị báo cáo').selectOption('CINEMA_REVIEW');
  await expect(page.locator('tbody')).not.toContainText('Điểm phim');
  await page.getByRole('button', { name: 'Chi tiết', exact: true }).first().click();
  await page.getByRole('button', { name: 'Xóa nội dung', exact: true }).click();
  await page
    .getByRole('dialog')
    .last()
    .getByRole('button', { name: 'Xác nhận', exact: true })
    .click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await nav(page, 'Đánh giá');
  await expect(page.getByRole('navigation', { name: 'Phân trang' })).toContainText('11 bản ghi');
});
test('shared showtime calendar and work calendar fit four widths including mobile modal', async ({
  page,
}) => {
  await login(page, 'manager');
  for (const width of [375, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 950 });
    for (const name of ['Lịch làm việc', 'Lịch chiếu']) {
      if (width < 1280)
        await page.getByRole('button', { name: 'Bật tắt menu', exact: true }).click();
      await nav(page, name);
      await expect(page.getByLabel('Lịch biểu', { exact: true })).toBeVisible();
      for (const mode of ['Ngày', 'Tuần', 'Tháng']) {
        await page.getByRole('button', { name: mode, exact: true }).click();
        expect(
          await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1),
          name + ' ' + mode + ' ' + width,
        ).toBe(true);
      }
    }
  }
  await page.setViewportSize({ width: 375, height: 950 });
  await page.getByRole('button', { name: 'Bật tắt menu', exact: true }).click();
  await nav(page, 'Lịch làm việc');
  await page.getByRole('button', { name: 'Thêm lịch làm việc', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await expect
    .poll(() =>
      dialog.evaluate(
        (el) =>
          el.getBoundingClientRect().right <= innerWidth && el.getBoundingClientRect().left >= 0,
      ),
    )
    .toBe(true);
  await page.screenshot({
    path: 'test-results/screenshots/dated-schedule-375.png',
    fullPage: true,
  });
});

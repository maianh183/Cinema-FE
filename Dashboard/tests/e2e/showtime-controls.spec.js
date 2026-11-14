import { test, expect } from '@playwright/test';
for (const role of ['manager', 'admin'])
  test(
    role + ' showtime controls remain available in calendar/list and preserve selected date',
    async ({ page }) => {
      await page.goto('/login');
      await page.getByLabel('Email', { exact: true }).fill(role + '@cinema.test');
      await page.getByLabel('Mật khẩu', { exact: true }).fill('Demo@12345');
      await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
      await page
        .getByRole('navigation', { name: 'Điều hướng chính' })
        .getByRole('link', { name: 'Lịch chiếu', exact: true })
        .click();
      const controls = page.getByRole('group', { name: 'Điều khiển lịch' }),
        date = controls.getByLabel('Ngày đang xem', { exact: true });
      await expect(controls).toHaveCount(1);
      await expect(controls.getByRole('button', { name: 'Tuần', exact: true })).toHaveAttribute(
        'aria-pressed',
        'true',
      );
      await date.fill('12/31/26');
      await date.press('Enter');
      for (const mode of ['Ngày', 'Tuần', 'Tháng']) {
        await controls.getByRole('button', { name: mode, exact: true }).click();
        await expect(date).toHaveValue('12/31/26');
        await expect(controls.getByRole('button', { name: mode, exact: true })).toHaveAttribute(
          'aria-pressed',
          'true',
        );
      }
      await controls.getByRole('button', { name: 'Ngày', exact: true }).click();
      await controls.getByRole('button', { name: 'Khoảng tiếp theo' }).click();
      await expect(date).toHaveValue('01/01/27');
      await date.fill('02/30/27');
      await date.press('Enter');
      await expect(controls.getByRole('alert')).toContainText('Nhập ngày hợp lệ');
      await controls.getByLabel('Chọn ngày trên lịch').fill('2027-02-28');
      await expect(date).toHaveValue('02/28/27');
      await page.getByRole('button', { name: 'Xem danh sách', exact: true }).click();
      await expect(controls).toBeVisible();
      await controls.getByRole('button', { name: 'Tháng', exact: true }).click();
      await expect(page.getByLabel('Lịch biểu', { exact: true })).toBeVisible();
      await expect(date).toHaveValue('02/28/27');
      await page.setViewportSize({ width: 375, height: 850 });
      await expect(date).toBeInViewport();
      for (const mode of ['Ngày', 'Tuần', 'Tháng'])
        await expect(controls.getByRole('button', { name: mode, exact: true })).toBeInViewport();
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1),
      ).toBe(true);
    },
  );

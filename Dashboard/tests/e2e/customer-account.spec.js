import { test, expect } from '@playwright/test';

test('admin edits mock customer, preserves detail fields and sees an explicit simulated reset', async ({
  page,
}) => {
  await page.goto('/login');
  await page.getByLabel('Email', { exact: true }).fill('admin@cinema.test');
  await page.getByLabel('Mật khẩu', { exact: true }).fill('Demo@12345');
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
  await page
    .getByRole('navigation', { name: 'Điều hướng chính' })
    .getByRole('link', { name: 'Khách hàng', exact: true })
    .click();
  const row = page.locator('tbody tr').first();
  await row.getByRole('button', { name: 'Chỉnh sửa', exact: true }).click();
  await page.getByLabel('Họ và tên').fill('Khách đã cập nhật');
  await page.getByRole('button', { name: 'Lưu hồ sơ', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(row).toContainText('Khách đã cập nhật');
  await row.getByRole('button', { name: 'Chi tiết', exact: true }).click();
  await expect(page.getByRole('dialog')).toContainText('KH001');
  await expect(page.getByRole('dialog')).toContainText('customer1@example.test');
  await page.keyboard.press('Escape');
  await row.getByRole('button', { name: 'Đặt lại mật khẩu', exact: true }).click();
  await expect(page.getByRole('dialog')).toContainText('không gửi email');
  await page.getByRole('button', { name: 'Xác nhận gửi yêu cầu', exact: true }).click();
  await expect(
    page.getByText('Mô phỏng đã tiếp nhận yêu cầu; không gửi email.', { exact: true }),
  ).toBeVisible();
});

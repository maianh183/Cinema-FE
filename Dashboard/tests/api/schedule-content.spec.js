import { test, expect } from '@playwright/test';
const ok = (data) => ({
  status: 200,
  contentType: 'application/json',
  body: JSON.stringify({ success: true, data }),
});
const fail = (status, message) => ({
  status,
  contentType: 'application/json',
  body: JSON.stringify({ success: false, message }),
});
const manager = {
  id: 'NV002',
  name: 'HTTP Manager',
  role: 'MANAGER',
  branchId: 1,
  branchIds: [1],
  permissions: [
    'workshifts:*',
    'cinema-reviews:read',
    'comment-reports:*',
    'coupons:*',
    'orders:read',
    'profile:*',
  ],
  csrfToken: 'test-csrf',
};
test('dated schedule HTTP validation fails without mutation; server failure keeps editor and calendar', async ({
  page,
}) => {
  let writes = 0;
  let saved = null;
  await page.route('**/api/**', (route) => {
    const req = route.request(),
      url = new URL(req.url());
    if (url.pathname === '/api/auth/me') return route.fulfill(ok(manager));
    if (url.pathname === '/api/branches')
      return route.fulfill(ok([{ branchId: 1, bName: 'Rạp HTTP' }]));
    if (url.pathname === '/api/employees/branch/1')
      return route.fulfill(
        ok([{ eUserId: 'NV003', eName: 'Nhân viên HTTP', branchId: 1, isActive: true }]),
      );
    if (url.pathname === '/api/work-schedules' && req.method() === 'GET')
      return route.fulfill(ok(saved ? [saved] : []));
    if (url.pathname === '/api/work-schedules' && req.method() === 'POST') {
      const body = req.postDataJSON();
      expect(body).not.toHaveProperty('wDate');
      expect(body.branchId).toBe(1);
      expect(body.employeeId).toBe('NV003');
      expect(req.headers()['x-csrf-token']).toBe('test-csrf');
      writes++;
      if (writes === 1) return route.fulfill(fail(409, 'Lịch vừa được phân công bởi người khác'));
      saved = { ...body, scheduleId: 99, employeeName: 'Nhân viên HTTP', branchName: 'Rạp HTTP' };
      return route.fulfill(ok(saved));
    }
    return route.fulfill(fail(404, 'Unknown'));
  });
  await page.goto('/my-schedule');
  await page.getByRole('button', { name: 'Thêm lịch làm việc', exact: true }).click();
  const form = page.getByRole('dialog');
  await form.getByLabel('Nhân viên được phân công').selectOption('NV003');
  await form.getByLabel('Ca / công việc').fill('Ca HTTP');
  await form.getByLabel('Giờ bắt đầu').fill('09:00');
  await form.getByLabel('Giờ kết thúc').fill('08:00');
  await form.getByRole('button', { name: 'Lưu lịch làm việc' }).click();
  await expect(form.getByRole('alert')).toContainText('Ngày/giờ không hợp lệ');
  expect(writes).toBe(0);
  await form.getByLabel('Giờ kết thúc').fill('12:00');
  await form.getByRole('button', { name: 'Lưu lịch làm việc' }).click();
  await expect(form.getByRole('alert')).toContainText('Lịch vừa được phân công');
  await expect(page.locator('[data-calendar-event]')).toHaveCount(0);
  await form.getByRole('button', { name: 'Lưu lịch làm việc' }).click();
  await expect(form).toHaveCount(0);
  await expect(page.locator('[data-calendar-event="99"]')).toBeVisible();
  expect(writes).toBe(2);
});
test('staff uses only session-derived personal schedule endpoint, and blocks management route', async ({
  page,
}) => {
  const calls = [];
  let empty = false;
  await page.route('**/api/**', (route) => {
    const url = new URL(route.request().url());
    calls.push(url.pathname);
    if (url.pathname === '/api/auth/me')
      return route.fulfill(
        ok({
          ...manager,
          id: 'NV003',
          role: 'STAFF',
          permissions: ['workshifts:read-own', 'profile:*'],
        }),
      );
    if (url.pathname === '/api/work-schedules/me') {
      expect([...url.searchParams.keys()].sort()).toEqual(['endDate', 'startDate']);
      return route.fulfill(
        ok(
          empty
            ? []
            : [
                {
                  employeeId: 'NV003',
                  branchId: 1,
                  branchName: 'Rạp của tôi',
                  scheduleId: 1,
                  workDate: url.searchParams.get('startDate'),
                  endDate: url.searchParams.get('startDate'),
                  startTime: '09:00:00',
                  endTime: '17:00:00',
                  work: 'Ca cá nhân',
                },
              ],
        ),
      );
    }
    return route.fulfill(fail(403, 'Không được tải danh sách nhân sự'));
  });
  await page.goto('/my-schedule');
  await expect(page.getByText('Ca cá nhân', { exact: true })).toBeVisible();
  await expect(page.getByLabel('Nhân viên', { exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Thêm lịch làm việc' })).toHaveCount(0);
  await page.getByRole('button').filter({ hasText: 'Ca cá nhân' }).click();
  await expect(
    page.getByRole('dialog').getByRole('button', { name: /Chỉnh sửa|Xóa|Gỡ phân công/ }),
  ).toHaveCount(0);
  await page.getByRole('button', { name: 'Close', exact: true }).click();
  empty = true;
  await page.getByLabel('Ngày đang xem').fill('2028-01-10');
  await expect(
    page.getByText('Bạn chưa có lịch làm việc trong khoảng thời gian này.', { exact: true }),
  ).toBeVisible();
  await page.goto('/employees/workshift');
  await expect(page).toHaveURL(/my-schedule/);
  await expect(page.getByRole('heading', { name: 'Lịch làm việc', exact: true })).toBeVisible();
  expect(calls.every((p) => ['/api/auth/me', '/api/work-schedules/me'].includes(p))).toBe(true);
});
test('personal schedule errors and foreign identity never display another employee schedule', async ({
  page,
}) => {
  let state = 'forbidden';
  await page.route('**/api/**', (route) => route.fulfill(okOrError(route.request().url())));
  function okOrError(url) {
    if (url.endsWith('/auth/me'))
      return ok({ ...manager, id: 'NV003', role: 'STAFF', permissions: ['workshifts:read-own'] });
    return state === 'forbidden'
      ? fail(403, 'Forbidden')
      : ok([
          {
            employeeId: 'NV999',
            branchId: 2,
            wDate: 1,
            work: 'Secret',
            startTime: '09:00',
            endTime: '10:00',
          },
        ]);
  }
  await page.goto('/my-schedule');
  await expect(
    page.getByText('Bạn không có quyền thực hiện thao tác này.', { exact: true }),
  ).toBeVisible();
  state = 'foreign';
  await page.getByRole('button', { name: 'Thử lại' }).click();
  await expect(
    page.getByText('API lịch cá nhân trả dữ liệu không đúng tài khoản.', { exact: true }),
  ).toBeVisible();
  await expect(page.getByText('Secret', { exact: true })).toHaveCount(0);
});
for (const action of ['DISMISS', 'DELETE'])
  test(`report ${action}: failed HTTP keeps pending; success uses atomic endpoint`, async ({
    page,
  }) => {
    let calls = 0;
    const report = {
      reportId: 1,
      targetType: 'CINEMA_REVIEW',
      targetId: 7,
      reporterId: 'KH002',
      reporterName: 'Người báo cáo',
      reason: 'Lý do HTTP',
      status: 'PENDING',
      resolutionAction: null,
      reportedAt: '2026-10-25T10:00:00+07:00',
      target: {
        reviewId: 7,
        userId: 'KH001',
        authorName: 'Người đánh giá',
        branchId: 1,
        branchName: 'Rạp HTTP',
        roomId: null,
        content: 'Nội dung cần kiểm tra',
      },
    };
    await page.route('**/api/**', (route) => {
      const req = route.request(),
        path = new URL(req.url()).pathname;
      if (path === '/api/auth/me') return route.fulfill(ok(manager));
      if (path === '/api/comment-reports' && req.method() === 'GET')
        return route.fulfill(ok([report]));
      if (path === '/api/comment-reports/1/resolve') {
        expect(req.method()).toBe('POST');
        expect(req.postDataJSON()).toEqual({ action });
        expect(req.headers()['x-csrf-token']).toBe('test-csrf');
        calls++;
        if (calls === 1) return route.fulfill(fail(500, 'Chưa thể xử lý nội dung'));
        Object.assign(report, {
          status: 'RESOLVED',
          resolutionAction: action,
          resolvedAt: '2026-10-25T11:00:00+07:00',
        });
        return route.fulfill(ok(report));
      }
      throw new Error('Unexpected non-atomic request: ' + path);
    });
    await page.goto('/comment-reports');
    const row = page.locator('tbody tr');
    await row.getByRole('button', { name: 'Chi tiết' }).click();
    const detail = page.getByRole('dialog').first();
    await expect(detail).toContainText('Phòng: —');
    await expect(detail).not.toContainText('Điểm phim');
    await detail
      .getByRole('button', {
        name: action === 'DELETE' ? 'Xóa nội dung' : 'Bác bỏ báo cáo',
        exact: true,
      })
      .click();
    const confirmation = page.getByRole('dialog').last();
    await confirmation.getByRole('button', { name: 'Xác nhận', exact: true }).click();
    await expect(confirmation.getByRole('alert')).toContainText('Chưa thể xử lý nội dung');
    await expect(row).toContainText('Chưa xử lý');
    await confirmation.getByRole('button', { name: 'Xác nhận', exact: true }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(row).toContainText('Đã xử lý');
    await row.getByRole('button', { name: 'Chi tiết' }).click();
    await expect(page.getByRole('button', { name: /^(Bác bỏ báo cáo|Xóa nội dung)$/ })).toHaveCount(
      0,
    );
    expect(calls).toBe(2);
  });
test('voucher HTTP payload contains only effective dates and total, errors preserve form', async ({
  page,
}) => {
  let writes = 0;
  const coupon = {
    couponId: 1,
    startDate: '2026-01-01',
    endDate: '2027-12-31',
    releaseNum: 100,
    availNum: 70,
    saleOff: 10,
    releaseDate: '2025-12-01',
    isActive: false,
  };
  await page.route('**/api/**', (route) => {
    const req = route.request(),
      path = new URL(req.url()).pathname;
    if (path === '/api/auth/me') return route.fulfill(ok(manager));
    if (req.method() === 'GET') return route.fulfill(ok([coupon]));
    expect(path).toBe('/api/coupons/1');
    const body = req.postDataJSON();
    for (const key of ['releaseDate', 'isActive', 'availNum']) expect(body).not.toHaveProperty(key);
    expect(body.releaseNum).toBe(120);
    writes++;
    if (writes === 1)
      return route.fulfill(fail(409, 'Voucher vừa được cập nhật, vui lòng thử lại'));
    Object.assign(coupon, body, { availNum: 90 });
    return route.fulfill(ok(coupon));
  });
  await page.goto('/coupons');
  await expect(page.getByText('Đã vô hiệu hóa', { exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Sửa mã 1' }).click();
  const modal = page.getByRole('dialog');
  await expect(modal.getByLabel('Ngày phát hành')).toHaveCount(0);
  await expect(modal.getByRole('checkbox')).toHaveCount(0);
  await modal.getByLabel('Số lượng phát hành').fill('99');
  await expect(modal.getByRole('button', { name: 'Cập nhật ngay' })).toBeDisabled();
  await modal.getByLabel('Số lượng phát hành').fill('120');
  await modal.getByRole('button', { name: 'Cập nhật ngay' }).click();
  await expect(modal.getByRole('alert')).toContainText('Voucher vừa được cập nhật');
  await modal.getByRole('button', { name: 'Cập nhật ngay' }).click();
  await expect(modal).toHaveCount(0);
  await expect(page.locator('tbody')).toContainText('25%');
  expect(writes).toBe(2);
});
test('review filters use server pagination and only assigned branch options', async ({ page }) => {
  const queries = [];
  await page.route('**/api/**', (route) => {
    const url = new URL(route.request().url());
    if (url.pathname === '/api/auth/me')
      return route.fulfill(ok({ ...manager, branchIds: [1, 3] }));
    if (url.pathname === '/api/branches')
      return route.fulfill(
        ok([
          { branchId: 1, bName: 'Rạp 1' },
          { branchId: 3, bName: 'Rạp 3' },
        ]),
      );
    if (url.pathname === '/api/rooms') return route.fulfill(ok([{ branchId: 3, roomId: 1 }]));
    if (url.pathname === '/api/cinema-reviews') {
      queries.push(Object.fromEntries(url.searchParams));
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: [
            {
              reviewId: 1,
              branchId: Number(url.searchParams.get('branchId') || 1),
              roomId: null,
              userId: 'KH001',
              content: 'Trải nghiệm HTTP',
              createdAt: '2026-10-25T09:00:00+07:00',
            },
          ],
          meta: { total: 11 },
        }),
      });
    }
    return route.fulfill(fail(404, 'Unknown'));
  });
  await page.goto('/cinema-reviews');
  await expect(page.locator('tbody')).toContainText('Trải nghiệm HTTP');
  await page.getByRole('button', { name: 'Sau', exact: true }).click();
  await expect.poll(() => queries.at(-1)?.page).toBe('2');
  await page.getByLabel('Chi nhánh', { exact: true }).selectOption('3');
  await page.getByLabel('Phòng', { exact: true }).selectOption('1');
  await page.getByLabel('Tìm đánh giá', { exact: true }).fill('Trải nghiệm');
  await expect
    .poll(() => queries.at(-1))
    .toMatchObject({ page: '1', branchId: '3', roomId: '1', q: 'Trải nghiệm' });
  await expect(
    page.getByLabel('Chi nhánh', { exact: true }).locator('option[value="2"]'),
  ).toHaveCount(0);
  await expect(page.getByRole('button', { name: /Duyệt|Xóa/ })).toHaveCount(0);
});

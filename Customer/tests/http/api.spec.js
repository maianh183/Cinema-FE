import { test, expect } from "@playwright/test";
const fulfill = (route, data, status = 200) =>
  route.fulfill({
    status,
    contentType: "application/json",
    body: JSON.stringify({
      success: status === 200,
      data,
      ...(status !== 200 ? { message: "Lỗi kiểm thử" } : {}),
    }),
  });
test("live transport sends cookie credentials and CSRF, never invents contact success", async ({
  page,
}) => {
  let body,
    token,
    fail = true;
  await page.route("**/api/auth/me", (route) => fulfill(route, null, 401));
  await page.route("**/api/auth/csrf", (route) =>
    fulfill(route, { csrfToken: "server-token" }),
  );
  await page.route("**/api/contacts", (route) => {
    body = route.request().postDataJSON();
    token = route.request().headers()["x-csrf-token"];
    return fulfill(
      route,
      fail ? null : { id: 42, received: true },
      fail ? 422 : 200,
    );
  });
  await page.goto("/contact");
  await page.getByLabel("Họ tên", { exact: true }).fill("  Khách kiểm thử  ");
  await page.getByLabel("Email", { exact: true }).fill("test@example.test");
  await page.getByLabel("Số điện thoại").fill("0901234567");
  await page.getByLabel("Chủ đề").fill("Hỗ trợ");
  await page.getByLabel("Nội dung", { exact: true }).fill("Nội dung");
  await page.getByRole("button", { name: "Gửi liên hệ" }).click();
  await expect(page.getByRole("alert")).toContainText("Lỗi kiểm thử");
  await expect(page.getByText("Đã nhận thông tin liên hệ.")).toHaveCount(0);
  expect(body.fullName).toBe("Khách kiểm thử");
  expect(token).toBe("server-token");
  fail = false;
  await page.getByRole("button", { name: "Gửi liên hệ" }).click();
  await expect(page.getByText("Đã nhận thông tin liên hệ.")).toBeVisible();
});
test("payment success requires matching server order, ignores query and browser storage", async ({
  page,
}) => {
  await page.route("**/api/auth/me", (route) =>
    fulfill(route, {
      userId: "KH001",
      fullName: "Khách",
      role: "CUSTOMER",
      csrfToken: "token",
    }),
  );
  let status = "FAILED";
  await page.route("**/api/customer/orders/42", (route) =>
    fulfill(route, { orderId: 42, orderStatus: status, total: 80000 }),
  );
  await page.goto("/checkout/status?orderId=42&status=success");
  await expect(
    page.getByRole("heading", { name: "Thanh toán thất bại", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Thanh toán thành công", exact: true }),
  ).toHaveCount(0);
  status = "PAID";
  await page.getByRole("button", { name: "Kiểm tra lại" }).click();
  await expect(
    page.getByRole("heading", { name: "Thanh toán thành công", exact: true }),
  ).toBeVisible();
});
test("403, 409 and false envelopes never appear as successful writes", async ({
  page,
}) => {
  await page.route("**/api/auth/me", (route) =>
    fulfill(route, {
      userId: "KH001",
      fullName: "Khách",
      email: "test@example.test",
      role: "CUSTOMER",
      csrfToken: "token",
      phone: "0901234567",
      dob: "2000-01-01",
    }),
  );
  let code = 403;
  await page.route("**/api/customers/me", (route) =>
    code === 200
      ? route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ success: false, message: "Không lưu" }),
        })
      : fulfill(route, null, code),
  );
  await page.goto("/profile");
  await page.getByRole("button", { name: "Lưu hồ sơ" }).click();
  await expect(page.getByRole("alert")).toContainText("Lỗi kiểm thử");
  code = 409;
  await page.getByRole("button", { name: "Lưu hồ sơ" }).click();
  await expect(page.getByRole("alert")).toContainText("Lỗi kiểm thử");
  code = 200;
  await page.getByRole("button", { name: "Lưu hồ sơ" }).click();
  await expect(page.getByRole("alert")).toContainText("Không lưu");
  await expect(page.getByText("Đã lưu hồ sơ.")).toHaveCount(0);
});
test("plain-text content is escaped and unpublished news is filtered", async ({
  page,
}) => {
  await page.route("**/api/auth/me", (route) => fulfill(route, null, 401));
  await page.route("**/api/public/news", (route) =>
    fulfill(route, [
      {
        id: 1,
        slug: "public",
        title: "Công khai",
        seoTitle: "Bài công khai",
        content: '<img src=x onerror="window.pwned=true">',
        status: "PUBLISHED",
        category: "Tin",
        createdAt: "2026-10-26",
      },
      {
        id: 2,
        slug: "secret",
        title: "Bản nháp riêng tư",
        content: "Không công khai",
        status: "DRAFT",
      },
    ]),
  );
  await page.goto("/news/public");
  await expect(page.locator(".prose")).toContainText("<img");
  expect(await page.evaluate(() => window.pwned)).toBeUndefined();
  await page.goto("/news/secret");
  await expect(
    page.getByText("Bài viết không tồn tại hoặc chưa được công khai."),
  ).toBeVisible();
});

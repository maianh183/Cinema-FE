import { test, expect } from "@playwright/test";
test("mock editorial content stays public and guest contact receipt persists UNREAD privately", async ({
  page,
}) => {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/contact");
  await expect(page.locator(".business-contact")).toContainText(
    "info@cinema.test",
  );
  await expect(
    page.getByRole("button", { name: "Tải lại nội dung" }),
  ).toHaveCount(0);
  await page.getByLabel("Họ tên", { exact: true }).fill(" ");
  await page.getByLabel("Email", { exact: true }).fill("private@example.test");
  await page.getByLabel("Số điện thoại").fill("0901234567");
  await page.getByLabel("Chủ đề").fill("Góp ý");
  await page.getByLabel("Nội dung", { exact: true }).fill("Kiểm thử liên hệ");
  await page.getByRole("button", { name: "Gửi liên hệ" }).click();
  await expect(page.getByRole("alert")).toContainText("khoảng trắng");
  await page.getByLabel("Họ tên", { exact: true }).fill("Khách Demo");
  await page.getByRole("button", { name: "Gửi liên hệ" }).click();
  await expect(page.getByText("Đã nhận thông tin liên hệ.")).toBeVisible();
  await expect(page.getByLabel("Email", { exact: true })).toHaveValue("");
  const saved = await page.evaluate(() =>
    JSON.parse(sessionStorage.getItem("cms-demo-v1")),
  );
  expect(saved.session).toBeNull();
  expect(saved.db.contacts.at(-1)).toMatchObject({
    email: "private@example.test",
    status: "UNREAD",
  });
  expect(saved.db.contacts.at(-1).createdAt).toMatch(/Z$/);
  await page.reload();
  await expect(page.locator("body")).not.toContainText("private@example.test");
  await expect(page.locator(".business-contact")).toContainText(
    "info@cinema.test",
  );
  expect(errors).toEqual([]);
});

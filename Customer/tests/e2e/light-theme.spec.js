import { test, expect } from "@playwright/test";

async function login(page) {
  await page.goto("/login");
  await page.getByLabel("Email", { exact: true }).fill("customer@cinema.test");
  await page.getByLabel("Mật khẩu", { exact: true }).fill("DemoCinema123!");
  await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Tài khoản của bạn" }),
  ).toBeVisible();
}

// Checks rendered foreground/background pairs, including ancestor alpha compositing.
// Media pixels/native OS popups and disabled controls are outside this measurement.
async function contrastFailures(page) {
  return page.evaluate(() => {
    const rgb = (value) => {
      const n = value.match(/[\d.]+/g)?.map(Number) || [];
      return [n[0] || 0, n[1] || 0, n[2] || 0, n.length > 3 ? n[3] : 1];
    };
    const blend = (a, b) => [
      ...a.slice(0, 3).map((v, i) => v * a[3] + b[i] * (1 - a[3])),
      1,
    ];
    const bg = (el) => {
      const chain = [];
      for (let p = el; p; p = p.parentElement) chain.unshift(p);
      return chain.reduce(
        (color, p) => blend(rgb(getComputedStyle(p).backgroundColor), color),
        [255, 255, 255, 1],
      );
    };
    const lum = (c) =>
      c
        .slice(0, 3)
        .map((v) => {
          v /= 255;
          return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
        })
        .reduce((sum, v, i) => sum + v * [0.2126, 0.7152, 0.0722][i], 0);
    const failures = [];
    for (const el of document.querySelectorAll("body *")) {
      if (el.closest("svg,script,style") || el.closest("[disabled]")) continue;
      const text = [...el.childNodes]
        .filter((n) => n.nodeType === 3)
        .map((n) => n.textContent.trim())
        .join(" ")
        .trim();
      if (
        !text &&
        !el.matches("input:not([type=radio]):not([type=file]),textarea,select")
      )
        continue;
      const style = getComputedStyle(el),
        rect = el.getBoundingClientRect();
      if (
        !rect.width ||
        !rect.height ||
        rect.bottom < 0 ||
        style.visibility === "hidden"
      )
        continue;
      let hidden = false;
      for (let p = el; p; p = p.parentElement)
        if (Number(getComputedStyle(p).opacity) === 0) hidden = true;
      if (hidden) continue;
      const back = bg(el),
        front = blend(rgb(style.color), back),
        a = lum(back),
        b = lum(front),
        ratio = (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
      const large =
          parseFloat(style.fontSize) >= 24 ||
          (parseFloat(style.fontSize) >= 18.66 &&
            Number(style.fontWeight) >= 700),
        required = large ? 3 : 4.5;
      if (ratio + 0.01 < required)
        failures.push({
          text: text.slice(0, 70) || el.getAttribute("aria-label"),
          selector: el.tagName + "." + el.className,
          ratio: ratio.toFixed(2),
          required,
          color: style.color,
          background: back,
        });
      if (el.matches("input[placeholder],textarea[placeholder]")) {
        const ph = blend(
            rgb(getComputedStyle(el, "::placeholder").color),
            back,
          ),
          l = lum(ph),
          r = (Math.max(a, l) + 0.05) / (Math.min(a, l) + 0.05);
        if (r < 4.5) failures.push({ text: "placeholder", ratio: r });
      }
    }
    return failures;
  });
}

for (const width of [375, 768, 1024, 1440]) {
  test(`light surfaces, text contrast and responsive at ${width}px`, async ({
    page,
  }) => {
    test.setTimeout(90000);
    await page.setViewportSize({ width, height: 950 });
    await login(page);
    const routes = [
      "/",
      "/movies",
      "/movie/phim-demo-1",
      "/cinemas",
      "/products",
      "/products/1?type=FOOD_DRINK",
      "/cart",
      "/promotions",
      "/about",
      "/services",
      "/pricing",
      "/contact",
      "/faq",
      "/news",
      "/news/tin-dien-anh-2",
      "/profile",
      "/history",
      "/checkout/status?orderId=100",
      "/login",
      "/register",
      "/forgot-password",
    ];
    for (const path of routes) {
      await page.goto(path);
      await expect(page.locator("h1").first()).toBeVisible();
      await expect(
        page.locator("main").getByText("Đang tải dữ liệu…", { exact: true }),
      ).toHaveCount(0);
      await expect(page.locator("body")).toHaveCSS(
        "background-color",
        "rgb(246, 247, 251)",
      );
      await expect(page.locator(".site-header")).toHaveCSS(
        "background-color",
        "rgb(255, 255, 255)",
      );
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth > innerWidth + 1,
        ),
        path,
      ).toBe(false);
      expect(await contrastFailures(page), path).toEqual([]);
      if (
        [
          "/",
          "/movie/phim-demo-1",
          "/cinemas",
          "/products",
          "/profile",
        ].includes(path)
      )
        await page.screenshot({
          path: `test-results/screenshots/light-${path === "/" ? "home" : path.split("/")[1]}-${width}.png`,
          fullPage: true,
        });
    }
  });
}

test("light interactive states: mobile navigation, focus, hover, dialog, success/error", async ({
  page,
}) => {
  await page.setViewportSize({ width: 375, height: 950 });
  await page.goto("/login");
  const submit = page.getByRole("button", { name: "Đăng nhập", exact: true });
  await submit.hover();
  await expect(submit).toHaveCSS("background-color", "rgb(67, 56, 202)");
  await page.getByRole("button", { name: "Menu", exact: true }).click();
  await expect(
    page.getByRole("navigation", { name: "Điều hướng chính" }),
  ).toBeVisible();
  const email = page.getByLabel("Email", { exact: true });
  await email.focus();
  await expect(email).toHaveCSS("border-color", "rgb(79, 70, 229)");
  await email.fill("customer@cinema.test");
  await page.getByLabel("Mật khẩu", { exact: true }).fill("wrong");
  await submit.click();
  await expect(page.getByRole("alert")).toBeVisible();
  expect(await contrastFailures(page)).toEqual([]);
  await page.screenshot({
    path: "test-results/screenshots/light-auth-error-375.png",
    fullPage: true,
  });
  await login(page);
  await page.goto("/movie/phim-demo-1");
  await page
    .getByRole("button", { name: "Báo cáo", exact: true })
    .first()
    .click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toHaveCSS("background-color", "rgb(255, 255, 255)");
  expect(await contrastFailures(page)).toEqual([]);
  await page.getByRole("button", { name: "Gửi báo cáo", exact: true }).click();
  await expect(dialog.getByRole("status")).toBeVisible();
  expect(await contrastFailures(page)).toEqual([]);
  await page.screenshot({
    path: "test-results/screenshots/light-report-dialog-375.png",
  });
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
});

test("seat symbols, checkout and local status palettes remain legible", async ({
  page,
}) => {
  await login(page);
  await page.setViewportSize({ width: 375, height: 950 });
  await page.goto("/movie/phim-demo-1");
  await page.locator(".showtime-card").first().click();
  const seat = page.getByRole("button", { name: /Ghế A2,/ });
  await seat.click();
  await expect(seat).toContainText("✓");
  await expect(seat).toHaveCSS("background-color", "rgb(79, 70, 229)");
  await expect(page.locator(".seat.vip").first()).toContainText("V");
  await expect(page.locator(".legend-seat.sold")).toContainText("×");
  await expect(page.locator(".legend-seat.held")).toContainText("⏳");
  expect(await contrastFailures(page)).toEqual([]);
  await page.screenshot({
    path: "test-results/screenshots/light-seats-375.png",
    fullPage: true,
  });
  await page
    .getByRole("button", { name: "Giữ ghế & tiếp tục", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Tạo đơn & kiểm tra tổng tiền" }),
  ).toBeVisible();
  expect(await contrastFailures(page)).toEqual([]);
  await page.screenshot({
    path: "test-results/screenshots/light-checkout-375.png",
    fullPage: true,
  });
});

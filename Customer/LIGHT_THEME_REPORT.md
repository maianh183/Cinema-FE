# Modern Light Cinema — báo cáo thay đổi

Đã chuyển Customer Frontend sang light theme, giữ nguyên kiến trúc, routing, API contract, dữ liệu và nghiệp vụ. Phạm vi này không thêm dark mode hoặc dữ liệu demo mới.

## Hệ thống màu và component

Màu được tập trung trong `src/app/globals.css` dưới dạng Tailwind v4 semantic tokens. `src/styles.css` và JSX sử dụng cùng các tokens; giữ các alias `surface`, `on-surface`, `surface-container-*` để component hiện có tiếp tục hoạt động.

| Vai trò | Màu |
|---|---|
| Background / card | `#F6F7FB` / `#FFFFFF` |
| Secondary background / subtle section | `#EEF2FF` / `#F1F5F9` |
| Foreground / secondary text | `#1F2937` / `#64748B` |
| Muted trang trí | `#94A3B8` |
| Muted foreground trên nền tint / placeholder | `#526176` |
| Primary / hover / primary foreground | `#4F46E5` / `#4338CA` / `#FFFFFF` |
| Secondary / success | `#0F766E` |
| Accent / accent foreground | `#F97373` / `#963333` |
| Border / divider | `#E5E7EB` / `#E2E8F0` |
| Input border / ring | `#7C899C` / `#4F46E5` |
| Destructive / warning | `#B42318` / `#854D0E` |

`#94A3B8` không dùng làm chữ nội dung thông thường. Chữ phụ trên nền tint dùng sắc xám đậm hơn để đáp ứng tương phản. Coral dùng tiết chế cho trang trí và trạng thái giữ ghế; warning chỉ dành cho ngữ nghĩa cảnh báo, không phải màu thương hiệu. Shadow dùng slate với opacity thấp, radius card/control nhất quán, hover nâng card nhẹ và focus Indigo. Tôn trọng `prefers-reduced-motion`.

- **Header/footer:** nền trắng hoặc slate rất nhạt, logo Indigo, active navigation có underline, CTA tài khoản Indigo; menu mobile cùng theme.
- **Home:** hero với nền Indigo nhạt, nội dung trên card trắng; giữ ảnh phim. Các section phim, voucher, giới thiệu và tin tức đồng bộ.
- **Movie cards:** poster riêng, phần thông tin nền trắng, tiêu đề xám đậm, metadata xám phụ, age badge rõ, CTA Indigo; hover/focus nâng nhẹ.
- **Phim/rạp:** hero chi tiết sáng, bộ lọc/input trắng, lịch chiếu và branch cards sáng, tabs Indigo. Rating 1–5 sao, bình luận phim, đánh giá cơ sở và báo cáo giữ nguyên mô hình/logic.
- **Booking/checkout:** summary trắng, giá rõ, coupon/select sáng. Ghế trống trắng; chọn Indigo + ✓; đã bán slate + ×; đang giữ nền Coral nhạt + ⏳; VIP viền Teal nét đứt + V; ngừng sử dụng viền xám nét đứt + –. Có legend và aria-label mô tả trạng thái. Sơ đồ ghế cuộn trong vùng riêng ở mobile.
- **Products/cart/voucher:** product cards trắng, giá Indigo, status badges có nhãn văn bản và semantic color; voucher gradient rất nhạt. Không đổi điều kiện bán hàng hoặc lọc voucher.
- **Auth/profile/history/payment:** form trắng, label xám đậm, input border rõ, lỗi đỏ, thành công Teal; trạng thái đơn/thanh toán có nền semantic. Không đổi validation, phiên đăng nhập hoặc xử lý thanh toán.
- **Trang thông tin:** giới thiệu, dịch vụ, bảng giá, liên hệ, FAQ, tin tức và chi tiết tin dùng cùng Page/panel/typography.
- **Shared UI:** buttons, fields, select/options, radio/checkbox, file input, dialog, tabs, accordion, notice/loading/empty/error/success, pagination, bảng và scrollbar đều sáng. Date input/native controls dùng `color-scheme: light`. Repo hiện dùng inline feedback/loading, không có hệ thống toast/skeleton/tooltip tùy biến riêng để chuyển đổi.

## File đã sửa

| File | Nội dung |
|---|---|
| `src/app/globals.css` | Semantic tokens, light color scheme, global utilities, scrollbar, shadow/radius |
| `src/styles.css` | Toàn bộ layout/component surfaces, typography, interaction states, responsive và seat palette |
| `src/components/layout/Header.jsx` | CTA tài khoản dùng button variant chung |
| `src/components/shared/MoviesCard.jsx` | Cấu trúc card poster + nội dung trắng |
| `src/components/shared/UI.jsx` | Semantic success feedback |
| `src/features/home/components/HeroSection.jsx` | Hero sáng, card nội dung và CTA |
| `src/features/home/components/PremiumPromoSection.jsx` | Giới thiệu/voucher light surfaces |
| `src/features/movie-detail/components/MovieHeroSection.jsx` | Movie hero, metadata, poster, CTA/trailer |
| `src/features/booking/components/SeatSelectionLayout.jsx` | Ký hiệu ghế, legend, aria-label, data-state trình bày |
| `src/pages/CatalogPages.jsx` | Semantic product status badges |
| `src/pages/AccountPages.jsx` | Semantic order/payment status presentation |
| `public/placeholder-movie.svg` | Placeholder sáng đồng bộ Indigo |
| `public/placeholder-product.svg` | Placeholder sáng đồng bộ Indigo |
| `index.html` | Browser theme-color sáng |
| `README.md` | Mô tả theme, tokens và hướng dẫn tra cứu báo cáo |

File mới: `tests/e2e/light-theme.spec.js` (6 kiểm thử UI) và `LIGHT_THEME_REPORT.md`.

Footer, checkout, cinema reviews, movie reviews, report dialog, auth và content pages được chuyển đổi qua stylesheet/token chung; không cần sửa nghiệp vụ trong từng file JSX. Hai SVG độc lập khai báo palette trực tiếp vì ảnh ngoài không kế thừa CSS variables của document.

Đã đối chiếu hash trước/sau lần chỉnh theme: `src/services/*`, `src/store/*`, `src/lib/*`, `src/mocks/*`, `src/main.jsx`, `API_CONTRACT.md`, `package.json`, `package-lock.json` không thay đổi. Snapshot `before-light-theme.zip` và danh sách `light-theme-protected-hashes.json` đã được chuyển sang kho lưu riêng ngoài bản bàn giao ngày 2026-11-04; xem [JAVASCRIPT_ONLY_REPORT.md](JAVASCRIPT_ONLY_REPORT.md).

## Kiểm thử

| Kiểm tra | Kết quả |
|---|---|
| `npm run build` | Thành công, tạo bản production trong `dist/` |
| `npm run lint` | Thành công |
| `npm test` | 9/9 đạt |
| `npm run test:e2e` | 18/18 đạt: 12 regression + 6 theme |
| `npm run test:http` | 4/4 đạt khi chạy độc lập |
| Kiểm tra theme sau chỉnh khoảng cách badge sản phẩm | 6/6 đạt |

Chạy trên Microsoft Edge bằng Playwright. Kiểm tra 21 routes ở mỗi độ rộng **375, 768, 1024, 1440px**; kiểm tra body/header sáng, không tràn ngang toàn trang, contrast chữ/placeholder theo computed CSS. Có kiểm tra hover, focus, menu mobile, lỗi đăng nhập, dialog báo cáo/thành công, ký hiệu ghế và checkout. Bộ regression xác minh đăng ký, hồ sơ, mật khẩu/avatar, bình luận/rating, đánh giá cơ sở, tìm/lọc/phân trang, giỏ hàng, booking, nội dung và thanh toán.

Đã sửa placeholder header từ tỷ lệ 4,34:1 lên mức vượt 4,5:1 trên nền slate nhạt. Mục tiêu đo là 4,5:1 cho chữ thường, 3:1 cho chữ lớn, theo [WCAG Contrast Minimum](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html); trạng thái ghế có ký hiệu/nhãn ngoài màu theo [Use of Color](https://www.w3.org/WAI/WCAG22/Understanding/use-of-color.html).

Một lần chạy HTTP gặp lỗi `EBUSY` khi Vite đổi tên cache trên Windows; chạy lại độc lập thành công cả 4 tests, không đổi API hoặc test assertions để né lỗi.

Ảnh kiểm chứng lần chỉnh theme đã được bảo toàn ngoài bản bàn giao. Test hiện ghi `test-results/screenshots/light-*.png`: home/movie/cinemas/products/profile ở bốn độ rộng, cùng auth error, report dialog, seats và checkout ở mobile. Đã xem ảnh để kiểm tra bố cục và độ rõ của card/form/dialog.

## Nền tối cục bộ và giới hạn kiểm chứng

- Chỉ backdrop phía sau modal dùng slate bán trong suốt để tách lớp; bản thân dialog trắng. Ghế đã bán dùng slate đậm trong phạm vi từng ghế.
- Poster/backdrop/trailer giữ màu gốc của nội dung điện ảnh; iframe video có thể hiển thị nền tối của nhà cung cấp. Không có trang nào dùng nền đen làm nền chính.
- Không còn hạng mục chuyển theme đang chờ xử lý. Kiểm thử contrast tự động không phải chứng nhận WCAG toàn diện: không phân tích từng pixel ảnh/video, popup native của hệ điều hành hoặc mọi tổ hợp nội dung từ backend tương lai.
- HTTP tests dùng phản hồi API kiểm soát trong trình duyệt. Workspace chưa có PHP backend thật, nên không tuyên bố đã xác minh giao dịch production với PHP.

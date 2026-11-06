# Báo cáo triển khai CMS Cinema Customer Frontend

## Phạm vi đã làm

Đã chỉnh trực tiếp workspace `C:/cms-fe`; không có Git nên lưu bản gốc trong snapshot `original-customer.zip`. Snapshot đã được chuyển sang kho lưu ngoài bản bàn giao khi dọn JavaScript-only ngày 2026-11-04; xem [JAVASCRIPT_ONLY_REPORT.md](JAVASCRIPT_ONLY_REPORT.md). Đã đọc assignment.pdf và tham chiếu trực tiếp Dashboard tại `C:/cms-dashboard` (contract, services, model, dữ liệu demo), không sửa Dashboard. Không viết server nghiệp vụ JavaScript hoặc PHP backend ngoài phạm vi yêu cầu frontend.

Audit ban đầu: Next 16/TSX, token localStorage, Spring/ngrok defaults, STOMP giữ ghế, rating 10, review DTO thiếu ID, khuyến mãi hardcode, thiếu public pages, nhiều nút trang trí, nhầm type ghế, checkout dùng dữ liệu client và URL kết quả. Sau thay đổi: React 19/Vite/JSX, router tập trung, API cookie/CSRF, service riêng cho bình luận/rạp/report/reservation, mock public có quan hệ và các luồng khách hàng hoạt động.

## Trang bổ sung

`/movies`, `/about`, `/services`, `/pricing`, `/contact`, `/faq`, `/news`, `/news/:slug`, `/products`, `/products/:id`, `/cart`, `/forgot-password`, `/reset-password`. Các trang có sẵn home/movie/cinemas/promotions/login/register/profile/history/booking/checkout/status được migrate và nối API/mocks mới. Routes khôi phục phụ thuộc capability flag backend.

## Các điểm nghiệp vụ đã sửa

- Bình luận phim: 5 sao, nội dung tùy chọn, ID phim/comment, sao radio dùng bàn phím, trung bình /5, report riêng.
- Đánh giá cơ sở: branch/room đúng scope, không rating phim, form/list/phân trang riêng, remount khi đổi cơ sở.
- Report: đúng targetType/targetId, danh tính session, chỉ PENDING từ service; không duyệt/xóa tự động.
- Sản phẩm: hai nhóm đúng model; ngày/tồn quyết định trạng thái, không isActive; cart không chứa giá tin cậy.
- Voucher: PREACTIVE/ACTIVE/EXPIRED theo thời gian, tồn, min/max; bỏ banner/campaign giả và giá quảng cáo hardcode.
- Booking: type 1 Thường/2 VIP, rPrice+sPrice, trạng thái theo timeId, reservation/expiry server, polling và xử lý conflict.
- Checkout: không owner/branch giả/giá frontend/PAID trong request; idempotency key; trạng thái GET từ server đúng orderId.
- Auth/profile: cookie session, CSRF RAM, 401/403/409/422, upload multipart thật vs Data URL demo, không quyền reset qua admin.
- UI: mobile navigation, tìm phim header, link bản đồ thật theo địa chỉ; bỏ nút thông báo/newsletter/social trang trí; news text an toàn, metadata, empty/loading/error, native dialog.

## API khác biệt đã xử lý và phần PHP cần làm

Xem bảng mapping đầy đủ trong [API_CONTRACT.md](API_CONTRACT.md). Customer dùng đúng movieId,branchId,roomId,timeId,productId/itemType,couponId,commentId,reviewId,reportId. Không còn dùng `/reviews` chung hoặc API quản trị để đọc public. Giữ fields dữ liệu Dashboard, thêm các facade public/customer có tài liệu trạng thái đề xuất.

**Tất cả endpoint PHP chưa được xác minh.** Cần PHP triển khai public catalog/content, session/CSRF/auth/profile/avatar, contact/email, movie-comments/cinema-reviews/comment-reports, reservation transaction, customer orders/payments/webhook. Backend phải thống nhất trạng thái online AWAITING_PAYMENT, request reservation/idempotency, server validation và quyền đọc/ghi theo session. Không tuyên bố frontend đã thanh toán, upload server hay gửi email thật.

## Mock Mode

Kho public chọn lọc từ Dashboard: phim hiện tại/sắp chiếu, bốn cơ sở, tám phòng, 14 ngày suất chiếu, ghế, hai nhóm hàng, voucher đủ thời gian/trạng thái, FAQ/news và comments/reviews. Chỉ whitelist public fields; không nhân sự/quyền/lương. Có tài khoản demo, lịch sử đơn PAID/DEMO, đơn mới AWAITING_PAYMENT, báo cáo mẫu cho cả hai loại và các mutation tương tác.

Mock không có giao dịch tiền thật, email, server upload, khóa đa tab/máy hay đồng bộ trực tiếp kho Dashboard. Đơn mới không tự PAID. Tồn/voucher không được transaction mô phỏng như server thật. Dữ liệu demo không chứng minh PHP hoạt động.

## Kiểm thử, giới hạn và cách chạy

Xem kết quả cuối dưới đây và [ASSIGNMENT_CHECKLIST.md](ASSIGNMENT_CHECKLIST.md). Giao diện được kiểm tra ở 375/768/1024/1440 px gồm home, phim, bình luận, rạp/review, ghế, checkout, cart, profile, news. Đã xem ảnh home desktop/mobile, phim tablet và ghế/checkout mobile; sơ đồ ghế cuộn ngang có hướng dẫn trên màn hình nhỏ.

Chưa kiểm tra W3C validator, Firefox/Safari, backend thật hoặc provider thật. SEO là metadata phía client của SPA, chưa SSR/prerender/sitemap domain thật. Nội dung giới thiệu tĩnh cần doanh nghiệp duyệt khi triển khai thực tế; seed không có poster nên dùng placeholder local thay vì quảng cáo/ảnh phim bịa.

Chạy demo: `npm ci` rồi `npm run dev:mock`, mở `http://127.0.0.1:5173`. Email `customer@cinema.test`, mật khẩu `DemoCinema123!`. Chạy thật: `.env.local` từ `.env.example`, `VITE_USE_MOCK=false`, cấu hình PHP theo contract, rồi `npm run dev` hoặc `npm run build`. Hướng dẫn đầy đủ ở [README.md](README.md).

## Kết quả xác minh cuối (2026-10-26)

| Kiểm tra | Kết quả thực tế |
|---|---|
| `npm run build` | PASS, Vite 7.3.7, bundle production không có repository mock; JS 355.88 kB, gzip 114.95 kB |
| Build mock vào output riêng (lần migration) | PASS, kho demo được tách thành dynamic chunk; output lịch sử đã lưu riêng |
| `npm run lint` | PASS, không lỗi ESLint |
| `npm test` | PASS — 9/9 nghiệp vụ |
| `npm run test:e2e` | PASS — 12/12, Microsoft Edge headless, 4 viewport |
| `npm run test:http` | PASS — 4/4 HTTP interception phía client |
| `npm audit fix` | 225 packages audited, 0 vulnerabilities sau cập nhật |
| Kiểm tra hình ảnh | Home 375/1440, movie 768, seats/checkout/cinema 375 và cart 1024 đã xem; ảnh lịch sử đã lưu riêng, ảnh test mới ở test-results/screenshots |

Tổng 25 test qua. Các lỗi tooling ban đầu (sandbox spawn EPERM, thiếu Chromium, hai Playwright jobs dùng chung outputDir) đã được xử lý và chạy lại thành công. OutputDir/cache mode đã tách; không còn lỗi app trong lần E2E cuối. Chưa làm kiểm thử PHP thật, W3C validator hoặc Firefox/Safari.


## Danh sách file thay đổi

Đối chiếu snapshot trước migration: **43 file mới, 5 file sửa, 70 file cũ thay thế/gỡ**. Không liệt kê node_modules, dist, ảnh/báo cáo test sinh ra. Các TS/TSX cũ được thay bằng JSX/services mới và còn nguyên trong snapshot.

### Thêm

- `.env.example`
- `.env.mock`
- `API_CONTRACT.md`
- `ASSIGNMENT_CHECKLIST.md`
- `IMPLEMENTATION_REPORT.md`
- `index.html`
- `playwright.config.js`
- `playwright.http.config.js`
- `public/.htaccess`
- `public/placeholder-movie.svg`
- `public/placeholder-product.svg`
- `public/robots.txt`
- `scripts/import-public-fixtures.mjs`
- `src/components/layout/Footer.jsx`
- `src/components/layout/Header.jsx`
- `src/components/shared/MoviesCard.jsx`
- `src/components/shared/ReportContentDialog.jsx`
- `src/components/shared/UI.jsx`
- `src/features/booking/components/SeatSelectionLayout.jsx`
- `src/features/checkout/components/CheckoutLayout.jsx`
- `src/features/cinemas/components/CinemaReviewSection.jsx`
- `src/features/home/components/HeroSection.jsx`
- `src/features/home/components/NowShowingSection.jsx`
- `src/features/home/components/PremiumPromoSection.jsx`
- `src/features/movie-detail/components/MovieHeroSection.jsx`
- `src/features/movie-detail/components/MovieReviewSection.jsx`
- `src/lib/business.js`
- `src/main.jsx`
- `src/mocks/public-seed.json`
- `src/mocks/repository.js`
- `src/pages/AccountPages.jsx`
- `src/pages/CatalogPages.jsx`
- `src/pages/ContentPages.jsx`
- `src/services/api.js`
- `src/services/customer.js`
- `src/store/cartStore.js`
- `src/store/userStore.js`
- `src/styles.css`
- `tests/business.test.js`
- `tests/e2e/account.spec.js`
- `tests/e2e/customer.spec.js`
- `tests/http/api.spec.js`
- `vite.config.js`

### Sửa

- `.gitignore`
- `README.md`
- `eslint.config.mjs`
- `package-lock.json`
- `package.json`

### Thay thế/gỡ

- `components.json`
- `components/ui/button.tsx`
- `lib/utils.ts`
- `next.config.ts`
- `postcss.config.mjs`
- `public/file.svg`
- `public/globe.svg`
- `public/next.svg`
- `public/vercel.svg`
- `public/window.svg`
- `src/app/booking/showtime/[id]/page.tsx`
- `src/app/checkout/page.tsx`
- `src/app/checkout/status/page.tsx`
- `src/app/cinemas/page.tsx`
- `src/app/history/page.tsx`
- `src/app/layout.tsx`
- `src/app/login/page.tsx`
- `src/app/movie/[slug]/page.tsx`
- `src/app/page.tsx`
- `src/app/profile/page.tsx`
- `src/app/promotions/page.tsx`
- `src/app/register/page.tsx`
- `src/components/layout/CustomerLayout.tsx`
- `src/components/layout/Footer.tsx`
- `src/components/layout/Header.tsx`
- `src/components/shared/MoviesCard.tsx`
- `src/features/auth/components/LoginForm.tsx`
- `src/features/auth/components/RegisterForm.tsx`
- `src/features/auth/index.ts`
- `src/features/booking/components/SeatSelectionLayout.tsx`
- `src/features/booking/index.ts`
- `src/features/checkout/components/CheckoutLayout.tsx`
- `src/features/checkout/index.ts`
- `src/features/cinemas/components/CinemaDetails.tsx`
- `src/features/cinemas/components/CinemaList.tsx`
- `src/features/cinemas/components/CinemasPage.tsx`
- `src/features/home/components/HeroSection.tsx`
- `src/features/home/components/NowShowingSection.tsx`
- `src/features/home/components/PremiumPromoSection.tsx`
- `src/features/home/index.ts`
- `src/features/movie-detail/components/MovieHeroSection.tsx`
- `src/features/movie-detail/components/MovieReviewSection.tsx`
- `src/features/movie-detail/components/MovieShowTimesSection.tsx`
- `src/features/movie-detail/index.ts`
- `src/features/profile/components/PaymentHistory.tsx`
- `src/features/profile/components/ProfileLayout.tsx`
- `src/features/profile/components/TicketHistory.tsx`
- `src/features/profile/index.ts`
- `src/features/promotions/components/PromotionCard.tsx`
- `src/features/promotions/components/PromotionsPage.tsx`
- `src/lib/token.ts`
- `src/services/api.ts`
- `src/services/auth.service.ts`
- `src/services/booking.service.ts`
- `src/services/checkout.service.ts`
- `src/services/cinema.service.ts`
- `src/services/movies.service.ts`
- `src/services/review.service.ts`
- `src/services/seatWebSocket.service.ts`
- `src/services/user.service.ts`
- `src/store/userStore.ts`
- `src/types/auth.type.ts`
- `src/types/booking.type.ts`
- `src/types/checkout.type.ts`
- `src/types/cinema.type.ts`
- `src/types/movie.type.ts`
- `src/types/user.type.ts`
- `src/types/websocket.type.ts`
- `tailwind.config.ts`
- `tsconfig.json`


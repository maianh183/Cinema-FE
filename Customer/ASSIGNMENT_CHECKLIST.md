# Checklist nghiệm thu Customer Frontend

Ngày kiểm tra: 2026-10-26 (Asia/Saigon). `[x]` dưới đây đánh dấu phần **frontend đã triển khai và kiểm tra**; không có nghĩa PHP/MySQL hay toàn bộ assignment đã hoàn thành.

## Công nghệ và kiến trúc

- [x] React 19 + Vite + JS/JSX + React Router, Tailwind, Axios, Zustand.
- [x] Bỏ Next runtime/routing/dependencies, TypeScript source và STOMP/SockJS.
- [x] Hero/card, bố cục thông tin phim và mô hình chọn ghế; theme hiện tại đã chuyển Modern Light Cinema, xem `LIGHT_THEME_REPORT.md`.
- [x] Không có admin/staff routes hoặc thao tác xác nhận thanh toán nhân sự.
- [x] API layer public/customer, cookie/CSRF; Mock Mode tách biệt, banner demo.
- [x] Dashboard được đối chiếu read-only; public fixture dùng allowlist.
- [x] Source cũ có snapshot `original-customer.zip` được bảo toàn ngoài bản bàn giao; xem `JAVASCRIPT_ONLY_REPORT.md`.

## Trang công khai và thành viên

- [x] Trang chủ, phim đang/sắp chiếu, chi tiết phim, trailer hợp lệ, lịch chiếu.
- [x] Rạp: tìm, cơ sở/phòng, bản đồ, suất chiếu, đánh giá theo chi nhánh.
- [x] Giới thiệu, dịch vụ từ dữ liệu loại phòng, bảng giá từ basePrice.
- [x] Liên hệ đủ 5 trường, validation, loading, xác nhận từ service.
- [x] FAQ chỉ PUBLISHED, accordion/tìm/sortOrder.
- [x] Tin tức PUBLISHED, tìm/lọc/phân trang, chi tiết, metadata, liên quan.
- [x] Sản phẩm hai nhóm, tìm/lọc/phân trang, chi tiết/số lượng/trạng thái.
- [x] Cart riêng, cập nhật/xóa/số lượng/tạm tính, quay lại checkout đang giữ ghế.
- [x] Voucher theo thời gian/tồn/minimum/cap; không quảng cáo MOCK_PROMOS hardcode.
- [x] Login/register, profile, đổi mật khẩu, avatar, logout, khôi phục session, history.
- [x] Quên/reset mật khẩu có capability flag; không giả vờ gửi email/reset thành công trong mock.
- [x] Header search/mobile menu/footer, 404, empty/error/retry, chặn submit trùng.
- [x] Form labels, focus, native radio 5 sao và dialog modal Escape/focus containment.
- [x] Metadata, semantic HTML, ảnh alt, slug, robots; ghi rõ hạn chế SEO SPA.

## Nội dung khách hàng

- [x] MovieComment.movieId/commentId đúng, rating nguyên 1–5, content nullable/trim/max.
- [x] Trung bình thang 5, sao không dùng giá trị 10; nội dung rỗng có mô tả phù hợp.
- [x] CinemaReview.branchId/reviewId đúng, roomId tùy chọn đúng branch, không rating/movieId.
- [x] Đổi chi nhánh không giữ bản nháp của chi nhánh cũ; danh sách/phân trang theo branch.
- [x] ReportContentDialog cho cả hai loại, targetId đúng, reason, PENDING từ service.
- [x] Không gửi owner/reporter ID tùy ý; không tự xóa/ẩn khi báo cáo.
- [x] Chỉ hiển thị VISIBLE; dữ liệu mới được tải lại sau mutation và khi quay lại focus tab.
- [x] Tất cả nội dung plain text, không thực thi HTML.

## Đặt vé / thanh toán

- [x] timeId scope cho sơ đồ và trạng thái ghế; không lấy sold chung theo phòng.
- [x] Ghế type 1/2 đúng Dashboard, giá phòng + phụ thu ghế; không default branchId=1.
- [x] REST reservation service: get/hold/release/status/expiry, polling 5 giây, lỗi xung đột.
- [x] Checkout đối chiếu reservation, sản phẩm, voucher; payload không chứa giá hoặc PAID.
- [x] IdempotencyKey cho retry tạo đơn; server response là nguồn tổng tiền.
- [x] Payment status GET đúng orderId; không tin URL status/localStorage/SSE.
- [x] PENDING quầy, PAID xác minh; AWAITING_PAYMENT online ghi rõ đề xuất PHP cần thống nhất.
- [x] FAILED/CANCELLED/EXPIRED/REFUNDED hiển thị riêng.
- [x] Lịch sử giao dịch phù hợp mock; không có checkout sản phẩm độc lập.

## Chưa được xác minh / còn ngoài phạm vi frontend

- [ ] PHP thuần + MySQL chạy thật, migration schema, session/CSRF/CORS/rate-limit/ownership trên server.
- [ ] Transaction/locking ghế, tồn kho, voucher trên nhiều khách/tab/máy, idempotency server.
- [ ] Payment provider/webhook và reconciliation thật; không có giao dịch thu tiền thật được thử.
- [ ] Upload ảnh server/MIME/re-encode, gửi email/contact và token khôi phục thật.
- [ ] Đồng bộ report/customer writes với Dashboard qua PHP chung (hai mock repository độc lập).
- [ ] Thống nhất trạng thái online AWAITING_PAYMENT và các public facade mới với PHP.
- [ ] SSR/prerender, sitemap domain thật, HTTP 404/SEO crawler đầy đủ.
- [ ] Kiểm tra W3C validator và đa engine Firefox/Safari; đã kiểm tra Edge/Chromium, không tuyên bố các kiểm tra khác đã làm.
- [ ] Nghiệm thu tổng thể assignment, database, báo cáo môn học và các module nội bộ nằm ngoài yêu cầu chỉnh Customer.

## Kết quả thực thi

Kết quả migration được ghi trong `IMPLEMENTATION_REPORT.md`. Kiểm tra lúc migration gồm build production/mock, ESLint, 9 unit nghiệp vụ, bộ Playwright E2E (tài khoản, nội dung, giỏ hàng, booking/payment, 4 viewport), 4 HTTP interception tests và npm audit. Ảnh mới nằm trong `test-results/screenshots/`, báo cáo E2E trong `playwright-report/`; ảnh lịch sử đã chuyển sang kho lưu riêng. Kết quả kiểm tra JavaScript-only mới nhất nằm trong `JAVASCRIPT_ONLY_REPORT.md`.

## Bổ sung Liên hệ / nội dung công khai 06/11/2026

- [x] Giữ /contact, ContactPage, contactService.send; validate và chỉ reset sau receipt đúng.
- [x] GET /public/site-content: sáu section đúng proposal Dashboard, không gọi API quản trị.
- [x] Header/Footer/Home/About/Services/Pricing/Contact đọc nội dung qua provider chung.
- [x] Fallback/loading/retry, URL an toàn, plain text, SEO client; giá vẫn lấy từ service nghiệp vụ.
- [x] Mock contact UNREAD/createdAt, public projection không chứa dữ liệu liên hệ.
- [ ] PHP/MySQL tích hợp thật, validation chung, rate limit/CSRF guest, cache/upload ownership còn cần xác nhận.

Kết quả thực tế lần này: [CUSTOMER_EDITORIAL_REPORT.md](docs/CUSTOMER_EDITORIAL_REPORT.md); không dùng kết quả mock thay cho nghiệm thu PHP.

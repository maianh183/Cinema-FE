# Báo cáo Customer — Liên hệ và Nội dung website

Ngày 06/11/2026. Repository thực hiện: `C:\cms-delivery\Customer`. Chỉ đọc Dashboard để đối chiếu proposal; không sửa repository Dashboard. Không tạo PHP backend, không đổi dependency/framework, không thay nghiệp vụ auth/order/payment/catalog. Chuẩn mở rộng: [CONTACT_WEBSITE_CONTENT_API_PROPOSAL.md](CONTACT_WEBSITE_CONTENT_API_PROPOSAL.md); tài liệu nền [SHARED_API_CONTRACT.md](../../docs/SHARED_API_CONTRACT.md) giữ nguyên các mục OPEN.

## Kết quả triển khai

- Giữ `/contact`, `ContactPage`, `contactService.send` và POST `/contacts`; validation năm trường, trim, giới hạn độ dài, email/điện thoại hiện có. Chỉ reset khi receipt có ID số nguyên dương và received=true. Lỗi 400/422/429/network/timeout không mất nội dung; mutation lock chặn gửi lặp khi đang chờ. Không gửi email từ frontend.
- GET `/public/site-content` qua API client hiện có, unwrap một lần và adapter đúng sáu section. Chỉ allowlist public fields, kiểm tra kiểu/length/URL/plain text, không raw HTML/iframe hoặc dữ liệu audit/liên hệ cá nhân.
- Header/Footer và thương hiệu trang chủ dùng global; home có khối giới thiệu gọn sau hero phim; About/Services/Pricing/Contact dùng nội dung tương ứng. Danh sách phim/phòng/sản phẩm, voucher và số tiền vẫn lấy service nghiệp vụ. Metadata title/description dùng nội dung đã validate.
- Provider chia sẻ state RAM, refresh khi mount/focus/retry; không persistent cache. Thiếu/lỗi API dùng nội dung mặc định an toàn với thông báo; không coi đó là đã đồng bộ. Ảnh thiếu/lỗi dùng placeholder local, link social/map HTTPS. Fallback không bịa thông tin doanh nghiệp thật.
- Mock GET trả sáu section; contact guest lưu UNREAD/createdAt/numeric ID, chỉ trả receipt. Mock Customer không có API quản trị và không tự chia sẻ dữ liệu với Dashboard.

## File thay đổi

| File | Thay đổi |
|---|---|
| `src/lib/contact.js` (mới) | Validation/allowlist request, kiểm tra receipt, thông báo lỗi liên hệ |
| `src/lib/siteContent.js` (mới) | Schema, fallback, adapter public, URL an toàn |
| `src/services/siteContentService.js` (mới) | GET public site-content |
| `src/services/customer.js` | Hoàn thiện contactService.send, giữ tên/API |
| `src/services/api.js` | Giữ error.code để nhận biết lỗi mạng/timeout, không đổi transport/auth |
| `src/store/siteContentContext.js` (mới) | Context nội dung công khai |
| `src/components/shared/SiteContent.jsx` (mới) | Provider, fallback status/retry, ảnh, thông tin doanh nghiệp, home editorial |
| `src/components/shared/UI.jsx` | Page brand và SEO suffix/description từ global |
| `src/components/layout/Header.jsx` | Logo/tên doanh nghiệp từ API |
| `src/components/layout/Footer.jsx` | Thương hiệu, thông tin doanh nghiệp, social, trạng thái fallback |
| `src/pages/ContentPages.jsx` | About/Services/Pricing/Contact đọc nội dung API, giữ form/catalog/giá |
| `src/features/home/components/PremiumPromoSection.jsx` | Tên doanh nghiệp trong khối giới thiệu trang chủ |
| `src/main.jsx` | Bọc provider và thêm khối home editorial; giữ routes |
| `src/styles.css` | Bố cục nhỏ cho logo/editorial/business info, wrap nội dung dài, giữ light tokens |
| `src/mocks/site-content-seed.json` (mới) | Sáu section mẫu độc lập Dashboard runtime |
| `src/mocks/repository.js` | Public GET, guest POST contact validation/UNREAD/createdAt/numeric ID |
| `public/placeholder-site.svg` (mới) | Placeholder logo/ảnh biên tập local |
| `tests/editorial.test.js` (mới) | 10 unit tests hợp đồng, validation, receipt, mock guest, public allowlist, fallback, URL, API scope, giá |
| `tests/http/editorial.spec.js` (mới) | 4 browser tests real-client transport với response giả lập: receipt/error/reset/duplicate, sáu section/SEO/catalog, fallback/retry/focus, nội dung dài và 4 viewport |
| `tests/e2e/editorial.spec.js` (mới) | Guest submit Mock Mode, whitespace, receipt/reset, private storage và reload |
| `API_CONTRACT.md` | Endpoint/schema/validation mới và nguồn nội dung |
| `README.md` | Hướng dẫn nội dung/Mock Mode, giới hạn PHP và tài liệu |
| `ASSIGNMENT_CHECKLIST.md` | Checklist phạm vi mới |
| `docs/CUSTOMER_CONTRACT_DIFF.md` | Ghi nhận O-12 mới, giữ kết quả lịch sử lần đồng bộ trước |
| `docs/CONTACT_WEBSITE_CONTENT_API_PROPOSAL.md` (mới) | Schema/endpoints tương thích Dashboard, khác biệt validation, quyết định PHP |
| `docs/CUSTOMER_EDITORIAL_REPORT.md` (mới) | Báo cáo này |

Không xóa file, không đổi package.json/package-lock, không sửa src/mocks/public-seed.json hoặc bản Shared contract. Generated outputs ở dist/test-results/playwright-report theo cấu hình cũ, không phải mã nguồn bàn giao.

## Kiểm thử thực tế

| Lệnh / kiểm tra | Kết quả thực tế |
|---|---|
| npm run check:language | PASS: 77 first-party files; 27 JS, 18 JSX, 3 MJS, không TS/Python tự viết |
| npm run lint | PASS sau thay đổi cuối |
| npm test | PASS 42/42, gồm 10 unit tests mới |
| npm run build | PASS, Vite production build |
| npm run test:http | PASS 12/12 Edge tests, gồm 4 test mới và nội dung dài ở 375/768/1024/1440px |
| npm run test:e2e | PASS 19/19 Edge tests sau thay đổi cuối, gồm 1 test mới; responsive/light/contrast 375/768/1024/1440px |
| Schema đối chiếu Dashboard | PASS: sáu section, tên field và max length giống nhau; chỉ đọc module schema của Dashboard |
| Liên kết tài liệu local | PASS 36 liên kết tồn tại |

Đã xem ảnh trang chủ mobile 375px và desktop 1440px; layout sáng, điều hướng, nội dung biên tập, phim, voucher và Footer hiển thị đúng. Ảnh kiểm thử nằm trong test-results/screenshots theo cấu hình hiện có.

Bộ E2E giữ các kiểm tra cũ về auth/profile/avatar, bình luận/review/report, sản phẩm/cart, booking/checkout/payment, mobile navigation/modal/focus, light surfaces và text contrast. HTTP test dùng real Axios/service + response interception, không có PHP server. Mock/E2E không chứng minh transaction, phân quyền hoặc lưu DB phía PHP.

Lượt HTTP đầu có một test cũ timeout khi chờ form render; các lượt chạy đầy đủ sau PASS, không xóa test hoặc nới assertion. Lint ban đầu phát hiện regex ký tự điều khiển; đã sửa bằng kiểm tra mã ký tự và lint lại thành công. Không báo email hay backend đã hoạt động thật.

## Chưa tương thích / PHP cần xác nhận

1. O-12: triển khai PHP public content/contact persistence, receipt chỉ sau commit, server projection không audit/PII. GET `/public/site-content`, POST `/contacts` và các endpoint ADMIN trong proposal chưa được kiểm chứng trên backend thật.
2. Customer giữ phone bắt buộc 8–15 số (+ tùy chọn), name/email/subject tối đa 100/200/150. Dashboard proposal cho phone optional/formatted 6–30 ký tự và name/email/subject 160/254/250. Schema tên field khớp, validation cần PHP thống nhất.
3. Guest CSRF/Origin/cookie, rate limit/anti-spam, lỗi 400/422/429, duplicate sau timeout, audit/retention/xóa và email workflow chưa xác minh. Không tự thêm request ID/idempotency field chưa được hợp đồng cho phép.
4. Upload ownership/MIME/storage/CDN, cache invalidation/ETag/version/conflict nhiều ADMIN cần backend chốt. Customer chỉ refresh qua mount/focus/retry; không realtime hay bảo đảm invalidation cache server.
5. Hai mock độc lập. Chưa có kiểm thử Dashboard PUT → PHP → Customer GET hoặc Customer POST → Dashboard GET với backend chung. Dashboard mock Data URL upload không phải ảnh hợp lệ để Customer production đọc.
6. O-01–O-11 ngoài phạm vi lần này, giữ trạng thái OPEN. SEO vẫn là SPA client metadata, không SSR/prerender; browser đã thử Edge/Chromium, chưa nghiệm thu Safari/Firefox hoặc PHP/MySQL.

# CineFlow — Dashboard nội bộ

Dành cho ADMIN, MANAGER và STAFF. Dùng Node.js 22.12+ hoặc 24 và npm thống nhất với Customer (máy xác minh monorepo: Node 24.11.1 / npm 11.6.2). React/Vite cũng khai báo hỗ trợ Node 20.19+; phiên bản dependency cụ thể nằm trong package-lock.json.

Đã bỏ trang Tổng quan. Sau đăng nhập, ứng dụng mở module đầu tiên được cấp quyền (ADMIN/MANAGER mặc định là Phim).

## Ngôn ngữ và công nghệ

JavaScript ES6+ (ES Modules), JSX, HTML5, CSS3; React 19, Vite 7, Tailwind CSS 4, React Router, Axios, Zustand, Radix UI và Recharts. Node.js chỉ phục vụ development/build/test; backend dự kiến là PHP thuần/MySQL, Customer Frontend là dự án riêng.

Mã ứng dụng và công cụ tự phát triển không dùng TypeScript để viết/biên dịch, không dùng Python trong build/runtime. Các dependency npm có thể kèm TypeScript declarations hoặc mã nội bộ bằng ngôn ngữ khác; đó không phải mã nguồn của nhóm.

## Cài đặt và chạy

```bash
npm ci
npm run dev
```

Mở http://127.0.0.1:3001. Development mặc định bật Mock Mode trong `.env.development`, không cần PHP backend để chạy demo.

Mock CRUD lưu trong bộ nhớ; tải lại trang sẽ reset dữ liệu và phiên demo. Đặt `VITE_USE_MOCK=true` để bật, `false` để gọi API thật; không tự chuyển sang mock khi API lỗi.

Đăng nhập demo: `admin@cinema.test`, `manager@cinema.test` hoặc `staff@cinema.test`; mật khẩu chung: `Demo@12345` (chỉ dùng cho mock).

## Build và xem thử

```bash
npm run build
npm run preview
```

Build nằm trong `dist/`; preview tại http://127.0.0.1:4173. Production mặc định tắt mock, cần cấu hình API thật trước khi build.

## Kết nối PHP API

Tạo `.env.development.local` khi chạy dev hoặc `.env.production.local` khi build:

```dotenv
VITE_USE_MOCK=false
VITE_API_BASE_URL=http://localhost/cinema-api
VITE_AUTH_REFRESH=false
```

Thay URL bằng địa chỉ backend thực tế, rồi khởi động lại dev server hoặc build lại. Workspace chưa có PHP/MySQL backend. Xem [hợp đồng chung](../docs/SHARED_API_CONTRACT.md), [API internal](API_CONTRACT.md), [đối chiếu Dashboard và các mục OPEN](docs/DASHBOARD_CONTRACT_DIFF.md), [.env.example](.env.example).

Cookie/CSRF là hợp đồng mục tiêu: khi chưa có token, mutation lấy `/auth/csrf` trước. Login nhận `{user,csrfToken}` hoặc legacy token-only rồi xác minh `/auth/me`. Refresh mặc định tắt, chỉ bật `VITE_AUTH_REFRESH=true` nếu PHP đã thống nhất hỗ trợ; không áp dụng quyết định này cho Customer. Đơn online được đọc với nhãn riêng, không xác nhận thanh toán quầy; O-01–O-11 còn OPEN; O-12 DECIDED về phạm vi, chi tiết PHP vẫn PENDING_BACKEND_CONFIRMATION.

## Kiểm tra

```bash
npm run check:language
npm run lint
npm test
npm run test:e2e
npm run test:http
```

Test trình duyệt dùng Microsoft Edge; cần để trống cổng 3001 và 3002. Test HTTP dùng phản hồi giả lập, không kiểm thử PHP thật.

Mốc kiểm tra lịch sử ngày 01/11/2026: cài sạch, kiểm tra ngôn ngữ, lint và build đạt; 81 unit tests, 32 UI tests và 19 HTTP tests đạt. Chi tiết phạm vi ở [báo cáo audit](LANGUAGE_AUDIT.md).

`check:language` kiểm tra phần mở rộng, cú pháp JS/JSX bằng Espree, import công cụ TypeScript và lệnh Python/TypeScript nhận diện được tĩnh. Script chỉ báo lỗi (exit code 1), không xóa file; bỏ qua dependency và kết quả build/test. Lint bao gồm source, tests, scripts và cấu hình JavaScript.

## Cấu trúc và bản bàn giao

```text
src/       Components, pages, routes, services, stores, hooks, mocks, utils, styles
public/    Tài nguyên tĩnh đang sử dụng
scripts/   Kiểm tra ngôn ngữ và tạo bản mã nguồn bàn giao
docs/      Proposal, yêu cầu đồng bộ và Dashboard contract diff (hợp đồng chung ở root)
tests/     Unit tests, e2e/ (mock UI), api/ (HTTP giả lập)
licenses/  Giấy phép TailAdmin
```

```bash
npm run prepare:delivery
```

Lệnh lịch sử này tạo bản source riêng của Dashboard tại `delivery/cms-dashboard-*/`, không tự đóng gói hợp đồng chung và tài liệu liên frontend ở root monorepo. Để bàn giao đầy đủ tài liệu và giữ đúng liên kết, dùng repository Cinema-FE với cấu trúc root/Customer/Dashboard; không dùng riêng output delivery làm bản monorepo. Output delivery bị Git bỏ qua. Người nhận cài từng frontend bằng `npm ci`.

Backup lịch sử được giữ ngoài dự án; vị trí, audit và kết quả kiểm thử: [LANGUAGE_AUDIT.md](LANGUAGE_AUDIT.md). Yêu cầu nghiệp vụ: [ASSIGNMENT_CHECKLIST.md](ASSIGNMENT_CHECKLIST.md). Bản quyền TailAdmin: [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) và [MIT License](licenses/TailAdmin-MIT.md).

## Đồng bộ hợp đồng — 06/11/2026

Đã cập nhật adapters session/order/full-list, CSRF, opt-in refresh, khóa sản phẩm POS và mock pricing, guard phạm vi báo cáo; giữ React/Vite/JavaScript/JSX và Mock Mode. Customer chỉ được đọc để đối chiếu. Không sửa theme, routing hoặc các module đã gỡ. Kết quả kiểm thử mới nhất và danh sách file thay đổi ở [DASHBOARD_CONTRACT_DIFF.md](docs/DASHBOARD_CONTRACT_DIFF.md).

Kiểm tra ngày 06/11/2026: `npm ci`, `check:language`, lint và build đạt; **97 unit/transport, 32 UI Edge, 22 HTTP giả lập đạt**. npm ci báo 14 lỗ hổng dependency; không nâng dependency trong đợt đồng bộ hợp đồng. Chưa kiểm thử PHP/MySQL thật.

## Liên hệ và Nội dung website — phạm vi bổ sung

ADMIN có hai menu mới **Liên hệ** (`/contacts`) và **Nội dung website** (`/website-content`), vẫn kiểm tra permission; MANAGER/STAFF/CUSTOMER không được truy cập. Liên hệ hỗ trợ tìm kiếm/lọc/phân trang, chi tiết, sao chép email/điện thoại, ba trạng thái và xóa xác nhận. Đánh dấu REPLIED chỉ ghi nhận thủ công, không gửi email.

Nội dung website có sáu section global/home/about/services/pricing/contact, preview và lưu riêng từng section, upload ảnh hiện hữu, validation và cảnh báo chưa lưu. Không sửa giá vé/catalog hoặc phục hồi Settings/Media page. Đăng nhập `admin@cinema.test` / `Demo@12345` để thử bằng `npm run dev` (Mock Mode); dữ liệu chỉ trong bộ nhớ, reload reset.

[API proposal, schema và báo cáo triển khai](docs/CONTACT_WEBSITE_CONTENT_API_PROPOSAL.md) giải thích phần bổ sung O-12. Chưa có PHP thật; Customer đã có reader `/public/site-content` ở frontend/mock. Hai mock không chia sẻ dữ liệu runtime, tích hợp qua backend chung chưa được xác minh. Các con số kiểm thử ở mục đồng bộ trước là lịch sử; kết quả lượt bổ sung nằm trong proposal.

Kết quả lượt bổ sung hai module (06/11/2026): check:language/lint/build PASS; **106 unit/mock, 37 UI Edge, 24 HTTP giả lập PASS**. Playwright UI ghi output tại `test-results/e2e/`, HTTP tại `test-results/http/`, tránh dọn nhầm kết quả khi chạy các bộ test.

## Module và phân quyền hiện có

- Phim, suất chiếu, chi nhánh, phòng/ghế; đơn hàng/vé tại quầy, sản phẩm hai nhóm, voucher và danh mục.
- Khách hàng (xem/khóa/mở khóa/xóa theo quyền, không reset mật khẩu khách); nhân viên và lịch làm việc ngày/tuần/tháng.
- Đánh giá cơ sở, báo cáo vi phạm bình luận/đánh giá (DISMISS/DELETE), FAQ, tin tức, thống kê/báo cáo và hồ sơ cá nhân. Không có luồng duyệt trước bình luận.
- Liên hệ và nội dung website chỉ ADMIN có permission tương ứng; không phục hồi trang Cấu hình/Thư viện Ảnh/Tổng quan.

STAFF chỉ xem lịch bản thân và xử lý đơn theo quyền; MANAGER giới hạn theo chi nhánh phụ trách; ADMIN theo permission toàn hệ thống. CUSTOMER không được đăng nhập cổng nhân sự. Các kiểm tra này ở client/mock không thay quyền do PHP xác minh.

## Ghi chú monorepo và môi trường

Dashboard là ứng dụng độc lập trong [Cinema-FE](../README.md), chạy npm tại thư mục Dashboard. Hợp đồng chung duy nhất: [../docs/SHARED_API_CONTRACT.md](../docs/SHARED_API_CONTRACT.md); hợp đồng riêng: [API_CONTRACT.md](API_CONTRACT.md).

Giữ `.env.example`, `.env.development`, `.env.production` vì chỉ chứa cấu hình công khai. Mọi `VITE_*` đều hiển thị trong bundle; không đặt password/API key bí mật vào đó. `.env.*.local` không được commit. `VITE_API_BASE_URL=/api` cần reverse proxy; Vite không có proxy API mặc định. Production mặc định tắt mock; build demo tùy chọn bằng `npm run build -- --mode development`, chỉ dùng thử, không giao dịch thật.

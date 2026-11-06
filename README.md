# Cinema Management System

Repository chứa hai frontend độc lập của hệ thống quản lý rạp chiếu phim: **Customer** dành cho khách hàng và **Internal Dashboard** dành cho ADMIN, MANAGER, STAFF. Cả hai được thiết kế sử dụng chung PHP Backend và MySQL Database. **Backend không nằm trong repository này và chưa được xác minh tích hợp thực tế.**

## Kiến trúc và chức năng

**Customer Frontend** cung cấp danh sách/chi tiết phim, lịch chiếu, rạp/phòng; chọn ghế, giữ ghế, checkout và hiển thị trạng thái thanh toán; sản phẩm, giỏ hàng và voucher; tài khoản/hồ sơ/lịch sử vé; bình luận phim 1–5 sao, đánh giá cơ sở và gửi báo cáo vi phạm; FAQ, tin tức, liên hệ và nội dung website công khai. Thanh toán thật, email khôi phục và một số luồng hồ sơ còn phụ thuộc PHP; mock không thu tiền thật.

**Internal Dashboard** cung cấp quản lý phim, suất chiếu, chi nhánh, phòng/ghế; đơn hàng/vé tại quầy, sản phẩm và voucher; khách hàng, nhân sự và lịch làm việc ngày/tuần/tháng; đánh giá cơ sở và xử lý báo cáo bình luận/đánh giá; FAQ, tin tức/danh mục, báo cáo thống kê và hồ sơ nhân sự. ADMIN có thêm quản trị liên hệ và sáu nhóm nội dung website. Upload ảnh được dùng trong các form; không có trang Thư viện Ảnh, Cấu hình hoặc Tổng quan riêng.

Phân quyền Dashboard dựa trên role và permission: STAFF xem lịch bản thân và xử lý đơn theo quyền; MANAGER quản lý theo phạm vi chi nhánh; ADMIN quản lý toàn hệ thống theo permission. Chỉ ADMIN có quyền tương ứng được quản trị liên hệ/nội dung website. PHP phải thực thi quyền, phạm vi chi nhánh, transaction và tính tiền; guard frontend không thay thế bảo mật backend.

## Công nghệ

Các phiên bản khai báo dưới đây được đọc từ `package.json` của mỗi ứng dụng; phiên bản cài đặt cụ thể nằm trong hai `package-lock.json` riêng.

| Thành phần | Customer | Dashboard |
|---|---|---|
| React / React DOM | 19.2.4 | 19.2.4 |
| Vite | ^7.3.1 | ^7.1.12 |
| React Router DOM | ^7.9.4 | ^7.9.4 |
| Tailwind CSS | ^4.1.0 | ^4 |
| Axios | 1.20.0 | ^1.15.1 |
| Zustand | ^5.0.12 | ^5.0.12 |
| UI và tiện ích | Lucide React, tailwindcss-animate | Lucide React, Radix Dialog, Recharts, Sonner, date-fns, qrcode, clsx, tailwind-merge, tw-animate-css |
| Kiểm thử/công cụ | Node.js test runner, Playwright, ESLint, Prettier | Vitest, Playwright, ESLint, Espree |

Mã tự phát triển sử dụng **JavaScript ES Modules/JSX, HTML5 và CSS3**; không dùng TypeScript/Python để triển khai frontend. Node.js phục vụ development/build/test, không phải backend nghiệp vụ. Hai ứng dụng giữ nguyên dependency, cấu hình và lockfile riêng; root không có npm workspace hoặc gói ứng dụng ghép chung.

## Cấu trúc repository

```text
Cinema-FE/
├── README.md
├── .gitignore
├── docs/
│   └── SHARED_API_CONTRACT.md   # Bản hợp đồng chung duy nhất
├── Customer/
│   ├── README.md
│   ├── API_CONTRACT.md         # API riêng của Customer
│   ├── package.json
│   ├── package-lock.json
│   ├── src/
│   ├── public/
│   ├── docs/
│   ├── scripts/
│   └── tests/
└── Dashboard/
    ├── README.md
    ├── API_CONTRACT.md         # API riêng của Dashboard
    ├── package.json
    ├── package-lock.json
    ├── src/
    ├── public/
    ├── docs/
    ├── scripts/
    ├── tests/
    └── licenses/
```

`Customer/` và `Dashboard/` là thư mục source thông thường, không phải submodule. `docs/` tại root chứa hợp đồng API chung; mỗi ứng dụng giữ proposal, audit và tài liệu riêng trong thư mục của mình.

## Chạy nhanh

Dùng Node.js **22.12+ hoặc 24** và npm. Không cần PHP để chạy Mock Mode. Cài từ lockfile của từng ứng dụng:

```bash
git clone https://github.com/maianh183/Cinema-FE.git
cd Cinema-FE
cd Customer
npm ci
npm run dev
```

Customer mở tại **http://127.0.0.1:5173**. `dev` là API Mode mặc định; để demo khi chưa có backend, dừng lệnh đó và chạy `npm run dev:mock`.

Trong terminal khác, từ thư mục `Cinema-FE`:

```bash
cd Dashboard
npm ci
npm run dev
```

Dashboard mở tại **http://127.0.0.1:3001**, development mặc định dùng Mock Mode. Hai ứng dụng có thể chạy đồng thời trên hai cổng này; Vite có thể chọn cổng kế tiếp nếu cổng bị chiếm, vì vậy kiểm tra URL trong terminal.

## Mock Mode và API Mode

| Ứng dụng | Mock Mode | Kết nối API |
|---|---|---|
| Customer | `npm run dev:mock`, cấu hình công khai trong `.env.mock` | Sao chép `.env.example` thành `.env.local`, đặt `VITE_USE_MOCK=false`, cấu hình `VITE_API_BASE_URL`, chạy `npm run dev` |
| Dashboard | `npm run dev` đọc `.env.development` với `VITE_USE_MOCK=true` | Tạo `.env.development.local` với `VITE_USE_MOCK=false` và `VITE_API_BASE_URL`; production dùng `.env.production.local` |

`VITE_API_BASE_URL=/api` là mặc định tương đối. Vite hiện không cấu hình proxy PHP; cần reverse proxy hoặc URL backend đúng cùng CORS/cookie/CSRF. Biến `VITE_*` được đưa vào trình duyệt, **không được chứa secret**. `.env.local` và biến môi trường shell có thể ghi đè lựa chọn mode; kiểm tra banner demo trước thao tác.

Customer dùng `VITE_PASSWORD_RECOVERY` để bật giao diện khôi phục mật khẩu khi backend hỗ trợ. Dashboard dùng `VITE_AUTH_REFRESH`, mặc định false, chỉ bật khi PHP xác nhận endpoint refresh. Xem README từng ứng dụng cho hướng dẫn đầy đủ và tài khoản demo; các mật khẩu demo chỉ có tác dụng trong mock, không phải credentials backend/GitHub.

Mock Customer lưu một phần dữ liệu trong sessionStorage; mock Dashboard giữ trong bộ nhớ và reset khi reload. **Hai mock không tự đồng bộ.** Customer gửi liên hệ xuất hiện trên Dashboard, hoặc Dashboard biên tập nội dung xuất hiện tại Customer, chỉ có thể nghiệm thu qua PHP/MySQL chung. API lỗi không tự bật Mock Mode; nội dung biên tập có fallback an toàn được ghi nhãn rõ.

## Kiểm thử và build

Chạy trong **từng** thư mục `Customer/` và `Dashboard/`:

```bash
npm ci
npm run check:language
npm run lint
npm test
npm run build
```

Khi có browser phù hợp, chạy tiếp lần lượt `npm run test:e2e` và `npm run test:http`. Playwright hiện dùng Microsoft Edge; kiểm tra README/config của ứng dụng trước khi chạy. HTTP tests mô phỏng response để kiểm tra client, không xác nhận PHP thật.

Mỗi build sinh `dist/` riêng. Customer có thêm `npm run build:mock` cho bản demo. Dashboard production mặc định tắt mock. `npm run preview` dùng cổng mặc định 4173 ở cả hai ứng dụng; nếu xem đồng thời, có thể chạy Customer bằng `npm run preview -- --port 4174`. Khi triển khai, cấu hình SPA fallback và giữ `/api` cho PHP, không rewrite API sang `index.html`.

## Tài liệu

- [Hợp đồng API chung](docs/SHARED_API_CONTRACT.md).
- [Customer README](Customer/README.md) và [Customer API Contract](Customer/API_CONTRACT.md).
- [Dashboard README](Dashboard/README.md) và [Dashboard API Contract](Dashboard/API_CONTRACT.md).
- [Proposal Liên hệ/Nội dung — Customer](Customer/docs/CONTACT_WEBSITE_CONTENT_API_PROPOSAL.md).
- [Proposal Liên hệ/Nội dung — Dashboard](Dashboard/docs/CONTACT_WEBSITE_CONTENT_API_PROPOSAL.md).
- [Bản quyền và thành phần bên thứ ba Dashboard](Dashboard/THIRD_PARTY_NOTICES.md).

## Trạng thái phát triển

Các trang, services/adapters, phân quyền frontend, Mock Mode và tests đã được triển khai theo phạm vi tài liệu từng ứng dụng. Điều này không có nghĩa PHP/MySQL, email, upload storage, thanh toán/webhook hoặc chống xung đột ghế đã được nghiệm thu thật.

Hợp đồng chung giữ **O-01–O-11 OPEN**. **O-12 DECIDED về phạm vi** hai module Liên hệ/Nội dung website; DTO đầy đủ, validation, upload, MySQL và chi tiết backend vẫn **PENDING_BACKEND_CONFIRMATION**. Các báo cáo kiểm thử cũ là mốc lịch sử, không chứng minh khả năng tích hợp hiện tại.

Repository không chứa dependency đã cài, build, báo cáo trình duyệt, cache, archive bàn giao cũ hoặc môi trường bí mật. Giữ các `.env.example` và cấu hình Mock/development/production đã kiểm tra không chứa secret. Giấy phép/thông tin bản quyền của thành phần bên thứ ba nằm trong từng frontend.

## Xác minh khi chuẩn hóa monorepo — 06/11/2026

| Lệnh | Customer | Dashboard |
|---|---|---|
| `npm ci` | PASS sau khi thử lại lỗi khóa file Windows EBUSY | PASS |
| `npm run check:language` | PASS | PASS |
| `npm run lint` | PASS | PASS |
| `npm test` | 42/42 PASS | 106/106 PASS |
| `npm run build` | PASS | PASS |

Hai bản hợp đồng chung trước khi chuyển có cùng SHA-256; bản root chỉ sửa đường dẫn liên kết và quy tắc vị trí tài liệu, không đổi quyết định nghiệp vụ. Liên kết Markdown được kiểm tra trước commit. `.gitattributes` chuẩn hóa text LF trong Git; một số khoảng trắng/dòng trống cuối file cũ vẫn được giữ để không sửa source ngoài phạm vi.

`npm ci` báo Customer **1 high vulnerability**; Dashboard **14 vulnerabilities: 1 low, 2 moderate, 9 high, 2 critical**. Đây là vấn đề dependency cần xử lý riêng; lần chuẩn hóa này không nâng phiên bản hoặc chạy `npm audit fix --force`. Browser tests không chạy lại trong lần chỉ chuẩn hóa repository/tài liệu này; kết quả browser trước đó nằm trong báo cáo riêng của từng frontend. Chưa có kiểm thử tích hợp PHP/MySQL thật.

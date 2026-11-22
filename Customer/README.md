# CMS Cinema — Customer Frontend

Ứng dụng website dành cho khách hàng của hệ thống **CMS Cinema**, hỗ trợ tra cứu phim và rạp chiếu, đặt vé, mua sản phẩm đi kèm, quản lý tài khoản và tương tác với nội dung website. Ứng dụng sử dụng chung **PHP REST API + MySQL** với [Internal Dashboard](../Dashboard/README.md).

## Công nghệ

- **Frontend:** React 19, Vite 7, JavaScript/JSX, React Router 7, Tailwind CSS 4.
- **Quản lý dữ liệu và giao tiếp API:** Axios, Zustand.
- **Giao diện:** Light theme, responsive; biểu tượng Lucide.
- **Kiểm thử:** Node.js test runner, Playwright, ESLint.

## Chức năng

| Nhóm | Chức năng chính |
|---|---|
| Phim và rạp | Phim đang/sắp chiếu, tìm kiếm và lọc phim, chi tiết phim, trailer, chi nhánh và phòng chiếu |
| Suất chiếu và đặt vé | Tra cứu lịch chiếu, chọn và giữ ghế theo suất, chọn sản phẩm đi kèm, áp dụng voucher, tạo đơn |
| Thanh toán | Chuyển đến cổng thanh toán, xem trạng thái đơn và lịch sử giao dịch |
| Sản phẩm và ưu đãi | Food & Drink, Merchandise, giỏ hàng, voucher hợp lệ |
| Tài khoản | Đăng ký, đăng nhập, thông tin cá nhân, avatar, đổi mật khẩu và lịch sử đặt vé |
| Tương tác | Bình luận phim (1–5 sao), đánh giá chi nhánh/phòng và báo cáo nội dung |
| Thông tin | Trang chủ, Giới thiệu, Dịch vụ, Bảng giá, Liên hệ, FAQ, Tin tức |

Nội dung giới thiệu, dịch vụ, bảng giá và thông tin liên hệ được đọc từ API nội dung công khai; dữ liệu phim, suất chiếu, sản phẩm và giá vé vẫn lấy từ các API nghiệp vụ tương ứng.

## Cài đặt và chạy

**Yêu cầu:** Node.js 22.12+ (hoặc Node.js 24) và npm.

Tại thư mục `Customer/`:

```bash
npm ci
npm run dev
```

Mở **http://127.0.0.1:5173**.

### Cấu hình API

Sao chép `.env.example` thành `.env.local` và điều chỉnh địa chỉ PHP API theo môi trường triển khai:

```dotenv
VITE_API_BASE_URL=/api
VITE_USE_MOCK=false
VITE_PASSWORD_RECOVERY=false
```

- `VITE_API_BASE_URL`: đường dẫn gốc của API; sử dụng reverse proxy hoặc địa chỉ backend phù hợp.
- `VITE_USE_MOCK`: `false` để sử dụng API; `true` để dùng dữ liệu demo.
- `VITE_PASSWORD_RECOVERY`: bật giao diện khôi phục mật khẩu khi hệ thống sử dụng tính năng này.

Các biến `VITE_*` được đưa vào bundle frontend, **không chứa mật khẩu, API key hoặc thông tin bí mật**. Sau khi đổi cấu hình, khởi động lại dev server hoặc build lại ứng dụng.

### Chế độ demo

```bash
npm run dev:mock
```

Tài khoản mẫu:

```text
Email: customer@cinema.test
Mật khẩu: DemoCinema123!
```

Dữ liệu demo hoạt động độc lập với cơ sở dữ liệu thực, phục vụ trình diễn và kiểm thử giao diện.

## Build và triển khai

```bash
npm run build
npm run preview
```

Bản build được tạo trong `dist/`. Triển khai thư mục này lên web server, cấu hình fallback cho các route của React Router và chuyển tiếp `/api` đến PHP backend. Với Apache, dự án có cấu hình `public/.htaccess`; không rewrite request API về `index.html`.

## Kiểm thử

```bash
npm run check:language
npm run lint
npm test
npm run test:e2e
npm run test:http
npm run build
```

Các bài kiểm thử trình duyệt sử dụng Playwright; cần cài trình duyệt phù hợp với cấu hình dự án trước khi chạy.

## Cấu trúc dự án

```text
Customer/
├── src/                # Trang, component, services, adapters, state và styles
├── public/             # Ảnh và tài nguyên tĩnh
├── scripts/            # Công cụ hỗ trợ và kiểm tra mã nguồn
├── tests/              # Unit, E2E và HTTP tests
├── API_CONTRACT.md     # Hợp đồng API của Customer
├── package.json
└── README.md
```

## API và bảo mật

- Dùng phiên đăng nhập bằng cookie và CSRF token; các thao tác cần đăng nhập phải được xác thực và phân quyền tại backend.
- Backend xác định chủ sở hữu đơn hàng, bình luận và đánh giá từ phiên người dùng; không tin ID chủ sở hữu hoặc giá tiền gửi từ trình duyệt.
- Đặt vé theo `timeId`, giữ ghế theo suất chiếu; backend kiểm tra ghế trùng, tồn kho, voucher và tính tổng tiền.
- Trạng thái thanh toán được lấy từ API đơn hàng, không dựa vào URL chuyển hướng hoặc dữ liệu lưu trên trình duyệt.
- Nội dung người dùng được hiển thị dưới dạng văn bản an toàn; ảnh được upload qua API.

## Tài liệu

- [README hệ thống](../README.md)
- [Hợp đồng API Customer](API_CONTRACT.md)
- [Hợp đồng API dùng chung](../docs/SHARED_API_CONTRACT.md)
- [README Dashboard](../Dashboard/README.md)

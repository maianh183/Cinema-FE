# CineFlow — Internal Dashboard

Giao diện quản trị hệ thống rạp chiếu phim dành cho **ADMIN**, **MANAGER** và **STAFF**. Dashboard là một ứng dụng React độc lập, sử dụng chung API và cơ sở dữ liệu với Customer Frontend.

## Công nghệ

- **Frontend:** React 19, Vite 7, JavaScript (ES Modules/JSX), HTML5, CSS3, Tailwind CSS 4.
- **Thư viện:** React Router, Axios, Zustand, Radix UI, Recharts.
- **Backend:** REST API PHP và MySQL.
- **Môi trường:** Node.js **20.19+** hoặc **22.12+**, npm.

## Chức năng chính

| Nhóm | Chức năng |
|---|---|
| Quản lý rạp | Phim, danh mục phim, suất chiếu, chi nhánh, phòng và sơ đồ ghế |
| Kinh doanh | Bán vé tại quầy (POS), đơn hàng, xác nhận/hủy đơn, sản phẩm và voucher |
| Nhân sự | Nhân viên, phân quyền và lịch làm việc dạng lịch ngày/tuần/tháng |
| Khách hàng | Xem tài khoản, khóa/mở khóa và quản lý theo quyền |
| Nội dung | FAQ, tin tức, đánh giá rạp và xử lý báo cáo bình luận/đánh giá |
| Website | Quản lý liên hệ khách hàng và nội dung các trang công khai |
| Thống kê | Doanh thu, đơn hàng, suất chiếu và hiệu suất hoạt động |

**Phân quyền:** ADMIN quản trị toàn hệ thống; MANAGER quản lý nghiệp vụ và nhân sự trong chi nhánh được phân công; STAFF thao tác nghiệp vụ được cấp quyền và chỉ xem lịch làm việc cá nhân. Quyền truy cập và phạm vi dữ liệu được kiểm tra từ phiên đăng nhập và permission do API cấp.

## Cài đặt và chạy

Tại thư mục `Dashboard/`:

```bash
npm ci
npm run dev
```

Mở **http://127.0.0.1:3001**.

### Cấu hình API

Tạo `.env.development.local` để chạy với backend hoặc `.env.production.local` khi build:

```dotenv
VITE_USE_MOCK=false
VITE_API_BASE_URL=http://localhost/cinema-api
VITE_AUTH_REFRESH=false
```

Thay `VITE_API_BASE_URL` bằng địa chỉ API của môi trường triển khai. Khởi động lại dev server hoặc build lại sau khi thay đổi biến môi trường. `VITE_USE_MOCK=true` bật dữ liệu mẫu để phát triển và kiểm thử giao diện; `false` sử dụng API. Có thể tham khảo `.env.example`.

Hệ thống sử dụng session cookie và CSRF token khi gửi yêu cầu thay đổi dữ liệu. Các chức năng được giới hạn theo vai trò, permission và chi nhánh của tài khoản.

## Build và kiểm thử

```bash
npm run build
npm run preview
```

Bản build được tạo trong `dist/`; lệnh preview mặc định phục vụ tại **http://127.0.0.1:4173**.

```bash
npm run check:language
npm run lint
npm test
npm run test:e2e
npm run test:http
```

Các lệnh trên lần lượt kiểm tra mã JavaScript/JSX, lint, unit tests, giao diện E2E và HTTP tests. Kiểm thử giao diện dùng Microsoft Edge; cần bảo đảm các cổng phục vụ test không bị chiếm dụng.

## Cấu trúc dự án

```text
Dashboard/
├── src/                 Giao diện, routes, services, stores, hooks và styles
├── public/              Tài nguyên tĩnh
├── scripts/             Công cụ kiểm tra và đóng gói
├── tests/               Unit, E2E và HTTP tests
├── licenses/            Giấy phép thư viện/giao diện
├── API_CONTRACT.md      Đặc tả API riêng của Dashboard
├── package.json
└── README.md
```

## Tài liệu

- [Hợp đồng API chung Customer–Dashboard](../docs/SHARED_API_CONTRACT.md)
- [API Contract của Dashboard](API_CONTRACT.md)
- [README tổng quan repository](../README.md)
- [Thông báo bản quyền bên thứ ba](THIRD_PARTY_NOTICES.md)

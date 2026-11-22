# Cinema Management System — Frontend

Repository chứa hai ứng dụng frontend của hệ thống quản lý rạp chiếu phim: **Customer** dành cho khách hàng và **Dashboard** dành cho nhân sự nội bộ. Hai ứng dụng sử dụng chung **PHP REST API** và cơ sở dữ liệu **MySQL**.

## Công nghệ

- **Frontend:** React 19, Vite 7, JavaScript/JSX, HTML5, CSS3, Tailwind CSS 4.
- **Điều hướng và dữ liệu:** React Router, Axios, Zustand.
- **Giao diện:** Responsive; Dashboard sử dụng thêm Radix UI và Recharts.
- **Kiểm thử:** ESLint, unit tests và Playwright.

Hai frontend có cấu hình và `package-lock.json` riêng, có thể phát triển và triển khai độc lập.

## Chức năng chính

| Ứng dụng | Chức năng |
|---|---|
| **Customer** | Xem phim, rạp và suất chiếu; chọn/giữ ghế, đặt vé, thanh toán; sản phẩm, giỏ hàng, voucher; tài khoản và lịch sử đặt vé; bình luận phim, đánh giá rạp, tin tức, FAQ, liên hệ và nội dung website. |
| **Dashboard** | Quản lý phim, suất chiếu, chi nhánh, phòng/ghế; bán vé tại quầy, đơn hàng, sản phẩm, voucher; nhân sự, lịch làm việc; khách hàng; bình luận, đánh giá và báo cáo vi phạm; tin tức, FAQ, liên hệ, nội dung website và thống kê. |

**Phân quyền Dashboard:** `ADMIN` quản lý toàn hệ thống; `MANAGER` quản lý theo chi nhánh được phân công; `STAFF` thao tác theo quyền được cấp và xem lịch làm việc cá nhân. Backend kiểm tra quyền và phạm vi dữ liệu trên từng yêu cầu.

## Cấu trúc repository

```text
Cinema-FE/
├── README.md
├── docs/
│   └── SHARED_API_CONTRACT.md
├── Customer/
│   ├── README.md
│   ├── API_CONTRACT.md
│   ├── src/
│   ├── public/
│   ├── tests/
│   └── package.json
└── Dashboard/
    ├── README.md
    ├── API_CONTRACT.md
    ├── src/
    ├── public/
    ├── tests/
    └── package.json
```

## Cài đặt và chạy

**Yêu cầu:** Node.js 22.12+ (hoặc Node.js 24) và npm.

Clone repository:

```bash
git clone https://github.com/maianh183/Cinema-FE.git
cd Cinema-FE
```

**Customer** — chạy trong terminal thứ nhất:

```bash
cd Customer
npm ci
npm run dev
```

Truy cập **http://127.0.0.1:5173**.

**Dashboard** — mở terminal thứ hai tại thư mục gốc repository:

```bash
cd Dashboard
npm ci
npm run dev
```

Truy cập **http://127.0.0.1:3001**.

### Cấu hình API

Mỗi ứng dụng đọc địa chỉ backend từ `VITE_API_BASE_URL` và bật/tắt dữ liệu mẫu bằng `VITE_USE_MOCK`.

- **Customer:** Tạo `Customer/.env.local` từ `.env.example`, đặt `VITE_USE_MOCK=false` và `VITE_API_BASE_URL` theo môi trường.
- **Dashboard:** Tạo `Dashboard/.env.development.local` (hoặc `.env.production.local` khi build), đặt `VITE_USE_MOCK=false` và `VITE_API_BASE_URL` theo môi trường.
- **Demo:** Customer chạy `npm run dev:mock`; Dashboard có thể bật `VITE_USE_MOCK=true` trong cấu hình development.

Ví dụ cấu hình:

```dotenv
VITE_API_BASE_URL=/api
VITE_USE_MOCK=false
```

Nếu sử dụng đường dẫn `/api`, web server cần chuyển tiếp request đến PHP. Các biến `VITE_*` được đưa vào frontend nên không lưu mật khẩu hay secret trong đó. Khởi động lại server hoặc build lại sau khi thay đổi cấu hình.

## Kiểm thử và build

Chạy các lệnh sau **trong từng thư mục `Customer/` và `Dashboard/`**:

```bash
npm run check:language
npm run lint
npm test
npm run build
```

Kiểm thử trình duyệt/API client khi cần:

```bash
npm run test:e2e
npm run test:http
```

Bản build của từng ứng dụng nằm trong `dist/` tương ứng. Có thể xem thử bằng `npm run preview`. Khi triển khai React Router, cần cấu hình SPA fallback và bảo đảm `/api` không bị chuyển hướng về `index.html`.

## Tài liệu

- [Hướng dẫn Customer](Customer/README.md) · [Customer API Contract](Customer/API_CONTRACT.md)
- [Hướng dẫn Dashboard](Dashboard/README.md) · [Dashboard API Contract](Dashboard/API_CONTRACT.md)
- [Hợp đồng API chung](docs/SHARED_API_CONTRACT.md)

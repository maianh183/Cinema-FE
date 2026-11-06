# Liên hệ và Nội dung website — Customer API proposal

Ngày 06/11/2026. Đối chiếu schema và endpoints với proposal cùng tên trong Dashboard. Chỉ triển khai Customer; không sửa Dashboard, không tạo PHP. Bổ sung cho [Shared API Contract](../../docs/SHARED_API_CONTRACT.md) draft-1.0, mục **O-12**, và [Customer API contract](../API_CONTRACT.md).

Chủ dự án đã cho phép Dashboard quản trị hai module và Customer đọc nội dung công khai. Bản Shared trong Customer được giữ nguyên như tài liệu nền; ghi chú lịch sử về module đã gỡ không phủ nhận yêu cầu mới này. **Không chuyển O-12 sang DONE:** storage, bảo mật, cache, upload và tích hợp PHP vẫn chưa được xác minh. O-01–O-11 không thay đổi.

## Endpoints và ranh giới quyền

URL tương đối với `VITE_API_BASE_URL`, mặc định `/api`. Response `{success:true,data:...}` được API client unwrap đúng một lần. HTTP 200 với `success:false` vẫn thất bại. Cookie credentials; mutation lấy CSRF qua luồng hiện có, kể cả guest gửi liên hệ.

| Method / URL | Request / response data | Customer |
|---|---|---|
| POST `/contacts` | `{fullName,email,phone,subject,content}` → `{id,received:true}` sau commit | Guest/Customer gửi; giữ service và route hiện có |
| GET `/public/site-content` | Object sáu section bên dưới | Guest/Customer đọc |
| GET `/contacts?page=&pageSize=&q=&status=` | Contact[] + envelope meta total/page/pageSize | Chỉ Dashboard ADMIN + contacts:read; Customer không gọi |
| GET `/contacts/:id` | Contact record | Chỉ ADMIN + contacts:read |
| PATCH `/contacts/:id/status` | `{status:UNREAD\|READ\|REPLIED}` → record đã lưu | Chỉ ADMIN + contacts:update |
| DELETE `/contacts/:id` | Xóa theo chính sách PHP | Chỉ ADMIN + contacts:delete |
| GET `/site-content` | Sáu section, optional audit ở root | Chỉ ADMIN + website-content:read |
| PUT `/site-content/:section` | Một section đầy đủ → section đã lưu | Chỉ ADMIN + website-content:update |

Các endpoint internal trên chỉ để đối chiếu hợp đồng, không triển khai trong Customer service/mock. `/website-content` là route Dashboard, không phải API. Không fallback sang URL quản trị khi public API lỗi. STAFF/MANAGER/CUSTOMER không tự có quyền internal; PHP phải kiểm tra quyền từ session thực tế.

## Schema công khai chính xác

Tất cả giá trị là string, trường optional rỗng dùng `""`, không null. Public response không chứa contact submissions hay metadata audit.

```json
{
  "global": {
    "companyName": "CMS Cinema", "tagline": "Một điểm hẹn cho những người yêu điện ảnh.",
    "logoUrl": "", "contactEmail": "info@cinema.test", "hotline": "0901000000",
    "address": "Địa chỉ mẫu", "facebookUrl": ""
  },
  "home": {"headline":"Điểm hẹn điện ảnh","subheadline":"Khám phá phim và lịch chiếu.","heroImageUrl":""},
  "about": {"title":"Giới thiệu","introduction":"","vision":"","mission":"","values":""},
  "services": {"title":"Dịch vụ","introduction":""},
  "pricing": {"title":"Bảng giá","introduction":"","disclaimer":""},
  "contact": {"title":"Liên hệ","introduction":"","workingHours":"","mapUrl":""}
}
```

Ví dụ chỉ có giá trị demo, không phải thông tin doanh nghiệp thật. Tên field và cấu trúc trùng Dashboard; giá trị seed Customer giữ thương hiệu/nội dung Customer hiện có.

| Field | Giới hạn ký tự giống Dashboard |
|---|---|
| companyName / tagline | 160 / 250 |
| contactEmail / hotline / address | 254 / 30 (6–30 số, dấu +().-, khoảng trắng) / 500 |
| headline và title | 200 |
| subheadline | 1000 |
| introduction, vision, mission, values | 4000 |
| disclaimer / workingHours | 2000 / 500 |
| logoUrl, heroImageUrl, facebookUrl, mapUrl | 2048 |

Adapter bỏ trường ngoài allowlist, kiểm tra type/length/plain text, ký tự điều khiển và URL trước render. Missing/invalid field dùng giá trị an toàn tương ứng; section được ghi vào `fallbackSections`. Chuỗi rỗng của nội dung optional được tôn trọng; tên doanh nghiệp/heading rỗng dùng heading mặc định để giữ khả năng truy cập. Không thay thế giá/phim/phòng từ nội dung biên tập. Không dùng raw HTML/iframe.

Social/map chỉ HTTPS không credentials; ảnh là đường dẫn cùng host bắt đầu `/` (không `//`, backslash) hoặc HTTPS. Thiếu/lỗi tải ảnh dùng `public/placeholder-site.svg`. Không nhận Data URL, kể cả ảnh FileReader của Dashboard mock: hai mock không dùng chung runtime. PHP phải xác minh ownership, MIME và allowlist storage/CDN tại upload; HTTPS phía Customer chưa phải chứng minh ảnh thuộc upload nội bộ.

## Liên hệ: DTO và xác nhận

Request giữ đúng năm trường; client trim, bỏ field internal dù caller truyền vào. Customer giữ validation hiện có: fullName 1–100, email hợp lệ tối đa 200, phone bắt buộc 8–15 chữ số với dấu `+` tùy chọn đầu chuỗi, subject 1–150, content 1–5000. Không nhận chỉ khoảng trắng, giá trị không phải string, điện thoại chứa khoảng trắng/ký tự chữ. HTML constraints và service validation cùng bảo vệ luồng gửi.

**Khác biệt validation còn cần PHP thống nhất:** proposal Dashboard cho fullName tối đa 160, email 254, subject 250 và phone có thể rỗng hoặc 6–30 ký tự có định dạng. Customer giữ giới hạn chặt hơn theo yêu cầu, không tự nới form. DTO không khác tên; PHP cần công bố bộ validation chung trước nghiệm thu.

Receipt chỉ được chấp nhận khi `received === true` và `id` là số nguyên dương an toàn. Thiếu receipt, ID string/0/âm, false envelope, HTTP lỗi hoặc lỗi mạng không được reset form/hiện thành công. Nút gửi bị khóa khi chờ, mutation lock chặn submit lặp. 400/422 hiển thị lỗi validation, 429 yêu cầu chờ, network/timeout thông báo chưa nhận xác nhận; không tuyên bố chắc chắn server chưa lưu khi mất kết nối. Không gửi email hay tự đánh dấu REPLIED.

Contact record dành cho Dashboard: `{id,fullName,email,phone,subject,content,status,createdAt,readAt?,repliedAt?,repliedBy?}`. Mock Customer tạo UNREAD, timestamp ISO UTC và ID lớn hơn ID hiện có; public response vẫn chỉ `{id,received:true}`. Record nằm trong sessionStorage demo theo cơ chế cũ, không được đưa vào public site-content. Chính sách lưu/ẩn danh/retention/audit/soft-delete do PHP quyết định.

## Nguồn hiển thị, fallback và refresh

| Vị trí | Nguồn |
|---|---|
| Header/Footer, thương hiệu và SEO suffix | global.companyName, logoUrl; Footer còn tagline, hotline, contactEmail, address, facebookUrl |
| Trang chủ | home trong khối giới thiệu gọn sau hero phim; giữ HeroSection/NowShowing/Promo/News |
| About | about title/introduction/vision/mission/values; giữ CTA rạp |
| Services | services title/introduction; loại phòng từ catalogService |
| Pricing | pricing title/introduction/disclaimer; số tiền từ Room.basePrice, checkout tính như cũ |
| Contact | contact title/introduction/workingHours/mapUrl; thông tin doanh nghiệp từ global |

Provider dùng `useResource`, chia sẻ một state nội dung trong RAM cho toàn app; chuyển route không fetch riêng từng component. React StrictMode development có thể chạy lại effect lúc mount. Không lưu cache nội dung vào localStorage/sessionStorage. Mount/reload trang, focus tab và nút **Tải lại nội dung** tải lại API. Trong lúc tải dùng mặc định kèm trạng thái; API lỗi hoặc field không hợp lệ dùng fallback và thông báo ở Footer, không gọi đó là đã đồng bộ. Fallback không bịa email/hotline/địa chỉ doanh nghiệp.

Metadata title/description dùng nội dung đã validate; vẫn là SEO client của SPA, không tuyên bố SSR/prerender hoặc crawler không JavaScript đã hỗ trợ. Không cache bất biến hoặc cập nhật realtime qua hai frontend. Cache-Control/ETag và invalidation sau Dashboard PUT phải được PHP chốt.

## PHP còn OPEN

1. Triển khai GET `/public/site-content` và POST `/contacts`, schema/migration/seed, allowlist server và receipt sau commit; giới hạn validation thống nhất.
2. Cookie/CSRF/Origin cho guest POST, rate limit/anti-spam, lỗi 400/422/429; cân nhắc chống trùng khi retry sau timeout, không thêm idempotency field tùy ý vào DTO.
3. Bảo vệ internal endpoints bằng ADMIN + permission, không lộ PII/audit qua public API; retention, audit và email workflow.
4. Cache/invalidation, version/ETag/conflict cho nhiều ADMIN; hiện frontend không tự thêm header hay schema version chưa thống nhất.
5. Upload ownership/MIME/CDN/host/path, ảnh public hợp lệ và xử lý file mồ côi.
6. Tích hợp thật: Dashboard lưu → PHP/MySQL → Customer refresh; contact guest → Dashboard danh sách/chi tiết. **Hai mock độc lập, chưa kiểm thử tích hợp PHP.**

Kết quả thực thi và danh sách file tại [CUSTOMER_EDITORIAL_REPORT.md](CUSTOMER_EDITORIAL_REPORT.md). Các kiểm thử HTTP interception chỉ xác minh hành vi client với response được mô phỏng.

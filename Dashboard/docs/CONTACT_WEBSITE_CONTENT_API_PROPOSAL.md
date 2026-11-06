# Liên hệ và Nội dung website — API proposal

Ngày: **06/11/2026**. Phạm vi mới được chủ dự án yêu cầu trong `CODEX_ADD_CONTACT_AND_CONTENT_DASHBOARD.md`: chỉ bổ sung hai module ADMIN `/contacts` và `/website-content`. Không phục hồi Settings, Media page, page builder hoặc quyền sửa customer profile. React/Vite/JavaScript/JSX và light theme giữ nguyên.

Tài liệu này bổ sung [Shared API Contract](../../docs/SHARED_API_CONTRACT.md), mục 8/10/**O-12**, và [API internal](../API_CONTRACT.md). **Chưa có PHP/MySQL backend được xác minh.** Mock và HTTP interception không chứng minh tích hợp thật. O-01–O-11 không thay đổi; O-12 đã quyết định phạm vi hai module, các quyết định kỹ thuật PHP dưới đây vẫn OPEN.

## Endpoint, quyền và envelope

Tất cả URL tương đối với `VITE_API_BASE_URL`. Axios dùng cookie credentials và CSRF cho mutation, unwrap envelope một lần trong `api.js`. Thất bại trả HTTP 400/401/403/404/409/422/429/500 và `{success:false,message,errors?}`. Server kiểm tra quyền từ phiên, không từ body/query.

| Method | URL | Quyền / request / response data |
|---|---|---|
| POST | `/contacts` | Guest/Customer; `{fullName,email,phone,subject,content}` → `{id,received:true}` **sau commit**. Không yêu cầu login hoặc role internal. |
| GET | `/contacts?page=&pageSize=&q=&status=` | ADMIN + `contacts:read`; records và `meta:{total,page,pageSize}`. |
| GET | `/contacts/:id` | ADMIN + `contacts:read`; Contact record. Không tự đổi trạng thái. |
| PATCH | `/contacts/:id/status` | ADMIN + `contacts:update`; **chỉ** `{status:"UNREAD"\|"READ"\|"REPLIED"}` → Contact đã lưu đúng ID/status. |
| DELETE | `/contacts/:id` | ADMIN + `contacts:delete`; xóa sau xác nhận. Mock trả `{success:true,data:null}`; chỉ refresh list/count sau HTTP thành công. |
| GET | `/public/site-content` | Guest/Customer; object đúng sáu section, không metadata audit, không dữ liệu người gửi liên hệ. |
| GET | `/site-content` | ADMIN + `website-content:read`; sáu section và metadata optional nếu backend hỗ trợ. Mock thêm `updatedAt/updatedBy` ở cấp root sau PUT, không trong section public. |
| PUT | `/site-content/:section` | ADMIN + `website-content:update`; body là section đầy đủ, response data là section đã lưu. Chỉ sáu section dưới đây, không generic CRUD và không ghi đè section khác. |
| POST | `/files/upload?folderName=media` | Giữ upload hiện hữu: `media:create`, multipart field `file`, JPG/PNG/WebP ≤5 MB, response chứa URL. GET `/media` picker cần `media:read`. Không mở lại route Media page. |

`/website-content` là route UI, **không phải API** `/website-content`; API dùng `/site-content`. Không tạo alias `/public/content` để âm thầm đổi schema. ADMIN vẫn cần permission; ADMIN không có permissions không được truy cập. STAFF/MANAGER/CUSTOMER không được dùng internal endpoints kể cả được gửi wildcard hoặc branchId tùy ý. Mở rộng scope MANAGER cần quyết định mới, không tự suy ra branch cho liên hệ toàn hệ thống.

Ví dụ response danh sách:

```json
{
  "success": true,
  "data": [{
    "id": 25, "fullName": "Khách Demo", "email": "guest@example.test",
    "phone": "0900000000", "subject": "Đặt suất cho đoàn", "content": "Xin thông tin.",
    "status": "UNREAD", "createdAt": "2026-11-06T08:00:00+07:00"
  }],
  "meta": {"total": 1, "page": 1, "pageSize": 10}
}
```

Contact record chính xác: `{id,fullName,email,phone,subject,content,status,createdAt,readAt?,repliedAt?,repliedBy?}`. ID số nguyên dương theo receipt Customer hiện có; timestamp ISO có offset, repliedBy là ID nhân sự. Field phone luôn là chuỗi, có thể rỗng.

- Sắp xếp `createdAt DESC, id DESC`; lọc/search trước khi tính total, sau đó mới phân trang. page từ 1, pageSize 1–100. q tìm trong fullName/email/phone/subject, không tìm tràn mọi field/audit; q tối đa 250 ký tự.
- UI lấy tổng toàn hệ thống bằng GET page=1&pageSize=1; số chưa đọc dùng thêm status=UNREAD. Hai số này độc lập bộ lọc hiện tại, không đếm từ một trang. Không thêm endpoint statistics ngoài prompt.
- Gửi mới luôn UNREAD. GET detail không đánh dấu READ. PATCH có thể chuyển qua lại ba trạng thái; đây là ghi nhận thủ công, **không gửi email** và không có field emailSent.
- Mock ghi readAt khi READ, repliedAt/repliedBy khi REPLIED; khi trở về UNREAD vẫn giữ mốc lịch sử trước đó. Chính sách audit/timestamp/idempotency chính thức cần PHP chốt.
- Sau PATCH thành công UI kiểm tra ID/status trước cập nhật; lỗi giữ nguyên chi tiết. DELETE lỗi giữ dialog, không tự xóa hàng hoặc giảm count. Xóa hàng cuối trang tự tải trang còn hợp lệ.
- Mock hard-delete khỏi bộ nhớ. **OPEN** chính sách PHP soft-delete/retention/ẩn danh/khôi phục và quyền truy cập dữ liệu cá nhân; không tuyên bố có archive/audit bền vững.

## Schema nội dung thống nhất

Mỗi section là object đầy đủ các field dưới đây, **tất cả giá trị là string**, không field ngoài schema. Field rỗng dùng `""`, không null. Đây cũng là hình dạng `data` của GET public:

```json
{
  "global": {
    "companyName": "CineFlow", "tagline": "Không gian điện ảnh của bạn",
    "logoUrl": "", "contactEmail": "info@example.test", "hotline": "02812345678",
    "address": "Địa chỉ doanh nghiệp", "facebookUrl": ""
  },
  "home": {"headline": "Chào mừng", "subheadline": "Trải nghiệm điện ảnh", "heroImageUrl": ""},
  "about": {"title": "Giới thiệu", "introduction": "", "vision": "", "mission": "", "values": ""},
  "services": {"title": "Dịch vụ", "introduction": ""},
  "pricing": {"title": "Bảng giá", "introduction": "", "disclaimer": ""},
  "contact": {"title": "Liên hệ", "introduction": "", "workingHours": "", "mapUrl": ""}
}
```

Ví dụ `PUT /site-content/pricing`:

```json
{"title":"Bảng giá","introduction":"Giá theo suất chiếu và loại ghế.","disclaimer":"Giá cuối cùng tại bước đặt vé."}
```

Response `{success:true,data:{title,introduction,disclaimer}}` sau commit. Không gửi cả document hay metadata trong body; giữ nguyên global/home/about/services/contact. Không có trường giá phòng/vé trong schema. Home chỉ là editorial intro/hero, không thay thế phim nổi bật/đang chiếu động. Contact sử dụng email/hotline/address của global, không tạo bản sao field này trong contact.

### Validation đang áp dụng trong Dashboard/mock

| Trường | Giới hạn |
|---|---|
| companyName | Bắt buộc, tối đa 160 |
| tagline | 250 |
| contactEmail | Bắt buộc, email hợp lệ, 254 |
| hotline | Bắt buộc, 6–30 ký tự số/khoảng trắng/+().- |
| address | Bắt buộc, 500 |
| headline và title các section | Bắt buộc, 200 |
| subheadline | 1000 |
| introduction, vision, mission, values | 4000 |
| disclaimer | 2000 |
| workingHours | 500 |
| facebookUrl, mapUrl, logoUrl, heroImageUrl | 2048 cho URL thật; có thể rỗng |

Các giới hạn này là validation frontend/mock được đề xuất cho PHP xác nhận. GET cho phép chuỗi rỗng để biên tập nội dung ban đầu; PUT vẫn kiểm tra các trường bắt buộc. Reject kiểu sai, thiếu field, field lạ, HTML (`<`/`>`), ký tự điều khiển; nội dung được render text bằng React, không `dangerouslySetInnerHTML`, không iframe embed.

Social/map chỉ `https:`, không credentials trong URL, không javascript/data/http. Logo/hero không có ô nhập URL; chỉ lấy từ FileUpload/picker có sẵn, giữ ảnh cũ khi upload lỗi. URL production là đường dẫn tuyệt đối cùng host hoặc HTTPS do upload service trả về; PHP phải xác minh ownership, MIME và host/path storage/CDN allowlist, không tin URL client. Mock chỉ nhận ảnh mới có trong media repository và cho phép data:image/png|jpeg|webp do FileReader của upload mock tạo; không cho data SVG/script, không bật ngoại lệ data ảnh ở API thật.

Biên tập từng section có preview, lưu/error state, cảnh báo đổi tab/route/logout và beforeunload. **Không có version/ETag chính thức trong prompt:** chưa thêm header/field tùy ý. O-12 còn OPEN về optimistic concurrency (ETag/If-Match hoặc version, 409/412, merge/conflict UI). Hiện tại vẫn có nguy cơ hai ADMIN ghi đè cùng section; PHP cần chốt trước production. Không có autosave, không báo thành công khi PUT thất bại.

## Diff và tương thích Customer

| Điểm | Trước yêu cầu | Sau triển khai / phần còn thiếu |
|---|---|---|
| Contact mock Dashboard | Seed name/message, không có UI được phép truy cập | Seed canonical fullName/phone/content; POST guest receipt chính xác; internal quản trị ADMIN. |
| Contact Customer | `contactService.send` POST /contacts pick fullName/email/phone/subject/content, kiểm tra numeric id + received | Khớp nguyên trạng, không sửa Customer. |
| Website mock Dashboard | Mảng `website-content` HOME/COMPANY lịch sử | Thay bằng object sáu section `site-content`, service validate đúng schema; không dựng generic page builder. |
| Customer editorial | `src/pages/ContentPages.jsx` và components đang dùng nội dung tĩnh; chưa gọi /public/site-content | **Chưa tích hợp đọc schema mới.** Cần lượt Customer riêng được ủy quyền sau khi PHP chốt; không thay endpoints public khác. Không tuyên bố Dashboard save xuất hiện ngay ở Customer. |
| Shared draft-1.0 | Ghi hai module đã bỏ | Chỉ thêm ghi chú phạm vi mới tại mục 8/10/O-12; không đổi O-01–O-11 hay giả định PHP tồn tại. Bản Shared trong Customer không tự ghi đè. |
| Mock repositories | Hai ứng dụng chạy bộ nhớ riêng | Vẫn riêng, không đồng bộ runtime; public projection Dashboard chỉ kiểm tra hợp đồng. Cần PHP chung để đồng bộ thật. |

## Việc PHP còn OPEN

1. Schema lưu trữ contacts/site-content, migration seed/legacy có kiểm chứng, transaction và receipt sau commit.
2. RBAC ADMIN theo permission, cookie/CSRF/Origin, không rò contact PII qua public projection, rate limit/anti-spam cho guest POST. Tránh overposting; không tin branch/role do client gửi.
3. Retention/soft-delete, audit đọc/đổi trạng thái, semantics readAt/repliedAt, idempotency và chính sách email. Module này không triển khai gửi email.
4. Version/ETag và xử lý conflict nhiều ADMIN, cache invalidation public sau commit, metadata chính thức.
5. Upload ownership/storage/CDN allowlist, MIME thực/re-encode, file tham chiếu, dọn orphan upload nếu bỏ draft.
6. Customer adapter/page đọc đúng sáu section trong lượt riêng; kiểm thử tích hợp hai frontend với PHP thật. About/contact biên tập đã được chủ dự án cho phép; các mục kỹ thuật này vẫn OPEN.

## File triển khai và kiểm thử

Thêm: `src/pages/contacts/index.jsx`, `src/pages/website-content/index.jsx`, `src/services/contactService.js`, `src/services/siteContentService.js`, `src/utils/contacts.js`, `src/utils/siteContent.js`, `src/mocks/siteContent.js`, `tests/editorial.test.js`, `tests/e2e/editorial.spec.js`, `tests/api/editorial.spec.js`, tài liệu proposal này.

Sửa: `src/utils/permissions.js`, `src/routes/App.jsx`, `src/components/layout/Navigation.jsx`, `src/hooks/useUnsavedChanges.jsx` (description tùy chỉnh, giữ mặc định ghế), `src/mocks/data.js`, `src/mocks/adapter.js`, `tests/e2e/business.spec.js`, `playwright.config.js` (output riêng tránh UI cleanup xóa trace HTTP), `API_CONTRACT.md`, `README.md`, `ASSIGNMENT_CHECKLIST.md`, `../../docs/SHARED_API_CONTRACT.md`, `docs/DASHBOARD_CONTRACT_DIFF.md`.

Test cũ về MANAGER truy cập `/contacts`/`/website-content` được đổi từ 404 sang **403** do route nay tồn tại, vẫn kiểm tra không có menu/quyền; `/media`/`/comments` tiếp tục 404. Không bỏ test hoặc nới scope. Test mới bảo vệ guest receipt, GET/detail/search/paging, ba trạng thái, delete/count, RBAC, plain text/URL/schema, section isolation/public projection, draft navigation, upload error, HTTP failure và responsive.

## Kết quả kiểm thử 06/11/2026

| Lệnh | Kết quả thực tế |
|---|---|
| npm run check:language | PASS: 73 JS, 50 JSX, 2 MJS; không TS/Python trong mã tự phát triển đang dùng. |
| npm run lint | PASS sau thay đổi cuối. |
| npm test | PASS: 106/106 tests, 9 files (97 cũ + 9 mới). |
| npm run build | PASS: Vite production build sau thay đổi cuối. |
| npm run test:http | PASS: 24/24 Edge tests (22 cũ + 2 mới), HTTP responses giả lập, không PHP. |
| npm run test:e2e | PASS lượt đầy đủ cuối: 37/37 Edge tests (32 cũ + 5 mới), gồm responsive 375/768/1024/1440px. |

Đã sửa hai vấn đề kiểm thử UI mới: đóng modal trước khi truy vấn vùng thống kê bị aria-hidden; thêm tên truy cập rõ ràng cho select lọc trạng thái. Lượt HTTP đầu gặp ENOENT trace vì chạy UI dọn output dùng chung, đã tách output UI thành test-results/e2e và chạy lại HTTP 24/24 PASS. HTTP giữ test-results/http; screenshot chỉ định thủ công vẫn test-results/screenshots. Không thay assertion nghiệp vụ để bỏ qua lỗi.

UI mới kiểm tra 375/768/1024/1440px. Source không đổi dependency, không sửa Customer; đã đối chiếu O-01–O-11 nguyên vẹn và kiểm tra 27 local documentation links. Chưa kiểm thử PHP/MySQL thật, gửi email hoặc đồng bộ runtime hai frontend.

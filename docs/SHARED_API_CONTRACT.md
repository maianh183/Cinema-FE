# SHARED API CONTRACT — CMS Cinema / CineFlow

**Phiên bản tài liệu:** `draft-1.0`  
**Ngày lập:** 2026-11-04  
**Nguồn ưu tiên:** `cms-dashboard-el13GW/API_CONTRACT.md` (Dashboard, 282 dòng); đối chiếu với `CMS-Cinema-JavaScript-only-portable.zip/API_CONTRACT.md` (Customer, 122 dòng).  
**Phạm vi:** Customer Frontend (React/Vite), Internal Dashboard (React/Vite), và **PHP thuần 7.0+ / MySQL** backend tương lai.

> **CẢNH BÁO TÍCH HỢP:** Cả hai nguồn đều nói rõ **chưa có PHP backend/MySQL được kiểm chứng**. Tất cả URL/DTO bên dưới là **hợp đồng thiết kế**, không phải cam kết endpoint đang hoạt động. Test mock, API giả lập và HTTP interception không thay thế integration test với PHP. Không tự thay đổi source code/DB chỉ vì tài liệu này mô tả một schema đề xuất.

## 0. Quy tắc đọc, mức độ chắc chắn và thứ tự ưu tiên

| Ký hiệu | Ý nghĩa |
|---|---|
| **D-L** | URL/field được Dashboard ghi là kế thừa từ service trước refactor; vẫn **chưa kiểm chứng PHP** |
| **D-N** | API/quy tắc mới được Dashboard đề xuất hoặc đã mock, cần PHP triển khai/xác nhận |
| **C-N** | Public/customer API mới từ Customer contract; cần PHP triển khai/xác nhận |
| **S-N** | Quyết định thống nhất **đề xuất trong tài liệu chung này** để giải quyết xung đột; cần cả hai FE và PHP chấp thuận |
| **LEGACY** | Cần duy trì tương thích hoặc migration có chủ đích; không phải API UI mới được ưu tiên |
| **OPEN** | Chưa có đủ bằng chứng để quyết định; không tự coi là đã hoàn thành |

1. Lấy **tên trường nghiệp vụ và quy tắc quyền trong Dashboard** làm gốc, trừ điểm mà Customer có yêu cầu công khai/đặt vé riêng.
2. **Không bắt Customer gọi API quản trị**. Public và internal URLs được phép khác nhau, nhưng phải dùng chung quy tắc và ID canonical.
3. Không phá vỡ service đang hoạt động chỉ vì thay tên: dùng **adapter rõ ràng** trong từng frontend. Không đổi database schema ngầm.
4. Khi có mâu thuẫn, ưu tiên **an toàn thanh toán/ghế/phân quyền và tính đúng dữ liệu**; điểm chưa được quyết định đặt trạng thái **OPEN**.
5. Mọi payload mẫu, đặc biệt HTTP status, được mô tả là **hợp đồng mục tiêu**; việc triển khai chính thức phải có integration test PHP.

## 1. Kiến trúc và transport chung

- Cả hai ứng dụng sử dụng `VITE_API_BASE_URL` trỏ tới một backend PHP, ví dụ `https://example.test/api`; đường dẫn trong tài liệu là **tương đối** với base URL.
- Browser gọi JSON qua HTTPS, `withCredentials: true`. Cookie do PHP cấp: `HttpOnly`, `Secure` khi HTTPS, `SameSite` phù hợp cách triển khai các origin. Nếu cross-origin, cấu hình CORS theo **danh sách origin cụ thể** với credentials, không wildcard; cần đối chiếu cả CSRF/Origin.
- Mọi POST/PUT/PATCH/DELETE (kể cả login/logout nếu PHP yêu cầu) cần CSRF protection; client gửi `X-CSRF-Token` lấy từ `/auth/me`, login hoặc `/auth/csrf` khi chưa đăng nhập. Không lưu refresh token, payment secrets hoặc token nhạy cảm trong `localStorage`.
- Tệp ảnh gửi `multipart/form-data`, field tên `file`, để browser tự tạo boundary; backend PHP kiểm tra MIME thật, giới hạn <=5 MB, JPG/PNG/WebP, re-encode và tạo tên ngẫu nhiên. **Upload không đồng nghĩa tự động lưu entity**: cần thao tác lưu thành công.
- **Response một bản ghi (chuẩn đề xuất):** `{"success":true,"data":{...}}`.
- **Response danh sách có phân trang server (chuẩn CMS):** `{"success":true,"data":[...],"meta":{"total":42,"page":1,"pageSize":10}}`; có adapter cho `data:{items:[...],total:42}` ở service hiện tại.
- **Danh sách kiểu legacy:** một số service Dashboard và public Customer đang đòi **toàn bộ array** (trực tiếp hoặc bọc `data`) rồi phân trang ở client. PHP không được chỉ trả một trang mà thiếu `total`. Muốn chuyển sang server pagination phải nâng **PHP + service + UI** đồng thời; không thay tất cả endpoint hàng loạt.
- Pagination mới: `page` bắt đầu 1, `pageSize` giới hạn tối đa 100 theo đề xuất; filter/search trước khi tính `total`, thứ tự ổn định.
- **Error:** HTTP `400/401/403/404/409/413/422/429/500` với `{"success":false,"message":"Thông báo an toàn","errors":{"field":["Lý do"]}}`. HTTP 200 với `success:false` vẫn là thất bại trên client. Không trả SQL, stack trace, mật khẩu hay token vào thông báo.
- Nội bộ trả `Cache-Control: private, no-store`; dữ liệu công khai có thể cache có kiểm soát nhưng phải invalidate khi cập nhật/xóa nội dung.
- Múi giờ nghiệp vụ: `Asia/Ho_Chi_Minh`; date-only `YYYY-MM-DD`, có hiệu lực đầu ngày 00:00 tới hết ngày 23:59:59.999 +07. Timestamp phải kèm offset hoặc Z. Tránh tự lấy timezone thiết bị để tính trạng thái voucher/suất chiếu.

### 1.1. Ví dụ response / error (S-N)

```json
{
  "success": true,
  "data": [{"movieId": 1, "mName": "Phim mẫu"}],
  "meta": {"total": 1, "page": 1, "pageSize": 10}
}
```

```json
{
  "success": false,
  "message": "Dữ liệu không hợp lệ",
  "errors": {"startDate": ["Ngày bắt đầu không hợp lệ"]}
}
```

## 2. ID và ánh xạ DTO canonical

| Entity | ID/field canonical | Quy ước, alias và giới hạn |
|---|---|---|
| Movie | `movieId` **number**; `mName`, `descript`, `runTime`, `releaseDate`, `closingDate`, `ageRating`, `posterUrl`, `trailerUrl` | `slug` **C-N/S-N** cần cho URL SEO Customer; bổ sung ở DTO đọc/DB sau khi PHP chốt. Dashboard không tự đổi `mName` thành `title`. Catalog `genreIds[]`, `formatIds[]`, `actorIds[]` khi ghi; đọc có thể là mảng tên/đối tượng và cần adapter. |
| Branch | `branchId` number; `bName`, `bAddress`, `phoneNumbers[]` | Dashboard có `managerId,isActive`; public **không** trả dữ liệu quản lý hoặc dữ liệu nội bộ. |
| Room | **khóa kép** `branchId` + `roomId` (number) | `rType,rCapacity,basePrice`; không coi `roomId` là duy nhất toàn hệ thống. |
| Showtime | `timeId` number; `movieId,branchId,roomId,formatName,day,startTime,endDate,endTime` | `showtimeId` trong snapshot vé/query POS là **FK alias trỏ tới `timeId`**; không tạo ID suất thứ hai. `rPrice` trong Customer là giá hiển thị/derived **OPEN**, không phải nguồn tính tiền server. |
| Seat | `branchId,roomId,sRow,sColumn,sType,sPrice,sStatus` | `sType=1` Thường, `sType=2` VIP; `sType=3` lịch sử cần migration có kiểm chứng. **Trạng thái đặt/giữ ghế là theo `timeId`, không phải trạng thái ghế vật lý dùng chung.** |
| Food & Drink | `productId,pName,pType,price,quantity,imgUrl,startDate,endDate,description` | `quantity` là tồn kho. Public gắn `itemType=FOOD_DRINK` để phân biệt nguồn, không bắt sửa DB. |
| Merchandise | `productId,merchName,price,availNum,imgUrl,startDate,endDate,description` | `availNum` tại merchandise là **tồn kho hàng**, không phải `availNum` voucher. Public `itemType=MERCHANDISE`. Giỏ khóa theo `(itemType,productId)`. |
| Coupon | `couponId,startDate,endDate,saleOff,releaseNum,availNum,minOrderTotal,maxDiscount` | **Không** `releaseDate`, `isActive` hoặc sửa `availNum` trực tiếp. `maxDiscount=0` là không giới hạn theo Dashboard. |
| Customer | `cUserId` string; `cName,phoneNumber,sex` (Dashboard) | Customer UI từng dùng `userId,fullName,phone,gender,dob`. **S-N:** chuẩn API customer profile dùng `cUserId,cName,phoneNumber,sex`, `birthday` **OPEN** nếu DB hỗ trợ; adapter UI ánh xạ `fullName→cName`, `phone→phoneNumber`, `gender→sex`, `dob→birthday`, `userId→cUserId`. Không ghi field chưa được PHP xác nhận. |
| Employee | `eUserId` string; `eName,email,phoneNumber,sex,userType,branchId` | `salary`, quyền/thuộc tính nhạy cảm **không bao giờ** đưa vào public Customer API. |
| MovieComment | `commentId,movieId,movieTitle,userId,authorName,rating,content,createdAt,contentStatus` | `rating` là **integer 1–5**; `content` nullable/rỗng. `userId` public là ID khách tương ứng `cUserId`, PHP xác định từ session khi POST. |
| CinemaReview | `reviewId,branchId,branchName,roomId,userId,authorName,content,createdAt,contentStatus` | `roomId` nullable và phải thuộc branch. **Không** `movieId` hoặc rating mặc định. |
| ContentReport | `reportId,targetType,targetId,reporterId,reason,reportedAt,status,resolutionAction,resolvedAt,resolvedBy` | `targetType = MOVIE_COMMENT | CINEMA_REVIEW`; `reportId` khác `targetId`. Alias `id` chỉ khi đọc dữ liệu legacy. `target` chứa DTO đúng loại ở Dashboard. |
| Order | `orderId,branchId,source,orderStatus,total,ticketDetails,addonDetails` | Dashboard có `createdByEmployeeId`; Customer mở rộng `orderTime,originalTotal,discountAmount`. Snapshot lịch sử giữ thông tin phim/ghế/giá tại lúc mua. Field optional phải được xác nhận trên PHP. |
| WorkSchedule | `scheduleId,employeeId,branchId,workDate,endDate,startTime,endTime,work,position` | **D-N** riêng Dashboard, không phải tính năng Customer. `employeeId` là `eUserId` string. Ca tuần LEGACY không dùng cùng khóa. |

**Quy tắc dữ liệu:** ID của hai FE phải tham chiếu cùng bản ghi MySQL. Không sinh ID giả ở adapter production. `roomId` ràng buộc `branchId`; ngày/giờ, trạng thái và tổng tiền được server xác minh. Public DTO là **projection/allowlist**, không phơi toàn bộ DTO admin.

## 3. Authentication, phân quyền và hồ sơ

### 3.1. Endpoint dùng chung hoặc theo audience

| Method | URL | Audience | Contract/mức độ |
|---|---|---|---|
| GET | `/auth/csrf` | Guest/Customer, có thể dùng nội bộ | **C-N**: `{csrfToken}` cho mutation trước login |
| POST | `/auth/login` | Customer hoặc nhân sự (cổng riêng) | **D-L + C-N**: `{provider:"LOCAL",email,password}`; cookie + user/CSRF theo mục dưới |
| GET | `/auth/me` | Cả hai | **D-L + C-N**: user hiện tại từ cookie; phải đủ khôi phục sau reload |
| POST | `/auth/logout` | Cả hai | **D-L + C-N**: thu hồi phiên, expire cookie; Customer mong `{loggedOut:true}` |
| POST | `/auth/refresh` | **Nội bộ tùy chọn** | **D-N/OPEN**: Dashboard đề xuất single-flight refresh; Customer chủ đích không auto-refresh. Không bắt Customer gọi endpoint này. |
| POST | `/auth/register` | Customer | **C-N**: đăng ký tài khoản khách, không tự cấp role nội bộ |
| POST | `/auth/change-password` | Customer/nhân sự | **D-L + C-N**: `{oldPassword,newPassword}`; kiểm tra mật khẩu cũ, >=10 ký tự theo cả hai tài liệu |
| PUT | `/auth/profile` | Nhân sự | **D-L**: `{name,phoneNumber,birthday,avatarUrl}`; không phải sửa customer profile |
| PUT | `/customers/me` | Customer | **C-N + S-N**: chỉ sửa hồ sơ của chính phiên; DTO canonical trong mục 2 |
| POST | `/customers/me/avatar` | Customer | **C-N**: multipart field `file`, trả profile/avatarUrl đã lưu |
| POST | `/auth/forgot-password` | Customer | **C-N**: email trung lập, rate limit; chỉ PHP gửi mail |
| POST | `/auth/reset-password` | Customer | **C-N**: token có TTL và một lần dùng; backend thu hồi phiên |
| GET | `/permissions` | Internal | **D-N**: danh sách quyền có thể cấp; không đưa sang Customer |

### 3.2. User session thống nhất (S-N)

`/auth/me` trả user với trường cốt lõi `id,name,email,role,branchId,permissions,avatarUrl,csrfToken` (các field không áp dụng có thể null hoặc []). `role` là `CUSTOMER | STAFF | MANAGER | ADMIN` (có thể chuẩn hóa prefix `ROLE_` ở adapter). `id` tương ứng `cUserId` với CUSTOMER hoặc `eUserId` với nhân sự. **S-N** đề xuất `/auth/login` trả `{user,csrfToken}` bên trong `data` để hai FE dễ xử lý; Dashboard hiện cho phép `{accessToken?,csrfToken}` và Customer mong customer profile, nên **chưa được coi login response đã tương thích**.

Ví dụ user nhân sự từ Dashboard (minh họa, không phải account thật):

```json
{
  "id": "NV002",
  "name": "Quản lý",
  "email": "manager@example.test",
  "role": "MANAGER",
  "branchId": 1,
  "avatarUrl": "/uploads/avatar.webp",
  "permissions": ["dashboard:read", "movies:read", "workshifts:read"],
  "csrfToken": "opaque-value"
}
```

- **Internal**: chỉ ADMIN/MANAGER/STAFF được vào dashboard; PHP bắt buộc quyền `module:read/create/update/delete`, `orders:confirm-payment`, `orders:cancel`, `workshifts:read-own`... và branch scope trên **từng bản ghi**. ADMIN không tự có wildcard nếu session chưa được cấp.
- **Customer**: không truy cập internal endpoints/DTO nội bộ. PHP lấy user từ session, không tin `userId`,`reporterId`,`role`,`branchId` tự khai trong request. Hồ sơ cá nhân chỉ do customer sửa; Dashboard **kể cả ADMIN** không được sửa thông tin cá nhân khách hàng, chỉ khóa/mở khóa hoặc xóa theo quy tắc tài khoản.
- **Scope lịch**: STAFF chỉ `/work-schedules/me`; MANAGER `branchId` của tài khoản; ADMIN mọi branch nếu có quyền. Scope đơn POS cũng theo chi nhánh phiên cho STAFF/MANAGER; không phụ thuộc branchId client gửi.
- **OPEN — phiên/refresh/cookie namespace:** Customer chủ đích không có retry `/auth/refresh`, Dashboard có đề xuất refresh optional. PHP phải chốt chiến lược cookie cùng hoặc tách namespace Customer/Internal, `SameSite`, phạm vi cookie, domain/origin, luồng CSRF và shape login trước khi bật production. Không dùng fallback thiếu bảo mật.

## 4. Phim, rạp, lịch chiếu, ghế: internal vs public

| Dữ liệu | Dashboard internal | Customer public | Ghi chú |
|---|---|---|---|
| Phim | **D-L** GET/POST `/movies`, PUT/DELETE `/movies/:movieId`; catalog GET/POST `/catalog/{genres,formats,actors}` | **C-N** GET `/public/movies`, GET `/public/movies/slug/:slug` | Public chỉ phim công khai; `slug` **S-N/OPEN** cần PHP bổ sung, duy nhất và quy tắc đổi slug |
| Chi nhánh | **D-L** GET/POST `/branches`, PUT/DELETE `/branches/:branchId` | **C-N** GET `/public/branches` | Không lộ managerId/quyền/nhân viên nội bộ |
| Phòng | **D-L** GET `/rooms?branchId`, POST `/rooms`, PUT/DELETE `/rooms/:branchId/:roomId` | **C-N** GET `/public/branches/:branchId/rooms` | Room khóa kép; public chỉ phòng được phép xem |
| Suất chiếu | **D-L** GET/POST `/showtimes`, PUT/DELETE `/showtimes/:timeId` | **C-N** GET `/public/showtimes?movieId=&branchId=`, GET `/public/showtimes/:timeId` | POST chủ yếu `movieId,branchId,roomId,formatName,day,startTime`; backend tính/kiểm tra endDate/endTime từ `runTime` |
| Ghế vật lý | **D-L** GET `/seats/branches/:branchId/rooms/:roomId`, POST `…/bulk` | Không sử dụng endpoint quản trị phòng | `sType=1/2`; `sStatus` là trạng thái ghế vật lý; update có kiểm tra vé/giữ ghế |
| Ghế của suất | **D-N** GET `/seats/branches/:branchId/rooms/:roomId?showtimeId=:timeId` cho POS | **C-N** GET `/public/showtimes/:timeId/seats` | `isBooked` + `holdStatus=FREE|OWN|OTHER` tính **theo suất**, không lộ người đang giữ |

- Luồng tạo/sửa lịch chiếu không yêu cầu người dùng nhập `endTime`. Adapter Dashboard hiện tính `endTime/endDate` (kể cả qua ngày) từ `runTime`; backend PHP phải tính lại và kiểm tra trùng lịch. Không có buffer dọn phòng được xác minh.
- Giá vé ở server dựa `Room.basePrice + Seat.sPrice`; Product/cart/coupon cộng/trừ theo quy tắc và DB. Customer có `rPrice` đọc trong showtime, **không được dùng làm giá xác thực hoặc ghi đè `basePrice`**. Cần PHP chốt ngữ nghĩa `rPrice` (ví dụ derived display field) trước phát hành.
- PHP kiểm tra bán vé theo thời điểm suất, phòng, seat/branch FK và tranh chấp giao dịch. Trạng thái `SCHEDULED/ON_AIR/FINISHED` ở UI có thể suy từ thời gian; backend quyết định điều kiện bán vé.

## 5. Sản phẩm và voucher: một nguồn dữ liệu

| Resource | Internal | Public | Quy tắc |
|---|---|---|---|
| Food & Drink | **D-L** GET/POST `/food-drinks`, GET/PUT/DELETE `/food-drinks/:id` | **C-N** GET `/public/products` (itemType=FOOD_DRINK) | `quantity` tồn kho; có startDate/endDate/description mở rộng |
| Merchandise | **D-L** GET/POST `/merchandise`, GET/PUT/DELETE `/merchandise/:id` | **C-N** GET `/public/products` (itemType=MERCHANDISE) | `availNum` là tồn kho merchandise |
| Coupon | **D-L** GET/POST `/coupons`, PATCH/DELETE `/coupons/:couponId` | **C-N** GET `/public/coupons` | Public chỉ coupon thực sự dùng được, còn lượt và đạt thời gian; PHP kiểm tra lại lúc checkout |

- **Voucher:** `startDate,endDate,releaseNum,availNum` là field chuẩn. `releaseDate/isActive` **không gửi** trong POST/PATCH. `PREACTIVE` trước đầu ngày, `ACTIVE` từ đầu startDate tới hết endDate, `EXPIRED` sau endDate. Hết lượt là thuộc tính tồn riêng, không biến thành EXPIRED. Đổi từ voucher `isActive=false` cũ phải có migration/chính sách rõ, không tự mở hàng loạt.
- `releaseNum` **không được giảm ở bất cứ thời điểm nào**, số nguyên không âm. PHP tính tăng `availNum`: `newAvailNum = oldAvailNum + (newReleaseNum - oldReleaseNum)` trong transaction, không tin client gửi `availNum`; đã dùng = `releaseNum - availNum`.
- **Sản phẩm:** `PREACTIVE` trước startDate; `EXPIRED` sau endDate; trong thời gian, `OUT_OF_STOCK` nếu kho 0, `ACTIVE` nếu kho >0. Thiếu ngày `UNKNOWN`, dữ liệu sai `INVALID`. Không có checkbox `isActive` ở form mới; server kiểm tra lại khi bán.
- **Cart:** Customer có giỏ hàng local theo `(itemType,productId)`; Dashboard ghi chưa có API giỏ hàng dở dang. Không tạo endpoint cart server/checkout hàng độc lập mà không có thiết kế nghiệp vụ và PHP xác nhận.

## 6. Đơn hàng, đặt giữ ghế và thanh toán — vùng cần chốt trước PHP

### 6.1. Order status và source

| Thuộc tính | Giá trị | Quy tắc và độ chắc chắn |
|---|---|---|
| `source` | `STAFF` / `CUSTOMER` | **D-N/C-N**; PHP cấp nguồn và `createdByEmployeeId` khi STAFF tạo. Không suy đoán source từ paymentMethod. |
| `orderStatus` | `PENDING` | **Dashboard D-N**: đơn **STAFF tại quầy**, chưa xác nhận thanh toán. Chỉ nguồn STAFF hợp lệ được confirm/cancel tại quầy. |
| `orderStatus` | `AWAITING_PAYMENT` | **Customer C-N + S-N đề xuất bổ sung**: đơn online đã tạo, chưa có webhook thành công. **OPEN**: Dashboard vẫn liệt kê bộ cũ PENDING/PAID/CANCELLED; PHP phải bổ sung và hai FE hỗ trợ đọc trạng thái này nếu chốt. |
| `orderStatus` | `PAID` | Cả hai: chỉ PHP đã xác minh thanh toán qua webhook hoặc xác nhận thu tiền quầy thành công. |
| `orderStatus` | `CANCELLED` | Dashboard đã nêu, hủy PENDING tại quầy theo rule; online cancellation policy **OPEN**. |
| `orderStatus` | `EXPIRED` | **C-N**: online hết hạn giữ/thanh toán; migration/enum PHP **OPEN**. |
| `paymentStatus` | `FAILED` (nếu có) | **OPEN**: coi là trạng thái payment trước khi quyết định có dùng `orderStatus=FAILED`; không tạo chuyển trạng thái giả. |

**Không cho Customer gọi `confirm-payment`**, không cho Dashboard đổi `orderStatus` tùy ý bằng PUT. Các trạng thái `REFUNDED/FAILED` lịch sử ở Dashboard phải xử lý riêng, không tự đổi thành PAID/CANCELLED.

### 6.2. Endpoint bảng chung

| Method | URL | Audience / request / quy tắc |
|---|---|---|
| GET | `/orders` | **D-L** Internal list theo scope, legacy full list; `ticketDetails,addonDetails,total,source,orderStatus`... Không lộ ngoài branch. |
| POST | `/orders` | **D-L + D-N** STAFF POS `{paymentMethod,customerId?,branchId,couponId?,tickets[],addons[]}` → server transaction tạo PENDING, không tin giá client. |
| GET | `/orders/:orderId` | **D-L** Internal detail theo quyền. |
| POST | `/orders/:orderId/confirm-payment` | **D-N** `{}`; `orders:confirm-payment`, source=STAFF, PENDING→PAID, trả OrderResponse có `paidAt,confirmedBy` sau commit; `403/409/422` khi sai. |
| POST | `/orders/:orderId/cancel` | **D-N** `{}`; `orders:cancel`, source=STAFF, chỉ PENDING→CANCELLED, trả `cancelledAt,cancelledBy`; cạnh tranh với confirm cùng transaction. |
| POST | `/seat-reservations` | **C-N** `{timeId,seats:[{sRow,sColumn}]}` (1–8 ghế, đề xuất); trả reservationId/expiresAt từ PHP. |
| GET/DELETE | `/seat-reservations/:reservationId` | **C-N** xem/hủy giữ ghế thuộc session; hết hạn trả 404/409 phù hợp quy tắc. |
| POST | `/customer/orders` | **C-N** `{reservationId,addons:[{itemType,productId,quantity}],couponId?,idempotencyKey}`; PHP tính tiền, giữ snapshot, source=CUSTOMER; trạng thái chưa trả tiền **OPEN AWAITING_PAYMENT**. |
| GET | `/customer/orders` | **C-N** Chỉ đơn chính session. |
| GET | `/customer/orders/:orderId` | **C-N** Chỉ đơn thuộc session; dùng để xác minh trạng thái sau redirect. |
| POST | `/customer/orders/:orderId/payment` | **C-N** `{}` → `{paymentUrl}` HTTPS (provider do PHP cấu hình); không gửi amount/secret. |
| GET | `/customer/payments` | **C-N** Payment[] thuộc session: `paymentId,orderId,amount,paymentMethod,paymentStatus,paymentTime,transactionId?`. |

**Bắt buộc ở PHP:** khóa/transaction tranh chấp ghế theo `timeId`, idempotencyKey theo khách và payload, số tiền server tính, coupon/tồn kho/seat reservation nhất quán. Hết hạn/hủy phải giải phóng tài nguyên nguyên tử và không giải phóng hai lần. Webhook provider kiểm tra chữ ký, amount, orderId, trạng thái và idempotency trước PAID. Redirect/query `status=success` không phải bằng chứng thanh toán.

**OPEN trước production:** enum order online; trạng thái payment riêng; retry/hết hạn webhook, chính sách giữ/giải phóng stock/coupon, hoàn tiền; snapshot `ticketDetails` và `addons` response đủ cho hai FE; có hay không giỏ hàng/checkout sản phẩm riêng. Không tự lấp các khoảng trống này bằng Mock Mode.

## 7. Bình luận phim, đánh giá rạp và báo cáo (không duyệt trước)

| Tác vụ | Dashboard | Customer | DTO/quyền |
|---|---|---|---|
| Bình luận phim | **D-N** GET `/movie-comments/:commentId` khi có quyền xem báo cáo | **C-N** GET `/public/movies/:movieId/comments`; POST `/movie-comments` `{movieId,rating,content:null|string}` | `rating` integer 1–5, content nullable; PHP lấy chủ thể từ phiên |
| Đánh giá rạp | **D-N** GET `/cinema-reviews?q=&branchId=&roomId=&page=&pageSize=` | **C-N** GET `/public/branches/:branchId/reviews`; POST `/cinema-reviews` `{branchId,roomId:null|number,content}` | Không rating mặc định; MANAGER chỉ xem branch mình, ADMIN toàn bộ, STAFF không cấp quyền mặc định |
| Báo cáo | **D-N** GET `/comment-reports?q=&status=&targetType=&page=&pageSize=` | **C-N** POST `/comment-reports` `{targetType,targetId,reason}` | Nhận report PENDING **không** tự ẩn/xóa nội dung; PHP lấy reporterId từ session |
| Xử lý báo cáo | **D-N** POST `/comment-reports/:reportId/resolve` `{action:"DISMISS"|"DELETE"}` | **Không có API Customer tương ứng** | Quyền `comment-reports:update` (DISMISS), `comment-reports:delete` (DELETE) |

- `MovieComment` khác `CinemaReview`: không dùng một bảng hoặc DTO gây lẫn movieId/rating với branchId/roomId. Nội dung chỉ public nếu `contentStatus=VISIBLE`; không render HTML không an toàn.
- Trạng thái Report: `PENDING → RESOLVED`, quyết định `resolutionAction=DISMISS|DELETE`, không có nút HIDE/Đã xử lý thủ công. PHP thực hiện hành động và đổi status **trong cùng transaction**, trả report đầy đủ, không tự làm 2 lần. `DISMISSED` lịch sử chỉ chuyển qua migration đã audit.
- Báo cáo CinemaReview bị lọc theo branch của review; báo cáo MovieComment theo permission riêng, không suy ra branch từ phim.
- Nhiều báo cáo cùng target: Dashboard **đề xuất** khi DELETE thành công tự resolve các report PENDING cùng target, giữ report đã DISMISS; **OPEN** chờ PHP xác nhận chính sách trước production.
- Customer không được gửi `userId`,`reporterId`, không có quyền DELETE nội dung của người khác hoặc resolve report.

## 8. FAQ, News, liên hệ và upload

**Cập nhật phạm vi 06/11/2026 theo yêu cầu chủ dự án:** O-12 **DECIDED** về phạm vi chức năng: triển khai quản trị liên hệ khách hàng và quản lý nội dung website để đáp ứng assignment. Chi tiết kỹ thuật giữ **PENDING_BACKEND_CONFIRMATION** theo mục 11.1 và [proposal endpoint/schema/permission](../Dashboard/docs/CONTACT_WEBSITE_CONTENT_API_PROPOSAL.md); không phục hồi Cấu hình, Thư viện Ảnh hay page builder. O-01–O-11 không thay đổi.

| Tính năng | Internal | Customer |
|---|---|---|
| FAQ | **D-N** GET/POST `/faq`, PUT/DELETE `/faq/:id` (`id,question,answer,sortOrder,status`) | **C-N** GET `/public/faq`: chỉ `PUBLISHED` |
| News | **D-N** GET/POST `/news`, PUT/DELETE `/news/:id` (`id,title,slug,seoTitle,metaDescription,tags,content,category,imageUrl,status,createdAt`) | **C-N** GET `/public/news`: chỉ `PUBLISHED` |
| Categories | **D-N** GET/POST `/categories`, PUT/DELETE `/categories/:id` (`type=NEWS|PRODUCT`) | Public chỉ danh mục hiển thị nếu được công khai; endpoint riêng **OPEN** nếu cần |
| Media | **D-N** GET `/media`, POST `/files/upload?folderName=movies/products/employees/media` (field `file`) | **C-N** POST `/customers/me/avatar` (field `file`) |
| Liên hệ | **D-N, phạm vi DECIDED (O-12)**: ADMIN GET `/contacts`, GET `/contacts/:id`, PATCH `/contacts/:id/status`, DELETE `/contacts/:id`, theo permission; trạng thái `UNREAD`, `READ`, `REPLIED` | **C-N** POST `/contacts` cho Guest/Customer; giữ body `{fullName,email,phone,subject,content}` và receipt `{id,received:true}` trong hợp đồng frontend. PHP xác nhận lưu sau commit; đánh dấu REPLIED nội bộ không tự gửi email. |
| Giới thiệu / Nội dung website | **D-N, phạm vi DECIDED (O-12)**: ADMIN GET `/site-content`, PUT `/site-content/:section`; chỉ sáu section `global`, `home`, `about`, `services`, `pricing`, `contact` | **C-N** GET `/public/site-content` cho Guest/Customer; cùng sáu section, không dữ liệu liên hệ cá nhân hoặc audit nội bộ. Customer đã tích hợp đọc ở frontend/mock; PHP chưa được xác minh. |

- FAQ/News `status=DRAFT|PUBLISHED|HIDDEN`; public chỉ PUBLISHED. News `tags` hiện là **chuỗi** phân cách bằng dấu phẩy, không tự đổi thành array. News/FAQ lưu plain text và escape khi render; nếu rich HTML phải thống nhất sanitizer ở cả FE và PHP.
- `slug` news duy nhất theo phạm vi resource. `slug` phim riêng là **S-N/OPEN**, không đồng nhất news slug.
- Ảnh trả URL do doanh nghiệp kiểm soát; không dùng URL bên ngoài làm giải pháp upload. DELETE ảnh được tham chiếu trả 409 theo đề xuất Dashboard.

## 9. Internal-only endpoints (Dashboard giữ nguyên, Customer không gọi)

| Module | Dashboard endpoints | Ghi chú |
|---|---|---|
| Employees | **D-L** GET/POST `/employees`, GET `/employees/:eUserId`, GET `/employees/branch/:branchId`, PUT/DELETE `/employees/:eUserId`, PATCH activate/deactivate | Scope theo vai trò, quyền gán, audit; không trả mật khẩu; MANAGER chỉ nhân viên STAFF trong branch được cấp |
| Customers | **D-L** GET `/customers`, `/customers/:cUserId`, `/customers/phone?phone`, PATCH activate/deactivate; **D-N** DELETE `/customers/:id` | Dashboard **không** reset mật khẩu/đổi hồ sơ cá nhân customer. `customers:update` chỉ khóa/mở khóa. |
| Work schedules | **D-N** GET `/work-schedules/me`, GET/POST `/work-schedules`, PUT/DELETE `/work-schedules/:scheduleId` | Calendar ngày/tuần/tháng; STAFF /me, MANAGER branch của phiên, ADMIN toàn hệ thống theo permission. |
| Work shifts legacy | **LEGACY D-L** `/work-shifts`, `/work-shifts/branch/:branchId`, `/work-shifts/detail`, PUT/DELETE `/employees/:eUserId/work-shifts` | Ca tuần `wDate`; UI mới **không** gọi/fallback. Migration phải có kế hoạch, không đổi khóa ngầm. |
| Statistics | **D-L** GET `/statistics/overview`, `/statistics/revenue/daily`, `/statistics/revenue/movie`, `/statistics/revenue/branch`, `/statistics/occupancy` | `startDate,endDate,branchId` trong scope; không trả số liệu nội bộ cho public. |
| Settings lịch sử | **LEGACY D-L** GET/PUT `/system/settings` | Đã bỏ mục Cấu hình khỏi Dashboard; không tự khôi phục trang Cấu hình. |
| Lookup/catalog | **D-L** `/catalog/genres`, `/catalog/formats`, `/catalog/actors`; internal `/branches`, `/rooms`, `/movies`, `/employees/branch/:branchId` | PHP chỉ trả dữ liệu tra cứu trong scope, không cấp CRUD admin do người dùng cần lookup. |

### 9.1. DTO WorkSchedule mới (Dashboard D-N)

```json
{
  "employeeId": "NV003",
  "branchId": 1,
  "workDate": "2026-11-05",
  "endDate": "2026-11-05",
  "startTime": "08:00",
  "endTime": "12:00",
  "work": "Ca sáng",
  "position": "Soát vé"
}
```

Server trả `scheduleId`; GET theo khoảng tối đa 63 ngày, ca qua đêm có `endDate` hôm sau, không cho nhân viên trùng ca trong hai branch. STAFF chỉ thấy lịch mình; manager chỉ chi nhánh tài khoản; không chuyển ca tuần lịch sử thành bản ghi ngày tự động.

## 10. Ma trận quyền và bảo mật tối thiểu

| Khả năng | Guest | CUSTOMER | STAFF | MANAGER | ADMIN |
|---|---|---|---|---|---|
| Đọc phim/FAQ/tin/sản phẩm public | Có | Có | Có qua public API nếu cần | Có qua public API nếu cần | Có qua public API nếu cần |
| Gửi liên hệ | Có, POST `/contacts` | Có, POST `/contacts` | Không phải module quản trị | Không phải module quản trị | Không phải module quản trị |
| Bình luận phim / đánh giá rạp | Không gửi nếu chưa login | Có, theo phiên | Không tự cấp qua internal role | Không tự cấp | Không tự cấp |
| Báo cáo nội dung vi phạm | Không gửi nếu chưa login | Có | Không qua role internal | Không qua role internal | Không qua role internal |
| Xem/chỉnh sửa customer profile | — | **Chính mình** | Không | Không | Không (chỉ khóa/mở khóa tài khoản theo quyền) |
| Đặt vé/thanh toán web | — | Chính mình | Không dùng endpoint Customer POS | Không dùng endpoint Customer POS | Không dùng endpoint Customer POS |
| POS/confirm-payment/cancel | — | Không | Theo permission và branch | Theo permission và branch | Theo permission |
| Lịch làm việc | — | Không | Chỉ chính mình | Trong branch tài khoản | Toàn hệ thống theo permission |
| Quản lý voucher/sản phẩm/FAQ/news | — | Không | Không tự cấp | Theo permission/scope | Theo permission |
| Xử lý báo cáo | — | Không | Không mặc định | Theo permission/scope | Theo permission |
| Đọc nội dung website công khai | Có, GET `/public/site-content` | Có, GET `/public/site-content` | Chỉ public, không quyền quản trị | Chỉ public, không quyền quản trị | Có qua public API; quyền quản trị xét riêng |
| Quản trị Liên hệ / Nội dung website (O-12) | Không | Không | Không | Không | ADMIN và permission `contacts:read/update/delete`, `website-content:read/update` tương ứng |

Thực tế quyền được PHP trả về và kiểm tra ở từng endpoint; bảng chỉ là **quy tắc nghiệp vụ mặc định**, không thay thế RBAC chi tiết trong Dashboard. `403` nếu bị cấm; `404` có thể dùng để che bản ghi ngoài scope theo chính sách backend thống nhất. Không cho mutate field chỉ vì frontend ẩn nút.

## 11. Các điểm cần quyết định trước khi triển khai PHP (O-01–O-11 OPEN; O-12 có trạng thái riêng)

| ID | Vấn đề | Dashboard hiện mô tả | Customer hiện mô tả | Quyết định đích / người cần chốt |
|---|---|---|---|---|
| O-01 | Online order status | PENDING/PAID/CANCELLED, STAFF PENDING | AWAITING_PAYMENT, EXPIRED đề xuất | **PHP + cả hai FE** chốt enum order/payment; nếu chấp nhận, mở rộng Dashboard đọc/trạng thái lọc, không cho confirm online |
| O-02 | Auth refresh/session | `/auth/refresh` optional + accessToken?, cookie/CSRF | Cookie/CSRF, không auto refresh | **PHP + FE** chốt response login/me, cookie namespace, CSRF, có hay không refresh |
| O-03 | Customer profile | `cUserId,cName,phoneNumber,sex` và `/auth/profile` nhân sự | `userId,fullName,phone,gender,dob`, `/customers/me` | **PHP** chốt canonical `cUserId,cName,phoneNumber,sex`, field birthday/dob nếu DB hỗ trợ; Customer adapter; giữ internal auth/profile tách |
| O-04 | Movie slug | Dashboard chưa có `slug` trong payload phim | Customer route `/public/movies/slug/:slug` | **PHP + Dashboard** chốt lưu/tạo/đổi slug và uniqueness, không đoán từ mName ở runtime |
| O-05 | Showtime price/alias | `timeId`, giá room base+seat sPrice | `showtimeId` snapshot, `rPrice` đọc | **PHP** xác nhận `showtimeId` FK tới `timeId`, `rPrice` derived/loại bỏ theo lộ trình; server tính tiền |
| O-06 | List pagination | Dashboard legacy full arrays, CMS meta | Customer public full arrays | **PHP + FE** giữ full arrays trước, muốn đổi từng endpoint thì migrate đồng bộ cả UI/service |
| O-07 | MovieComment content status | Mô hình VISIBLE/DELETED mới | Chỉ public VISIBLE | **PHP** chốt trạng thái dữ liệu legacy, migration, không duyệt trước |
| O-08 | Voucher legacy | Bỏ `releaseDate,isActive`, không giảm số lượng | Cùng quy tắc | **PHP** lập migration data cũ isActive=false và NOT NULL releaseDate nếu tồn tại |
| O-09 | Report multiple-target policy | Đề xuất resolve các report cùng target khi DELETE | Customer chỉ tạo PENDING | **PHP** chốt xử lý nguyên tử, tombstone, audit/history |
| O-10 | Online checkout resources | POS tạo PENDING giữ ghế | Reservation + webhook online, AWAITING_PAYMENT | **PHP** chốt TTL, stock/coupon reservation, idempotency, refund và race conditions |
| O-11 | `roomId`/`productId` public | room composite; hai product tables | Public union itemType/productId | **PHP** đảm bảo allowlist và key `(itemType,productId)`; không trả ID ambiguous |
| O-12 | Quản trị liên hệ khách hàng và quản lý nội dung website | Triển khai hai module cho ADMIN theo permission để đáp ứng assignment | Guest/Customer POST `/contacts`, GET `/public/site-content`; không có quyền quản trị | **DECIDED — phạm vi chức năng. PENDING_BACKEND_CONFIRMATION — chi tiết kỹ thuật PHP**, gồm DTO đầy đủ, validation, upload ảnh và cấu trúc MySQL; xem mục 11.1. |

### 11.1. O-12 — quyết định phạm vi và xác nhận backend

**Ngày quyết định: 06/11/2026, theo yêu cầu chủ dự án. Trạng thái phạm vi: DECIDED.** Xác nhận triển khai hai module **Liên hệ khách hàng** và **Nội dung website** để đáp ứng assignment. Đây là quyết định chức năng và ranh giới API giữa hai frontend, không phải xác nhận PHP đã triển khai hoặc đã tích hợp thật.

| Phía sử dụng | Method / endpoint thống nhất | Quyền / mục đích |
|---|---|---|
| Customer | POST `/contacts` | Guest/Customer gửi liên hệ, không bắt đăng nhập |
| Customer | GET `/public/site-content` | Guest/Customer đọc nội dung công khai |
| Dashboard | GET `/contacts` | ADMIN + `contacts:read`: danh sách, tìm kiếm, lọc, phân trang |
| Dashboard | GET `/contacts/:id` | ADMIN + `contacts:read`: xem chi tiết |
| Dashboard | PATCH `/contacts/:id/status` | ADMIN + `contacts:update`: cập nhật trạng thái |
| Dashboard | DELETE `/contacts/:id` | ADMIN + `contacts:delete`: xóa theo chính sách backend được xác nhận |
| Dashboard | GET `/site-content` | ADMIN + `website-content:read`: đọc nội dung quản trị |
| Dashboard | PUT `/site-content/:section` | ADMIN + `website-content:update`: lưu một trong sáu section |

- Trạng thái liên hệ thống nhất: **UNREAD** (chưa đọc), **READ** (đã đọc), **REPLIED** (đã ghi nhận phản hồi). Liên hệ mới bắt đầu UNREAD; REPLIED là trạng thái quản trị, không phải chứng cứ hệ thống đã gửi email.
- Sáu nhóm nội dung thống nhất: **global** (thông tin doanh nghiệp dùng chung), **home** (trang chủ), **about** (giới thiệu), **services** (dịch vụ), **pricing** (lời giới thiệu/lưu ý bảng giá), **contact** (nội dung trang liên hệ). Nội dung biên tập không thay nguồn phim, suất chiếu, phòng, sản phẩm hoặc nguồn tính giá vé/checkout.
- Chỉ **ADMIN có permission tương ứng** được quản trị; STAFF/MANAGER/CUSTOMER/Guest không được gọi API quản trị. PHP phải thực thi kiểm tra quyền từ phiên. Customer không tạo UI quản trị hoặc fallback sang endpoint internal.
- Public site-content chỉ trả nội dung công khai; không bao gồm biểu mẫu liên hệ cá nhân hay metadata audit. Không mở lại module Cấu hình hoặc Thư viện Ảnh; upload dùng chung hiện hữu không phải một module quản trị mới.

**Trạng thái chi tiết kỹ thuật: PENDING_BACKEND_CONFIRMATION.** Những nội dung sau vẫn cần PHP/backend xác nhận, không được coi là hoàn thành do frontend/mock đã chạy:

1. DTO request/response đầy đủ, envelope/error/pagination và schema từng section trong [proposal](../Dashboard/docs/CONTACT_WEBSITE_CONTENT_API_PROPOSAL.md); các ví dụ hiện tại là hợp đồng frontend/mục tiêu triển khai, chưa là bằng chứng PHP hỗ trợ.
2. Validation chung (đặc biệt giới hạn tên/email/chủ đề và phone bắt buộc 8–15 số ở Customer so với phone optional/formatted trong proposal Dashboard), chuẩn hóa dữ liệu và chính sách chuyển trạng thái/audit.
3. Upload ảnh: MIME/kích thước, ownership, URL/storage/CDN allowlist, xử lý file tham chiếu và dọn file mồ côi.
4. Cấu trúc MySQL, migration/seed, transaction và receipt sau commit, timestamp/audit, retention/soft-delete và chính sách email.
5. Session/CSRF/Origin, RBAC thực tế, rate limit/anti-spam; cache/invalidation public, version/ETag/conflict nhiều ADMIN và chống trùng khi retry sau timeout.
6. Kiểm thử tích hợp với PHP/MySQL chung: Customer gửi liên hệ → Dashboard đọc/quản trị; Dashboard lưu nội dung → Customer tải lại nội dung mới. Hai Mock Mode độc lập, không tự đồng bộ dữ liệu.

## 12. Kịch bản kiểm thử tích hợp bắt buộc với PHP

1. **Auth:** Guest/Customer/Internal đăng nhập đúng cổng; `auth/me` restore sau reload; CSRF/401/403; cookie domain; Customer bị từ chối internal routes, STAFF không xem người khác.
2. **DTO:** một movie/branch/room/showtime từ Dashboard hiển thị ở Customer với cùng ID và dữ liệu; room khóa kép; `timeId`/`showtimeId` alias; slug nếu đã chốt.
3. **Voucher:** create/update qua Dashboard; không giảm releaseNum, không sửa availNum, same-state theo VN time, public chỉ nhận coupon đủ điều kiện, redeem đồng thời không âm kho.
4. **Booking:** Customer giữ ghế, STAFF POS cạnh tranh cùng ghế -> một giao dịch bị 409; không bán ghế đã đặt ở cùng timeId, không khóa nhầm suất khác.
5. **Orders:** STAFF PENDING→PAID confirm thành công, không confirm lần hai; CUSTOMER online chưa thanh toán không PAID; webhook đã xác minh đổi PAID; refresh hai FE đồng bộ.
6. **Profile:** Customer sửa `cName/phoneNumber/sex` (và birthday nếu có) thấy ngay trong Dashboard read-only; ADMIN không sửa profile nhưng có thể khóa tài khoản theo quyền.
7. **Comments/reviews:** Customer gửi movie rating 1–5 hoặc CinemaReview branch đúng; admin/manager xem đúng scope, DELETE report làm biến mất nội dung public sau reload.
8. **Content:** Dashboard publish FAQ/News -> Customer thấy; DRAFT/HIDDEN không hiện. Theo O-12, Guest/Customer POST `/contacts` nhận receipt sau commit; ADMIN xem/đổi trạng thái/xóa liên hệ theo permission. ADMIN PUT `/site-content/:section` -> Customer GET `/public/site-content` nhận nội dung cập nhật; không lộ contact PII/audit. Các luồng này cần kiểm thử trên PHP/MySQL thật.
9. **Pagination:** toàn bộ danh sách theo contract, count chính xác; no truncation silently; filter branch trên server trước paging.
10. **Security:** CSRF, rate limits, upload MIME/size, IDOR, cross-branch, out-of-scope records, server-verified price/payment, không lộ lương/email nội bộ qua public endpoints.

## 13. Quy trình cập nhật tài liệu và triển khai

1. File này là **thiết kế chung đề xuất**, không phải thay thế ngay mọi contract/service đã chạy.
2. Khi chốt một mục `OPEN`, cập nhật: (a) file này (schema/examples/error), (b) Customer API_CONTRACT, (c) Dashboard API_CONTRACT, (d) PHP implementation, (e) test tương thích/fixtures của cả hai FE.
3. Trong monorepo, chỉ duy trì một bản canonical ở `docs/SHARED_API_CONTRACT.md` tại root; Customer và Dashboard tham chiếu cùng file, không giữ bản sao trùng lặp trong từng frontend. **Không có build dependency cứng vào ổ `C:/cms-dashboard`**.
4. Cấm một FE tự đổi tên field/route trong runtime để “ép chuẩn” khi phía PHP/FE còn lại chưa đổi; dùng adapter và kiểm thử contract.
5. Trước báo cáo assignment, phân biệt rõ endpoint chạy mock, endpoint PHP đã tích hợp/kiểm chứng và tính năng đang đề xuất. Bản giao diện frontend và tài liệu không tự chứng minh PHP/MySQL đã hoạt động.

---

### Nguồn nội bộ đã đối chiếu

- Dashboard: `cms-dashboard-el13GW.zip` → `cms-dashboard-el13GW/API_CONTRACT.md` (**nguồn chuẩn chính**).
- Customer: `CMS-Cinema-JavaScript-only-portable.zip` → `API_CONTRACT.md` (**phần public/customer bổ sung**).
- Quy định assignment: `assignment.pdf` đã cung cấp trong cuộc hội thoại; backend PHP thuần, MySQL và các thư viện frontend JavaScript/CSS được phép.

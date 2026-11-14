# Shared API Contract — Cinema Management System

Đặc tả giao tiếp thống nhất giữa **Customer Frontend**, **Internal Dashboard** và **PHP Backend/MySQL**. Mọi endpoint trong tài liệu được tính tương đối với `VITE_API_BASE_URL` (thông thường là `/api`). Chi tiết theo từng ứng dụng: [Customer API Contract](../Customer/API_CONTRACT.md) và [Dashboard API Contract](../Dashboard/API_CONTRACT.md).

## 1. Quy ước giao tiếp

- **Giao thức:** HTTPS, JSON, session cookie `HttpOnly`/`Secure`/`SameSite`, Axios `withCredentials: true`. CORS chỉ cho phép những origin được cấu hình; không sử dụng wildcard cùng credentials.
- **CSRF:** Các yêu cầu thay đổi dữ liệu gửi `X-CSRF-Token`, lấy từ phiên đăng nhập hoặc `GET /auth/csrf`. Không lưu token đăng nhập, token làm mới hay bí mật thanh toán trong `localStorage`.
- **Thành công:** `{ "success": true, "data": ... }`. **Lỗi:** `{ "success": false, "message": "...", "errors": { "field": ["..."] } }`; `errors` có thể không có. HTTP thường dùng: `400`, `401`, `403`, `404`, `409`, `413`, `422`, `429`, `500`.
- **Danh sách:** API có phân trang trả `data: [...]` và `meta: {total,page,pageSize}` (`page` từ 1, `pageSize` tối đa 100); một số service chấp nhận `data: {items,total}`. Endpoint dùng danh sách đầy đủ phải trả **toàn bộ mảng**, không âm thầm cắt trang. Lọc trước khi tính `total` và sắp xếp ổn định.
- **Ngày giờ:** Múi giờ nghiệp vụ `Asia/Ho_Chi_Minh`; ngày có dạng `YYYY-MM-DD`, bắt đầu lúc `00:00` và kết thúc hết `23:59:59.999` (+07:00). Timestamp có offset hoặc `Z`; lịch và ca qua nửa đêm phải dùng ngày kết thúc riêng.
- **Định danh:** Các ID phim, suất chiếu, chi nhánh, phòng, sản phẩm, voucher, đơn, bình luận, đánh giá, báo cáo, phân công là số nguyên dương; `cUserId` và `eUserId` là chuỗi. Phòng dùng khóa `(branchId,roomId)`; `showtimeId` trong vé là tham chiếu tới `timeId`.
- **Phân tách dữ liệu:** `/public/*` chỉ trả trường công khai; API nội bộ kiểm tra quyền và phạm vi chi nhánh trên server. Không đưa mật khẩu, lương, thông tin quyền, liên hệ cá nhân hoặc audit nội bộ vào public response.

## 2. Mô hình dữ liệu chung

| Đối tượng | Trường và quy ước chính |
|---|---|
| **Customer** | `cUserId,cName,email,phoneNumber,sex,avatarUrl`; frontend có thể ánh xạ thành `userId,fullName,phone,gender`. Không dùng tên trường UI làm tên cột/API mặc định. |
| **Employee** | `eUserId,eName,email,phoneNumber,sex,userType,branchId,avatarUrl,permissions[]`; `salary` chỉ thuộc dữ liệu nội bộ có quyền. |
| **Movie** | `movieId,mName,slug,descript,runTime,releaseDate,closingDate,ageRating,posterUrl,trailerUrl,genres,actors,formats`; khi ghi catalog có `genreIds[],formatIds[],actorIds[]`. |
| **Branch** | `branchId,bName,bAddress,phoneNumbers,totalRooms`; `managerId,isActive` chỉ thuộc dữ liệu quản trị. |
| **Room** | `branchId,roomId,rType,rCapacity,basePrice,totalSeats`; không giả định `roomId` duy nhất giữa các chi nhánh. |
| **Showtime** | `timeId,movieId,branchId,roomId,formatName,day,startTime,endDate,endTime`; `rPrice` là giá hiển thị, không phải nguồn tính tiền cuối cùng. |
| **Seat** | `branchId,roomId,sRow,sColumn,sType,sPrice,sStatus`; `sType=1` thường, `sType=2` VIP. `isBooked` và `holdStatus` xác định riêng theo `timeId`. |
| **Food & Drink** | `itemType=FOOD_DRINK,productId,pName,pType,price,quantity,imgUrl,startDate,endDate,description`. |
| **Merchandise** | `itemType=MERCHANDISE,productId,merchName,price,availNum,imgUrl,startDate,endDate,description`. |
| **Coupon** | `couponId,startDate,endDate,saleOff,releaseNum,availNum,minOrderTotal,maxDiscount`; `maxDiscount=0` nghĩa không giới hạn mức giảm tối đa. |
| **MovieComment** | `commentId,movieId,movieTitle,userId,authorName,rating,content,createdAt,contentStatus`; rating nguyên 1–5, content có thể `null`. |
| **CinemaReview** | `reviewId,branchId,branchName,roomId,userId,authorName,content,createdAt,contentStatus`; roomId có thể `null`, không có rating phim. |
| **ContentReport** | `reportId,targetType,targetId,reason,reportedAt,status,resolutionAction,resolvedAt,resolvedBy`; targetType là `MOVIE_COMMENT` hoặc `CINEMA_REVIEW`. |
| **Order** | `orderId,source,branchId,orderStatus,orderTime,total,originalTotal,discountAmount,ticketDetails,addonDetails`; đơn quầy có `createdByEmployeeId`. |
| **Payment** | `paymentId,orderId,amount,paymentMethod,paymentStatus,paymentTime,transactionId` (nếu có). |
| **WorkSchedule** | `scheduleId,employeeId,branchId,workDate,endDate,startTime,endTime,work,position`; `employeeId` tham chiếu `eUserId`. |

**Quy tắc định danh:** Giỏ hàng và addon dùng khóa `(itemType,productId)`; `availNum` của hàng lưu niệm là tồn kho sản phẩm, khác với `availNum` là lượt voucher còn lại. `reportId` là ID báo cáo, không phải `targetId` của nội dung bị báo cáo.

## 3. Xác thực và phân quyền

| Method | Endpoint | Chức năng / dữ liệu |
|---|---|---|
| GET | `/auth/csrf` | Trả `{csrfToken}` cho các yêu cầu cần CSRF. |
| POST | `/auth/login` | `{provider:"LOCAL",email,password}` → `{user,csrfToken}` và session cookie. |
| GET | `/auth/me` | Thông tin người dùng và quyền của phiên hiện tại. |
| POST | `/auth/logout` | Hủy phiên, Customer nhận `{loggedOut:true}`. |
| POST | `/auth/register` | Customer đăng ký bằng `{cName,email,password,phoneNumber,sex}`. |
| POST | `/auth/change-password` | `{oldPassword,newPassword}` → `{changed:true}`. |
| PUT | `/customers/me` | Customer tự sửa `{cName,phoneNumber,sex}`; không sửa email, ID hoặc role. |
| POST | `/customers/me/avatar` | Customer tải avatar, multipart field `file`. |
| PUT | `/auth/profile` | Nhân sự tự sửa `{name,phoneNumber,birthday,avatarUrl}`. |
| POST | `/auth/forgot-password`, `/auth/reset-password` | Customer khôi phục mật khẩu bằng email/token dùng một lần. |
| POST | `/auth/refresh` | Làm mới phiên Dashboard khi cơ chế refresh được bật. |
| GET | `/permissions` | Nhân sự có quyền nhận danh mục `{key,label}` có thể cấp. |

**Session user** gồm `id,name,email,role,branchId,avatarUrl,permissions`; `role` thuộc `CUSTOMER|STAFF|MANAGER|ADMIN`. ID phiên ánh xạ tới `cUserId` hoặc `eUserId`. `permissions` do server cấp, gồm dạng `module:read/create/update/delete` và quyền chuyên biệt. Customer không được truy cập API quản trị.

| Vai trò | Quyền nghiệp vụ |
|---|---|
| **Guest** | Đọc nội dung công khai, gửi liên hệ. |
| **CUSTOMER** | Hồ sơ của mình, đặt vé/thanh toán, bình luận, đánh giá, báo cáo nội dung. |
| **STAFF** | Nghiệp vụ được cấp tại chi nhánh, xác nhận/hủy đơn quầy theo quyền, chỉ xem lịch cá nhân. |
| **MANAGER** | Quản lý nghiệp vụ, nhân viên và lịch làm việc trong chi nhánh được phân công, theo permission. |
| **ADMIN** | Quản trị toàn hệ thống theo permission; quản trị chi nhánh, liên hệ và nội dung website. |

Backend xác định chủ thể, chi nhánh và quyền từ phiên; không tin `role`, `branchId`, `userId` hoặc quyền do client tự khai. Dashboard giữ quyền `customers:update` cho khóa/mở khóa và `customers:delete` cho xóa theo quy tắc lưu trữ. Hai thao tác bổ sung dưới đây chỉ dành cho ADMIN với permission tường minh; không tự suy ra từ role hoặc wildcard.

**Hợp đồng bổ sung chưa xác nhận triển khai PHP:** workspace chỉ có hai frontend. `PATCH /customers/:cUserId/profile` yêu cầu `customers:edit-profile`, chỉ nhận `{cName,phoneNumber,sex}`, trả `{success:true,data:Customer}` đã lưu. `POST /customers/:cUserId/password-reset` yêu cầu `customers:reset-password`, nhận `{}`, chỉ trả `{success:true,data:{requested:true}}` khi máy chủ đã tiếp nhận hợp lệ. Chi tiết validation/response tại [Dashboard mục 3.1](../Dashboard/API_CONTRACT.md#31-quản-lý-tài-khoản-khách-hàng). Không cấp quyền mới trên môi trường thật khi backend chưa hỗ trợ.

Cập nhật hồ sơ dùng đúng bản ghi Customer chung; `/auth/me` của Customer đọc lại dữ liệu mới. Không cho đổi email, ID, role, permissions, mật khẩu, điểm/hạng hoặc đơn/vé/thanh toán; `birthday` chưa có schema ghi được xác nhận. Backend phải từ chối trường ngoài allowlist và áp dụng trạng thái khóa cho xác thực/phiên/nghiệp vụ, không thay đổi chủ sở hữu hay lịch sử giao dịch.

Reset do ADMIN yêu cầu phải dùng chung dịch vụ token của `/auth/forgot-password` và `/auth/reset-password`, gửi tới email đã xác minh lấy từ backend, không dùng mật khẩu cố định. Token ngẫu nhiên có hạn, lưu hash, dùng một lần và tiêu thụ nguyên tử; không trả token/hash về Dashboard. Backend phải có rate limiting (`429`, `Retry-After`), audit không chứa bí mật và kiểm tra trạng thái tài khoản. Client chờ tối thiểu 60 giây chỉ là hỗ trợ UX. Mock Mode không gửi email/token; API Mode không có fallback giả thành công. Luồng Customer và cờ `VITE_PASSWORD_RECOVERY` giữ nguyên, chỉ bật sau khi backend xác nhận hỗ trợ.

## 4. API công khai — Customer

| Method | Endpoint | Dữ liệu trả về |
|---|---|---|
| GET | `/public/movies`, `/public/movies/slug/:slug` | Danh sách/chi tiết Movie công khai. |
| GET | `/public/branches`, `/public/branches/:branchId/rooms` | Chi nhánh và phòng công khai. |
| GET | `/public/showtimes?movieId=&branchId=`, `/public/showtimes/:timeId` | Suất chiếu. |
| GET | `/public/showtimes/:timeId/seats` | Ghế của suất, kèm `isBooked` và `holdStatus=FREE|OWN|OTHER`. |
| GET | `/public/products`, `/public/coupons` | Sản phẩm theo `itemType`; voucher hợp lệ và còn lượt. |
| GET | `/public/faq`, `/public/news` | Chỉ nội dung `PUBLISHED`. |
| GET | `/public/movies/:movieId/comments` | Bình luận phim `VISIBLE`. |
| GET | `/public/branches/:branchId/reviews` | Đánh giá cơ sở `VISIBLE`. |
| GET | `/public/site-content` | Sáu nhóm nội dung website công khai. |

Endpoint Customer có yêu cầu đăng nhập (ngoại trừ gửi liên hệ):

| Method | Endpoint | Request / kết quả |
|---|---|---|
| POST | `/movie-comments` | `{movieId,rating,content}` → MovieComment đã lưu. |
| POST | `/cinema-reviews` | `{branchId,roomId,content}` → CinemaReview đã lưu. |
| POST | `/comment-reports` | `{targetType,targetId,reason}` → `{reportId,status:"PENDING",...}`. |
| POST | `/contacts` | **Cho phép Guest**, `{fullName,email,phone,subject,content}` → `{id,received:true}`. |

Các request tạo bình luận/đánh giá/báo cáo không nhận ID tác giả làm nguồn quyền sở hữu; backend lấy từ phiên. Public API không trả thông tin cá nhân của người gửi liên hệ hoặc người báo cáo.

## 5. API quản trị — Dashboard

| Nhóm | Endpoint | Mục đích |
|---|---|---|
| Phim | `GET/POST /movies`; `PUT/DELETE /movies/:movieId` | CRUD phim. |
| Catalog phim | `GET/POST /catalog/genres`, `/catalog/formats`, `/catalog/actors`; `DELETE /catalog/:kind/:name` | Thể loại, định dạng, diễn viên. |
| Chi nhánh | `GET/POST /branches`; `PUT/DELETE /branches/:branchId` | Quản trị chi nhánh (ADMIN). |
| Phòng/ghế | `GET /rooms?branchId=`, `POST /rooms`, `PUT/DELETE /rooms/:branchId/:roomId`; `GET /seats/branches/:branchId/rooms/:roomId`, `POST /seats/branches/:branchId/rooms/:roomId/bulk` | Phòng và sơ đồ ghế; query ghế POS hỗ trợ `?showtimeId=:timeId`. |
| Lịch chiếu | `GET/POST /showtimes`; `PUT/DELETE /showtimes/:timeId` | Suất chiếu và kiểm tra trùng phòng/giờ. |
| Sản phẩm | `GET/POST /food-drinks`, `/merchandise`; `GET/PUT/DELETE /food-drinks/:id`, `/merchandise/:id` | Hai nhóm sản phẩm. |
| Voucher | `GET/POST /coupons`; `PATCH/DELETE /coupons/:couponId` | Phát hành, hiệu lực và số lượng còn lại. |
| Khách hàng | `GET /customers`, `/customers/:cUserId`, `/customers/phone?phone=`; `PATCH .../activate`, `PATCH .../deactivate`; `DELETE /customers/:cUserId` | Xem, khóa/mở khóa, xóa theo quyền. |
| Nhân viên | `GET/POST /employees`; `GET/PUT/DELETE /employees/:eUserId`; `GET /employees/branch/:branchId`; `PATCH .../activate`, `PATCH .../deactivate` | Nhân sự và phân quyền theo chi nhánh. |
| Thống kê | `GET /statistics/overview`, `/statistics/revenue/daily`, `/statistics/revenue/movie`, `/statistics/revenue/branch`, `/statistics/occupancy` | Báo cáo trong phạm vi được cấp. |
| Nội dung | `GET/POST /faq`, `/news`, `/categories`; `PUT/DELETE /faq/:id`, `/news/:id`, `/categories/:id` | FAQ, tin tức và danh mục. |
| Đánh giá/báo cáo | `GET /movie-comments/:commentId`, `/cinema-reviews`, `/comment-reports`; `POST /comment-reports/:reportId/resolve` | Đọc và xử lý nội dung vi phạm. |
| Media | `GET /media`; `POST /files/upload?folderName=movies|products|employees|media` | Chọn/tải ảnh phục vụ biểu mẫu. |
| Liên hệ | `GET /contacts`, `/contacts/:id`; `PATCH /contacts/:id/status`; `DELETE /contacts/:id` | Quản trị liên hệ (ADMIN). |
| Nội dung website | `GET /site-content`; `PUT /site-content/:section` | Chỉnh sửa nội dung công khai (ADMIN). |

Mọi API nội bộ phải kiểm tra permission và phạm vi từng bản ghi. Các danh sách báo cáo/đánh giá/liên hệ dùng query `q`, `status`, `targetType`, `branchId`, `page`, `pageSize` theo tài nguyên; phân trang server trả `meta.total` chính xác.

## 6. Đặt vé, đơn hàng và thanh toán

| Method | Endpoint | Request / kết quả |
|---|---|---|
| POST | `/seat-reservations` | Customer `{timeId,seats:[{sRow,sColumn}]}` (1–8 ghế khác nhau) → `{reservationId,timeId,branchId,roomId,seats,expiresAt}`. |
| GET/DELETE | `/seat-reservations/:reservationId` | Customer xem/hủy giữ ghế của mình. |
| POST | `/customer/orders` | `{reservationId,addons:[{itemType,productId,quantity}],couponId?,idempotencyKey}` → Order đã tính tiền. |
| GET | `/customer/orders`, `/customer/orders/:orderId` | Danh sách/chi tiết đơn thuộc phiên Customer. |
| POST | `/customer/orders/:orderId/payment` | Body `{}` → `{paymentUrl}` HTTPS. |
| GET | `/customer/payments` | Lịch sử thanh toán của Customer. |
| GET/POST | `/orders` | Dashboard xem/tạo đơn tại quầy (POST: `{branchId,customerId?,paymentMethod,couponId?,tickets[],addons[]}`). |
| GET | `/orders/:orderId` | Chi tiết đơn trong phạm vi Dashboard. |
| PUT/DELETE | `/orders/:orderId` | Chỉ thao tác được phép theo nghiệp vụ và permission; không dùng PUT để tự đổi trạng thái thanh toán. |
| POST | `/orders/:orderId/confirm-payment` | Body `{}`, `orders:confirm-payment`, đơn quầy `PENDING→PAID`. |
| POST | `/orders/:orderId/cancel` | Body `{}`, `orders:cancel`, đơn quầy `PENDING→CANCELLED`. |

| Thuộc tính | Quy ước |
|---|---|
| `source` | `STAFF` (tại quầy) hoặc `CUSTOMER` (website), do backend xác định. |
| `orderStatus=PENDING` | Đơn **STAFF** tại quầy, chưa xác nhận thu tiền. |
| `orderStatus=AWAITING_PAYMENT` | Đơn **CUSTOMER** đang chờ thanh toán online. |
| `orderStatus=PAID` | Thanh toán đã được backend xác nhận. |
| `orderStatus=CANCELLED/EXPIRED` | Đơn bị hủy hoặc hết hạn theo quy tắc nghiệp vụ. |

- **Ghế:** Giữ/đặt ghế gắn với `timeId`, chống tranh chấp bằng transaction/lock. Hết hạn hoặc hủy giải phóng giữ ghế, tồn kho/voucher liên quan một cách nhất quán, không xử lý trùng.
- **Giá:** Backend tính lại giá vé từ `Room.basePrice + Seat.sPrice`, cộng sản phẩm, áp voucher; không tin `total`, `price`, `discount`, `status` client gửi.
- **Đơn online:** `idempotencyKey` gắn với khách hàng và payload; gửi lại cùng khóa/payload trả cùng đơn, khác payload trả `409`. Webhook xác minh chữ ký, số tiền, đơn và trạng thái trước khi chuyển `PAID`; redirect chỉ tải lại đơn.
- **Thanh toán:** `paymentStatus` là trạng thái của giao dịch thanh toán, không được tự đồng nhất với `orderStatus`; giao dịch thất bại không tự biến đơn thành `PAID`.
- **Đơn quầy:** Chỉ xác nhận/hủy `PENDING` có `source=STAFF`, cùng chi nhánh và đủ permission. Không sửa `orderStatus` tùy ý bằng PUT; không xác nhận thanh toán online qua API POS. Tạo, xác nhận và hủy xử lý nguyên tử.
- **Snapshot:** `ticketDetails`, `addonDetails` giữ thông tin/giá tại thời điểm giao dịch, không bị thay đổi khi dữ liệu phim hoặc sản phẩm được cập nhật.

## 7. Quy tắc thời gian, sản phẩm và voucher

- **Phim:** `slug` dùng cho URL công khai và phải duy nhất trong phạm vi phim; API quản trị phim sử dụng `movieId` làm khóa.
- **Suất chiếu:** `endDate/endTime` tính theo `runTime` và có thể qua nửa đêm; backend kiểm tra trùng phòng trên khoảng thời gian thực. Trạng thái hiển thị `SCHEDULED`, `ON_AIR`, `FINISHED` suy ra từ ngày giờ.
- **Ghế:** `sStatus` là trạng thái sử dụng của ghế vật lý; `isBooked`/`holdStatus` là trạng thái bán/giữ theo suất chiếu. Ghế đã có vé/đang giữ không thể bị sửa/xóa trái quy tắc.
- **Sản phẩm:** `PREACTIVE` trước ngày bắt đầu, `ACTIVE` trong thời gian bán và còn hàng, `OUT_OF_STOCK` khi hết tồn, `EXPIRED` sau ngày kết thúc. Dữ liệu thiếu hoặc không hợp lệ được xử lý riêng; không dùng nút kích hoạt thủ công.
- **Voucher:** `PREACTIVE` trước `startDate`, `ACTIVE` tới hết `endDate`, `EXPIRED` sau đó. Số lượng hết không đồng nghĩa hết hạn. Không dùng `isActive`/`releaseDate` trong API cập nhật.
- **Phát hành voucher:** `releaseNum` chỉ giữ nguyên hoặc tăng; `availNum` do backend quản lý. Khi tăng `releaseNum`, số lượt đã sử dụng không đổi: `newAvailNum = oldAvailNum + (newReleaseNum - oldReleaseNum)`. Không cho client chỉnh trực tiếp `availNum`.

## 8. Bình luận, đánh giá và báo cáo vi phạm

- **MOVIE_COMMENT:** gắn `movieId`, `rating` nguyên 1–5; nội dung tùy chọn. **CINEMA_REVIEW:** gắn `branchId`, `roomId` tùy chọn, nội dung văn bản; không gán rating phim.
- **CONTENT_REPORT:** `targetType=MOVIE_COMMENT|CINEMA_REVIEW`; tạo báo cáo ở trạng thái `PENDING` không tự ẩn hoặc xóa nội dung.
- **Xử lý:** `POST /comment-reports/:reportId/resolve` nhận `{action:"DISMISS"}` (giữ nội dung) hoặc `{action:"DELETE"}` (xóa nội dung); cả hai cập nhật `PENDING→RESOLVED` và ghi `resolutionAction` trong cùng giao dịch. Kiểm tra quyền `comment-reports:update/delete`, phạm vi và chống xử lý hai lần.
- Chỉ công khai nội dung có `contentStatus=VISIBLE`. MANAGER chỉ truy cập đánh giá chi nhánh được phép; báo cáo bình luận phim được cấp quyền theo module riêng.

## 9. Liên hệ và nội dung website

FAQ và News có trạng thái `DRAFT|PUBLISHED|HIDDEN`; chỉ dữ liệu `PUBLISHED` được trả qua public API.

**Contact:** `id,fullName,email,phone,subject,content,status,createdAt,readAt?,repliedAt?,repliedBy?`. Liên hệ mới có trạng thái `UNREAD`; ADMIN có thể chuyển `READ` hoặc `REPLIED`. Việc xem chi tiết không tự đổi trạng thái; `REPLIED` chỉ xác nhận đã phản hồi, không có nghĩa hệ thống tự gửi email.

**SiteContent** gồm sáu section; giá trị là văn bản thuần hoặc URL an toàn:

| Section | Trường |
|---|---|
| `global` | `companyName,tagline,logoUrl,contactEmail,hotline,address,facebookUrl` |
| `home` | `headline,subheadline,heroImageUrl` |
| `about` | `title,introduction,vision,mission,values` |
| `services` | `title,introduction` |
| `pricing` | `title,introduction,disclaimer` |
| `contact` | `title,introduction,workingHours,mapUrl` |

Dashboard cập nhật một section qua `PUT /site-content/:section` mà không ghi đè section khác. Customer chỉ đọc `GET /public/site-content`; phần `pricing` là nội dung giới thiệu, không thay nguồn tính giá vé.

## 10. Lịch làm việc

| Method | Endpoint | Quyền |
|---|---|---|
| GET | `/work-schedules/me?startDate=&endDate=` | STAFF xem lịch chính mình (`workshifts:read-own`). |
| GET | `/work-schedules?startDate=&endDate=&branchId=&employeeId=` | MANAGER trong chi nhánh, ADMIN toàn hệ thống (`workshifts:read`). |
| POST | `/work-schedules` | `workshifts:create`. |
| PUT | `/work-schedules/:scheduleId` | `workshifts:update`. |
| DELETE | `/work-schedules/:scheduleId` | `workshifts:delete`. |

Phân công có `workDate,endDate,startTime,endTime`, hỗ trợ qua đêm, tối đa 24 giờ. Truy vấn theo khoảng tối đa 63 ngày, tính cả ca giao với khoảng lọc. Backend xác minh nhân viên thuộc chi nhánh và không trùng lịch của chính nhân viên. STAFF không có quyền tải lịch nhân sự khác hoặc thay đổi phân công.

## 11. Validation và bảo mật

- **Mật khẩu:** tối thiểu 10 ký tự khi đổi; khôi phục mật khẩu sử dụng token có hạn và dùng một lần; giới hạn tần suất.
- **Nội dung:** bình luận/đánh giá tối đa 2.000 ký tự; lý do báo cáo tối đa 1.000 ký tự. Nội dung hiển thị là văn bản thuần, được escape, không thực thi HTML.
- **Liên hệ:** `fullName` tối đa 100 ký tự, `email` tối đa 200, `subject` tối đa 150, `content` tối đa 5.000; số điện thoại bắt buộc 8–15 chữ số, có thể có `+` đầu chuỗi.
- **Upload:** multipart field `file`, tối đa 5 MB, JPG/PNG/WebP; backend kiểm tra MIME, re-encode, tên ngẫu nhiên, chỉ cho phép đường dẫn lưu trữ hợp lệ, không thực thi file upload.
- **Kiểm tra phía server:** xác minh session, CSRF, RBAC, ownership, branch scope, ID/foreign key, ngày giờ và enum; chống IDOR, thao tác trùng, xung đột ghi và truy cập chéo phạm vi. `409` cho xung đột, `422` cho dữ liệu sai, `429` cho quá nhiều yêu cầu. Không trả thông tin bí mật trong response.

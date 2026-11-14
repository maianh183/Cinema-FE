# API Contract — Internal Dashboard

Tài liệu đặc tả API cho **CMS Cinema Dashboard** (ADMIN, MANAGER, STAFF). Các endpoint bên dưới tính tương đối với `VITE_API_BASE_URL`. Quy ước dữ liệu dùng chung với Customer được mô tả tại [`../docs/SHARED_API_CONTRACT.md`](../docs/SHARED_API_CONTRACT.md).

## 1. Quy ước chung

- **Giao tiếp:** HTTPS, JSON, Axios (`withCredentials: true`); upload ảnh bằng `multipart/form-data`, field `file`. Không đặt khóa bí mật trong biến môi trường `VITE_*`.
- **Xác thực:** Session cookie `HttpOnly`, `Secure`, `SameSite`; mutation gửi `X-CSRF-Token` lấy từ phiên hoặc `GET /auth/csrf`. CORS chỉ cho phép origin hợp lệ; không lưu token trong `localStorage`.
- **Response:** Thành công `{ "success": true, "data": ... }`; lỗi `{ "success": false, "message": "...", "errors": { "field": ["..."] } }` (`errors` không bắt buộc). Mã lỗi: `400`, `401`, `403`, `404`, `409`, `413`, `422`, `429`, `500`.
- **Danh sách:** Các API có phân trang dùng `data: [...]` và `meta: {total,page,pageSize}`; có thể dùng `data: {items,total}` theo service tương ứng. API danh sách đầy đủ không được âm thầm trả dữ liệu đã cắt trang. `page` bắt đầu từ 1; filter áp dụng trước khi tính `total`.
- **Định danh:** `movieId`, `timeId`, `branchId`, `roomId`, `productId`, `couponId`, `orderId`, `scheduleId`, `commentId`, `reviewId`, `reportId` là số nguyên dương; `eUserId`, `cUserId` là chuỗi. Phòng được định danh theo cặp `(branchId, roomId)`; `showtimeId` trong vé tham chiếu `timeId`.
- **Ngày giờ:** Ngày lịch kinh doanh theo `Asia/Ho_Chi_Minh`; timestamp có offset hoặc `Z`. Các khoảng thời gian được kiểm tra bằng thời điểm bắt đầu/kết thúc đầy đủ, kể cả khi qua nửa đêm.
- **Bảo mật:** Backend kiểm tra quyền và phạm vi từng bản ghi, validate dữ liệu, chống truy cập chéo chi nhánh và xử lý cập nhật đồng thời trong transaction. Không trả password, SQL, stack trace hoặc dữ liệu nhạy cảm không cần thiết.

## 2. Xác thực và phân quyền

| Method | Endpoint | Request / `data` |
|---|---|---|
| GET | `/auth/csrf` | `{csrfToken}`. |
| POST | `/auth/login` | `{provider:"LOCAL",email,password}` → `{user,csrfToken}` và session cookie. |
| GET | `/auth/me` | Thông tin nhân viên, vai trò, chi nhánh, permissions và CSRF. |
| POST | `/auth/logout` | Hủy phiên đăng nhập. |
| POST | `/auth/refresh` | Làm mới phiên khi cơ chế refresh được bật (`VITE_AUTH_REFRESH=true`). |
| PUT | `/auth/profile` | `{name,phoneNumber,birthday,avatarUrl}` → hồ sơ đã lưu. |
| POST | `/auth/change-password` | `{oldPassword,newPassword}` → xác nhận thay đổi. |
| GET | `/permissions` | `[{key,label}]` — danh mục quyền mà người gọi được phép cấp. |

**User tối thiểu:** `id`, `name`, `email`, `role`, `branchId`, `avatarUrl`, `permissions`; `role` chỉ nhận `ADMIN`, `MANAGER`, `STAFF` (có thể chuẩn hóa tiền tố `ROLE_`). Quyền dạng `module:read/create/update/delete` và các quyền chuyên biệt như `employees:assign-role`, `orders:confirm-payment`, `orders:cancel`, `workshifts:read-own`. Quyền phải được cấp từ server, không suy ra chỉ từ tên vai trò.

| Vai trò | Phạm vi truy cập |
|---|---|
| **ADMIN** | Quản lý toàn hệ thống theo các permission được cấp; quản trị chi nhánh, liên hệ và nội dung website. |
| **MANAGER** | Quản lý nghiệp vụ, nhân sự và lịch làm việc trong chi nhánh phụ trách theo permission. |
| **STAFF** | Nghiệp vụ được phân quyền tại chi nhánh; chỉ xem lịch cá nhân và xử lý đơn theo quyền. |

Phiên CUSTOMER không được truy cập Dashboard. Backend xác định `branchId` và chủ thể từ session; không tin giá trị quyền hoặc chi nhánh do client tự gửi. Các API tra cứu phục vụ biểu mẫu/POS chỉ trả trường và dữ liệu thuộc phạm vi cho phép.

## 3. API quản trị nghiệp vụ

| Nhóm | Method & endpoint | Dữ liệu chính |
|---|---|---|
| **Phim** | `GET/POST /movies`; `PUT/DELETE /movies/:movieId` | `movieId,mName,descript,runTime,isDub,isSub,releaseDate,closingDate,ageRating,posterUrl,trailerUrl,genreIds[],formatIds[],actorIds[]` |
| **Danh mục phim** | `GET/POST /catalog/genres`, `/catalog/formats`, `/catalog/actors`; `DELETE /catalog/:kind/:name` | `genre`, `fName`, `fullName` theo nhóm. |
| **Lịch chiếu** | `GET/POST /showtimes`; `PUT/DELETE /showtimes/:timeId` | `timeId,movieId,branchId,roomId,formatName,day,startTime,endDate,endTime`. |
| **Chi nhánh** | `GET/POST /branches`; `PUT/DELETE /branches/:branchId` | `branchId,bName,bAddress,managerId,phoneNumbers[],isActive`; quản trị chỉ ADMIN. |
| **Phòng** | `GET /rooms?branchId=`; `POST /rooms`; `PUT/DELETE /rooms/:branchId/:roomId` | `branchId,roomId,rType,rCapacity,basePrice`. |
| **Ghế** | `GET /seats/branches/:branchId/rooms/:roomId`; `POST /seats/branches/:branchId/rooms/:roomId/bulk` | `sRow,sColumn,sType,sPrice,sStatus`; truy vấn ghế POS hỗ trợ `?showtimeId=:timeId`. |
| **Đồ ăn/uống** | `GET/POST /food-drinks`; `GET/PUT/DELETE /food-drinks/:id` | `productId,pName,pType,price,quantity,imgUrl,startDate,endDate,description`. |
| **Hàng lưu niệm** | `GET/POST /merchandise`; `GET/PUT/DELETE /merchandise/:id` | `productId,merchName,price,availNum,imgUrl,startDate,endDate,description`. |
| **Voucher** | `GET/POST /coupons`; `PATCH/DELETE /coupons/:couponId` | `couponId,startDate,endDate,saleOff,releaseNum,availNum,minOrderTotal,maxDiscount`. |
| **Khách hàng** | `GET /customers`; `GET /customers/:cUserId`; `GET /customers/phone?phone=`; `PATCH /customers/:cUserId/activate`, `/deactivate`; `DELETE /customers/:cUserId` | `cUserId,cName,email,phoneNumber,sex,isActive` và thông tin được phép xem. |
| **Nhân viên** | `GET/POST /employees`; `GET/PUT/DELETE /employees/:eUserId`; `GET /employees/branch/:branchId`; `PATCH /employees/:eUserId/activate`, `/deactivate` | `eUserId,eName,email,phoneNumber,sex,userType,branchId,salary,avatarUrl,permissions[]`; `ePassword` chỉ lúc tạo mới. |
| **Đơn hàng/POS** | `GET/POST /orders`; `GET/PUT/DELETE /orders/:orderId` | `orderId,source,createdByEmployeeId,branchId,customerId?,paymentMethod,couponId?,tickets[],addons[],orderStatus,total`. |
| **Thống kê** | `GET /statistics/overview`, `/statistics/revenue/daily`, `/statistics/revenue/movie`, `/statistics/revenue/branch`, `/statistics/occupancy` | Query `startDate,endDate,branchId` theo báo cáo; overview có `totalMovies,totalEmployees,totalShowtimes,totalOrders`. |

**Quy tắc dữ liệu:**

- Suất chiếu kết thúc theo `runTime`, gồm `endDate/endTime`; kiểm tra trùng phòng trên khoảng thời gian thực, kể cả qua ngày. Trạng thái hiển thị `SCHEDULED`, `ON_AIR`, `FINISHED` được suy ra từ thời gian.
- Ghế `sType=1` là thường, `sType=2` là VIP; `sStatus` thể hiện khả năng sử dụng. `isBooked` phụ thuộc **suất chiếu**, không phải trạng thái chung của ghế vật lý. Lưu sơ đồ ghế hàng loạt phải nguyên tử và không làm hỏng ghế đã có vé/đang giữ.
- Sản phẩm có trạng thái theo ngày bán và tồn kho: `PREACTIVE`, `ACTIVE`, `OUT_OF_STOCK`, `EXPIRED` (dữ liệu thiếu/sai được xử lý riêng). Giá và tồn kho do backend xác thực khi tạo đơn.
- Voucher dùng `startDate/endDate`, tự xác định `PREACTIVE`, `ACTIVE`, `EXPIRED`; không dùng `isActive` hay `releaseDate`. `releaseNum` chỉ được tăng hoặc giữ nguyên; `availNum` do server tính, không gửi khi sửa. Khi tăng lượng phát hành, số đã dùng phải được bảo toàn. `maxDiscount=0` nghĩa là không giới hạn mức giảm tối đa.
- `customers:update` chỉ dùng cho khóa/mở khóa tài khoản; chỉnh sửa hồ sơ và yêu cầu khôi phục mật khẩu dùng quyền riêng tại mục 3.1. Xóa khách hàng phải tôn trọng lịch sử giao dịch. MANAGER chỉ có thể quản lý STAFF trong chi nhánh của mình, không nâng quyền vượt phạm vi được cấp.

### 3.1. Quản lý tài khoản khách hàng

**Trạng thái:** Frontend đã tích hợp; workspace không có backend PHP để xác nhận hai endpoint dưới đây đã được triển khai. Đây là hợp đồng cần backend bổ sung, không phải xác nhận khả năng API hiện tại. Không cấp permission tương ứng trong môi trường thật trước khi backend sẵn sàng. Mock Mode chỉ mô phỏng, không gửi email hoặc tạo token.

| Method | Endpoint | Permission và request / response |
|---|---|---|
| PATCH | `/customers/:cUserId/profile` | ADMIN có `customers:edit-profile`; `{cName,phoneNumber,sex}` → `{success:true,data:Customer}` đã lưu. |
| POST | `/customers/:cUserId/password-reset` | ADMIN có `customers:reset-password`; `{}` → `{success:true,data:{requested:true}}` sau khi máy chủ tiếp nhận hợp lệ. |

- Hai permission mới phải xuất hiện tường minh trong danh sách do server cấp; frontend không suy ra từ role ADMIN, `*`, `customers:*` hoặc `customers:update`. `customers:read`, `customers:update`, `customers:delete` giữ ý nghĩa cũ. UI và service kiểm tra quyền; backend bắt buộc kiểm tra lại từ phiên, không tin body/header tự khai.
- Hồ sơ chỉ nhận ba trường trên: `cName` sau trim dài 1–100, `phoneNumber` 8–15 chữ số và tùy chọn dấu `+`, `sex=M|F`. Từ chối mọi khóa ngoài allowlist (`email`, ID, role, permissions, password, điểm/hạng, dữ liệu giao dịch...). `birthday` chưa được schema PHP xác nhận nên chỉ đọc nếu có trong response.
- Response hồ sơ phải xác nhận đúng `cUserId`, gồm `cName,phoneNumber,sex,email` và các trường hiển thị được phép (`isActive,membershipTier,totalPoints,createdAt,updatedAt,birthday`). Không trả password/hash, token hoặc audit nội bộ. Cập nhật đúng bản ghi Customer chung; lần đọc `/auth/me` tiếp theo của Customer phải phản ánh hồ sơ mới, không đổi email, chủ sở hữu hoặc lịch sử đơn/vé/thanh toán.
- Reset dùng **cùng dịch vụ khôi phục hiện có** với `/auth/forgot-password`, `/auth/reset-password` và trang Customer `/reset-password?token=...`. Backend chọn email đã xác minh từ bản ghi, không lấy email hay mật khẩu từ body. Token ngẫu nhiên dùng một lần, có hạn, lưu hash; tiêu thụ nguyên tử và vô hiệu hóa sau sử dụng. Không tạo hệ thống token thứ hai; không trả token về Dashboard và không đổi mật khẩu khi mới gửi yêu cầu. Chỉ bật `VITE_PASSWORD_RECOVERY=true` ở Customer sau khi luồng này hoạt động.
- Backend cần rate limiting theo người thao tác/tài khoản đích/IP, `429` kèm `Retry-After`, audit actor/target/action/time/result không chứa bí mật, kiểm tra trạng thái khóa/email xác minh (`409` nếu không đủ điều kiện) và xác nhận hàng đợi gửi thư đã tiếp nhận trước `requested:true`. Client chặn request đồng thời và chờ tối thiểu 60 giây giữa các lần gửi, tôn trọng `Retry-After`; đây không thay thế giới hạn phía server.
- `400/422`: request/validation; `401`: hết phiên; `403`: thiếu quyền; `404`: không có tài khoản/endpoint; `409`: xung đột; `429`: giới hạn tần suất; `500/network`: lỗi máy chủ/kết nối. Form giữ bản nháp khi lỗi hoặc response không hợp lệ; không báo thành công khi thiếu xác nhận. Tài khoản bị khóa phải bị backend chặn cả phiên đang tồn tại và các nghiệp vụ yêu cầu xác thực; yêu cầu reset không tự mở khóa.

## 4. Đơn hàng và thanh toán tại quầy

| Method | Endpoint | Request / `data` |
|---|---|---|
| GET | `/orders` | Đơn hàng trong phạm vi truy cập, bao gồm `source`, `orderStatus`, tổng tiền, vé, sản phẩm và thông tin thanh toán. |
| POST | `/orders` | `{branchId,customerId?,paymentMethod,couponId?,tickets[],addons[]}` → Order tại quầy với `source="STAFF"`, `orderStatus="PENDING"`. |
| GET | `/orders/:orderId` | Chi tiết Order và trạng thái hiện tại. |
| POST | `/orders/:orderId/confirm-payment` | Body `{}` → Order `PAID`, `paidAt`, `confirmedBy`; yêu cầu `orders:confirm-payment`. |
| POST | `/orders/:orderId/cancel` | Body `{}` → Order `CANCELLED`, `cancelledAt`, `cancelledBy`; yêu cầu `orders:cancel`. |

- **Nguồn đơn:** `STAFF` (tại quầy), `CUSTOMER` (online). `PENDING` là đơn quầy chờ thanh toán; `AWAITING_PAYMENT` là đơn online chờ thanh toán; `PAID` là đã xác nhận; có thể có `CANCELLED` và `EXPIRED`. Không đồng nhất `PENDING` với `AWAITING_PAYMENT`.
- **Xác nhận/hủy tại quầy:** Chỉ áp dụng `source=STAFF`, `orderStatus=PENDING`, đúng chi nhánh và có permission. Không dùng `PUT /orders/:id` để tự gán `orderStatus`. Không xác nhận/hủy đơn online bằng hai API này.
- **Tính tiền:** Giá vé = `Room.basePrice + Seat.sPrice`; cộng sản phẩm, áp dụng voucher theo quy tắc. Backend xác thực khách, suất, ghế, giá, tồn kho và chống bán trùng; `addons` phân biệt `itemType=FOOD_DRINK|MERCHANDISE` cùng `productId`.
- **Giao dịch:** Tạo đơn/giữ ghế/xác nhận/hủy và giải phóng tài nguyên phải nhất quán, chống thực thi hai lần. Đơn online chỉ chuyển `PAID` sau khi xác thực thanh toán phía server; không lấy redirect hoặc trạng thái client làm bằng chứng thanh toán.

## 5. Lịch làm việc

| Method | Endpoint | Quyền / dữ liệu |
|---|---|---|
| GET | `/work-schedules/me?startDate=&endDate=` | STAFF xem lịch của chính mình (`workshifts:read-own`). |
| GET | `/work-schedules?startDate=&endDate=&branchId=&employeeId=` | MANAGER xem lịch chi nhánh phụ trách; ADMIN xem toàn hệ thống (`workshifts:read`). |
| POST | `/work-schedules` | Tạo phân công (`workshifts:create`). |
| PUT | `/work-schedules/:scheduleId` | Sửa phân công (`workshifts:update`). |
| DELETE | `/work-schedules/:scheduleId` | Xóa/hủy phân công (`workshifts:delete`). |

**WorkSchedule:** `scheduleId`, `employeeId`, `branchId`, `workDate`, `endDate`, `startTime`, `endTime`, `work`, `position`; response có thể kèm `employeeName`, `branchName`, `status`. Ca qua đêm dùng `endDate` ngày kế tiếp; thời lượng tối đa 24 giờ. Khoảng lọc gồm hai ngày biên, tối đa 63 ngày, trả các ca giao với khoảng tìm kiếm. Backend kiểm tra nhân viên thuộc chi nhánh và không có lịch trùng của cùng nhân viên; hai ca liền nhau được phép. STAFF không được gọi API roster hoặc mutation.

## 6. FAQ, tin tức, đánh giá và báo cáo nội dung

| Method | Endpoint | Dữ liệu chính |
|---|---|---|
| GET/POST | `/faq` | `id,question,answer,sortOrder,status`. |
| PUT/DELETE | `/faq/:id` | Cập nhật/xóa FAQ. |
| GET/POST | `/news` | `id,title,slug,seoTitle,metaDescription,tags,content,category,imageUrl,status,createdAt`. |
| PUT/DELETE | `/news/:id` | Cập nhật/xóa tin tức. |
| GET/POST | `/categories` | `id,name,slug,type=NEWS|PRODUCT`; hỗ trợ `?type=`. |
| PUT/DELETE | `/categories/:id` | Cập nhật/xóa danh mục. |
| GET | `/movie-comments/:commentId` | `commentId,movieId,movieTitle,userId,authorName,rating,content,createdAt,contentStatus`. |
| GET | `/cinema-reviews?q=&branchId=&roomId=&page=&pageSize=` | CinemaReview theo phạm vi; `reviewId,branchId,branchName,roomId,userId,authorName,content,createdAt,contentStatus`. |
| GET | `/comment-reports?q=&status=&targetType=&page=&pageSize=` | Báo cáo nội dung; `reportId,targetType,targetId,reason,reportedAt,status,resolutionAction` và dữ liệu target. |
| POST | `/comment-reports/:reportId/resolve` | `{action:"DISMISS"|"DELETE"}` → report `RESOLVED`, `resolutionAction`, `resolvedAt`, `resolvedBy`. |

- FAQ/News có `DRAFT`, `PUBLISHED`, `HIDDEN`; Customer chỉ nhận `PUBLISHED`. Nội dung là văn bản thuần, không thực thi HTML; `slug` duy nhất theo loại tài nguyên.
- **MOVIE_COMMENT:** gắn `movieId`, `rating` là số nguyên 1–5, `content` có thể rỗng/null. **CINEMA_REVIEW:** gắn `branchId`, `roomId` tùy chọn, không dùng rating phim; MANAGER chỉ xem đánh giá trong chi nhánh được phép.
- **CONTENT_REPORT:** `targetType=MOVIE_COMMENT|CINEMA_REVIEW`; `reportId` khác `targetId`. `DISMISS` giữ nội dung, `DELETE` xóa nội dung vi phạm; cả hai chuyển `PENDING → RESOLVED` trong transaction. Không có duyệt/ẩn bình luận thủ công. Quyền `comment-reports:update` cho DISMISS và `comment-reports:delete` cho DELETE; chống xử lý lặp.

## 7. Quản trị liên hệ và nội dung website

| Method | Endpoint | Request / `data` |
|---|---|---|
| GET | `/contacts?q=&status=&page=&pageSize=` | Danh sách liên hệ và `meta` phân trang; chỉ ADMIN có `contacts:read`. |
| GET | `/contacts/:id` | Chi tiết liên hệ. |
| PATCH | `/contacts/:id/status` | `{status:"UNREAD"|"READ"|"REPLIED"}` → liên hệ đã lưu; `contacts:update`. |
| DELETE | `/contacts/:id` | Xóa liên hệ; `contacts:delete`. |
| GET | `/site-content` | Toàn bộ nội dung biên tập; `website-content:read`, ADMIN. |
| PUT | `/site-content/:section` | Object đầy đủ của section → section đã lưu; `website-content:update`, ADMIN. |

**Contact:** `id,fullName,email,phone,subject,content,status,createdAt,readAt?,repliedAt?,repliedBy?`. Chỉ có `UNREAD`, `READ`, `REPLIED`; đọc chi tiết không tự đổi trạng thái. `REPLIED` là ghi nhận đã phản hồi, không đồng nghĩa hệ thống gửi email. Danh sách sắp xếp mới nhất trước, lọc trước phân trang.

**SiteContent** gồm sáu section; giá trị là chuỗi văn bản hoặc URL an toàn:

| Section | Trường |
|---|---|
| `global` | `companyName`, `tagline`, `logoUrl`, `contactEmail`, `hotline`, `address`, `facebookUrl` |
| `home` | `headline`, `subheadline`, `heroImageUrl` |
| `about` | `title`, `introduction`, `vision`, `mission`, `values` |
| `services` | `title`, `introduction` |
| `pricing` | `title`, `introduction`, `disclaimer` |
| `contact` | `title`, `introduction`, `workingHours`, `mapUrl` |

Cập nhật một section không ghi đè section khác. API công khai tương ứng là `GET /public/site-content`; liên hệ do Customer gửi qua `POST /contacts`. Nội dung website không được thay thế dữ liệu giá vé, phòng hoặc suất chiếu.

## 8. Media và các yêu cầu an toàn

| Method | Endpoint | Dữ liệu |
|---|---|---|
| GET | `/media` | Danh sách ảnh dùng trong bộ chọn của các form: `id,name,url,mimeType,size,createdAt`. |
| POST | `/files/upload?folderName=movies|products|employees|media` | Multipart field `file` → `{id,name,url,mimeType,size,createdAt}`. |

- Upload chỉ nhận JPG/PNG/WebP, tối đa 5 MB; server xác minh MIME thực, tạo tên ngẫu nhiên, xử lý ảnh an toàn và chỉ trả URL được phép. `folderName` phải là một giá trị được server cho phép.
- Không trả dữ liệu nội bộ (lương, quyền nhân sự, dữ liệu báo cáo liên hệ) qua public API. Kiểm tra CSRF, owner, branch scope và permission ở server đối với mọi mutation, kể cả upload và thay đổi trạng thái.
- Dữ liệu liên quan thanh toán, tồn kho, voucher, phân ca và xử lý báo cáo phải được cập nhật nguyên tử; xung đột trả `409`, sai dữ liệu trả `422`, thiếu quyền trả `403`.

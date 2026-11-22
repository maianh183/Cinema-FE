# API Contract — Customer Frontend

Tài liệu đặc tả API dành cho giao diện khách hàng của **CMS Cinema**. Các endpoint bên dưới được tính tương đối với `VITE_API_BASE_URL` (mặc định `/api`). Quy ước chung giữa Customer, Dashboard và Backend được quản lý tại [`../docs/SHARED_API_CONTRACT.md`](../docs/SHARED_API_CONTRACT.md).

## 1. Quy ước chung

- **Giao tiếp:** HTTPS, JSON, Axios (`withCredentials: true`, timeout 15 giây). Xác thực bằng session cookie `HttpOnly`, `Secure`, `SameSite`; CORS chỉ cho phép origin được cấu hình và credentials.
- **CSRF:** Các yêu cầu thay đổi dữ liệu gửi `X-CSRF-Token`, lấy qua `GET /auth/csrf` hoặc dữ liệu phiên. Không lưu token xác thực trong `localStorage`; HTTP `401` yêu cầu đăng nhập lại.
- **Thành công:** `{ "success": true, "data": ... }`. **Thất bại:** `{ "success": false, "message": "...", "errors": { "field": ["..."] } }` (`errors` không bắt buộc). Các mã lỗi thường dùng: `400`, `401`, `403`, `404`, `409`, `413`, `422`, `429`, `500`.
- **Danh sách:** `data` chứa toàn bộ mảng để Customer lọc/phân trang phía client; có thể nhận dạng `{items, total}` nếu `total` bằng số bản ghi thực nhận. Không âm thầm hiển thị danh sách bị cắt trang.
- **Định danh:** `movieId`, `branchId`, `roomId`, `timeId`, `productId`, `couponId`, `commentId`, `reviewId`, `reportId`, `orderId` là số nguyên dương; `cUserId` là chuỗi. Phòng được xác định theo cặp `(branchId, roomId)`; `showtimeId` trong chi tiết vé tham chiếu `timeId`.
- **Thời gian:** Timestamp có offset hoặc `Z`; ngày bắt đầu/kết thúc theo múi giờ Việt Nam (`UTC+07:00`), lần lượt từ `00:00:00` đến hết `23:59:59.999`.
- **Quyền:** API công khai không yêu cầu đăng nhập; các API tài khoản, bình luận, đánh giá, báo cáo, giữ ghế và đơn hàng yêu cầu phiên **CUSTOMER** hợp lệ, trừ khi được chỉ rõ khác đi. Backend kiểm tra quyền sở hữu, khóa ngoại và dữ liệu đầu vào.

## 2. Mô hình dữ liệu chính

| Đối tượng | Trường dữ liệu / quy tắc |
|---|---|
| **Customer** | `cUserId`, `cName`, `email`, `phoneNumber`, `sex`, `avatarUrl`; giao diện có thể ánh xạ sang `userId`, `fullName`, `phone`, `gender`. `birthday`/`dob` chỉ đọc nếu được trả về. |
| **Movie** | `movieId`, `mName`, `slug`, `descript`, `runTime`, `releaseDate`, `closingDate`, `ageRating`, `posterUrl`, `trailerUrl`, `genres`, `actors`, `formats`. |
| **Branch** | `branchId`, `bName`, `bAddress`, `phoneNumbers`, `totalRooms`. |
| **Room** | `branchId`, `roomId`, `rType`, `rCapacity`, `basePrice`, `totalSeats`. |
| **Showtime** | `timeId`, `movieId`, `branchId`, `roomId`, `day`, `startTime`, `endDate`, `endTime`, `rPrice`, `formatName`. |
| **Seat** | `branchId`, `roomId`, `sRow`, `sColumn`, `sType`, `sPrice`, `sStatus`; `sType=1` là thường, `sType=2` là VIP. Trạng thái đặt/giữ ghế gắn với `timeId`. |
| **Food & Drink** | `itemType="FOOD_DRINK"`, `productId`, `pName`, `pType`, `price`, `quantity`, `imgUrl`, `startDate`, `endDate`, `description`. |
| **Merchandise** | `itemType="MERCHANDISE"`, `productId`, `merchName`, `price`, `availNum`, `imgUrl`, `startDate`, `endDate`, `description`. |
| **Coupon** | `couponId`, `startDate`, `endDate`, `saleOff`, `releaseNum`, `availNum`, `minOrderTotal`, `maxDiscount`; `maxDiscount=0` nghĩa là không giới hạn. |
| **MovieComment** | `commentId`, `movieId`, `movieTitle`, `userId`, `authorName`, `rating` (nguyên 1–5), `content` (có thể `null`), `createdAt`, `contentStatus`. |
| **CinemaReview** | `reviewId`, `branchId`, `branchName`, `roomId` (có thể `null`), `userId`, `authorName`, `content`, `createdAt`, `contentStatus`; không có rating phim. |
| **ContentReport** | `reportId`, `targetType` (`MOVIE_COMMENT`/`CINEMA_REVIEW`), `targetId`, `reason`, `reportedAt`, `status`, `resolutionAction`. |
| **Order** | `orderId`, `source`, `branchId`, `orderStatus`, `orderTime`, `total`, `originalTotal`, `discountAmount`, `ticketDetails`, `addonDetails`. |
| **Payment** | `paymentId`, `orderId`, `amount`, `paymentMethod`, `paymentStatus`, `paymentTime`, `transactionId` (nếu có). |

Giữ riêng `MOVIE_COMMENT` và `CINEMA_REVIEW`; chỉ hiển thị nội dung `VISIBLE`. Tin tức và FAQ công khai chỉ gồm nội dung `PUBLISHED`. Khóa sản phẩm trong giỏ hàng là `(itemType, productId)`.

## 3. API công khai

| Method | Endpoint | `data` / mục đích |
|---|---|---|
| GET | `/public/movies` | Danh sách Movie công khai. |
| GET | `/public/movies/slug/:slug` | Chi tiết Movie theo slug; không tồn tại/không công khai trả `404`. |
| GET | `/public/branches` | Danh sách Branch công khai. |
| GET | `/public/branches/:branchId/rooms` | Room thuộc chi nhánh. |
| GET | `/public/showtimes?movieId=&branchId=` | Danh sách Showtime theo bộ lọc. |
| GET | `/public/showtimes/:timeId` | Chi tiết Showtime và định danh chi nhánh/phòng tương ứng. |
| GET | `/public/showtimes/:timeId/seats` | Danh sách Seat với `isBooked` và `holdStatus: FREE\|OWN\|OTHER`. |
| GET | `/public/products` | Danh sách Food & Drink và Merchandise phân biệt bằng `itemType`. |
| GET | `/public/coupons` | Coupon đang hợp lệ và còn lượt áp dụng. |
| GET | `/public/faq` | FAQ: `id`, `question`, `answer`, `sortOrder`, `status=PUBLISHED`. |
| GET | `/public/news` | News: `id`, `title`, `slug`, `seoTitle`, `metaDescription`, `tags`, `content`, `category`, `imageUrl`, `status=PUBLISHED`, `createdAt`. |
| GET | `/public/movies/:movieId/comments` | MovieComment `VISIBLE` theo phim. |
| GET | `/public/branches/:branchId/reviews` | CinemaReview `VISIBLE` theo chi nhánh. |
| GET | `/public/site-content` | Nội dung công khai của website theo sáu nhóm tại mục 6. |

Response công khai chỉ chứa dữ liệu cần hiển thị, không trả email người bình luận, lương, thông tin nhân sự, quyền quản trị hoặc dữ liệu audit nội bộ.

## 4. Tài khoản, liên hệ và tương tác

| Method | Endpoint | Request | `data` khi thành công |
|---|---|---|---|
| GET | `/auth/csrf` | — | `{csrfToken}` |
| GET | `/auth/me` | Session cookie | Hồ sơ người dùng và thông tin phiên, `role=CUSTOMER` |
| POST | `/auth/login` | `{email,password,provider:"LOCAL"}` | `{user,csrfToken}`; tạo session cookie |
| POST | `/auth/register` | `{cName,email,password,phoneNumber,sex}` | Hồ sơ Customer và session |
| POST | `/auth/logout` | `{}` | `{loggedOut:true}`; hủy phiên |
| PUT | `/customers/me` | `{cName,phoneNumber,sex}` | Hồ sơ đã cập nhật |
| POST | `/customers/me/avatar` | Multipart, field `file` | Hồ sơ chứa `avatarUrl` |
| POST | `/auth/change-password` | `{oldPassword,newPassword}` | `{changed:true}` |
| POST | `/auth/forgot-password` | `{email}` | Thông báo trung lập |
| POST | `/auth/reset-password` | `{token,newPassword}` | `{changed:true}` |
| POST | `/contacts` | `{fullName,email,phone,subject,content}` | `{id,received:true}`; cho phép Guest |
| POST | `/movie-comments` | `{movieId,rating,content}` | MovieComment đã lưu |
| POST | `/cinema-reviews` | `{branchId,roomId,content}` | CinemaReview đã lưu |
| POST | `/comment-reports` | `{targetType,targetId,reason}` | `{reportId,status:"PENDING",...}` |

- `content` của MovieComment có thể `null`; `roomId` của CinemaReview có thể `null`. `rating` là số nguyên từ 1 đến 5.
- Backend xác định tác giả/người báo cáo từ session, không lấy `userId`, `reporterId`, `authorName` trong request làm căn cứ quyền sở hữu.
- Báo cáo nội dung dùng trạng thái `PENDING`/`RESOLVED`; thao tác `DISMISS` hoặc `DELETE` do Dashboard thực hiện, không thuộc Customer API.
- Thay đổi hồ sơ không được cho sửa trực tiếp `cUserId`, `email` hoặc `role`. Tải avatar tối đa 5 MB, JPG/PNG/WebP, xác minh MIME và xử lý file an toàn.

## 5. Giữ ghế, đơn hàng và thanh toán

| Method | Endpoint | Request / `data` |
|---|---|---|
| POST | `/seat-reservations` | `{timeId,seats:[{sRow,sColumn}]}` (1–8 ghế không trùng); trả `{reservationId,timeId,branchId,roomId,seats,expiresAt}`. |
| GET | `/seat-reservations/:reservationId` | Thông tin giữ ghế còn hiệu lực, thuộc người dùng hiện tại. |
| DELETE | `/seat-reservations/:reservationId` | `{released:true}`. |
| POST | `/customer/orders` | `{reservationId,addons:[{itemType,productId,quantity}],couponId?,idempotencyKey}`; trả Order đã tính tiền. |
| GET | `/customer/orders` | Danh sách Order thuộc phiên. |
| GET | `/customer/orders/:orderId` | Chi tiết Order và trạng thái hiện tại. |
| POST | `/customer/orders/:orderId/payment` | Body `{}`; trả `{paymentUrl}` HTTPS. |
| GET | `/customer/payments` | Danh sách Payment thuộc phiên. |

**Quy tắc nghiệp vụ:**

- `source=STAFF` sử dụng `PENDING` khi chưa xác nhận thanh toán tại quầy; `source=CUSTOMER` sử dụng `AWAITING_PAYMENT` khi chờ thanh toán online. `PAID` chỉ khi đã xác thực thanh toán; có thể có `CANCELLED`/`EXPIRED` theo kết quả xử lý đơn.
- Backend kiểm tra ghế theo `timeId`, chống đặt/giữ trùng trong giao dịch, xác thực suất chiếu và điều kiện bán vé. Thời gian giữ ghế lấy từ `expiresAt` do server trả.
- Giá vé tính từ `Room.basePrice` và `Seat.sPrice`. Tổng thanh toán, tồn kho sản phẩm, voucher và chiết khấu phải do backend tính và xác thực; không tin giá hoặc trạng thái do client gửi.
- `idempotencyKey` chống tạo đơn lặp: cùng khóa và payload trả lại cùng đơn, cùng khóa nhưng payload khác trả `409`.
- Webhook thanh toán phải kiểm tra chữ ký, số tiền, mã đơn và chống xử lý trùng trước khi cập nhật `PAID`. Redirect chỉ dùng để tải lại trạng thái qua `GET /customer/orders/:orderId`.
- Customer không được gọi API xác nhận thanh toán tại quầy `/orders/:id/confirm-payment`; không gửi `amount`, `source`, `status` hay merchant secret khi tạo đơn hoặc bắt đầu thanh toán.

## 6. Nội dung website

`GET /public/site-content` trả object gồm sáu section, các giá trị là chuỗi văn bản hoặc URL:

| Section | Trường |
|---|---|
| `global` | `companyName`, `tagline`, `logoUrl`, `contactEmail`, `hotline`, `address`, `facebookUrl` |
| `home` | `headline`, `subheadline`, `heroImageUrl` |
| `about` | `title`, `introduction`, `vision`, `mission`, `values` |
| `services` | `title`, `introduction` |
| `pricing` | `title`, `introduction`, `disclaimer` |
| `contact` | `title`, `introduction`, `workingHours`, `mapUrl` |

Customer chỉ đọc nội dung công khai; quyền cập nhật thuộc Dashboard. Phần `pricing` dùng để giới thiệu, **không** thay thế dữ liệu giá vé thực tế từ Room/Seat/Order.

## 7. Validation và bảo mật

- Mật khẩu mới ít nhất **10 ký tự**; kiểm tra mật khẩu cũ khi thay đổi, giới hạn tần suất yêu cầu và thu hồi phiên phù hợp.
- Bình luận/đánh giá tối đa **2.000 ký tự**; lý do báo cáo tối đa **1.000 ký tự**.
- Liên hệ: `fullName` tối đa **100**, `email` tối đa **200**, `subject` tối đa **150**, `content` tối đa **5.000** ký tự; số điện thoại bắt buộc **8–15 chữ số**, có thể bắt đầu bằng `+`.
- Chuẩn hóa/kiểm tra chuỗi, enum, định danh, quan hệ chi nhánh–phòng, thời gian hiệu lực, quyền sở hữu và CSRF ở server; dùng `422` cho lỗi trường, `409` cho xung đột nghiệp vụ, `429` cho giới hạn tần suất.
- Không tiết lộ SQL, stack trace, thông tin người dùng khác hoặc cấu hình thanh toán. Không dựa vào kiểm tra phía frontend để quyết định quyền truy cập.

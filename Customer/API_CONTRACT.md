# Customer API contract — CMS Cinema

## Trạng thái và nguồn đối chiếu

Đồng bộ ngày 2026-11-04 theo [SHARED_API_CONTRACT.md](../docs/SHARED_API_CONTRACT.md), phiên bản `draft-1.0`, là chuẩn thiết kế chung ưu tiên. Giữ nguyên mức độ D-L/D-N/C-N/S-N/OPEN của tài liệu đó; S-N không phải bằng chứng PHP đã hỗ trợ. Lần đối chiếu Dashboard trực tiếp 2026-10-26 là lịch sử, không phải dependency đường dẫn máy nhận dự án. Không chỉnh sửa Dashboard. Xem [CUSTOMER_CONTRACT_DIFF.md](docs/CUSTOMER_CONTRACT_DIFF.md) cho audit từng service, mapping, kiểm thử và blocker.

**Chưa có PHP server/MySQL trong workspace. Không endpoint nào có trạng thái “đã xác minh PHP”.** HTTP tests dùng response giả lập để kiểm thử client, không chứng minh PHP tồn tại. Mọi URL dưới đây là hợp đồng đề xuất hoặc kế thừa tên cũ; chạy tương tác được trong mock theo phạm vi ghi rõ.

## Transport

- Base `VITE_API_BASE_URL`, mặc định `/api`; đường dẫn trong bảng tương đối với base.
- Axios, JSON, `withCredentials:true`, timeout 15s; cookie phiên HttpOnly/Secure/SameSite do PHP phát hành. CORS chỉ cho origin Customer/Dashboard chính xác và credentials.
- Mọi mutation cần `X-CSRF-Token`; client lấy từ login/me hoặc GET `/auth/csrf`. Token chỉ RAM. Không JWT/refresh token trong localStorage. Không có refresh retry ngầm; 401 yêu cầu đăng nhập lại.
- Response `{success:true,data:...}`; false envelope bị từ chối kể cả HTTP 200.
- List giữ **toàn bộ array**, lọc/phân trang ở client. Adapter nhận `{success:true,data:[...]}`, legacy array trực tiếp, hoặc `{success:true,data:{items:[...],total}}`. Nếu có `meta`, `total` phải bằng số phần tử nhận được và `page` (nếu có) phải là 1. `items` bắt buộc có `total`. Danh sách thiếu trang bị từ chối, không âm thầm hiển thị một phần; không tự tải trang tiếp theo. Không thể phát hiện server cắt array mà không khai báo metadata: PHP vẫn phải bảo đảm full array. O-06 chỉ được đóng khi PHP/service/UI cùng thống nhất pagination.
- 400/401/403/404/409/413/422/429/500: `{success:false,message:"Thông báo an toàn",errors?:{field:[...]}}`. Không lộ SQL/stack trace. Frontend giữ dữ liệu form và báo lỗi, chặn submit trùng.
- Định danh DTO số nguyên dương: movieId,branchId,roomId,timeId,productId,couponId,commentId,reviewId,reportId,orderId. Chỉ route/query boundary đổi chuỗi số từ URL thành number; response sai kiểu bị từ chối. `cUserId` là chuỗi customer; `userId` là alias UI hoặc tác giả public. Room có khóa kép branchId+roomId. Adapter dùng allowlist, không đưa managerId/lương/quyền nhân sự vào UI Customer; PHP vẫn phải loại dữ liệu nhạy cảm trước khi gửi qua mạng.
- date-only theo Việt Nam: startDate 00:00, endDate 23:59:59.999 UTC+07. Timestamp phải có offset/Z. Không lấy timezone thiết bị để suy diễn lịch kinh doanh.

## Mapping với Dashboard

| Entity | Customer / Dashboard | Khác biệt được giải quyết |
|---|---|---|
| Customer | API cUserId,cName,phoneNumber,sex; UI userId,fullName,phone,gender | Canonical S-N có adapter; session id/name và legacy aliases được đọc tường minh. Birthday/dob còn O-03, xem giới hạn bên dưới |
| Movie | movieId,mName,slug,descript,runTime,releaseDate,closingDate,ageRating,posterUrl,trailerUrl,genres,actors,formats | Adapter giữ tên hiển thị từ chuỗi hoặc object catalog: genre/genreName/name, fullName/actorName/name, formatName/format/name; trả chuỗi cho UI, không render `[object Object]` hoặc lộ thuộc tính nội bộ; không rating 10 điểm |
| Branch | branchId,bName,bAddress,phoneNumbers,totalRooms | Chỉ public fields; không lấy managerId/managerName/lương/quyền |
| Room | branchId,roomId,rType,rCapacity,basePrice,totalSeats | Khóa kép; không giả định roomId toàn hệ thống |
| Showtime | timeId,movieId,branchId,roomId,day,startTime,endDate,endTime,rPrice,formatName | Không dùng showtimeId làm khóa entity; ticket snapshot dùng showtimeId như Dashboard |
| Seat | branchId,roomId,sRow,sColumn,sType,sPrice,sStatus | 1 Thường, 2 VIP; không dùng cách ánh xạ VIP=3/Sweetbox=2 cũ. Ghế loại 3 lịch sử không tự đổi dữ liệu; hiển thị như ghế thường, cần backend migration nếu còn sử dụng |
| Food & Drink | productId,pName,pType,price,quantity,imgUrl,startDate,endDate,description,itemType=FOOD_DRINK | quantity là tồn kho; số lượng giỏ là field riêng trong cart |
| Merchandise | productId,merchName,price,availNum,imgUrl,startDate,endDate,description,itemType=MERCHANDISE | Khóa giỏ gồm itemType+productId để tránh trùng ID giữa hai nhóm |
| Coupon | couponId,startDate,endDate,saleOff,releaseNum,availNum,minOrderTotal,maxDiscount | Không isActive/releaseDate/manual toggle; maxDiscount=0 nghĩa không giới hạn |
| MovieComment | commentId,movieId,movieTitle,userId,authorName,rating,content,createdAt,contentStatus | rating nguyên 1–5, content nullable; không dùng reviewId |
| CinemaReview | reviewId,branchId,branchName,roomId nullable,userId,authorName,content,createdAt,contentStatus | Không movieId/rating; phòng phải thuộc chi nhánh |
| ContentReport | reportId,targetType,targetId,reason,reportedAt,status,resolutionAction | MOVIE_COMMENT/CINEMA_REVIEW; alias id khi đọc legacy; không đồng nhất reportId và targetId. Chủ sở hữu từ phiên, không cần trả reporter/nhân sự nội bộ cho UI |
| News / FAQ | Các field và status Dashboard hiện có | Chỉ PUBLISHED; tags của News vẫn là chuỗi; nội dung text |
| Order | orderId,source,branchId,orderStatus,orderTime,total,originalTotal,discountAmount,ticketDetails,addonDetails | PENDING quầy, PAID đã xác minh; online chưa trả tiền dùng AWAITING_PAYMENT đề xuất |

## Endpoint lịch sử đã gỡ khỏi luồng gọi

| API cũ | Thay thế trong Customer |
|---|---|
| GET `/movies/now-showing`, `/movies/coming-soon`, `/movies/slug/:slug` | GET public movies/slug; lọc cửa sổ releaseDate/closingDate |
| GET `/showtimes/movie/:slug`, `/showtimes/:id`, `/showtimes/:id/seats` | Public showtimes theo movieId/timeId |
| GET `/branches`, `/branches/:id/rooms` | Public branches/rooms |
| POST `/reviews`, GET `/reviews/movie/slug/:slug` | MovieComment riêng, có commentId và 1–5 sao |
| GET `/food-drinks`, `/merchandise`, `/coupons` | Public products/coupons; giữ các field từng nhóm |
| POST/GET `/orders`, `/payments`, `/payments/subscribe` SSE | Customer orders, order payment và GET status polling |
| STOMP `/app/seats/lock` và `/topic/seats/:timeId` | REST reservations + polling |
| JWT `/auth/refresh`, localStorage tokens | Cookie session + CSRF; không gọi refresh JWT cũ |
| PUT `/users/change-password` | POST `/auth/change-password` như tên endpoint Dashboard |

Tên URL cũ không chứng minh backend PHP tương thích. Không fallback từ public URL lỗi sang URL quản trị.

## Public APIs đề xuất

| Method / URL | Response `data` / filter |
|---|---|
| GET `/public/movies` | Movie[] đầy đủ công khai; ngày hợp lệ |
| GET `/public/movies/slug/:slug` | Movie; 404 nếu không công khai/không tồn tại |
| GET `/public/branches` | Branch[] public |
| GET `/public/branches/:branchId/rooms` | Room[] thuộc đúng chi nhánh |
| GET `/public/showtimes?movieId=&branchId=` | Showtime[]; server lọc scope public |
| GET `/public/showtimes/:timeId` | Showtime có branch/room thật, không default branchId=1 |
| GET `/public/showtimes/:timeId/seats` | Seat[] + `isBooked:boolean,holdStatus:FREE|OWN|OTHER`; trạng thái **theo timeId**, không lộ người giữ khác |
| GET `/public/products` | Union hai nhóm với `itemType`; không phải nhóm hàng mới |
| GET `/public/coupons` | Chỉ coupon public đang thời gian hiệu lực/còn lượt; không suy diễn mọi coupon là campaign/banner |
| GET `/public/site-content` | Object global/home/about/services/pricing/contact; allowlist plain text/URL, không PII/audit; xem proposal bên dưới |
| GET `/public/faq` | FAQ[] gồm id,question,answer,sortOrder,status=PUBLISHED |
| GET `/public/news` | News[] gồm id,title,slug,seoTitle,metaDescription,tags,content,category,imageUrl,status=PUBLISHED,createdAt |
| GET `/public/movies/:movieId/comments` | MovieComment[] VISIBLE của phim |
| GET `/public/branches/:branchId/reviews` | CinemaReview[] VISIBLE của chi nhánh |

Pricing dùng Room.basePrice; phụ thu sPrice lấy từ seats của suất, không có bảng giá hardcode. Services dùng loại phòng thực tế, không quảng cáo dịch vụ chưa có dữ liệu. Nội dung biên tập About/Home/Services/Pricing/Contact và thông tin doanh nghiệp đọc từ GET `/public/site-content` theo proposal mới; không dùng nội dung này để tính tiền.

## Customer writes và auth

| Method / URL | Request | Xác nhận |
|---|---|---|
| GET `/auth/csrf` | — | `{csrfToken}`; cũng dùng trước login/register/contact |
| GET `/auth/me` | Cookie | Session S-N `id,name,email,role,...,csrfToken` hoặc canonical Customer profile/legacy alias qua adapter; role CUSTOMER bắt buộc |
| POST `/auth/login` | `{email,password,provider:"LOCAL"}` | S-N `data:{user,csrfToken}` hoặc flat Customer profile qua adapter; set cookie. Token-only không đủ khôi phục Customer; O-02 chưa chốt |
| POST `/auth/register` | `{cName,email,password,phoneNumber,sex}`; `birthday` **chỉ Mock Mode** | Profile của CUSTOMER + csrfToken; cookie; 409 email trùng. Form thật đang bị blocker ngày sinh O-03, không gửi field chưa xác nhận |
| POST `/auth/logout` | `{}` | `{loggedOut:true}`, thu hồi session, expire cookie |
| PUT `/customers/me` | `{cName,phoneNumber,sex}`; `birthday` **chỉ Mock Mode** | Profile đã lưu của session; email/cUserId/userId/role không mutable. Field birthday/dob chưa chốt, xem quy tắc giữ dữ liệu dưới đây |
| POST `/auth/change-password` | `{oldPassword,newPassword}` | `{changed:true}`; >=10 ký tự, kiểm tra cũ, thu hồi phiên khác |
| POST `/customers/me/avatar` | Multipart field `file` | Profile đã lưu có avatarUrl; PHP <=5MB JPG/PNG/WebP, MIME thực, re-encode, tên ngẫu nhiên, kiểm tra ownership |
| POST `/auth/forgot-password` | `{email}` | Thông báo trung lập; rate limit; chỉ PHP gửi email |
| POST `/auth/reset-password` | `{token,newPassword}` | `{changed:true}`; token hash, TTL, dùng một lần, thu hồi phiên |
| POST `/contacts` | `{fullName,email,phone,subject,content}` | `{id,received:true}` sau commit; PHP tự xử lý email |
| POST `/movie-comments` | `{movieId,rating,content:null|string}` | MovieComment đã lưu có commentId/movieId đúng |
| POST `/cinema-reviews` | `{branchId,roomId:null|number,content}` | CinemaReview đã lưu có reviewId/branchId đúng |
| POST `/comment-reports` | `{targetType,targetId,reason}` | `{reportId,status:"PENDING",...}` |

Không payload nào nhận userId/reporterId/authorName làm quyền sở hữu. PHP lấy từ phiên. Public response chỉ trả tên/avatar công khai, không email của người bình luận. `contentStatus=VISIBLE|DELETED` (và trạng thái khác nếu backend có); frontend chỉ render VISIBLE. Report status tách riêng PENDING/RESOLVED; nhận báo cáo không thay trạng thái nội dung. Dashboard xử lý `/comment-reports/:id/resolve` DISMISS/DELETE; Customer không gọi API đó.

### Adapter hồ sơ và ngày sinh OPEN (O-02/O-03)

`src/services/adapters.js` đọc canonical `cUserId,cName,phoneNumber,sex`, session `id,name` hoặc alias cũ `userId,fullName,phone,gender` và trả đúng UI aliases đang dùng. Prefix `ROLE_` được chuẩn hóa, nhưng chỉ role CUSTOMER được nhận; không tự cấp role khi login/me thiếu role, không dùng accessToken làm hồ sơ. ID alias xung đột hoặc response profile khác khách hàng bị từ chối. Partial response khi lưu profile/avatar chỉ được ghép với hồ sơ đã xác thực cùng phiên trong RAM; không giữ thông tin nhân sự/permissions/accessToken.

Đọc `birthday` hoặc `dob` nếu server đã trả, giữ giá trị khi response cập nhật không có ngày sinh. Trong chế độ thật, nếu ngày sinh không đổi so với hồ sơ đã đọc, payload bỏ cả birthday/dob và lưu các trường canonical còn lại. Nếu ngày sinh bị đổi/nhập mới, dừng trước request, giữ biểu mẫu và báo rõ O-03; không âm thầm bỏ thay đổi. **Form đăng ký hiện yêu cầu ngày sinh nên đăng ký production còn bị chặn bởi O-03**. Đây là blocker được nêu công khai, không tuyên bố PHP hỗ trợ hay tự bỏ yêu cầu ngày sinh của UI. Mock hỗ trợ birthday để toàn bộ luồng demo hiện tại tiếp tục hoạt động. PHP và nhóm dự án phải chốt field/capability trước khi mở ghi ngày sinh thật.

Không gọi `/auth/profile` nội bộ, không bật `/auth/refresh`, không thêm cấu hình giả để coi backend đã có capability. Cookie namespace/SameSite/CORS/CSRF và login response vẫn cần xác minh PHP.

Giới hạn đề xuất cần PHP xác nhận: comment/review <=2000 ký tự; report reason <=1000; contact name<=100,email<=200,phone bắt buộc 8–15 chữ số với dấu + tùy chọn,subject<=150,content<=5000. Server xác minh trường, trim, enum, FK, CSRF, rate limit, lỗi 422; duplicate report PENDING có thể 409.

## Reservation, orders và payment — đề xuất mới, chưa xác minh PHP

| Endpoint | Contract |
|---|---|
| POST `/seat-reservations` | `{timeId,seats:[{sRow,sColumn}]}`; 1–8 ghế khác nhau. Trả `{reservationId,timeId,branchId,roomId,seats,expiresAt}`; TTL do server cấp, timestamp có offset |
| GET `/seat-reservations/:reservationId` | Reservation còn hiệu lực thuộc phiên; 404/409 hết hạn hoặc không tồn tại |
| DELETE `/seat-reservations/:reservationId` | Hủy giữ ghế của phiên; `{released:true}` |
| POST `/customer/orders` | `{reservationId,addons:[{itemType,productId,quantity}],couponId?,idempotencyKey}`; server tính tiền, snapshot vé/sản phẩm và source=CUSTOMER |
| GET `/customer/orders` | Chỉ đơn của session, Order[] đầy đủ |
| GET `/customer/orders/:orderId` | Order đúng ID và ownership; status hiện tại từ DB |
| POST `/customer/orders/:orderId/payment` | `{}`; PHP tạo/tái sử dụng payment session, trả `{paymentUrl}` HTTPS từ provider được cấu hình |
| GET `/customer/payments` | Payment[] của session: paymentId,orderId,amount,paymentMethod,paymentStatus,paymentTime,transactionId? |

PHP phải transaction/lock ghế theo timeId, chống hai người giữ/mua cùng ghế, xác minh suất tương lai/đúng phòng/branch, ghế hoạt động, tuổi/điều kiện bán vé nếu có. Giá vé = room base + sPrice; kiểm tra tồn, cửa sổ bán sản phẩm, coupon time/avail/min/cap. IdempotencyKey scope theo khách hàng chống tạo đơn lặp; trả cùng đơn cho retry cùng key, 409 nếu payload khác. Không tin giá/tổng do client gửi.

Đề xuất `AWAITING_PAYMENT` cho đơn online trước webhook; `EXPIRED` cũng là C-N/OPEN O-01. `PENDING` chỉ hợp lệ khi source=STAFF; response online PENDING hoặc PENDING thiếu source bị từ chối, không đổi tên tự động. FAILED là payment status đã mô tả; việc dùng FAILED/REFUNDED làm order status vẫn OPEN: adapter giữ giá trị legacy/unknown nguyên văn, không dựng transition và không suy diễn từ paymentStatus. Source do server cấp, không suy từ paymentMethod. PHP phải chốt chính sách giữ/giải phóng tài nguyên, webhook kiểm tra chữ ký, amount, orderId, trạng thái provider, idempotency và commit nguyên tử rồi PAID. Redirect/SSE chỉ là tín hiệu tải lại; GET order đúng numeric ID là nguồn hiển thị. Client không gọi `/orders/:id/confirm-payment`.

Service allowlist payload tạo đơn, loại total/price/source/owner/status kể cả caller truyền thêm; response đơn vừa tạo phải xác nhận source=CUSTOMER, không nhận nhầm đơn STAFF tại quầy. Giá `rPrice` chỉ hiển thị/ước tính và còn O-05; không tự thay bằng field giá khác. `showtimeId` trong ticket chỉ FK của `timeId`, không tạo ID mới. Payment initiation chỉ POST `{}`, yêu cầu URL HTTPS không chứa credentials. `{demo:true}` chỉ được xử lý trong Mock Mode, không được dùng làm xác nhận production. Lịch sử payment không biến thành trạng thái đơn.

Không gửi amount từ frontend vào tạo payment. Không chứa merchant secret. Đơn sản phẩm độc lập chưa có contract và không có nút checkout riêng. Phải thống nhất thêm với PHP chính sách retry payment, hết hạn, hoàn tiền, stock/voucher reservations và mở rộng trạng thái online trước production.

## Mock và giới hạn tích hợp

`src/mocks/public-seed.json` được xuất allowlist từ Dashboard, gồm 13 phim, 4 chi nhánh, 8 phòng, sơ đồ ghế, 14 ngày lịch, hai nhóm sản phẩm, 12 voucher, tin/FAQ và hai loại nội dung. `scripts/import-public-fixtures.mjs` đọc reference một lần; runtime không import repository quản trị. Seed được dịch ngày theo todayVN để demo không cũ.

Mock hỗ trợ các URL trong bảng, riêng forgot-password chỉ trả thông báo không gửi email; reset-password từ chối vì không phát hành token. Login mock trả `{user,csrfToken}`, profile canonical; demo storage vẫn giữ alias cũ và được ánh xạ ở biên để không mất dữ liệu sau reload. Avatar demo là Data URL, thật là multipart. Report tạo PENDING trong repository customer demo, không gửi sang Dashboard demo. Đơn mới AWAITING_PAYMENT, mô phỏng hết hạn, không tạo thanh toán thành công mới. Có lịch sử PAID/DEMO để trình bày history. Fixture công khai giữ nguyên vì các ID/model đã khớp; contract tests chạy qua tất cả nhóm fixture.

Mock không thay server authorization/transaction, không giữ ghế đa tab/máy, không email thật, không payment provider, không upload server, không trừ tồn/voucher nguyên tử. Idempotency demo hiện trả đơn cũ theo key, chưa mô phỏng 409 khi cùng key đổi payload; không coi đó là triển khai PHP O-10. Dữ liệu thử và HTTP interceptions không được dùng làm chứng cứ PHP đã triển khai. Toàn bộ O-01…O-12 trong hợp đồng chung vẫn OPEN; chi tiết tại báo cáo sai lệch.

## Liên hệ và nội dung biên tập — bổ sung 06/11/2026

[Proposal thống nhất với Dashboard](docs/CONTACT_WEBSITE_CONTENT_API_PROPOSAL.md) định nghĩa đầy đủ sáu section và các quyết định PHP còn OPEN. GET public chỉ có global {companyName,tagline,logoUrl,contactEmail,hotline,address,facebookUrl}, home {headline,subheadline,heroImageUrl}, about {title,introduction,vision,mission,values}, services {title,introduction}, pricing {title,introduction,disclaimer}, contact {title,introduction,workingHours,mapUrl}. Tất cả string. Không gọi GET/PATCH/DELETE contacts hoặc GET/PUT site-content internal trong Customer.

POST /contacts vẫn guest, body chỉ năm trường hiện có; trim/validate trong service và mock. HTTP thành công chưa đủ: cần numeric id dương và received===true mới reset form. 400/422/429/network/timeout giữ dữ liệu, không tuyên bố đã gửi email. Mock lưu UNREAD/createdAt nhưng chỉ trả receipt công khai. Validation Customer chặt hơn proposal Dashboard (đặc biệt phone bắt buộc 8–15 số); cần PHP chốt chung.

Public site-content dùng adapter allowlist, fallback rõ ràng khi thiếu/sai dữ liệu, ảnh placeholder local và link HTTPS an toàn. Provider chia sẻ state, refresh khi focus/tải lại; không persistent cache hoặc tự đồng bộ với Dashboard mock. Nội dung giá chỉ diễn giải; Room.basePrice, suất/ghế và tổng checkout vẫn theo API nghiệp vụ. O-12 có phạm vi biên tập được chủ dự án cho phép, nhưng backend vẫn OPEN; không sửa bản Shared để coi là đã triển khai. Xem [báo cáo kiểm thử](docs/CUSTOMER_EDITORIAL_REPORT.md).

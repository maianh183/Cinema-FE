# API contract — CineFlow Internal Dashboard

Chuẩn chung: [docs/SHARED_API_CONTRACT.md](../docs/SHARED_API_CONTRACT.md) (draft-1.0). [Đối chiếu Dashboard ngày 06/11/2026](docs/DASHBOARD_CONTRACT_DIFF.md) ghi rõ service, DTO, kiểm thử và O-01–O-12 còn OPEN. Shared được giữ nguyên; tài liệu này mô tả hành vi internal hiện tại, không chứng minh PHP đã triển khai.

> **Phạm vi mới 06/11/2026:** chủ dự án yêu cầu bổ sung lại hai module ADMIN `/contacts` và `/website-content`. [CONTACT_WEBSITE_CONTENT_API_PROPOSAL.md](docs/CONTACT_WEBSITE_CONTENT_API_PROPOSAL.md) là đặc tả endpoint/schema có hiệu lực cho phần mới; thay thế các mô tả hai module đã gỡ ở các mốc lịch sử bên dưới. Không bổ sung Settings/Media page.

## Trạng thái tích hợp

Workspace chỉ chứa frontend. **Không có PHP backend/MySQL, không endpoint nào đã được kiểm chứng với server thật.** Các endpoint dưới đây được phân thành hợp đồng đã có trong service trước refactor và đề xuất mới. Mock Mode dùng adapter trong src/mocks; không phải backend và không chứng minh API thật hoạt động.

DTO_Documentation.md (DTO Java) là tài liệu lịch sử đã đưa ra ngoài bản bàn giao JavaScript; không phải dependency hoặc tài liệu hiện diện trong repo. PHP thuần cần triển khai JSON tương ứng, không cần sử dụng Java hoặc framework PHP. Hai frontend dùng chung dữ liệu; dashboard không triển khai các trang public.

## Transport và response

- Base URL: `VITE_API_BASE_URL`, ví dụ `https://cinema.example/api`. Không đặt API key/bí mật trong biến VITE.
- HTTPS khi triển khai. Axios `withCredentials:true`. CORS chỉ cho phép origin cụ thể của hai frontend; không wildcard với credentials.
- JSON request; ảnh gửi `FormData` với field `file`, browser tự đặt multipart boundary.
- Response một bản ghi: `{ "success":true, "data":{...} }`; danh sách cũ có thể trả array trực tiếp hoặc bọc envelope.
- CMS mới: `{ "success":true, "data":[...], "meta":{"total":42,"page":1,"pageSize":10} }`. Hỗ trợ thêm `data:{items:[],total:42}`.
- Khi không có meta và nhận array, contentService phân trang toàn bộ array ở client. Backend KHÔNG trả array đã cắt trang mà thiếu total.
- Lỗi: HTTP 400/401/403/404/409/413/422/429/500 kèm `{"success":false,"message":"Thông báo an toàn","errors":{"field":["Lý do"]}}`. Không trả SQL, stack trace, password hoặc token trong message.
- API không trả HTTP 200 + success:false như thành công; client vẫn từ chối kiểu response này.
- Danh sách module cũ dùng getAll và phân trang tại client để giữ contract. Khi lượng dữ liệu lớn, cần nâng cấp từng service/UI cùng backend sang server pagination; không tự cắt dữ liệu ở PHP với contract cũ.
- CMS: `q,page,pageSize,status,type,category,targetType,targetId`; page bắt đầu 1, pageSize nên giới hạn <=100. Tìm kiếm/filter áp dụng trước tính total; sort ổn định theo id, FAQ theo sortOrder/id.
- Các khóa định danh: movieId/timeId/branchId/productId/orderId/couponId là số; cUserId/eUserId là chuỗi. Room có khóa kép branchId + roomId. Phân công theo ngày mới có scheduleId; ca tuần lịch sử vẫn dùng branchId + startTime + endTime + wDate (1=T2, 7=CN), không tự chuyển khóa cũ.
- Không có response cache trên frontend. Request trùng đang chạy được chặn; GET luôn lấy lại API. Backend nên gửi Cache-Control: private, no-store cho dữ liệu nội bộ.

## Xác thực và phân quyền (cần PHP xác nhận/điều chỉnh)

Các URL auth đã có trong service; cơ chế cookie/CSRF/permission là **đề xuất mở rộng**, không được coi là tương thích tự động với backend cũ.

| Method | URL | Request / response |
|---|---|---|
| GET | /auth/csrf | **C-N/S-N đề xuất**: {csrfToken}; dùng khi chưa có CSRF trước mutation, kể cả login |
| POST | /auth/login | {provider:"LOCAL",email,password} → {user,csrfToken} đề xuất chung; nhận token-only {accessToken?,csrfToken} legacy rồi luôn gọi /me; server set cookie |
| GET | /auth/me | User dưới đây hoặc {user,csrfToken}; id là chuỗi eUserId, cookie session đủ để khôi phục sau reload |
| POST | /auth/refresh | **D-N/OPEN tùy chọn**: {} + cookie HttpOnly + X-CSRF-Token → {accessToken?,csrfToken,user?}; chỉ opt-in VITE_AUTH_REFRESH=true |
| POST | /auth/logout | Hủy session/refresh token server và expire cookie |
| PUT | /auth/profile | {name,phoneNumber,birthday,avatarUrl} → thông tin đã lưu |
| POST | /auth/change-password | {oldPassword,newPassword}; kiểm tra mật khẩu cũ, chính sách >=10 ký tự, thu hồi phiên khác |
| GET | /permissions | **Mới**: [{key:"movies:read",label:"Phim · Xem"},…] chỉ những quyền người gọi có thể cấp |

User tối thiểu:
```json
{
  "id":"NV002","name":"Quản lý","email":"manager@example.test",
  "role":"MANAGER","branchId":1,"avatarUrl":"/uploads/avatar.webp",
  "permissions":["dashboard:read","movies:read","movies:update","profile:read","profile:update","media:create"],
  "csrfToken":"opaque-csrf-value"
}
```

- Chỉ ADMIN/MANAGER/STAFF; client chuẩn hóa ROLE_ prefix chính xác. CUSTOMER bị từ chối.
- Permissions luôn do PHP trả về: `module:read/create/update/delete`, thêm `employees:assign-role`, `orders:confirm-payment`, `workshifts:read-own`. Server có thể cấp `module:*` hoặc `*` cho ADMIN. ADMIN thiếu permissions không tự động được toàn quyền trên UI.
- Module keys: dashboard, movies, showtimes, branches, rooms, customers, employees, workshifts, orders, coupons, products, faq, news, cinema-reviews, comment-reports, media, reports, profile. `my-schedule` là route chung, cần `workshifts:read-own` hoặc `workshifts:read`; không có quyền thao tác cấu hình trên dashboard.
- PHP dùng user ID/session để xác định branch scope và quyền trên **từng bản ghi**; không tin role/branchId/permissions gửi từ client. Kiểm tra cả GET, bulk seats, export, upload, thay đổi trạng thái, gán ca và các URL ID tùy ý.
- Endpoint tra cứu (branches/movies/showtimes/rooms/seats/products/catalog/customers phone) có thể dùng trong POS/biểu mẫu. PHP chỉ trả trường cần thiết trong scope người gọi; không cấp quyền quản trị chỉ vì cần lookup.
- Cấp vai trò/quyền nhân viên phải yêu cầu employees:assign-role, cấm nâng quyền vượt người cấp, cấm tự khóa/xóa ADMIN cuối cùng, ghi audit log.
- Cookie server: HttpOnly, Secure, SameSite phù hợp kiến trúc; CSRF token trên mọi mutation, kiểm tra Origin. Token access (nếu dùng) chỉ giữ RAM, không localStorage/cookie JS. Refresh mặc định tắt; chỉ bật VITE_AUTH_REFRESH=true sau khi thống nhất O-02 với PHP. Khi opt-in, single-flight; retry tối đa 1 lần, thất bại → hết phiên. Không bắt Customer refresh. Không lưu refresh token phía JavaScript.
- Khôi phục: /auth/me có csrfToken; nếu PHP chỉ chấp nhận access token và không hỗ trợ cookie session thì cần thống nhất lại flow restore trước tích hợp. Không có fallback insecure.
- Đồng bộ logout giữa tab bằng BroadcastChannel, không truyền token.
- Customer frontend nên có login/session namespace riêng hoặc chính sách phân biệt internal/customer rõ ràng ở server.

## Endpoint nghiệp vụ đã có trong service

Tất cả vẫn **chưa xác minh trên PHP**. Field names bên dưới được giữ nguyên.

| Nhóm | Endpoints | Payload chính |
|---|---|---|
| Phim | GET/POST /movies; PUT/DELETE /movies/:movieId | mName,descript,runTime,isDub,isSub,releaseDate,closingDate,ageRating,posterUrl,trailerUrl,genreIds[],formatIds[],actorIds[] |
| Catalog phim | GET/POST /catalog/genres, /catalog/formats, /catalog/actors; DELETE /catalog/{kind}/:name | POST query genre / fName / fullName; response {genre}/{fName}/{fullName} |
| Lịch chiếu | GET/POST /showtimes; PUT/DELETE /showtimes/:timeId | movieId,branchId,roomId,formatName,day,startTime,endTime,endDate (mở rộng) |
| Chi nhánh | GET/POST /branches; PUT/DELETE /branches/:branchId | bName,bAddress,managerId,phoneNumbers[],isActive |
| Phòng | GET /rooms?branchId; POST /rooms; PUT/DELETE /rooms/:branchId/:roomId | branchId,roomId,rType,rCapacity,basePrice |
| Ghế | GET /seats/branches/:branchId/rooms/:roomId; POST …/bulk | [{branchId,roomId,sRow,sColumn,sType,sPrice,sStatus}] |
| Sản phẩm ăn/uống | GET/POST /food-drinks; GET/PUT/DELETE /food-drinks/:id | pType,pName,price,quantity,imgUrl,startDate,endDate,description (ngày/mô tả là mở rộng) |
| Lưu niệm | GET/POST /merchandise; GET/PUT/DELETE /merchandise/:id | merchName,price,availNum,startDate,endDate,imgUrl,description |
| Đơn hàng | GET/POST /orders; GET/PUT/DELETE /orders/:orderId | paymentMethod,customerId?,branchId,couponId?,tickets[],addons[]; không cập nhật orderStatus tùy ý |
| Coupon | GET/POST /coupons; PATCH/DELETE /coupons/:couponId | startDate,endDate,saleOff,releaseNum,minOrderTotal,maxDiscount; availNum chỉ trả về |
| Nhân viên | GET/POST /employees; GET /employees/:eUserId; GET /employees/branch/:branchId; PUT/DELETE /employees/:eUserId; PATCH …/activate hoặc …/deactivate | eUserId,eName,email,phoneNumber,sex,userType,branchId,salary,avatarUrl,ePassword (chỉ tạo mới) |
| Ca tuần lịch sử (không còn UI riêng) | GET/POST/PUT/DELETE /work-shifts; GET /work-shifts/branch/:branchId; GET /work-shifts/detail | branchId,startTime,endTime,wDate,work; PUT/DELETE khóa gốc gồm branchId gửi query |
| Phân ca tuần lịch sử | PUT/DELETE /employees/:eUserId/work-shifts | PUT array các ca gồm branchId; DELETE query branchId,startTime,endTime,wDate |
| Khách hàng | GET /customers; GET /customers/:cUserId; GET /customers/phone?phone; PATCH …/activate hoặc …/deactivate | Hồ sơ chỉ xem trong dashboard; không cập nhật cName,email,phoneNumber,sex hoặc điểm/hạng |
| Báo cáo | GET /statistics/overview; /statistics/revenue/daily; /statistics/revenue/movie; /statistics/revenue/branch; /statistics/occupancy | query startDate,endDate,branchId (theo service hỗ trợ) |
| Cấu hình kỹ thuật lịch sử (không có route/nút người dùng) | GET/PUT /system/settings | emailNotification,orderExpirationMinutes,autoCancelEnabled,seatSyncInterval,primaryColor,currency,currencyFormat,cinemaName,cinemaAddress,cinemaPhone |

Không gọi chức năng tạo khách tự động từ POS. customerService.create và movieService.addReview lịch sử vẫn giữ nhưng không có trang/nút khách hàng sử dụng chúng. /system/emails/remind/:id và /system/sync-seats/:id còn trong service lịch sử, không hiển thị nút giả khi chưa có quy trình vận hành xác minh.

Quy tắc PHP cần kiểm tra:
- Trùng lịch theo chi nhánh/phòng và khoảng thời gian tuyệt đối, bao gồm ngày trước/sau. Adapter tính endTime/endDate từ runTime; PHP phải kiểm tra lại. Không có buffer được xác minh trong model hiện tại.
- Room update không đổi nhầm roomId khi field disabled. Không tự sinh sơ đồ khi GET seats lỗi; sơ đồ gợi ý khi chưa có ghế chỉ được persist sau khi nhân viên lưu.
- Ghế đã bán/khóa không được sửa/xóa trái quy tắc; server transaction khi đặt vé và cập nhật tồn kho. POS gửi thêm query showtimeId vào endpoint ghế của phòng; PHP phải kiểm tra suất thuộc đúng phòng và trả isBooked theo suất. Không được dùng trạng thái ghế đã bán chung cho mọi suất.
- Giá vé, phụ thu sPrice, tổng tiền, giảm giá và trạng thái PAID phải do PHP tính/kiểm tra; bỏ qua tổng tiền do client suy diễn.
- Trạng thái đơn: PENDING/PAID/CANCELLED. Không cho sửa PAID hoặc xóa lịch sử thanh toán tùy tiện; trả 409 khi trái quy tắc. Thanh toán online phải dựa webhook server; không xác nhận theo client.
- Chỉ quản lý các trạng thái hợp lệ; hard delete phụ thuộc quan hệ FK, audit và quy định lưu trữ.
- Những field bổ sung đề xuất: sản phẩm `startDate,endDate,description` cho cả hai nhóm; coupon `minOrderTotal,maxDiscount` (0=no cap); employee `permissions[]`; ca `branchId` bắt buộc để scope và phân biệt khóa; room `isActive` nếu server hỗ trợ.
- Dashboard overview cần bổ sung `totalMovies,totalEmployees,totalShowtimes,totalOrders` vào response cũ. Nếu thiếu, UI hiện “Chưa có dữ liệu”, không dựng số giả.

## Endpoint mới cho assignment

Phạm vi đã cập nhật theo yêu cầu bổ sung: không triển khai dashboard quản trị nội dung website, liên hệ, thư viện ảnh riêng hoặc reset mật khẩu khách hàng. Không xóa dữ liệu/API mà Customer Frontend còn dùng.

Tất cả CRUD dưới đây chỉ dành cho nhân sự và cần permissions tương ứng.

| Resource | Endpoints | Fields |
|---|---|---|
| FAQ | GET/POST /faq; PUT/DELETE /faq/:id | id,question,answer,sortOrder,status |
| News | GET/POST /news; PUT/DELETE /news/:id | id,title,slug,seoTitle,metaDescription,tags,content,category,imageUrl,status,createdAt |
| Categories | GET/POST /categories; PUT/DELETE /categories/:id | id,name,slug,type=NEWS/PRODUCT. GET ?type; bảo vệ theo quyền news hoặc products |
| Bộ chọn ảnh trong form | GET /media (không còn trang quản trị riêng) | id,name,url,mimeType,size,createdAt |
| Image upload | POST /files/upload?folderName=movies/products/employees/media | multipart field file → {id,name,url,mimeType,size,createdAt} |
| Delete customer | DELETE /customers/:id | Xóa/ẩn danh tùy lịch sử; 409 nếu không cho phép |
| Permission catalog | GET /permissions | [{key,label}] các quyền người gọi có thể cấp |

Trạng thái News/FAQ: DRAFT/PUBLISHED/HIDDEN. Không còn workflow duyệt bình luận thông thường. Dashboard không quản lý liên hệ/nội dung website/reset mật khẩu khách hàng.
- News/FAQ/content được lưu dạng **văn bản thuần**. Không render dangerouslySetInnerHTML. Customer frontend cũng phải escape; nếu đổi sang rich HTML thì cả hai frontend và PHP phải thống nhất sanitizer allowlist.
- slug duy nhất theo type/resource, kiểm tra ký tự, độ dài SEO. tags hiện chuỗi phân tách dấu phẩy, không tự thay bằng array.
- PHP kiểm tra MIME thực, kích thước <=5MB, đuôi JPG/PNG/WebP, tên file ngẫu nhiên, re-encode ảnh, không cho execute trong uploads, cấm SVG/script, kiểm tra quyền/ownership. folderName là enum phía server, không dùng trực tiếp làm đường dẫn.
- Trả URL cùng server/CDN do doanh nghiệp kiểm soát, không Cloudinary làm nơi lưu chính. Upload thành công mới callback save URL; response thiếu URL được coi là lỗi.
- DELETE media trả 409 nếu ảnh đang được phim/nội dung/avatar sử dụng; backend cần reference count hoặc truy vấn liên kết.

## Customer frontend dùng chung dữ liệu

PHP có thể cung cấp public read API riêng (dashboard không gọi): /public/content, /public/faq, /public/news, /public/products. Chỉ trả nội dung được phép công khai và trường public; không lộ quyền/lương/thông tin nội bộ. Customer Frontend gửi liên hệ/bình luận/báo cáo qua API riêng. Dashboard chỉ xử lý báo cáo nội dung, không duyệt từng bình luận; invalidate cache public khi cần.

Không xây dựng API giỏ hàng chưa hoàn tất vì workspace không có mô hình hoặc contract tương ứng.

## Hạn chế cần thống nhất với backend trước production

1. roomService.getSeats hiện gửi query showtimeId khi POS chọn suất. PHP cũ phải hỗ trợ query này, kiểm tra scope/phòng/suất và tính lại giá cơ bản + phụ thu; chưa kiểm chứng backend thật.
2. Calendar mới dùng phân công theo ngày /work-schedules. PHP phải triển khai resource mới và thống nhất migration từ ca tuần wDate; frontend không tự chuyển hoặc ghi đè dữ liệu ca tuần.
3. POS chưa có polling/webhook client cho thanh toán; đóng rồi tải lại chi tiết để xem trạng thái đã được PHP xác nhận.
4. Catalog trong form tải tối đa 100 danh mục mới; cần search server khi có nhiều hơn.
5. Các quyền, trạng thái, upload, CSRF/refresh và quy tắc xóa cần kiểm thử tích hợp với PHP thật. Tests dùng mock adapter hoặc HTTP responses giả lập không thay thế kiểm thử đó.




## Thay đổi nghiệp vụ bổ sung — cần PHP triển khai/xác minh

### Xác nhận thanh toán

POST /orders/:orderId/confirm-payment, body {}, yêu cầu cookie phiên, CSRF và permission orders:confirm-payment. Không fallback sang PUT orderStatus. Response phải là toàn bộ OrderResponse đã lưu, gồm orderId, branchId, source, createdByEmployeeId, orderStatus, total, ticketDetails, addonDetails và thông tin thời gian.

- Thêm source=STAFF|CUSTOMER và createdByEmployeeId do server cấp. Không suy đoán nguồn theo phương thức thanh toán. Đơn thiếu nguồn tạo không có nút xác nhận.
- Đơn quầy mới PENDING kể cả CASH. Đơn khách hàng đã thanh toán qua webhook là PAID. Chuẩn hóa uppercase; CANCELLED/FAILED/REFUNDED xử lý riêng.
- Chỉ PENDING → PAID, source STAFF, đúng quyền và chi nhánh từ phiên. ADMIN/MANAGER cũng cần permission. Backend kiểm tra tính hợp lệ của đơn, tiền, ghế và hiệu lực.
- Transaction/khóa bản ghi hoặc compare-and-set WHERE status=PENDING; không ghi doanh thu/trừ kho hai lần. Lặp lại trả 409 hoặc response idempotent PAID theo chính sách đã thống nhất.
- 403 ngoài scope, 409 đã xử lý/không hợp lệ, 422 sai dữ liệu. Response PAID có paidAt, confirmedBy. Frontend cập nhật danh sách/thống kê từ response, không tự gán khi API thất bại.
- Mất kết nối: tải lại đơn để đối chiếu; không coi timeout là bằng chứng giao dịch đã hoặc chưa thanh toán.

### Lịch chiếu qua nửa đêm

Form gửi movieId,branchId,roomId,formatName,day,startTime. Adapter bổ sung endTime,endDate từ movie.runTime (phút). Ví dụ ngày 2026-12-31, 23:30, 110 phút → endDate=2027-01-01, endTime=01:20:00.

PHP cần hỗ trợ endDate hoặc timestamp kết thúc đầy đủ, tính lại thời lượng và kiểm tra trùng trên cả ngày trước/sau. Backend cũ chỉ có clock endTime cần nâng DTO trước tích hợp. Không yêu cầu người dùng nhập endTime, không dùng 00:00 giả. Chưa có buffer dọn phòng được xác minh; không tự cộng. GET phải trả đủ lịch ngày kề để client kiểm tra trước; server quyết định cuối cùng.

### Voucher: chỉ thời gian hiệu lực và tổng lượng phát hành

Giữ tên trường DTO `startDate/endDate/releaseNum/availNum` (không tự đổi thành startAt/endAt). POST/PATCH gửi startDate,endDate,saleOff,releaseNum,minOrderTotal,maxDiscount; **không gửi releaseDate, isActive hoặc availNum**.

- Bỏ yêu cầu releaseDate trong request/schema validation. Nếu DB còn NOT NULL, backend cần migration có kiểm chứng hoặc giá trị do server quản lý; frontend không gửi ngày giả.
- Bỏ cơ chế kích hoạt thủ công. PHP phải xác nhận kế hoạch chuyển đổi voucher cũ isActive=false: không âm thầm xóa dữ liệu hoặc đưa voucher bị khóa trước đây vào sử dụng khi chưa có quyết định chuyển đổi. UI mới hiển thị trạng thái thời gian, không dùng isActive.
- Chỉ PREACTIVE trước bắt đầu, ACTIVE từ bắt đầu đến hết hạn (bao gồm mốc kết thúc), EXPIRED sau kết thúc. Hết lượt là thông tin tồn riêng, không phải EXPIRED. INVALID chỉ là chẩn đoán ngày sai, không phải trạng thái nghiệp vụ.
- Date-only theo Asia/Ho_Chi_Minh: 00:00:00+07:00 đến hết 23:59:59.999+07:00. Timestamp phải có offset; frontend dùng cùng hàm cho badge, thống kê, lọc. Form hiện biên tập ngày, backend cần trả date-only cho hợp đồng form này.
- **Không giảm releaseNum trong mọi thời điểm**, kể cả trước startDate hoặc sau endDate. Giá trị mới phải là số nguyên >= tổng hiện tại. Trả 422: “Số lượng phát hành không được nhỏ hơn số lượng hiện tại.”
- Tạo: availNum=releaseNum. Sửa trong transaction có khóa bản ghi: used=oldRelease-oldAvailable; newAvailable=oldAvailable+(newRelease-oldRelease). Ví dụ 100/70 còn, tăng 120 → còn 90, vẫn dùng 30.
- Backend đọc số hiện tại từ DB, bỏ qua/từ chối availNum do client cố gửi, không reset lượt dùng; kiểm tra xung đột đồng thời với redeem. Response trả toàn bộ Coupon đã lưu.
- Nếu PHP cũ vẫn yêu cầu isActive/releaseDate/availNum, cần nâng hợp đồng trước khi bật API thật. Seed mở rộng dùng hợp đồng mới; mutation mock từ chối releaseDate/isActive.

### Sản phẩm

Cả /food-drinks và /merchandise nhận/trả startDate,endDate,description bên cạnh field cũ. Food/drink cần bổ sung ngày; merchandise đã có ngày trong DTO cũ. Không gửi isActive trong form mới.

Trước startDate: PREACTIVE; sau endDate: EXPIRED; trong khoảng tồn=0: OUT_OF_STOCK, tồn>0: ACTIVE. Thiếu ngày: UNKNOWN (Chưa có lịch kinh doanh), ngày/kho sai: INVALID. Không tự gán ngày hôm nay. Ngày theo quy ước Việt Nam trên; PHP kiểm tra lại khi bán hàng.

### Nhân viên và chi nhánh

GET /employees/:eUserId trả hồ sơ hiện tại để đối chiếu sau khóa/kích hoạt. POST/PUT trả hồ sơ đầy đủ có eUserId; không trả mật khẩu.

MANAGER cần employees:create/update/delete tương ứng, chỉ STAFF thuộc chi nhánh được cấp; không chỉnh chính mình/ADMIN/MANAGER khác, không gán ADMIN/MANAGER. employees:assign-role và GET /permissions chỉ cấp những quyền thực sự được phép cấp. Server ngăn nâng quyền vượt scope, thu hồi phiên khi khóa, bảo vệ ADMIN cuối cùng, lưu audit và quy tắc soft-delete. Trả 422 có lý do, 403 ngoài scope, 409 khi không thể xóa.

Quản trị /branches chỉ ADMIN; lookup chi nhánh trong lịch/phòng/nhân viên vẫn theo scope và trường tối thiểu, không cấp quyền quản trị chỉ vì cần lookup.

### Lịch làm việc theo ngày — resource mới, cần PHP triển khai

Calendar Ngày/Tuần/Tháng của STAFF/MANAGER/ADMIN dùng cùng /my-schedule. Route /employees/workshift chuyển hướng sang trang này; không còn mục Ca làm việc độc lập. Resource mới **không phải endpoint PHP đã được xác minh** và không thay tên field của DTO ca tuần cũ.

| Method | Endpoint | Quyền / nội dung |
|---|---|---|
| GET | /work-schedules/me?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD | workshifts:read-own; lấy employeeId từ phiên, không nhận employeeId/branchId tùy ý |
| GET | /work-schedules?startDate=&endDate=&branchId=&employeeId= | workshifts:read; lọc server trong scope trước khi trả dữ liệu |
| POST | /work-schedules | workshifts:create; tạo một phân công theo ngày |
| PUT | /work-schedules/:scheduleId | workshifts:update; sửa một phân công |
| DELETE | /work-schedules/:scheduleId | workshifts:delete; hủy/xóa theo nghiệp vụ, không xóa lịch của người khác trong nhóm |

Payload POST/PUT (không gửi tên nhân viên/chi nhánh làm khóa):

```json
{
  "employeeId":"NV003", "branchId":1,
  "workDate":"2026-10-25", "endDate":"2026-10-26",
  "startTime":"22:00", "endTime":"02:00",
  "work":"Ca đêm", "position":"Soát vé"
}
```

- Response bản ghi bọc data, gồm scheduleId duy nhất, toàn bộ trường đã lưu, employeeName,branchName,status (nếu có). GET trả array đầy đủ trong khoảng; không cắt trang âm thầm. Không có lịch trả []. POST/PUT phải trả scheduleId; frontend không báo lưu thành công nếu thiếu khóa.
- Ngày là date-only hợp lệ; giờ HH:mm hoặc HH:mm:ss với độ chính xác phút, dữ liệu địa phương Asia/Ho_Chi_Minh. endDate bắt buộc; ca cùng ngày đặt bằng workDate. Mốc kết thúc phải sau bắt đầu, tối đa 24 giờ. Ca qua đêm có endDate ngày kế tiếp. Không ép giờ kết thúc thành giờ cùng ngày hoặc chuyển ngày civil qua timezone của thiết bị.
- GET startDate/endDate bao gồm hai ngày biên, tối đa 63 ngày. Trả mọi ca giao với khoảng [startDate 00:00, endDate+1 00:00), kể cả ca bắt đầu hôm trước và kết thúc trong ngày đầu. Ca kết thúc đúng 00:00 không xuất hiện thêm ở ngày sau.
- STAFF chỉ GET /me, không tải roster nhân sự. Chặn mọi mutation và GET danh sách rộng kể cả sửa URL/query. Response sai chủ thể bị frontend từ chối, không lọc client để che dữ liệu rò rỉ.
- Theo yêu cầu mới, MANAGER chỉ đọc/ghi lịch theo ngày ở **branchId của tài khoản**, không có bộ chọn chi nhánh kể cả khi branchIds chứa thêm chi nhánh cho module khác. ADMIN toàn hệ thống nếu có permission. PHP lấy chi nhánh từ phiên/DB và từ chối query/body khác phạm vi; không dựa vào UI. STAFF /me chỉ trả lịch cá nhân.
- Lookup /branches, /employees và /employees/branch/:branchId phải giới hạn cùng scope. Nhân viên phải đang hoạt động, thuộc branch của phân công; ID nhân viên là chuỗi eUserId hiện có.
- Transaction server kiểm tra lại quyền bản ghi cũ lẫn bản ghi mới, membership, ngày/giờ và xung đột theo employeeId trên tất cả chi nhánh. Hai khoảng [start,end) liền nhau được phép; trùng ca, kể cả qua đêm, trả 409. Cùng giờ ở hai nhân viên khác nhau được phép. 422 dữ liệu sai, 403 ngoài scope, 404 không tồn tại.
- Không ghi một phần, không trả thành công trước commit. UI giữ form và dữ liệu cũ khi lỗi, chỉ tải lại lịch sau response thành công; chống submit trùng tại UI không thay thế khóa giao dịch server.
- Chưa hỗ trợ nghỉ phép, quy tắc lặp, kéo thả, batch phân công hoặc audit đầy đủ trên frontend. Không tự gán các nghiệp vụ này vào API mới.

**Tương thích lịch tuần:** các hàm gán/gỡ ca trong employeeService và handler mock legacy /work-shifts vẫn được giữ; source hiện tại không còn standalone shiftService; khóa branchId,startTime,endTime,wDate và phân công /employees/:employeeId/work-shifts không bị sửa dữ liệu. Calendar mới không gọi hoặc fallback sang chúng. Trước production, backend cần thống nhất phạm vi ngày sinh phân công từ mẫu tuần, xử lý ngoại lệ/trùng, lưu liên kết mẫu và migration có audit. Không tự biến mẫu tuần thành một ngày cố định hoặc xóa mẫu cũ. Test legacy còn để bảo vệ hợp đồng cũ, không có nghĩa UI mới sử dụng cả hai nguồn.

### Đơn hàng dùng chung và ghế tại quầy

- STAFF dùng cùng bảng/bộ lọc/chi tiết/POS/xác nhận với MANAGER trong scope được cấp. GET /orders phải trả toàn bộ đơn trong scope (hợp đồng cũ phân trang client), gồm nguồn, người tạo, trạng thái, thời gian, vé/phim/suất/phòng/ghế, sản phẩm, khách và tổng tiền. Nếu nâng sang server pagination, cần nâng cả service và thống kê tổng có scope, không đếm chỉ một trang.
- STAFF/MANAGER cố định chi nhánh theo session.branchId và gửi branchId này khi tải đơn. PHP phải áp cùng phạm vi ngay cả khi client bỏ/sửa query hoặc tài khoản có branchIds ở module khác. ADMIN giữ bộ lọc toàn bộ/từng chi nhánh. Response ngoài phạm vi bị UI từ chối.
- STAFF có Tổng số đơn hàng và Đơn chưa xử lý (PENDING); không thêm card Đơn đã hủy. Thống kê tính trên tập đơn được phép xem, độc lập bộ lọc hiển thị; tải lại sau tạo/xác nhận. Response ngoài branch scope bị từ chối toàn bộ.
- GET /seats/branches/:branchId/rooms/:roomId?showtimeId=:id: query mới cho POS, trả từng ghế vật lý và isBooked theo suất. Không có query dùng cho quản lý sơ đồ phòng, không suy diễn booking. PHP xác minh suất thuộc phòng/branch và quyền người gọi.
- POST /orders giữ payload hiện có (tickets/addons/customerId/branchId/paymentMethod). Server kiểm tra khách, nhân viên, suất, ghế đang hoạt động/chưa giữ hoặc bán, sản phẩm/giá/tồn; tự tính basePrice + phụ thu sPrice và giá sản phẩm, không tin giá client. Giữ ghế và tạo PENDING nguyên tử; cạnh tranh ghế trả 409. PHP phải quy định thời hạn giữ ghế/hủy và kiểm tra thời điểm suất; mock chưa có tự hết hạn.
- Mock trả ID đơn/vé duy nhất, snapshot tham chiếu hợp lệ; confirmation cập nhật doanh thu/số vé từ cùng repository. Snapshot giao dịch giữ lịch sử thay vì đổi theo tên/giá catalog hiện tại. Không mô phỏng webhook hoặc thu tiền thật.

### Hai loại nội dung riêng biệt

DTO lịch sử ReviewResponse chỉ có customerName/customerAvatar/rating/comment/reviewDate, thiếu ID và phạm vi chi nhánh. Nó không đủ cho mô hình mới. Không dùng endpoint đánh giá phim lịch sử để dựng đánh giá rạp.

| Loại | Endpoint đề xuất | Dữ liệu |
|---|---|---|
| MovieComment | GET /movie-comments/:commentId | commentId,movieId,movieTitle,userId,authorName,rating,content,createdAt,contentStatus |
| CinemaReview | GET /cinema-reviews?q=&branchId=&roomId=&page=1&pageSize=10 | reviewId,branchId,branchName,roomId,userId,authorName,content,createdAt,contentStatus; envelope + meta |

MovieComment.rating phải là JSON number nguyên 1–5; content có thể null/rỗng. UI không hiển thị 0/6/NaN/chuỗi như sao hợp lệ. CinemaReview.roomId nullable; không bắt buộc hay suy diễn rating. Nội dung render văn bản thuần, không thực thi HTML.

cinema-reviews:read chỉ cấp ADMIN/MANAGER theo nghiệp vụ; MANAGER được server lọc chi nhánh trước tìm kiếm/phân trang/count, ADMIN xem toàn hệ thống, STAFF bị chặn. roomId phải thuộc branchId. API reviews chỉ đọc ở dashboard, không có duyệt/chờ duyệt. GET lookup branches/rooms trả dữ liệu trong cùng phạm vi. Endpoint movie-comments yêu cầu quyền xem báo cáo và không lộ thông tin ngoài phạm vi hợp đồng.

### Báo cáo bình luận và đánh giá — xử lý nguyên tử

Giữ route/API comment-reports để tương thích URL. Đổi nhãn hiển thị, không cần đổi bảng DB theo tên frontend.

- GET /comment-reports?q=&status=&targetType=&page=1&pageSize=10 → envelope + meta.total/page/pageSize. Quyền comment-reports:read.
- Report: reportId (chấp nhận alias id cũ), targetType=MOVIE_COMMENT|CINEMA_REVIEW, targetId, reporterId,reporterName,reason,reportedAt,status,resolutionAction,resolvedAt,resolvedBy và target chứa đúng DTO nội dung ở trên. Thời gian ISO có offset.
- Báo cáo CinemaReview bị giới hạn theo branch của review phía server; báo cáo MovieComment là nội dung phim chung theo quyền comment-reports:read (không tự suy ra branch từ phim). Nếu doanh nghiệp cần scope phim khác, PHP phải xác định và trả theo chính sách riêng.
- **POST /comment-reports/:reportId/resolve** nhận {action:"DISMISS"} hoặc {action:"DELETE"}. DISMISS yêu cầu comment-reports:update; DELETE yêu cầu comment-reports:delete. Cả hai kiểm tra scope/phiên/CSRF.
- DISMISS giữ nội dung, ghi resolutionAction=DISMISS; DELETE xóa theo nghiệp vụ, ghi resolutionAction=DELETE. Cả hai chuyển PENDING → RESOLVED và trả toàn bộ report đã lưu trong một transaction. Không còn HIDE, RESOLVE hoặc DISMISSED mới. Không cho PUT status trực tiếp.
- Nếu xử lý nội dung thất bại, rollback report và nội dung; trả lỗi, report vẫn PENDING. Frontend không gọi DELETE nội dung riêng rồi PATCH report. Response chưa xác nhận RESOLVED/quyết định/ID đúng thì không báo thành công.
- PHP khóa report và nội dung, chống xử lý lần hai; report đã RESOLVED trả 409 (hoặc response idempotent phù hợp request đã ghi theo chính sách được thống nhất), không thực hiện xóa lại.
- **Nhiều report cùng nội dung:** reportId không đại diện targetId. Chính sách mock/đề xuất: khi DELETE thành công, lưu tombstone/audit và giải quyết tất cả report PENDING cùng targetType+targetId với DELETE/resolvedAt; không đổi report trước đó đã DISMISS. Giữ từng reportId/reporter/lý do. PHP cần xác nhận chính sách này và thực hiện trong cùng transaction. UI tải lại danh sách theo kết quả server, không tự đánh dấu hàng loạt.
- Nhận báo cáo không tự xóa/ẩn; không duyệt trước công khai. Customer Frontend phải ngừng hiển thị nội dung đã bị xóa theo dữ liệu backend/cache invalidation.
- Dữ liệu báo cáo cũ DISMISSED/resolution cần migration được audit sang RESOLVED + resolutionAction=DISMISS; trường hợp HIDE/RESOLVE lịch sử giữ lịch sử để kiểm tra, không giả định là DELETE hoặc DISMISS. Các loại NEWS/PRODUCT cũ không được phép thao tác như bình luận phim/đánh giá rạp.

### Module cấu hình người dùng

/settings đã gỡ khỏi router/sidebar; truy cập trực tiếp trả 404. Không xóa biến môi trường, cấu hình Axios/auth hay helper định dạng tiền. systemService/systemStore lịch sử còn để tương thích mã dùng chung, không có thao tác quản trị cấu hình trên UI.

## Bổ sung: hủy đơn, sơ đồ ghế và trạng thái suất chiếu

### Hủy đơn tại quầy (endpoint đề xuất, chưa xác minh PHP)

`POST /orders/:orderId/cancel`, JSON `{}`, quyền `orders:cancel`, cookie/CSRF như confirm-payment. Quyền riêng phải được PHP trả về; không tự cấp cho STAFF theo tên vai trò. Mock demo đã cấp quyền này.

Chỉ PENDING, source=STAFF, có createdByEmployeeId hợp lệ và đúng chi nhánh của phiên. Không hủy PAID, không hoàn tiền tự động, không dùng DELETE hay PUT orderStatus thay thế. PHP cần khóa đơn trong cùng transaction với confirm-payment: chỉ một quyết định được commit. Thành công trả đầy đủ OrderResponse có orderId,branchId,orderStatus=CANCELLED,cancelledAt,cancelledBy, giữ giá/chi tiết/lịch sử. Frontend chỉ nhận kết quả đúng ID/phạm vi/CANCELLED rồi cập nhật; lỗi hoặc response chưa xác nhận giữ nguyên PENDING.

Giải phóng giữ ghế và hoàn phần tồn/voucher đã giữ (nếu backend có reservation) trong cùng transaction; không giảm doanh thu của đơn chưa thanh toán hoặc hoàn tồn hai lần. Mock ghế suy ra từ các đơn PENDING/PAID (và AWAITING_PAYMENT nếu nhận fixture online đề xuất) nên đơn đã hủy không giữ ghế nữa; chưa mô phỏng transaction tồn/voucher thật. Trả 403 ngoài quyền, 404 ngoài phạm vi/không tồn tại, 409 nếu đã PAID/CANCELLED hoặc đua trạng thái. Lặp lại không hủy lần hai. Backend cần audit quyết định.

### Sơ đồ phòng và loại ghế

Giữ endpoint GET seats và POST seats/.../bulk. UI mở ở Chỉ xem; chỉ vào Chỉnh sửa khi có rooms:update. Hai loại được lựa chọn là sType=1 (Thường), 2 (VIP); ngừng sử dụng dùng sStatus=false. Không còn công cụ Sweetbox hoặc sinh ghế loại 3. Nếu API còn dữ liệu loại 3 lịch sử, UI không tự đổi/xóa nó khi đọc/lưu ghế khác; backend phải có kế hoạch chuyển đổi loại cũ thay vì migration ngầm.

Lưu bulk phải kiểm tra quyền chi nhánh/phòng, ghế hợp lệ, tham chiếu vé/giữ ghế và xung đột cập nhật; commit nguyên tử, lỗi không lưu một phần. Snapshot UI chỉ được thay sau response thành công. Cancel phục hồi snapshot trong bộ nhớ, không gọi API. Chuyển phòng/chi nhánh/trang, Back và đăng xuất có lựa chọn lưu/bỏ/ở lại nếu đã sửa; lưu lỗi giữ trang và bản nháp.

Reload/đóng tab/đi URL ngoài dùng beforeunload; browser chỉ cho cảnh báo rời trang mặc định, không hỗ trợ nút Lưu gọi API bất đồng bộ trong cảnh báo đó. Chọn ở lại rồi lưu trong ứng dụng. Không tự gửi mutation bằng beacon hoặc coi unload là đã lưu. Tham khảo: https://developer.mozilla.org/en-US/docs/Web/API/Window/beforeunload_event

### Nhãn suất chiếu

Ngày/giờ theo Asia/Ho_Chi_Minh, dùng day/startTime/endDate/endTime hiện có; không ghi đè status backend bằng mutation. UI suy ra SCHEDULED nếu now < start, ON_AIR nếu start <= now < end, FINISHED nếu now >= end; cập nhật mỗi 30 giây. Hỗ trợ kết thúc qua ngày; dữ liệu thời gian sai có nhãn chẩn đoán, không gán trạng thái hợp lệ giả. Badge Calendar và danh sách có màu phân biệt. Backend vẫn quyết định tính hợp lệ của bán vé, không dựa badge phía client.

### Quyền sửa hồ sơ khách hàng

Dashboard nội bộ (kể cả ADMIN) không được sửa hồ sơ cá nhân khách hàng. Đã gỡ customerService.update và form/nút lưu; request validation và mock từ chối mutation hồ sơ trực tiếp. PHP phải từ chối endpoint cập nhật hồ sơ khi gọi bằng phiên nhân sự, kể cả có wildcard hoặc quyền customers:update cũ. Chỉ phiên khách hàng được cập nhật hồ sơ của chính mình qua API Customer Frontend, kiểm tra chủ thể từ session; không tin customerId gửi từ client.

Giữ nghiệp vụ khóa/mở khóa và xóa tài khoản theo quyền/quy tắc hiện có. Để tương thích hợp đồng quyền, customers:update hiện chỉ dùng cho PATCH activate/deactivate, không cấp quyền đổi dữ liệu hồ sơ. Catalog quyền đổi nhãn thành Khóa/mở khóa tài khoản. PHP chỉ cập nhật isActive ở hai endpoint này; không nhận kèm trường hồ sơ. DELETE/ẩn danh vẫn cần kiểm tra lịch sử giao dịch. Chưa có backend PHP thật để xác minh quy tắc này.


## Đồng bộ Shared draft-1.0 — 06/11/2026

- Chuẩn chung và tất cả quyết định chưa chốt: [Shared, mục 11](../docs/SHARED_API_CONTRACT.md). Bảng trạng thái O-01–O-12 và đề xuất riêng nằm trong [Dashboard contract diff](docs/DASHBOARD_CONTRACT_DIFF.md); không mục nào được tự đóng trong lần sửa này.
- Adapter session nhận nested user hoặc flat legacy; không tạo ID giả, không nhận CUSTOMER vào nội bộ. POST login chỉ gửi provider/email/password; quyền luôn lấy lại từ /me. Chưa có CSRF thì GET /auth/csrf single-flight trước ghi. Cookie/CSRF/server revocation vẫn cần kiểm chứng PHP.
- Orders getAll/detail/create kiểm tra orderId/branchId là số nguyên dương, total số hữu hạn không âm, FK timeId/showtimeId nhất quán nếu snapshot cung cấp cả hai. Detail không tạo timeId/movieId/roomId/branchId bằng 0 để lấp dữ liệu thiếu.
- Confirm/cancel đọc GET /orders/:id trước POST để kiểm tra nguồn STAFF, PENDING, permission và scope; response POST phải đúng ID/branch/source/trạng thái. Đây không thay transaction backend. Sai response hoặc lỗi mạng giữ nguyên UI và yêu cầu đối chiếu lại.
- AWAITING_PAYMENT/EXPIRED **chỉ là khả năng đọc tương thích O-01**: nhãn/bộ lọc riêng khi xuất hiện, không đồng nhất PENDING, không confirm/cancel tại quầy. Thống kê PENDING chỉ đếm source STAFF; PAID không confirm lại. Không phát sinh enum DB hoặc webhook client.
- POS addons gửi thêm itemType với productId; đây là nhóm FOOD_DRINK/MERCHANDISE đã tồn tại trong service. Chọn/sửa số lượng bằng khóa kép. pType/price legacy vẫn giữ, PHP phải tra giá/tồn theo nhóm, không tin price. Mock chỉ chấp nhận thiếu itemType khi tham chiếu legacy không mơ hồ. O-11 vẫn OPEN đối với DB/public API.
- Mock giá vé tính Room.basePrice + Seat.sPrice với khóa phòng kép, không dùng Showtime.rPrice. rPrice chỉ hiển thị/ước tính cho đến khi PHP chốt O-05; tổng đơn dùng response server.
- Full-list services từ chối envelope/meta báo thiếu hàng hoặc page khác 1; chấp nhận array, envelope array đầy đủ và data.items đầy đủ. CMS contentService tiếp tục server pagination. Không tự fetch/trộn các trang để che O-06.
- Report response CinemaReview ngoài scope bị từ chối trước hiển thị; resolve phải trả reportId đúng, RESOLVED và action tương ứng. Không thay đổi chính sách multi-report mock, O-09 vẫn OPEN.
- Slug: seed phim demo có sẵn, form/payload phim chưa có editor/schema tạo slug. PHP cần chốt sinh/lưu unique slug và đổi tên/redirect; không suy slug tại runtime từ mName (O-04). Public formats nên là strings hoặc object tên mà Customer adapter hỗ trợ; {fName} catalog internal không tự trở thành DTO public.
- PHP public FAQ/news chỉ PUBLISHED; nội bộ vẫn quản trị DRAFT/HIDDEN. Chưa có public server trong Dashboard và không phục hồi module đã gỡ (O-12).


## Liên hệ và Nội dung website — đề xuất bổ sung 06/11/2026

- Guest/Customer `POST /contacts` giữ đúng `{fullName,email,phone,subject,content}` và receipt `{id,received:true}` sau commit. Nội bộ ADMIN theo quyền: `GET /contacts?page=&pageSize=&q=&status=`, `GET /contacts/:id`, `PATCH /contacts/:id/status` body `{status}` và `DELETE /contacts/:id`. Record `{id,fullName,email,phone,subject,content,status,createdAt,readAt?,repliedAt?,repliedBy?}`. Status chỉ UNREAD/READ/REPLIED; REPLIED ghi nhận thủ công qua kênh khác, không gửi email. GET không thay status.
- ADMIN `GET /site-content`, `PUT /site-content/:section`; public `GET /public/site-content`. UI route `/website-content` không phải API path. Body PUT là section đầy đủ; response section đã lưu; không ghi đè section khác.
- Sáu section chính xác: global `{companyName,tagline,logoUrl,contactEmail,hotline,address,facebookUrl}`; home `{headline,subheadline,heroImageUrl}`; about `{title,introduction,vision,mission,values}`; services `{title,introduction}`; pricing `{title,introduction,disclaimer}`; contact `{title,introduction,workingHours,mapUrl}`. Tất cả giá trị string, plain text hoặc URL an toàn. Không nhận giá vé/phòng, HTML, script hoặc iframe.
- Quyền: ADMIN vẫn cần `contacts:read/update/delete`, `website-content:read/update`; không cấp cho MANAGER/STAFF/CUSTOMER kể cả wildcard. Upload/picker giữ `media:create/read` tương ứng. Không có quyền create contact nội bộ; POST guest là luồng riêng.
- Public response đúng sáu section, không chứa contact record hoặc updatedBy/audit. Internal metadata optional root; chưa chốt version/ETag. Ảnh chỉ qua upload/picker đang dùng, social/map chỉ HTTPS. Lỗi upload/PUT giữ draft và ảnh cũ.
- Danh sách contacts trả envelope + meta.total/page/pageSize; newest-first theo createdAt/id. UI lấy global/unread counts qua cùng GET với pageSize=1, không thêm API summary. PHP lọc trước paging.
- [Proposal đầy đủ](docs/CONTACT_WEBSITE_CONTENT_API_PROPOSAL.md) ghi giới hạn validation, ví dụ, migration, diff Customer và các OPEN. O-12 chỉ chốt phạm vi chức năng; PHP persistence/RBAC/CSRF/retention/concurrency/upload/cache và Customer reader chưa xác minh. Hai mock repository không đồng bộ thời gian thực. O-01–O-11 giữ nguyên.

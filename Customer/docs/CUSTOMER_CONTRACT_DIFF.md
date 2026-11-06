# Customer ↔ Shared contract: audit và kết quả đồng bộ

Ngày: 2026-11-04. Repository thực hiện: `C:/cms-fe-delivery/CMS-Cinema-JavaScript-only-2026-11-04`.

Nguồn chuẩn: [SHARED_API_CONTRACT.md](../../docs/SHARED_API_CONTRACT.md) `draft-1.0`, yêu cầu [CODEX_SYNC_CUSTOMER.md](CODEX_SYNC_CUSTOMER.md), đối chiếu [Customer API_CONTRACT.md](../API_CONTRACT.md), toàn bộ `src/services`, mock repository/seed, store, routing, pages, tests. Hai tài liệu người dùng cung cấp giữ nguyên. Không sửa repository Dashboard, bản Customer gốc hoặc PHP/MySQL.

**Không endpoint nào đã được xác minh với PHP.** D-L/D-N/C-N/S-N chỉ mô tả nguồn và thiết kế. HTTP tests bên dưới chặn request trong Playwright và trả dữ liệu kiểm thử, không phải integration PHP. Không đóng bất kỳ mục OPEN nào.

## 1. Sai lệch xác định và cách xử lý

| Phân loại | Trước khi sửa | Kết quả trong Customer |
|---|---|---|
| Lỗi biên transport | Bỏ `meta` trước khi đọc list, có thể nhận một trang như toàn bộ danh sách; nested items bị từ chối | `responseData` đọc envelope trước khi lấy data; nhận full arrays/legacy arrays/nested items có total; từ chối total khác số dòng hoặc page khác 1. Không tự chuyển sang server pagination |
| Lỗi biên error | HTTP 200 `success:false` mất `errors` theo field | Giữ message/errors; mọi false envelope đều thất bại |
| Alias cần adapter | UI dùng userId/fullName/phone/gender; login chỉ nhận flat profile | Đọc canonical cUserId/cName/phoneNumber/sex, core session id/name, flat legacy và nested user; trả UI aliases cũ, chỉ role CUSTOMER/ROLE_CUSTOMER |
| Lỗi payload | Login/register/profile/password/reset nhận dư field từ caller | Allowlist; profile gửi canonical, không gửi ID/role/ownership/email mutation; login chỉ provider/email/password |
| OPEN O-03 | Form gửi dob như field đã chốt | Không gửi birthday/dob production. Giữ ngày sinh đã đọc qua partial response. Thay đổi ngày sinh bị chặn trước request, form giữ nguyên; mock vẫn hỗ trợ birthday. Chưa giải quyết schema PHP |
| Lỗi biên public DTO | Trả nguyên object từ response cho UI; chưa kiểm tra numeric IDs/scope tại service | Projection allowlist, number ID, scope room/showtime, 1–5 integer, tags string; không đưa manager/lương/quyền/email nội bộ vào model UI. Backend vẫn phải bảo vệ response mạng |
| Lỗi biên orders/payment | Caller có thể truyền dư amount/status/source; chỉ kiểm tra orderId bằng String; chấp nhận demo flag trên live response | Allowlist request; response numeric ID và total; PENDING yêu cầu STAFF, giữ enum khác nguyên văn; live payment yêu cầu HTTPS, demo chỉ mock. Không suy diễn PAID từ history/URL/storage |
| Củng cố acknowledgment | Một số mutation tin toàn bộ response DTO | Report đúng PENDING/target/ID; contact received=true + numeric id; reservation đúng identity/timeId/TTL có timezone; logout loggedOut=true |
| Mock wire | Profile/login chỉ có UI aliases | Mock canonical profile + nested login; giữ storage schema cũ để reload không mất hồ sơ/ngày sinh. Seed public đã khớp, giữ nguyên |

## 2. Mapping Customer ↔ Shared

| Shared canonical / quy tắc | Customer UI / adapter | Phân loại, giới hạn |
|---|---|---|
| cUserId string | userId; core session id được đọc rõ ràng | Alias có adapter; numeric customer ID hoặc alias xung đột bị từ chối |
| cName | fullName; core session name được đọc | S-N mục tiêu; không đổi JSX |
| phoneNumber, sex | phone, gender | Canonical writes; không gửi owner/role |
| birthday OPEN | Đọc birthday/dob → dob; chỉ mock ghi birthday | O-03: không tự quyết schema, không lặng lẽ bỏ thay đổi |
| role CUSTOMER; có thể prefix ROLE_ | Chuẩn hóa ROLE_CUSTOMER; không nhận STAFF/MANAGER/ADMIN hoặc token-only | O-02 login shape/cookie chưa chốt; không thêm refresh |
| movieId number, mName | Giữ nguyên, không đổi thành id/title | Slug vẫn lấy từ server, không sinh từ tên; O-04 |
| Movie genres/actors/formats đọc có thể là chuỗi hoặc object | Adapter lấy tên display từ genre/genreName/name, fullName/actorName/name, formatName/format/name thành chuỗi UI | Giữ tên thể loại/diễn viên; không truyền object tùy ý vào React hoặc giữ email/lương trong catalog |
| branchId + roomId | Kiểm tra cả hai; rooms response thuộc branch được yêu cầu | Không coi roomId là global; O-11 ở PHP |
| timeId | Khóa suất trong catalog/reservations | showtimeId chỉ trong ticket FK; nếu ticket có cả timeId thì phải bằng nhau |
| rPrice derived/read-only | Giữ display/estimate; không fallback field giá, không gửi checkout | Thiếu giá hợp lệ báo lỗi, còn O-05 |
| sType 1/2, legacy 3 | Giữ dữ liệu loại ghế; isBooked/holdStatus theo URL timeId | Không migrate loại 3, không khóa cả phòng qua các suất |
| itemType + productId | Giữ productKey/giỏ hiện tại | FOOD_DRINK.quantity và MERCHANDISE.availNum là kho; không nhập nhằng voucher |
| couponId/startDate/endDate/releaseNum/availNum | Public chỉ ACTIVE theo ngày VN, còn lượt hợp lệ | Không sử dụng isActive/releaseDate; response legacy có hai field đó bị từ chối chờ O-08; maxDiscount=0 vẫn không cap |
| MovieComment | Giữ commentId/movieId/rating nguyên 1–5/content nullable | Public chỉ VISIBLE, không tự nâng status legacy |
| CinemaReview | Giữ reviewId/branchId/roomId nullable/content | Không đưa rating/movieId; validate khóa kép trước gửi |
| ContentReport | targetType/targetId/reason; reportId riêng, đọc alias id legacy | Chỉ POST, response PENDING; không resolve/xóa nội dung |
| FAQ/News | Chỉ PUBLISHED; News.tags string; plain text | Không tạo module quản trị website/contact |
| Order.source | Giữ server source, không đoán từ phương thức | PENDING chỉ STAFF; CUSTOMER PENDING bị từ chối |
| Order.orderStatus | Giữ AWAITING_PAYMENT/EXPIRED/FAILED/REFUNDED/unknown đúng response | O-01: không đổi enum, không tạo transition; PAID phải từ order server |
| total/ticketDetails/addonDetails | Server total, snapshot projection, không dùng giá cart như giá xác thực | O-05/O-10; dữ liệu thiếu/sai ID báo lỗi |
| Payment.paymentStatus | Lịch sử riêng | Không đổi orderStatus theo paymentStatus; live initiate POST rỗng, HTTPS |

## 3. Audit từng service / endpoint

Tất cả đường dẫn tương đối với `VITE_API_BASE_URL` (mặc định `/api`). Single response dùng `{success:true,data}`. `List` dưới đây là full array qua các envelope được mô tả trong mục 1. Mọi mutation dùng CSRF, cookie credentials; G = Guest, C = CUSTOMER chính phiên. Quyền thực phải do PHP kiểm tra, client không phải RBAC server. Public không gọi fallback API quản trị.

Test tham chiếu: **B** = [business.test.js](../tests/business.test.js); **C** = [contract.test.js](../tests/contract.test.js); **E** = [E2E customer](../tests/e2e/customer.spec.js), [account](../tests/e2e/account.spec.js), [theme](../tests/e2e/light-theme.spec.js); **H** = [HTTP hiện có](../tests/http/api.spec.js), [HTTP contract](../tests/http/contract.spec.js). Mock “có” chỉ là chạy trong browser, không phải PHP.

| Service / method URL | Request | Response đọc / quyền | Mock; test; đánh giá |
|---|---|---|---|
| api GET `/auth/csrf` | Không body | csrfToken RAM; G/C | Có; H kiểm tra header; giữ single-flight, C-N |
| auth.me GET `/auth/me` | Cookie | Core/canonical/legacy profile, CUSTOMER | Có canonical; C/H/E; adapter, O-02/O-03 |
| auth.login POST `/auth/login` | provider=LOCAL,email,password | Nested user+csrf hoặc flat profile; CUSTOMER | Có nested; C/H/E; không nhận token-only, O-02 |
| auth.register POST `/auth/register` | cName,email,password,phoneNumber,sex; birthday chỉ mock | Customer profile, cookie/CSRF | Có; B/E/C; production form bị O-03 |
| auth.logout POST `/auth/logout` | `{}` | loggedOut=true; thu hồi cookie PHP | Có; E; không chỉ xóa local state |
| auth.profile PUT `/customers/me` | cName,phoneNumber,sex; birthday chỉ mock | Profile đã lưu/partial cùng khách, C | Có; C/H/E; không `/auth/profile`, O-03 |
| auth.avatar POST `/customers/me/avatar` | multipart file live; data URL demo | Profile/avatar đã lưu, C | Có demo; E; PHP MIME/lưu file chưa xác minh |
| auth.password POST `/auth/change-password` | oldPassword,newPassword | changed=true theo contract, C | Có; E; endpoint/policy giữ nguyên |
| auth.forgot POST `/auth/forgot-password` | email | Message trung lập, G; chỉ PHP gửi mail | Mock không mail; C-N; cờ recovery mặc định tắt |
| auth.reset POST `/auth/reset-password` | token,newPassword | changed=true; token PHP TTL/one-use | Mock từ chối, không giả thành công; C-N, chưa có integration mail |
| catalog.movies GET `/public/movies` | — | List Movie public; G/C | Có; C/E; IDs giữ đúng, O-04 slug |
| catalog.movie GET `/public/movies/slug/:slug` | Slug URL encode | Movie đúng slug; G/C | Có; E/C; không tự tạo slug hoặc gọi `/movies`, O-04 |
| catalog.branches GET `/public/branches` | — | List Branch projection; G/C | Có; C/E; không manager/nhân sự |
| catalog.rooms GET `/public/branches/:branchId/rooms` | Numeric route ID | List Room đúng branch; G/C | Có; C/E; composite key, O-11 |
| catalog.showtimes GET `/public/showtimes?movieId=&branchId=` | Chỉ hai filter numeric nếu có | List Showtime đúng scope; G/C | Có; C/E; timeId/rPrice, O-05 |
| reservation.showtime GET `/public/showtimes/:timeId` | Numeric route ID | Showtime đúng timeId; G/C | Có; C/E; không default branch/room |
| reservation.seats GET `/public/showtimes/:timeId/seats` | Numeric route ID | List Seat, booleans, FREE/OWN/OTHER; G/C | Có; B/C/E; availability theo suất |
| reservation.hold POST `/seat-reservations` | timeId,seats[{sRow,sColumn}] | reservationId/timeId/branchId/roomId/seats/expiresAt; C | Có TTL demo; B/C/E; O-10 transaction thật |
| reservation.get GET `/seat-reservations/:reservationId` | String hold ID | Reservation đúng ID, time/room đầy đủ; C | Có; B/C/E; expiry/ownership PHP |
| reservation.release DELETE `/seat-reservations/:reservationId` | Không body | released=true; C | Có; B/E; không sửa namespace |
| checkout.create POST `/customer/orders` | reservationId,addons[itemType,productId,quantity],couponId?,idempotencyKey | Order numeric ID/status/server total, source=CUSTOMER bắt buộc cho đơn vừa tạo; C | Có; B/C/H/E; O-01/O-10 |
| checkout.order GET `/customer/orders/:orderId` | Numeric route ID | Đúng orderId/status/server total; C own | Có; B/C/H/E; không tin URL success |
| checkout.orders GET `/customer/orders` | — | List Order của phiên; C | Có; B/C/E; giữ snapshot, source server |
| checkout.payment POST `/customer/orders/:orderId/payment` | `{}` | paymentUrl HTTPS live / demo response mock; C own | Có demo không thu tiền; C/H/E; O-01/O-10 |
| checkout.payments GET `/customer/payments` | — | List Payment own, paymentId/orderId/amount/status/method/time/transactionId? | Có history DEMO; C/E; không làm nguồn PAID |
| catalog.products GET `/public/products` | — | List union FOOD_DRINK/MERCHANDISE; G/C | Có; B/C/E; giữ itemType + productId |
| catalog.coupons GET `/public/coupons` | — | List coupon ACTIVE/còn lượt; G/C | Có; B/C/E; O-08 migration, PHP kiểm tra redeem |
| comments.list GET `/public/movies/:movieId/comments` | Numeric route ID | List đúng movieId, chỉ VISIBLE, integer rating; G/C | Có; B/C/E; O-07 |
| comments.create POST `/movie-comments` | movieId,rating,content | MovieComment đúng phim; C, author từ session | Có; B/C/E; không userId trong body |
| reviews.list GET `/public/branches/:branchId/reviews` | Numeric route ID | List đúng branchId, chỉ VISIBLE; G/C | Có; B/C/E; không rating/movieId |
| reviews.create POST `/cinema-reviews` | branchId,roomId nullable,content | CinemaReview đúng scope; C, author từ session | Có; B/C/E; validate branch+room |
| reports.create POST `/comment-reports` | targetType,targetId,reason | reportId/PENDING đúng target nếu trả; C | Có; B/C/E; không resolve, O-09 |
| catalog.faq GET `/public/faq` | — | List FAQ chỉ PUBLISHED; G/C | Có; B/C/E; không admin CRUD |
| catalog.news GET `/public/news` | — | List News chỉ PUBLISHED, tags string; G/C | Có; B/C/H/E; plain text escaping giữ nguyên |
| contact.send POST `/contacts` | fullName,email,phone,subject,content | id,received=true sau commit; G/C | Có in-memory; H/E; O-12, PHP mail/DB cần triển khai |

Không thêm endpoints, không tự gọi refresh, permissions, internal profiles, employees, POS, report resolve hoặc confirm-payment. Các status/password/release acknowledgments theo API mục tiêu không chứng minh server đã thực hiện nghiệp vụ; cần test PHP.

## 4. Phần đã đúng nên giữ nguyên

- React + Vite + JavaScript/JSX, toàn bộ JSX/CSS/assets/routes/store và `src/lib/business.js`; không đổi kiến trúc/UI/theme. Không thêm dependency, không sửa package manifest/lock.
- Public/customer URLs tách Dashboard; cookie + CSRF, timeout và cơ chế 401 hiện có; không localStorage tokens/refresh retry.
- Movie mName, numeric IDs, product composite keys, room scope; fixture catalog đã có đầy đủ model phù hợp nên không nhập lại seed hay chạy migration.
- Bình luận sao nguyên 1–5, nullable content; review không rating; chỉ VISIBLE/PUBLISHED; render text qua React escape.
- Pricing/coupon VN time, maxDiscount=0; cart chỉ sản phẩm kèm vé; checkout dùng giá server; status polling và untrusted URL handling.
- Mock AWAITING_PAYMENT, không tạo PAID mới; lịch sử PAID mang paymentMethod=DEMO. Các hạn chế cạnh tranh/kho/webhook của mock vẫn được nêu rõ.

## 5. OPEN và tương thích còn thiếu — không tự quyết định

| ID | Trạng thái Customer sau sửa | Cần phía PHP/nhóm dự án quyết định |
|---|---|---|
| O-01 | Có guard PENDING=STAFF, giữ online/legacy/unknown status; không đổi enum | Enum order/payment chính thức, Dashboard đọc online statuses, FAILED/REFUNDED order semantics |
| O-02 | Adapter nested/flat/core, chỉ CUSTOMER; cookie+CSRF, không refresh | Login/me DTO và cookie namespace/domain/SameSite/CORS/CSRF/refresh policy |
| O-03 | Canonical profile adapter; giữ dữ liệu birthday đã đọc, chỉ mock cho ghi | PHP schema/capability birthday/dob. Form đăng ký yêu cầu DOB nên production bị chặn; profile nếu chưa có DOB từ server cũng vướng required field hiện tại. Không bỏ requirement UI hoặc gửi field chưa xác nhận |
| O-04 | Giữ route slug hiện tại; không đoán slug từ mName | API public slug, quy tắc tạo/đổi/uniqueness và dữ liệu cho Dashboard |
| O-05 | timeId và ticket FK đúng; rPrice chỉ display, request không gửi giá | PHP chốt rPrice derived và room base+seat pricing; DTO không đủ giá báo lỗi |
| O-06 | Full list, kiểm tra total/page; không server pagination tự phát | PHP phải trả đủ array; muốn paging cần migrate PHP/service/UI. Không biết list bị cắt nếu server không khai báo meta |
| O-07 | Chỉ VISIBLE; không tự nâng trạng thái legacy | PHP migration comment status và FK/visibility |
| O-08 | Không nhận coupon legacy isActive/releaseDate như coupon mới | Migration dữ liệu cũ/NOT NULL và voucher disabled; không tự mở lại |
| O-09 | Customer chỉ POST PENDING; không resolve/tombstone | PHP transaction nhiều report cùng target, DELETE/DISMISS/audit |
| O-10 | Demo holds/expiry/idempotent same key; không xác nhận payment thật | TTL/kho/coupon locking, payload-key conflict 409, retry/refund/webhook/race. Mock chưa mô phỏng 409 đổi payload cùng key, stock/voucher reservation hay cạnh tranh đa máy |
| O-11 | Kiểm tra composite scope và itemType | PHP bảo đảm cùng ID MySQL, public projections không lộ internal data, room/product keys không ambiguous |
| O-12 | Cập nhật 06/11: Customer đọc GET /public/site-content sáu section; contact POST giữ receipt | Chủ dự án cho phép biên tập tại Dashboard; Customer chỉ đọc public. PHP storage/validation/cache/security/upload còn OPEN; xem proposal mới |

PHP cần triển khai/xác nhận tất cả public/customer/auth endpoints trong mục 3, cùng các kịch bản tích hợp ở mục 12 của Shared (CSRF/IDOR/ownership, cập nhật Dashboard phản ánh Customer, tranh chấp ghế Customer–POS, giá server, voucher redeem đồng thời, upload, webhook có chữ ký). Không có backend trong phạm vi kiểm thử này để đánh dấu PASS các điều đó.

## 6. File thay đổi

| File | Nội dung |
|---|---|
| `src/services/adapters.js` (mới) | Pure JS transport/DTO/request adapters và contract guards |
| `src/services/api.js` | Giữ envelope meta/errors tới boundary |
| `src/services/customer.js` | Gắn adapters vào service; canonical writes, profile RAM cùng phiên, allowlists |
| `src/mocks/repository.js` | Canonical wire profile/nested login, bảo toàn storage aliases, report numeric target |
| `tests/business.test.js` | Hai request register trực tiếp mock dùng cName canonical |
| `tests/contract.test.js` (mới) | 13 test contract: auth/profile, IDs/scope, list/errors, vouchers, reports, orders/payment, fixtures, storage |
| `tests/http/contract.spec.js` (mới) | 4 browser HTTP tests live mode cho catalog object rendering, payload, CSRF/profile, metadata/errors, orders/payment |
| `API_CONTRACT.md` | Contract Customer cập nhật, S-N/OPEN và giới hạn thực tế |
| `README.md` | Nguồn chuẩn, adapter, blocker DOB, liên kết báo cáo |
| `docs/CUSTOMER_CONTRACT_DIFF.md` (mới) | Báo cáo này |

Không xóa file nguồn. Không thay dependencies/npm scripts. Outputs `dist/`, `node_modules/`, `test-results/`, `playwright-report/` được tái tạo để kiểm thử và vẫn bị ignore, không phải mã bàn giao. Không cập nhật ZIP cũ ở thư mục cha: kết quả nằm trong repository được người dùng chỉ định.

## 7. Kiểm thử thực tế

Các lệnh chạy tại repository trên, Node 24.11.1/npm, ngày 2026-11-04.

| Lệnh / kiểm tra | Kết quả |
|---|---|
| `npm ci` | PASS; cài sạch 224 packages. npm audit báo 6 vấn đề dependency (5 moderate, 1 high); không tự đổi lock/dependency trong nhiệm vụ API |
| `npm run check:language` | PASS: 65 first-party files; 20 JS, 17 JSX, 3 MJS, 0 CJS; không TS/Python |
| `npm run lint` | PASS, gồm toàn bộ service/mock và tests mới |
| `npm test` | PASS 32/32 (19 hiện có + 13 contract) |
| `npm run build` | PASS production; Vite 7.3.7 |
| `npm run test:e2e` | PASS 18/18 Microsoft Edge headless; mock account/comment/review/report/catalog/cart/booking/checkout/content, light surfaces/contrast/responsive 375/768/1024/1440 |
| `npm run test:http` | PASS 8/8 (4 hiện có + 4 contract), Microsoft Edge headless, HTTP interception; có kiểm tra render thể loại/diễn viên dạng object |
| SHA256 JSX/CSS/assets/routes/seed/shared docs/package | PASS: snapshot 36 file trước sửa chỉ có 3 file cũ thay đổi là services/api.js, services/customer.js, mocks/repository.js; adapters.js là file mới. JSX/CSS/public/seed/shared docs/package và lock giữ nguyên |
| Liên kết tài liệu nội bộ | PASS: kiểm tra toàn bộ Markdown links trong README, Customer API contract và báo cáo này, không có target bị thiếu |
| Production bundle | Không có các marker demo `DemoCinema123!`, `demo-csrf`, `public-seed.json` trong JS build production |

Không có integration test PHP/payment provider/mail/DB. Browser HTTP interception không xác minh cookie thực HttpOnly, CORS server hay bảo mật backend.

## Bổ sung nội dung công khai 06/11/2026

Phạm vi mới được triển khai riêng Customer theo [proposal Liên hệ/Nội dung](CONTACT_WEBSITE_CONTENT_API_PROPOSAL.md). About không còn chỉ hardcode: sáu section public cấp nội dung qua provider, fallback giữ bản mặc định với thông báo. Contact validation/receipt/error được kiểm thử bổ sung; không sửa các adapter auth/order/payment trước đây. Kết quả và file thay đổi nằm trong [CUSTOMER_EDITORIAL_REPORT.md](CUSTOMER_EDITORIAL_REPORT.md). Các bảng/kết quả ngày 04/11 phía trên là lịch sử lần đồng bộ trước; chưa có PHP thật.

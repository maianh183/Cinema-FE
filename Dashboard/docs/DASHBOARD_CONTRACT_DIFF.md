# Dashboard ↔ Shared API Contract — 06/11/2026

> Đây là báo cáo của lượt đồng bộ trước khi bổ sung module. **Cập nhật phạm vi mới 06/11/2026:** ADMIN đã có Liên hệ và Nội dung website theo yêu cầu mới; các câu “không phục hồi hai module” trong snapshot dưới đây chỉ mô tả lượt trước. Xem [proposal và kết quả triển khai mới](CONTACT_WEBSITE_CONTENT_API_PROPOSAL.md). O-12 còn OPEN về kỹ thuật PHP, O-01–O-11 không đổi.

## Phạm vi và mức độ xác minh

Nguồn chuẩn: [SHARED_API_CONTRACT.md](../../docs/SHARED_API_CONTRACT.md), phiên bản **draft-1.0, 04/11/2026**; đối chiếu [API_CONTRACT.md](../API_CONTRACT.md), [yêu cầu Dashboard](CODEX_SYNC_DASHBOARD.md), services/pages/mocks/tests thực tế và Customer tại `../Customer` (chỉ đọc). Chỉ chỉnh sửa `C:/cms-delivery/Dashboard`; không đổi framework, theme, routing, dependency hay shared contract, không tạo backend.

**Không endpoint nào đã được xác minh với PHP/MySQL.** “Khớp” trong báo cáo là khớp hợp đồng phía frontend/mock. D-L là kế thừa Dashboard, D-N là đề xuất Dashboard, C-N là Customer, S-N là đề xuất chung, LEGACY là tương thích cũ; không ký hiệu nào chứng minh PHP đã triển khai. O-01–O-12 vẫn OPEN.

## Kết quả đối chiếu services thực tế

Mọi đường dẫn bên dưới tương đối với `VITE_API_BASE_URL`. Quyền ghi gồm create/update/delete theo hành động, phải được kiểm tra lại trên PHP cùng session/branch; UI không phải ranh giới bảo mật. Mock có các handler tương ứng trừ nơi ghi rõ legacy/public.

| Nhóm / mức độ | Endpoint, method và DTO thực tế | Quyền / kết quả / kiểm thử |
|---|---|---|
| Auth D-L + S-N/C-N | GET `/auth/csrf`; POST `/auth/login` `{provider:LOCAL,email,password}`; GET `/auth/me`; POST `/auth/logout` | Đã thêm CSRF trước mutation khi RAM chưa có token. Login nhận nested `{user,csrfToken}` hoặc token-only legacy rồi luôn đối chiếu `/me`; me nhận flat/nested. ID nhân sự là string, CUSTOMER bị từ chối dù wildcard. `transport-contract`, `security`, HTTP transport, UI login. O-02 OPEN. |
| Refresh D-N/OPEN | POST `/auth/refresh` `{}` với cookie/CSRF, `{accessToken?,csrfToken,user?}` | Chỉ chạy khi `VITE_AUTH_REFRESH=true`; mặc định tắt. Giữ single-flight và retry một lần khi opt-in. Không yêu cầu Customer refresh. Unit kiểm tra mặc định tắt; HTTP fixture opt-in kiểm tra refresh thành công/thất bại. |
| Internal profile D-L | PUT `/auth/profile`; POST `/auth/change-password` | Giữ `{name,phoneNumber,birthday,avatarUrl}` và `{oldPassword,newPassword}` nhân sự; không nhầm với `/customers/me`. Không thay chức năng hiện có. |
| Quyền D-N / nhân sự D-L | GET `/permissions`; GET/POST `/employees`; GET `/employees/:eUserId`, `/employees/branch/:branchId`; PUT/DELETE `/:eUserId`; PATCH `/:eUserId/activate` hoặc `/deactivate` | `employees:*`, assign-role riêng; ADMIN vẫn cần permissions, MANAGER chỉ quản lý STAFF đúng scope. Catalog quyền chỉ backend được quyết định quyền có thể cấp. Không đưa salary/permissions ra public. `business`, `security`, calendar và UI nhân sự bảo vệ hành vi hiện có. |
| Customer D-L/D-N | GET `/customers`, `/:cUserId`, `/phone?phone=`; PATCH `/:id/activate` hoặc `/deactivate`; DELETE `/:id` qua resource service | Canonical `cUserId,cName,phoneNumber,sex`; UI hồ sơ chỉ đọc, `customers:update` chỉ khóa/mở khóa, `customers:delete` riêng. Không reset mật khẩu, không PUT profile, không gọi `/customers/me`. POST create helper legacy còn trong service nhưng không có UI tạo khách, không mở rộng luồng. `security` kiểm tra cả ba role bị chặn sửa profile; UI readonly vẫn giữ. O-03 OPEN. |
| Phim/catalog D-L | GET/POST `/movies`, PUT/DELETE `/movies/:movieId`; GET/POST `/catalog/{genres,formats,actors}`, DELETE `/:name` | Giữ `movieId,mName,descript,runTime,genreIds[],formatIds[],actorIds[]`. Catalog query ghi `genre/fName/fullName`; movie đọc hiện dùng arrays tên. Thêm kiểm tra full-list. `movies:*` và lookup có quyền; không đổi tên DTO. **Slug chưa có trong form/payload**, dù seed demo đã có slug; O-04 OPEN. |
| Branch/room D-L | GET/POST `/branches`, PUT/DELETE `/:branchId`; GET `/rooms?branchId`, POST `/rooms`, PUT/DELETE `/rooms/:branchId/:roomId` | Giữ khóa kép phòng; `branches:*` chỉ ADMIN, room theo quyền/phạm vi. Thêm full-list guard. Room không được lookup giá bằng roomId đơn lẻ. UI room/HTTP bulk và test giá mock xác minh. |
| Showtime/seat D-L + D-N | GET/POST `/showtimes`, PUT/DELETE `/:timeId`; GET `/seats/branches/:branchId/rooms/:roomId?showtimeId=:timeId`; POST `…/bulk` | Giữ `timeId`, vé/query `showtimeId` là FK alias, không ID mới. endDate/endTime tính từ runtime, PHP tính lại. Ghế vật lý khác trạng thái giữ theo suất. Đã bỏ ID 0 giả trong adapter chi tiết đơn; mock giá dùng đúng `(branchId,roomId).basePrice + sPrice`, bỏ phụ thuộc rPrice. `shared-contract`, calendar, HTTP/Edge seat và showtime. O-05/O-10/O-11 OPEN. |
| Orders D-L + D-N | GET/POST `/orders`; GET `/orders/:id`; POST `/:id/confirm-payment`, POST `/:id/cancel`, body `{}` | POST POS giữ tickets/addons/branch/paymentMethod/customer; source/creator/status/giá do mock server cấp. Trước confirm/cancel đọc lại detail, kiểm tra STAFF source/PENDING/quyền/home branch. Response phải đúng orderId/branch/source/trạng thái, total số hữu hạn ≥0; không sửa UI nếu lỗi. Khóa/compare-and-set thật vẫn thuộc PHP. PUT/DELETE helper legacy không dùng để đổi trạng thái. `business`, `current-request`, `transport-contract`, HTTP và UI tạo/xác nhận/hủy. |
| Online status C-N/S-N/OPEN | Đọc `AWAITING_PAYMENT` và `EXPIRED` nếu server trả | Adapter giữ nguyên, có nhãn riêng và bộ lọc chỉ xuất hiện khi có trạng thái đó. Không confirm/cancel online, không đếm vào PENDING quầy, không dùng paymentMethod để suy ra source. Mock nếu nhận fixture AWAITING_PAYMENT không cho POS bán trùng ghế; không tự sinh TTL, webhook hay chuyển enum. `shared-contract`, `transport-contract`, HTTP shared-contract. O-01/O-10 OPEN. |
| Voucher D-L + quy tắc D-N | GET/POST `/coupons`, PATCH/DELETE `/:couponId` | `startDate,endDate,releaseNum,availNum,saleOff,minOrderTotal,maxDiscount`; UI không gửi releaseDate/isActive/availNum. Không giảm tổng phát hành; tăng giữ nguyên used; trạng thái theo ngày VN. Giữ test mock từ chối/không tin giá trị client. Không tự kích hoạt voucher legacy cho public. `business`, HTTP voucher; O-08 OPEN. |
| Products D-L + S-N | GET/POST `/food-drinks`, `/merchandise`; GET/PUT/DELETE `/:productId` | Giữ `quantity` đồ ăn và `availNum` tồn merchandise riêng voucher. Service gắn itemType theo endpoint. POS trước đây gộp nhầm khi hai bảng trùng productId: đã dùng `(itemType,productId)` trong chọn/quantity/key/payload; mock phân biệt nhóm, từ chối ID mơ hồ và tính giá từ repository. Không thay quy trình tồn kho. `shared-contract`, UI POS/products. O-11 OPEN. |
| MovieComment D-N | GET `/movie-comments/:commentId` (mock/detail báo cáo); legacy GET `/movies/:id/reviews`, POST `/reviews` helper không dùng cho đánh giá rạp | `commentId,movieId,rating` nguyên 1–5, content nullable; không tự tạo moderation trước công khai. Test `shared-contract`, `schedule-content`. O-07 OPEN. |
| CinemaReview D-N | GET `/cinema-reviews?q=&branchId=&roomId=&page=&pageSize=` | `reviewId,branchId,roomId?`, content; không rating phim. MANAGER/ADMIN theo permission `cinema-reviews:read`; STAFF bị chặn. UI từ chối response ngoài scope, mock lọc trước phân trang. Test `schedule-content`, HTTP review. |
| ContentReport D-N | GET `/comment-reports`; POST `/:reportId/resolve` `{action:DISMISS\|DELETE}` | Giữ reportId khác targetId; alias id chỉ đọc. DISMISS cần update, DELETE cần delete; PENDING→RESOLVED sau ack. Đã thêm guard response CinemaReview ngoài branch và ack đúng ID/status/action tại service. Mock chặn xử lý lại; không HIDE/RESOLVE hay PUT status. MovieComment global theo quyền, không tự gán chi nhánh phim. `business`, `transport-contract`, HTTP hai actions. O-09 OPEN. |
| CMS D-N | GET/POST `/faq`, `/news`, `/categories`; PUT/DELETE `/:id` | resourceService giữ meta/server pagination hợp lệ và fallback client paging full array. FAQ/news status DRAFT/PUBLISHED/HIDDEN. Internal được xem bản nháp; **PHP public API phải lọc PUBLISHED**, không lọc admin list để giả lập public. Customer public adapter đã kiểm tra status. Không phục hồi About/Contacts/Settings/Media page. |
| Upload D-N | GET `/media` picker; POST `/files/upload?folderName=` multipart `file` | Giữ service và form phim/sản phẩm/tin/nhân viên; upload trả URL, không tự save entity. Quyền media và MIME/size/ownership cần PHP kiểm tra. Mock upload phục vụ UI, không lưu file lên PHP. |
| Lịch ngày D-N | GET `/work-schedules/me`, GET/POST `/work-schedules`, PUT/DELETE `/:scheduleId` | STAFF own từ session; MANAGER home branch; ADMIN theo permissions `workshifts:*`. `employeeId` là eUserId string, date/range/overnight và xung đột giữ nguyên; bổ sung full-list guard. Unit calendar/schedule/security, HTTP own/foreign identity/CRUD và UI day-week-month. |
| Lịch tuần LEGACY | Mock GET/POST/PUT/DELETE `/work-shifts`, GET `/work-shifts/detail`, `/work-shifts/branch/:id`; employeeService PUT/DELETE `/employees/:eUserId/work-shifts` | Khóa branch/start/end/wDate giữ nguyên. Không còn standalone shiftService ở source hiện tại, Calendar không gọi các API này; sửa mô tả tài liệu cũ, không phục hồi service/sidebar. Test legacy được giữ. |
| Statistics D-L / System LEGACY | GET `/statistics/overview`, `/revenue/daily`, `/revenue/movie`, `/revenue/branch`, `/occupancy`; GET/PUT `/system/settings`, POST `/system/emails/remind/:id`, `/system/sync-seats/:id` | Full-list guard cho các series; overview object giữ nguyên; mock revenue đọc chung orders sau mutation. System helpers lịch sử không có trang/nút quản trị cấu hình; không bật lại module. |

## Những khác biệt đã sửa

1. Auth: adapter nested session, allowlist login, CSRF bootstrap single-flight; refresh opt-in thay vì tự gọi endpoint chưa chốt.
2. Các service full-array trước đây bỏ qua metadata có thể đếm nhầm một trang. `fullList` chặn metadata total/page không chứng minh đủ danh sách; CMS có pagination vẫn hoạt động. Không thể phát hiện server cắt array mà cố tình bỏ metadata — cần PHP kiểm thử.
3. Orders: guard DTO/scope/ID/tổng tiền; preflight đọc trạng thái hiện tại; chỉ nhận ack đúng; nhãn/lọc online không trộn PENDING quầy. GET preflight không thay transaction PHP và không tự retry mutation khi không rõ kết quả.
4. POS: khóa nhóm sản phẩm, không fake snapshot IDs, mock dùng giá phòng/ghế từ repository. Legacy addons không có itemType chỉ được mock chấp nhận nếu định danh không mơ hồ; PHP phải chốt O-11.
5. Reports: kiểm tra branch của target CinemaReview và ack giải quyết tại service.
6. Đóng gói: đưa `docs/` vào allowlist, không làm thất lạc hợp đồng chung và báo cáo này.

## Các mục OPEN và điểm chưa tương thích

| ID | Tình trạng hiện tại / quyết định còn cần |
|---|---|
| O-01 | **OPEN**. Dashboard đã đọc/hiển thị/lọc online an toàn; PHP và hai FE chưa chốt enum order/payment. Không tạo enum DB hay chuyển đơn online sang PAID. |
| O-02 | **OPEN**. Dashboard chấp nhận nested/legacy + me có ID; refresh mặc định false. PHP chốt cookie namespace/domain/SameSite, CSRF rotation, login/me, logout ack (`loggedOut:true` phía Customer), và có refresh hay không. Logout local không chứng minh đã thu hồi cookie server. |
| O-03 | **OPEN**. Dashboard canonical cUserId/cName/phoneNumber/sex, Customer adapter sang tên UI. Birthday/dob, schema cập nhật và ownership do PHP chốt. Không thêm sửa hồ sơ nội bộ. |
| O-04 | **OPEN**. Seed movie có slug demo nhưng form/payload tạo/sửa không quản lý slug. Chưa bảo đảm phim mới do Dashboard tạo có đường dẫn Customer. Đề xuất PHP sinh/lưu unique slug lúc tạo, giữ ổn định khi đổi mName hoặc có alias/redirect khi đổi slug; cần duyệt chính sách collision/uniqueness/migration, chưa triển khai. |
| O-05 | **OPEN**. timeId/FK alias đã bảo vệ; mock không lấy rPrice làm giá thật. PHP xác nhận rPrice là derived display field, không nguồn tính tiền; validate FK và pricing từ DB. |
| O-06 | **OPEN**. Guard full-list đã thêm, CMS paging giữ nguyên. Nếu PHP muốn paged legacy phải nâng service/UI/stats đồng thời; không tự gọi nhiều trang theo giả định. |
| O-07 | **OPEN**. MovieComment khác CinemaReview; rating và nullable giữ đúng. PHP migration legacy content status sang public VISIBLE/DELETED, không tự công khai/ẩn nội dung cũ. |
| O-08 | **OPEN**. Form/mutation dùng voucher thời gian. PHP phải xử lý isActive=false/releaseDate NOT NULL cũ có audit, không tự mở voucher đã khóa. |
| O-09 | **OPEN**. Mock DELETE resolve mọi PENDING cùng target và giữ tombstone là **chính sách mô phỏng sẵn có**, không phải quyết định PHP mới. Backend chốt multi-report, transaction, audit và idempotency. |
| O-10 | **OPEN**. Mock chống bán trùng theo suất, không có TTL/reservation/stock/coupon/webhook/refund thật. PHP cần chốt và triển khai toàn bộ cạnh tranh online–quầy. Không mô phỏng thu tiền thật. |
| O-11 | **OPEN**. POS dùng composite product key; room giữ khóa kép. PHP cần union public allowlist, itemType rõ ràng và khóa/constraint tương ứng; không giả định productId duy nhất hai bảng. |
| O-12 | **OPEN**. Giữ FAQ/news/upload; không dựng lại module đã gỡ. Nhóm dự án quyết định ownership About/contact info, Contact POST vẫn là API Customer/PHP riêng. |

**Khác biệt catalog cần phối hợp thêm:** Dashboard `/catalog/formats` dùng `{fName}`; movie seed đọc `formats:["2D"]` nên hiện tương thích. Customer movie adapter nhận string hoặc object `formatName/format/name`, chưa nhận `{fName}`. PHP public projection cần trả strings/tên chuẩn đã hỗ trợ; nếu muốn trả object fName phải thỏa thuận adapter Customer trong lượt riêng. Dashboard không đổi tên catalog đã thống nhất, không sửa Customer để che sai lệch.

**Giới hạn khác:** full-array guards chỉ phát hiện vi phạm nhìn thấy trong response; các phòng/ghế/sản phẩm chưa có giao dịch DB thật. Backend phải kiểm tra cả quyền gán cho nhân viên (không vượt người cấp), phạm vi mọi GET/mutation và giá/stock/current status. Không coi UI ẩn nút là đã bảo mật PHP. Không thêm validate birthday/slug hoặc public projection trong internal service để tự giải quyết OPEN.

## PHP cần triển khai và xác minh

- Internal: toàn bộ endpoint ở bảng audit, đặc biệt `/auth/csrf`, `/auth/login`, `/auth/me`, `/auth/logout`, `/permissions`; refresh chỉ nếu được chốt. Cookie/CORS/Origin/CSRF, kiểm tra quyền và scope từ session trên mỗi bản ghi.
- Orders: POST `/orders`, `/:id/confirm-payment`, `/:id/cancel`, GET list/detail và seats theo showtime; transaction khóa ghế/đơn, tính giá DB, nguồn/creator server, chống confirm/cancel lặp, cập nhật thống kê sau commit.
- Work schedules: GET own/list + POST/PUT/DELETE dated assignments, chống trùng ca qua đêm và cross-branch; không đồng nhất ca tuần.
- Reports: GET reviews/reports và POST resolve; atomic target/report, chỉ DISMISS/DELETE, kiểm tra scope trước paging và mutation, invalidation public cache sau xóa.
- Customer/public (Dashboard không gọi): `/public/movies` + `/slug/:slug`, `/public/branches`, rooms, showtimes/seats, products, coupons, FAQ/news/content; `/customers/me`; `/seat-reservations`, `/customer/orders`, payment initiation/history và webhook provider. Triển khai chính xác theo Shared sau khi chốt OPEN, chỉ trả trường public/PUBLISHED, không dùng API admin thay public.
- Kiểm thử tích hợp PHP bắt buộc: 10 nhóm tại mục 12 Shared (auth, DTO/IDs, voucher, race ghế, thanh toán, profile, nội dung, publish, paging, security). Chưa chạy vì chưa có backend.

## Kiểm thử thực tế

Kết quả ở lượt 06/11/2026, Windows / Node v24.11.1 / Microsoft Edge:

| Lệnh | Kết quả |
|---|---|
| `npm ci` | PASS; 368 package cài từ lockfile, không đổi dependency/lockfile. npm báo 14 vulnerabilities (1 low, 2 moderate, 9 high, 2 critical); chưa thực hiện nâng dependency ngoài phạm vi. |
| `npm run check:language` | PASS: 65 JS, 48 JSX, 2 MJS tự phát triển; không TypeScript/Python trong nguồn hoạt động. |
| `npm run lint` | PASS. |
| `npm test` | PASS: 97 tests / 8 files (81 cũ + 16 mới). |
| `npm run build` | PASS: Vite production build. |
| `npm run test:http` | PASS: 22/22 Edge tests (19 cũ + 3 mới), Axios thật với response interception; **không PHP**. Refresh được bật riêng trong test config để giữ coverage legacy optional. |
| `npm run test:e2e` | PASS: 32/32 Edge tests với Mock Mode; gồm POS tạo/xác nhận/hủy, ba vai trò, readonly profile, Calendar và responsive 375/768/1024/1440px. |

Test mới: `tests/shared-contract.test.js` (11), `tests/transport-contract.test.js` (5), `tests/api/shared-contract.spec.js` (3). Giữ toàn bộ bài cũ về STAFF/MANAGER/ADMIN, branch, readonly profile, voucher, reports, schedules/overnight và UI responsive. Hai HTTP fixture confirm/cancel bổ sung GET detail cho preflight, không bỏ assertion cũ. Không kiểm thử đa trình duyệt hay tích hợp PHP trong lượt này.

## File thay đổi

- `src/utils/apiContract.js` (mới).
- `src/services/api.js`, `authService.js`, `orderService.js`, `commentReportService.js`.
- `src/services/movieService.js`, `branchService.js`, `roomService.js`, `showtimeService.js`, `customerService.js`, `employeeService.js`, `couponService.js`, `catalogService.js`, `reportService.js`, `productService.js`, `workScheduleService.js` (full-list đọc, không đổi endpoint).
- `src/mocks/adapter.js`, `src/mocks/orderDraft.js`.
- `src/components/OrderFormModal.jsx`, `src/components/orders/OrderStats.jsx`, `src/components/ui/StatusBadge.jsx`, `src/pages/orders/index.jsx` (chỉ hành vi/hiển thị liên quan hợp đồng).
- `.env.example`, `.env.production`, `playwright.api.config.js`, `scripts/prepare-delivery.mjs`.
- `tests/shared-contract.test.js`, `tests/transport-contract.test.js`, `tests/api/shared-contract.spec.js` (mới); `tests/api/business.spec.js`, `tests/api/current-request.spec.js`.
- `API_CONTRACT.md`, `README.md`, `ASSIGNMENT_CHECKLIST.md`, `docs/DASHBOARD_CONTRACT_DIFF.md` (mới).

Không xóa file nguồn/test; không sửa Customer, shared contract, CSS/theme, router, package.json hoặc package-lock.json. Các output `dist/`, `test-results/`, Playwright reports và node_modules là file sinh tự động đã được gitignore/loại khỏi bản mã nguồn đóng gói.

# Checklist dashboard — 25/10/2026

Đối chiếu yêu cầu bổ sung mới nhất. Dấu hoàn thành chỉ xác nhận frontend và kiểm thử giả lập; không xác nhận PHP/MySQL đã được triển khai.

## Đơn hàng STAFF

- [x] STAFF/MANAGER/ADMIN dùng chung trang, bảng, bộ lọc, phân trang, chi tiết và form tại quầy theo permissions.
- [x] STAFF có hai card Tổng số đơn hàng và Đơn chưa xử lý; tính từ dữ liệu được phép xem, không hardcode hoặc tính riêng trang hiện tại.
- [x] Không có card Đơn đã hủy; vẫn giữ dữ liệu và bộ lọc đơn hủy.
- [x] Chỉ đơn PENDING nguồn STAFF đủ quyền có nút Xác nhận; API thành công mới chuyển PAID và cập nhật thống kê.
- [x] Mock tạo đơn có tham chiếu thật, tính giá từ repository, giữ ghế theo suất; từ chối trùng ghế. UI tạo đơn rồi xác nhận đã được kiểm tra.
- [x] Từ chối response danh sách đơn ngoài phạm vi; backend phải lọc dữ liệu trước khi trả về.
- [ ] Tích hợp thanh toán, giữ ghế có thời hạn, transaction kho và PHP/MySQL thật.

## Calendar và lịch làm việc

- [x] CalendarView dùng chung cho Lịch chiếu và Lịch làm việc; không thêm thư viện Calendar.
- [x] Ngày/Tuần/Tháng, tuần mặc định, trước/sau/Hôm nay/chọn ngày; đổi view giữ ngày chọn, nổi bật hôm nay.
- [x] Sự kiện đúng vị trí/chiều cao theo thời gian, chia cột khi trùng, tách ca qua nửa đêm, xem chi tiết bằng modal.
- [x] Ngày civil và múi giờ Asia/Ho_Chi_Minh; kiểm tra cuối tháng/năm, năm nhuận, ca qua đêm.
- [x] STAFF chỉ gọi /work-schedules/me, không truyền nhân viên/chi nhánh, không tải roster hoặc có hành động quản lý.
- [x] MANAGER cố định branchId của tài khoản; ADMIN toàn hệ thống theo permissions. Cùng form tạo/sửa/hủy một phân công theo ngày.
- [x] Validation ngày/giờ/nhân viên/chi nhánh, kiểm tra trùng; API 409 giữ form/dữ liệu cũ, chỉ cập nhật sau thành công.
- [x] Loading/error/empty và điều khiển lịch vẫn dùng được khi không có ca; mobile cuộn trong Calendar, modal không vượt màn hình.
- [x] Chỉ một menu Lịch làm việc; /employees/workshift redirect /my-schedule. Service/model/handler ca tuần cũ được giữ.
- [ ] PHP triển khai resource /work-schedules, transaction chống trùng và migration mẫu tuần sang phân công theo ngày có audit.
- [ ] Nghỉ phép, ngoại lệ lặp, kéo thả và batch phân công chưa được triển khai.

## Mock data và nhất quán

- [x] 4 chi nhánh, 20 nhân viên, 570 phân công trong 6 tuần tương đối quanh hôm nay, có ca đêm và ngày nghỉ.
- [x] 48 đơn nhiều chi nhánh/ngày/nguồn/trạng thái; tổng đơn và PENDING khớp dữ liệu sau tạo/xác nhận.
- [x] 13 phim, 336 suất, 8 phòng, 320 ghế, 32 khách, 26 sản phẩm, 12 voucher, 15 FAQ, 15 tin tức, 24 bình luận, 32 đánh giá rạp, 20 báo cáo.
- [x] Seed xác định theo anchor ngày Việt Nam; test cả mốc hiện tại và 2032, kiểm tra ID duy nhất/quan hệ/giá/định lượng.
- [x] Repository chung cho CRUD, lịch, đơn và thống kê. ID nhân viên mới dạng chuỗi, dùng ngay được trong phân công.
- [x] Xóa các bản ghi chính đang được tham chiếu trả 409; báo cáo hydrate tên từ repository, snapshot đơn giữ lịch sử.
- [x] Mock bật tường minh bằng VITE_USE_MOCK, không tự thay API thật bằng seed; reload reset, không persist bí mật.
- [ ] Mock không thay thế concurrency, transaction DB, webhook, gửi email hoặc upload PHP thật.

## Chức năng trước đó được giữ

- [x] Voucher không ngày phát hành/isActive; PREACTIVE/ACTIVE/EXPIRED thống nhất, không giảm releaseNum, tăng lượng giữ số đã dùng.
- [x] MovieComment có rating 1–5, content nullable; CinemaReview chi nhánh/phòng tùy chọn, không tự gán rating phim.
- [x] Đánh giá rạp chỉ xem/tìm/lọc/phân trang; báo cáo nội dung chỉ DISMISS/DELETE, thành công mới RESOLVED, giữ quyết định và lịch sử.
- [x] ADMIN không có Cấu hình; profile/đổi mật khẩu/đăng xuất và cấu hình kỹ thuật vẫn giữ.
- [x] Giữ module phim, lịch chiếu, chi nhánh, phòng/ghế, khách hàng, nhân viên, sản phẩm, FAQ, tin tức và thống kê.
- [x] Không khôi phục Website Content, Contacts, Media riêng hoặc workflow duyệt bình luận đã bị loại bỏ theo phạm vi trước đó.

## Tài liệu và kiểm thử

- [x] README viết lại theo mã hiện tại; đồng bộ .env.example, API_CONTRACT và CHANGE_REPORT.
- [x] Vitest: 55/55 đạt; ESLint đạt; Vite production build đạt.
- [x] HTTP giả lập qua Axios, Mock Mode tắt: 19/19 đạt.
- [x] UI Edge: 28/28 đạt sau khi chạy lại các test đã sửa selector; có tạo/xác nhận/hủy đơn STAFF, lịch theo quyền/CRUD, bảo vệ ghế chưa lưu và responsive 375/768/1024/1440px.
- [ ] PHP/MySQL thật, đa trình duyệt và typecheck riêng chưa có. Ứng dụng dùng JS/JSX, package.json không có script typecheck.


## Bổ sung theo yêu cầu giao diện và thao tác mới

- [x] Email/điểm bỏ khỏi bảng khách hàng cho mọi role, vẫn hiển thị ở Chi tiết.
- [x] STAFF có hủy đơn PENDING, permission orders:cancel, modal xác nhận; lỗi HTTP/response sai không thay trạng thái. Giữ tổng đơn, giảm PENDING và giải phóng ghế trong mock.
- [x] MANAGER không chọn chi nhánh ở đơn hàng/lịch làm việc/form phân công; cố định branchId. ADMIN giữ bộ chọn.
- [x] Bỏ công cụ Sweetbox, mặc định sơ đồ Chỉ xem, Chỉnh sửa khi cần, Cancel khôi phục snapshot và Lưu thay đổi qua API.
- [x] Cảnh báo bản nháp khi đổi phòng/chi nhánh, điều hướng, Back, đăng xuất; lưu lỗi giữ nguyên bản nháp. Reload có cảnh báo native, đã kiểm tra bằng Edge.
- [x] Calendar lịch chiếu mặc định tuần; badge FINISHED/SCHEDULED/ON AIR khác màu và cập nhật theo giờ Việt Nam mỗi 30 giây.
- [ ] PHP triển khai POST /orders/:id/cancel nguyên tử, permission/audit/giải phóng reservation và kiểm tra bulk seats. Chưa có backend thật để kiểm thử.
- [ ] Trình duyệt không cho nút lưu API tùy chỉnh khi đóng tab/reload; người dùng chọn ở lại rồi lưu. Không cam kết giữ bản nháp khi buộc đóng ứng dụng.

## Hồ sơ khách hàng chỉ xem — yêu cầu mới nhất

- [x] ADMIN/MANAGER/STAFF không có form hoặc nút lưu thông tin khách hàng; Chi tiết chỉ hiển thị dữ liệu.
- [x] Gỡ customerService.update; chặn request cập nhật hồ sơ trong frontend/mock, kể cả quyền wildcard.
- [x] Giữ quyền khóa/mở khóa và xóa tài khoản; customers:update cũ chỉ dùng cho trạng thái tài khoản, không sửa hồ sơ.
- [x] Lint/build đạt; 13 test phân quyền và 3 test UI liên quan đạt trong lượt này.
- [ ] PHP phải kiểm tra session khách hàng và chủ thể; phiên nhân sự không được cập nhật hồ sơ khách hàng. Đã ghi API_CONTRACT.

## Chuẩn hóa JavaScript/JSX — 01/11/2026

- [x] Source: 51 JS, 52 JSX, 2 CSS; hash toàn bộ src giữ nguyên, không đổi giao diện/API/quyền/nghiệp vụ.
- [x] Gỡ 6 Python scripts và 4 script migration phụ thuộc compiler TypeScript; không chạy lại migration cũ.
- [x] Gỡ 5 TSX TailAdmin tham chiếu; giữ các bản JSX và giấy phép MIT. Breadcrumb không dùng không được dựng lại.
- [x] ZIP Next.js (60 TS/TSX) và bản dự án lồng Dashboard được bảo toàn ngoài workspace; vị trí/hash tại LANGUAGE_AUDIT.md.
- [x] Gỡ direct typescript, @types/node, @types/react, @types/react-dom và plugin ESLint không dùng. Dependency gián tiếp do npm quản lý.
- [x] JS configs cho Vite, ESLint, Vitest, Playwright; không cần tsc/ts-node/tsconfig/Next runtime.
- [x] check:language dùng parser JavaScript/JSX, báo file vi phạm, exit 1; 23 test kiểm tra bộ guard.
- [x] npm ci cuối thành công, check:language/lint/build đạt, 81 unit + 32 UI + 19 HTTP tests đạt. Phạm vi và trình tự xác minh ghi trong LANGUAGE_AUDIT.md.
- [x] README mô tả stack và lệnh hiện tại; API_CONTRACT.md có thật, liên kết hợp lệ; không tuyên bố PHP đã triển khai.
- [x] Có prepare:delivery để tạo source sạch kèm lockfile, không chứa thư viện cài sẵn, output/cache/report hoặc backup lịch sử.
- [ ] PHP/MySQL thật và kiểm thử đa trình duyệt không thuộc đợt dọn frontend này.

## Đồng bộ Shared API Contract — 06/11/2026

- [x] Đọc [Shared draft-1.0](../docs/SHARED_API_CONTRACT.md), API internal và Customer (chỉ đọc); giữ shared contract nguyên trạng.
- [x] Session nested/legacy, CSRF trước login/mutation, refresh tùy chọn và không cấp quyền internal cho CUSTOMER.
- [x] PENDING quầy tách AWAITING_PAYMENT/EXPIRED; confirm/cancel chuyên biệt và kiểm tra response, không tự gán PAID.
- [x] Composite room/product IDs, FK showtimeId → timeId và giá mock từ phòng/ghế; không tin giá client.
- [x] Giữ hồ sơ khách readonly, voucher, báo cáo DISMISS/DELETE, lịch ngày và upload; không khôi phục module đã gỡ.
- [x] Thêm 16 unit/transport tests và 3 HTTP browser tests; giữ 81 unit và 19 HTTP tests trước đó.
- [x] Tạo [báo cáo khác biệt](docs/DASHBOARD_CONTRACT_DIFF.md), cập nhật API_CONTRACT/README và đóng gói thư mục docs.
- [ ] PHP xác minh endpoint/transaction/session/scope, chốt O-01–O-12; frontend/mock PASS không đánh dấu hoàn tất backend.

Kết quả lệnh và phạm vi browser mới nhất nằm trong báo cáo khác biệt; các con số ở mục trước là mốc lịch sử, không thay thế kết quả lần này.

## Phạm vi mới: Liên hệ và Nội dung website — 06/11/2026

Yêu cầu mới thay thế riêng các mục lịch sử nói không có hai module này. Không thay đổi quyết định về Settings, Media page, customer profile hoặc các mục OPEN khác.

- [x] Routes/sidebar Liên hệ và Nội dung website; ADMIN theo permission, chặn MANAGER/STAFF/CUSTOMER.
- [x] Contacts GET list/detail, search/status/server paging/global-unread counts, manual status và confirm delete; guest POST giữ DTO/receipt Customer.
- [x] Site-content sáu section đúng schema, save từng section, preview/upload/plain text validation/unsaved guard; không sửa giá vé.
- [x] Mock seed/handlers/public projection, validation, test role/mutation/count/section isolation và lỗi HTTP/upload.
- [x] API_CONTRACT/README/Shared scope/proposal cập nhật; không sửa Customer hoặc tạo backend PHP.
- [ ] PHP xác minh RBAC/persistence/CSRF/rate limit/retention/concurrency/upload/cache; Customer reader triển khai trong lượt riêng.

Kết quả kiểm thử và file thay đổi: [CONTACT_WEBSITE_CONTENT_API_PROPOSAL.md](docs/CONTACT_WEBSITE_CONTENT_API_PROPOSAL.md).

- [x] Lượt bổ sung: check:language/lint/build PASS, 106 unit/mock + 37 UI Edge + 24 HTTP giả lập PASS; chưa kiểm thử PHP thật.

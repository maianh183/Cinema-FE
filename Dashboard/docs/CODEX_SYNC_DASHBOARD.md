# Prompt Codex — Đồng bộ Internal Dashboard với SHARED_API_CONTRACT.md

Bạn là Senior Frontend Engineer chuyên React + Vite + JavaScript/JSX, REST API, RBAC và quản trị rạp chiếu phim. Hãy làm việc **chỉ trong repository Dashboard**. Đặt `SHARED_API_CONTRACT.md` vào `../../docs/SHARED_API_CONTRACT.md` (file do người dùng cung cấp). Đây là hợp đồng thiết kế chung **được xây trên chính Dashboard API_CONTRACT.md hiện có**, còn Customer API_CONTRACT là nguồn bổ sung các endpoint public. Đối chiếu services, pages, mocks, tests, README và API_CONTRACT hiện tại, **chỉ sửa sai lệch thực sự**. Customer repo chỉ đọc.

**Nguyên tắc:** Hợp đồng D-L cũng chưa được PHP xác minh. Các mục D-N/C-N/S-N/OPEN không chứng minh backend tồn tại. Không tự đổi API hoặc DB theo suy đoán, không tự biến API public thành internal. Không chuyển framework, không thay UI/theme, không viết backend, không làm sống lại module đã xóa theo yêu cầu.

## Nhiệm vụ

1. **Audit:** Lập `docs/DASHBOARD_CONTRACT_DIFF.md`: từng internal endpoint/DTO, method, request, response, quyền, mock, test; đánh dấu khớp/chưa khớp/chưa được PHP xác minh. Ưu tiên giữ API/field names Dashboard gốc (`movieId,mName,timeId,branchId,roomId,cUserId,eUserId,releaseNum,availNum`).
2. **Order status:** Giữ quầy STAFF tạo `PENDING`, `POST /orders/:id/confirm-payment` chuyển `PAID`, `/orders/:id/cancel` chuyển `CANCELLED` khi hợp lệ; không PUT status tùy ý. Customer đề xuất thêm `AWAITING_PAYMENT`/`EXPIRED` **OPEN**: khi Dashboard đọc đơn online chưa thanh toán, phải hiển thị an toàn và không coi là PENDING tại quầy, không cho confirm/cancel như STAFF; thêm view adapter/test tương thích **nếu không phá contract hiện có**. Không tự quyết định enum PHP.
3. **Auth/RBAC:** Đối chiếu `/auth/login`, `/auth/me`, `/auth/refresh`, `/auth/logout`, `/permissions`. Đồng bộ mục tiêu cookie + CSRF nhưng giữ refresh tùy chọn/OPEN cho tới khi PHP chốt; không sửa luồng Customer login. Chặn CUSTOMER tại internal route, PHP scope theo session. Kiểm tra STAFF/MANAGER branch filter, schedule own vs branch, actions orders, role permissions.
4. **Customer profile:** Dashboard chỉ GET/khóa/mở khóa/xóa theo quyền; không PUT hồ sơ khách, reset mật khẩu, avatar hoặc `customers/me`. Kiểm tra internal UI/service/Mock Mode không còn khả năng chỉnh `cName,phoneNumber,sex` của khách; customer tự chỉnh qua endpoint riêng.
5. **Movie/Showtime/Room/Seat:** Giữ `timeId`, room khóa kép, `showtimeId` trong ticket snapshot chỉ là FK alias. **Movie `slug` OPEN**: xác định Dashboard hiện có trường này chưa; chỉ bổ sung admin editor/service nếu schema PHP/luồng được chốt hoặc đưa vào issue. `rPrice` không phải số tiền server phải tin. Sơ đồ ghế theo suất/physical seat khác nhau.
6. **Voucher/product:** Không `releaseDate,isActive` hay chỉnh trực tiếp voucher `availNum`; không giảm `releaseNum`, cập nhật lượt còn lại nguyên tử. Product status theo ngày/tồn. Không nhầm `availNum` merchandise với voucher. Bảo toàn adapters nếu backend vẫn legacy, đánh dấu cần PHP migration.
7. **MovieComment/CinemaReview/ContentReport:** Bình luận phim sao nguyên 1–5, content nullable; đánh giá rạp gắn branch/room tùy chọn. Báo cáo phân biệt targetType, chỉ có hai actions DISMISS/DELETE và response PENDING→RESOLVED nguyên tử; không có HIDE/duyệt trước, không cho sửa status trực tiếp. Scope review/report theo quyền chi nhánh, không lộ dữ liệu ngoài scope.
8. **FAQ/News/Public:** Giữ CMS FAQ/news, public chỉ PUBLISHED theo hợp đồng; không sửa public FE. Không khôi phục các module `Nội dung website`, `Liên hệ`, `Thư viện Ảnh`, `Cấu hình` hoặc reset mật khẩu khách hàng đã bị gỡ. Vẫn giữ upload sử dụng trong biểu mẫu và các endpoint legacy hữu ích.
9. **Lịch làm việc:** Calendar `/work-schedules`, STAFF chỉ `/me`, MANAGER branch của tài khoản, ADMIN theo quyền. Không nhầm với `/work-shifts` ca tuần legacy. Không làm trở lại sidebar Ca làm việc riêng.
10. **Mapping và tài liệu:** Giữ `API_CONTRACT.md` Dashboard là đặc tả internal; thêm đoạn tham chiếu `../../docs/SHARED_API_CONTRACT.md` và liệt kê O-01–O-12 chưa chốt với PHP. Bổ sung/update tests và mock theo service thực tế. Không xóa các bảo vệ và test hiện có chỉ để pass.

## Điều cấm

- Không sửa Customer repository, không xây public site trong Dashboard.
- Không tự đổi DB schema hoặc đáp ứng PHP bằng Node/Express/Java.
- Không đánh dấu một API đã tích hợp PHP chỉ vì mock trả thành công.
- Không tự suy ra quyền từ tên `ADMIN/MANAGER/STAFF` thay vì permission server.
- Không thay đổi `PENDING→PAID` của STAFF để dùng luồng online.

## Kiểm thử/bàn giao

Chạy đúng các npm scripts có sẵn (`check:language`, `lint`, `test`, `build`, E2E nếu khả dụng). Test đặc biệt: role/branch scope, PENDING STAFF vs AWAITING_PAYMENT CUSTOMER, confirm/cancel, timeId alias, voucher, report resolution, readonly customer profile. Báo cáo file thay đổi, lỗi còn lại, API PHP cần chốt; nếu code đã khớp thì **chỉ sửa tài liệu/test cần thiết**, không thay UI vô cớ. Tạo `docs/DASHBOARD_CONTRACT_DIFF.md`. **Triển khai trực tiếp những thay đổi có cơ sở xác minh.**

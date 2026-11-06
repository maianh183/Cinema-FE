# Prompt Codex — Đồng bộ Customer Frontend với SHARED_API_CONTRACT.md

Bạn là Senior Frontend Engineer chuyên React + Vite + JavaScript/JSX, REST API và frontend contract testing. Hãy làm việc **chỉ trong repository Customer Frontend**. Đặt `SHARED_API_CONTRACT.md` vào `../../docs/SHARED_API_CONTRACT.md` (file do người dùng cung cấp), dùng nó làm tham chiếu **thiết kế chung dựa trên Dashboard**, và đối chiếu với `API_CONTRACT.md`, services, mocks, routes, tests hiện tại. Dashboard repo chỉ đọc, **không sửa**.

**Quan trọng:** Tài liệu chung ghi `D-L`, `D-N`, `C-N`, `S-N`, `OPEN`. Không endpoint nào đã được PHP backend xác minh. Không coi những phần `OPEN`/`S-N` là backend đã hỗ trợ; không sửa code đang chạy theo suy đoán. Chỉ thay đổi ở nơi thực sự có lệch hoặc lỗi; nếu đã đúng thì giữ nguyên. Không chuyển framework, không thay theme, không thêm backend JavaScript/Node, không viết lại ứng dụng.

## Nhiệm vụ

1. **Audit và lập bảng sai lệch** theo từng service: endpoint đang gọi, method, request fields, response shape, auth, quyền, mock, test; so với `SHARED_API_CONTRACT.md`. Phân biệt lỗi chắc chắn, alias có adapter hợp lệ, backend OPEN. Ghi tại `docs/CUSTOMER_CONTRACT_DIFF.md`.
2. **Auth:** Đối chiếu `/auth/login`, `/auth/me`, `/auth/csrf`, logout, change-password, `/customers/me`, avatar. Giữ cookie HttpOnly + CSRF, không localStorage secrets. Không tự bật `/auth/refresh` vì dashboard mới đề xuất; chỉ thiết kế adapter/đánh dấu OPEN cho shape login và namespace cookie. Không tự cấp quyền nội bộ cho CUSTOMER.
3. **Customer profile:** Ưu tiên canonical `cUserId,cName,phoneNumber,sex`; ánh xạ có kiểm soát `userId,fullName,phone,gender` trong UI/adapter. `birthday/dob` chưa được PHP xác nhận: không làm mất dữ liệu, không gửi field không có trong contract đã xác nhận. `PUT /customers/me` chỉ sửa chính chủ; không sửa internal `/auth/profile`.
4. **Movie/Showtime/Seat:** Đối chiếu `movieId,mName,timeId,branchId,roomId` và khóa kép room; `showtimeId` chỉ là tham chiếu `timeId` trong vé. Kiểm tra `slug` movie chưa được Dashboard xác minh; không tự phát minh route/API admin. `rPrice` là read-only/derived chưa chốt; khi checkout không coi giá client là sự thật. Seat availability theo **suất chiếu**, không theo ghế vật lý dùng chung.
5. **Orders/payment:** Giữ tách luồng Customer. `AWAITING_PAYMENT` và `EXPIRED` là **C-N/OPEN**; sửa Mock Mode/UI để không coi đơn online chưa trả tiền là `PAID` hoặc đơn `PENDING` tại quầy. Không gọi `POST /orders/:id/confirm-payment`. Trạng thái PAID chỉ sau PHP/webhook xác minh; redirect không là bằng chứng. Chưa chốt enum PHP thì thêm adapter/contract tests và ghi blocker, không fake API.
6. **Products/vouchers:** Public sản phẩm là hợp nhất Food/Drink và Merchandise với khóa `(itemType,productId)`, không nhập nhằng `availNum` tồn kho merchandise với lượt voucher. Voucher không `releaseDate/isActive`, chỉ public những voucher còn hiệu lực và lượt dùng, PHP kiểm tra cuối cùng.
7. **Bình luận/đánh giá/báo cáo:** `MovieComment` có `movieId`, sao nguyên 1–5, content nullable; `CinemaReview` có `branchId`, `roomId` tùy chọn, không rating phim; `CommentReport` có `targetType,targetId,reason`. Khách chỉ POST report PENDING, không resolve/xóa nội dung. Public chỉ hiện nội dung VISIBLE, không lộ dữ liệu nhân sự.
8. **FAQ/News/Contact:** FAQ và News chỉ đọc PUBLISHED; tags news vẫn là chuỗi; contact POST phải nhận phản hồi server trước khi báo thành công. Không giả định Dashboard còn module quản lý nội dung website/liên hệ.
9. **Danh sách và pagination:** Các public endpoints đang dùng full array để lọc/phân trang client. Không tự chuyển sang server pagination nếu PHP chưa cung cấp `meta.total` và UI/service chưa cùng thay đổi.
10. **Mocks/tests/tài liệu:** Đồng bộ fixture với `SHARED_API_CONTRACT.md`, bổ sung test cho các mapping/profile, sai loại ID, order unpaid, report types, voucher time, list/error envelopes. Cập nhật `API_CONTRACT.md`, README nếu cần. Các mục OPEN phải ghi rõ và không đánh dấu tích hợp thật.

## Điều cấm

- Không sửa Dashboard repository, PHP backend giả định, DB schema hoặc business rules đã thống nhất.
- Không cố biến mọi public URL thành `/movies` hoặc các URL quản trị.
- Không tự thay `mName` thành `title`, `timeId` thành `showtimeId`, `cUserId` thành `userId` trong API nếu không có adapter/migration.
- Không làm mất booking/checkout, light theme, JS-only, Mock Mode.
- Không gọi endpoint chưa tồn tại như thể đã triển khai; trong production hiển thị lỗi trung thực.

## Kiểm thử/bàn giao

Chạy các script thực sự tồn tại trong `package.json` (`check:language`, `lint`, `test`, `build` và E2E nếu môi trường cho phép). Ghi lệnh và kết quả thật. Kết thúc bằng danh sách thay đổi, những chỗ đã khớp nên giữ nguyên, mismatch còn lại, endpoint PHP cần bổ sung, và bảng mapping Customer↔Shared tại `docs/CUSTOMER_CONTRACT_DIFF.md`. **Thực thi sửa mã nguồn thật tại những điểm đã xác minh**, không chỉ viết kế hoạch.

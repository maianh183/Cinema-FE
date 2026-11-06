# Audit JavaScript/JSX — 01/11/2026

## Phạm vi và kết quả rà soát

`src/` có **51 file .js, 52 file .jsx, 2 file .css**. Không có TS/TSX/MTS/CTS/Python trong source hoạt động. React + Vite, HTML/CSS/SVG/JSON và toàn bộ logic nghiệp vụ giữ nguyên. Không khôi phục Next.js, không đổi API, quyền hoặc giao diện.

Đối chiếu SHA-256 từng file `src/` với bản bảo toàn: toàn bộ source giống trước khi dọn. Không có component hoặc logic ứng dụng nào bị chỉnh trong đợt này.

Các npm scripts cũ chỉ gọi Vite, ESLint, Vitest, Playwright. Không có caller của những script migration dưới đây trong source/config/tests. Các script sửa chuỗi hoặc chuyển đổi nguồn cũ một lần; chạy lại có thể ghi đè chức năng mới nên đã loại bỏ, không chuyển sang công cụ bảo trì mới.

| File đã bỏ | Vai trò cũ |
|---|---|
| scripts/archive-next.py | Đóng ZIP source Next.js rồi xóa nguồn cũ |
| scripts/prepare-migration.py | Đổi package.json sang Vite |
| scripts/fetch-tailadmin.py | Tải bản tham chiếu template |
| scripts/complete-lists.py | Chèn bộ lọc, lịch và phân trang một lần |
| scripts/finalize-ui.py | Sửa lỗi giao diện/service/permission bằng thay chuỗi |
| scripts/fix-business.py | Sửa nghiệp vụ trên phiên bản trước |
| scripts/migrate.mjs | Chuyển TS/TSX sang JS/JSX bằng TypeScript compiler |
| scripts/integrate-tailadmin.mjs | Chuyển các TSX template và chép license |
| scripts/label-controls.mjs | Chèn aria-label bằng compiler API |
| scripts/refine-legacy.mjs | Chèn permission/pagination, dọn Next cũ |

Đã bỏ `tmp/` (tham chiếu TailAdmin, metadata tải về, bản trích assignment), các SVG mẫu không có tham chiếu `public/{next,vercel,globe,window,file}.svg`. Giữ `assignment.pdf`, poster thực tế, mọi JSX chính và `licenses/TailAdmin-MIT.md`.

## Đối chiếu TailAdmin

Năm TSX tham chiếu được bỏ: `ComponentCard.tsx`, `PageBreadCrumb.tsx`, `ui/table/index.tsx`, `SidebarContext.tsx`, `AppLayout.tsx`.

- Card và table có phiên bản JSX giữ props, nội dung và cấu trúc hiển thị.
- SidebarContext và AppLayout đã tích hợp JSX, tùy chỉnh responsive, header, navigation và outlet cho dashboard.
- PageBreadCrumb không còn component/caller trong ứng dụng hiện tại; không dựng lại UI đã bỏ chỉ để khớp template.
- Giấy phép/attribution còn trong THIRD_PARTY_NOTICES.md và licenses/.

## Bảo toàn lịch sử ngoài bản bàn giao

Đã kiểm tra ZIP Next.js: 32 TSX + 28 TS, cùng CSS, tài nguyên và cấu hình lịch sử. Không có runtime/import nào dùng ZIP.

Backup tại **`C:\cms-dashboard-backups\javascript-cleanup-2026-10-31\pre-vite-source.zip`**. SHA-256 trước và sau sao chép giống nhau:

```text
25F04E6633ACB8AA614254C6865613740FACC0B8EDA17C72E67B5C10123F2EB7
```

Phát hiện thêm bản dự án lồng `Dashboard/`; source và test trùng bản gốc lúc audit. Đã chuyển nguyên bản sang **`C:\cms-dashboard-backups\javascript-cleanup-2026-10-31\Dashboard`**, không xóa dữ liệu riêng hay dependency bên trong. Thư mục này cũng có ZIP cùng hash. Đây là backup ngoài dự án, không tham gia build hoặc bàn giao.

## Dependencies và cấu hình

- Gỡ direct devDependencies: `typescript`, `@types/node`, `@types/react`, `@types/react-dom`.
- Gỡ thêm `eslint-plugin-react-hooks`: không được import hoặc cấu hình trong ESLint hiện tại. Các thư viện runtime còn lại có tham chiếu trong source.
- Dùng `espree` trực tiếp cho công cụ kiểm tra cú pháp JavaScript/JSX (cũng là parser ESLint); không dùng compiler TypeScript hoặc Babel TypeScript plugin.
- npm quản lý lại lockfile và node_modules. Không sửa thủ công thư viện bên thứ ba; các kiểu npm cần gián tiếp vẫn được giữ.
- `package.json`: thêm check:language, prepare:delivery; mở rộng lint tới scripts và config. Giữ dev/build/preview/test/e2e/http.
- `eslint.config.js`: nhận JS/JSX/MJS/CJS; loại output khỏi lint. Vite/Vitest/Playwright đều là config JS; không có tsconfig/ts-node/tsc/Next runtime.
- `.gitignore`: dependency, dist, cache, reports, delivery và dữ liệu lịch sử không thuộc source bàn giao.
- `API_CONTRACT.md` có trong workspace gốc và được đưa vào bản bàn giao; không cần dựng hợp đồng khác từ suy đoán.

## Kiểm tra và giới hạn

Lượt cài sạch đầu phát hiện lockfile lệch `undici-types` và `@emnapi/wasi-threads`. Đã sửa bằng npm install/update, không sửa thủ công lockfile hoặc node_modules. Hai phiên bản gián tiếp được npm cập nhật: `undici-types` 6.21.0 → 8.9.0, `@emnapi/wasi-threads` 1.2.1 → 1.2.3. Các phiên bản dependency còn dùng khác giữ nguyên. Lượt npm ci cuối thành công với 417 packages sau khi gỡ plugin lint dư. Lockfile không còn package `typescript`, nhưng vẫn có 20 package `@types/*` gián tiếp của thư viện; không loại bỏ chúng bằng tay.

| Lệnh/kiểm tra đã chạy | Kết quả |
|---|---|
| npm ci --no-audit --no-fund | Đạt, 417 packages |
| npm run check:language | Đạt: 70 JS + 52 JSX + 2 MJS trên source, tests, scripts và config |
| npm run lint | Đạt, gồm scripts và config |
| npm test | 81/81 đạt trong 6 file, gồm 23 test ngôn ngữ |
| npm run build | Đạt, Vite 7.3.7 |
| npm run test:e2e | 32/32 đạt trên Edge |
| npm run test:http | 19/19 đạt trên Edge, Mock Mode tắt và HTTP responses giả lập |
| Liên kết cục bộ README | 6/6 tồn tại, gồm API_CONTRACT.md |
| Hash source so với trước dọn | Tất cả file src giống nhau |

UI suite chạy sau khi dọn source/TypeScript và trước bước gỡ plugin ESLint không dùng. Sau bước cuối đã chạy lại npm ci, check:language, lint, toàn bộ unit tests, build và HTTP. Không sửa/xóa test nghiệp vụ để đổi kết quả.

Các chức năng được kiểm tra: đăng nhập/phiên/401/403, RBAC và branch scope, CRUD phim/sản phẩm/FAQ/nhân viên, khách hàng chỉ xem, voucher giữ số đã dùng, đơn tại quầy và xác nhận/hủy, sơ đồ ghế/cảnh báo chưa lưu, lịch cá nhân/quản lý, phân biệt review/report và xử lý nguyên tử, điều hướng, upload validation, responsive 375/768/1024/1440px. Mock integrity và quan hệ dữ liệu cũng được unit test.

`prepare:delivery` tạo bản source bằng danh sách cho phép, giữ lockfile, config, tests, tài liệu và license. Không đưa node_modules/dist/cache/report/tmp/archive/bản dự án lồng hoặc .env riêng vào bàn giao. Output build và báo cáo/screenshot test trong workspace được dọn sau khi kiểm thử; có thể tạo lại bằng các lệnh README.

Bộ kiểm tra ngôn ngữ phân tích cú pháp chuẩn bằng Espree; không coi từ `type/interface/enum` trong thuộc tính/chú thích là TypeScript. Kiểm tra import và lệnh thực thi nhận diện được tĩnh; không phải sandbox an ninh hay bộ chứng minh cho chuỗi lệnh được tạo động lúc runtime. Không quét source nội bộ npm hoặc giải nén dependency. Backend PHP/MySQL chưa có, HTTP tests dùng phản hồi giả lập.

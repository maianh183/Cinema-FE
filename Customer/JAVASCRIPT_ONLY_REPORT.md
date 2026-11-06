# Rà soát JavaScript-only — 2026-11-04

Customer Frontend tiếp tục dùng React 19 + Vite 7 + React Router 7, JavaScript ES Modules/JSX, HTML, CSS và tài nguyên JSON/SVG/ảnh. Không chuyển framework, không viết lại components hoặc thay đổi API/nghiệp vụ/Light Theme.

## Kết quả kiểm tra mã nguồn

| Phạm vi | JS | JSX | MJS | TS/TSX/MTS/CTS/Python |
|---|---:|---:|---:|---:|
| `src/` | 6 | 17 | 0 | 0 |
| Toàn bộ mã tự viết, gồm cấu hình/scripts/tests | 17 | 17 | 3 | 0 |

`npm run check:language` kiểm tra 59 file tự phát triển/tài liệu/tài nguyên trong bản bàn giao, trong đó 37 file JavaScript/JSX/MJS được parse; 0 vi phạm. Không tính dependencies, build/cache, kết quả test hoặc backup lịch sử.

Không tìm thấy config Next.js/TypeScript còn hoạt động, CI gọi Python, npm lifecycle gọi Python hoặc `tsc`. Không có direct dependency `typescript`, `ts-node`, `tsx` hay Next.js. Declaration và dependency gián tiếp trong npm được giữ nguyên, không sửa mã nguồn bên thứ ba.

Đã đối chiếu SHA-256 trước/sau cho **33 file** thuộc `src/`, `public/`, `index.html`, `API_CONTRACT.md`: không có thay đổi byte nào. `src/mocks/public-seed.json` được giữ nguyên. Mọi thay đổi của đợt này nằm ở tooling, tests, đường dẫn output và tài liệu.

## Phân loại và dọn dẹp

| Nhóm | Xử lý |
|---|---|
| Mã hoạt động: src, scripts, tests, configs | Giữ trong bản bàn giao; checker dùng ESLint parser cho JS/JSX |
| Tài liệu: README, API, assignment, các báo cáo | Giữ; sửa tham chiếu backup/output lịch sử và cập nhật hướng dẫn |
| Output: node_modules, dist, coverage, cache | Không đóng gói; cài/build lại bằng npm |
| Kết quả test mới | `test-results/`, `playwright-report/`; ignore và không đóng gói |
| 64 file artifacts lịch sử | Đưa ra kho lưu riêng, đối chiếu toàn bộ SHA-256 |
| Hai thư mục legacy rỗng `components/`, `lib/` ở root | Loại bỏ; không phải thư mục component/lib trong src |

Kho lưu riêng trên máy thực hiện: `C:/cms-fe-backups/2026-11-04-js-only/`. Thư mục con `artifacts/` giữ nguyên 64 file trước dọn dẹp. Danh mục từng file, phân loại và SHA-256 nằm trong [CLEANUP_MANIFEST.json](CLEANUP_MANIFEST.json). Kho lưu này không thuộc repository hoặc ZIP bàn giao và không cần khi chạy ứng dụng.

Các file chính đã loại khỏi repository/bản bàn giao:

- `artifacts/apply-light-theme.py`: công cụ chỉnh theme một lần, không có caller trong npm/CI/tests/tooling đang dùng. Không chạy lại, không chuyển sang MJS vì migration đã hoàn tất.
- `artifacts/finalize-report.py`: công cụ báo cáo migration một lần, không có caller đang dùng. Không cần giữ trong bộ công cụ frontend.
- `artifacts/original-customer.zip`: 79 entries, chứa 62 file TS/TSX lịch sử; không được import bởi runtime/build. Đã bảo toàn nguyên vẹn ngoài bản bàn giao.
- `artifacts/before-light-theme.zip`: 33 entries, không có TS/TSX; snapshot giao diện cũ được bảo toàn nguyên vẹn ngoài bản bàn giao.
- 48 ảnh test cũ, mock build, kết quả npm audit/validation, bản trích assignment và hash lịch sử: cùng chuyển ra kho lưu; danh sách đầy đủ trong manifest.

Không xóa vĩnh viễn bản sao lịch sử duy nhất. `artifacts/` không còn trong workspace và test không tạo lại thư mục này. `node_modules/` và output mới vẫn có thể tồn tại cục bộ sau kiểm thử nhưng không nằm trong ZIP bàn giao.

## Công cụ và file thay đổi

- **Thêm `scripts/check-language.mjs`**, gọi qua `npm run check:language`. Duyệt source/config/tooling, phát hiện đuôi ngôn ngữ không phù hợp, TypeScript được đổi đuôi thành JS/JSX, compiler imports, `import type`/interface/enum/type assertions qua parser, npm scripts, lệnh child_process và cấu hình command tĩnh, Node loader/import hooks, shebang và CI/shell commands phổ biến. Có báo file:dòng:cột, thống kê và exit code khác 0 khi vi phạm. HTML/CSS/JSON/SVG/ảnh hợp lệ được giữ nguyên.
- **Sửa `scripts/import-public-fixtures.mjs`**: giữ vì hữu ích khi chủ động nhập lại public fixture; nhận `--source` hoặc `CMS_DASHBOARD_SRC`, `--output`, `--help`. Không còn đường dẫn Dashboard hardcode. Mặc định output neo vào repository; thiếu source dừng trước khi ghi. Không gắn vào npm lifecycle/build/dev. Tests dùng nguồn và output tạm, không ghi dữ liệu ứng dụng.
- **Thêm `tests/language.test.js`**: kiểm tra cả cú pháp hợp lệ và vi phạm, `.ts/.tsx/.mts/.cts/.py`, compiler imports, Python/TS commands, parser JSX, inline HTML, dependency trực tiếp so với gián tiếp, excluded outputs và CLI exit code. Các chuỗi TypeScript/Python trong test là input kiểm thử parser, không phải mã được thực thi bằng những ngôn ngữ đó.
- **Thêm `tests/fixture-import.test.js`**: xác minh help/thiếu source không ghi seed, CLI/env chạy từ thư mục khác và allowlist không xuất trường riêng tư.
- **Thêm `tests/e2e/setup.js`**, cập nhật `playwright.config.js`: tạo `test-results/screenshots/` tự động.
- **Sửa `tests/e2e/account.spec.js`, `customer.spec.js`, `light-theme.spec.js`**: đổi đường dẫn screenshot sang `test-results/screenshots/`; giữ nguyên các kiểm tra hành vi/giao diện.
- **Sửa `package.json`**: chỉ thêm `check:language`; giữ tất cả npm scripts cũ. Không thêm, gỡ hoặc nâng version dependency; `package-lock.json` không thay đổi.
- **Sửa `.gitignore`, `eslint.config.mjs`**: loại generated outputs khỏi source/lint; bỏ ignore config Next/TypeScript lịch sử không còn dùng.
- **Sửa `README.md`, `ASSIGNMENT_CHECKLIST.md`, `IMPLEMENTATION_REPORT.md`, `LIGHT_THEME_REPORT.md`**: hướng dẫn hiện tại, ghi rõ nơi lưu backup riêng và đường dẫn ảnh mới. API contract không bị sửa.
- **Thêm báo cáo này và `CLEANUP_MANIFEST.json`** để bàn giao kết quả và đối chiếu file đã chuyển ra ngoài.

## Kết quả thực thi

| Lệnh/kiểm tra | Kết quả |
|---|---|
| `npm ci` | PASS; cài sạch 224 packages từ lockfile |
| `npm run check:language` | PASS; 59 files, 17 JS + 17 JSX + 3 MJS, 0 violations |
| `npm run lint` | PASS |
| `npm test` | PASS 19/19: 9 nghiệp vụ + 8 checker + 2 fixture importer |
| `npm run build` | PASS; Vite production build |
| `npm run test:e2e` | PASS 18/18; Microsoft Edge headless; 375/768/1024/1440px |
| `npm run test:http` | PASS 4/4; phản hồi API được kiểm soát trong trình duyệt |
| Screenshot output | 48 PNG được tạo ở thư mục mới; không cần artifacts |
| Source integrity | 33/33 file ứng dụng/public/index/API giữ nguyên hash |
| Markdown links cục bộ | Các đích liên kết tồn tại; tham chiếu archive cũ đã ghi rõ là lưu riêng |

Mock Mode, import React/Vite, routing, form/tài khoản, bình luận/rating, review/report, tìm/lọc, giỏ hàng, giữ ghế/checkout/payment và responsive/light surfaces đều được kiểm tra qua bộ test hiện hữu. Các ca vi phạm checker chỉ parse/đọc input, không chạy Python hoặc TypeScript.

## Đóng gói

Bản bàn giao nguồn: `CMS-Cinema-JavaScript-only-2026-11-04.zip` trong `C:/cms-fe-delivery/`, kèm thư mục nguồn cùng tên. Bao gồm src/public/scripts/tests, package.json + lockfile, configs, `.env.example`, `.env.mock`, `.gitignore`, HTML, assignment và tài liệu. Bao gồm cả `public/.htaccess`.

Không kèm node_modules, dist, test-results, playwright-report, coverage, artifacts, ZIP migration, Python script hoặc cấu hình TypeScript/Next.js. Sau giải nén chạy `npm ci`, `npm run check:language`, `npm run dev:mock`; dùng `npm run dev` khi kết nối PHP. Xem [README.md](README.md) cho quy trình build/deploy và toàn bộ lệnh kiểm thử.

## Vấn đề còn tồn tại / giới hạn

- Kiểm tra ngôn ngữ và dọn bản bàn giao đã hoàn thành. Checker là phân tích tĩnh, không phải sandbox/chứng minh toàn bộ hành vi của mã được tạo động; bỏ qua thư viện bên thứ ba và output theo phạm vi yêu cầu.
- `npm ci`/`npm audit` ngày kiểm tra báo **6 vulnerabilities: 5 moderate, 1 high** trong dependency đã khóa. High ở `follow-redirects`; moderate ở `eslint`, `@eslint-community/eslint-utils`, `@eslint/config-array`, `@eslint/eslintrc`, `minimatch`. Không tự chạy audit fix hoặc nâng dependency trong tác vụ bảo toàn công nghệ/giao diện. Chi tiết kết quả cục bộ tại `test-results/validation/npm-audit.json`.
- Backend PHP/MySQL và cổng thanh toán thật không có trong workspace; các HTTP tests không thay thế kiểm thử tích hợp backend thật. Không tuyên bố giao dịch production đã được kiểm chứng.
- Kết quả audit/test trong báo cáo migration/theme trước đây là lịch sử tại thời điểm đó, không phải kết quả dependency audit hiện tại.

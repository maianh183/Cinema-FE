# CMS Cinema Customer Frontend

Frontend khách hàng cho hệ thống rạp chiếu phim, đã chuyển từ Next.js/TypeScript sang React 19 + Vite + JavaScript/JSX + React Router. Giao diện **Modern Light Cinema**: nền sáng, card trắng, CTA Indigo, trạng thái tích cực Teal và accent Coral. Giữ nguyên routing, API, nghiệp vụ và nội dung phim. Không có trang quản trị nhân sự.

## Kiến trúc và phạm vi

- **Customer Frontend**: workspace này; public pages, tài khoản khách hàng, bình luận, đánh giá, giỏ sản phẩm, đặt vé và kiểm tra thanh toán.
- **Internal Dashboard**: ứng dụng độc lập tại [../Dashboard](../Dashboard/README.md), dùng chung hợp đồng API ở root monorepo.
- **Backend cuối cùng**: PHP thuần (không framework/CMS) + MySQL dùng chung. Vite chỉ là công cụ phát triển/build, không phải server nghiệp vụ.
- Chưa có PHP backend trong workspace. Không endpoint nào đã được kiểm chứng với PHP thật. Xem [API_CONTRACT.md](API_CONTRACT.md).

Chuẩn đồng bộ hiện tại là [SHARED_API_CONTRACT.md](../docs/SHARED_API_CONTRACT.md) `draft-1.0`. Adapter JavaScript giữ UI aliases hiện tại, chuyển hồ sơ sang canonical `cUserId/cName/phoneNumber/sex`, kiểm tra ID, envelope đầy đủ, scope public và trạng thái đơn/thanh toán. [CUSTOMER_CONTRACT_DIFF.md](docs/CUSTOMER_CONTRACT_DIFF.md) ghi audit từng service, mapping, kết quả kiểm thử và các mục OPEN. Đây là thiết kế chờ PHP, không phải chứng nhận tích hợp backend.

Đã đọc `assignment.pdf`, Dashboard `API_CONTRACT.md`, các services/model và mock catalog. Các yêu cầu quản trị liên hệ, nội dung website và reset mật khẩu trong assignment khác với phạm vi được yêu cầu: ưu tiên prompt, không bổ sung các module đó vào Customer Frontend hoặc sửa Dashboard. Vì vậy không tuyên bố hoàn thành toàn bộ assignment của cả hệ thống.

## Hệ thống giao diện

Light theme duy nhất, tokens trong `src/app/globals.css`; stylesheet component trong `src/styles.css`. Nền #F6F7FB, surface #FFFFFF, Indigo #4F46E5 (hover #4338CA), Teal #0F766E, Coral #F97373. Chữ chính #1F2937. #94A3B8 chỉ dùng cho chi tiết trang trí/disabled, không cho nội dung thông thường; chữ phụ trên nền tint dùng token AA đậm hơn. Card phim tách poster và phần thông tin trắng. Ghế có nhãn/ký hiệu ngoài màu (✓ đang chọn, × đã bán, ⏳ đang giữ, V VIP). Dialog/form/navigation/footer đều nền sáng. Không có dark mode; chỉ backdrop modal làm tối cục bộ, ghế đã bán dùng slate đậm và hình ảnh/video phim giữ màu gốc. Xem [LIGHT_THEME_REPORT.md](LIGHT_THEME_REPORT.md) cho kết quả kiểm tra và danh sách file.

## Công nghệ

React 19, Vite 7, JavaScript/JSX, React Router 7, Tailwind CSS 4, Axios, Zustand, Lucide. Kiểm thử: Node test runner và Playwright; ESLint; Prettier. Không còn Next.js, STOMP/SockJS, JWT trong localStorage hoặc phụ thuộc Spring Boot/ngrok.

React dựng giao diện bằng components JSX; Vite cung cấp dev server và build website tĩnh. Mã ứng dụng tự viết dùng JavaScript ES Modules/JSX, HTML, CSS và tài nguyên JSON/SVG/ảnh. Không có TypeScript hoặc Python trong mã nguồn ứng dụng hay quy trình chạy/build/test. Các declaration `.d.ts` và dependency gián tiếp bên trong thư viện npm không thuộc mã nguồn tự viết và được giữ nguyên.

## Cấu trúc thư mục

- `src/`: pages, components, features, services/adapters, lib, store, mocks và styles.
- `public/`: tài nguyên tĩnh, placeholder, cấu hình SPA Apache và robots.
- `tests/`: unit tests Node, e2e Mock Mode và HTTP interception Playwright.
- `scripts/`: kiểm tra JavaScript/JSX và nhập fixture tùy chọn.
- `docs/`: proposal, yêu cầu và báo cáo riêng Customer; hợp đồng chung duy nhất tại [../docs/SHARED_API_CONTRACT.md](../docs/SHARED_API_CONTRACT.md).
- `package.json`, `package-lock.json`, cấu hình Vite/ESLint/Playwright: độc lập với Dashboard, chạy npm trong thư mục Customer.

## Cài và chạy

Node.js 22.12+ hoặc 24 và npm (máy xác minh monorepo dùng Node 24.11.1 / npm 11.6.2); các phiên bản cụ thể được khóa trong `package-lock.json`.

```sh
npm ci
npm run dev:mock
```

Mở `http://127.0.0.1:5173`. Mock Mode được đánh dấu rõ trên mọi trang.

- Email demo: `customer@cinema.test`
- Mật khẩu demo: `DemoCinema123!`
- Có thể đăng ký tài khoản **demo**, đăng nhập, sửa hồ sơ, đổi mật khẩu và thử avatar. Không dùng thông tin đăng nhập thật trong demo.
- Mock lưu thay đổi trong sessionStorage của tab; reload vẫn giữ dữ liệu cùng ngày. Đóng tab, xóa `cms-demo-v1` hoặc đổi ngày Việt Nam sẽ tạo lại demo. Cart độc lập lưu localStorage; giữ ghế lưu sessionStorage và luôn được đối chiếu với service.

### Kết nối PHP

Sao chép `.env.example` thành `.env.local`:

```dotenv
VITE_API_BASE_URL=/api
VITE_USE_MOCK=false
VITE_PASSWORD_RECOVERY=false
```

```sh
npm run dev
```

PHP phải triển khai contract trước khi bật chế độ thật. Khi chưa có API, frontend báo lỗi tải/gửi; không tự fallback sang dữ liệu demo. Các biến `VITE_*` là công khai, không chứa secret. Nếu dùng `.env.local`, giá trị trong đó có thể ghi đè `.env.mock`; kiểm tra banner demo và cấu hình trước khi chạy. Có thể dùng `.env.mock.local` cho cấu hình riêng của mode mock.

Ngày sinh còn OPEN O-03: production giữ giá trị đã đọc, không gửi birthday/dob chưa thống nhất; thay đổi ngày sinh báo lỗi trước request và giữ form. Vì form đăng ký yêu cầu ngày sinh, **đăng ký production còn chờ PHP chốt O-03**. Đăng ký/sửa ngày sinh trong Mock Mode tiếp tục hoạt động. Các mục auth session, slug phim, giá suất và enum đơn online cũng cần PHP xác nhận; không tự bật refresh hoặc fallback API nội bộ.

Khôi phục mật khẩu chỉ hiện khi `VITE_PASSWORD_RECOVERY=true`; chỉ bật production sau khi backend hỗ trợ email/token dùng một lần. Trong mock, yêu cầu quên mật khẩu không gửi email, reset bằng token không được mô phỏng thành công.

### Build và triển khai

```sh
npm run build
npm run preview
```

`dist/` là website tĩnh, không cần Node ở production. Đưa file build lên web server; `/api` được phục vụ bởi PHP. `public/.htaccess` hỗ trợ fallback React Router trên Apache và loại trừ `/api`. Nginx cần `try_files` tương ứng; API không được rewrite về `index.html`.

```sh
npm run build:mock
```

Lệnh trên tạo bản demo, không dùng cho giao dịch thật. Tất cả thao tác mock chạy trong trình duyệt; không phải JavaScript backend. Build production mặc định không nhập kho mock nếu `VITE_USE_MOCK` không được bật.

## Trang và chức năng

| Route | Nội dung |
|---|---|
| `/` | Hero, phim đang/sắp chiếu, voucher hợp lệ, giới thiệu ngắn, dịch vụ, tin mới |
| `/movies`, `/movie/:slug` | Tìm/lọc/sắp xếp/phân trang, thông tin phim, trailer YouTube hợp lệ, lịch chiếu, bình luận |
| `/cinemas` | Tìm cơ sở, phòng, bản đồ theo địa chỉ, lịch chiếu và đánh giá theo chi nhánh |
| `/about`, `/services`, `/pricing` | Nội dung biên tập từ public/site-content; loại phòng và giá từ API nghiệp vụ; phụ thu theo ghế tại bước chọn suất |
| `/contact` | Form gửi PHP API; chỉ báo đã nhận khi server xác nhận |
| `/faq` | PUBLISHED, tìm kiếm, accordion, sortOrder |
| `/news`, `/news/:slug` | PUBLISHED, tìm/lọc/phân trang, metadata, tin liên quan, văn bản thuần |
| `/products`, `/products/:id?type=...`, `/cart` | Hai nhóm hàng, thời gian kinh doanh/tồn kho, số lượng, tạm tính |
| `/promotions` | Chỉ voucher đang hiệu lực và còn lượt; không tạo banner quảng cáo giả |
| `/login`, `/register` | Validation, tài khoản CUSTOMER, khôi phục phiên từ `/auth/me` |
| `/profile`, `/history` | Hồ sơ, mật khẩu, upload avatar, đăng xuất, lịch sử vé/thanh toán của phiên |
| `/booking/showtime/:id` | Sơ đồ ghế riêng theo suất, polling, giữ ghế qua service |
| `/checkout`, `/checkout/status` | Xác minh giữ ghế, sản phẩm, voucher; tạo đơn; chuyển cổng thanh toán; đọc trạng thái từ server |
| `/forgot-password`, `/reset-password` | Tùy cấu hình hỗ trợ PHP; không reset qua nhân sự |

## Bình luận, đánh giá, báo cáo

- `MovieComment`: `commentId`, `movieId`, điểm nguyên **1–5 sao**. Native radio dùng được bằng Tab/phím mũi tên; nội dung có thể null/rỗng, trim và tối đa 2000 ký tự. Trung bình chỉ tính trên điểm hợp lệ, hiển thị `/5`.
- `CinemaReview`: `reviewId`, `branchId`, `roomId` nullable. Không có movieId/rating. Nội dung 1–2000 ký tự; phòng phải thuộc chi nhánh. Đổi cơ sở sẽ remount form/danh sách, không dùng nhầm branchId. Có phân trang.
- `ReportContentDialog` dùng chung: `targetType=MOVIE_COMMENT|CINEMA_REVIEW`, đúng `targetId`, lý do. Danh tính từ session, không gửi chủ sở hữu trong payload. Server trả `reportId,status=PENDING` mới báo đã nhận. Báo cáo không tự ẩn/xóa nội dung. Chỉ render nội dung `VISIBLE`.
- Nội dung là text được React escape, không dùng `dangerouslySetInnerHTML`.

## Booking, cart và thanh toán

Cart chỉ lưu định danh nhóm/sản phẩm/số lượng, không lưu giá như nguồn tin cậy; độc lập trạng thái giữ ghế. Chỉ bán sản phẩm kèm vé vì chưa có contract đơn sản phẩm độc lập.

Sơ đồ có `isBooked`, `holdStatus` theo **timeId**; `sStatus` chỉ là trạng thái vật lý. Loại 1=Thường, 2=VIP đúng Dashboard. Giá tạm tính = giá phòng + `sPrice` (phụ thu). Dữ liệu trạng thái thiếu bị từ chối thay vì coi ghế là trống.

Khách chọn ghế rồi yêu cầu giữ ghế, nhận `reservationId,expiresAt` từ server. Poll mỗi 5 giây; hết hạn/xung đột có lỗi rõ ràng. Checkout tải lại reservation. Payload tạo đơn chỉ chứa mã reservation, mã sản phẩm/số lượng, couponId và idempotencyKey; không gửi giá/tổng tiền/chủ sở hữu/PAID. Server phải xử lý transaction và tính lại toàn bộ.

`PENDING` giữ nghĩa đơn tại quầy. `AWAITING_PAYMENT` là **đề xuất mới** cho đơn online chưa trả tiền, cần PHP thống nhất. `PAID` chỉ hiển thị từ GET đơn của phiên, có đúng orderId. URL `status=success`, redirect và localStorage không quyết định thành công. Không có API xác nhận thanh toán STAFF. CANCELLED/FAILED/EXPIRED/REFUNDED được hiển thị riêng.

Mock có một giao dịch PAID lịch sử gắn nhãn phương thức DEMO. Đơn mới chờ thanh toán và hết hạn; không giả lập thu tiền/webhook. Mock không bảo vệ cạnh tranh đa tab/máy và không đồng bộ trực tiếp với kho mock riêng của Dashboard.

## API, bảo mật và SEO

Axios `withCredentials:true`; session/CSRF ở backend, token CSRF chỉ trong RAM. PHP cấp cookie HttpOnly/Secure/SameSite, kiểm tra Origin/CSRF, ownership, rate limit và từng mutation. 401 xóa trạng thái phiên; 403/409/422 và envelope `success:false` được báo lỗi; form khóa khi request đang chạy. Phân quyền client chỉ hỗ trợ UX, không thay thế PHP.

SEO client: semantic HTML, lang=vi, title/meta description theo route/movie/news/product, alt, slug và robots. **SPA không SSR/prerender**: crawler không chạy JavaScript có thể không thấy nội dung; mạng xã hội không được bảo đảm đọc metadata client. Không tạo sitemap với domain giả; cần sinh sitemap public từ PHP khi có domain chính thức. Server cần trả HTTP 404 đúng nếu yêu cầu SEO đầy đủ; SPA fallback hiện trả app shell.

Ảnh trong mock dùng placeholder local vì Dashboard seed không có poster. Avatar thật phải upload PHP, kiểm tra MIME/nội dung/kích thước/re-encode, lưu dưới thư mục uploads không thực thi. Không dùng URL ngoài như thay thế upload.

## Kiểm thử và tài liệu

```sh
npm run check:language
npm run lint
npm test
npm run test:e2e
npm run test:http
npm run build
```

Playwright cấu hình Microsoft Edge (`channel: msedge`) có sẵn trên máy kiểm thử. Máy khác có thể đổi channel sang browser đã cài hoặc dùng Chromium sau `npx playwright install chromium`. Tests dùng trình duyệt tự động headless, không mở cửa sổ làm việc của người dùng.

`check:language` dùng parser JavaScript/JSX của ESLint, quét toàn repository trừ dependency, thư viện bên thứ ba và thư mục sinh tự động. Lệnh kiểm tra đuôi TS/TSX/MTS/CTS/Python, cú pháp TS đặt trong file JS/JSX, import compiler/runtime không phù hợp, npm scripts và các lệnh thực thi tĩnh trong tooling/CI. Báo đường dẫn/dòng/cột, số lượng file và trả exit code 1 khi có lỗi. Không dùng `node --check` cho JSX. Các chuỗi dữ liệu và thuộc tính JavaScript hợp lệ như `type`, `interface`, `enum` không bị coi là TypeScript. Đây là kiểm tra tĩnh, không thực thi hay suy diễn được mọi lệnh tạo động từ input bên ngoài.

Ảnh Playwright nằm trong `test-results/screenshots/`; global setup tự tạo thư mục trước khi chạy E2E. Trace/output của hai bộ test được tách tại `test-results/e2e/` và `test-results/http/`; HTML report tại `playwright-report/`. Các thư mục này, `node_modules/`, `dist/`, `coverage/` và cache được loại khỏi bản bàn giao; cài lại dependencies bằng `npm ci`, tạo build bằng `npm run build`. Nên chạy hai bộ browser test lần lượt trên Windows để tránh xung đột tài nguyên/cache.

### Nhập lại fixture từ Dashboard (tùy chọn)

Mock Mode chạy ngay với `src/mocks/public-seed.json` đã đóng gói. Không cần Dashboard hoặc đường dẫn `C:/cms-dashboard` trên máy nhận dự án. Chỉ khi chủ động đồng bộ lại seed từ một bản Dashboard đáng tin cậy mới chạy:

```sh
node scripts/import-public-fixtures.mjs --help
node scripts/import-public-fixtures.mjs --source "<dashboard>/src" --output "<output>/public-seed.json"
```

Có thể dùng biến môi trường `CMS_DASHBOARD_SRC` thay `--source`. `--output` mặc định là `src/mocks/public-seed.json` của repository, không phụ thuộc thư mục chạy lệnh. Script chỉ xuất các trường public trong allowlist; chạy module nguồn Dashboard để lấy dữ liệu, vì vậy chỉ dùng nguồn đã tin cậy. Thiếu đường dẫn nguồn sẽ dừng mà không ghi file. Script không gắn vào lifecycle npm, không chạy khi `npm ci`, dev, test hoặc build; tests của chính script chỉ dùng fixture tạm, không ghi seed ứng dụng.

### Tài liệu và bản lưu lịch sử

- [ASSIGNMENT_CHECKLIST.md](ASSIGNMENT_CHECKLIST.md): nghiệm thu, giới hạn và kết quả kiểm thử thực tế.
- [API_CONTRACT.md](API_CONTRACT.md): mapping Dashboard, API cũ/mới và trách nhiệm PHP.
- [SHARED_API_CONTRACT.md](../docs/SHARED_API_CONTRACT.md): hợp đồng chung do người dùng cung cấp, giữ nguyên các mục OPEN.
- [CUSTOMER_CONTRACT_DIFF.md](docs/CUSTOMER_CONTRACT_DIFF.md): kết quả đồng bộ Customer ngày 2026-11-04 và kiểm thử mới nhất cho lần sửa này.
- [IMPLEMENTATION_REPORT.md](IMPLEMENTATION_REPORT.md): file thay đổi, audit, kết quả và các phần chưa xác minh.
- [JAVASCRIPT_ONLY_REPORT.md](JAVASCRIPT_ONLY_REPORT.md): kết quả kiểm tra ngôn ngữ, đóng gói, danh sách file dọn dẹp và nơi bảo toàn snapshot lịch sử.

Các snapshot `original-customer.zip`, `before-light-theme.zip`, hai script Python migration cũ và artifacts lịch sử đã được đưa ra kho lưu riêng, ngoài bản bàn giao. Không cần chúng để cài đặt/chạy/kiểm thử frontend. Các báo cáo migration/theme và JavaScript-only ghi kết quả tại thời điểm từng nhiệm vụ; kết quả lần đồng bộ API này nằm trong [CUSTOMER_CONTRACT_DIFF.md](docs/CUSTOMER_CONTRACT_DIFF.md).

Quy trình Vite/React Router được đối chiếu với tài liệu chính thức: [Vite](https://vite.dev/guide/), [React Router declarative mode](https://reactrouter.com/start/declarative/installation).

## Liên hệ và nội dung công khai (06/11/2026)

Customer giữ route /contact và contactService.send POST /contacts. Form chỉ reset khi máy chủ trả id số nguyên dương và received:true; lỗi validation, giới hạn gửi hoặc kết nối giữ thông tin để người dùng thử lại. Không gửi email từ trình duyệt.

GET /public/site-content cấp đúng sáu section global/home/about/services/pricing/contact cho Header, Footer và các trang. Nội dung mặc định an toàn được dùng khi API thiếu/lỗi, với thông báo và nút tải lại ở Footer. Nội dung được tải lại khi focus tab; không lưu cache bền vững. Ảnh thiếu dùng placeholder local; link bản đồ/social chỉ HTTPS; không render HTML hoặc iframe. Phim, lịch chiếu, loại phòng, sản phẩm và giá đặt vé vẫn dùng service nghiệp vụ cũ.

Mock Mode có src/mocks/site-content-seed.json và liên hệ guest UNREAD trong repository demo. Seed email/địa chỉ/giờ làm việc chỉ minh họa, không phải thông tin doanh nghiệp thật. Dashboard Mock Mode và Customer Mock Mode độc lập, không tự chia sẻ dữ liệu. Cần PHP/MySQL chung để nội dung Dashboard đã lưu xuất hiện tại Customer. Customer không có giao diện quản trị hoặc gọi endpoint nội bộ.

Xem [API proposal](docs/CONTACT_WEBSITE_CONTENT_API_PROPOSAL.md) và [báo cáo lần sửa](docs/CUSTOMER_EDITORIAL_REPORT.md). Phạm vi quản trị mới do chủ dự án cho phép thay thế ghi chú lịch sử về About tĩnh; các mục OPEN của [Shared contract](../docs/SHARED_API_CONTRACT.md) vẫn chưa được xác minh PHP. Các lệnh check:language/lint/test/build/test:http/test:e2e ở trên bao gồm kiểm thử mới.

## Ghi chú monorepo

Clone repository gốc theo [README hệ thống](../README.md); chạy npm trong Customer. `npm run dev` dùng API Mode tại cổng 5173; `npm run dev:mock` dùng cùng cổng, nên chỉ chạy một mode tại một thời điểm. `npm run preview` mặc định cổng 4173; dùng `npm run preview -- --port 4174` nếu Dashboard preview đang chạy. Vite không proxy `/api` mặc định, cần reverse proxy hoặc URL PHP/CORS phù hợp.

O-01–O-11 còn OPEN; O-12 đã DECIDED về phạm vi Liên hệ/Nội dung, chi tiết backend PENDING_BACKEND_CONFIRMATION theo bản chung ở root. Các kết quả/đường dẫn máy trong báo cáo lịch sử không phải yêu cầu setup trên máy nhận dự án.

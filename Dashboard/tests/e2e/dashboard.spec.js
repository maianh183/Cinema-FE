import {test,expect} from '@playwright/test';
async function login(page,role='admin'){
 await page.goto('/login');
 await page.getByLabel('Email',{exact:true}).fill(role+'@cinema.test');
 await page.getByLabel('Mật khẩu',{exact:true}).fill('Demo@12345');
 await page.getByRole('button',{name:'Đăng nhập',exact:true}).click();
 await expect(page.locator('header')).toBeVisible();
}
async function nav(page,name){await page.getByRole('navigation',{name:'Điều hướng chính'}).getByRole('link',{name,exact:true}).click();}
for(const role of ['admin','manager'])test(role+' opens permitted module instead of overview',async({page})=>{
 const overviewRequests=[];page.on('request',request=>{if(request.url().includes('/statistics/overview'))overviewRequests.push(request.url());});
 await login(page,role);
 await expect(page).toHaveURL(/\/movies$/);
 await expect(page.getByRole('link',{name:'Tổng quan',exact:true})).toHaveCount(0);
 await page.evaluate(()=>{history.pushState({},'','/');dispatchEvent(new PopStateEvent('popstate'));});
 await expect(page).toHaveURL(/\/movies$/);
 await expect(page.getByRole('heading',{name:'Phim',exact:true})).toBeVisible();
 await page.evaluate(()=>{history.pushState({},'','/missing-page');dispatchEvent(new PopStateEvent('popstate'));});
 await page.getByRole('link',{name:'Về trang chính',exact:true}).click();
 await expect(page).toHaveURL(/\/movies$/);
 expect(overviewRequests).toEqual([]);
});
test('admin routes render without runtime errors',async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await login(page);
 for(const name of ['Phim','Lịch chiếu','Chi nhánh','Phòng & ghế','Khách hàng','Nhân viên','Đơn hàng và vé','Mã giảm giá','Sản phẩm','Hỏi đáp','Tin tức','Báo cáo bình luận và đánh giá','Báo cáo','Đánh giá','Lịch làm việc','Tài khoản cá nhân']){
  await nav(page,name);
  await expect(page.getByText('Không thể hiển thị màn hình.')).toHaveCount(0);
  await expect(page.locator('main h1')).toHaveText(name);
  await page.waitForTimeout(300);
 }
 expect(errors).toEqual([]);
 await page.screenshot({path:'test-results/screenshots/dashboard-1440.png',fullPage:true});
});
test('FAQ create update search pagination and delete',async({page})=>{
 await login(page);await nav(page,'Hỏi đáp');
 await page.getByRole('button',{name:'Thêm mới',exact:true}).click();
 await page.getByLabel('Câu hỏi *').fill('Câu hỏi kiểm thử');
 await page.getByLabel('Câu trả lời *').fill('<script>alert(1)</script> Văn bản an toàn');
 await page.getByRole('button',{name:'Lưu thay đổi',exact:true}).click();
 await expect(page.getByRole('dialog')).toHaveCount(0);
 await page.getByRole('textbox',{name:'Tìm kiếm',exact:true}).fill('Câu hỏi kiểm thử');
 await expect(page.locator('tbody tr')).toHaveCount(1);
 await page.getByRole('button',{name:'Chỉnh sửa',exact:true}).click();
 await page.getByLabel('Câu hỏi *').fill('Câu hỏi kiểm thử đã sửa');
 await page.getByRole('button',{name:'Lưu thay đổi',exact:true}).click();
 await expect(page.getByRole('cell',{name:'Câu hỏi kiểm thử đã sửa',exact:true})).toBeVisible();
 await page.getByRole('button',{name:'Xem chi tiết',exact:true}).click();
 await expect(page.getByRole('dialog')).toContainText('<script>alert(1)</script>');
 await page.getByRole('button',{name:'Close',exact:true}).click();
 await page.getByRole('button',{name:'Xóa',exact:true}).click();
 await page.getByRole('button',{name:'Xác nhận',exact:true}).click();
 await expect(page.getByText('Không có dữ liệu phù hợp.')).toBeVisible();
 await nav(page,'Khách hàng');await expect(page.getByRole('navigation',{name:'Phân trang'})).toContainText('32 bản ghi');
 await page.getByRole('button',{name:'Sau',exact:true}).click();await expect(page.locator('tbody tr')).toHaveCount(10);
});
test('staff navigation actions and forbidden route',async({page})=>{
 await login(page,'staff');
 const menu=page.getByRole('navigation',{name:'Điều hướng chính'});
 await expect(menu.getByRole('link',{name:'Nhân viên',exact:true})).toHaveCount(0);
 await expect(page.getByRole('button',{name:'Xóa',exact:true})).toHaveCount(0);
 await expect(page.locator('select[aria-label^="Trạng thái đơn "]')).toHaveCount(0);
 await nav(page,'Khách hàng');await expect(page.getByRole('button',{name:'Reset mật khẩu'})).toHaveCount(0);
 await page.evaluate(()=>{history.pushState({},'','/employees');dispatchEvent(new PopStateEvent('popstate'));});
 await expect(page.getByRole('heading',{name:'403',exact:true})).toBeVisible();
});
test('uploads image and profile update; rejects SVG',async({page})=>{
 await login(page);await nav(page,'Tài khoản cá nhân');
 await page.getByLabel('Upload ảnh',{exact:true}).setInputFiles({name:'unsafe.svg',mimeType:'image/svg+xml',buffer:Buffer.from('<svg/>')});
 await expect(page.getByRole('alert')).toContainText('JPG, PNG hoặc WebP');
 await page.getByLabel('Upload ảnh',{exact:true}).setInputFiles({name:'pixel.png',mimeType:'image/png',buffer:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=','base64')});
 await expect(page.getByAltText('Ảnh đã chọn')).toBeVisible();
 await nav(page,'Tài khoản cá nhân');await page.getByLabel('Họ và tên *').fill('Nhân sự kiểm thử');
 await page.getByRole('button',{name:'Lưu hồ sơ',exact:true}).click();
 await expect(page.locator('header')).toContainText('Nhân sự kiểm thử');
});
test('responsive shell and list pages at required widths',async({page})=>{
 await login(page);
 for(const width of [375,768,1024,1440]){
  await page.setViewportSize({width,height:950});
  if(width<1280)await page.getByRole('button',{name:'Bật tắt menu',exact:true}).click();
  await nav(page,'Đơn hàng và vé');await page.waitForTimeout(300);
  const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1);
  expect(overflow,'orders overflow at '+width).toBe(false);
  await page.screenshot({path:'test-results/screenshots/orders-'+width+'.png',fullPage:true});
 }
});

test('movie validation, create, edit and delete through reused form',async({page})=>{
 await login(page);await nav(page,'Phim');
 await page.getByRole('button',{name:'Thêm phim mới',exact:true}).click();
 await page.getByLabel('Tên phim',{exact:true}).fill('Phim hồi quy');
 await page.getByLabel('Thời lượng (phút)',{exact:true}).fill('120');
 await page.getByLabel('Ngày khởi chiếu',{exact:true}).fill('2026-10-01');
 await page.getByLabel('Ngày kết thúc',{exact:true}).fill('2026-12-31');
 await page.getByRole('button',{name:'Thêm vào Catalog',exact:true}).click();
 await expect(page.getByRole('dialog')).toHaveCount(0);
 await page.getByPlaceholder('Tìm theo tiêu đề hoặc thể loại...').fill('Phim hồi quy');
 await expect(page.getByRole('heading',{name:'Phim hồi quy',exact:true})).toBeVisible();
 const card=page.locator('div.group.relative').filter({has:page.getByRole('heading',{name:/^Phim hồi quy/})});
 await card.hover();await card.locator('button').first().click();
 await page.getByRole('button',{name:'Hiệu chỉnh',exact:true}).click();
 await page.getByLabel('Tên phim',{exact:true}).fill('Phim hồi quy sửa');
 await page.getByRole('button',{name:'Cập nhật phim',exact:true}).click();
 await expect(page.getByRole('heading',{name:'Phim hồi quy sửa',exact:true})).toBeVisible();
 await card.hover();await card.locator('button').first().click();
 await page.getByRole('button',{name:'Gỡ bỏ',exact:true}).click();
 await page.getByRole('button',{name:'Xóa vĩnh viễn',exact:true}).click();
 await expect(page.getByRole('heading',{name:'Phim hồi quy sửa',exact:true})).toHaveCount(0);
});

test('showtime create preserves filters and validates overlap',async({page})=>{
 await login(page);await nav(page,'Lịch chiếu');
 await page.getByRole('button',{name:'Thêm lịch chiếu',exact:true}).click();
 await page.getByPlaceholder('Tìm và chọn phim…').fill('Hành trình ánh sáng 1');
 await page.getByText('Hành trình ánh sáng 1',{exact:true}).last().click();
 await page.getByLabel('Ngày',{exact:true}).fill('2027-02-01');
 await page.getByLabel('Bắt đầu',{exact:true}).fill('09:00');
 await page.getByLabel('Phòng',{exact:true}).selectOption('1');
 await expect(page.getByLabel('Giờ kết thúc',{exact:true})).toHaveCount(0);
 await page.getByRole('button',{name:'Thêm lịch chiếu',exact:true}).last().click();
 await expect(page.getByText('Lịch chiếu mới đã được tạo thành công.')).toBeVisible();
 await page.getByRole('button',{name:'Xem danh sách',exact:true}).click();await page.getByLabel('Ngày chiếu',{exact:true}).fill('2027-02-01');
 await expect(page.locator('tbody tr')).toHaveCount(1);
 await expect(page.locator('tbody')).toContainText('09:00');
});

test('product creates with selected category and price',async({page})=>{
 await login(page);await nav(page,'Sản phẩm');
 await page.getByRole('button',{name:'Thêm sản phẩm',exact:true}).click();
 await page.getByLabel('Tên sản phẩm',{exact:true}).fill('Sản phẩm hồi quy');
 await page.getByLabel('Danh mục',{exact:true}).selectOption('Bắp');
 await page.getByLabel('Giá bán',{exact:true}).fill('45000');
 await page.getByLabel('Số lượng tồn',{exact:true}).fill('12');
 await page.getByLabel('Bắt đầu bán',{exact:true}).fill('2026-01-01');
 await page.getByLabel('Kết thúc bán',{exact:true}).fill('2027-12-31');
 await page.getByRole('button',{name:'Thêm vào kho hàng',exact:true}).click();
 await expect(page.getByRole('dialog')).toHaveCount(0);
 await expect(page.getByText('Sản phẩm hồi quy',{exact:true})).toBeVisible();
});

test('all routes fit mobile width',async({page})=>{
 await login(page);await page.setViewportSize({width:375,height:950});
 for(const name of ['Phim','Lịch chiếu','Chi nhánh','Phòng & ghế','Khách hàng','Nhân viên','Mã giảm giá','Sản phẩm','Báo cáo','Đánh giá','Lịch làm việc']){
  await page.getByRole('button',{name:'Bật tắt menu',exact:true}).click();await nav(page,name);await page.waitForTimeout(250);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),name+' overflows').toBe(true);
 }
});


import {test,expect} from '@playwright/test';
const ok=data=>({status:200,contentType:'application/json',body:JSON.stringify({success:true,data})});
const staff={id:'NV003',name:'HTTP Staff',email:'staff@example.test',role:'STAFF',branchId:1,permissions:['orders:read','orders:confirm-payment'],csrfToken:'test-csrf'};
const order={orderId:100,branchId:1,source:'STAFF',createdByEmployeeId:'NV003',orderStatus:'pending',total:160000,orderTime:'2026-10-24T10:00:00+07:00',paymentMethod:'CASH',ticketDetails:[],addonDetails:[]};
test('failed payment confirmation preserves pending, successful retry uses server result',async({page})=>{
 let calls=0;
 await page.route('**/api/**',route=>{
  const request=route.request(),path=new URL(request.url()).pathname;
  if(path==='/api/auth/me')return route.fulfill(ok(staff));
  if(path==='/api/orders')return route.fulfill(ok([order]));
  if(path==='/api/orders/100')return route.fulfill(ok(order));
  if(path==='/api/orders/100/confirm-payment'){
   expect(request.method()).toBe('POST');expect(request.headers()['x-csrf-token']).toBe('test-csrf');expect(request.postDataJSON()).toEqual({});calls++;
   return route.fulfill(calls===1?{status:409,contentType:'application/json',body:JSON.stringify({message:'Thanh toán chưa được ghi nhận'})}:ok({...order,orderStatus:'PAID',paidAt:'2026-10-24T11:00:00+07:00'}));
  }
  return route.fulfill({status:404,body:'Not found'});
 });
 await page.goto('/orders');const row=page.locator('tbody tr');await row.getByRole('button',{name:'Xác nhận',exact:true}).click();const modal=page.getByRole('dialog');await modal.getByRole('button',{name:'Xác nhận',exact:true}).click();await expect(modal.getByRole('alert')).toContainText('Thanh toán chưa được ghi nhận');await expect(row).not.toContainText('Đã xử lý');await modal.getByRole('button',{name:'Xác nhận',exact:true}).click();await expect(modal).toHaveCount(0);await expect(row).toContainText('Đã xử lý');expect(calls).toBe(2);
});
test('no confirmation action for unknown source or technical status',async({page})=>{
 await page.route('**/api/**',route=>route.fulfill(ok(route.request().url().endsWith('/auth/me')?staff:[{...order,orderId:101,source:null},{...order,orderId:102,orderStatus:'FAILED'},{...order,orderId:103,orderStatus:'paid'}])));
 await page.goto('/orders');await expect(page.locator('tbody tr')).toHaveCount(3);await expect(page.locator('tbody').getByRole('button',{name:'Xác nhận',exact:true})).toHaveCount(0);await expect(page.locator('tbody')).toContainText('FAILED');
});
test('employee API rejection keeps form open with actionable error',async({page})=>{
 const employee={eUserId:'NV003',eName:'Nhân viên HTTP',email:'test@example.test',userType:'STAFF',branchId:1,salary:10000000,isActive:true};let writes=0;
 await page.route('**/api/**',route=>{
  const request=route.request(),path=new URL(request.url()).pathname;
  if(path==='/api/auth/me')return route.fulfill(ok({...staff,id:'NV002',role:'MANAGER',permissions:['employees:read','employees:update']}));
  if(request.method()==='GET')return route.fulfill(ok([employee]));
  writes++;return route.fulfill({status:422,contentType:'application/json',body:JSON.stringify({message:'Email đã được sử dụng'})});
 });
 await page.goto('/employees');await page.getByRole('button',{name:'Chỉnh sửa',exact:true}).click();const modal=page.getByRole('dialog');await modal.getByLabel('Họ và tên khai sinh').fill('Tên mới');await modal.getByRole('button',{name:'Lưu thay đổi'}).click();await expect(modal.getByRole('alert')).toContainText('Email đã được sử dụng');await expect(page.locator('tbody')).toContainText('Nhân viên HTTP');expect(writes).toBe(1);
});
test('orders outside branch scope are rejected before display or statistics',async({page})=>{
 await page.route('**/api/**',route=>route.fulfill(ok(route.request().url().endsWith('/auth/me')?staff:[{...order,branchId:2}])));
 await page.goto('/orders');await expect(page.getByRole('alert')).toContainText('API trả đơn hàng ngoài phạm vi được cấp quyền.');await expect(page.locator('tbody tr')).toHaveCount(0);await expect(page.getByRole('region',{name:'Tổng số đơn hàng',exact:true})).toHaveCount(0);
});

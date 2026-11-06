import {test,expect} from '@playwright/test';
const user={id:'NV003',name:'Shared Staff',role:'STAFF',branchId:1,permissions:['orders:read','orders:confirm-payment','orders:cancel'],csrfToken:'csrf'};
const order={orderId:100,branchId:1,source:'STAFF',createdByEmployeeId:'NV003',orderStatus:'PENDING',total:80000,orderTime:'2026-11-06T10:00:00+07:00',ticketDetails:[],addonDetails:[]};
const ok=data=>({status:200,contentType:'application/json',body:JSON.stringify({success:true,data})});
test('online orders have distinct labels/filter, no counter actions, and do not inflate counter pending',async({page})=>{
 await page.route('**/api/**',route=>route.fulfill(ok(new URL(route.request().url()).pathname==='/api/auth/me'?{user,csrfToken:'csrf'}:[order,{...order,orderId:101,source:'CUSTOMER',createdByEmployeeId:null,orderStatus:'AWAITING_PAYMENT'},{...order,orderId:102,source:'CUSTOMER',createdByEmployeeId:null,orderStatus:'EXPIRED'}])));
 await page.goto('/orders');await expect(page.locator('tbody tr')).toHaveCount(3);
 await expect(page.locator('tbody').getByRole('button',{name:'Xác nhận',exact:true})).toHaveCount(1);
 await expect(page.getByRole('region',{name:'Đơn chưa xử lý',exact:true})).toContainText('1');
 await page.getByLabel('Lọc trạng thái đơn').selectOption('AWAITING_PAYMENT');
 await expect(page.locator('tbody tr')).toHaveCount(1);await expect(page.locator('tbody')).toContainText('Chờ thanh toán online');
 await expect(page.locator('tbody').getByRole('button',{name:'Xác nhận',exact:true})).toHaveCount(0);
 await expect(page.locator('tbody').getByRole('button',{name:'Hủy đơn',exact:true})).toHaveCount(0);
 await page.getByLabel('Lọc trạng thái đơn').selectOption('EXPIRED');await expect(page.locator('tbody')).toContainText('Hết hạn thanh toán');
});
test('legacy full-list endpoint refuses partial page instead of displaying incorrect totals',async({page})=>{
 await page.route('**/api/**',route=>route.fulfill(new URL(route.request().url()).pathname==='/api/auth/me'?ok(user):{status:200,contentType:'application/json',body:JSON.stringify({success:true,data:[order],meta:{total:40,page:1,pageSize:1}})}));
 await page.goto('/orders');await expect(page.getByRole('alert')).toContainText('O-06');await expect(page.locator('tbody tr')).toHaveCount(0);
});
test('out-of-scope confirmation acknowledgement keeps original order unchanged',async({page})=>{
 await page.route('**/api/**',route=>{
  const path=new URL(route.request().url()).pathname;
  if(path==='/api/auth/me')return route.fulfill(ok(user));
  if(path==='/api/orders')return route.fulfill(ok([order]));
  if(path==='/api/orders/100')return route.fulfill(ok(order));
  return route.fulfill(ok({...order,orderStatus:'PAID',branchId:2}));
 });
 await page.goto('/orders');await page.locator('tbody').getByRole('button',{name:'Xác nhận',exact:true}).click();
 const dialog=page.getByRole('dialog');await dialog.getByRole('button',{name:'Xác nhận',exact:true}).click();
 await expect(dialog.getByRole('alert')).toContainText('ngoài phạm vi');await expect(page.locator('tbody')).not.toContainText('Đã xử lý');
});

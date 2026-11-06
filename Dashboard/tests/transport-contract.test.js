import {beforeEach,afterEach,it,expect,vi} from 'vitest';
import axios,{AxiosError} from 'axios';
let api,store;
const staff={id:'NV003',role:'STAFF',branchId:1,permissions:['orders:read','orders:confirm-payment']};
const order={orderId:100,branchId:1,source:'STAFF',createdByEmployeeId:'NV003',orderStatus:'PENDING',total:80000,ticketDetails:[]};
const ok=(config,data)=>({config,data:{success:true,data},status:200,statusText:'OK',headers:{}});
beforeEach(async()=>{
 vi.resetModules();vi.stubEnv('VITE_USE_MOCK','false');vi.stubEnv('VITE_AUTH_REFRESH','false');
 api=(await import('../src/services/api')).default;store=(await import('../src/stores/authStore')).useAuthStore;
 store.getState().setUser(staff);store.getState().setTokens(null,'csrf');
});
afterEach(()=>{vi.restoreAllMocks();vi.unstubAllEnvs();store.getState().logout();});
it('does not call optional refresh by default after a real HTTP 401',async()=>{
 const refresh=vi.spyOn(axios,'post');api.defaults.adapter=async config=>{throw new AxiosError('Expired','ERR_BAD_REQUEST',config,null,{status:401,data:{message:'Expired'},config});};
 await expect(api.get('/orders')).rejects.toThrow('Expired');expect(refresh).not.toHaveBeenCalled();expect(store.getState().user).toBeNull();
});
it('obtains one pre-login CSRF token for concurrent mutations and uses credentials',async()=>{
 store.getState().logout();let csrfCalls=0,writes=0;
 api.defaults.adapter=async config=>{
  expect(config.withCredentials).toBe(true);
  if(config.url==='/auth/csrf'){csrfCalls++;await new Promise(resolve=>setTimeout(resolve,5));return ok(config,{csrfToken:'anonymous-csrf'});}
  writes++;expect(config.headers['X-CSRF-Token']).toBe('anonymous-csrf');return ok(config,{});
 };
 await Promise.all([api.post('/auth/login',{email:'staff@example.test',password:'Demo@12345',provider:'LOCAL'}),api.post('/auth/logout',{})]);
 expect(csrfCalls).toBe(1);expect(writes).toBe(2);
});
it('nested login strips caller-supplied role and restores authoritative me permissions',async()=>{
 const {authService}=await import('../src/services/authService');
 api.defaults.adapter=async config=>{
  if(config.url==='/auth/login'){expect(JSON.parse(config.data)).toEqual({provider:'LOCAL',email:'staff@example.test',password:'Demo@12345'});return ok(config,{user:staff,csrfToken:'new-csrf'});}
  return ok(config,{user:{...staff,permissions:['orders:read']},csrfToken:'me-csrf'});
 };
 await authService.login({email:'staff@example.test',password:'Demo@12345',role:'ADMIN',provider:'OVERRIDE'});
 expect(store.getState().user.permissions).toEqual(['orders:read']);expect(store.getState().csrfToken).toBe('me-csrf');
});
it('preflight prevents online/repeated confirmation before POST and checks commit response',async()=>{
 const {orderService}=await import('../src/services/orderService');let current=order,writes=0,result;
 api.defaults.adapter=async config=>{if(config.method==='get')return ok(config,current);writes++;return ok(config,result);};
 for(const change of [{orderStatus:'AWAITING_PAYMENT',source:'CUSTOMER'},{orderStatus:'PENDING',source:'CUSTOMER'},{orderStatus:'PAID'}]){
  current={...order,...change};await expect(orderService.confirmPayment(100)).rejects.toThrow('không đủ điều kiện');
 }
 expect(writes).toBe(0);current=order;
 for(const change of [{orderStatus:'PENDING'},{orderStatus:'PAID',branchId:2},{orderStatus:'PAID',source:'CUSTOMER'},{orderStatus:'PAID',orderId:101}]){
  result={...order,...change};await expect(orderService.confirmPayment(100)).rejects.toThrow();
 }
 result={...order,orderStatus:'PAID'};expect((await orderService.confirmPayment(100)).orderStatus).toBe('PAID');
});
it('validates report branch and exact resolution acknowledgement; leaves paged CMS supported',async()=>{
 store.getState().setUser({...staff,role:'MANAGER',permissions:['comment-reports:read','comment-reports:update']});
 const {commentReportService}=await import('../src/services/commentReportService');
 const report={reportId:2,targetId:9,targetType:'CINEMA_REVIEW',target:{reviewId:9,branchId:2,content:'Out of scope'},status:'PENDING'};
 let result=[report];api.defaults.adapter=async config=>ok(config,result);
 await expect(commentReportService.list()).rejects.toThrow('ngoài phạm vi');
 result=[{...report,target:{...report.target,branchId:1}}];expect((await commentReportService.list()).items[0].target.reviewId).toBe(9);
 result={...result[0],status:'PENDING'};await expect(commentReportService.resolve(2,'DISMISS')).rejects.toThrow('API chưa xác nhận');
 result={...result,status:'RESOLVED',resolutionAction:'DISMISS'};expect((await commentReportService.resolve(2,'DISMISS')).reportId).toBe(2);
 const {resourceService}=await import('../src/services/contentService');
 api.defaults.adapter=async config=>({...ok(config,[{id:1,status:'PUBLISHED'}]),data:{success:true,data:[{id:1,status:'PUBLISHED'}],meta:{total:20,page:1,pageSize:1}}});
 expect((await resourceService('faq').list({page:1,pageSize:1})).total).toBe(20);
});

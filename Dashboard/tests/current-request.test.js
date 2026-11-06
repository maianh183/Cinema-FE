import {describe,it,expect,beforeEach} from 'vitest';
import {showtimeStatus} from '../src/utils/showtimeStatus';
import {canCancelOrder} from '../src/utils/business';
import {mockAdapter,resetMock} from '../src/mocks/adapter';
const request=(url,method='get',data={})=>mockAdapter({url,method,data:JSON.stringify(data),headers:{}});
beforeEach(resetMock);
describe('Showtime temporal status',()=>{
 it('uses Vietnam timezone and half-open boundaries rather than stale server status',()=>{const st={day:'2026-10-25',startTime:'10:00:00',endTime:'12:00:00',status:'FINISHED'};expect(showtimeStatus(st,Date.parse('2026-10-25T02:59:59Z'))).toBe('SCHEDULED');expect(showtimeStatus(st,Date.parse('2026-10-25T03:00:00Z'))).toBe('ON_AIR');expect(showtimeStatus(st,Date.parse('2026-10-25T05:00:00Z'))).toBe('FINISHED');});
 it('handles overnight and rejects invalid date/time',()=>{expect(showtimeStatus({day:'2026-12-31',startTime:'23:00',endTime:'01:00'},Date.parse('2027-01-01T00:30:00+07:00'))).toBe('ON_AIR');expect(showtimeStatus({day:'2026-02-30',startTime:'10:00',endTime:'12:00'})).toBe('INVALID');});
});
describe('Cancel pending counter orders',()=>{
 it('requires explicit permission, pending source and own branch even with broader branchIds',()=>{const user={role:'MANAGER',branchId:1,branchIds:[1,2],permissions:['orders:cancel']},order={branchId:1,orderStatus:'PENDING',source:'STAFF',createdByEmployeeId:'NV003'};expect(canCancelOrder(user,order)).toBe(true);for(const patch of [{branchId:2},{orderStatus:'PAID'},{orderStatus:'CANCELLED'},{source:'CUSTOMER'}])expect(canCancelOrder(user,{...order,...patch})).toBe(false);expect(canCancelOrder({...user,permissions:['orders:read']},order)).toBe(false);});
 it('preserves history, frees seats and rejects repeated cancellation or confirmation',async()=>{
  await request('/auth/login','post',{email:'staff@cinema.test',password:'Demo@12345'});const before=(await request('/orders')).data.data,order=before.find(o=>o.orderStatus==='PENDING'),ticket=order.ticketDetails[0];
  const seatsUrl=`/seats/branches/${order.branchId}/rooms/${ticket.roomId}?showtimeId=${ticket.showtimeId}`;
  const seat=rows=>rows.find(s=>s.sRow===ticket.sRow&&s.sColumn===ticket.sColumn);
  expect(seat((await request(seatsUrl)).data.data).isBooked).toBe(true);
  const result=(await request('/orders/'+order.orderId+'/cancel','post')).data.data;
  expect(result).toMatchObject({orderStatus:'CANCELLED',cancelledBy:'NV003',total:order.total});expect(result.cancelledAt).toBeTruthy();
  const after=(await request('/orders')).data.data;expect(after).toHaveLength(before.length);expect(after.filter(o=>o.orderStatus==='PENDING')).toHaveLength(before.filter(o=>o.orderStatus==='PENDING').length-1);expect(seat((await request(seatsUrl)).data.data).isBooked).toBe(false);
  await expect(request('/orders/'+order.orderId+'/cancel','post')).rejects.toMatchObject({response:{status:409}});await expect(request('/orders/'+order.orderId+'/confirm-payment','post')).rejects.toMatchObject({response:{status:409}});
  const paid=before.find(o=>o.orderStatus==='PAID');await expect(request('/orders/'+paid.orderId+'/cancel','post')).rejects.toMatchObject({response:{status:409}});await expect(request('/orders/101/cancel','post')).rejects.toMatchObject({response:{status:404}});
 });
});

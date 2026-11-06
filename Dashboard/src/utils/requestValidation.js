import { businessTime } from './business';
// Client-side checks complement (never replace) PHP validation.
export function validateMutation(url, method, data) {
 if(['post','put','patch'].includes(method)&&/^\/customers\/[^/]+$/.test(url.split('?')[0]))throw new Error('Chỉ khách hàng được thay đổi thông tin cá nhân của mình.');
 if(!['post','put','patch'].includes(method)||!data||typeof data!=='object'||data instanceof FormData)return;
 const path=url.split('?')[0];const root=path.split('/')[1];
 const fail=message=>{throw new Error(message);};
 const number=(value,min=0,max=Number.MAX_SAFE_INTEGER)=>Number.isFinite(Number(value))&&Number(value)>=min&&Number(value)<=max;
 const nonempty=v=>typeof v==='string'&&!!v.trim();
 if(root==='movies'&&('mName' in data)&&(!nonempty(data.mName)||!number(data.runTime,1,600)||!data.releaseDate||!data.closingDate||data.closingDate<data.releaseDate))fail('Phim cần tên, thời lượng 1–600 phút và khoảng ngày chiếu hợp lệ.');
 if(['food-drinks','merchandise'].includes(root)){
  if(!nonempty(data.pName||data.merchName)||!number(data.price)||!number(data.quantity??data.availNum)||!Number.isInteger(Number(data.quantity??data.availNum)))fail('Tên sản phẩm, giá và số lượng không hợp lệ.');
  if((!data.startDate||!data.endDate||data.endDate<data.startDate))fail('Thời gian kinh doanh sản phẩm không hợp lệ.');
 }
 if(root==='branches'&&(!nonempty(data.bName)||!nonempty(data.bAddress)||data.phoneNumbers?.some(p=>!/^[+\d\s()-]{8,20}$/.test(p))))fail('Nhập tên, địa chỉ và số điện thoại hợp lệ cho chi nhánh.');
 if(root==='rooms'&&('roomId' in data)&&(!number(data.roomId,1)||!number(data.rCapacity,1,500)||!number(data.basePrice)))fail('Mã phòng, sức chứa hoặc giá phòng không hợp lệ.');
 if(root==='showtimes'&&(!number(data.movieId,1)||!number(data.branchId,1)||!number(data.roomId,1)||!data.day||!data.startTime||!data.endTime||!Number.isFinite(businessTime((data.endDate||data.day)+'T'+data.endTime))||businessTime((data.endDate||data.day)+'T'+data.endTime)<=businessTime(data.day+'T'+data.startTime)))fail('Nhập phim, phòng, ngày và thời lượng phim hợp lệ.');
 if(root==='coupons'&&(data.endDate<data.startDate||!number(data.saleOff,1,100)||!number(data.releaseNum)||!Number.isInteger(Number(data.releaseNum))||!Number.isFinite(businessTime(data.startDate))||!Number.isFinite(businessTime(data.endDate,true))))fail('Ngày hiệu lực, mức giảm hoặc số lượng coupon không hợp lệ.');
 if(root==='employees'&&!/\/(activate|deactivate|work-shifts)$/.test(path)){
  if(!nonempty(data.eName)||!number(data.salary)||!number(data.branchId,1)||!['ADMIN','MANAGER','STAFF'].includes(data.userType))fail('Họ tên, vai trò, chi nhánh và lương nhân viên không hợp lệ.');
  if(method==='post'&&(!data.ePassword||data.ePassword.length<10))fail('Mật khẩu nhân viên mới cần ít nhất 10 ký tự.');
 }
 if(root==='work-shifts'&&(!data.startTime||!data.endTime||data.endTime<=data.startTime||!number(data.wDate,1,7)||!nonempty(data.work)))fail('Ca làm việc cần công việc, thứ và giờ kết thúc sau giờ bắt đầu.');
 if(root==='orders'&&'orderStatus' in data)fail('Trạng thái thanh toán chỉ thay đổi qua quy trình xác nhận của máy chủ.');
 if(root==='orders'&&method==='post'&&!/\/(confirm-payment|cancel)$/.test(path)){
  if(!data.tickets?.length||data.tickets.some(t=>!number(t.showtimeId,1)||!number(t.sRow,1)||!number(t.sColumn,1)||!number(t.tPrice)))fail('Đơn hàng cần vé, ghế và giá hợp lệ.');
  if(data.addons?.some(a=>!number(a.quantity,1)||!number(a.price)))fail('Số lượng sản phẩm trong đơn không hợp lệ.');
 }
}


import {inHomeBranch as inBranchScope} from '../utils/schedule';
import {orderBlocksSeat,productKey} from '../utils/apiContract';
export function orderDraft(db,session,body,fail){
 if(!body.tickets?.length)fail(422,'Chọn ít nhất một vé.');
 if(!inBranchScope(session,body.branchId))fail(403,'Ngoài phạm vi chi nhánh.');
 if(body.customerId&&!db.customers.some(c=>c.cUserId===body.customerId&&c.isActive))fail(422,'Khách hàng không hợp lệ.');
 const seen=new Set();
 const ticketDetails=body.tickets.map((t,i)=>{
  const st=db.showtimes.find(s=>s.timeId===Number(t.showtimeId)&&s.branchId===Number(body.branchId)&&s.branchId===Number(t.branchId)&&s.roomId===Number(t.roomId));
  const seat=db.seats.find(s=>s.branchId===st?.branchId&&s.roomId===st?.roomId&&s.sRow===Number(t.sRow)&&s.sColumn===Number(t.sColumn)&&s.sStatus);
  if(!st||!seat)fail(422,'Suất chiếu hoặc ghế không hợp lệ.');
  const key=[st.timeId,seat.sRow,seat.sColumn].join(':');
  if(seen.has(key)||db.orders.some(o=>orderBlocksSeat(o)&&o.ticketDetails.some(x=>x.showtimeId===st.timeId&&x.sRow===seat.sRow&&x.sColumn===seat.sColumn)))fail(409,'Ghế đã được đặt.');seen.add(key);
  const room=db.rooms.find(r=>r.branchId===st.branchId&&r.roomId===st.roomId);
  if(!room||!Number.isFinite(room.basePrice)||room.basePrice<0||!Number.isFinite(seat.sPrice)||seat.sPrice<0)fail(422,'Giá phòng hoặc phụ thu ghế không hợp lệ.');
  return {ticketId:Math.max(0,...db.orders.flatMap(o=>o.ticketDetails.map(x=>x.ticketId)))+i+1,showtimeId:st.timeId,movieId:st.movieId,movieName:db.movies.find(m=>m.movieId===st.movieId)?.mName,branchId:st.branchId,branchName:db.branches.find(b=>b.branchId===st.branchId)?.bName,roomId:st.roomId,screenRoomName:'Phòng '+st.roomId,sRow:seat.sRow,sColumn:seat.sColumn,seatName:String.fromCharCode(64+seat.sRow)+seat.sColumn,showtime:st.day+'T'+st.startTime+'+07:00',price:room.basePrice+seat.sPrice};
 });
 const products=[...db['food-drinks'].map(p=>({...p,itemType:'FOOD_DRINK'})),...db.merchandise.map(p=>({...p,itemType:'MERCHANDISE'}))];
 const addonKeys=new Set();
 const addonDetails=(body.addons||[]).map(a=>{
  if(a.itemType!=null&&!['FOOD_DRINK','MERCHANDISE'].includes(a.itemType))fail(422,'Loại sản phẩm không hợp lệ.');
  const matches=products.filter(p=>p.productId===Number(a.productId)&&(a.itemType?p.itemType===a.itemType:a.pType?(a.pType==='MERCHANDISE'?p.itemType==='MERCHANDISE':p.itemType==='FOOD_DRINK'&&p.pType===a.pType):true));
  if(matches.length!==1)fail(422,'Sản phẩm thiếu khóa nhóm/ID rõ ràng.');
  const p=matches[0],key=productKey(p);
  if(addonKeys.has(key)||!Number.isInteger(a.quantity)||a.quantity<1||a.quantity>Number(p.itemType==='FOOD_DRINK'?p.quantity:p.availNum))fail(422,'Sản phẩm hoặc số lượng không hợp lệ.');
  addonKeys.add(key);
  return {productId:p.productId,itemType:p.itemType,productName:p.pName||p.merchName,pName:p.pName||p.merchName,pType:p.pType||'MERCHANDISE',price:p.price,quantity:a.quantity};
 });
 const total=ticketDetails.reduce((s,t)=>s+t.price,0)+addonDetails.reduce((s,a)=>s+a.price*a.quantity,0);
 return {branchId:Number(body.branchId),paymentMethod:body.paymentMethod||'CASH',orderTime:new Date().toISOString(),source:'STAFF',createdByEmployeeId:session.id,orderStatus:'PENDING',originalTotal:total,discountAmount:0,total,customer:db.customers.find(c=>c.cUserId===body.customerId)||null,ticketDetails,addonDetails};
}

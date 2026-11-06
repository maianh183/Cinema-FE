import {can} from '../utils/permissions';
import {inBranchScope,validateShift,shiftsConflict,shiftKey} from '../utils/schedule';

// Models server enforcement for development; PHP must enforce the same scope transactionally.
export function workSchedules({db,session,resource,id,parts,method,params,body,ok,fail}){
 const assignment=resource==='employees'&&parts[2]==='work-shifts';
 if(resource!=='work-shifts'&&!assignment)return;
 const shifts=db['work-shifts'];
 if(!assignment&&id==='me'){
  if(method!=='GET'||!can(session,'workshifts','read-own'))fail(403,'Không có quyền xem lịch cá nhân.');
  if(Object.keys(params).some(k=>!['startDate','endDate'].includes(k)))fail(422,'Lịch cá nhân chỉ được xác định từ phiên đăng nhập.');
  if(params.startDate&&params.endDate&&params.endDate<params.startDate)fail(422,'Khoảng ngày không hợp lệ.');
  return ok(shifts.filter(s=>s.employees.some(e=>e.eUserId===session.id)).map(({employees,...s})=>({...s,employeeId:session.id,branchName:db.branches.find(b=>b.branchId===s.branchId)?.bName})));
 }
 const action=method==='GET'?'read':method==='DELETE'?'delete':assignment?'create':method==='POST'?'create':'update';
 if(session.role==='STAFF'||!can(session,'workshifts',action))fail(403,'Không có quyền quản lý lịch làm việc.');
 const branchId=params.branchId||(id==='branch'?parts[2]:null);
 if(branchId&&!inBranchScope(session,branchId))fail(403,'Ngoài phạm vi chi nhánh.');
 const scoped=shifts.filter(s=>inBranchScope(session,s.branchId));
 const matches=s=>shiftKey(s)===shiftKey(params);
 const validate=s=>{try{validateShift(s);}catch(e){fail(422,e.message);}if(!inBranchScope(session,s.branchId))fail(403,'Ngoài phạm vi chi nhánh.');if(!db.branches.some(b=>Number(b.branchId)===Number(s.branchId)))fail(422,'Chi nhánh không tồn tại.');};
 const clean=s=>({branchId:Number(s.branchId),wDate:Number(s.wDate),startTime:s.startTime,endTime:s.endTime,work:String(s.work).trim()});
 if(assignment){
  const employee=db.employees.find(e=>String(e.eUserId)===String(id)&&inBranchScope(session,e.branchId));
  if(!employee)fail(404,'Không tìm thấy nhân viên trong phạm vi quản lý.');
  if(method==='DELETE'){
   const target=scoped.find(matches);if(!target||!target.employees.some(e=>e.eUserId===id))fail(404,'Không tìm thấy phân công.');
   target.employees=target.employees.filter(e=>e.eUserId!==id);return ok(null);
  }
  if(method!=='PUT'||!Array.isArray(body)||!body.length)fail(422,'Danh sách phân công không hợp lệ.');
  const requests=body.map(s=>{validate(s);if(Number(s.branchId)!==Number(employee.branchId))fail(422,'Nhân viên không thuộc chi nhánh được chọn.');return clean(s);});
  // Validate the whole batch before mutating anything, including conflicts within the batch.
  for(let i=0;i<requests.length;i++){
   const request=requests[i];
   if(shifts.some(s=>s.employees.some(e=>e.eUserId===id)&&shiftsConflict(s,request))||requests.slice(0,i).some(s=>shiftsConflict(s,request)))fail(409,'Lịch làm việc trùng hoặc xung đột.');
   const group=shifts.find(s=>shiftKey(s)===shiftKey(request));
   if(group&&group.work!==request.work)fail(409,'Khung giờ này đã có tên ca khác.');
  }
  for(const request of requests){let group=shifts.find(s=>shiftKey(s)===shiftKey(request));if(!group){group={...request,employees:[]};shifts.push(group);}group.employees.push(employee);}
  return ok(null);
 }
 if(method==='GET'){
  const list=scoped.filter(s=>!branchId||Number(s.branchId)===Number(branchId));
  if(id==='detail'){const target=list.find(matches);if(!target)fail(404,'Không tìm thấy ca làm.');return ok(target);}
  return ok(list);
 }
 if(method==='POST'){
  validate(body);const next=clean(body);if(shifts.some(s=>shiftKey(s)===shiftKey(next)))fail(409,'Ca làm đã tồn tại.');
  const created={...next,employees:[]};shifts.push(created);return ok(created,201);
 }
 const target=scoped.find(matches);if(!target)fail(404,'Không tìm thấy ca làm trong phạm vi quản lý.');
 if(method==='DELETE'){db['work-shifts']=shifts.filter(s=>s!==target);return ok(null);}
 if(method!=='PUT')fail(405,'Phương thức không được hỗ trợ.');
 validate(body);const next=clean(body);
 if(next.branchId!==target.branchId)fail(422,'Không được chuyển chi nhánh của ca làm.');
 if(shifts.some(s=>s!==target&&(shiftKey(s)===shiftKey(next)||shiftsConflict(s,next)&&s.employees.some(e=>target.employees.some(t=>t.eUserId===e.eUserId)))))fail(409,'Lịch làm việc trùng hoặc xung đột.');
 Object.assign(target,next);return ok(target);
}

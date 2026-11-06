import {useEffect,useState} from 'react';
import {toast} from 'sonner';
import {useAuthStore} from '@/stores/authStore';
import {can} from '@/utils/permissions';
import {inHomeBranch as inBranchScope} from '@/utils/schedule';
import {todayVN,calendarRange,schedulesOverlap,validateSchedule} from '@/utils/calendar';
import {workScheduleService} from '@/services/workScheduleService';
import {employeeService} from '@/services/employeeService';
import {branchService} from '@/services/branchService';
import CalendarView from '@/components/calendar/CalendarView';
import WorkShiftForm from '@/components/WorkShiftForm';
import FormModal from '@/components/modals/FormModal';
import {ConfirmModal} from '@/components/ui/confirm-modal';
import {ErrorState} from '@/components/ui/Feedback';
export default function ShiftPage(){
 const user=useAuthStore(s=>s.user),manager=can(user,'workshifts','read')&&user.role!=='STAFF';
 const [ownOnly,setOwnOnly]=useState(false),[date,setDate]=useState(todayVN),[view,setView]=useState('week');
 const personal=!manager||ownOnly;
 const [branchId,setBranchId]=useState(user.role==='ADMIN'?'':user.branchId||''),[employeeId,setEmployeeId]=useState(''),[q,setQ]=useState('');
 const [shifts,setShifts]=useState([]),[branches,setBranches]=useState([]),[employees,setEmployees]=useState([]),[loading,setLoading]=useState(true),[error,setError]=useState(''),[revision,setRevision]=useState(0);
 const [detail,setDetail]=useState(null),[editing,setEditing]=useState(null),[pending,setPending]=useState(null);
 const {startDate,endDate}=calendarRange(date,view);
 useEffect(()=>{let live=true;setLoading(true);setError('');setShifts([]);setDetail(null);setEditing(null);
  async function load(){
   if(personal){const rows=await workScheduleService.mine({startDate,endDate});if(!Array.isArray(rows)||rows.some(s=>String(s.employeeId)!==String(user.id)))throw new Error('API lịch cá nhân trả dữ liệu không đúng tài khoản.');if(live)setShifts(rows);return;}
   if(user.role!=='ADMIN'&&!inBranchScope(user,branchId))throw new Error('Tài khoản chưa được cấp phạm vi chi nhánh hợp lệ.');
   const [rows,people,places]=await Promise.all([workScheduleService.list({startDate,endDate,branchId,employeeId}),branchId?employeeService.getByBranch(branchId):employeeService.getAll(),branchService.getAll()]);
   if(!Array.isArray(rows)||rows.some(s=>!inBranchScope(user,s.branchId))||!Array.isArray(people)||people.some(p=>!inBranchScope(user,p.branchId)))throw new Error('API trả dữ liệu ngoài phạm vi chi nhánh được cấp.');
   if(live){setShifts(rows);setEmployees(people);setBranches(places.filter(b=>inBranchScope(user,b.branchId)));}
  }
  load().catch(e=>live&&setError(e.message)).finally(()=>live&&setLoading(false));return()=>{live=false;};
 },[personal,branchId,employeeId,revision,startDate,endDate,user]);
 const allowed=(action,shift)=>manager&&!personal&&can(user,'workshifts',action)&&(!shift||inBranchScope(user,shift.branchId));
 const rows=shifts.filter(s=>!q||`${s.work} ${s.position||''}`.toLocaleLowerCase('vi').includes(q.toLocaleLowerCase('vi')));
 const events=rows.map(s=>({id:s.scheduleId,date:s.workDate,endDate:s.endDate,startTime:s.startTime,endTime:s.endTime,title:s.work,subtitle:[s.branchName||'Chi nhánh '+s.branchId,...(personal?[]:[s.employeeName||s.employeeId])].join(' · '),color:Number(s.branchId)-1,resource:s}));
 async function save(values){const original=editing?.shift;if(!allowed(original?'update':'create',values))throw new Error('Không có quyền thay đổi lịch này.');validateSchedule(values);if(shifts.some(s=>s.scheduleId!==original?.scheduleId&&schedulesOverlap(s,values)))throw new Error('Nhân viên đã có lịch trùng thời gian.');await workScheduleService.save(values,original?.scheduleId);setRevision(v=>v+1);setDetail(null);toast.success('Đã cập nhật lịch làm việc.');}
 async function remove(){if(!allowed('delete',pending))throw new Error('Không có quyền xóa lịch này.');await workScheduleService.remove(pending.scheduleId);setDetail(null);setRevision(v=>v+1);toast.success('Đã hủy phân công lịch làm việc.');}
 return <section className="space-y-4"><div className="flex flex-wrap justify-between gap-3"><h1 className="text-2xl font-semibold">Lịch làm việc</h1>{allowed('create')&&<button className="btn-primary" disabled={loading||!!error} onClick={()=>setEditing({shift:null})}>Thêm lịch làm việc</button>}</div><p className="text-sm text-gray-500">Lịch phân công theo ngày · múi giờ Việt Nam. Ca qua đêm được hiển thị trên cả hai ngày.</p><div className="flex flex-wrap gap-3 items-end">{manager&&can(user,'workshifts','read-own')&&<label className="flex gap-2 items-center text-sm py-3"><input type="checkbox" checked={ownOnly} onChange={e=>setOwnOnly(e.target.checked)}/>Chỉ xem lịch của tôi</label>}{!personal&&<>{user.role==='ADMIN'&&<label className="field">Chi nhánh<select aria-label="Chi nhánh" value={branchId} onChange={e=>{setBranchId(e.target.value);setEmployeeId('');}}>{user.role==='ADMIN'&&<option value="">Tất cả chi nhánh</option>}{branches.map(b=><option key={b.branchId} value={b.branchId}>{b.bName}</option>)}</select></label>}<label className="field">Nhân viên<select aria-label="Nhân viên" value={employeeId} onChange={e=>setEmployeeId(e.target.value)}><option value="">Tất cả nhân viên</option>{employees.map(e=><option key={e.eUserId} value={e.eUserId}>{e.eName}</option>)}</select></label></>}<label className="field">Tìm ca làm<input value={q} onChange={e=>setQ(e.target.value)} placeholder="Tên ca / vị trí"/></label></div>
 {error?<ErrorState error={error} retry={()=>setRevision(v=>v+1)}/>:<CalendarView date={date} view={view} onNavigate={setDate} onViewChange={setView} events={events} loading={loading} onEventClick={setDetail} emptyMessage={personal?'Bạn chưa có lịch làm việc trong khoảng thời gian này.':'Không có lịch làm việc phù hợp.'}/>}
 <FormModal open={!!detail} onClose={()=>setDetail(null)} title="Chi tiết lịch làm việc"><dl className="space-y-3 text-sm">{detail&&[['Ngày',detail.workDate+(detail.endDate!==detail.workDate?' → '+detail.endDate:'')],['Giờ',detail.startTime+' – '+detail.endTime],['Ca / công việc',detail.work],['Nhân viên',personal?user.name:detail.employeeName||detail.employeeId],['Chi nhánh',detail.branchName||detail.branchId],['Vị trí',detail.position||'—'],['Trạng thái',detail.status==='ASSIGNED'?'Đã phân công':detail.status||'—']].map(([key,value])=><div key={key}><dt className="font-semibold">{key}</dt><dd>{value}</dd></div>)}</dl><div className="flex flex-wrap gap-2 mt-5">{detail&&allowed('update',detail)&&<button className="btn-primary" onClick={()=>{setEditing({shift:detail});setDetail(null);}}>Chỉnh sửa lịch</button>}{detail&&allowed('delete',detail)&&<button className="btn-danger" onClick={()=>setPending(detail)}>Hủy phân công</button>}</div></FormModal>
 {editing&&<WorkShiftForm shift={editing.shift} date={date} branchSelectable={user.role==='ADMIN'} branches={branches.filter(b=>!branchId||String(b.branchId)===String(branchId))} employees={employees} onClose={()=>setEditing(null)} onSave={save}/>}
 <ConfirmModal key={pending?.scheduleId||'none'} isOpen={!!pending} onClose={()=>setPending(null)} title="Hủy phân công lịch làm việc?" description="Chỉ hủy lịch của nhân viên này trong ngày đã chọn sau khi máy chủ xác nhận." onConfirm={remove}/></section>;
}

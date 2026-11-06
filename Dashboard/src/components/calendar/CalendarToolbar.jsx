import {useState} from 'react';
import {CalendarDays,ChevronLeft,ChevronRight} from 'lucide-react';
import {calendarDays,dayNumber,navigateCalendar,todayVN} from '@/utils/calendar';

function ShortDateInput({date,onChange}){
 const [text,setText]=useState(date.slice(5,7)+'/'+date.slice(8)+'/'+date.slice(2,4));
 const [error,setError]=useState('');
 function commit(){
  const match=/^(\d{2})\/(\d{2})\/(\d{2}|\d{4})$/.exec(text);
  const value=match?`${match[3].length===2?'20'+match[3]:match[3]}-${match[1]}-${match[2]}`:'';
  if(!Number.isFinite(dayNumber(value))){setError('Nhập ngày hợp lệ theo mm/dd/yy, ví dụ 10/25/26.');return;}
  setError('');onChange(value);
 }
 return <div><div className="flex items-center gap-1"><label className="flex flex-col gap-1 text-xs text-gray-500">Ngày đang xem (mm/dd/yy)<input className="form-control !w-36" aria-label="Ngày đang xem" aria-invalid={!!error} type="text" inputMode="numeric" placeholder="mm/dd/yy" value={text} title="Năm hai chữ số thuộc 2000–2099; có thể nhập đủ bốn chữ số." onChange={e=>{setText(e.target.value);setError('');}} onBlur={commit} onKeyDown={e=>{if(e.key==='Enter'){e.preventDefault();commit();}}}/></label><label className="relative mt-5 icon-btn" title="Chọn ngày trên lịch"><CalendarDays size={20}/><input aria-label="Chọn ngày trên lịch" className="absolute inset-0 w-full opacity-0 cursor-pointer" type="date" value={date} onChange={e=>Number.isFinite(dayNumber(e.target.value))&&onChange(e.target.value)}/></label></div>{error&&<p role="alert" className="text-xs text-red-600 mt-1">{error}</p>}</div>;
}

export default function CalendarToolbar({date,view,onNavigate,onViewChange,shortDateInput=false,active=true}){
 const days=calendarDays(date,view),short=value=>value.slice(8)+'/'+value.slice(5,7);
 const title=view==='month'?`Tháng ${Number(date.slice(5,7))}, ${date.slice(0,4)}`:view==='week'?`${short(days[0])} – ${short(days.at(-1))}/${days.at(-1).slice(0,4)}`:`${short(date)}/${date.slice(0,4)}`;
 return <div className="flex flex-wrap items-center gap-2 p-3 border-b bg-white shrink-0" role="group" aria-label="Điều khiển lịch"><button className="icon-btn" aria-label="Khoảng trước" onClick={()=>onNavigate(navigateCalendar(date,view,-1))}><ChevronLeft size={20}/></button><button className="icon-btn" aria-label="Khoảng tiếp theo" onClick={()=>onNavigate(navigateCalendar(date,view,1))}><ChevronRight size={20}/></button><button className="btn-secondary" onClick={()=>onNavigate(todayVN())}>Hôm nay</button><h2 className="font-semibold text-base flex-1 min-w-40" aria-live="polite">{title}</h2>{shortDateInput?<ShortDateInput key={date} date={date} onChange={onNavigate}/>:<input className="form-control !w-auto" aria-label="Ngày đang xem" type="date" value={date} onChange={e=>Number.isFinite(dayNumber(e.target.value))&&onNavigate(e.target.value)}/>}<div className="flex rounded-lg bg-gray-100 p-1" aria-label="Chế độ lịch">{[['day','Ngày'],['week','Tuần'],['month','Tháng']].map(([key,label])=><button type="button" key={key} aria-pressed={active&&view===key} className={'px-3 py-2 text-sm rounded-md '+(active&&view===key?'bg-white text-indigo-700 shadow-sm':'text-gray-600')} onClick={()=>onViewChange(key)}>{label}</button>)}</div></div>;
}

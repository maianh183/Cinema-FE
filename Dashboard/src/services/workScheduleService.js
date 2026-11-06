import api, {getFullList} from './api';
import {validateSchedule} from '@/utils/calendar';
// Dated assignments extend the weekly work-shift contract; PHP must implement this resource.
export const workScheduleService={
 list:async ({startDate,endDate,branchId,employeeId}={})=>getFullList('/work-schedules',{params:{startDate,endDate,branchId,employeeId}}),
 mine:async ({startDate,endDate}={})=>getFullList('/work-schedules/me',{params:{startDate,endDate}}),
 save:async (values,id)=>{validateSchedule(values);const result=await (id?api.put('/work-schedules/'+encodeURIComponent(id),values):api.post('/work-schedules',values));if(!result.data?.scheduleId)throw new Error('API chưa trả lịch đã lưu. Vui lòng tải lại để đối chiếu.');return result.data;},
 remove:async id=>{await api.delete('/work-schedules/'+encodeURIComponent(id));},
};

import api from './api';
import {contentReport} from '@/utils/contentModels';
import { resourceService } from './contentService';
import {useAuthStore} from '@/stores/authStore';
import {inBranchScope} from '@/utils/schedule';
export function reportDto(data,user) {
  const report=contentReport(data);
  if(report.targetType==='CINEMA_REVIEW'&&!inBranchScope(user,report.target?.branchId))throw new Error('API trả báo cáo ngoài phạm vi được cấp quyền.');
  return report;
}
export const commentReportService = {
  list: async params => {const result=await resourceService('comment-reports').list(params);return {...result,items:result.items.map(row=>reportDto(row,useAuthStore.getState().user))};},
  resolve: async (id, action) => {
    if(!['DISMISS','DELETE'].includes(action))throw new Error('Hành động xử lý không hợp lệ.');
    const result=reportDto((await api.post('/comment-reports/'+encodeURIComponent(id)+'/resolve',{action})).data,useAuthStore.getState().user);
    if(String(result.reportId)!==String(id)||result.status!=='RESOLVED'||result.resolutionAction!==action)throw new Error('API chưa xác nhận kết quả xử lý báo cáo. Hãy tải lại trước khi thử tiếp.');
    return result;
  },
};

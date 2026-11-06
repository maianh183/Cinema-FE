import api from './api';
import {contactDto,validateContactStatus} from '@/utils/contacts';
export const contactService={
 list:async({page=1,pageSize=10,q='',status=''}={})=>{
  const response=await api.get('/contacts',{params:{page,pageSize,q,status}}),meta=response.pagination;
  if(!Array.isArray(response.data)||!meta||!Number.isSafeInteger(meta.total)||meta.total<response.data.length||meta.page!==page||meta.pageSize!==pageSize||response.data.length>pageSize)throw new Error('API danh sách liên hệ thiếu phân trang hợp lệ.');
  return {items:response.data.map(row=>contactDto(row)),total:meta.total};
 },
 detail:async id=>contactDto((await api.get('/contacts/'+encodeURIComponent(id))).data,id),
 status:async(id,status)=>{
  const result=contactDto((await api.patch('/contacts/'+encodeURIComponent(id)+'/status',validateContactStatus({status}))).data,id);
  if(result.status!==status)throw new Error('API chưa xác nhận trạng thái liên hệ.');return result;
 },
 remove:async id=>{await api.delete('/contacts/'+encodeURIComponent(id));},
};

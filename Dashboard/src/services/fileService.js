import api from './api';
import {validateImage,safeImageUrl} from '@/utils/validation';
export const fileService={
 uploadFile:async(file,folderName='media')=>{
  validateImage(file);const data=new FormData();data.append('file',file);
  const result=(await api.post('/files/upload',data,{params:{folderName}})).data;
  const item=Array.isArray(result)?result[0]:result;
  const url=typeof item==='string'?item:item?.url||item?.secure_url;
  if(!url||!safeImageUrl(url))throw new Error('Máy chủ chưa trả về URL ảnh hợp lệ.');
  return url;
 },
 uploadVideo:async()=>{throw new Error('Upload video chưa được xác minh với PHP backend. Sử dụng trường trailer của phim.');}
};


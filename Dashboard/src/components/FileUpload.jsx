import { useState, useRef } from 'react';
import { UploadCloud, ImagePlus } from 'lucide-react';
import { fileService } from '@/services/fileService';
import { resourceService } from '@/services/contentService';
import { safeImageUrl } from '@/utils/validation';
import { useAuthStore } from '@/stores/authStore';
import { can } from '@/utils/permissions';
import FormModal from '@/components/modals/FormModal';
import Pagination from '@/components/tables/Pagination';
export default function FileUpload({folderName='media',initialPreviewUrl='',onUploadSuccess,onUploadError,onUploadingChange,className=''}){
 const [busy,setBusy]=useState(false),[error,setError]=useState(''),[picker,setPicker]=useState(null);const lock=useRef(false);const user=useAuthStore(s=>s.user);
 async function upload(file){if(lock.current)return;lock.current=true;setBusy(true);onUploadingChange?.(true);setError('');
  try{const url=await fileService.uploadFile(file,folderName);onUploadSuccess(url);}
  catch(e){setError(e.message);onUploadError?.(e);}finally{lock.current=false;setBusy(false);onUploadingChange?.(false);}
 }
 async function pick(page=1){setError('');try{const result=await resourceService('media').list({page,pageSize:8});setPicker({...result,page});}catch(e){setError(e.message);}}
 return <div className={'space-y-3 '+className}>
  {safeImageUrl(initialPreviewUrl)&&<img src={safeImageUrl(initialPreviewUrl)} alt="Ảnh đã chọn" className="h-40 max-w-full rounded-xl object-contain border bg-gray-50"/>}
  {can(user,'media','create')&&<label className={'flex items-center justify-center gap-3 rounded-xl border-2 border-dashed border-gray-200 p-5 text-sm cursor-pointer '+(busy?'opacity-50':'hover:border-indigo-400')} onDragOver={e=>e.preventDefault()} onDrop={e=>{e.preventDefault();if(e.dataTransfer.files[0])upload(e.dataTransfer.files[0]);}}><UploadCloud size={22}/>{busy?'Đang upload…':'Chọn hoặc kéo ảnh vào đây'}<input aria-label="Upload ảnh" className="sr-only" type="file" accept="image/jpeg,image/png,image/webp" disabled={busy} onChange={e=>{if(e.target.files[0])upload(e.target.files[0]);e.target.value='';}}/></label>}
  <p className="text-xs text-gray-500">JPG, PNG, WebP · tối đa 5 MB · lưu qua PHP server</p>
  <div className="flex flex-wrap gap-2">{can(user,'media')&&<button type="button" className="btn-secondary" disabled={busy} onClick={()=>pick()}><ImagePlus size={16}/>Chọn từ thư viện</button>}{initialPreviewUrl&&<button type="button" className="btn-secondary" disabled={busy} onClick={()=>onUploadSuccess('')}>Bỏ ảnh đã chọn</button>}</div>
  {error&&<p role="alert" className="text-sm text-red-600">{error}</p>}
  <FormModal open={!!picker} onClose={()=>setPicker(null)} title="Chọn ảnh trong thư viện"><div className="grid grid-cols-2 sm:grid-cols-4 gap-3">{picker?.items.map(item=><button type="button" key={item.id} className="border rounded-lg p-2 text-xs" onClick={()=>{onUploadSuccess(item.url);setPicker(null);}}><img src={safeImageUrl(item.url)} alt={item.name} className="h-24 w-full object-contain mb-2"/>{item.name}</button>)}</div>{picker&&<Pagination page={picker.page} pageSize={8} total={picker.total} onChange={pick}/>}</FormModal>
 </div>;
}


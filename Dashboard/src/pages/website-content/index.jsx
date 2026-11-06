import {useEffect,useState} from 'react';
import {toast} from 'sonner';
import {useAuthStore} from '@/stores/authStore';
import {can} from '@/utils/permissions';
import {siteSections,safeHttps,validContentImage} from '@/utils/siteContent';
import {siteContentService} from '@/services/siteContentService';
import {USE_MOCK} from '@/services/api';
import {useUnsavedChanges} from '@/hooks/useUnsavedChanges';
import FileUpload from '@/components/FileUpload';
import {LoadingState,ErrorState} from '@/components/ui/Feedback';
export default function WebsiteContentPage(){
 const user=useAuthStore(s=>s.user),editable=can(user,'website-content','update');
 const [saved,setSaved]=useState(null),[section,setSection]=useState('global'),[draft,setDraft]=useState(null),[loading,setLoading]=useState(true),[loadError,setLoadError]=useState(''),[revision,setRevision]=useState(0);
 const [busy,setBusy]=useState(false),[uploading,setUploading]=useState(false),[error,setError]=useState(''),[errors,setErrors]=useState({});
 useEffect(()=>{let live=true;setLoading(true);setLoadError('');siteContentService.get().then(data=>{if(live){setSaved(data);setSection('global');setDraft(data.global);}}).catch(e=>live&&setLoadError(e.message)).finally(()=>live&&setLoading(false));return()=>{live=false;};},[revision,user]);
 const dirty=!!saved&&JSON.stringify(draft)!==JSON.stringify(saved[section]);
 async function save(){
  if(busy)throw new Error('Vui lòng chờ lưu hoàn tất.');
  if(uploading)throw new Error('Vui lòng chờ upload ảnh hoàn tất.');
  if(!editable)throw new Error('Không có quyền chỉnh sửa nội dung website.');
  setBusy(true);setError('');setErrors({});try{const result=await siteContentService.save(section,draft);setSaved(prev=>({...prev,[section]:result}));setDraft(result);toast.success('Đã lưu '+siteSections[section].label.toLowerCase()+'.');}catch(e){setError(e.message);setErrors(e.errors||e.response?.data?.errors||{});throw e;}finally{setBusy(false);}
 }
 const guard=useUnsavedChanges({dirty:dirty||uploading,onSave:save,onDiscard:()=>{if(uploading)throw new Error('Vui lòng chờ upload hoàn tất.');setDraft(saved[section]);setError('');setErrors({});},description:'Bạn muốn lưu nội dung đang chỉnh sửa trước khi tiếp tục không?'});
 function changeSection(next){if(busy||uploading)return;guard.request(()=>{setSection(next);setDraft(saved[next]);setError('');setErrors({});});}
 function change(key,value){setDraft(prev=>({...prev,[key]:value}));setErrors(prev=>({...prev,[key]:null}));}
 return <section className="space-y-5"><h1 className="text-2xl font-semibold">Nội dung website</h1><p className="text-sm text-gray-500">Biên tập nội dung công khai. Lưu riêng từng mục; không thay đổi giá vé hoặc dữ liệu phim.</p>
 {loading?<LoadingState/>:loadError?<ErrorState error={loadError} retry={()=>setRevision(v=>v+1)}/>:saved&&<>
 <div role="tablist" aria-label="Mục nội dung" className="flex flex-wrap gap-2">{Object.entries(siteSections).map(([key,config])=><button type="button" role="tab" id={'tab-'+key} aria-controls="content-editor" aria-selected={key===section} key={key} disabled={busy||uploading} className={key===section?'btn-primary':'btn-secondary'} onClick={()=>changeSection(key)}>{config.label}</button>)}</div>
 <div role="tabpanel" id="content-editor" aria-labelledby={'tab-'+section} className="grid lg:grid-cols-2 gap-5"><form className="bg-white rounded-2xl border p-5 space-y-4 min-w-0" onSubmit={async e=>{e.preventDefault();if(busy||uploading)return;try{await save();}catch{/* Error remains in editor. */}}}>
 <h2 className="text-lg font-semibold">{siteSections[section].label}</h2><p className="text-sm text-gray-500">{siteSections[section].description}</p>{!editable&&<p>Chỉ xem · tài khoản chưa có quyền cập nhật.</p>}{error&&<ErrorState error={error}/>}
 <fieldset disabled={!editable||busy||uploading} className="space-y-4 min-w-0">{Object.entries(siteSections[section].fields).map(([key,[label,max,required,type]])=><div key={key} className="min-w-0">{type==='image'?<><p className="text-sm font-medium mb-2">{label}</p>{editable?<FileUpload key={section+key} folderName="media" initialPreviewUrl={draft[key]} onUploadSuccess={url=>change(key,url)} onUploadingChange={setUploading}/>:draft[key]&&validContentImage(draft[key],USE_MOCK)?<img className="h-40 max-w-full object-contain" src={draft[key]} alt={label}/>:<p className="text-sm text-gray-500">Chưa có ảnh.</p>}<p className="text-xs text-gray-500">Chọn ảnh qua upload hiện hữu, không nhập URL ảnh bên ngoài.</p></>:<label className="field">{label}{required?' *':''}{type==='textarea'?<textarea className="form-control min-h-28" value={draft[key]} maxLength={max} aria-invalid={!!errors[key]} aria-describedby={errors[key]?key+'-error':undefined} onChange={e=>change(key,e.target.value)}/>:<input className="form-control" type={type==='email'?'email':'text'} value={draft[key]} maxLength={max} aria-invalid={!!errors[key]} aria-describedby={errors[key]?key+'-error':undefined} onChange={e=>change(key,e.target.value)}/>}</label>}{errors[key]&&<p id={key+'-error'} role="alert" className="text-sm text-red-600">{errors[key]}</p>}</div>)}</fieldset>
 <div className="flex flex-wrap gap-3 items-center">{editable&&<button type="submit" className="btn-primary" disabled={busy||uploading||!dirty}>{busy?'Đang lưu…':'Lưu nội dung'}</button>}<span className="text-sm text-gray-500">{uploading?'Đang upload ảnh…':dirty?'Có thay đổi chưa lưu':'Không có thay đổi chưa lưu'}</span></div></form>
 <aside aria-label="Xem trước nội dung" className="bg-white border rounded-2xl p-5 min-w-0 space-y-4"><h2 className="text-lg font-semibold">Xem trước</h2>{Object.entries(siteSections[section].fields).map(([key,[label,,,type]])=><div key={key} className="break-words"><h3 className="text-sm font-medium text-gray-500">{label}</h3>{type==='image'?draft[key]&&validContentImage(draft[key],USE_MOCK)?<img className="mt-2 max-h-60 max-w-full object-contain" src={draft[key]} alt={label}/>:<p>Chưa có ảnh.</p>:type==='url'&&safeHttps(draft[key])?<a className="text-indigo-700 break-all" href={draft[key]} target="_blank" rel="noopener noreferrer">{draft[key]}</a>:<p className="whitespace-pre-wrap">{draft[key]||'Chưa có nội dung.'}</p>}</div>)}{section==='contact'&&<p className="text-sm">{saved.global.contactEmail} · {saved.global.hotline}<br/>{saved.global.address}</p>}</aside></div>
 </>}{guard.dialog}</section>;
}

import { useEffect,useMemo,useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Search, Pencil, Trash2, Eye } from 'lucide-react';
import { toast } from 'sonner';
import { contentConfigs } from './config';
import { resourceService } from '@/services/contentService';
import { can } from '@/utils/permissions';
import { useAuthStore } from '@/stores/authStore';
import { validateFields, safeImageUrl } from '@/utils/validation';
import Fields from '@/components/forms/Fields';
import FormModal from '@/components/modals/FormModal';
import { ConfirmModal } from '@/components/ui/confirm-modal';
import { ErrorState,LoadingState,EmptyState } from '@/components/ui/Feedback';
import StatusBadge from '@/components/ui/StatusBadge';
import Pagination from '@/components/tables/Pagination';
import { Table,TableHeader,TableBody,TableRow,TableCell } from '@/components/tables/Table';
export default function ResourcePage({resource,categoryType}){
 const config=contentConfigs[resource],module=categoryType==='PRODUCT'?'products':config.module||resource;const user=useAuthStore(s=>s.user);
 const service=useMemo(()=>resourceService(resource),[resource]);
 const [result,setResult]=useState({items:[],total:0}),[loading,setLoading]=useState(true),[error,setError]=useState('');
 const [q,setQ]=useState(''),[filters,setFilters]=useState({}),[page,setPage]=useState(1),[revision,setRevision]=useState(0);
 const [editing,setEditing]=useState(null),[values,setValues]=useState({}),[errors,setErrors]=useState({}),[saveError,setSaveError]=useState(''),[busy,setBusy]=useState(false),[uploading,setUploading]=useState(false),[deleting,setDeleting]=useState(null),[detail,setDetail]=useState(null);
 const [categories,setCategories]=useState([]);
 const fields=useMemo(()=>config.fields.map(f=>f.name==='category'?{...f,options:categories.map(c=>c.name)}:categoryType&&f.name==='type'?{...f,options:[[categoryType,categoryType==='PRODUCT'?'Sản phẩm':'Tin tức']]}:f),[config,categories,categoryType]);
 useEffect(()=>{let active=true;if(resource==='news')resourceService('categories').list({page:1,pageSize:100,type:'NEWS'}).then(r=>active&&setCategories(r.items)).catch(e=>active&&setError(e.message));return()=>{active=false;};},[resource]);
 useEffect(()=>{let active=true;setLoading(true);setError('');const timer=setTimeout(()=>{service.list({q,...filters,...(categoryType?{type:categoryType}:{}),page,pageSize:10}).then(r=>{if(active){setResult(r);if(page>1&&!r.items.length)setPage(Math.max(1,Math.ceil(r.total/10)));}}).catch(e=>active&&setError(e.message)).finally(()=>active&&setLoading(false));},180);return()=>{active=false;clearTimeout(timer);};},[service,q,filters,page,revision]);
 function open(item){setEditing(item||{});setValues(item?{...item}:Object.fromEntries(fields.map(f=>[f.name,f.type==='number'?0:(Array.isArray(f.options?.[0])?f.options[0][0]:f.options?.[0])||''])));setErrors({});setSaveError('');}
 async function save(e){e.preventDefault();if(busy||uploading)return;const next=validateFields(fields,values);setErrors(next);if(Object.keys(next).length)return;setBusy(true);setSaveError('');
  try {const payload=Object.fromEntries(fields.filter(f=>!f.readOnly).map(f=>[f.name,typeof values[f.name]==='string'?values[f.name].trim():values[f.name]]));if(categoryType)payload.type=categoryType;await service.save(payload,editing.id);setEditing(null);setRevision(r=>r+1);toast.success('Đã lưu thay đổi.');}
  catch(e){setSaveError(e.message);}finally{setBusy(false);}
 }
 const statusField=config.fields.find(f=>f.name==='status');
 return <section className="space-y-5"><div className="flex flex-wrap justify-between gap-4"><div><h1 className="text-2xl font-semibold">{config.title}</h1><p className="text-gray-500 text-sm mt-2">{config.description}</p></div><div className="flex items-center gap-3">{resource==='news'&&can(user,'news')&&<Link className="btn-secondary" to="/news/categories">Danh mục</Link>}{config.create!==false&&can(user,module,'create')&&<button className="btn-primary" onClick={()=>open()}><Plus size={18}/>Thêm mới</button>}</div></div>
 <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
 <div className="p-4 flex flex-wrap gap-3 border-b border-gray-100"><label className="relative flex-1 min-w-48"><Search className="absolute top-3 left-3 text-gray-400" size={18}/><input className="form-control pl-10" aria-label="Tìm kiếm" placeholder="Tìm kiếm theo từ khóa…" value={q} onChange={e=>{setQ(e.target.value);setPage(1);}}/></label>
 {[...(statusField?[{...statusField,label:'Tất cả trạng thái'}]:[]),...(config.filters||[])].map(f=>f.options?<select key={f.name} className="form-control w-auto" aria-label={f.label} value={filters[f.name]||''} onChange={e=>{setFilters({...filters,[f.name]:e.target.value});setPage(1);}}><option value="">{f.label}</option>{f.options.map(([v,l])=><option key={v} value={v}>{l}</option>)}</select>:<input key={f.name} className="form-control w-52" type={f.type} aria-label={f.label} placeholder={f.label} value={filters[f.name]||''} onChange={e=>{setFilters({...filters,[f.name]:e.target.value});setPage(1);}}/>)}</div>
 {loading?<LoadingState/>:error?<ErrorState error={error} retry={()=>setRevision(r=>r+1)}/>:result.items.length===0?<EmptyState/>:<div className="overflow-x-auto"><Table><TableHeader><TableRow>{config.columns.map(([key,label])=><TableCell key={key} isHeader className="text-left px-5 py-4 text-xs font-medium text-gray-500 bg-gray-50">{label}</TableCell>)}<TableCell isHeader className="text-right px-5 text-xs text-gray-500">Thao tác</TableCell></TableRow></TableHeader><TableBody>{result.items.map(row=><TableRow key={row.id} className="border-t border-gray-100 hover:bg-gray-50/50">{config.columns.map(([key])=><TableCell key={key} className="px-5 py-4 text-sm max-w-xs"><div className="truncate">{key==='status'?<StatusBadge value={row[key]}/>:String(row[key]??'—')}</div></TableCell>)}<TableCell className="px-5 py-3"><div className="flex justify-end gap-2"><button className="icon-btn" aria-label="Xem chi tiết" onClick={()=>setDetail(row)}><Eye size={17}/></button>{can(user,module,'update')&&<button className="icon-btn" aria-label="Chỉnh sửa" onClick={()=>open(row)}><Pencil size={17}/></button>}{can(user,module,'delete')&&<button className="icon-btn text-red-600" aria-label="Xóa" onClick={()=>setDeleting(row)}><Trash2 size={17}/></button>}</div></TableCell></TableRow>)}</TableBody></Table></div>}
 <Pagination page={page} total={result.total} onChange={setPage}/></div>
 <FormModal open={editing!==null} onClose={()=>setEditing(null)} title={editing?.id?'Cập nhật '+config.title.toLowerCase():'Thêm mới'} busy={busy||uploading}><form onSubmit={save} className="space-y-5"><Fields fields={fields} values={values} onChange={(key,v)=>setValues({...values,[key]:v})} errors={errors} disabled={busy} onUploadingChange={setUploading}/>{saveError&&<p className="text-red-600" role="alert">{saveError}</p>}<div className="flex justify-end gap-3"><button type="button" className="btn-secondary" disabled={busy||uploading} onClick={()=>setEditing(null)}>Hủy</button><button className="btn-primary" disabled={busy||uploading}>{busy?'Đang lưu…':'Lưu thay đổi'}</button></div></form></FormModal>
 <FormModal open={!!detail} onClose={()=>setDetail(null)} title="Chi tiết"><dl className="space-y-4">{config.fields.map(f=><div key={f.name}><dt className="text-sm text-gray-500">{f.label}</dt><dd className="whitespace-pre-wrap break-words mt-1">{f.type==='image'&&safeImageUrl(detail?.[f.name])?<img src={safeImageUrl(detail[f.name])} alt="" className="max-h-60"/>:String(detail?.[f.name]??'—')}</dd></div>)}</dl></FormModal>
 <ConfirmModal isOpen={!!deleting} onClose={()=>setDeleting(null)} title="Xóa bản ghi?" description="Bản ghi sẽ bị xóa theo quy tắc nghiệp vụ của máy chủ." onConfirm={async()=>{await service.remove(deleting.id);setRevision(r=>r+1);toast.success('Đã xóa bản ghi.');}}/>
 </section>;
}


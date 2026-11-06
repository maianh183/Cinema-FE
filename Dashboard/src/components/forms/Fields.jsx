import FileUpload from '@/components/FileUpload';
export default function Fields({fields,values,onChange,errors={},disabled=false,onUploadingChange}){
 return <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">{fields.map(f=><div key={f.name} className={['textarea','image'].includes(f.type)?'sm:col-span-2':''}>{f.type==='image'?<div><span className="block text-sm font-medium mb-2">{f.label}</span><FileUpload initialPreviewUrl={values[f.name]} onUploadSuccess={url=>onChange(f.name,url)} onUploadingChange={onUploadingChange}/></div>:<label className="field">{f.label}{f.required?' *':''}
 {f.options?<select disabled={disabled||f.readOnly} value={values[f.name]??''} onChange={e=>onChange(f.name,e.target.value)} required={f.required}><option value="">Chọn…</option>{f.options.map(o=><option key={Array.isArray(o)?o[0]:o} value={Array.isArray(o)?o[0]:o}>{Array.isArray(o)?o[1]:o}</option>)}</select>
 :f.type==='textarea'?<textarea rows={f.rows||5} disabled={disabled||f.readOnly} value={values[f.name]??''} onChange={e=>onChange(f.name,e.target.value)} maxLength={f.maxLength} required={f.required}/>
 :<input type={f.type||'text'} disabled={disabled||f.readOnly} value={values[f.name]??''} onChange={e=>onChange(f.name,f.type==='number'&&e.target.value!==''?Number(e.target.value):e.target.value)} required={f.required} maxLength={f.maxLength} min={f.min} max={f.max} step={f.integer?1:'any'}/>}</label>}
 {f.help&&<p className="text-xs text-gray-500 mt-1">{f.help}</p>}{errors[f.name]&&<p className="text-sm text-red-600 mt-1" role="alert">{errors[f.name]}</p>}</div>)}</div>;
}


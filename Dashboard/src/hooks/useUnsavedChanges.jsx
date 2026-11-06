import {useEffect,useRef,useState} from 'react';
import {useBlocker} from 'react-router-dom';
import FormModal from '@/components/modals/FormModal';

// Local actions and SPA history use the same save/discard/stay decision.
// Hard reload/close is intentionally handled by the browser's native warning.
export function useUnsavedChanges({dirty,onSave,onDiscard,description='Bạn muốn lưu sơ đồ ghế trước khi tiếp tục không?'}){
 const blocker=useBlocker(({currentLocation,nextLocation})=>dirty&&(currentLocation.pathname!==nextLocation.pathname||currentLocation.search!==nextLocation.search||currentLocation.hash!==nextLocation.hash));
 const [pending,setPending]=useState(null),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const saving=useRef(false),latest=useRef(null);
 const blocked=blocker.state==='blocked';
 function request(action){if(saving.current)return;if(dirty){setError('');setPending(()=>action);}else action();}
 latest.current={dirty,request};
 useEffect(()=>{
  if(!dirty)return;
  const unload=e=>{e.preventDefault();e.returnValue='';};
  const action=e=>{e.preventDefault();latest.current.request(e.detail);};
  window.addEventListener('beforeunload',unload);window.addEventListener('dashboard:before-action',action);
  return()=>{window.removeEventListener('beforeunload',unload);window.removeEventListener('dashboard:before-action',action);};
 },[dirty]);
 function stay(){if(saving.current)return;setPending(null);setError('');if(blocked)blocker.reset();}
 async function leave(save){if(saving.current)return;saving.current=true;setBusy(true);setError('');try{
  if(save)await onSave();else onDiscard();
  const next=pending;setPending(null);if(blocked)blocker.proceed();else next?.();
 }catch(e){setError(e.message||'Chưa lưu được thay đổi.');}finally{saving.current=false;setBusy(false);}}
 const dialog=<FormModal open={!!pending||blocked} onClose={stay} busy={busy} title="Có thay đổi chưa lưu" description={description}>{error&&<p role="alert" className="text-red-600 mb-4">{error}</p>}<div className="flex flex-wrap gap-2 justify-end"><button className="btn-secondary" disabled={busy} onClick={stay}>Ở lại</button><button className="btn-danger" disabled={busy} onClick={()=>leave(false)}>Bỏ thay đổi</button><button className="btn-primary" disabled={busy} onClick={()=>leave(true)}>{busy?'Đang lưu…':'Lưu và tiếp tục'}</button></div></FormModal>;
 return {request,dialog};
}

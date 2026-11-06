import { useState } from 'react';
import FormModal from '@/components/modals/FormModal';
export function ConfirmModal({isOpen,onClose,onConfirm,title='Xác nhận thao tác',description,confirmText='Xác nhận',cancelText='Hủy bỏ'}){
 const [busy,setBusy]=useState(false);const [error,setError]=useState('');
 async function confirm(){if(busy)return;setBusy(true);setError('');try{await onConfirm();onClose();}catch(e){setError(e.message||'Không thể thực hiện thao tác.');}finally{setBusy(false);}}
 return <FormModal open={isOpen} onClose={onClose} title={title} description={description||'Thao tác này có thể không khôi phục được.'} busy={busy}>{error&&<p className="text-red-600" role="alert">{error}</p>}<div className="flex justify-end gap-3"><button className="btn-secondary" disabled={busy} onClick={onClose}>{cancelText}</button><button className="btn-danger" disabled={busy} onClick={confirm}>{busy?'Đang xử lý…':confirmText}</button></div></FormModal>;
}


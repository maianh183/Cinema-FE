import { useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Film, LockKeyhole } from 'lucide-react';
import { authService } from '@/services/authService';
import { USE_MOCK } from '@/services/api';
import { useAuthStore } from '@/stores/authStore';
import { modules, can } from '@/utils/permissions';
export default function Login() {
 const [email,setEmail]=useState(''); const [password,setPassword]=useState(''); const [busy,setBusy]=useState(false); const [error,setError]=useState('');
 const {user,expired}=useAuthStore(); const navigate=useNavigate(); const location=useLocation();
 if(user) return <Navigate to={modules.find(m=>can(user,m[0]))?.[1]||'/403'} replace/>;
 async function submit(e) {
  e.preventDefault(); if(busy)return; setBusy(true);setError('');
  try { await authService.login({email:email.trim(),password}); const u=useAuthStore.getState().user; const previous=modules.find(m=>m[1]===location.state?.from && can(u,m[0])); navigate(previous?.[1]||modules.find(m=>can(u,m[0]))?.[1]||'/403',{replace:true});}
  catch(e){setError(e.message);}finally{setBusy(false);}
 }
 return <main className="min-h-screen grid lg:grid-cols-2 bg-gray-50">
  <div className="hidden lg:flex bg-slate-950 text-white p-16 flex-col justify-between"><div className="flex gap-3 items-center text-2xl font-semibold"><Film/> CineFlow</div><div><p className="text-indigo-300 mb-5">KHÔNG GIAN LÀM VIỆC NỘI BỘ</p><h1 className="text-5xl leading-tight font-semibold">Quản lý rạp.<br/>Kết nối vận hành.</h1><p className="mt-6 text-slate-400 max-w-md">Một nơi để quản lý nội dung, nhân sự và hoạt động kinh doanh của doanh nghiệp.</p></div><p className="text-slate-400 text-sm">Cinema Management · TailAdmin Free</p></div>
  <div className="flex items-center justify-center p-6"><div className="w-full max-w-md"><LockKeyhole className="text-indigo-600 mb-6" size={36}/><h1 className="text-3xl font-semibold">Đăng nhập nhân sự</h1><p className="text-gray-500 mt-3 mb-8">Sử dụng tài khoản do quản trị viên cấp.</p>
   {expired&&<p role="alert" className="notice mb-4">Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.</p>}
   {USE_MOCK&&<div className="notice mb-5"><b>MOCK MODE — dữ liệu mô phỏng</b><p className="mt-1 text-sm">admin@cinema.test / manager@cinema.test / staff@cinema.test<br/>Mật khẩu demo: Demo@12345</p></div>}
   <form onSubmit={submit} className="space-y-5"><label className="field">Email<input autoComplete="username" type="email" required maxLength={254} value={email} onChange={e=>setEmail(e.target.value)}/></label><label className="field">Mật khẩu<input autoComplete="current-password" type="password" required value={password} onChange={e=>setPassword(e.target.value)}/></label>{error&&<p role="alert" className="text-red-600">{error}</p>}<button className="btn-primary w-full" disabled={busy}>{busy?'Đang đăng nhập…':'Đăng nhập'}</button></form>
  </div></div></main>;
}


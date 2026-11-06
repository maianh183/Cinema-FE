import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
export default function AuthCheck() {
 const {user,ready}=useAuthStore(); const location=useLocation();
 if (!ready) return <p className="p-10" role="status">Đang kiểm tra phiên đăng nhập…</p>;
 return user ? <Outlet/> : <Navigate to="/login" replace state={{from:location.pathname}}/>;
}


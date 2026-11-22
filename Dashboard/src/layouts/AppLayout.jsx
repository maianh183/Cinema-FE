// Layout structure adapted from TailAdmin Free AppLayout, MIT.
import { Outlet } from 'react-router-dom';
import { SidebarProvider, useSidebar } from '@/components/layout/SidebarContext';
import Navigation from '@/components/layout/Navigation';
import Header from '@/components/layout/Header';
import { USE_MOCK } from '@/services/api';
function Content(){
 const {isExpanded}=useSidebar();
 return <div className="min-h-screen bg-gray-50 text-gray-800"><Navigation/><div className={'min-w-0 transition-[margin] duration-300 '+(isExpanded?'xl:ml-[290px]':'xl:ml-[90px]')}><Header/><main className="mx-auto max-w-[1800px] p-4 md:p-6">
 {USE_MOCK&&<div role="status" className="notice mb-5 text-sm"><b>MOCK MODE</b> · Dữ liệu mô phỏng trong bộ nhớ; tải lại trang sẽ khôi phục mẫu. Chưa kết nối PHP.</div>}
 <Outlet/></main></div></div>;
}
export default function AppLayout(){return <SidebarProvider><Content/></SidebarProvider>;}


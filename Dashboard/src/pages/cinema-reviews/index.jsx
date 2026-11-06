import {useEffect,useState} from 'react';
import {cinemaReviewService} from '@/services/cinemaReviewService';
import {branchService} from '@/services/branchService';
import {roomService} from '@/services/roomService';
import {useAuthStore} from '@/stores/authStore';
import {inBranchScope} from '@/utils/schedule';
import {formatContentTime} from '@/utils/contentModels';
import ContentTarget from '@/components/ContentTarget';
import {LoadingState,ErrorState,EmptyState} from '@/components/ui/Feedback';
import Pagination from '@/components/tables/Pagination';
import FormModal from '@/components/modals/FormModal';
export default function CinemaReviews(){
 const user=useAuthStore(s=>s.user);
 const [rows,setRows]=useState([]),[branches,setBranches]=useState([]),[rooms,setRooms]=useState([]);
 const [q,setQ]=useState(''),[branchId,setBranchId]=useState(''),[roomId,setRoomId]=useState(''),[page,setPage]=useState(1),[total,setTotal]=useState(0);
 const [loading,setLoading]=useState(true),[error,setError]=useState(''),[revision,setRevision]=useState(0),[detail,setDetail]=useState(null);
 useEffect(()=>{let current=true;setLoading(true);setError('');setDetail(null);
  if(branchId&&!inBranchScope(user,branchId)){setError('Không có quyền xem chi nhánh này.');setLoading(false);return;}
  Promise.all([cinemaReviewService.list({page,pageSize:10,q,branchId,roomId}),branchService.getAll(),branchId?roomService.getByBranch(branchId):Promise.resolve([])])
   .then(([result,bs,rs])=>{if(!current)return;if(result.items.some(r=>!inBranchScope(user,r.branchId)))throw new Error('API trả dữ liệu ngoài phạm vi được cấp quyền.');setRows(result.items);setTotal(result.total);setBranches(bs.filter(b=>inBranchScope(user,b.branchId)));setRooms(rs);})
   .catch(e=>current&&setError(e.message)).finally(()=>current&&setLoading(false));return()=>{current=false;};
 },[user,page,q,branchId,roomId,revision]);
 return <section className="space-y-5"><h1 className="text-2xl font-semibold">Đánh giá</h1><p className="text-sm text-gray-500">Trải nghiệm của khách hàng tại rạp. Nội dung bị báo cáo được xử lý trong mục Báo cáo bình luận và đánh giá.</p>
 <div className="flex flex-wrap gap-3"><input className="form-control flex-1" aria-label="Tìm đánh giá" placeholder="Tìm người gửi, nội dung…" value={q} onChange={e=>{setQ(e.target.value);setPage(1);}}/><select className="form-control w-auto" aria-label="Chi nhánh" value={branchId} onChange={e=>{setBranchId(e.target.value);setRoomId('');setPage(1);}}><option value="">Tất cả chi nhánh được cấp quyền</option>{branches.map(b=><option key={b.branchId} value={b.branchId}>{b.bName}</option>)}</select><select className="form-control w-auto" aria-label="Phòng" value={roomId} disabled={!branchId} onChange={e=>{setRoomId(e.target.value);setPage(1);}}><option value="">Tất cả phòng / không có phòng</option>{rooms.map(r=><option key={r.roomId} value={r.roomId}>Phòng {r.roomId}</option>)}</select></div>
 <div className="rounded-2xl border bg-white overflow-hidden">{loading?<LoadingState/>:error?<ErrorState error={error} retry={()=>setRevision(v=>v+1)}/>:!rows.length?<EmptyState/>:<div className="overflow-x-auto"><table className="w-full text-sm text-left"><thead className="bg-gray-50"><tr>{['Người đánh giá','Chi nhánh','Phòng','Nội dung','Ngày đánh giá','Thao tác'].map(h=><th className="p-4" key={h}>{h}</th>)}</tr></thead><tbody>{rows.map(r=><tr className="border-t" key={r.reviewId}><td className="p-4">{r.authorName||r.userId}</td><td className="p-4">{r.branchName||r.branchId}</td><td className="p-4">{r.roomId??'—'}</td><td className="p-4 max-w-md"><p className="line-clamp-2">{r.content}</p></td><td className="p-4">{formatContentTime(r.createdAt)}</td><td className="p-4"><button className="btn-secondary" onClick={()=>setDetail(r)}>Chi tiết</button></td></tr>)}</tbody></table></div>}<Pagination page={page} pageSize={10} total={total} onChange={setPage}/></div>
 <FormModal open={!!detail} onClose={()=>setDetail(null)} title="Chi tiết đánh giá">{detail&&<><ContentTarget type="CINEMA_REVIEW" target={detail}/><p className="mt-4 text-sm">Ngày đánh giá: {formatContentTime(detail.createdAt)}</p></>}</FormModal></section>;
}

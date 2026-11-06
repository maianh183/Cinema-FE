import { validMovieRating } from '@/utils/contentModels';
export default function ContentTarget({type,target}){
 if(!target)return <p role="alert" className="text-amber-700">Loại nội dung không được hỗ trợ. Cần đối chiếu API.</p>;
 return <div className="space-y-2 text-sm break-words">
  <p><b>Người gửi:</b> {target.authorName||target.userId||'—'}</p>
  {type==='MOVIE_COMMENT'?<><p><b>Phim:</b> {target.movieTitle||target.movieId||'—'}</p><p><b>Điểm phim:</b> {validMovieRating(target.rating)?`${'★'.repeat(target.rating)} (${target.rating}/5)`:<span className="text-amber-700">Điểm sao không hợp lệ</span>}</p></>:<><p><b>Chi nhánh:</b> {target.branchName||target.branchId||'—'}</p><p><b>Phòng:</b> {target.roomId??'—'}</p></>}
  <p className="whitespace-pre-wrap"><b>Nội dung:</b> {target.content||'Không có nội dung văn bản'}</p>
 </div>;
}

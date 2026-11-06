export const contentTypes={MOVIE_COMMENT:'Bình luận phim',CINEMA_REVIEW:'Đánh giá rạp'};
export function validMovieRating(value){return typeof value==='number'&&Number.isInteger(value)&&value>=1&&value<=5;}
export function movieComment(data){return {commentId:data.commentId??data.id,movieId:data.movieId,movieTitle:data.movieTitle,userId:data.userId,authorName:data.authorName,rating:data.rating,content:data.content??null,createdAt:data.createdAt,contentStatus:data.contentStatus};}
export function cinemaReview(data){return {reviewId:data.reviewId??data.id,branchId:data.branchId,branchName:data.branchName,roomId:data.roomId??null,userId:data.userId,authorName:data.authorName,content:data.content,createdAt:data.createdAt,contentStatus:data.contentStatus};}
export function contentReport(data){
 const target=data.target||data;
 return {...data,id:data.reportId??data.id,reportId:data.reportId??data.id,target: data.targetType==='MOVIE_COMMENT'?movieComment(target):data.targetType==='CINEMA_REVIEW'?cinemaReview(target):null};
}
export function formatContentTime(value){const time=Date.parse(value);return Number.isFinite(time)?new Date(time).toLocaleString('vi-VN',{timeZone:'Asia/Ho_Chi_Minh'}):'—';}

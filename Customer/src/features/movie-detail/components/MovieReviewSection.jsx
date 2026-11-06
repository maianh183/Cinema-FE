import { useState } from "react";
import { movieCommentService } from "../../../services/customer.js";
import { useUserStore } from "../../../store/userStore.js";
import { validRating, dateTime } from "../../../lib/business.js";
import {
  State,
  Empty,
  Pagination,
  Feedback,
  Field,
  LoginPrompt,
  useMutation,
  useResource,
} from "../../../components/shared/UI.jsx";
import ReportContentDialog from "../../../components/shared/ReportContentDialog.jsx";
export default function MovieReviewSection({ movieId }) {
  const user = useUserStore((s) => s.user),
    [rating, setRating] = useState(0),
    [hover, setHover] = useState(0),
    [content, setContent] = useState(""),
    [page, setPage] = useState(1),
    [report, setReport] = useState(null);
  const action = useMutation();
  const resource = useResource(
    () => movieCommentService.list(movieId),
    movieId,
  );
  const rows = resource.data || [],
    ratings = rows.filter((r) => validRating(r.rating)),
    average = ratings.length
      ? ratings.reduce((n, r) => n + r.rating, 0) / ratings.length
      : null;
  async function submit(e) {
    e.preventDefault();
    await action.run(async (notify) => {
      const result = await movieCommentService.create({
        movieId,
        rating,
        content,
      });
      if (!result.commentId || result.movieId !== movieId)
        throw Error("Máy chủ chưa xác nhận bình luận.");
      setContent("");
      setRating(0);
      setPage(1);
      resource.reload();
      notify("Đã gửi bình luận phim.");
    });
  }
  return (
    <section className="section-pad">
      <h2>Bình luận phim</h2>
      <p className="muted">
        {average === null
          ? "Chưa có điểm đánh giá"
          : `${average.toFixed(1)} / 5 sao · ${ratings.length} bình luận`}
      </p>
      {user ? (
        <form onSubmit={submit} className="panel">
          <fieldset>
            <legend>Điểm sao (bắt buộc)</legend>
            <div className="stars" onMouseLeave={() => setHover(0)}>
              {[1, 2, 3, 4, 5].map((n) => (
                <label
                  key={n}
                  className={(hover || rating) >= n ? "selected" : ""}
                  onMouseEnter={() => setHover(n)}
                >
                  <input
                    type="radio"
                    name="rating"
                    value={n}
                    checked={rating === n}
                    onChange={() => setRating(n)}
                    required
                    aria-label={`${n} sao`}
                  />
                  <span aria-hidden="true">★</span>
                </label>
              ))}
            </div>
          </fieldset>
          <Field label="Nội dung (không bắt buộc)">
            <textarea
              maxLength={2000}
              value={content}
              onChange={(e) => setContent(e.target.value)}
            />
          </Field>
          <Feedback action={action} />
          <button
            className="btn"
            disabled={action.busy || !validRating(rating)}
          >
            {action.busy ? "Đang gửi…" : "Gửi bình luận"}
          </button>
        </form>
      ) : (
        <LoginPrompt />
      )}
      <State resource={resource}>
        {!rows.length ? (
          <Empty>Chưa có bình luận cho phim này.</Empty>
        ) : (
          rows.slice((page - 1) * 5, page * 5).map((row) => (
            <article className="review" key={row.commentId}>
              {row.avatarUrl && (
                <img
                  className="avatar"
                  src={row.avatarUrl}
                  alt={`Ảnh đại diện ${row.authorName}`}
                />
              )}
              <h3>{row.authorName}</h3>
              <p className="text-primary">
                {validRating(row.rating)
                  ? `${"★".repeat(row.rating)} · ${row.rating}/5`
                  : "Điểm chưa hợp lệ"}
              </p>
              <p className="plain-text">
                {row.content || "Người dùng này chỉ chấm điểm phim."}
              </p>
              <small>{dateTime(row.createdAt)}</small>
              {user && (
                <button className="text-button" onClick={() => setReport(row)}>
                  Báo cáo
                </button>
              )}
            </article>
          ))
        )}
        <Pagination
          page={page}
          setPage={setPage}
          total={rows.length}
          pageSize={5}
        />
      </State>
      {report && (
        <ReportContentDialog
          targetType="MOVIE_COMMENT"
          target={report}
          onClose={() => setReport(null)}
        />
      )}
    </section>
  );
}

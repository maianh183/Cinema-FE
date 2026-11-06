import { useState } from "react";
import { cinemaReviewService } from "../../../services/customer.js";
import { useUserStore } from "../../../store/userStore.js";
import { dateTime } from "../../../lib/business.js";
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
export default function CinemaReviewSection({ branch, rooms }) {
  const user = useUserStore((s) => s.user),
    [content, setContent] = useState(""),
    [roomId, setRoomId] = useState(""),
    [page, setPage] = useState(1),
    [report, setReport] = useState(null);
  const action = useMutation(),
    resource = useResource(
      () => cinemaReviewService.list(branch.branchId),
      branch.branchId,
    ),
    rows = resource.data || [];
  async function submit(e) {
    e.preventDefault();
    await action.run(async (notify) => {
      const result = await cinemaReviewService.create(
        {
          branchId: branch.branchId,
          roomId: roomId ? Number(roomId) : null,
          content,
        },
        rooms,
      );
      if (!result.reviewId || result.branchId !== branch.branchId)
        throw Error("Máy chủ chưa xác nhận đánh giá.");
      setContent("");
      setPage(1);
      resource.reload();
      notify("Đã gửi đánh giá cơ sở.");
    });
  }
  return (
    <section>
      <h2>Đánh giá cơ sở</h2>
      <p className="muted">{branch.bName}</p>
      {user ? (
        <form className="panel" onSubmit={submit}>
          <Field label="Phòng chiếu (không bắt buộc)">
            <select value={roomId} onChange={(e) => setRoomId(e.target.value)}>
              <option value="">Không chỉ định phòng</option>
              {rooms.map((r) => (
                <option key={r.roomId} value={r.roomId}>
                  Phòng {r.roomId} · {r.rType}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Nội dung đánh giá">
            <textarea
              required
              maxLength={2000}
              value={content}
              onChange={(e) => setContent(e.target.value)}
            />
          </Field>
          <Feedback action={action} />
          <button className="btn" disabled={action.busy || !content.trim()}>
            {action.busy ? "Đang gửi…" : "Gửi đánh giá"}
          </button>
        </form>
      ) : (
        <LoginPrompt />
      )}
      <State resource={resource}>
        {!rows.length ? (
          <Empty>Chưa có đánh giá cho cơ sở này.</Empty>
        ) : (
          rows.slice((page - 1) * 5, page * 5).map((row) => (
            <article className="review" key={row.reviewId}>
              <h3>{row.authorName}</h3>
              {row.roomId != null && (
                <p className="muted">Phòng {row.roomId}</p>
              )}
              <p className="plain-text">{row.content}</p>
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
          targetType="CINEMA_REVIEW"
          target={report}
          onClose={() => setReport(null)}
        />
      )}
    </section>
  );
}

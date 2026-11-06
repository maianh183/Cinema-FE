import { useState } from "react";
import { commentReportService } from "../../services/customer.js";
import { Feedback, Modal, Field, useMutation } from "./UI.jsx";
export default function ReportContentDialog({ targetType, target, onClose }) {
  const [reason, setReason] = useState("Spam/quảng cáo"),
    [detail, setDetail] = useState("");
  const action = useMutation();
  async function submit(e) {
    e.preventDefault();
    await action.run(async (notify) => {
      const result = await commentReportService.create({
        targetType,
        targetId:
          targetType === "MOVIE_COMMENT" ? target.commentId : target.reviewId,
        reason:
          reason === "Khác"
            ? detail
            : reason + (detail.trim() ? ": " + detail : ""),
      });
      if (!result.reportId || result.status !== "PENDING")
        throw Error("Máy chủ chưa xác nhận báo cáo.");
      notify("Đã nhận báo cáo. Bộ phận quản lý sẽ xem xét nội dung.");
    });
  }
  return (
    <Modal title="Báo cáo nội dung" onClose={onClose} busy={action.busy}>
      <p className="notice">
        {target.content || "Người dùng này chỉ chấm điểm phim."}
      </p>
      <form onSubmit={submit}>
        <Field label="Lý do">
          <select value={reason} onChange={(e) => setReason(e.target.value)}>
            {[
              "Spam/quảng cáo",
              "Ngôn từ xúc phạm",
              "Nội dung không phù hợp",
              "Thông tin sai lệch",
              "Khác",
            ].map((r) => (
              <option key={r}>{r}</option>
            ))}
          </select>
        </Field>
        <Field label="Thông tin bổ sung">
          <textarea
            value={detail}
            onChange={(e) => setDetail(e.target.value)}
            required={reason === "Khác"}
            maxLength={800}
          />
        </Field>
        <Feedback action={action} />
        <button
          className="btn"
          disabled={
            action.busy ||
            !!action.message ||
            (reason === "Khác" && !detail.trim())
          }
        >
          {action.busy ? "Đang gửi…" : "Gửi báo cáo"}
        </button>
      </form>
    </Modal>
  );
}

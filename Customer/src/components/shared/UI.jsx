import { useSiteContent } from "../../store/siteContentContext.js";
import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
export function useResource(loader, key = "") {
  const latest = useRef(loader);
  latest.current = loader;
  const [state, setState] = useState({
    data: null,
    loading: true,
    error: null,
    key,
  });
  const [version, setVersion] = useState(0);
  useEffect(() => {
    let active = true;
    setState({ data: null, loading: true, error: null, key });
    Promise.resolve()
      .then(() => latest.current())
      .then((data) => {
        if (active) setState({ data, loading: false, error: null, key });
      })
      .catch((error) => {
        if (active)
          setState({ data: null, loading: false, error: error.message, key });
      });
    return () => {
      active = false;
    };
  }, [key, version]);
  const reload = useCallback(() => setVersion((v) => v + 1), []);
  useEffect(() => {
    window.addEventListener("focus", reload);
    return () => window.removeEventListener("focus", reload);
  }, [reload]);
  return {
    ...(state.key === key ? state : { data: null, loading: true, error: null }),
    reload,
  };
}
export function State({ resource, children }) {
  if (resource.loading)
    return (
      <p role="status" className="notice">
        Đang tải dữ liệu…
      </p>
    );
  if (resource.error)
    return (
      <div role="alert" className="notice error">
        {resource.error}{" "}
        <button className="btn secondary" onClick={resource.reload}>
          Thử lại
        </button>
      </div>
    );
  return children;
}
export function Page({ title, description, children }) {
  const {
    content: { global },
  } = useSiteContent();
  return (
    <section className="page">
      <header className="page-heading">
        <p className="eyebrow">{global.companyName}</p>
        <h1>{title}</h1>
        {description && <p className="muted">{description}</p>}
      </header>
      {children}
    </section>
  );
}
export function Empty({ children = "Chưa có dữ liệu phù hợp." }) {
  return <p className="notice">{children}</p>;
}
export function Pagination({ page, setPage, total, pageSize = 8 }) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (pages < 2) return null;
  return (
    <nav className="pagination" aria-label="Phân trang">
      <button
        className="btn secondary"
        disabled={page <= 1}
        onClick={() => setPage(page - 1)}
      >
        Trước
      </button>
      <span>
        Trang {page} / {pages}
      </span>
      <button
        className="btn secondary"
        disabled={page >= pages}
        onClick={() => setPage(page + 1)}
      >
        Sau
      </button>
    </nav>
  );
}
export function useMutation() {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [message, setMessage] = useState("");
  const lock = useRef(false);
  const run = async (action) => {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      return await action(setMessage);
    } catch (e) {
      setError(e.message);
    } finally {
      lock.current = false;
      setBusy(false);
    }
  };
  return { busy, error, message, run };
}
export function Feedback({ action }) {
  return (
    <>
      {action.error && (
        <p className="notice error" role="alert">
          {action.error}
        </p>
      )}
      {action.message && (
        <p className="notice success" role="status">
          {action.message}
        </p>
      )}
    </>
  );
}
export function Field({ label, children, ...props }) {
  return (
    <label className="field">
      <span>{label}</span>
      {children || <input {...props} />}
    </label>
  );
}
export function LoginPrompt() {
  return (
    <p className="notice">
      Vui lòng <Link to="/login">đăng nhập</Link> để thực hiện chức năng này.
    </p>
  );
}
export function Modal({ title, onClose, children, busy = false }) {
  const ref = useRef(null);
  useEffect(() => {
    const prior = document.activeElement;
    ref.current.showModal();
    return () => prior?.focus();
  }, []);
  return (
    <dialog
      ref={ref}
      onCancel={(e) => {
        e.preventDefault();
        if (!busy) onClose();
      }}
      aria-label={title}
    >
      <div className="modal-heading">
        <h2>{title}</h2>
        <button
          autoFocus
          aria-label="Đóng"
          className="btn secondary"
          disabled={busy}
          onClick={onClose}
        >
          ×
        </button>
      </div>
      {children}
    </dialog>
  );
}
export function Metadata({ title, description }) {
  const {
    content: { global },
  } = useSiteContent();
  useEffect(() => {
    document.title = title
      ? `${title} | ${global.companyName}`
      : global.companyName;
    const meta = document.querySelector('meta[name="description"]');
    if (meta) meta.content = description || global.tagline;
  }, [title, description, global.companyName, global.tagline]);
  return null;
}

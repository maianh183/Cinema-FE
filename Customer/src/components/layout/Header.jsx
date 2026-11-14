import { useSiteContent } from '../../store/siteContentContext.js';
import { ContentImage } from '../shared/SiteContent.jsx';
import { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useUserStore } from '../../store/userStore.js';
import { useCartStore } from '../../store/cartStore.js';
import { USE_MOCK } from '../../services/api.js';
const links = [
  ['/movies', 'Phim'],
  ['/cinemas', 'Rạp chiếu'],
  ['/products', 'Sản phẩm'],
  ['/promotions', 'Ưu đãi'],
  ['/news', 'Tin tức'],
];
export default function Header() {
  const {
    content: { global },
  } = useSiteContent();
  const [open, setOpen] = useState(false),
    [q, setQ] = useState(''),
    navigate = useNavigate(),
    user = useUserStore((s) => s.user),
    count = useCartStore((s) => s.items.reduce((n, i) => n + i.quantity, 0));
  return (
    <>
      <a className="skip-link" href="#main">
        Đến nội dung chính
      </a>
      {USE_MOCK && (
        <div className="demo-banner">
          CHẾ ĐỘ DEMO · Dữ liệu mô phỏng · Không giữ ghế hoặc thu tiền thật
        </div>
      )}
      <header className="site-header">
        <Link className="brand editorial-brand" to="/" onClick={() => setOpen(false)}>
          <ContentImage src={global.logoUrl} alt="" className="site-brand-logo" />
          <strong>{global.companyName}</strong>
        </Link>
        <button
          className="mobile-toggle btn secondary"
          aria-expanded={open}
          aria-controls="navigation"
          onClick={() => setOpen(!open)}
        >
          Menu
        </button>
        <nav
          id="navigation"
          className={open ? 'navigation open' : 'navigation'}
          aria-label="Điều hướng chính"
        >
          {links.map(([to, label]) => (
            <NavLink key={to} to={to} onClick={() => setOpen(false)}>
              {label}
            </NavLink>
          ))}
        </nav>
        <form
          className="header-search"
          role="search"
          onSubmit={(e) => {
            e.preventDefault();
            navigate('/movies?q=' + encodeURIComponent(q.trim()));
            setOpen(false);
          }}
        >
          <input
            aria-label="Tìm phim trên header"
            placeholder="Tìm phim…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            maxLength={100}
          />
          <button aria-label="Tìm phim" type="submit">
            ⌕
          </button>
        </form>
        <div className="header-actions">
          <Link to="/cart">Giỏ ({count})</Link>
          <Link className="btn account-link" to={user ? '/profile' : '/login'}>
            {user ? 'Tài khoản' : 'Đăng nhập'}
          </Link>
        </div>
      </header>
    </>
  );
}

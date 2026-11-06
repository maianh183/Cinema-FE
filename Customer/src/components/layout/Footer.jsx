import { useSiteContent } from "../../store/siteContentContext.js";
import {
  ContentImage,
  BusinessDetails,
  ContentStatus,
} from "../shared/SiteContent.jsx";
import { Link } from "react-router-dom";
export default function Footer() {
  const {
    content: { global },
  } = useSiteContent();
  return (
    <footer className="site-footer">
      <div>
        <Link className="brand editorial-brand" to="/">
          <ContentImage
            src={global.logoUrl}
            alt=""
            className="site-brand-logo"
          />
          <strong>{global.companyName}</strong>
        </Link>
        <p className="muted">{global.tagline}</p>
        <BusinessDetails />
      </div>
      <nav aria-label="Thông tin doanh nghiệp">
        {[
          ["/about", "Giới thiệu"],
          ["/services", "Dịch vụ"],
          ["/pricing", "Bảng giá"],
          ["/cinemas", "Hệ thống rạp"],
        ].map(([url, label]) => (
          <Link key={url} to={url}>
            {label}
          </Link>
        ))}
      </nav>
      <nav aria-label="Hỗ trợ">
        {[
          ["/contact", "Liên hệ"],
          ["/faq", "Hỏi đáp"],
          ["/news", "Tin tức"],
          ["/profile", "Tài khoản"],
        ].map(([url, label]) => (
          <Link key={url} to={url}>
            {label}
          </Link>
        ))}
      </nav>
      <p className="muted footer-note">
        © {new Date().getFullYear()} {global.companyName}
      </p>
      <ContentStatus />
    </footer>
  );
}

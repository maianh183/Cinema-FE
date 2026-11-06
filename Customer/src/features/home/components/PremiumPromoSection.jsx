import { Link } from "react-router-dom";
import { useSiteContent } from "../../../store/siteContentContext.js";
import { catalogService } from "../../../services/customer.js";
import { periodStatus, money } from "../../../lib/business.js";
import { State, Empty, useResource } from "../../../components/shared/UI.jsx";
export default function PremiumPromoSection() {
  const {
    content: { global },
  } = useSiteContent();
  const resource = useResource(catalogService.coupons),
    coupons = (resource.data || []).filter(
      (c) => periodStatus(c) === "ACTIVE" && c.availNum > 0,
    );
  return (
    <section className="section-pad premium-section">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 cinema-intro-card">
          <p className="eyebrow">Cùng nhau đến rạp</p>
          <h2 className="cinema-intro-title">{global.companyName}</h2>
          <p className="muted max-w-lg my-6">
            Khám phá phim, chọn lịch chiếu phù hợp và chia sẻ trải nghiệm của
            bạn tại từng cơ sở.
          </p>
          <div className="flex flex-wrap gap-4">
            <Link className="btn" to="/cinemas">
              Hệ thống rạp
            </Link>
            <Link className="btn secondary" to="/services">
              Dịch vụ
            </Link>
            <Link className="text-button" to="/about">
              Về chúng tôi
            </Link>
          </div>
        </div>
        <div className="panel voucher-panel">
          <h2>Voucher hiện có</h2>
          <State resource={resource}>
            {coupons.slice(0, 2).map((c) => (
              <div key={c.couponId} className="coupon-mini">
                <h3>
                  #{c.couponId} · Giảm {c.saleOff}%
                </h3>
                <p>Đơn từ {money(c.minOrderTotal || 0)}</p>
                <p>Đến {c.endDate}</p>
              </div>
            ))}
            {!coupons.length && <Empty>Chưa có ưu đãi đang áp dụng.</Empty>}
          </State>
          <Link to="/promotions" className="text-button">
            Xem điều kiện ưu đãi →
          </Link>
        </div>
      </div>
    </section>
  );
}

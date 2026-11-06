import { useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { catalogService } from "../services/customer.js";
import {
  todayVN,
  money,
  productName,
  productKey,
  productStatus,
  stock,
  periodStatus,
  isFutureShowtime,
  safeUrl,
} from "../lib/business.js";
import { useCartStore, useBookingStore } from "../store/cartStore.js";
import {
  Page,
  State,
  Empty,
  Pagination,
  Field,
  Feedback,
  Metadata,
  useResource,
  useMutation,
} from "../components/shared/UI.jsx";
import MoviesCard from "../components/shared/MoviesCard.jsx";
import MovieHeroSection from "../features/movie-detail/components/MovieHeroSection.jsx";
import MovieReviewSection from "../features/movie-detail/components/MovieReviewSection.jsx";
import CinemaReviewSection from "../features/cinemas/components/CinemaReviewSection.jsx";
const lower = (s) => String(s ?? "").toLocaleLowerCase("vi");
export function MoviesPage() {
  const [params, setParams] = useSearchParams(),
    resource = useResource(catalogService.movies),
    q = params.get("q") || "",
    [status, setStatus] = useState("NOW_SHOWING"),
    [genre, setGenre] = useState(""),
    [sort, setSort] = useState("name"),
    [page, setPage] = useState(1);
  const all = resource.data || [],
    today = todayVN(),
    rows = all
      .filter(
        (m) =>
          lower(m.mName).includes(lower(q)) &&
          (!genre || m.genres?.some((g) => (g.genre || g) === genre)) &&
          (status === "COMING_SOON"
            ? m.releaseDate > today
            : m.releaseDate <= today && m.closingDate >= today),
      )
      .sort((a, b) =>
        sort === "name"
          ? a.mName.localeCompare(b.mName, "vi")
          : b.releaseDate.localeCompare(a.releaseDate),
      );
  return (
    <Page title="Khám phá phim">
      <Metadata title="Phim đang chiếu và sắp chiếu" />
      <div className="filters">
        <Field
          label="Tìm theo tên phim"
          value={q}
          onChange={(e) => {
            setParams({ q: e.target.value });
            setPage(1);
          }}
        />
        <Field label="Lịch phát hành">
          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
          >
            <option value="NOW_SHOWING">Đang chiếu</option>
            <option value="COMING_SOON">Sắp chiếu</option>
          </select>
        </Field>
        <Field label="Thể loại">
          <select
            value={genre}
            onChange={(e) => {
              setGenre(e.target.value);
              setPage(1);
            }}
          >
            <option value="">Tất cả thể loại</option>
            {[
              ...new Set(
                all.flatMap((m) => m.genres?.map((g) => g.genre || g) || []),
              ),
            ].map((g) => (
              <option key={g}>{g}</option>
            ))}
          </select>
        </Field>
        <Field label="Sắp xếp">
          <select value={sort} onChange={(e) => setSort(e.target.value)}>
            <option value="name">Tên A–Z</option>
            <option value="date">Mới nhất</option>
          </select>
        </Field>
      </div>
      <State resource={resource}>
        <div className="movie-grid">
          {rows.slice((page - 1) * 8, page * 8).map((m) => (
            <MoviesCard movie={m} key={m.movieId} />
          ))}
        </div>
        {!rows.length && <Empty />}
        <Pagination page={page} setPage={setPage} total={rows.length} />
      </State>
    </Page>
  );
}
export function Showtimes({ movieId, branchId }) {
  const resource = useResource(
      () =>
        catalogService.showtimes({
          ...(movieId ? { movieId } : {}),
          ...(branchId ? { branchId } : {}),
        }),
      `${movieId}-${branchId}`,
    ),
    [date, setDate] = useState(""),
    [branch, setBranch] = useState("");
  const all = (resource.data || []).filter((s) => isFutureShowtime(s)),
    dates = [...new Set(all.map((s) => s.day))].sort(),
    selected = date || dates[0],
    rows = all.filter(
      (s) => s.day === selected && (!branch || s.branchId === Number(branch)),
    );
  return (
    <section id="booking" className="section-pad">
      <h2>Lịch chiếu</h2>
      <State resource={resource}>
        <div className="filters">
          <Field label="Ngày chiếu">
            <select
              value={selected || ""}
              onChange={(e) => setDate(e.target.value)}
            >
              {dates.map((d) => (
                <option key={d}>{d}</option>
              ))}
            </select>
          </Field>
          {!branchId && (
            <Field label="Rạp chiếu">
              <select
                value={branch}
                onChange={(e) => setBranch(e.target.value)}
              >
                <option value="">Tất cả rạp</option>
                {[...new Map(all.map((s) => [s.branchId, s])).values()].map(
                  (s) => (
                    <option key={s.branchId} value={s.branchId}>
                      {s.branchName}
                    </option>
                  ),
                )}
              </select>
            </Field>
          )}
        </div>
        <div className="card-grid">
          {rows.map((s) => (
            <Link
              className="panel showtime-card"
              to={`/booking/showtime/${s.timeId}`}
              key={s.timeId}
            >
              <h3>{s.movieName}</h3>
              <p>
                {s.branchName} · Phòng {s.roomId} · {s.formatName}
              </p>
              <strong>{s.startTime.slice(0, 5)}</strong>
              <p>{money(s.rPrice)} + phụ thu ghế</p>
            </Link>
          ))}
        </div>
        {!rows.length && <Empty>Chưa có suất chiếu đang mở bán.</Empty>}
      </State>
    </section>
  );
}
export function MoviePage() {
  const { slug } = useParams(),
    resource = useResource(() => catalogService.movie(slug), slug);
  return (
    <State resource={resource}>
      {resource.data && (
        <>
          <Metadata
            title={resource.data.mName}
            description={resource.data.descript}
          />
          <MovieHeroSection key={slug} movie={resource.data} />
          <Showtimes key={`times-${slug}`} movieId={resource.data.movieId} />
          <MovieReviewSection
            key={resource.data.movieId}
            movieId={resource.data.movieId}
          />
        </>
      )}
    </State>
  );
}
export function CinemasPage() {
  const resource = useResource(catalogService.branches),
    [q, setQ] = useState(""),
    [selected, setSelected] = useState(null);
  const rows = (resource.data || []).filter((b) =>
      lower(b.bName + " " + b.bAddress).includes(lower(q)),
    ),
    branch = rows.find((b) => b.branchId === selected) || rows[0];
  return (
    <Page title="Hệ thống rạp">
      <Metadata title="Hệ thống rạp" />
      <Field
        label="Tìm cơ sở"
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />
      <State resource={resource}>
        <div className="cinema-layout">
          <nav aria-label="Chọn chi nhánh" className="branch-list">
            {rows.map((b) => (
              <button
                className={
                  branch?.branchId === b.branchId ? "branch active" : "branch"
                }
                key={b.branchId}
                onClick={() => setSelected(b.branchId)}
                aria-pressed={branch?.branchId === b.branchId}
              >
                <strong>{b.bName}</strong>
                <span>{b.bAddress}</span>
              </button>
            ))}
          </nav>
          {branch ? (
            <CinemaDetails key={branch.branchId} branch={branch} />
          ) : (
            <Empty />
          )}
        </div>
      </State>
    </Page>
  );
}
function CinemaDetails({ branch }) {
  const resource = useResource(
    () => catalogService.rooms(branch.branchId),
    branch.branchId,
  );
  return (
    <div className="min-width-zero">
      <div className="panel">
        <h2>{branch.bName}</h2>
        <p>{branch.bAddress}</p>
        <p>{branch.phoneNumbers?.join(" · ")}</p>
        <a
          className="text-button"
          target="_blank"
          rel="noreferrer"
          href={
            "https://www.google.com/maps/search/?api=1&query=" +
            encodeURIComponent(branch.bAddress)
          }
        >
          Xem bản đồ ↗
        </a>
        <State resource={resource}>
          <h3>Phòng chiếu</h3>
          <div className="chips">
            {resource.data?.map((r) => (
              <span key={r.roomId}>
                Phòng {r.roomId} · {r.rType} · {r.rCapacity} ghế
              </span>
            ))}
          </div>
        </State>
      </div>
      <Showtimes branchId={branch.branchId} />
      <State resource={resource}>
        <CinemaReviewSection branch={branch} rooms={resource.data || []} />
      </State>
    </div>
  );
}
const productLabels = {
  ACTIVE: "Đang bán",
  PREACTIVE: "Chưa đến ngày kinh doanh",
  EXPIRED: "Đã ngừng kinh doanh",
  OUT_OF_STOCK: "Hết hàng",
  UNKNOWN: "Chưa có lịch kinh doanh",
  INVALID: "Chưa có dữ liệu hợp lệ",
};
export function ProductsPage() {
  const resource = useResource(catalogService.products),
    [q, setQ] = useState(""),
    [category, setCategory] = useState(""),
    [page, setPage] = useState(1);
  const rows = (resource.data || []).filter(
    (p) =>
      lower(productName(p)).includes(lower(q)) &&
      (!category || p.itemType === category),
  );
  return (
    <Page
      title="Sản phẩm"
      description="Đồ ăn, thức uống và quà lưu niệm cho buổi xem phim."
    >
      <Metadata title="Sản phẩm" />
      <div className="filters">
        <Field
          label="Tìm sản phẩm"
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setPage(1);
          }}
        />
        <Field label="Nhóm sản phẩm">
          <select
            value={category}
            onChange={(e) => {
              setCategory(e.target.value);
              setPage(1);
            }}
          >
            <option value="">Tất cả</option>
            <option value="FOOD_DRINK">Food & Drink</option>
            <option value="MERCHANDISE">Merchandise</option>
          </select>
        </Field>
      </div>
      <State resource={resource}>
        <div className="card-grid">
          {rows.slice((page - 1) * 8, page * 8).map((p) => (
            <Link
              className="panel product-card"
              key={productKey(p)}
              to={`/products/${p.productId}?type=${p.itemType}`}
            >
              <img
                src={p.imgUrl || "/placeholder-product.svg"}
                alt={productName(p)}
                loading="lazy"
              />
              <p className="eyebrow">
                {p.itemType === "FOOD_DRINK" ? "Food & Drink" : "Merchandise"}
              </p>
              <h2>{productName(p)}</h2>
              <strong>{money(p.price)}</strong>
              <p className="status-badge" data-status={productStatus(p)}>
                {productLabels[productStatus(p)]}
              </p>
            </Link>
          ))}
        </div>
        {!rows.length && <Empty />}
        <Pagination page={page} setPage={setPage} total={rows.length} />
      </State>
    </Page>
  );
}
export function ProductPage() {
  const { id } = useParams(),
    [params] = useSearchParams(),
    resource = useResource(catalogService.products),
    [quantity, setQuantity] = useState(1),
    action = useMutation(),
    add = useCartStore((s) => s.add);
  const matches = (resource.data || []).filter(
      (p) =>
        String(p.productId) === id &&
        (!params.get("type") || p.itemType === params.get("type")),
    ),
    product = matches.length === 1 ? matches[0] : null;
  return (
    <Page title={product ? productName(product) : "Chi tiết sản phẩm"}>
      <State resource={resource}>
        {product ? (
          <>
            <Metadata
              title={productName(product)}
              description={product.description}
            />
            <div className="detail-grid">
              <img
                className="product-image"
                src={product.imgUrl || "/placeholder-product.svg"}
                alt={productName(product)}
              />
              <div className="panel">
                <p className="plain-text">
                  {product.description || "Chưa có mô tả bổ sung."}
                </p>
                <h2>{money(product.price)}</h2>
                <p
                  className="status-badge"
                  data-status={productStatus(product)}
                >
                  {productLabels[productStatus(product)]}
                </p>
                <p className="muted">
                  Thời gian kinh doanh: {product.startDate || "—"} –{" "}
                  {product.endDate || "—"}
                </p>
                <Field
                  label="Số lượng"
                  type="number"
                  min="1"
                  max={stock(product)}
                  value={quantity}
                  onChange={(e) => setQuantity(Number(e.target.value))}
                />
                <Feedback action={action} />
                <button
                  className="btn"
                  disabled={productStatus(product) !== "ACTIVE"}
                  onClick={() =>
                    action.run(async (notify) => {
                      add(product, quantity);
                      notify("Đã thêm vào giỏ hàng.");
                    })
                  }
                >
                  Thêm vào giỏ
                </button>
                <Link className="text-button" to="/cart">
                  Xem giỏ hàng
                </Link>
              </div>
            </div>
          </>
        ) : (
          <Empty>
            Không tìm thấy sản phẩm. Hãy chọn sản phẩm từ danh sách.
          </Empty>
        )}
      </State>
    </Page>
  );
}
export function CartItems({ products }) {
  const { items, update, remove } = useCartStore(),
    rows = items.map((i) => ({
      ...i,
      product: products.find((p) => productKey(p) === productKey(i)),
    }));
  return (
    <>
      {!rows.length && <Empty>Giỏ hàng chưa có sản phẩm.</Empty>}
      {rows.map((i) => (
        <article className="cart-row panel" key={productKey(i)}>
          <div>
            <h3>
              {i.product
                ? productName(i.product)
                : "Sản phẩm không còn tồn tại"}
            </h3>
            <p>{i.product ? money(i.product.price) : "—"}</p>
            {(!i.product ||
              productStatus(i.product) !== "ACTIVE" ||
              i.quantity > stock(i.product)) && (
              <p className="error">
                Sản phẩm không khả dụng hoặc vượt tồn kho.
              </p>
            )}
          </div>
          <Field
            label="Số lượng"
            type="number"
            min="1"
            max={i.product ? stock(i.product) : 1}
            value={i.quantity}
            onChange={(e) => update(productKey(i), Number(e.target.value))}
          />
          <button className="text-button" onClick={() => remove(productKey(i))}>
            Xóa {i.product ? productName(i.product) : "sản phẩm"}
          </button>
        </article>
      ))}
    </>
  );
}
export function CartPage() {
  const reservation = useBookingStore((s) => s.reservation);
  const resource = useResource(catalogService.products),
    items = useCartStore((s) => s.items),
    total = items.reduce(
      (n, i) =>
        n +
        (resource.data?.find((p) => productKey(p) === productKey(i))?.price ||
          0) *
          i.quantity,
      0,
    );
  return (
    <Page title="Giỏ hàng">
      <Metadata title="Giỏ hàng" />
      <State resource={resource}>
        <CartItems products={resource.data || []} />
        <div className="panel">
          <h2>Tạm tính: {money(total)}</h2>
          <p className="muted">
            Sản phẩm được thanh toán kèm vé. Giá và tồn kho được kiểm tra lại
            khi tạo đơn.
          </p>
          <Link className="btn" to={reservation ? "/checkout" : "/movies"}>
            {reservation ? "Quay lại thanh toán" : "Chọn phim & đặt vé"}
          </Link>
          <Link className="text-button" to="/products">
            Thêm sản phẩm
          </Link>
        </div>
      </State>
    </Page>
  );
}
export function PromotionsPage() {
  const resource = useResource(catalogService.coupons),
    rows = (resource.data || []).filter(
      (c) => periodStatus(c) === "ACTIVE" && c.availNum > 0,
    );
  return (
    <Page
      title="Ưu đãi hiện có"
      description="Điều kiện voucher được kiểm tra lại khi thanh toán."
    >
      <Metadata title="Ưu đãi" />
      <State resource={resource}>
        <div className="card-grid">
          {rows.map((c) => (
            <article className="panel coupon" key={c.couponId}>
              <p className="eyebrow">Voucher #{c.couponId}</p>
              <h2>Giảm {c.saleOff}%</h2>
              <p>Đơn tối thiểu {money(c.minOrderTotal || 0)}</p>
              <p>
                {c.maxDiscount > 0
                  ? `Giảm tối đa ${money(c.maxDiscount)}`
                  : "Không giới hạn mức giảm"}
              </p>
              <p>
                Hiệu lực: {c.startDate} – {c.endDate}
              </p>
              <p>Còn {c.availNum} lượt</p>
              <Link to="/movies" className="text-button">
                Chọn phim
              </Link>
            </article>
          ))}
        </div>
        {!rows.length && <Empty>Chưa có voucher đang áp dụng.</Empty>}
      </State>
    </Page>
  );
}

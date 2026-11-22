import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  catalogService,
  checkoutService,
  seatReservationService,
} from '../../../services/customer.js';
import { useBookingStore, useCartStore } from '../../../store/cartStore.js';
import {
  money,
  productKey,
  productStatus,
  stock,
  couponDiscount,
  safeUrl,
} from '../../../lib/business.js';
import {
  Page,
  State,
  Feedback,
  Field,
  Empty,
  Metadata,
  useResource,
  useMutation,
} from '../../../components/shared/UI.jsx';
import { CartItems } from '../../../pages/CatalogPages.jsx';
export default function CheckoutLayout() {
  const { reservation, clear } = useBookingStore(),
    cart = useCartStore(),
    navigate = useNavigate(),
    [couponId, setCouponId] = useState(''),
    [remaining, setRemaining] = useState(0),
    [holdError, setHoldError] = useState(''),
    [created, setCreated] = useState(null),
    action = useMutation(),
    key = useRef(crypto.randomUUID());
  const resource = useResource(async () => {
    if (!reservation) return null;
    const [hold, showtime, seats, products, coupons] = await Promise.all([
      seatReservationService.get(reservation.reservationId),
      seatReservationService.showtime(reservation.timeId),
      seatReservationService.seats(reservation.timeId),
      catalogService.products(),
      catalogService.coupons(),
    ]);
    if (hold.timeId !== reservation.timeId || !hold.branchId || !hold.roomId)
      throw Error('Dữ liệu giữ ghế không hợp lệ.');
    return { hold, showtime, seats, products, coupons };
  }, reservation?.reservationId);
  useEffect(() => {
    if (!reservation || created) return;
    let alive = true,
      running = false;
    const tick = () =>
      setRemaining(Math.max(0, Math.ceil((Date.parse(reservation.expiresAt) - Date.now()) / 1000)));
    tick();
    const clock = setInterval(tick, 1000),
      poll = setInterval(async () => {
        if (running) return;
        running = true;
        try {
          await seatReservationService.get(reservation.reservationId);
          if (alive) setHoldError('');
        } catch (e) {
          if (alive) setHoldError(e.message);
        } finally {
          running = false;
        }
      }, 5000);
    return () => {
      alive = false;
      clearInterval(clock);
      clearInterval(poll);
    };
  }, [reservation, created]);
  const data = resource.data,
    seatTotal =
      data?.hold.seats.reduce(
        (n, s) =>
          n +
          data.showtime.rPrice +
          (data.seats.find((x) => x.sRow === s.sRow && x.sColumn === s.sColumn)?.sPrice || 0),
        0,
      ) || 0,
    addonTotal = cart.items.reduce(
      (n, i) =>
        n + (data?.products.find((p) => productKey(p) === productKey(i))?.price || 0) * i.quantity,
      0,
    ),
    total = seatTotal + addonTotal,
    coupon = data?.coupons.find((c) => String(c.couponId) === couponId),
    discount = coupon ? couponDiscount(coupon, total) : 0,
    invalid = cart.items.some((i) => {
      const p = data?.products.find((p) => productKey(p) === productKey(i));
      return !p || productStatus(p) !== 'ACTIVE' || i.quantity > stock(p);
    });
  async function create() {
    await action.run(async () => {
      await seatReservationService.get(reservation.reservationId);
      const order = await checkoutService.create({
        reservationId: reservation.reservationId,
        addons: cart.items.map(({ itemType, productId, quantity }) => ({
          itemType,
          productId,
          quantity,
        })),
        ...(couponId ? { couponId: Number(couponId) } : {}),
        idempotencyKey: key.current,
      });
      if (!order.orderId || !Number.isFinite(order.total))
        throw Error('Máy chủ chưa xác nhận đơn. Vui lòng thử lại để đối chiếu.');
      setCreated(order);
      clear();
      cart.clear();
    });
  }
  async function payment() {
    await action.run(async () => {
      const result = await checkoutService.payment(created.orderId);
      if (result.demo) {
        navigate(`/checkout/status?orderId=${created.orderId}`);
        return;
      }
      const url = safeUrl(result.paymentUrl);
      if (!url || !url.startsWith('https://'))
        throw Error('Máy chủ chưa trả liên kết thanh toán hợp lệ.');
      window.location.assign(url);
    });
  }
  return (
    <Page title="Thanh toán">
      <Metadata title="Thanh toán" />
      {created ? (
        <div className="panel">
          <h2>Đơn #{created.orderId}</h2>
          <p>
            Tổng tiền máy chủ xác nhận: <strong>{money(created.total)}</strong>
          </p>
          <p>Trạng thái: {created.orderStatus}</p>
          <Feedback action={action} />
          <button className="btn" disabled={action.busy} onClick={payment}>
            Tiếp tục thanh toán
          </button>
          <Link className="text-button" to={`/checkout/status?orderId=${created.orderId}`}>
            Kiểm tra trạng thái đơn
          </Link>
        </div>
      ) : !reservation ? (
        <Empty>
          Chưa có giữ ghế. <Link to="/movies">Chọn phim để đặt vé</Link>.
        </Empty>
      ) : (
        <State resource={resource}>
          {data && (
            <>
              <div className="panel">
                <h2>{data.showtime.movieName}</h2>
                <p>
                  {data.showtime.branchName} · Phòng {data.showtime.roomId}
                </p>
                <p>
                  Ghế:{' '}
                  {data.hold.seats
                    .map((s) => String.fromCharCode(64 + s.sRow) + s.sColumn)
                    .join(', ')}
                </p>
                <p role="status">
                  Thời gian giữ ghế: {Math.floor(remaining / 60)}:
                  {String(remaining % 60).padStart(2, '0')}
                </p>
                {(!remaining || holdError) && (
                  <p className="error">{holdError || 'Giữ ghế đã hết hạn. Vui lòng chọn lại.'}</p>
                )}
                <Link className="text-button" to={`/booking/showtime/${reservation.timeId}`}>
                  Chọn lại ghế
                </Link>
                <button
                  className="text-button"
                  disabled={action.busy}
                  onClick={() =>
                    action.run(async () => {
                      await seatReservationService.release(reservation.reservationId);
                      clear();
                      navigate('/movies');
                    })
                  }
                >
                  Hủy giữ ghế
                </button>
              </div>
              <h2>Sản phẩm đi kèm</h2>
              <CartItems products={data.products} />
              <Link className="text-button" to="/products">
                Thêm đồ ăn hoặc quà lưu niệm
              </Link>
              <div className="panel">
                <Field label="Voucher">
                  <select value={couponId} onChange={(e) => setCouponId(e.target.value)}>
                    <option value="">Không áp dụng</option>
                    {data.coupons
                      .filter((c) => couponDiscount(c, total) > 0)
                      .map((c) => (
                        <option value={c.couponId} key={c.couponId}>
                          #{c.couponId} · Giảm {c.saleOff}% · Tối đa {money(c.maxDiscount)}
                        </option>
                      ))}
                  </select>
                </Field>
                <p>Vé: {money(seatTotal)}</p>
                <p>Sản phẩm: {money(addonTotal)}</p>
                <p>Giảm dự kiến: {money(discount)}</p>
                <h2>Tạm tính: {money(total - discount)}</h2>
                <p className="muted">Giá cuối cùng do máy chủ xác nhận khi tạo đơn.</p>
                <Feedback action={action} />
                <button
                  className="btn"
                  disabled={
                    action.busy || !remaining || !!holdError || invalid || (!!couponId && !discount)
                  }
                  onClick={create}
                >
                  {action.busy ? 'Đang xác nhận…' : 'Tạo đơn & kiểm tra tổng tiền'}
                </button>
              </div>
            </>
          )}
        </State>
      )}
    </Page>
  );
}

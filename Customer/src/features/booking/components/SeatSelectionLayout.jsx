import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { seatReservationService } from '../../../services/customer.js';
import { useBookingStore } from '../../../store/cartStore.js';
import { money, seatKey, isFutureShowtime } from '../../../lib/business.js';
import {
  Page,
  State,
  Feedback,
  useResource,
  useMutation,
  Empty,
  Metadata,
} from '../../../components/shared/UI.jsx';
export default function SeatSelectionLayout() {
  const { id } = useParams(),
    navigate = useNavigate(),
    [selected, setSelected] = useState([]),
    [seats, setSeats] = useState([]),
    [pollError, setPollError] = useState('');
  const resource = useResource(async () => {
      const [showtime, seats] = await Promise.all([
        seatReservationService.showtime(id),
        seatReservationService.seats(id),
      ]);
      return { showtime, seats };
    }, id),
    action = useMutation(),
    setReservation = useBookingStore((s) => s.setReservation),
    active = useRef(true);
  useEffect(() => {
    setSelected([]);
    setSeats([]);
  }, [id]);
  useEffect(() => {
    if (resource.data) setSeats(resource.data.seats);
  }, [resource.data]);
  useEffect(() => {
    let alive = true,
      running = false;
    active.current = true;
    async function poll() {
      if (running) return;
      running = true;
      try {
        const rows = await seatReservationService.seats(id);
        if (alive) {
          setSeats(rows);
          setPollError('');
          setSelected((old) =>
            old.filter((s) =>
              rows.some(
                (r) =>
                  seatKey(r) === seatKey(s) && r.sStatus && !r.isBooked && r.holdStatus !== 'OTHER',
              ),
            ),
          );
        }
      } catch (e) {
        if (alive) setPollError(e.message);
      } finally {
        running = false;
      }
    }
    const timer = setInterval(poll, 5000);
    return () => {
      alive = false;
      active.current = false;
      clearInterval(timer);
    };
  }, [id]);
  const showtime = resource.data?.showtime,
    rows = [...new Set(seats.map((s) => s.sRow))].sort((a, b) => a - b),
    total = selected.reduce((sum, s) => sum + (showtime?.rPrice || 0) + s.sPrice, 0);
  function toggle(s) {
    setSelected((old) =>
      old.some((x) => seatKey(x) === seatKey(s))
        ? old.filter((x) => seatKey(x) !== seatKey(s))
        : old.length < 8
          ? [...old, s]
          : old,
    );
  }
  async function proceed() {
    await action.run(async () => {
      const hold = await seatReservationService.hold(Number(id), selected);
      if (
        !hold.reservationId ||
        hold.timeId !== Number(id) ||
        !Number.isFinite(Date.parse(hold.expiresAt)) ||
        Date.parse(hold.expiresAt) <= Date.now()
      )
        throw Error('Máy chủ chưa xác nhận giữ ghế.');
      if (!active.current) {
        await seatReservationService.release(hold.reservationId);
        return;
      }
      setReservation(hold);
      navigate('/checkout');
    });
  }
  return (
    <Page
      title="Chọn ghế"
      description="Chọn tối đa 8 ghế. Ghế chỉ được giữ sau khi máy chủ xác nhận ở bước tiếp theo."
    >
      <Metadata title="Chọn ghế" />
      <State resource={resource}>
        {showtime && (
          <>
            <div className="panel booking-heading">
              <h2>{showtime.movieName}</h2>
              <p>
                {showtime.branchName} · Phòng {showtime.roomId} ({showtime.rType}) · {showtime.day}{' '}
                · {showtime.startTime.slice(0, 5)}
              </p>
            </div>
            <div className="screen">
              <div />
              <p>MÀN HÌNH / SCREEN</p>
            </div>
            {pollError && (
              <p className="notice error" role="alert">
                Không cập nhật được ghế: {pollError}
              </p>
            )}
            <p className="muted">Trên màn hình nhỏ, cuộn ngang sơ đồ để xem tất cả ghế.</p>
            <div
              className="seat-scroll"
              role="region"
              aria-label="Sơ đồ ghế, có thể cuộn ngang"
              tabIndex={0}
            >
              <div className="seat-grid">
                {rows.map((row) => (
                  <div className="seat-row" key={row}>
                    <span className="row-label">{String.fromCharCode(64 + row)}</span>
                    {seats
                      .filter((s) => s.sRow === row)
                      .sort((a, b) => a.sColumn - b.sColumn)
                      .map((s) => {
                        const unavailable = !s.sStatus || s.isBooked || s.holdStatus === 'OTHER',
                          chosen = selected.some((x) => seatKey(x) === seatKey(s));
                        return (
                          <button
                            key={seatKey(s)}
                            type="button"
                            disabled={unavailable || action.busy || !isFutureShowtime(showtime)}
                            aria-pressed={chosen}
                            aria-label={`Ghế ${String.fromCharCode(64 + s.sRow)}${s.sColumn}, ${s.sType === 2 ? 'VIP' : 'Thường'}, ${money(showtime.rPrice + s.sPrice)}, ${s.isBooked ? 'đã bán' : s.holdStatus === 'OTHER' ? 'đang được giữ' : !s.sStatus ? 'ngừng sử dụng' : chosen ? 'đang chọn' : 'còn trống'}`}
                            data-state={
                              s.isBooked
                                ? 'sold'
                                : s.holdStatus === 'OTHER'
                                  ? 'held'
                                  : !s.sStatus
                                    ? 'unavailable'
                                    : chosen
                                      ? 'selected'
                                      : 'available'
                            }
                            onClick={() => toggle(s)}
                            className={`seat ${s.sType === 2 ? 'vip' : ''} ${chosen ? 'selected' : ''} ${s.isBooked ? 'sold' : ''} ${s.holdStatus === 'OTHER' ? 'held' : ''}`}
                          >
                            <span className="seat-symbol" aria-hidden="true">
                              {s.isBooked
                                ? '×'
                                : s.holdStatus === 'OTHER'
                                  ? '⏳'
                                  : !s.sStatus
                                    ? '–'
                                    : chosen
                                      ? '✓'
                                      : s.sType === 2
                                        ? 'V'
                                        : '○'}
                            </span>
                            <span>
                              {String.fromCharCode(64 + s.sRow)}
                              {s.sColumn}
                            </span>
                          </button>
                        );
                      })}
                  </div>
                ))}
              </div>
            </div>
            {!seats.length && <Empty>Chưa có sơ đồ ghế cho suất chiếu này.</Empty>}
            <div className="seat-legend">
              <span>
                <i className="legend-seat" aria-hidden="true">
                  ○
                </i>{' '}
                Còn trống
              </span>
              <span>
                <i className="legend-seat vip" aria-hidden="true">
                  V
                </i>{' '}
                VIP
              </span>
              <span>
                <i className="legend-seat selected" aria-hidden="true">
                  ✓
                </i>{' '}
                Đang chọn
              </span>
              <span>
                <i className="legend-seat held" aria-hidden="true">
                  ⏳
                </i>{' '}
                Đang giữ
              </span>
              <span>
                <i className="legend-seat sold" aria-hidden="true">
                  ×
                </i>{' '}
                Đã bán
              </span>
              <span>
                <i className="legend-seat unavailable" aria-hidden="true">
                  –
                </i>{' '}
                Ngừng sử dụng
              </span>
            </div>
            <div className="panel checkout-bar">
              <div>
                <p>
                  Ghế chọn:{' '}
                  {selected.map((s) => String.fromCharCode(64 + s.sRow) + s.sColumn).join(', ') ||
                    'Chưa chọn'}
                </p>
                <h2>Tạm tính: {money(total)}</h2>
                <p className="muted">Giá cơ bản {money(showtime.rPrice)} + phụ thu theo ghế.</p>
              </div>
              <button
                className="btn"
                disabled={
                  !selected.length || action.busy || !!pollError || !isFutureShowtime(showtime)
                }
                onClick={proceed}
              >
                {action.busy ? 'Đang yêu cầu giữ ghế…' : 'Giữ ghế & tiếp tục'}
              </button>
            </div>
            <Feedback action={action} />
          </>
        )}
      </State>
      <Link to="/movies" className="text-button">
        ← Quay lại danh sách phim
      </Link>
    </Page>
  );
}

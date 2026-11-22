import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { authService, checkoutService } from '../services/customer.js';
import { RECOVERY_ENABLED, USE_MOCK } from '../services/api.js';
import { useUserStore } from '../store/userStore.js';
import { money, dateTime, todayVN, safeUrl } from '../lib/business.js';
import {
  Page,
  State,
  Field,
  Feedback,
  Empty,
  Pagination,
  Metadata,
  useResource,
  useMutation,
} from '../components/shared/UI.jsx';
export function AuthPage({ register = false }) {
  const action = useMutation(),
    navigate = useNavigate(),
    [params] = useSearchParams(),
    setUser = useUserStore((s) => s.setUser);
  async function submit(e) {
    e.preventDefault();
    const values = Object.fromEntries(new FormData(e.currentTarget));
    await action.run(async () => {
      values.email = values.email.trim();
      if (register) {
        values.fullName = values.fullName.trim();
        if (!values.fullName || values.password !== values.confirm)
          throw Error('Họ tên hoặc mật khẩu xác nhận chưa hợp lệ.');
        delete values.confirm;
      }
      const user = await (register ? authService.register(values) : authService.login(values));
      setUser(user);
      const dest = params.get('next');
      navigate(dest?.startsWith('/') && !dest.startsWith('//') ? dest : '/profile', {
        replace: true,
      });
    });
  }
  return (
    <Page title={register ? 'Tạo tài khoản' : 'Chào mừng trở lại'}>
      <Metadata title={register ? 'Đăng ký' : 'Đăng nhập'} />
      <form className="panel form-width" onSubmit={submit}>
        {USE_MOCK && (
          <p className="notice">
            Tài khoản demo: customer@cinema.test
            <br />
            Mật khẩu: DemoCinema123!
          </p>
        )}
        {register && (
          <>
            <Field label="Họ tên" name="fullName" required maxLength={100} autoComplete="name" />
            <Field
              label="Số điện thoại"
              name="phone"
              required
              type="tel"
              pattern="[+]?[0-9]{8,15}"
            />
            {USE_MOCK && (
              <>
                <Field label="Ngày sinh (tùy chọn)" name="dob" type="date" max={todayVN()} />
                <p className="muted">
                  Ngày sinh chỉ được lưu trong chế độ demo. Backend thật chưa hỗ trợ lưu trường này.
                </p>
              </>
            )}
            <Field label="Giới tính">
              <select name="gender">
                <option value="F">Nữ</option>
                <option value="M">Nam</option>
              </select>
            </Field>
          </>
        )}
        <Field
          label="Email"
          name="email"
          type="email"
          required
          autoComplete="email"
          maxLength={200}
        />
        <Field
          label="Mật khẩu"
          name="password"
          type="password"
          required
          minLength={register ? 10 : 1}
          maxLength={128}
          autoComplete={register ? 'new-password' : 'current-password'}
        />
        {register && (
          <Field
            label="Xác nhận mật khẩu"
            name="confirm"
            type="password"
            required
            minLength={10}
            maxLength={128}
            autoComplete="new-password"
          />
        )}
        <Feedback action={action} />
        <button className="btn" disabled={action.busy}>
          {action.busy ? 'Đang xử lý…' : register ? 'Đăng ký' : 'Đăng nhập'}
        </button>
        <p>
          <Link to={register ? '/login' : '/register'} className="text-button">
            {register ? 'Đã có tài khoản? Đăng nhập' : 'Chưa có tài khoản? Đăng ký'}
          </Link>
        </p>
        {RECOVERY_ENABLED && !register && (
          <Link to="/forgot-password" className="text-button">
            Quên mật khẩu?
          </Link>
        )}
      </form>
    </Page>
  );
}
export function RecoveryPage({ reset = false }) {
  const action = useMutation(),
    [params] = useSearchParams();
  async function submit(e) {
    e.preventDefault();
    const values = Object.fromEntries(new FormData(e.currentTarget));
    await action.run(async (notify) => {
      if (reset) {
        if (values.password !== values.confirm) throw Error('Mật khẩu xác nhận không khớp.');
        await authService.reset({
          token: params.get('token'),
          newPassword: values.password,
        });
        notify('Mật khẩu đã được cập nhật. Vui lòng đăng nhập.');
      } else {
        const result = await authService.forgot(values.email.trim());
        notify(result.message || 'Nếu email hợp lệ, hướng dẫn khôi phục sẽ được gửi đến bạn.');
      }
    });
  }
  return (
    <Page title={reset ? 'Đặt lại mật khẩu' : 'Khôi phục tài khoản'}>
      {!RECOVERY_ENABLED ? (
        <Empty>
          Chức năng khôi phục chưa được hỗ trợ. <Link to="/contact">Liên hệ hỗ trợ</Link>.
        </Empty>
      ) : (
        <form className="panel form-width" onSubmit={submit}>
          {reset ? (
            <>
              <Field
                label="Mật khẩu mới"
                name="password"
                type="password"
                minLength={10}
                maxLength={128}
                required
              />
              <Field
                label="Xác nhận mật khẩu"
                name="confirm"
                type="password"
                minLength={10}
                maxLength={128}
                required
              />
            </>
          ) : (
            <Field label="Email" name="email" type="email" required />
          )}
          <Feedback action={action} />
          <button className="btn" disabled={action.busy || (reset && !params.get('token'))}>
            Gửi yêu cầu
          </button>
        </form>
      )}
    </Page>
  );
}
export function ProfilePage() {
  const user = useUserStore((s) => s.user),
    setUser = useUserStore((s) => s.setUser),
    logout = useUserStore((s) => s.logout),
    action = useMutation(),
    passwordAction = useMutation(),
    avatarAction = useMutation(),
    navigate = useNavigate();
  async function save(e) {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.currentTarget));
    await action.run(async (notify) => {
      data.fullName = data.fullName.trim();
      if (!data.fullName) throw Error('Họ tên không được trống.');
      setUser(await authService.profile(data));
      notify('Đã lưu hồ sơ.');
    });
  }
  return (
    <Page title="Tài khoản của bạn">
      <Metadata title="Hồ sơ" />
      <div className="account-grid">
        <form className="panel" onSubmit={save}>
          <h2>Thông tin cá nhân</h2>
          <p className="muted">{user.email}</p>
          <Field
            label="Họ tên"
            name="fullName"
            defaultValue={user.fullName}
            required
            maxLength={100}
          />
          <Field
            label="Số điện thoại"
            name="phone"
            defaultValue={user.phone}
            type="tel"
            required
            pattern="[+]?[0-9]{8,15}"
          />
          <Field
            label="Ngày sinh (tùy chọn)"
            name="dob"
            type="date"
            defaultValue={user.dob}
            max={todayVN()}
            readOnly={!USE_MOCK}
          />
          <p className="muted">
            {USE_MOCK
              ? 'Ngày sinh chỉ được lưu trong chế độ demo. Backend thật chưa hỗ trợ lưu trường này.'
              : 'Backend thật chưa hỗ trợ lưu ngày sinh. Trường này chỉ hiển thị dữ liệu nếu máy chủ trả về.'}
          </p>
          <Field label="Giới tính">
            <select name="gender" defaultValue={user.gender || 'F'}>
              <option value="F">Nữ</option>
              <option value="M">Nam</option>
            </select>
          </Field>
          <Feedback action={action} />
          <button className="btn" disabled={action.busy}>
            Lưu hồ sơ
          </button>
        </form>
        <div>
          <form
            className="panel"
            onSubmit={(e) => {
              e.preventDefault();
              const form = e.currentTarget,
                data = Object.fromEntries(new FormData(form));
              passwordAction.run(async (notify) => {
                if (data.newPassword !== data.confirm) throw Error('Mật khẩu xác nhận không khớp.');
                await authService.password({
                  oldPassword: data.oldPassword,
                  newPassword: data.newPassword,
                });
                form.reset();
                notify('Đã đổi mật khẩu.');
              });
            }}
          >
            <h2>Đổi mật khẩu</h2>
            <Field
              label="Mật khẩu hiện tại"
              name="oldPassword"
              type="password"
              required
              autoComplete="current-password"
            />
            <Field
              label="Mật khẩu mới"
              name="newPassword"
              type="password"
              required
              minLength={10}
              maxLength={128}
              autoComplete="new-password"
            />
            <Field
              label="Xác nhận mật khẩu mới"
              name="confirm"
              type="password"
              required
              minLength={10}
              maxLength={128}
              autoComplete="new-password"
            />
            <Feedback action={passwordAction} />
            <button className="btn" disabled={passwordAction.busy}>
              Đổi mật khẩu
            </button>
          </form>
          <div className="panel">
            <h2>Ảnh đại diện</h2>
            {user.avatarUrl && (
              <img className="avatar large" alt="Ảnh đại diện của bạn" src={user.avatarUrl} />
            )}
            <Field
              label="Chọn ảnh JPG, PNG hoặc WebP (tối đa 5 MB)"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              disabled={avatarAction.busy}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file)
                  avatarAction.run(async (notify) => {
                    const result = await authService.avatar(file);
                    if (!result.avatarUrl) throw Error('Máy chủ chưa xác nhận ảnh.');
                    setUser(result);
                    notify('Đã cập nhật ảnh đại diện.');
                  });
              }}
            />
            <Feedback action={avatarAction} />
          </div>
        </div>
      </div>
      <div className="panel">
        <Link className="btn secondary" to="/history">
          Lịch sử đặt vé & thanh toán
        </Link>
        <button
          className="text-button"
          disabled={action.busy}
          onClick={() =>
            action.run(async () => {
              await logout();
              navigate('/login');
            })
          }
        >
          Đăng xuất
        </button>
      </div>
    </Page>
  );
}
const statusLabels = {
  PAID: 'Đã thanh toán',
  PENDING: 'Đơn tại quầy chưa thanh toán',
  AWAITING_PAYMENT: 'Chờ thanh toán trực tuyến',
  CANCELLED: 'Đã hủy',
  FAILED: 'Thanh toán thất bại',
  EXPIRED: 'Đã hết hạn',
  REFUNDED: 'Đã hoàn tiền',
};
export function HistoryPage() {
  const resource = useResource(async () => {
      const [orders, payments] = await Promise.all([
        checkoutService.orders(),
        checkoutService.payments(),
      ]);
      return { orders, payments };
    }),
    [page, setPage] = useState(1);
  return (
    <Page title="Lịch sử của bạn">
      <Metadata title="Lịch sử đặt vé và thanh toán" />
      <State resource={resource}>
        <h2>Đơn đặt vé</h2>
        {resource.data?.orders.slice((page - 1) * 6, page * 6).map((o) => (
          <article className="panel" key={o.orderId}>
            <div className="section-heading">
              <h3>Đơn #{o.orderId}</h3>
              <span className="badge status-badge" data-status={o.orderStatus}>
                {statusLabels[o.orderStatus] || o.orderStatus}
              </span>
            </div>
            <p>
              {dateTime(o.orderTime)} · {money(o.total)}
            </p>
            {o.ticketDetails?.map((t, i) => (
              <p key={i}>
                {t.movieName} · {t.branchName} · Phòng {t.roomId} · {t.seatName} ·{' '}
                {dateTime(t.showtime)}
              </p>
            ))}
            {o.addonDetails?.map((a, i) => (
              <p key={i}>
                {a.pName || a.productName} × {a.quantity}
              </p>
            ))}
            <Link to={`/checkout/status?orderId=${o.orderId}`} className="text-button">
              Xem trạng thái
            </Link>
          </article>
        ))}
        {!resource.data?.orders.length && <Empty>Bạn chưa có đơn hàng.</Empty>}
        <Pagination
          page={page}
          setPage={setPage}
          total={resource.data?.orders.length || 0}
          pageSize={6}
        />
        <h2>Lịch sử thanh toán</h2>
        {resource.data?.payments.map((p) => (
          <article className="panel" key={p.paymentId}>
            <h3>
              Đơn #{p.orderId} · {p.paymentStatus}
            </h3>
            <p>
              {money(p.amount)} · {p.paymentMethod} · {dateTime(p.paymentTime)}
            </p>
          </article>
        ))}
        {!resource.data?.payments.length && <Empty>Chưa có giao dịch thanh toán.</Empty>}
      </State>
    </Page>
  );
}
export function PaymentStatusPage() {
  const [params] = useSearchParams(),
    orderId = params.get('orderId'),
    resource = useResource(() => {
      if (!/^\d+$/.test(orderId || '')) throw Error('Thiếu mã đơn hàng hợp lệ.');
      return checkoutService.order(orderId);
    }, orderId),
    action = useMutation();
  useEffect(() => {
    if (
      !orderId ||
      resource.error ||
      ['PAID', 'FAILED', 'EXPIRED', 'CANCELLED', 'REFUNDED'].includes(resource.data?.orderStatus)
    )
      return;
    const timer = setInterval(resource.reload, 5000);
    return () => clearInterval(timer);
  }, [orderId, resource.data?.orderStatus, resource.error, resource.reload]);
  const order = resource.data;
  return (
    <Page title="Trạng thái thanh toán">
      <Metadata title="Trạng thái thanh toán" />
      <State resource={resource}>
        {order && (
          <div className="panel">
            <p className="eyebrow">Đơn #{order.orderId}</p>
            <h2 className="payment-status" data-status={order.orderStatus}>
              {order.orderStatus === 'PAID'
                ? 'Thanh toán thành công'
                : statusLabels[order.orderStatus] || 'Chưa xác nhận thanh toán'}
            </h2>
            <p>Tổng tiền: {money(order.total)}</p>
            {order.orderStatus !== 'PAID' && <p>Đơn chưa được xác nhận thanh toán thành công.</p>}
            {USE_MOCK && (
              <p className="notice">
                Demo không thực hiện thanh toán thật. Đơn mới không tự chuyển thành PAID.
              </p>
            )}
            <Feedback action={action} />
            {order.orderStatus === 'AWAITING_PAYMENT' && !USE_MOCK && (
              <button
                className="btn"
                disabled={action.busy}
                onClick={() =>
                  action.run(async () => {
                    const result = await checkoutService.payment(order.orderId),
                      url = safeUrl(result.paymentUrl);
                    if (!url.startsWith('https://'))
                      throw Error('Chưa có liên kết thanh toán hợp lệ.');
                    window.location.assign(url);
                  })
                }
              >
                Tiếp tục thanh toán
              </button>
            )}
            <button className="btn secondary" onClick={resource.reload}>
              Kiểm tra lại
            </button>
            <Link className="text-button" to="/history">
              Xem lịch sử
            </Link>
          </div>
        )}
      </State>
    </Page>
  );
}

import siteContentSeed from './site-content-seed.json' with { type: 'json' };
import { contactRequest } from '../lib/contact.js';
import { adaptSiteContent } from '../lib/siteContent.js';
import seed from './public-seed.json' with { type: 'json' };
import {
  todayVN,
  productStatus,
  productKey,
  stock,
  couponDiscount,
  periodStatus,
  seatKey,
  isFutureShowtime,
  validateComment,
  validateReview,
} from '../lib/business.js';
const fail = (message, status = 422) => {
  throw Object.assign(new Error(message), { status });
};
const pick = (o, keys) => Object.fromEntries(keys.filter((k) => k in o).map((k) => [k, o[k]]));
export function createRepository({ now = () => Date.now(), storage = null } = {}) {
  const anchor = todayVN(new Date(now())),
    shift = (Date.parse(anchor) - Date.parse(seed.anchor)) / 86400000;
  const db = JSON.parse(JSON.stringify(seed), (_k, v) =>
    typeof v === 'string' && /^\d{4}-\d{2}-\d{2}(T|$)/.test(v)
      ? new Date(Date.parse(v.slice(0, 10)) + shift * 86400000).toISOString().slice(0, 10) +
        v.slice(10)
      : v,
  );
  db.users = [
    {
      userId: 'KH001',
      fullName: 'Khách hàng Demo 1',
      email: 'customer@cinema.test',
      password: 'DemoCinema123!',
      role: 'CUSTOMER',
      phone: '0901000000',
      dob: '2000-01-01',
      gender: 'F',
      avatarUrl: '',
    },
  ];
  db.contacts = [];
  db.reports = [
    {
      reportId: 1,
      targetType: 'MOVIE_COMMENT',
      targetId: 1,
      reporterId: 'KH002',
      reason: 'Báo cáo mẫu',
      status: 'PENDING',
    },
    {
      reportId: 2,
      targetType: 'CINEMA_REVIEW',
      targetId: 1,
      reporterId: 'KH003',
      reason: 'Báo cáo mẫu',
      status: 'PENDING',
    },
  ];
  db.holds = [];
  const past = db.showtimes.find((s) => s.day < anchor);
  db.orders = [
    {
      orderId: 100,
      userId: 'KH001',
      source: 'CUSTOMER',
      branchId: past.branchId,
      timeId: past.timeId,
      orderStatus: 'PAID',
      orderTime: past.day + 'T08:00:00+07:00',
      total: past.rPrice,
      originalTotal: past.rPrice,
      discountAmount: 0,
      paymentMethod: 'DEMO',
      ticketDetails: [
        {
          ticketId: 1,
          showtimeId: past.timeId,
          movieId: past.movieId,
          movieName: past.movieName,
          branchId: past.branchId,
          branchName: past.branchName,
          roomId: past.roomId,
          sRow: 1,
          sColumn: 1,
          seatName: 'A1',
          showtime: past.day + 'T' + past.startTime + '+07:00',
          price: past.rPrice,
        },
      ],
      addonDetails: [],
    },
  ];
  db.payments = [
    {
      paymentId: 1,
      orderId: 100,
      userId: 'KH001',
      amount: past.rPrice,
      paymentStatus: 'SUCCESS',
      paymentMethod: 'DEMO',
      paymentTime: past.day + 'T08:00:00+07:00',
    },
  ];
  let session = null;
  try {
    const saved = JSON.parse(storage?.getItem('cms-demo-v1') || 'null');
    if (saved?.anchor === anchor) {
      for (const k of [
        'users',
        'contacts',
        'reports',
        'holds',
        'orders',
        'payments',
        'movie-comments',
        'cinema-reviews',
      ])
        if (Array.isArray(saved.db[k])) db[k] = saved.db[k];
      session = saved.session;
    }
  } catch {
    /* Invalid demo storage is discarded. */
  }
  const save = () => {
    try {
      storage?.setItem(
        'cms-demo-v1',
        JSON.stringify({
          anchor,
          session,
          db: pick(db, [
            'users',
            'contacts',
            'reports',
            'holds',
            'orders',
            'payments',
            'movie-comments',
            'cinema-reviews',
          ]),
        }),
      );
    } catch {
      /* Demo remains usable in memory. */
    }
  };
  const id = (rows) =>
    Math.max(
      0,
      ...rows.map(
        (r) =>
          Number(r.reportId || r.commentId || r.reviewId || r.orderId || r.paymentId || r.id) || 0,
      ),
    ) + 1;
  const user = () => db.users.find((u) => u.userId === session) || fail('Vui lòng đăng nhập.', 401);
  const profile = (u) => ({
    cUserId: u.userId,
    cName: u.fullName,
    phoneNumber: u.phone,
    sex: u.gender,
    birthday: u.dob, // Demo-only field; PHP support remains OPEN O-03.
    ...pick(u, ['email', 'role', 'avatarUrl']),
    csrfToken: 'demo-csrf',
  });
  // Keep the existing demo storage schema so saved profiles are not discarded.
  const profileChanges = (payload) =>
    Object.fromEntries(
      [
        ['cName', 'fullName'],
        ['phoneNumber', 'phone'],
        ['sex', 'gender'],
        ['birthday', 'dob'],
      ]
        .filter(([key]) => Object.hasOwn(payload, key))
        .map(([key, alias]) => [alias, payload[key]]),
    );
  const find = (rows, key, value) =>
    rows.find((r) => String(r[key]) === String(value)) || fail('Không tìm thấy dữ liệu.', 404);
  const products = () => [...db['food-drinks'], ...db.merchandise];
  const expire = () => {
    db.holds = db.holds.filter((h) => Date.parse(h.expiresAt) > now());
    db.orders.forEach((o) => {
      if (o.orderStatus === 'AWAITING_PAYMENT' && Date.parse(o.expiresAt) <= now())
        o.orderStatus = 'EXPIRED';
    });
  };
  const seatMap = (timeId) => {
    expire();
    const st = find(db.showtimes, 'timeId', timeId);
    return db.seats
      .filter((s) => s.branchId === st.branchId && s.roomId === st.roomId)
      .map((s) => {
        const hold = db.holds.find(
          (h) => h.timeId === st.timeId && h.seats.some((x) => seatKey(x) === seatKey(s)),
        );
        return {
          ...s,
          isBooked: db.orders.some(
            (o) =>
              ['PAID', 'AWAITING_PAYMENT'].includes(o.orderStatus) &&
              o.ticketDetails.some((t) => t.showtimeId === st.timeId && seatKey(t) === seatKey(s)),
          ),
          holdStatus: hold ? (hold.userId === session ? 'OWN' : 'OTHER') : 'FREE',
          rowName: String.fromCharCode(64 + s.sRow),
          number: String(s.sColumn),
        };
      });
  };
  async function request(method, url, payload = {}) {
    expire();
    const u = new URL(url, 'https://mock.invalid'),
      p = u.pathname,
      q = u.searchParams;
    if (p === '/auth/csrf') return { csrfToken: 'demo-csrf' };
    if (p === '/auth/login' && method === 'POST') {
      const account = db.users.find(
        (a) =>
          a.email.toLowerCase() === payload.email?.toLowerCase() && a.password === payload.password,
      );
      if (!account) fail('Email hoặc mật khẩu không đúng.', 401);
      session = account.userId;
      save();
      return { user: profile(account), csrfToken: 'demo-csrf' };
    }
    if (p === '/auth/register' && method === 'POST') {
      if (
        !payload.cName?.trim() ||
        !/^\S+@\S+\.\S+$/.test(payload.email) ||
        payload.password?.length < 10
      )
        fail('Thông tin đăng ký không hợp lệ.');
      if (db.users.some((a) => a.email.toLowerCase() === payload.email.toLowerCase()))
        fail('Email đã tồn tại.', 409);
      const account = {
        ...profileChanges(payload),
        ...pick(payload, ['email', 'password']),
        userId: 'DEMO' + (db.users.length + 1),
        role: 'CUSTOMER',
      };
      db.users.push(account);
      session = account.userId;
      save();
      return profile(account);
    }
    if (p === '/auth/logout' && method === 'POST') {
      session = null;
      save();
      return { loggedOut: true };
    }
    if (p === '/auth/me') return profile(user());
    if (p === '/customers/me' && method === 'PUT') {
      Object.assign(user(), profileChanges(payload));
      save();
      return profile(user());
    }
    if (p === '/customers/me/avatar' && method === 'POST') {
      user().avatarUrl = payload.avatarUrl;
      save();
      return profile(user());
    }
    if (p === '/auth/change-password' && method === 'POST') {
      const a = user();
      if (a.password !== payload.oldPassword || payload.newPassword?.length < 10)
        fail('Mật khẩu cũ không đúng hoặc mật khẩu mới quá ngắn.');
      a.password = payload.newPassword;
      save();
      return { changed: true };
    }
    if (p === '/auth/forgot-password')
      return {
        message: 'Demo: không gửi email thật. Tài khoản mẫu vẫn dùng mật khẩu được công bố.',
      };
    if (p === '/auth/reset-password')
      fail('Demo không phát hành token khôi phục. Cần email từ PHP backend.');
    if (p === '/public/movies') return db.movies;
    if (p.startsWith('/public/movies/slug/'))
      return find(db.movies, 'slug', decodeURIComponent(p.split('/').pop()));
    if (/^\/public\/movies\/\d+\/comments$/.test(p))
      return db['movie-comments'].filter(
        (c) => c.movieId === Number(p.split('/')[3]) && c.contentStatus === 'VISIBLE',
      );
    if (p === '/movie-comments' && method === 'POST') {
      const a = user(),
        body = validateComment(payload),
        m = find(db.movies, 'movieId', body.movieId);
      const row = {
        ...body,
        commentId: id(db['movie-comments']),
        movieTitle: m.mName,
        userId: a.userId,
        authorName: a.fullName,
        avatarUrl: a.avatarUrl,
        createdAt: new Date(now()).toISOString(),
        contentStatus: 'VISIBLE',
      };
      db['movie-comments'].unshift(row);
      save();
      return row;
    }
    if (p === '/public/branches') return db.branches;
    if (/^\/public\/branches\/\d+\/rooms$/.test(p))
      return db.rooms.filter((r) => r.branchId === Number(p.split('/')[3]));
    if (/^\/public\/branches\/\d+\/reviews$/.test(p))
      return db['cinema-reviews'].filter(
        (r) => r.branchId === Number(p.split('/')[3]) && r.contentStatus === 'VISIBLE',
      );
    if (p === '/cinema-reviews' && method === 'POST') {
      const a = user(),
        body = validateReview(payload, db.rooms),
        branch = find(db.branches, 'branchId', body.branchId);
      const row = {
        ...body,
        reviewId: id(db['cinema-reviews']),
        branchName: branch.bName,
        userId: a.userId,
        authorName: a.fullName,
        createdAt: new Date(now()).toISOString(),
        contentStatus: 'VISIBLE',
      };
      db['cinema-reviews'].unshift(row);
      save();
      return row;
    }
    if (p === '/comment-reports' && method === 'POST') {
      const a = user();
      const type = payload.targetType;
      if (
        !['MOVIE_COMMENT', 'CINEMA_REVIEW'].includes(type) ||
        !Number.isSafeInteger(payload.targetId) ||
        payload.targetId <= 0 ||
        !payload.reason?.trim() ||
        payload.reason.trim().length > 1000
      )
        fail('Báo cáo không hợp lệ.');
      const target = find(
        db[type === 'MOVIE_COMMENT' ? 'movie-comments' : 'cinema-reviews'],
        type === 'MOVIE_COMMENT' ? 'commentId' : 'reviewId',
        payload.targetId,
      );
      if (target.contentStatus !== 'VISIBLE') fail('Nội dung không còn công khai.', 409);
      if (
        db.reports.some(
          (r) =>
            r.reporterId === a.userId &&
            r.targetType === type &&
            r.targetId === payload.targetId &&
            r.status === 'PENDING',
        )
      )
        fail('Bạn đã báo cáo nội dung này.', 409);
      const row = {
        reportId: id(db.reports),
        targetType: type,
        targetId: payload.targetId,
        reason: payload.reason.trim(),
        reporterId: a.userId,
        reporterName: a.fullName,
        reportedAt: new Date(now()).toISOString(),
        status: 'PENDING',
        resolutionAction: null,
      };
      db.reports.push(row);
      save();
      return row;
    }
    if (p === '/public/products') return products();
    if (p === '/public/coupons')
      return db.coupons.filter((c) => periodStatus(c, now()) === 'ACTIVE' && c.availNum > 0);
    if (p === '/public/faq' || p === '/public/news')
      return db[p.split('/')[2]].filter((r) => r.status === 'PUBLISHED');
    if (p === '/public/site-content') {
      if (method !== 'GET') fail('Không được chỉnh sửa nội dung từ Customer.', 405);
      return adaptSiteContent(siteContentSeed).data;
    }
    if (p === '/contacts' && method === 'POST') {
      let values;
      try {
        values = contactRequest(payload);
      } catch (error) {
        fail(error.message);
      }
      const row = {
        ...values,
        id: Math.max(0, ...db.contacts.map((item) => item.id)) + 1,
        status: 'UNREAD',
        createdAt: new Date(now()).toISOString(),
      };
      db.contacts.push(row);
      save();
      return { id: row.id, received: true };
    }
    if (p === '/public/showtimes')
      return db.showtimes.filter(
        (s) =>
          (!q.get('movieId') || s.movieId === Number(q.get('movieId'))) &&
          (!q.get('branchId') || s.branchId === Number(q.get('branchId'))),
      );
    if (/^\/public\/showtimes\/\d+\/seats$/.test(p)) return seatMap(Number(p.split('/')[3]));
    if (/^\/public\/showtimes\/\d+$/.test(p)) return find(db.showtimes, 'timeId', p.split('/')[3]);
    if (p === '/seat-reservations' && method === 'POST') {
      const a = user(),
        st = find(db.showtimes, 'timeId', payload.timeId);
      if (!isFutureShowtime(st, now())) fail('Suất chiếu đã bắt đầu hoặc bị hủy.', 409);
      const selected = payload.seats;
      if (
        !Array.isArray(selected) ||
        !selected.length ||
        selected.length > 8 ||
        new Set(selected.map(seatKey)).size !== selected.length
      )
        fail('Chọn từ 1 đến 8 ghế khác nhau.');
      const map = seatMap(st.timeId);
      for (const s of selected) {
        const actual = map.find((x) => seatKey(x) === seatKey(s));
        if (!actual || !actual.sStatus || actual.isBooked || actual.holdStatus === 'OTHER')
          fail('Ghế vừa được giữ hoặc đã bán. Vui lòng chọn lại.', 409);
      }
      db.holds = db.holds.filter((h) => !(h.userId === a.userId && h.timeId === st.timeId));
      const row = {
        reservationId: crypto.randomUUID(),
        timeId: st.timeId,
        branchId: st.branchId,
        roomId: st.roomId,
        userId: a.userId,
        seats: selected.map((s) => pick(s, ['sRow', 'sColumn'])),
        expiresAt: new Date(now() + 600000).toISOString(),
      };
      db.holds.push(row);
      save();
      return row;
    }
    if (p.startsWith('/seat-reservations/')) {
      const a = user(),
        h = find(db.holds, 'reservationId', p.split('/')[2]);
      if (h.userId !== a.userId) fail('Không có quyền truy cập.', 403);
      if (method === 'DELETE') {
        db.holds = db.holds.filter((x) => x !== h);
        save();
        return { released: true };
      }
      return h;
    }
    if (p === '/customer/orders' && method === 'GET')
      return db.orders.filter((o) => o.userId === user().userId);
    if (p === '/customer/payments') return db.payments.filter((o) => o.userId === user().userId);
    if (p === '/customer/orders' && method === 'POST') {
      const a = user();
      const previous = db.orders.find(
        (o) => o.userId === a.userId && o.idempotencyKey === payload.idempotencyKey,
      );
      if (previous) return previous;
      const h = find(db.holds, 'reservationId', payload.reservationId);
      if (h.userId !== a.userId) fail('Giữ ghế không thuộc phiên.', 403);
      const st = find(db.showtimes, 'timeId', h.timeId);
      if (!isFutureShowtime(st, now())) fail('Suất chiếu không còn bán vé.', 409);
      const map = seatMap(st.timeId);
      const tickets = h.seats.map((s) => {
        const actual = map.find((x) => seatKey(x) === seatKey(s));
        if (actual.isBooked) fail('Ghế không còn trống.', 409);
        return {
          ...s,
          showtimeId: st.timeId,
          movieId: st.movieId,
          movieName: st.movieName,
          branchId: st.branchId,
          branchName: st.branchName,
          roomId: st.roomId,
          seatName: actual.rowName + actual.number,
          showtime: st.day + 'T' + st.startTime + '+07:00',
          price: st.rPrice + actual.sPrice,
        };
      });
      const addons = (payload.addons || []).map((item) => {
        const p = products().find((p) => productKey(p) === productKey(item));
        if (
          !p ||
          productStatus(p, now()) !== 'ACTIVE' ||
          !Number.isInteger(item.quantity) ||
          item.quantity < 1 ||
          item.quantity > stock(p)
        )
          fail('Sản phẩm không khả dụng hoặc vượt tồn kho.', 409);
        return {
          productId: p.productId,
          itemType: p.itemType,
          pName: p.pName || p.merchName,
          quantity: item.quantity,
          price: p.price,
        };
      });
      if (new Set(addons.map(productKey)).size !== addons.length) fail('Sản phẩm bị trùng.');
      const originalTotal =
        tickets.reduce((v, t) => v + t.price, 0) +
        addons.reduce((v, p) => v + p.quantity * p.price, 0);
      const coupon = payload.couponId ? find(db.coupons, 'couponId', payload.couponId) : null,
        discountAmount = coupon ? couponDiscount(coupon, originalTotal, now()) : 0;
      if (coupon && !discountAmount) fail('Voucher không đủ điều kiện.', 409);
      const row = {
        orderId: id(db.orders),
        userId: a.userId,
        source: 'CUSTOMER',
        branchId: st.branchId,
        timeId: st.timeId,
        idempotencyKey: payload.idempotencyKey,
        orderStatus: 'AWAITING_PAYMENT',
        orderTime: new Date(now()).toISOString(),
        expiresAt: h.expiresAt,
        total: originalTotal - discountAmount,
        originalTotal,
        discountAmount,
        paymentMethod: 'DEMO',
        ticketDetails: tickets,
        addonDetails: addons,
      };
      db.orders.unshift(row);
      db.holds = db.holds.filter((x) => x !== h);
      save();
      return row;
    }
    if (/^\/customer\/orders\/\d+(\/payment)?$/.test(p)) {
      const a = user(),
        o = find(db.orders, 'orderId', p.split('/')[3]);
      if (o.userId !== a.userId) fail('Không có quyền truy cập.', 403);
      if (p.endsWith('/payment')) {
        if (o.orderStatus !== 'AWAITING_PAYMENT') fail('Đơn không còn chờ thanh toán.', 409);
        return {
          demo: true,
          orderId: o.orderId,
          message: 'Mô phỏng: không thu tiền và không xác nhận PAID.',
        };
      }
      save();
      return o;
    }
    fail('Endpoint chưa được hỗ trợ trong Mock Mode.', 404);
  }
  return { request, db, seatMap };
}
let instance;
export function mockRequest(method, url, data) {
  instance ??= createRepository({
    storage: typeof sessionStorage !== 'undefined' ? sessionStorage : null,
  });
  return instance.request(method, url, data);
}

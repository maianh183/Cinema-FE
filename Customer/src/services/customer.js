import { contactRequest, contactReceipt, contactError } from '../lib/contact.js';
import { request, list, USE_MOCK, setCsrf } from './api.js';
import { validateComment, validateReview } from '../lib/business.js';
import {
  pick,
  numericId,
  routeId,
  publicDto,
  publicCoupons,
  customerFromResponse,
  profileRequest,
  reportRequest,
  reportResponse,
  orderRequest,
  orderResponse,
  paymentResponse,
  reservationResponse,
  paymentHistory,
} from './adapters.js';
const publicList = async (url, type, scope = {}) =>
  (await list(url)).map((row) => publicDto(type, row, scope));
const published = async (type) =>
  (await list(`/public/${type}`))
    .filter((row) => row.status === 'PUBLISHED')
    .map((row) => publicDto(type, row));
export const catalogService = {
  movies: () => publicList('/public/movies', 'movie'),
  movie: async (slug) =>
    publicDto('movie', await request('GET', '/public/movies/slug/' + encodeURIComponent(slug)), {
      slug,
    }),
  branches: () => publicList('/public/branches', 'branch'),
  rooms: (id) =>
    publicList(`/public/branches/${routeId(id)}/rooms`, 'room', {
      branchId: routeId(id),
    }),
  showtimes: (params = {}) => {
    const scope = Object.fromEntries(
      Object.entries(pick(params, 'movieId branchId')).map(([key, value]) => [
        key,
        routeId(value, key),
      ]),
    );
    return publicList('/public/showtimes?' + new URLSearchParams(scope), 'showtime', scope);
  },
  products: () => publicList('/public/products', 'product'),
  coupons: async () => publicCoupons(await list('/public/coupons')),
  faq: () => published('faq'),
  news: () => published('news'),
};
export const movieCommentService = {
  list: (id) =>
    list(`/public/movies/${routeId(id)}/comments`).then((rows) =>
      rows
        .filter((r) => r.movieId === routeId(id) && r.contentStatus === 'VISIBLE')
        .map((r) => publicDto('comment', r)),
    ),
  create: async (body) => {
    numericId(body.movieId, 'movieId');
    return publicDto('comment', await request('POST', '/movie-comments', validateComment(body)), {
      movieId: body.movieId,
    });
  },
};
export const cinemaReviewService = {
  list: (id) =>
    list(`/public/branches/${routeId(id)}/reviews`).then((rows) =>
      rows
        .filter((r) => r.branchId === routeId(id) && r.contentStatus === 'VISIBLE')
        .map((r) => publicDto('review', r)),
    ),
  create: async (body, rooms) => {
    numericId(body.branchId, 'branchId');
    if (body.roomId != null) numericId(body.roomId, 'roomId');
    const data = validateReview(body, rooms);
    return publicDto('review', await request('POST', '/cinema-reviews', data), {
      branchId: data.branchId,
      roomId: data.roomId,
    });
  },
};
export const commentReportService = {
  create: async (values) => {
    const body = reportRequest(values);
    return reportResponse(await request('POST', '/comment-reports', body), body);
  },
};
export const seatReservationService = {
  showtime: async (id) =>
    publicDto('showtime', await request('GET', `/public/showtimes/${routeId(id)}`), {
      timeId: routeId(id),
    }),
  seats: async (id) => {
    const rows = await list(`/public/showtimes/${routeId(id)}/seats`);
    if (
      rows.some(
        (s) =>
          typeof s.isBooked !== 'boolean' ||
          typeof s.sStatus !== 'boolean' ||
          !['FREE', 'OWN', 'OTHER'].includes(s.holdStatus) ||
          !Number.isFinite(s.sPrice),
      )
    )
      throw Error('Máy chủ chưa trả trạng thái ghế đầy đủ theo suất chiếu.');
    return rows.map((row) => publicDto('seat', row));
  },
  hold: async (timeId, seats) =>
    reservationResponse(
      await request('POST', '/seat-reservations', {
        timeId: numericId(timeId, 'timeId'),
        seats: seats.map(({ sRow, sColumn }) => ({
          sRow: numericId(sRow, 'sRow'),
          sColumn: numericId(sColumn, 'sColumn'),
        })),
      }),
      { timeId },
    ),
  get: async (id) =>
    reservationResponse(await request('GET', '/seat-reservations/' + encodeURIComponent(id)), {
      reservationId: id,
    }),
  release: (id) => request('DELETE', '/seat-reservations/' + encodeURIComponent(id)),
};
export const checkoutService = {
  create: async (body) =>
    orderResponse(await request('POST', '/customer/orders', orderRequest(body)), undefined, {
      source: 'CUSTOMER',
    }),
  order: async (id) => {
    const order = await request('GET', '/customer/orders/' + routeId(id));
    if (String(order?.orderId) !== String(id)) throw Error('Máy chủ trả sai mã đơn hàng.');
    return orderResponse(order, routeId(id));
  },
  payment: async (id) =>
    paymentResponse(await request('POST', `/customer/orders/${routeId(id)}/payment`, {}), {
      mock: USE_MOCK,
    }),
  orders: async () => (await list('/customer/orders')).map((row) => orderResponse(row)),
  payments: async () => (await list('/customer/payments')).map(paymentHistory),
};
let currentProfile = null;
const clearProfile = () => {
  currentProfile = null;
};
if (typeof window !== 'undefined') {
  window.addEventListener('cms:session-expired', clearProfile);
  window.addEventListener('cms:logout', clearProfile);
}
const acceptProfile = (data, previous = null) => {
  const profile = customerFromResponse(data, previous);
  currentProfile = profile;
  setCsrf(profile.csrfToken);
  return profile;
};
export const authService = {
  me: async () => acceptProfile(await request('GET', '/auth/me')),
  login: async (body) =>
    acceptProfile(
      await request('POST', '/auth/login', {
        ...pick(body, 'email password'),
        provider: 'LOCAL',
      }),
    ),
  register: async (body) =>
    acceptProfile(
      await request('POST', '/auth/register', {
        ...profileRequest(body, { mock: USE_MOCK }),
        ...pick(body, 'email password'),
      }),
    ),
  logout: async () => {
    const result = await request('POST', '/auth/logout', {});
    if (result?.loggedOut !== true) throw Error('Máy chủ chưa xác nhận đăng xuất.');
    clearProfile();
    setCsrf(null);
    return result;
  },
  profile: async (body) =>
    acceptProfile(
      await request(
        'PUT',
        '/customers/me',
        profileRequest(body, { mock: USE_MOCK, previous: currentProfile }),
      ),
      currentProfile,
    ),
  password: (body) =>
    request('POST', '/auth/change-password', pick(body, 'oldPassword newPassword')),
  forgot: (email) => request('POST', '/auth/forgot-password', { email }),
  reset: (body) => request('POST', '/auth/reset-password', pick(body, 'token newPassword')),
  avatar: async (file) => {
    if (
      !['image/jpeg', 'image/png', 'image/webp'].includes(file.type) ||
      file.size > 5 * 1024 * 1024
    )
      throw Error('Chọn ảnh JPG, PNG hoặc WebP tối đa 5 MB.');
    if (USE_MOCK) {
      const avatarUrl = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      return acceptProfile(
        await request('POST', '/customers/me/avatar', { avatarUrl }),
        currentProfile,
      );
    }
    const form = new FormData();
    form.append('file', file);
    return acceptProfile(await request('POST', '/customers/me/avatar', form), currentProfile);
  },
};
export const contactService = {
  send: async (body) => {
    const payload = contactRequest(body);
    try {
      return contactReceipt(await request('POST', '/contacts', payload));
    } catch (error) {
      throw Object.assign(new Error(contactError(error)), {
        status: error.status,
      });
    }
  },
};

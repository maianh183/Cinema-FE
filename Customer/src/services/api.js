import axios from 'axios';
import { responseData } from './adapters.js';
export const USE_MOCK = __CMS_MOCK__;
export const RECOVERY_ENABLED = import.meta.env.VITE_PASSWORD_RECOVERY === 'true';
let csrfToken = null;
let csrfRequest = null;
export const setCsrf = (value) => {
  csrfToken = value || null;
};
const http = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  withCredentials: true,
  timeout: 15000,
});
const messages = {
  401: 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.',
  403: 'Bạn không có quyền thực hiện thao tác này.',
  409: 'Dữ liệu đã thay đổi. Vui lòng tải lại và thử lại.',
  422: 'Dữ liệu chưa hợp lệ. Vui lòng kiểm tra biểu mẫu.',
};
export async function request(method, url, data, options = {}) {
  try {
    let result;
    if (__CMS_MOCK__) {
      const { mockRequest } = await import('../mocks/repository.js');
      result = responseData({ success: true, data: await mockRequest(method, url, data) }, options);
    } else {
      if (method !== 'GET' && !csrfToken) {
        csrfRequest ??= http
          .get('/auth/csrf')
          .then((r) => {
            if (r.data?.success !== true || !r.data?.data?.csrfToken)
              throw Error('Máy chủ chưa cấp token CSRF.');
            csrfToken = r.data.data.csrfToken;
          })
          .finally(() => {
            csrfRequest = null;
          });
        await csrfRequest;
      }
      const response = await http.request({
        method,
        url,
        data,
        headers: method === 'GET' ? {} : { 'X-CSRF-Token': csrfToken },
      });
      result = responseData(response.data, options);
    }
    if (result?.csrfToken) setCsrf(result.csrfToken);
    return result;
  } catch (error) {
    const status = error.response?.status || error.status;
    if (status === 401 && !url.startsWith('/auth/login')) {
      setCsrf(null);
      window.dispatchEvent(new Event('cms:session-expired'));
    }
    throw Object.assign(
      new Error(
        error.response?.data?.message ||
          messages[status] ||
          error.message ||
          'Không thể kết nối máy chủ.',
      ),
      {
        status,
        code: error.code,
        errors: error.response?.data?.errors ?? error.errors,
      },
    );
  }
}
export async function list(url) {
  return request('GET', url, undefined, { list: true });
}

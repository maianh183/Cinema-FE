import axios from 'axios';
import { validateMutation } from '@/utils/requestValidation';
import { useAuthStore } from '@/stores/authStore';
import {fullList} from '@/utils/apiContract';
export const USE_MOCK = import.meta.env.VITE_USE_MOCK === 'true';
export const AUTH_REFRESH_ENABLED = import.meta.env.VITE_AUTH_REFRESH === 'true';
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';
const api = axios.create({ baseURL: API_BASE_URL, withCredentials: true, timeout: 20000 });
if (USE_MOCK) {
  const { mockAdapter } = await import('../mocks/adapter.js');
  api.defaults.adapter = mockAdapter;
}
let refreshPromise;
let csrfRequest;
async function ensureCsrf(version) {
  if(useAuthStore.getState().csrfToken)return;
  if(!csrfRequest||csrfRequest.version!==version) {
    const pending={version};
    pending.promise=api.get('/auth/csrf').then(({data})=>{
      if(typeof data?.csrfToken!=='string'||!data.csrfToken.trim())throw new Error('API chưa cấp token CSRF.');
      if(version!==useAuthStore.getState().sessionVersion)throw new Error('Phiên đã thay đổi.');
      useAuthStore.getState().setTokens(useAuthStore.getState().accessToken,data.csrfToken);
    }).finally(()=>{if(csrfRequest===pending)csrfRequest=null;});
    csrfRequest=pending;
  }
  await csrfRequest.promise;
}
const pendingMutations = new Set();
export function normalizeResponse(response) {
  const body = response.data;
  if (body && typeof body === 'object' && body.success === false) {
    const error = new Error(body.message || 'Yêu cầu thất bại.');
    error.response = { ...response, status: body.status || 422 }; error.config = response.config;
    throw error;
  }
  if (body && typeof body === 'object' && 'success' in body && 'data' in body) {
    response.pagination = body.meta || body.pagination; response.data = body.data;
  }
  return response;
}
api.interceptors.request.use(async config => {
  validateMutation(config.url, config.method, config.data);
  const {sessionVersion}=useAuthStore.getState();
  config._sessionVersion ??= sessionVersion;
  if(!['get','head','options'].includes(config.method))await ensureCsrf(sessionVersion);
  if(config._sessionVersion!==useAuthStore.getState().sessionVersion)throw new Error('Phiên đã thay đổi. Vui lòng tải lại.');
  const { accessToken, csrfToken } = useAuthStore.getState();
  if (accessToken) config.headers.Authorization = 'Bearer ' + accessToken;
  if (csrfToken && config.method !== 'get') config.headers['X-CSRF-Token'] = csrfToken;
  if (!['get','head','options'].includes(config.method) && !config._retry) {
    const key = sessionVersion + ':' + config.method + ':' + config.url + ':' + (config.data instanceof FormData ? 'upload' : JSON.stringify(config.data));
    if (pendingMutations.has(key)) throw new Error('Yêu cầu đang được xử lý. Vui lòng chờ.');
    pendingMutations.add(key); config._pendingKey = key;
  }
  // Branch is a filter only. PHP must authorize every resource using the session.
  return config;
});
api.interceptors.response.use(response => {
  if (response.config._pendingKey) pendingMutations.delete(response.config._pendingKey);
  if (response.config._sessionVersion !== useAuthStore.getState().sessionVersion) throw new Error('Phiên đã thay đổi. Vui lòng tải lại.');
  return normalizeResponse(response);
}, async error => {
  const config = error.config;
  if (config?._pendingKey) pendingMutations.delete(config._pendingKey);
  const status = error.response?.status;
  const authEndpoint = /\/auth\/(login|refresh|logout|me)/.test(config?.url || '');
  if (status === 401 && config && !authEndpoint && !config._retry && !USE_MOCK && AUTH_REFRESH_ENABLED) {
    config._retry = true;
    try {
      refreshPromise ||= axios.post(API_BASE_URL + '/auth/refresh', {}, { withCredentials:true, headers: { 'X-CSRF-Token': useAuthStore.getState().csrfToken || '' } }).then(normalizeResponse).finally(() => { refreshPromise = null; });
      const { data } = await refreshPromise;
      if (config._sessionVersion !== useAuthStore.getState().sessionVersion) throw new Error('Phiên đã thay đổi.');
      useAuthStore.getState().setTokens(data.accessToken, data.csrfToken);
      if (data.user) useAuthStore.getState().setUser(data.user);
      return api(config);
    } catch { useAuthStore.getState().logout(true); }
  } else if (status === 401 && !/\/auth\/login/.test(config?.url || '')) {
    useAuthStore.getState().logout(true);
  }
  error.message = status === 403 ? 'Bạn không có quyền thực hiện thao tác này.' : error.response?.data?.message || (error.code === 'ECONNABORTED' ? 'Máy chủ phản hồi quá lâu. Vui lòng thử lại.' : error.message || 'Không thể kết nối máy chủ.');
  return Promise.reject(error);
});
// No response cache: prevents stale writes and cross-session/scope data leakage.
export async function getFullList(url,config) {return fullList(await api.get(url,config));}
export default api;


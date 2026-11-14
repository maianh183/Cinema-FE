import { numericId } from '../services/adapters.js';

export function contactRequest(input) {
  const fields = {
    fullName: [100, 'Họ tên'],
    email: [200, 'Email'],
    phone: [20, 'Số điện thoại'],
    subject: [150, 'Chủ đề'],
    content: [5000, 'Nội dung'],
  };
  const body = {};
  for (const [key, [max, label]] of Object.entries(fields)) {
    const value = input?.[key];
    if (typeof value !== 'string' || !value.trim())
      throw Error(`${label}: vui lòng nhập thông tin, không chỉ khoảng trắng.`);
    if (value.trim().length > max) throw Error(`${label}: tối đa ${max} ký tự.`);
    body[key] = value.trim();
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email)) throw Error('Email chưa hợp lệ.');
  if (!/^\+?[0-9]{8,15}$/.test(body.phone))
    throw Error('Số điện thoại cần 8–15 chữ số, có thể bắt đầu bằng +.');
  return body;
}
export function contactReceipt(result) {
  if (result?.received !== true) throw Error('Máy chủ chưa xác nhận đã nhận liên hệ.');
  numericId(result.id, 'contact.id');
  return { id: result.id, received: true };
}
export function contactError(error) {
  if (error.status === 429)
    return 'Bạn đã gửi quá nhiều yêu cầu. Vui lòng chờ một lúc rồi thử lại; thông tin vẫn được giữ trong biểu mẫu.';
  if (['ERR_NETWORK', 'ECONNABORTED', 'ETIMEDOUT'].includes(error.code))
    return 'Chưa nhận được xác nhận từ máy chủ. Kiểm tra kết nối và thử lại; thông tin vẫn được giữ trong biểu mẫu.';
  if ([400, 422].includes(error.status)) {
    const messages = Object.values(error.errors || {})
      .flat()
      .filter((v) => typeof v === 'string');
    return [error.message || 'Dữ liệu chưa hợp lệ. Vui lòng kiểm tra biểu mẫu.', ...messages].join(
      ' ',
    );
  }
  return error.message || 'Chưa thể gửi liên hệ. Vui lòng thử lại.';
}

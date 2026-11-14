export const contactStatuses = {
  UNREAD: 'Chưa đọc',
  READ: 'Đã đọc',
  REPLIED: 'Đã phản hồi (thủ công)',
};
export function validateContactStatus(body) {
  if (!body || Object.keys(body).length !== 1 || !Object.hasOwn(contactStatuses, body.status))
    throw new Error('Trạng thái liên hệ không hợp lệ.');
  return body;
}
export function validateContactSubmission(data) {
  const fields = { fullName: 160, email: 254, phone: 30, subject: 250, content: 5000 };
  if (!data || typeof data !== 'object' || Object.keys(data).some((k) => !Object.hasOwn(fields, k)))
    throw new Error('Payload liên hệ không hợp lệ.');
  for (const [key, max] of Object.entries(fields))
    if (
      typeof data[key] !== 'string' ||
      data[key].length > max ||
      (key !== 'phone' && !data[key].trim())
    )
      throw new Error('Thông tin liên hệ thiếu hoặc vượt độ dài: ' + key);
  if (
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email) ||
    (data.phone && !/^[+\d\s().-]{6,30}$/.test(data.phone))
  )
    throw new Error('Email hoặc điện thoại không hợp lệ.');
  return { ...data };
}
export function contactDto(data, id) {
  if (
    !data ||
    !Number.isSafeInteger(data.id) ||
    data.id < 1 ||
    (id != null && String(data.id) !== String(id)) ||
    !Object.hasOwn(contactStatuses, data.status) ||
    !Number.isFinite(Date.parse(data.createdAt))
  )
    throw new Error('API trả liên hệ không đúng hợp đồng.');
  for (const key of ['fullName', 'email', 'phone', 'subject', 'content'])
    if (typeof data[key] !== 'string') throw new Error('API thiếu trường liên hệ: ' + key);
  return data;
}

export const CUSTOMER_PROFILE_FIELDS = ['cName', 'phoneNumber', 'sex'];

export function validateCustomerProfile(data) {
  if (!data || typeof data !== 'object' || Array.isArray(data))
    throw new Error('Hồ sơ khách hàng không hợp lệ.');
  if (Object.keys(data).some((key) => !CUSTOMER_PROFILE_FIELDS.includes(key)))
    throw new Error('Chỉ được chỉnh sửa họ tên, số điện thoại và giới tính.');
  const errors = {};
  if (typeof data.cName !== 'string' || !data.cName.trim() || data.cName.trim().length > 100)
    errors.cName = 'Họ tên cần từ 1 đến 100 ký tự.';
  if (typeof data.phoneNumber !== 'string' || !/^\+?\d{8,15}$/.test(data.phoneNumber.trim()))
    errors.phoneNumber = 'Số điện thoại cần 8–15 chữ số, có thể bắt đầu bằng +.';
  if (!['M', 'F'].includes(data.sex)) errors.sex = 'Vui lòng chọn giới tính hợp lệ.';
  if (Object.keys(errors).length)
    throw Object.assign(new Error('Vui lòng kiểm tra thông tin hồ sơ.'), { errors });
  return { cName: data.cName.trim(), phoneNumber: data.phoneNumber.trim(), sex: data.sex };
}

export function customerProfileDto(data, expectedId) {
  if (!data || data.cUserId !== expectedId || typeof data.email !== 'string' || !data.email.trim())
    throw new Error('Máy chủ chưa xác nhận hồ sơ đúng khách hàng.');
  validateCustomerProfile(
    Object.fromEntries(CUSTOMER_PROFILE_FIELDS.map((key) => [key, data[key]])),
  );
  const fields = [
    'cUserId',
    ...CUSTOMER_PROFILE_FIELDS,
    'email',
    'isActive',
    'membershipTier',
    'totalPoints',
    'createdAt',
    'updatedAt',
    'birthday',
  ];
  return Object.fromEntries(
    fields.filter((key) => Object.hasOwn(data, key)).map((key) => [key, data[key]]),
  );
}

// Never expose arbitrary response bodies/messages: they may contain internal auth details.
export function customerAccountError(error) {
  const status = error.response?.status || error.status;
  const messages = {
    400: 'Yêu cầu không hợp lệ. Vui lòng kiểm tra thông tin.',
    401: 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.',
    403: 'Bạn không có quyền thực hiện thao tác này.',
    404: 'Không tìm thấy khách hàng hoặc dịch vụ chưa được triển khai.',
    409: 'Dữ liệu hoặc trạng thái tài khoản có xung đột. Vui lòng tải lại và kiểm tra.',
    422: 'Dữ liệu chưa hợp lệ. Vui lòng kiểm tra biểu mẫu.',
    429: 'Yêu cầu quá thường xuyên. Vui lòng chờ trước khi thử lại.',
    501: 'Dịch vụ chưa được máy chủ hỗ trợ.',
  };
  return Object.assign(
    new Error(
      messages[status] ||
        (status >= 500
          ? 'Máy chủ gặp lỗi. Vui lòng thử lại sau.'
          : error.response
            ? 'Phản hồi máy chủ không hợp lệ. Chưa thể xác nhận thành công.'
            : 'Không thể kết nối máy chủ. Vui lòng kiểm tra kết nối và thử lại.'),
    ),
    { status },
  );
}

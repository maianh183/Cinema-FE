// Shared editorial proposal. These fields never edit catalog/room/ticket prices.
export const siteSections = {
  global: {
    label: 'Thông tin doanh nghiệp',
    description: 'Thông tin dùng chung trên website.',
    fields: {
      companyName: ['Tên doanh nghiệp', 160, true],
      tagline: ['Khẩu hiệu', 250],
      logoUrl: ['Logo', 2048, false, 'image'],
      contactEmail: ['Email liên hệ', 254, true, 'email'],
      hotline: ['Hotline', 30, true, 'phone'],
      address: ['Địa chỉ', 500, true],
      facebookUrl: ['Facebook', 2048, false, 'url'],
    },
  },
  home: {
    label: 'Trang chủ',
    description: 'Nội dung biên tập; không thay thế danh sách phim động.',
    fields: {
      headline: ['Tiêu đề chính', 200, true],
      subheadline: ['Mô tả ngắn', 1000, false, 'textarea'],
      heroImageUrl: ['Ảnh trang chủ', 2048, false, 'image'],
    },
  },
  about: {
    label: 'Giới thiệu',
    description: 'Giới thiệu doanh nghiệp và định hướng.',
    fields: {
      title: ['Tiêu đề', 200, true],
      introduction: ['Giới thiệu', 4000, false, 'textarea'],
      vision: ['Tầm nhìn', 4000, false, 'textarea'],
      mission: ['Sứ mệnh', 4000, false, 'textarea'],
      values: ['Giá trị', 4000, false, 'textarea'],
    },
  },
  services: {
    label: 'Dịch vụ',
    description: 'Mô tả biên tập; không thay đổi catalog phòng/dịch vụ.',
    fields: {
      title: ['Tiêu đề', 200, true],
      introduction: ['Giới thiệu', 4000, false, 'textarea'],
    },
  },
  pricing: {
    label: 'Bảng giá',
    description: 'Chỉ sửa lời giới thiệu; giá vé vẫn lấy từ phòng, ghế và quy tắc giá.',
    fields: {
      title: ['Tiêu đề', 200, true],
      introduction: ['Giới thiệu', 4000, false, 'textarea'],
      disclaimer: ['Lưu ý giá', 2000, false, 'textarea'],
    },
  },
  contact: {
    label: 'Liên hệ',
    description: 'Email, hotline và địa chỉ sử dụng thông tin doanh nghiệp.',
    fields: {
      title: ['Tiêu đề', 200, true],
      introduction: ['Giới thiệu', 4000, false, 'textarea'],
      workingHours: ['Giờ làm việc', 500],
      mapUrl: ['Liên kết bản đồ', 2048, false, 'url'],
    },
  },
};
export function safeHttps(value) {
  try {
    const u = new URL(value);
    return u.protocol === 'https:' && !u.username && !u.password && !/[\s<>\\]/.test(value);
  } catch {
    return false;
  }
}
export function validContentImage(value, allowMockImages = false) {
  return (
    !value ||
    /^\/(?!\/)[^\s<>\\]*$/.test(value) ||
    safeHttps(value) ||
    (allowMockImages && /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(value))
  );
}
export function validateSection(
  section,
  data,
  { allowMockImages = false, allowEmpty = false } = {},
) {
  const schema = siteSections[section];
  if (!schema) throw new Error('Section nội dung không hợp lệ.');
  if (!data || typeof data !== 'object' || Array.isArray(data))
    throw new Error('Nội dung section phải là đối tượng.');
  const errors = {};
  if (Object.keys(data).some((key) => !Object.hasOwn(schema.fields, key)))
    errors.section = 'Section chứa trường ngoài hợp đồng.';
  for (const [key, [label, max, required, type]] of Object.entries(schema.fields)) {
    const value = data[key];
    if (typeof value !== 'string') errors[key] = label + ' phải là chuỗi.';
    else if (required && !allowEmpty && !value.trim())
      errors[key] = 'Vui lòng nhập ' + label.toLowerCase() + '.';
    else if (value.length > (type === 'image' && allowMockImages ? 7 * 1024 * 1024 : max))
      errors[key] = label + ': tối đa ' + max + ' ký tự.';
    else if (
      /[<>]/.test(value) ||
      Array.from(value).some((c) => c.charCodeAt(0) < 32 && !['\n', '\r', '\t'].includes(c))
    )
      errors[key] = 'Chỉ nhập văn bản thuần, không HTML/script.';
    else if (value && type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value))
      errors[key] = 'Email không hợp lệ.';
    else if (value && type === 'phone' && !/^[+\d\s().-]{6,30}$/.test(value))
      errors[key] = 'Hotline không hợp lệ.';
    else if (value && type === 'url' && !safeHttps(value))
      errors[key] = 'Chỉ dùng liên kết HTTPS an toàn.';
    else if (type === 'image' && !validContentImage(value, allowMockImages))
      errors[key] = 'Ảnh phải do hệ thống upload trả về URL an toàn.';
  }
  if (Object.keys(errors).length)
    throw Object.assign(new Error(Object.values(errors)[0]), { errors });
  return Object.fromEntries(Object.keys(schema.fields).map((key) => [key, data[key]]));
}
export function siteContentDto(data, options = {}) {
  if (!data || typeof data !== 'object') throw new Error('API chưa trả nội dung website.');
  return Object.fromEntries(
    Object.keys(siteSections).map((section) => [
      section,
      validateSection(section, data[section], { ...options, allowEmpty: true }),
    ]),
  );
}

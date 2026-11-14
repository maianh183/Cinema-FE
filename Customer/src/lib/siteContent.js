// Public editorial fields only. Prices and catalog data never enter this DTO.
export const siteContentSchema = {
  global: {
    companyName: 160,
    tagline: 250,
    logoUrl: 2048,
    contactEmail: 254,
    hotline: 30,
    address: 500,
    facebookUrl: 2048,
  },
  home: { headline: 200, subheadline: 1000, heroImageUrl: 2048 },
  about: {
    title: 200,
    introduction: 4000,
    vision: 4000,
    mission: 4000,
    values: 4000,
  },
  services: { title: 200, introduction: 4000 },
  pricing: { title: 200, introduction: 4000, disclaimer: 2000 },
  contact: { title: 200, introduction: 4000, workingHours: 500, mapUrl: 2048 },
};
export const defaultSiteContent = {
  global: {
    companyName: 'CMS Cinema',
    tagline: 'Một điểm hẹn cho những người yêu điện ảnh.',
    logoUrl: '',
    contactEmail: '',
    hotline: '',
    address: '',
    facebookUrl: '',
  },
  home: {
    headline: 'Điểm hẹn điện ảnh',
    subheadline: 'Khám phá phim, lịch chiếu và dịch vụ tại CMS Cinema.',
    heroImageUrl: '',
  },
  about: {
    title: 'Về CMS Cinema',
    introduction:
      'CMS Cinema kết nối khán giả với phim và lịch chiếu tại các cơ sở trong hệ thống. Bạn có thể tìm phim, chọn rạp, đặt vé và chia sẻ trải nghiệm trên cùng một website.',
    vision: 'Xây dựng trải nghiệm tìm kiếm và đặt vé thuận tiện, dễ tiếp cận.',
    mission:
      'Giúp khán giả lựa chọn buổi xem phim phù hợp và duy trì kênh tiếp nhận phản hồi rõ ràng.',
    values: 'Thông tin minh bạch, tôn trọng khán giả và lắng nghe trải nghiệm tại từng cơ sở.',
  },
  services: {
    title: 'Dịch vụ & trải nghiệm',
    introduction: 'Khám phá các loại phòng chiếu và sản phẩm trong hệ thống.',
  },
  pricing: {
    title: 'Bảng giá',
    introduction: 'Giá cơ bản theo phòng.',
    disclaimer: 'Phụ thu từng ghế hiển thị khi chọn suất; tổng tiền được xác nhận ở checkout.',
  },
  contact: {
    title: 'Liên hệ',
    introduction: 'Gửi thắc mắc hoặc góp ý để chúng tôi hỗ trợ bạn.',
    workingHours: '',
    mapUrl: '',
  },
};

export function safeContentUrl(value, image = false) {
  if (typeof value !== 'string' || !value || value !== value.trim() || /[\\\s<>]/u.test(value))
    return false;
  if (image && value.startsWith('/') && !value.startsWith('//')) return true;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && !!url.hostname && !url.username && !url.password;
  } catch {
    return false;
  }
}

export function adaptSiteContent(input) {
  const data = {},
    fallbackSections = [];
  for (const [section, fields] of Object.entries(siteContentSchema)) {
    data[section] = {};
    const source = input?.[section];
    let fallback = !source || typeof source !== 'object' || Array.isArray(source);
    for (const [key, max] of Object.entries(fields)) {
      const value = source?.[key];
      let valid =
        typeof value === 'string' &&
        value.length <= max &&
        !/[<>]/u.test(value) &&
        !Array.from(value).some((char) => {
          const code = char.charCodeAt(0);
          return code === 127 || (code < 32 && ![9, 10, 13].includes(code));
        });
      if (valid && key.endsWith('Url') && value)
        valid = safeContentUrl(value, key === 'logoUrl' || key === 'heroImageUrl');
      if (valid && key === 'contactEmail' && value)
        valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
      if (valid && key === 'hotline' && value)
        valid = /^[+\d ().-]{6,30}$/.test(value) && /\d/.test(value);
      // Empty optional copy is intentional; empty headings must remain accessible.
      if (valid && ['companyName', 'headline', 'title'].includes(key)) valid = !!value.trim();
      data[section][key] = valid ? value.trim() : defaultSiteContent[section][key];
      fallback ||= !valid;
    }
    if (fallback) fallbackSections.push(section);
  }
  return { data, fallbackSections };
}

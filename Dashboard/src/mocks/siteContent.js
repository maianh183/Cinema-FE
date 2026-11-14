import { can } from '../utils/permissions';
import { siteSections, validateSection } from '../utils/siteContent';
import {
  validateContactSubmission,
  validateContactStatus,
  contactStatuses,
} from '../utils/contacts';
export function editorialSeed(day) {
  return {
    contacts: Array.from({ length: 24 }, (_, i) => ({
      id: i + 1,
      fullName: 'Khách Demo ' + (i + 1),
      email: 'contact' + (i + 1) + '@example.test',
      phone: '090000' + String(i + 1).padStart(4, '0'),
      subject: 'Thông tin suất chiếu ' + (i + 1),
      content: 'Tôi muốn hỏi lịch chiếu dành cho đoàn. Dữ liệu mô phỏng.',
      status: ['UNREAD', 'READ', 'REPLIED'][i % 3],
      createdAt:
        day +
        'T' +
        String(8 + Math.floor(i / 2)).padStart(2, '0') +
        ':' +
        (i % 2 ? '30' : '00') +
        ':00+07:00',
    })),
    'site-content': {
      global: {
        companyName: 'CineFlow',
        tagline: 'Không gian điện ảnh của bạn',
        logoUrl: '',
        contactEmail: 'info@example.test',
        hotline: '02812345678',
        address: '12 Nguyễn Huệ, TP. Hồ Chí Minh',
        facebookUrl: '',
      },
      home: {
        headline: 'Chào mừng đến CineFlow',
        subheadline: 'Khám phá những câu chuyện trên màn ảnh lớn.',
        heroImageUrl: '',
      },
      about: {
        title: 'Về CineFlow',
        introduction: 'Trải nghiệm điện ảnh dành cho mọi người.',
        vision: 'Kết nối cộng đồng qua điện ảnh.',
        mission: 'Mang đến trải nghiệm xem phim chất lượng.',
        values: 'Tận tâm, sáng tạo và tôn trọng.',
      },
      services: {
        title: 'Dịch vụ',
        introduction: 'Không gian chiếu phim và dịch vụ dành cho đoàn.',
      },
      pricing: {
        title: 'Bảng giá',
        introduction: 'Giá vé tùy theo suất chiếu, phòng và loại ghế.',
        disclaimer: 'Giá cuối cùng được xác nhận tại bước đặt vé.',
      },
      contact: {
        title: 'Liên hệ CineFlow',
        introduction: 'Chúng tôi sẵn sàng lắng nghe bạn.',
        workingHours: '08:00–22:00 hàng ngày',
        mapUrl: '',
      },
    },
  };
}
export function editorialApi({ db, session, resource, id, parts, method, params, body, ok, fail }) {
  const validate = (fn) => {
    try {
      return fn();
    } catch (e) {
      fail(422, e.message, e.errors);
    }
  };
  if (resource === 'public' && parts.join('/') === 'public/site-content') {
    if (method !== 'GET') fail(405, 'Chỉ đọc nội dung công khai.');
    return ok(
      Object.fromEntries(Object.keys(siteSections).map((key) => [key, db['site-content'][key]])),
    );
  }
  if (resource !== 'contacts' && resource !== 'site-content') return;
  if (resource === 'contacts' && !id && method === 'POST') {
    const input = validate(() => validateContactSubmission(body));
    const nextId = db.nextContactId++;
    db.contacts.unshift({
      ...input,
      id: nextId,
      status: 'UNREAD',
      createdAt: new Date().toISOString(),
    });
    return ok({ id: nextId, received: true }, 201);
  }
  if (!session) fail(401, 'Cần đăng nhập nhân sự.');
  const module = resource === 'contacts' ? 'contacts' : 'website-content',
    action = method === 'GET' ? 'read' : method === 'DELETE' ? 'delete' : 'update';
  if (!can(session, module, action)) fail(403, 'Không có quyền quản trị nội dung/liên hệ.');
  if (resource === 'site-content') {
    if (method === 'GET' && !id) return ok(db['site-content']);
    if (method !== 'PUT' || parts.length !== 2 || !Object.hasOwn(siteSections, id))
      fail(405, 'Section hoặc phương thức không được hỗ trợ.');
    const section = validate(() => validateSection(id, body, { allowMockImages: true }));
    // Mock upload URLs must refer to an existing uploaded image or the saved image.
    for (const key of ['logoUrl', 'heroImageUrl'])
      if (
        section[key] &&
        section[key] !== db['site-content'][id][key] &&
        !db.media.some((item) => item.url === section[key])
      )
        fail(422, 'Chọn ảnh từ upload hiện hữu.');
    db['site-content'][id] = section;
    db['site-content'].updatedAt = new Date().toISOString();
    db['site-content'].updatedBy = session.id;
    return ok(section);
  }
  if (params.branchId || params.employeeId)
    fail(422, 'Liên hệ toàn hệ thống chỉ dành cho ADMIN, không có bộ lọc chi nhánh.');
  const target = db.contacts.find((row) => String(row.id) === String(id));
  if (method === 'GET' && !id) {
    const page = Number(params.page ?? 1),
      pageSize = Number(params.pageSize ?? 10),
      q = String(params.q ?? '').toLocaleLowerCase('vi');
    if (
      !Number.isSafeInteger(page) ||
      page < 1 ||
      !Number.isSafeInteger(pageSize) ||
      pageSize < 1 ||
      pageSize > 100 ||
      q.length > 250 ||
      (params.status && !Object.hasOwn(contactStatuses, params.status))
    )
      fail(422, 'Bộ lọc hoặc phân trang không hợp lệ.');
    const rows = db.contacts
      .filter(
        (row) =>
          (!params.status || row.status === params.status) &&
          ['fullName', 'email', 'phone', 'subject'].some((key) =>
            row[key].toLocaleLowerCase('vi').includes(q),
          ),
      )
      .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt) || b.id - a.id);
    return ok(rows.slice((page - 1) * pageSize, page * pageSize), 200, {
      total: rows.length,
      page,
      pageSize,
    });
  }
  if (!target) fail(404, 'Không tìm thấy liên hệ.');
  if (method === 'GET' && parts.length === 2) return ok(target);
  if (method === 'PATCH' && parts.length === 3 && parts[2] === 'status') {
    validate(() => validateContactStatus(body));
    target.status = body.status;
    if (body.status === 'READ') target.readAt = new Date().toISOString();
    if (body.status === 'REPLIED') {
      target.repliedAt = new Date().toISOString();
      target.repliedBy = session.id;
    }
    return ok(target); // Manual bookkeeping only: never sends email.
  }
  if (method === 'DELETE' && parts.length === 2) {
    db.contacts = db.contacts.filter((row) => row !== target);
    return ok(null);
  }
  fail(405, 'Phương thức liên hệ không được hỗ trợ.');
}

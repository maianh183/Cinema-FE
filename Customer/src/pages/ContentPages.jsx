import { useSiteContent } from '../store/siteContentContext.js';
import { BusinessDetails } from '../components/shared/SiteContent.jsx';
import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { catalogService, contactService } from '../services/customer.js';
import { money, dateTime } from '../lib/business.js';
import {
  State,
  Page,
  Field,
  Empty,
  Pagination,
  Feedback,
  Metadata,
  useResource,
  useMutation,
} from '../components/shared/UI.jsx';
export function AboutPage() {
  const {
    content: { about },
  } = useSiteContent();
  return (
    <Page title={about.title}>
      <Metadata title={about.title} description={about.introduction} />
      <div className="panel prose plain-text">
        <h2>Điểm hẹn điện ảnh</h2>
        <p>{about.introduction}</p>
        <h2>Tầm nhìn</h2>
        <p>{about.vision}</p>
        <h2>Sứ mệnh</h2>
        <p>{about.mission}</p>
        <h2>Giá trị cốt lõi</h2>
        <p>{about.values}</p>
        <Link className="btn" to="/cinemas">
          Khám phá hệ thống rạp
        </Link>
      </div>
    </Page>
  );
}
async function branchRooms() {
  const branches = await catalogService.branches();
  const rooms = await Promise.all(branches.map((b) => catalogService.rooms(b.branchId)));
  return { branches, rooms: rooms.flat() };
}
export function ServicesPage() {
  const {
    content: { services },
  } = useSiteContent();
  const resource = useResource(branchRooms),
    [q, setQ] = useState('');
  return (
    <Page title={services.title} description={services.introduction}>
      <Metadata title={services.title} description={services.introduction} />
      <Field label="Tìm loại phòng" value={q} onChange={(e) => setQ(e.target.value)} />
      <State resource={resource}>
        <div className="card-grid">
          {[...new Set(resource.data?.rooms.map((r) => r.rType) || [])]
            .filter((t) => t.toLowerCase().includes(q.toLowerCase()))
            .map((type) => (
              <article className="panel" key={type}>
                <p className="eyebrow">Trải nghiệm điện ảnh</p>
                <h2>Phòng {type}</h2>
                <p>Tra cứu lịch chiếu và cơ sở có phòng {type}.</p>
                <Link to="/cinemas" className="text-button">
                  Xem hệ thống rạp
                </Link>
              </article>
            ))}
        </div>
        {!resource.data?.rooms.some((r) => r.rType.toLowerCase().includes(q.toLowerCase())) && (
          <Empty>Chưa có loại phòng phù hợp.</Empty>
        )}
        <div className="panel">
          <h2>Đồ ăn, thức uống & quà lưu niệm</h2>
          <p>Danh mục và thời gian kinh doanh được cập nhật theo từng sản phẩm.</p>
          <Link to="/products" className="btn">
            Xem sản phẩm
          </Link>
        </div>
      </State>
    </Page>
  );
}
export function PricingPage() {
  const {
    content: { pricing },
  } = useSiteContent();
  const resource = useResource(branchRooms);
  return (
    <Page title={pricing.title} description={pricing.introduction}>
      <Metadata title={pricing.title} description={pricing.introduction} />
      <p className="notice plain-text">{pricing.disclaimer}</p>
      <State resource={resource}>
        <div className="table-scroll">
          <table>
            <caption>Giá cơ bản theo phòng chiếu</caption>
            <thead>
              <tr>
                <th>Chi nhánh</th>
                <th>Phòng</th>
                <th>Loại phòng</th>
                <th>Giá cơ bản</th>
              </tr>
            </thead>
            <tbody>
              {resource.data?.rooms.map((r) => (
                <tr key={`${r.branchId}-${r.roomId}`}>
                  <td>{resource.data.branches.find((b) => b.branchId === r.branchId)?.bName}</td>
                  <td>{r.roomId}</td>
                  <td>{r.rType}</td>
                  <td>{money(r.basePrice)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Link className="btn" to="/movies">
          Chọn suất để xem giá ghế
        </Link>
      </State>
    </Page>
  );
}
export function ContactPage() {
  const {
    content: { contact, global },
  } = useSiteContent();
  const action = useMutation();
  async function submit(e) {
    e.preventDefault();
    const form = e.currentTarget,
      values = Object.fromEntries(new FormData(form));
    for (const key of Object.keys(values)) values[key] = values[key].trim();
    await action.run(async (notify) => {
      if (!values.fullName || !values.subject || !values.content)
        throw Error('Vui lòng nhập đầy đủ thông tin, không chỉ khoảng trắng.');
      const result = await contactService.send(values);
      if (!result?.received || !result.id) throw Error('Máy chủ chưa xác nhận đã nhận liên hệ.');
      notify('Đã nhận thông tin liên hệ.');
      form.reset();
    });
  }
  return (
    <Page title={contact.title} description={contact.introduction}>
      <Metadata title={contact.title} description={contact.introduction} />
      <section className="panel business-contact" aria-label="Thông tin liên hệ doanh nghiệp">
        <h2>{global.companyName}</h2>
        <BusinessDetails />
        {!global.contactEmail && !global.hotline && !global.address && (
          <p>Thông tin doanh nghiệp đang được cập nhật. Bạn vẫn có thể gửi biểu mẫu bên dưới.</p>
        )}
        {contact.workingHours && <p className="plain-text">Giờ làm việc: {contact.workingHours}</p>}
        {contact.mapUrl && (
          <a href={contact.mapUrl} target="_blank" rel="noopener noreferrer">
            Xem bản đồ vị trí doanh nghiệp
          </a>
        )}
      </section>
      <form className="panel form-width" onSubmit={submit}>
        <Field label="Họ tên" name="fullName" required maxLength={100} />
        <Field label="Email" name="email" type="email" required maxLength={200} />
        <Field
          label="Số điện thoại"
          name="phone"
          type="tel"
          required
          pattern="[+]?[0-9]{8,15}"
          maxLength={20}
        />
        <Field label="Chủ đề" name="subject" required maxLength={150} />
        <Field label="Nội dung">
          <textarea name="content" required maxLength={5000} />
        </Field>
        <Feedback action={action} />
        <button className="btn" disabled={action.busy}>
          {action.busy ? 'Đang gửi…' : 'Gửi liên hệ'}
        </button>
      </form>
    </Page>
  );
}
export function FaqPage() {
  const resource = useResource(catalogService.faq),
    [q, setQ] = useState('');
  const rows = (resource.data || [])
    .filter(
      (r) =>
        r.status === 'PUBLISHED' &&
        (r.question + ' ' + r.answer).toLowerCase().includes(q.toLowerCase()),
    )
    .sort((a, b) => a.sortOrder - b.sortOrder || a.id - b.id);
  return (
    <Page title="Câu hỏi thường gặp">
      <Metadata title="Hỏi đáp" />
      <Field label="Tìm câu hỏi" value={q} onChange={(e) => setQ(e.target.value)} />
      <State resource={resource}>
        {rows.map((r) => (
          <details className="panel" key={r.id}>
            <summary>{r.question}</summary>
            <p className="plain-text">{r.answer}</p>
          </details>
        ))}
        {!rows.length && <Empty />}
      </State>
    </Page>
  );
}
function NewsCards({ rows }) {
  return (
    <div className="card-grid">
      {rows.map((n) => (
        <Link to={'/news/' + n.slug} className="panel news-card" key={n.id}>
          {n.imageUrl && <img src={n.imageUrl} alt={n.title} loading="lazy" />}
          <p className="eyebrow">{n.category}</p>
          <h2>{n.title}</h2>
          <p className="muted">{n.metaDescription}</p>
          <small>{dateTime(n.createdAt)}</small>
        </Link>
      ))}
    </div>
  );
}
export function NewsPage() {
  const resource = useResource(catalogService.news),
    [q, setQ] = useState(''),
    [category, setCategory] = useState(''),
    [page, setPage] = useState(1);
  const all = (resource.data || []).filter((n) => n.status === 'PUBLISHED'),
    rows = all
      .filter(
        (n) =>
          (n.title + ' ' + n.content + ' ' + n.tags).toLowerCase().includes(q.toLowerCase()) &&
          (!category || n.category === category),
      )
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return (
    <Page title="Tin tức">
      <Metadata title="Tin tức" />
      <div className="filters">
        <Field
          label="Tìm tin tức"
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setPage(1);
          }}
        />
        <Field label="Danh mục">
          <select
            value={category}
            onChange={(e) => {
              setCategory(e.target.value);
              setPage(1);
            }}
          >
            <option value="">Tất cả danh mục</option>
            {[...new Set(all.map((n) => n.category))].map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </Field>
      </div>
      <State resource={resource}>
        <NewsCards rows={rows.slice((page - 1) * 4, page * 4)} />
        {!rows.length && <Empty />}
        <Pagination page={page} setPage={setPage} total={rows.length} pageSize={4} />
      </State>
    </Page>
  );
}
export function NewsDetailPage() {
  const { slug } = useParams(),
    resource = useResource(catalogService.news, slug),
    all = (resource.data || []).filter((n) => n.status === 'PUBLISHED'),
    article = all.find((n) => n.slug === slug);
  return (
    <Page title={article?.title || 'Bài viết'}>
      <State resource={resource}>
        {article ? (
          <>
            <Metadata
              title={article.seoTitle || article.title}
              description={article.metaDescription}
            />
            <article className="panel prose">
              {article.imageUrl && <img src={article.imageUrl} alt={article.title} />}
              <p className="muted">
                {article.category} · {dateTime(article.createdAt)}
              </p>
              <div className="plain-text">{article.content}</div>
              <p className="muted">{article.tags}</p>
            </article>
            <h2>Bài viết liên quan</h2>
            <NewsCards
              rows={all
                .filter((n) => n.id !== article.id && n.category === article.category)
                .slice(0, 3)}
            />
          </>
        ) : (
          <Empty>Bài viết không tồn tại hoặc chưa được công khai.</Empty>
        )}
      </State>
    </Page>
  );
}
export function LatestNews() {
  const resource = useResource(catalogService.news);
  return (
    <section className="section-pad">
      <div className="section-heading">
        <h2>Tin tức mới nhất</h2>
        <Link to="/news">Xem tất cả →</Link>
      </div>
      <State resource={resource}>
        <NewsCards
          rows={(resource.data || [])
            .filter((n) => n.status === 'PUBLISHED')
            .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
            .slice(0, 3)}
        />
      </State>
    </section>
  );
}

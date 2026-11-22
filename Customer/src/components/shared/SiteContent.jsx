import { SiteContentContext, useSiteContent } from '../../store/siteContentContext.js';
import { defaultSiteContent } from '../../lib/siteContent.js';
import { siteContentService } from '../../services/siteContentService.js';
import { useResource, Metadata } from './UI.jsx';

export function SiteContentProvider({ children }) {
  const resource = useResource(siteContentService.get);
  return (
    <SiteContentContext.Provider
      value={{
        content: resource.data?.data || defaultSiteContent,
        fallbackSections: resource.data?.fallbackSections || Object.keys(defaultSiteContent),
        loading: resource.loading,
        error: resource.error,
        reload: resource.reload,
      }}
    >
      {children}
    </SiteContentContext.Provider>
  );
}
export function ContentStatus() {
  const { loading, error, fallbackSections, reload } = useSiteContent();
  if (!loading && !error && !fallbackSections.length) return null;
  return (
    <div className="content-status muted" role="status">
      {loading
        ? 'Đang tải nội dung website…'
        : 'Một phần nội dung đang dùng bản mặc định do chưa tải được dữ liệu hợp lệ từ máy chủ.'}
      {!loading && (
        <button className="text-button" onClick={reload}>
          Tải lại nội dung
        </button>
      )}
    </div>
  );
}
export function ContentImage({ src, alt, className }) {
  return (
    <img
      key={src}
      src={src || '/placeholder-site.svg'}
      alt={alt}
      className={className}
      onError={(event) => {
        if (!event.currentTarget.src.endsWith('/placeholder-site.svg'))
          event.currentTarget.src = '/placeholder-site.svg';
      }}
    />
  );
}
export function BusinessDetails() {
  const {
    content: { global },
  } = useSiteContent();
  return (
    <address className="business-details">
      {global.hotline && (
        <p>
          Hotline: <a href={`tel:${global.hotline.replace(/[^+\d]/g, '')}`}>{global.hotline}</a>
        </p>
      )}
      {global.contactEmail && (
        <p>
          Email: <a href={`mailto:${global.contactEmail}`}>{global.contactEmail}</a>
        </p>
      )}
      {global.address && <p className="plain-text">Địa chỉ: {global.address}</p>}
      {global.facebookUrl && (
        <p>
          <a href={global.facebookUrl} target="_blank" rel="noopener noreferrer">
            Facebook của {global.companyName}
          </a>
        </p>
      )}
    </address>
  );
}
export function HomeEditorial() {
  const {
    content: { home },
  } = useSiteContent();
  return (
    <section className="section-pad home-editorial">
      <Metadata title={home.headline} description={home.subheadline} />
      <div>
        <h2>{home.headline}</h2>
        <p className="muted plain-text">{home.subheadline}</p>
      </div>
      <ContentImage src={home.heroImageUrl} alt="Không gian điện ảnh" />
    </section>
  );
}

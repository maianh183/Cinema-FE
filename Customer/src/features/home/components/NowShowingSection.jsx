import { useState } from 'react';
import { Link } from 'react-router-dom';
import { catalogService } from '../../../services/customer.js';
import { todayVN } from '../../../lib/business.js';
import MoviesCard from '../../../components/shared/MoviesCard.jsx';
import { State, Empty, useResource } from '../../../components/shared/UI.jsx';
export default function NowShowingSection() {
  const [tab, setTab] = useState('NOW_SHOWING'),
    resource = useResource(catalogService.movies),
    today = todayVN(),
    movies = (resource.data || []).filter((m) =>
      tab === 'NOW_SHOWING'
        ? m.releaseDate <= today && m.closingDate >= today
        : m.releaseDate > today,
    );
  return (
    <section className="section-pad">
      <div className="section-heading">
        <h2>{tab === 'NOW_SHOWING' ? 'PHIM ĐANG CHIẾU' : 'PHIM SẮP CHIẾU'}</h2>
        <div className="tabs">
          <button
            className={tab === 'NOW_SHOWING' ? 'active' : ''}
            aria-pressed={tab === 'NOW_SHOWING'}
            onClick={() => setTab('NOW_SHOWING')}
          >
            Đang chiếu
          </button>
          <button
            className={tab === 'COMING_SOON' ? 'active' : ''}
            aria-pressed={tab === 'COMING_SOON'}
            onClick={() => setTab('COMING_SOON')}
          >
            Sắp chiếu
          </button>
        </div>
      </div>
      <State resource={resource}>
        <div className="movie-grid">
          {movies.slice(0, 8).map((m) => (
            <MoviesCard key={m.movieId} movie={m} />
          ))}
        </div>
        {!movies.length && <Empty />}
      </State>
      <Link className="text-button" to="/movies">
        Xem tất cả phim →
      </Link>
    </section>
  );
}

import { Link } from "react-router-dom";
import { catalogService } from "../../../services/customer.js";
import { todayVN } from "../../../lib/business.js";
import { State, Empty, useResource } from "../../../components/shared/UI.jsx";
export default function HeroSection() {
  const resource = useResource(catalogService.movies),
    movie = resource.data?.find(
      (m) => m.releaseDate <= todayVN() && m.closingDate >= todayVN(),
    );
  return (
    <State resource={resource}>
      {movie ? (
        <section className="home-hero">
          <div className="home-hero-art">
            <img
              className="hero-backdrop"
              alt={movie.mName}
              src={movie.posterUrl || "/placeholder-movie.svg"}
            />
            <div className="hero-wash" />
          </div>
          <div className="home-hero-content">
            <div className="hero-meta">
              <span className="badge status-badge status-active">
                ĐANG CHIẾU
              </span>
              <span className="text-sm">
                {movie.runTime} phút · {movie.ageRating}
              </span>
            </div>
            <h1 className="hero-title">{movie.mName}</h1>
            <p className="hero-description">{movie.descript}</p>
            <div className="flex flex-wrap gap-4">
              <Link className="btn" to={"/movie/" + movie.slug}>
                Đặt vé ngay →
              </Link>
              <Link className="btn secondary" to="/movies">
                Khám phá phim
              </Link>
            </div>
          </div>
        </section>
      ) : (
        <Empty>Chưa có phim đang chiếu.</Empty>
      )}
    </State>
  );
}

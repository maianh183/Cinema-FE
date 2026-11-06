import { Link } from "react-router-dom";
import { todayVN } from "../../lib/business.js";
export default function MoviesCard({ movie }) {
  const status = movie.releaseDate <= todayVN() ? "NOW_SHOWING" : "COMING_SOON";
  return (
    <article className="movie-card">
      <div className="movie-card-poster">
        <img
          loading="lazy"
          alt={movie.mName}
          src={movie.posterUrl || "/placeholder-movie.svg"}
        />
        <span className="age-badge">{movie.ageRating}</span>
      </div>

      <div className="movie-card-content">
        <h3>{movie.mName}</h3>
        <p className="movie-card-meta">
          {movie.genres?.map((g) => g.genre || g).join(", ")}
        </p>
        <Link className="btn" to={`/movie/${movie.slug}`}>
          <span>{status === "NOW_SHOWING" ? "MUA VÉ" : "SẮP CHIẾU"}</span>
        </Link>
      </div>
    </article>
  );
}

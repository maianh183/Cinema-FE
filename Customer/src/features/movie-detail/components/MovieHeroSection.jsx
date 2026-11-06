import { Ticket } from "lucide-react";
import React, { useState } from "react";
import { Modal } from "../../../components/shared/UI.jsx";
export default function MovieHeroSection({ movie }) {
  const [showTrailer, setShowTrailer] = useState(false);
  const getEmbedUrl = (url) => {
    try {
      const u = new URL(url);
      if (!["www.youtube.com", "youtube.com", "youtu.be"].includes(u.hostname))
        return "";
      const id =
        u.hostname === "youtu.be"
          ? u.pathname.slice(1)
          : u.searchParams.get("v");
      return /^[a-zA-Z0-9_-]{11}$/.test(id || "")
        ? `https://www.youtube-nocookie.com/embed/${id}`
        : "";
    } catch {
      return "";
    }
  };
  return (
    <section className="movie-hero">
      <div className="movie-hero-art">
        <img
          alt={movie.mName}
          className="hero-backdrop"
          src={movie.posterUrl || "/placeholder-movie.svg"}
        />
        <div className="hero-wash" />
      </div>

      <div className="movie-hero-content">
        <div className="movie-hero-grid">
          <div className="movie-hero-poster">
            <div className="poster-frame">
              <img
                alt={movie.mName}
                className="w-full h-full object-cover"
                src={movie.posterUrl || "/placeholder-movie.svg"}
              />
            </div>
          </div>

          <div className="movie-hero-details">
            <div className="space-y-2">
              <div className="hero-meta">
                {movie.genres?.slice(0, 2).map((g, idx) => (
                  <React.Fragment key={idx}>
                    <span>{g.genre || g}</span>
                    {idx === 0 && movie.genres.length > 1 && (
                      <span className="w-1.5 h-1.5 rounded-full bg-surface-container-highest"></span>
                    )}
                  </React.Fragment>
                ))}
                <span className="w-1.5 h-1.5 rounded-full bg-surface-container-highest"></span>
                <span>{movie.runTime} Phút</span>
                <span className="age-badge">{movie.ageRating}</span>
              </div>
              <h1 className="hero-title">{movie.mName}</h1>
            </div>

            <div className="movie-facts">
              <div className="space-y-1">
                <p className="fact-label">Khởi chiếu</p>
                <p className="fact-value">{movie.releaseDate}</p>
              </div>
              <div className="space-y-1">
                <p className="fact-label">Diễn viên</p>
                <p className="fact-value">
                  {movie.actors?.map((a) => a.fullName || a).join(", ") ||
                    "Đang cập nhật..."}
                </p>
              </div>
              <div className="space-y-1">
                <p className="fact-label">Phiên bản</p>
                <p className="fact-value">
                  {movie.isDub ? "Lồng tiếng" : ""}{" "}
                  {movie.isSub && movie.isDub ? "|" : ""}{" "}
                  {movie.isSub ? "Phụ đề" : ""}
                </p>
              </div>
            </div>

            <div className="max-w-2xl">
              <p className="hero-description">
                {movie.descript || "Đang cập nhật mô tả phim..."}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-4 pt-4">
              <a href="#booking" className="btn">
                <Ticket size={20} aria-hidden="true" />
                Mua Vé
              </a>
              {getEmbedUrl(movie.trailerUrl) && (
                <button
                  onClick={() => setShowTrailer(true)}
                  className="btn secondary"
                >
                  Trailer
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {showTrailer && getEmbedUrl(movie.trailerUrl) && (
        <Modal title="Trailer phim" onClose={() => setShowTrailer(false)}>
          <iframe
            className="trailer"
            src={getEmbedUrl(movie.trailerUrl)}
            title={`Trailer ${movie.mName}`}
            allow="fullscreen; encrypted-media"
            allowFullScreen
          />
        </Modal>
      )}
    </section>
  );
}

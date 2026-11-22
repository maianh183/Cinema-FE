import { SiteContentProvider, HomeEditorial } from './components/shared/SiteContent.jsx';
import React, { Component, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import './app/globals.css';
import './styles.css';
import Header from './components/layout/Header.jsx';
import Footer from './components/layout/Footer.jsx';
import HeroSection from './features/home/components/HeroSection.jsx';
import NowShowingSection from './features/home/components/NowShowingSection.jsx';
import PremiumPromoSection from './features/home/components/PremiumPromoSection.jsx';
import SeatSelectionLayout from './features/booking/components/SeatSelectionLayout.jsx';
import CheckoutLayout from './features/checkout/components/CheckoutLayout.jsx';
import {
  MoviesPage,
  MoviePage,
  CinemasPage,
  ProductsPage,
  ProductPage,
  CartPage,
  PromotionsPage,
} from './pages/CatalogPages.jsx';
import {
  AboutPage,
  ServicesPage,
  PricingPage,
  ContactPage,
  FaqPage,
  NewsPage,
  NewsDetailPage,
  LatestNews,
} from './pages/ContentPages.jsx';
import {
  AuthPage,
  ProfilePage,
  HistoryPage,
  PaymentStatusPage,
  RecoveryPage,
} from './pages/AccountPages.jsx';
import { useUserStore } from './store/userStore.js';
import { Page } from './components/shared/UI.jsx';
class ErrorBoundary extends Component {
  state = { error: null };
  static getDerivedStateFromError(error) {
    return { error };
  }
  render() {
    return this.state.error ? (
      <Page title="Không thể hiển thị trang">
        <p role="alert">Đã có lỗi xảy ra. Vui lòng tải lại trang.</p>
        <button className="btn" onClick={() => window.location.reload()}>
          Tải lại
        </button>
      </Page>
    ) : (
      this.props.children
    );
  }
}
function Protected({ children }) {
  const { user, ready, error, restore } = useUserStore(),
    location = useLocation();
  if (!ready)
    return (
      <p className="notice" role="status">
        Đang kiểm tra phiên…
      </p>
    );
  if (error)
    return (
      <div role="alert" className="notice error">
        {error}
        <button className="btn" onClick={restore}>
          Thử lại
        </button>
      </div>
    );
  return user ? (
    children
  ) : (
    <Navigate
      to={'/login?next=' + encodeURIComponent(location.pathname + location.search)}
      replace
    />
  );
}
function App() {
  const location = useLocation(),
    restore = useUserStore((s) => s.restore);
  useEffect(() => {
    restore();
  }, [restore]);
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);
  return (
    <>
      <Header />
      <main id="main">
        <ErrorBoundary key={location.pathname}>
          <Routes>
            <Route
              path="/"
              element={
                <>
                  <HeroSection />
                  <HomeEditorial />
                  <NowShowingSection />
                  <PremiumPromoSection />
                  <LatestNews />
                </>
              }
            />
            <Route path="/movies" element={<MoviesPage />} />
            <Route path="/movie/:slug" element={<MoviePage />} />
            <Route path="/cinemas" element={<CinemasPage />} />
            <Route path="/about" element={<AboutPage />} />
            <Route path="/services" element={<ServicesPage />} />
            <Route path="/pricing" element={<PricingPage />} />
            <Route path="/contact" element={<ContactPage />} />
            <Route path="/faq" element={<FaqPage />} />
            <Route path="/news" element={<NewsPage />} />
            <Route path="/news/:slug" element={<NewsDetailPage />} />
            <Route path="/products" element={<ProductsPage />} />
            <Route path="/products/:id" element={<ProductPage />} />
            <Route path="/cart" element={<CartPage />} />
            <Route path="/promotions" element={<PromotionsPage />} />
            <Route path="/login" element={<AuthPage key="login" />} />
            <Route path="/register" element={<AuthPage register key="register" />} />
            <Route path="/forgot-password" element={<RecoveryPage />} />
            <Route path="/reset-password" element={<RecoveryPage reset />} />
            <Route
              path="/profile"
              element={
                <Protected>
                  <ProfilePage />
                </Protected>
              }
            />
            <Route
              path="/history"
              element={
                <Protected>
                  <HistoryPage />
                </Protected>
              }
            />
            <Route
              path="/booking/showtime/:id"
              element={
                <Protected>
                  <SeatSelectionLayout key={location.pathname} />
                </Protected>
              }
            />
            <Route
              path="/checkout"
              element={
                <Protected>
                  <CheckoutLayout />
                </Protected>
              }
            />
            <Route
              path="/checkout/status"
              element={
                <Protected>
                  <PaymentStatusPage />
                </Protected>
              }
            />
            <Route
              path="*"
              element={
                <Page title="404 · Không tìm thấy trang">
                  <a className="btn" href="/">
                    Về trang chủ
                  </a>
                </Page>
              }
            />
          </Routes>
        </ErrorBoundary>
      </main>
      <Footer />
    </>
  );
}
createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <SiteContentProvider>
        <App />
      </SiteContentProvider>
    </BrowserRouter>
  </React.StrictMode>,
);

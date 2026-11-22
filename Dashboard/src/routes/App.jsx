import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate, Link } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { can, modules } from '@/utils/permissions';
import AuthCheck from '@/components/AuthCheck';
import AppLayout from '@/layouts/AppLayout';
import Login from '@/pages/auth/Login';
import { LoadingState } from '@/components/ui/Feedback';
const Movies = lazy(() => import('@/pages/movies'));
const Showtimes = lazy(() => import('@/pages/showtimes'));
const Branches = lazy(() => import('@/pages/branches'));
const Rooms = lazy(() => import('@/pages/rooms'));
const Customers = lazy(() => import('@/pages/customers'));
const Employees = lazy(() => import('@/pages/employees'));
const Shifts = lazy(() => import('@/pages/employees/workshift'));
const Orders = lazy(() => import('@/pages/orders'));
const Products = lazy(() => import('@/pages/products'));
const Coupons = lazy(() => import('@/pages/coupons'));
const Reports = lazy(() => import('@/pages/reports_analytics'));
const CinemaReviews = lazy(() => import('@/pages/cinema-reviews'));
const Profile = lazy(() => import('@/pages/profile'));
const Resource = lazy(() => import('@/pages/content/ResourcePage'));
const CommentReports = lazy(() => import('@/pages/comment-reports'));
const Contacts = lazy(() => import('@/pages/contacts'));
const WebsiteContent = lazy(() => import('@/pages/website-content'));
function Protected({ module, children }) {
  const user = useAuthStore((s) => s.user);
  return can(user, module) ? children : <Navigate to="/403" replace />;
}
const pages = [
  ['/contacts', 'contacts', Contacts],
  ['/website-content', 'website-content', WebsiteContent],
  ['/movies', 'movies', Movies],
  ['/showtimes', 'showtimes', Showtimes],
  ['/branches', 'branches', Branches],
  ['/rooms', 'rooms', Rooms],
  ['/customers', 'customers', Customers],
  ['/employees', 'employees', Employees],
  ['/my-schedule', 'my-schedule', Shifts],
  ['/orders', 'orders', Orders],
  ['/products', 'products', Products],
  ['/coupons', 'coupons', Coupons],
  ['/reports_analytics', 'reports', Reports],
  ['/cinema-reviews', 'cinema-reviews', CinemaReviews],
  ['/profile', 'profile', Profile],
  ['/comment-reports', 'comment-reports', CommentReports],
];
function HomeRedirect() {
  const user = useAuthStore((s) => s.user);
  return <Navigate to={modules.find(([module]) => can(user, module))?.[1] || '/403'} replace />;
}
export default function App() {
  return (
    <Suspense fallback={<LoadingState />}>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route element={<AuthCheck />}>
          <Route element={<AppLayout />}>
            <Route path="/" element={<HomeRedirect />} />
            <Route path="/employees/workshift" element={<Navigate to="/my-schedule" replace />} />
            {pages.map(([path, module, Page]) => (
              <Route
                key={path}
                path={path}
                element={
                  <Protected module={module}>
                    <Page />
                  </Protected>
                }
              />
            ))}
            {['faq', 'news'].map((resource) => (
              <Route
                key={resource}
                path={'/' + resource}
                element={
                  <Protected module={resource}>
                    <Resource key={resource} resource={resource} />
                  </Protected>
                }
              />
            ))}
            <Route
              path="/news/categories"
              element={
                <Protected module="news">
                  <Resource key="news-categories" resource="categories" categoryType="NEWS" />
                </Protected>
              }
            />
            <Route
              path="/products/categories"
              element={
                <Protected module="products">
                  <Resource key="product-categories" resource="categories" categoryType="PRODUCT" />
                </Protected>
              }
            />
            <Route
              path="/403"
              element={
                <div className="py-20 text-center">
                  <h1 className="text-5xl font-semibold mb-4">403</h1>
                  <p>Bạn không có quyền truy cập trang này.</p>
                  <Link to="/profile" className="btn-secondary mt-5 inline-flex">
                    Tài khoản của tôi
                  </Link>
                </div>
              }
            />
            <Route
              path="*"
              element={
                <div className="py-20 text-center">
                  <h1 className="text-4xl mb-4">404</h1>
                  <p>Không tìm thấy trang.</p>
                  <Link to="/" className="text-indigo-600">
                    Về trang chính
                  </Link>
                </div>
              }
            />
          </Route>
        </Route>
      </Routes>
    </Suspense>
  );
}

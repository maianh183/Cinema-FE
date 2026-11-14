import { Component } from 'react';
import { createRoot } from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { Toaster } from 'sonner';
import App from './routes/App';
import { authService } from './services/authService';
import './styles/index.css';
import './styles/dashboard.css';
class ErrorBoundary extends Component {
  state = { error: false };
  static getDerivedStateFromError() {
    return { error: true };
  }
  render() {
    return this.state.error ? (
      <div className="p-10" role="alert">
        <h1>Không thể hiển thị màn hình.</h1>
        <button className="btn-secondary mt-4" onClick={() => window.location.reload()}>
          Tải lại ứng dụng
        </button>
      </div>
    ) : (
      this.props.children
    );
  }
}
authService.restore();
const router = createBrowserRouter([{ path: '*', element: <App /> }]);
createRoot(document.getElementById('root')).render(
  <ErrorBoundary>
    <RouterProvider router={router} />
    <Toaster position="bottom-right" richColors />
  </ErrorBoundary>,
);

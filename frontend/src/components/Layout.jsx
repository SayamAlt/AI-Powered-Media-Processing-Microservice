import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import NotificationBadge from './NotificationBadge';
import client from '../api/client';

export default function Layout({ children }) {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  async function handleLogout() {
    try {
      await client.post('/auth/logout');
    } catch {
    }
    logout();
    navigate('/login');
  }

  return (
    <div className="app-wrapper">
      <header className="header">
        <Link to="/" className="brand">Camarin Media</Link>
        <nav className="header-nav">
          {user && (
            <>
              <NotificationBadge />
              <span className="user-email">{user.email}</span>
              <button onClick={handleLogout} className="btn-link">Logout</button>
            </>
          )}
        </nav>
      </header>
      <main className="main-content">{children}</main>
    </div>
  );
}
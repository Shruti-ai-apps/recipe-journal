/**
 * Main App component with routing
 */

import { Outlet, Link, useLocation } from 'react-router-dom';
import Header from './components/layout/Header';
import './App.css';

function App() {
  const location = useLocation();

  return (
    <div className="app">
      <Header />

      <nav className="nav-tabs">
        <Link
          to="/"
          className={`nav-tab ${location.pathname === '/' ? 'nav-tab--active' : ''}`}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
            <polyline points="9 22 9 12 15 12 15 22" />
          </svg>
          <span>Import</span>
        </Link>
        <Link
          to="/favorites"
          className={`nav-tab ${location.pathname === '/favorites' ? 'nav-tab--active' : ''}`}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
          </svg>
          <span>Favorites</span>
        </Link>
      </nav>

      <main className="main-content">
        <Outlet />
      </main>

      <footer className="footer">
        <p>Recipe Journal - Import, scale, and save your favorite recipes</p>
      </footer>
    </div>
  );
}

export default App;

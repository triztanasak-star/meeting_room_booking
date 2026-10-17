import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { FiGrid, FiCheckSquare, FiUsers, FiPieChart, FiLogOut, FiSun, FiMoon } from 'react-icons/fi';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import logoImg from '../assets/logoDigital.JPG.jpg';
import LanguageSwitcher from './LanguageSwitcher';
import UserAvatar from './UserAvatar';

export default function Sidebar() {
  const { user, can, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);

  const closeSidebar = () => setIsOpen(false);

  return (
    <>
      {/* ✅ Nút hamburger — chỉ hiện trên mobile */}
      <button
        type="button"
        className="sidebar-toggle"
        onClick={() => setIsOpen(!isOpen)}
        aria-label={t('sidebar.toggleMenu')}
      >
        ☰
      </button>

      {/* ✅ Overlay khi mở sidebar trên mobile */}
      <div
        className={`sidebar-overlay ${isOpen ? 'open' : ''}`}
        onClick={closeSidebar}
      />

      <aside
        className={`app-sidebar ${isOpen ? 'open' : ''}`}
      >
        {/* Brand */}
        <div
          className="sidebar-brand d-flex flex-column align-items-center justify-content-center px-3 py-3"
          style={{ flexShrink: 0 }}
        >
          <div
            className="bg-white rounded overflow-hidden shadow-sm d-flex align-items-center justify-content-center p-1 w-100"
            style={{ maxWidth: '150px', height: '70px' }}
          >
            <img
              src={logoImg}
              alt="Logo"
              style={{ width: '100%', height: '100%', objectFit: 'contain' }}
            />
          </div>
        </div>

        {/* Menu */}
        <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
          <nav className="nav flex-column">
            <NavLink to="/dashboard" className="nav-link d-flex align-items-center gap-2 px-3 py-2" onClick={closeSidebar}>
              <FiGrid /> {t('sidebar.dashboard')}
            </NavLink>
            <NavLink to="/works" className="nav-link d-flex align-items-center gap-2 px-3 py-2" onClick={closeSidebar}>
              <FiCheckSquare /> {t('sidebar.works')}
            </NavLink>
            <NavLink to="/finance" className="nav-link d-flex align-items-center gap-2 px-3 py-2" onClick={closeSidebar}>
              <FiPieChart /> {t('sidebar.finance')}
            </NavLink>
          </nav>

          <div className="nav-section-label">{t('sidebar.admin')}</div>
          <nav className="nav flex-column">
            {can('admin') && (
              <NavLink to="/users" className="nav-link d-flex align-items-center gap-2 px-3 py-2" onClick={closeSidebar}>
                <FiUsers /> {t('sidebar.users')}
              </NavLink>
            )}
          </nav>
        </div>

        {/* Footer */}
        <div
          className="sidebar-footer"
          style={{ flexShrink: 0, marginTop: 'auto' }}
        >
          <div className="sidebar-user d-flex align-items-center gap-2">
            <UserAvatar name={user?.name ?? ''} src={user?.avatar_url} />
            {user?.name}
            <span className="badge text-bg-primary ms-2">{t(`sidebar.roles.${user?.role ?? 'user'}`)}</span>
          </div>
          <LanguageSwitcher className="w-100 mb-2" />
          <button
            type="button"
            className="btn btn-sm btn-outline-light w-100 d-flex align-items-center justify-content-center gap-2 mb-2"
            onClick={toggleTheme}
          >
            {theme === 'dark' ? <FiSun /> : <FiMoon />} {theme === 'dark' ? t('sidebar.lightMode') : t('sidebar.darkMode')}
          </button>
          <button
            type="button"
            className="btn btn-sm btn-outline-light w-100 d-flex align-items-center justify-content-center gap-2"
            onClick={() => logout()}
          >
            <FiLogOut /> {t('sidebar.logout')}
          </button>
        </div>
      </aside>
    </>
  );
}

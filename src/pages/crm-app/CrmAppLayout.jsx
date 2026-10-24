import { useEffect, useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { FiBriefcase, FiGrid, FiLink, FiLogOut, FiMoon, FiSun, FiUsers } from 'react-icons/fi';
import { crmCan } from '../../constants/crmUserAccess';
import { readCrmTheme, revealTheme, writeCrmTheme } from '../crm-demo/crmTheme';
import { useCrmSession } from './useCrmSession';
import '../crm-demo/crmShell.css';

const LINKS = [
  { to: '/crm-app', label: 'Overview', end: true, icon: FiGrid, permission: 'crm.dashboard.read' },
  { to: '/crm-app/students', label: 'Students', icon: FiUsers, permission: 'crm.students.read' },
  { to: '/crm-app/consultancies', label: 'Consultancies', icon: FiBriefcase, permission: 'crm.consultancies.read' },
  { to: '/crm-app/referrals', label: 'Referrals', icon: FiLink, permission: 'crm.referrals.read' },
];

export default function CrmAppLayout() {
  const { user, logout } = useCrmSession();
  const navigate = useNavigate();
  const [theme, setTheme] = useState(readCrmTheme);
  const links = LINKS.filter((link) => crmCan(user, link.permission) || (link.end && crmCan(user, 'crm.analytics.read')));

  useEffect(() => {
    document.documentElement.setAttribute('data-crm-theme', theme);
    return () => document.documentElement.removeAttribute('data-crm-theme');
  }, [theme]);

  async function onLogout() {
    await logout();
    navigate('/crm/login', { replace: true });
  }

  return (
    <div className="gx-app" data-theme={theme}>
      <aside className="gx-side" aria-label="CRM">
        <nav className="gx-nav" aria-label="CRM">
          {links.map((link) => {
            const Icon = link.icon;
            return (
              <NavLink key={link.to} to={link.to} end={link.end} data-label={link.label} className={({ isActive }) => (isActive ? 'active' : '')}>
                <span className="gx-ico"><Icon size={18} /></span>
                <span className="gx-label">{link.label}</span>
              </NavLink>
            );
          })}
        </nav>
        <div className="gx-side-foot">
          <button type="button" data-label="Sign out" onClick={onLogout}>
            <span className="gx-ico"><FiLogOut size={18} /></span>
            <span className="gx-label">Sign out</span>
          </button>
        </div>
      </aside>
      <div className="gx-workspace">
        <header className="gx-topbar">
          <div className="gx-brand">
            <span className="gx-word">GuideXpert<small>CRM</small></span>
          </div>
          <div className="gx-top-tools">
            <button
              type="button"
              className="gx-theme"
              aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              onClick={(event) => {
                const rect = event.currentTarget.getBoundingClientRect();
                const next = theme === 'dark' ? 'light' : 'dark';
                revealTheme(next, { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 }, (value) => {
                  setTheme(value);
                  writeCrmTheme(value);
                });
              }}
            >
              {theme === 'dark' ? <FiSun size={16} /> : <FiMoon size={16} />}
            </button>
            <span className="gx-avatar" title={user?.fullName || ''}>{(user?.fullName || 'CRM').slice(0, 2).toUpperCase()}</span>
          </div>
        </header>
        <div className="gx-content">
          <Outlet />
        </div>
      </div>
    </div>
  );
}

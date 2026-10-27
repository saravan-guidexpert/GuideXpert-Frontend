import { useEffect, useRef, useState } from 'react';
import { FiActivity, FiArrowUpRight, FiBarChart2, FiBriefcase, FiClock, FiGrid, FiLayers, FiLogOut, FiMenu, FiMoon, FiShield, FiSun, FiUsers, FiX } from 'react-icons/fi';
import { NavLink, Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useCrmSession } from '../../../crm-app/useCrmSession';
import { fetchPortalDirectory } from '../../../../utils/crmSessionApi';
import { CRM_ADMIN_LOGIN, crmSessionRedirect } from '../../../../utils/crmLoginFlow';
import { visibleWorkspaceSections, workspaceServerDecision } from '../../../../utils/crmWorkspace';
import { readCrmTheme, revealTheme, writeCrmTheme } from '../../../crm-demo/crmTheme';
import { AccessNote, AdminThemeProvider } from './workspaceUi';
import '../../../crm-demo/crmShell.css';
import '../../../crm-demo/overview.css';
import './superAdminShell.css';

const ICONS = {
  overview: FiGrid,
  users: FiUsers,
  access: FiShield,
  consultancies: FiBriefcase,
  activity: FiClock,
  analytics: FiBarChart2,
  history: FiLayers,
  intelligence: FiActivity,
};

function Mark() {
  return (
    <svg className="gx-mark" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="currentColor" d="M12 2.2 13.7 8.6 20.2 9.2 15.2 13.2 16.8 19.6 12 16.2 7.2 19.6 8.8 13.2 3.8 9.2 10.3 8.6Z" />
    </svg>
  );
}

function Gate({ children }) {
  return (
    <div className="gx-app" data-theme={readCrmTheme()}>
      <div className="gx-workspace">
        <div className="gx-content">{children}</div>
      </div>
    </div>
  );
}

export default function CrmWorkspaceLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useCrmSession();
  const menuRef = useRef(null);
  const sideRef = useRef(null);
  const [attempt, setAttempt] = useState(0);
  const [gate, setGate] = useState({ state: 'loading', message: '' });
  const [theme, setTheme] = useState(readCrmTheme);
  const [menu, setMenu] = useState(false);
  const [menuPath, setMenuPath] = useState(location.pathname);
  const [narrow, setNarrow] = useState(false);

  if (menuPath !== location.pathname) {
    setMenuPath(location.pathname);
    setMenu(false);
  }

  useEffect(() => {
    let cancelled = false;
    fetchPortalDirectory({ page: 1, limit: 1 }).then((result) => {
      if (cancelled) return;
      const decision = workspaceServerDecision(result);
      if (decision.state === 'forbidden') {
        navigate(crmSessionRedirect('forbidden', location.pathname, location.search, CRM_ADMIN_LOGIN), { replace: true });
        return;
      }
      setGate(decision);
    });
    return () => {
      cancelled = true;
    };
  }, [attempt, location.pathname, location.search, logout, navigate]);

  useEffect(() => {
    document.documentElement.setAttribute('data-crm-theme', theme);
    return () => document.documentElement.removeAttribute('data-crm-theme');
  }, [theme]);

  useEffect(() => {
    const media = window.matchMedia('(max-width: 860px)');
    const apply = () => setNarrow(media.matches);
    apply();
    media.addEventListener('change', apply);
    return () => media.removeEventListener('change', apply);
  }, []);

  useEffect(() => {
    function onKey(event) {
      if (event.key === 'Escape') setMenu(false);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  function retry() {
    setGate({ state: 'loading', message: '' });
    setAttempt((value) => value + 1);
  }

  function closeMenu(restore) {
    setMenu(false);
    if (restore) menuRef.current?.focus();
  }

  if (gate.state === 'loading') {
    return <Gate><p className="gx-subtitle">Checking access…</p></Gate>;
  }
  if (gate.state === 'anonymous') {
    const redirect = crmSessionRedirect('anonymous', location.pathname, location.search, CRM_ADMIN_LOGIN);
    return <Navigate to={redirect} replace />;
  }
  if (gate.state !== 'allowed') {
    return (
      <Gate>
        <AccessNote>{gate.message}</AccessNote>
        <button type="button" className="gx-btn" onClick={retry}>Retry</button>
      </Gate>
    );
  }

  const sections = visibleWorkspaceSections(user);
  const words = String(user?.fullName || 'Super Admin').trim().split(/\s+/);
  const initials = (words.length > 1 ? `${words[0][0]}${words[1][0]}` : words[0].slice(0, 2)).toUpperCase();

  return (
    <AdminThemeProvider theme={theme}>
      <div className={`gx-app gx-admin${menu ? ' is-menu' : ''}`} data-theme={theme}>
        <button type="button" className="gx-scrim" aria-label="Close menu" onClick={() => closeMenu(true)} />
        <aside ref={sideRef} className="gx-side" aria-label="Super Admin" inert={narrow && !menu ? true : undefined}>
          <nav className="gx-nav" aria-label="Super Admin">
            {sections.map((section) => {
              const Icon = ICONS[section.id] || FiActivity;
              return (
                <NavLink
                  key={section.id}
                  to={section.to}
                  end={section.end}
                  data-label={section.label}
                  onClick={() => closeMenu(false)}
                  className={({ isActive }) => (isActive ? 'active' : '')}
                >
                  <span className="gx-ico"><Icon size={18} strokeWidth={1.75} /></span>
                  <span className="gx-label">{section.label}</span>
                </NavLink>
              );
            })}
          </nav>
          <div className="gx-side-foot">
            <span className="gx-side-sep" aria-hidden="true" />
            <NavLink to="/crm/app" data-label="User CRM" onClick={() => closeMenu(false)}>
              <span className="gx-ico"><FiArrowUpRight size={18} strokeWidth={1.75} /></span>
              <span className="gx-label">User CRM</span>
            </NavLink>
          </div>
        </aside>
        <div className="gx-workspace">
          <header className="gx-topbar">
            <button ref={menuRef} type="button" className="gx-menu" aria-label={menu ? 'Close menu' : 'Open menu'} aria-expanded={menu} onClick={() => (menu ? closeMenu(true) : setMenu(true))}>
              {menu ? <FiX size={18} /> : <FiMenu size={18} />}
            </button>
            <NavLink to="/crm/admin/overview" className="gx-brand">
              <span className="gx-ico"><Mark /></span>
              <span className="gx-word">GuideXpert<small>Super Admin</small></span>
            </NavLink>
            <div className="gx-top-tools">
              <button
                type="button"
                className="gx-theme"
                aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
                title={theme === 'dark' ? 'Light mode' : 'Dark mode'}
                onClick={(event) => {
                  const rect = event.currentTarget.getBoundingClientRect();
                  const next = theme === 'dark' ? 'light' : 'dark';
                  revealTheme(next, { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 }, (value) => {
                    setTheme(value);
                    writeCrmTheme(value);
                  });
                }}
              >
                {theme === 'dark' ? <FiSun size={16} strokeWidth={1.75} /> : <FiMoon size={16} strokeWidth={1.75} />}
              </button>
              <NavLink to="/crm/admin/activity" className="gx-tool" aria-label="Activity" data-label="Activity">
                <FiClock size={18} strokeWidth={1.75} />
              </NavLink>
              <span className="gx-top-sep" aria-hidden="true" />
              <div className="gx-who" title={user?.fullName || 'Super Admin'}>
                <span className="gx-avatar" aria-hidden="true">{initials}</span>
                <span className="gx-who-copy">
                  <strong>{user?.fullName || 'Super Admin'}</strong>
                  <small>{user?.email || 'Super Admin'}</small>
                </span>
              </div>
              <button type="button" className="gx-tool" aria-label="Sign out" data-label="Sign out" onClick={logout}>
                <FiLogOut size={18} strokeWidth={1.75} />
              </button>
            </div>
          </header>
          <div className="gx-content">
            <Outlet />
          </div>
        </div>
      </div>
    </AdminThemeProvider>
  );
}

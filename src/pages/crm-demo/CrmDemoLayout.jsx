import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { FiBarChart2, FiBriefcase, FiCalendar, FiChevronsLeft, FiChevronsRight, FiClock, FiGrid, FiLink, FiMenu, FiMoon, FiSearch, FiSettings, FiSun, FiUsers, FiX } from 'react-icons/fi';
import { browserCrmDemo } from '../../utils/crmDemoStore';
import { selectCrmClient } from '../../utils/crmDataSource';
import { itemsOf } from './crmFormat';
import { CrmDemoContext } from './useCrmDemo';
import { readCrmTheme, revealTheme, writeCrmTheme } from './crmTheme';
import './crmShell.css';

const LINKS = [
  { to: '/crm', label: 'Overview', end: true, icon: FiGrid },
  { to: '/crm/analytics', label: 'Analytics', icon: FiBarChart2 },
  { to: '/crm/calendar', label: 'Calendar', icon: FiCalendar },
  { to: '/crm/consultancies', label: 'Consultancies', icon: FiBriefcase },
  { to: '/crm/students', label: 'Students', icon: FiUsers },
  { to: '/crm/referrals', label: 'Referrals', icon: FiLink },
  { to: '/crm/audit', label: 'Activity', icon: FiClock },
];

function Mark() {
  return (
    <svg className="gx-mark" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="currentColor" d="M12 2.2 13.7 8.6 20.2 9.2 15.2 13.2 16.8 19.6 12 16.2 7.2 19.6 8.8 13.2 3.8 9.2 10.3 8.6Z" />
    </svg>
  );
}

function NavItems({ onNavigate }) {
  return LINKS.map((link) => {
    const Icon = link.icon;
    return (
      <NavLink
        key={link.to}
        to={link.to}
        end={link.end}
        data-label={link.label}
        onClick={onNavigate}
        className={({ isActive }) => (isActive ? 'active' : '')}
      >
        <span className="gx-ico"><Icon size={18} strokeWidth={1.75} /></span>
        <span className="gx-label">{link.label}</span>
      </NavLink>
    );
  });
}

function TopSearch({ client, compact, onExpand }) {
  const navigate = useNavigate();
  const location = useLocation();
  const boxRef = useRef(null);
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [searchPath, setSearchPath] = useState(location.pathname);
  if (searchPath !== location.pathname) {
    setSearchPath(location.pathname);
    setQuery('');
    setOpen(false);
  }
  const needle = query.trim();
  const results = useMemo(() => {
    if (!needle) return [];
    const students = itemsOf(client.listStudents({ page: 1, limit: 5, q: needle })).map((row) => ({
      id: `student-${row.id}`,
      kind: 'Student',
      label: row.fullName,
      to: `/crm/students/${row.id}`,
    }));
    const consultancies = itemsOf(client.listConsultancies({ page: 1, limit: 5, q: needle })).map((row) => ({
      id: `consultancy-${row.id}`,
      kind: 'Consultancy',
      label: row.name,
      to: `/crm/consultancies/${row.id}`,
    }));
    return [...students, ...consultancies].slice(0, 8);
  }, [client, needle]);

  useEffect(() => {
    function onPointer(event) {
      if (!boxRef.current?.contains(event.target)) setOpen(false);
    }
    document.addEventListener('pointerdown', onPointer);
    return () => document.removeEventListener('pointerdown', onPointer);
  }, []);

  function go(to) {
    setOpen(false);
    setQuery('');
    navigate(to);
  }

  return (
    <form
      ref={boxRef}
      className="gx-side-search"
      role="search"
      onClick={() => { if (compact) onExpand(); }}
      onSubmit={(event) => {
        event.preventDefault();
        if (!needle) return;
        if (results[0]) go(results[0].to);
        else go(`/crm/students?q=${encodeURIComponent(needle)}`);
      }}
    >
      <FiSearch size={15} aria-hidden="true" />
      <input
        value={query}
        placeholder="Search students or consultancies"
        aria-label="Search students or consultancies"
        aria-expanded={open && Boolean(needle)}
        aria-controls="gx-search-results"
        onChange={(event) => {
          setQuery(event.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
      />
      {open && needle ? (
        <div id="gx-search-results" className="gx-search-pop" role="listbox">
          {results.length === 0 ? <p>No matching records</p> : results.map((row) => (
            <button key={row.id} type="button" role="option" onClick={() => go(row.to)}>
              <strong>{row.label}</strong>
              <small>{row.kind}</small>
            </button>
          ))}
        </div>
      ) : null}
    </form>
  );
}

export default function CrmDemoLayout() {
  const location = useLocation();
  const menuRef = useRef(null);
  const sideRef = useRef(null);
  const client = useMemo(() => selectCrmClient('demo', { demo: browserCrmDemo }), []);
  const [snapshot, setSnapshot] = useState(() => client.inspect());
  const refresh = useCallback(() => setSnapshot(client.inspect()), [client]);
  const demoManager = snapshot.success ? snapshot.data.demoManager : false;
  const demoRole = snapshot.success && snapshot.data.demoRole === 'super_admin' ? 'super_admin' : 'staff';
  const [theme, setTheme] = useState(readCrmTheme);
  const value = useMemo(() => ({ client, demoManager, demoRole, refresh, theme }), [client, demoManager, demoRole, refresh, theme]);
  const [menu, setMenu] = useState(false);
  const [menuPath, setMenuPath] = useState(location.pathname);
  if (menuPath !== location.pathname) {
    setMenuPath(location.pathname);
    setMenu(false);
  }
  const [narrow, setNarrow] = useState(false);
  const [wide, setWide] = useState(false);

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

  useEffect(() => {
    if (!menu) return undefined;
    const node = sideRef.current?.querySelector('a, button');
    node?.focus();
    return undefined;
  }, [menu]);

  function closeMenu(restore) {
    setMenu(false);
    if (restore) menuRef.current?.focus();
  }

  async function resetDemo() {
    await Promise.resolve(client.resetDemoData());
    refresh();
  }

  return (
    <CrmDemoContext.Provider value={value}>
      <div className={`gx-app${menu ? ' is-menu' : ''}${wide ? ' is-wide' : ''}`} data-theme={theme}>
        <button type="button" className="gx-scrim" aria-label="Close menu" onClick={() => closeMenu(true)} />
        <aside ref={sideRef} id="gx-side" className="gx-side" aria-label="CRM" inert={narrow && !menu ? true : undefined}>
          <div className="gx-side-brand">
            <NavLink to="/crm" className="gx-brand" end>
              <span className="gx-ico"><Mark /></span>
              <span className="gx-word">GuideXpert<small>CRM</small></span>
            </NavLink>
            <button
              type="button"
              className="gx-rail"
              aria-expanded={wide}
              aria-controls="gx-side"
              aria-label={wide ? 'Collapse sidebar' : 'Expand sidebar'}
              onClick={() => setWide((value) => !value)}
            >
              {wide ? <FiChevronsLeft size={16} /> : <FiChevronsRight size={16} />}
            </button>
          </div>
          <TopSearch client={client} compact={!wide && !narrow} onExpand={() => setWide(true)} />
          <nav className="gx-nav" aria-label="CRM">
            <NavItems onNavigate={() => closeMenu(false)} />
          </nav>
          <div className="gx-side-foot">
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
              {theme === 'dark' ? <FiSun size={16} strokeWidth={1.75} /> : <FiMoon size={16} strokeWidth={1.75} />}
              <span className="gx-label">{theme === 'dark' ? 'Light mode' : 'Dark mode'}</span>
            </button>
            <NavLink to="/crm/settings" data-label="Settings" onClick={() => closeMenu(false)} className={({ isActive }) => (isActive ? 'active' : '')}>
              <span className="gx-ico"><FiSettings size={18} strokeWidth={1.75} /></span>
              <span className="gx-label">Settings</span>
            </NavLink>
          </div>
        </aside>
        <div className="gx-workspace">
          <div className="gx-mobile-bar">
            <button ref={menuRef} type="button" className="gx-menu" aria-label={menu ? 'Close menu' : 'Open menu'} aria-expanded={menu} onClick={() => (menu ? closeMenu(true) : setMenu(true))}>
              {menu ? <FiX size={18} /> : <FiMenu size={18} />}
            </button>
          </div>
          <div className="gx-content">
            {snapshot.success ? <Outlet /> : (
              <div className="gx-notice warning" role="alert">
                <p>{snapshot.message}</p>
                <button type="button" className="gx-lime" onClick={resetDemo}>Reset demo data</button>
              </div>
            )}
          </div>
        </div>
      </div>
    </CrmDemoContext.Provider>
  );
}

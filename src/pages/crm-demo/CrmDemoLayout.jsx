import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { FiBarChart2, FiBell, FiBriefcase, FiCalendar, FiClock, FiGrid, FiLink, FiLogOut, FiMenu, FiMoon, FiSearch, FiSettings, FiSun, FiUsers, FiX } from 'react-icons/fi';
import { browserCrmDemo } from '../../utils/crmDemoStore';
import { selectCrmClient } from '../../utils/crmDataSource';
import { itemsOf } from './crmFormat';
import { CrmDemoContext } from './useCrmDemo';
import { readCrmTheme, revealTheme, writeCrmTheme } from './crmTheme';
import './crmShell.css';

function linksFor(basePath) {
  return [
    { to: basePath, label: 'Overview', end: true, icon: FiGrid },
    { to: `${basePath}/analytics`, label: 'Analytics', icon: FiBarChart2 },
    { to: `${basePath}/calendar`, label: 'Calendar', icon: FiCalendar },
    { to: `${basePath}/consultancies`, label: 'Consultancies', icon: FiBriefcase },
    { to: `${basePath}/students`, label: 'Students', icon: FiUsers },
    { to: `${basePath}/referrals`, label: 'Referrals', icon: FiLink },
    { to: `${basePath}/audit`, label: 'Activity', icon: FiClock },
  ];
}

function Mark() {
  return (
    <svg className="gx-mark" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="currentColor" d="M12 2.2 13.7 8.6 20.2 9.2 15.2 13.2 16.8 19.6 12 16.2 7.2 19.6 8.8 13.2 3.8 9.2 10.3 8.6Z" />
    </svg>
  );
}

function NavItems({ onNavigate, basePath }) {
  return linksFor(basePath).map((link) => {
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

function TopSearch({ client, basePath }) {
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
      to: `${basePath}/students/${row.id}`,
    }));
    const consultancies = itemsOf(client.listConsultancies({ page: 1, limit: 5, q: needle })).map((row) => ({
      id: `consultancy-${row.id}`,
      kind: 'Consultancy',
      label: row.name,
      to: `${basePath}/consultancies/${row.id}`,
    }));
    return [...students, ...consultancies].slice(0, 8);
  }, [client, needle, basePath]);

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
      className="gx-top-search"
      role="search"
      onSubmit={(event) => {
        event.preventDefault();
        if (!needle) return;
        if (results[0]) go(results[0].to);
        else go(`${basePath}/students?q=${encodeURIComponent(needle)}`);
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

export default function CrmDemoLayout({
  mode = 'demo',
  basePath = '/crm/demo',
  client: clientProp = null,
  sessionUser = null,
  canCorrectReferral = false,
  onSignOut = null,
}) {
  const location = useLocation();
  const menuRef = useRef(null);
  const sideRef = useRef(null);
  const client = useMemo(() => clientProp || selectCrmClient('demo', { demo: browserCrmDemo }), [clientProp]);
  const [snapshot, setSnapshot] = useState(() => client.inspect());
  const refresh = useCallback(async () => {
    if (typeof client.reload === 'function') await client.reload();
    setSnapshot(client.inspect());
  }, [client]);
  const demoManager = mode === 'api' ? false : Boolean(snapshot.success && snapshot.data.demoManager);
  const demoRole = mode === 'api' ? 'staff' : (snapshot.success && snapshot.data.demoRole) || 'staff';
  const [theme, setTheme] = useState(readCrmTheme);
  useEffect(() => {
    document.documentElement.setAttribute('data-crm-theme', theme);
    return () => document.documentElement.removeAttribute('data-crm-theme');
  }, [theme]);
  useEffect(() => {
    if (typeof client.reload !== 'function') return undefined;
    let cancelled = false;
    client.reload().then(() => {
      if (!cancelled) setSnapshot(client.inspect());
    });
    return () => {
      cancelled = true;
    };
  }, [client]);
  const value = useMemo(() => ({
    client,
    demoManager,
    demoRole,
    canCorrectReferral: mode === 'api' ? canCorrectReferral : demoManager,
    refresh,
    theme,
    basePath,
    mode,
    workspaceName: mode === 'api' ? (sessionUser?.fullName || 'CRM workspace') : 'Demo Workspace',
    workspaceLede: mode === 'api'
      ? 'Signed-in consultancy, student, and referral records from the server.'
      : 'Local demo records for consultancies, students and referrals. Stored in this browser.',
  }), [client, demoManager, demoRole, canCorrectReferral, refresh, theme, basePath, mode, sessionUser]);
  const [menu, setMenu] = useState(false);
  const [menuPath, setMenuPath] = useState(location.pathname);
  if (menuPath !== location.pathname) {
    setMenuPath(location.pathname);
    setMenu(false);
  }
  const [narrow, setNarrow] = useState(false);

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
      <div className={`gx-app${menu ? ' is-menu' : ''}`} data-theme={theme}>
        <button type="button" className="gx-scrim" aria-label="Close menu" onClick={() => closeMenu(true)} />
        <aside ref={sideRef} className="gx-side" aria-label="CRM" inert={narrow && !menu ? true : undefined}>
          <nav className="gx-nav" aria-label="CRM">
            <NavItems basePath={basePath} onNavigate={() => closeMenu(false)} />
          </nav>
          <div className="gx-side-foot">
            <NavLink to={`${basePath}/settings`} data-label="Settings" onClick={() => closeMenu(false)} className={({ isActive }) => (isActive ? 'active' : '')}>
              <span className="gx-ico"><FiSettings size={18} strokeWidth={1.75} /></span>
              <span className="gx-label">Settings</span>
            </NavLink>
          </div>
        </aside>
        <div className="gx-workspace">
          <header className="gx-topbar">
            <button ref={menuRef} type="button" className="gx-menu" aria-label={menu ? 'Close menu' : 'Open menu'} aria-expanded={menu} onClick={() => (menu ? closeMenu(true) : setMenu(true))}>
              {menu ? <FiX size={18} /> : <FiMenu size={18} />}
            </button>
            <NavLink to={basePath} className="gx-brand" end>
              <span className="gx-ico"><Mark /></span>
              <span className="gx-word">GuideXpert<small>CRM</small></span>
            </NavLink>
            <TopSearch client={client} basePath={basePath} />
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
              <NavLink to={`${basePath}/audit`} className="gx-tool" aria-label="Activity" data-label="Activity">
                <FiBell size={18} strokeWidth={1.75} />
              </NavLink>
              <NavLink to={`${basePath}/settings`} className="gx-tool" aria-label="Settings" data-label="Settings">
                <FiSettings size={18} strokeWidth={1.75} />
              </NavLink>
              <span className="gx-avatar" title={sessionUser?.fullName || 'GuideXpert CRM'} aria-hidden="true">{sessionUser ? String(sessionUser.fullName || 'CRM').slice(0, 2).toUpperCase() : 'GX'}</span>
              {onSignOut ? <button type="button" className="gx-tool" aria-label="Sign out" data-label="Sign out" onClick={onSignOut}><FiLogOut size={18} strokeWidth={1.75} /></button> : null}
            </div>
          </header>
          <div className="gx-content">
            {snapshot.success ? <Outlet /> : (
              <div className="gx-notice warning" role="alert">
                <p>{snapshot.message}</p>
                {mode === 'api' ? <button type="button" className="gx-lime" onClick={refresh}>Retry</button> : <button type="button" className="gx-lime" onClick={resetDemo}>Reset demo data</button>}
              </div>
            )}
          </div>
        </div>
      </div>
    </CrmDemoContext.Provider>
  );
}

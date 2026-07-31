import { createElement, useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { useSidebarScrollbarActivity } from '../../hooks/useSidebarScrollbarActivity';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { HiMenu, HiX } from 'react-icons/hi';
import { FiLayout, FiUsers, FiBarChart2, FiDownload, FiSettings, FiCalendar, FiClock, FiVideo, FiFileText, FiBell, FiLink, FiClipboard, FiMessageSquare, FiBookOpen, FiImage, FiPhone, FiLayers, FiTarget, FiUserPlus, FiSend, FiDatabase, FiHeadphones, FiChevronLeft, FiChevronRight, FiLogOut, FiGlobe, FiColumns, FiEdit3 } from 'react-icons/fi';
import { useAuth } from '../../hooks/useAuth';
import { AdminDashboardProvider } from '../../contexts/AdminDashboardContext';
import { useAdminDateRange } from '../../hooks/useAdminDateRange';
import AdminFiltersPanel, { AdminFiltersTriggerButton } from './AdminFiltersPanel';
import { countActiveLeadFilters } from '../../utils/adminLeadFiltersShared';
import { getSidebarConfig } from '../../utils/adminApi';
import {
  getDefaultSidebarConfig,
  itemVisibleInMode,
  mergeSidebarConfig,
  readSidebarMode,
  resolveActiveSidebarMode,
  SIDEBAR_CONFIG_UPDATED_EVENT,
  writeSidebarMode,
} from '../../constants/adminSidebarConfig';

const SIDEBAR_COLLAPSED_KEY = 'admin-sidebar-collapsed';
const SETTINGS_ROUTE = '/admin/settings';

const navItems = [
  { to: '/admin/dashboard', label: 'Dashboard', icon: FiLayout, sectionKey: 'dashboard', sidebarPlacement: 'counsellors' },
  { to: '/admin/executive-dashboard', label: 'Executive Dashboard', icon: FiBarChart2, sectionKey: 'funnel-analytics', sidebarPlacement: 'counsellors' },
  { to: '/admin/analytics/alerts', label: 'Smart Alerts', icon: FiBell, sectionKey: 'funnel-analytics', sidebarPlacement: 'counsellors' },
  { to: '/admin/analytics/reports', label: 'Executive Reports', icon: FiFileText, sectionKey: 'funnel-analytics', sidebarPlacement: 'counsellors' },
  { to: '/admin/analytics/demand', label: 'Demand Intelligence', icon: FiGlobe, sectionKey: 'funnel-analytics', sidebarPlacement: 'counsellors' },
  { to: '/admin/analytics/predictions', label: 'Conversion Prediction', icon: FiTarget, sectionKey: 'funnel-analytics', sidebarPlacement: 'counsellors' },
  { to: '/admin/funnel-analytics', label: 'Funnel Analytics', icon: FiBarChart2, sectionKey: 'funnel-analytics', sidebarPlacement: 'counsellors' },
  { to: '/admin/certified-counsellors', label: 'Certified Counsellors', icon: FiUsers, sectionKey: 'certified-counsellors', sidebarPlacement: 'counsellors' },
  { to: '/admin/leads', label: 'Lead Funnel', icon: FiUsers, sectionKey: 'leads', sidebarPlacement: 'counsellors' },
  { to: '/admin/analytics', label: 'Analytics', icon: FiBarChart2, sectionKey: 'analytics', sidebarPlacement: 'counsellors' },
  { to: '/admin/meeting-attendance', label: 'User Productivity', icon: FiVideo, sectionKey: 'meeting-attendance', sidebarPlacement: 'counsellors' },
  { to: '/admin/export', label: 'Export Data', icon: FiDownload, sectionKey: 'export', sidebarPlacement: 'counsellors' },
  { to: '/admin/slots', label: 'Slots', icon: FiCalendar, sectionKey: 'slots', sidebarPlacement: 'counsellors' },
  { to: '/admin/demo-meet-schedule', label: 'Demo meet schedule', icon: FiClock, sectionKey: 'slots', sidebarPlacement: 'counsellors' },
  { to: '/admin/training-form-responses', label: 'Training Form', icon: FiClipboard, sectionKey: 'training-form-responses', sidebarPlacement: 'counsellors' },
  { to: '/admin/college-dost', label: 'CollegeDost', icon: FiClipboard, sectionKey: 'college-dost', sidebarPlacement: 'counsellors' },
  { to: '/admin/training-feedback', label: 'Activation Form', icon: FiMessageSquare, sectionKey: 'training-feedback', sidebarPlacement: 'counsellors' },
  { to: '/admin/counsellor-support-requests', label: 'Counsellor Support', icon: FiMessageSquare, sectionKey: 'training-feedback', sidebarPlacement: 'counsellors' },
  { to: '/admin/influencer-tracking', label: 'Influencer / UTM Tracking', icon: FiLink, sectionKey: 'influencer-tracking', sidebarPlacement: 'counsellors' },
  { to: '/admin/poster-downloads', label: 'Poster downloads', icon: FiImage, sectionKey: 'poster-downloads', sidebarPlacement: 'counsellors' },
  { to: '/admin/posters', label: 'Poster automation', icon: FiLayers, sectionKey: 'poster-automation', sidebarPlacement: 'counsellors' },
  { to: '/admin/assessment-results', label: 'Custom Reports', icon: FiFileText, sectionKey: 'assessment-results', sidebarPlacement: 'counsellors' },
  { to: '/admin/webinar-progress', label: 'Webinar Progress', icon: FiVideo, sectionKey: 'webinar-progress', sidebarPlacement: 'counsellors' },
  { to: '/admin/blogs', label: 'Blog Management', icon: FiBookOpen, sectionKey: 'blogs', sidebarPlacement: 'counsellors' },
  { to: '/admin/iit-counselling', label: 'IIT Counselling', icon: FiClipboard, sectionKey: 'iit-counselling', sidebarPlacement: 'students' },
  { to: '/admin/iit-counselling-utm', label: 'IIT Counselling UTM', icon: FiLink, sectionKey: 'iit-counselling', sidebarPlacement: 'students' },
  { to: '/admin/organic-rank-leads', label: 'Organic rank leads', icon: FiTarget, sectionKey: 'leads', sidebarPlacement: 'students' },
  { to: '/admin/college-comparisons', label: 'College comparisons', icon: FiColumns, sectionKey: 'leads', sidebarPlacement: 'students' },
  { to: '/admin/student-workspace-leads', label: 'Student workspace leads', icon: FiUsers, sectionKey: 'leads', sidebarPlacement: 'students' },
  { to: '/admin/iit-meet-attendance', label: 'IIT Meet Attendance', icon: FiVideo, sectionKey: 'iit-meet-attendance', sidebarPlacement: 'students' },
  { to: '/admin/calling-team/bdas', label: 'BDA Management', icon: FiUserPlus, sectionKey: 'calling-team', sidebarPlacement: 'students' },
  { to: '/admin/one-on-one-counseling', label: '1-on-1 Counseling', icon: FiUsers, sectionKey: 'one-on-one-counseling', sidebarPlacement: 'students' },
  { to: '/admin/guidance-slot-bookings', label: 'Guidance Slot Bookings', icon: FiCalendar, sectionKey: 'guidance-slot-bookings', sidebarPlacement: 'students' },
  { to: '/admin/one-on-one-counselors', label: 'One-on-One Counselors', icon: FiUserPlus, sectionKey: 'one-on-one-counselors-admin', sidebarPlacement: 'students' },
  { to: '/admin/ai-calls', label: 'AI Calls', icon: FiPhone, sectionKey: 'ai-calls', sidebarPlacement: 'students' },
  { to: '/admin/iit-ai-calls-summary', label: 'IITian AI Calls Summary', icon: FiPhone, sectionKey: 'iit-ai-calls-summary', sidebarPlacement: 'students' },
  { to: '/admin/whatsapp-ops', label: 'WhatsApp ops', icon: FiSend, sectionKey: 'whatsapp-ops', sidebarPlacement: 'students' },
  { to: '/admin/lead-intelligence', label: 'Chatbot Lead Intelligence', icon: FiMessageSquare, sectionKey: 'lead-intelligence', sidebarPlacement: 'students' },
  { to: '/admin/human-copilot', label: 'Human Copilot', icon: FiHeadphones, sectionKey: 'human-copilot', sidebarPlacement: 'students' },
  { to: '/admin/student-panel', label: 'Student panel', icon: FiLayers, sectionKey: 'student-workspace', sidebarPlacement: 'students' },
  { to: '/admin/system-prompt', label: 'System Prompt', icon: FiEdit3, sectionKey: 'system-prompt', sidebarPlacement: 'students' },
  { to: '/admin/calling-team', label: 'Calling Team', icon: FiPhone, sectionKey: 'calling-team', hideInSidebar: true },
  { to: '/admin/calling-data', label: 'Calling Data', icon: FiDatabase, sectionKey: 'calling-data', hideInSidebar: true },
  { to: '/admin/calling-team/leads', label: 'Calling Team Leads', icon: FiUsers, sectionKey: 'calling-team', hideInSidebar: true },
  { to: '/admin/influencer-create', label: 'Create influencer links', icon: FiUserPlus, sectionKey: 'influencer-tracking', hideInSidebar: true },
  { to: '/admin/bulk-certificates', label: 'Bulk Certificates', icon: FiDownload, sectionKey: 'bulk-certificates', hideInSidebar: true },
  { to: '/admin/osvi-calls', label: 'OSVI Calls', icon: FiPhone, sectionKey: 'osvi-calls', hideInSidebar: true },
  { to: '/admin/osvi-calls-data', label: 'OSVI calls Data', icon: FiPhone, sectionKey: 'osvi-calls-data', hideInSidebar: true },
  { to: SETTINGS_ROUTE, label: 'Settings', icon: FiSettings, sectionKey: 'settings', hideInSidebar: true },
];

const STUDENT_PANEL_LEGACY_KEYS = ['student-workspace-updates', 'student-testimonials'];

function getVisibleNavItems(user) {
  if (!user) return [];
  if (user.isSuperAdmin === true) return navItems;
  const access = user.sectionAccess;
  if (!Array.isArray(access) || access.length === 0) return [];
  const set = new Set(access);
  return navItems.filter((item) => {
    if (set.has(item.sectionKey)) return true;
    if (
      item.sectionKey === 'student-workspace' &&
      STUDENT_PANEL_LEGACY_KEYS.some((key) => set.has(key))
    ) {
      return true;
    }
    return false;
  });
}

function readSidebarCollapsed() {
  try {
    return localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === '1';
  } catch {
    return false;
  }
}

function SidebarNavLink({ to, label, icon: Icon, sidebarCollapsed, end, onNavigate }) {
  return (
    <NavLink
      to={to}
      end={end}
      title={sidebarCollapsed ? label : undefined}
      onClick={onNavigate}
      className={({ isActive }) =>
        `flex items-center gap-3 py-2 rounded-lg text-[0.8125rem] font-medium transition-all duration-200 ${
          sidebarCollapsed ? 'lg:justify-center lg:px-2 lg:gap-0' : 'px-3'
        } ${
          isActive
            ? 'bg-primary-navy/90 text-white shadow-[inset_3px_0_0_0_#4d8ec7]'
            : 'text-white/90 hover:bg-white/10 hover:text-white'
        }`
      }
    >
      {createElement(Icon, {
        className: 'w-[1.125rem] h-[1.125rem] shrink-0 opacity-90',
        'aria-hidden': true,
      })}
      <span className={sidebarCollapsed ? 'lg:hidden' : 'truncate'}>{label}</span>
    </NavLink>
  );
}

function SidebarModeToggle({ mode, onChange, showToggle, sidebarCollapsed }) {
  if (!showToggle) return null;

  const btnClass = (active) =>
    `flex-1 min-w-0 rounded-md py-1.5 text-[0.6875rem] font-semibold transition-colors ${
      active ? 'bg-white/15 text-white shadow-sm' : 'text-white/70 hover:text-white hover:bg-white/5'
    }`;

  if (sidebarCollapsed) {
    return (
      <div className="flex flex-col gap-1 mb-2">
        <button
          type="button"
          title="GuideXpert Counsellors"
          onClick={() => onChange('counsellors')}
          className={`w-full rounded-md py-2 text-xs font-bold transition-colors ${
            mode === 'counsellors' ? 'bg-white/15 text-white' : 'text-white/60 hover:bg-white/10'
          }`}
        >
          C
        </button>
        <button
          type="button"
          title="GuideXpert Students"
          onClick={() => onChange('students')}
          className={`w-full rounded-md py-2 text-xs font-bold transition-colors ${
            mode === 'students' ? 'bg-white/15 text-white' : 'text-white/60 hover:bg-white/10'
          }`}
        >
          S
        </button>
      </div>
    );
  }

  return (
    <div className="mb-2">
      <div className="flex rounded-lg bg-white/5 p-0.5 gap-0.5 border border-white/10">
        <button
          type="button"
          onClick={() => onChange('counsellors')}
          className={btnClass(mode === 'counsellors')}
        >
          <span className="block truncate px-1">Counsellors</span>
        </button>
        <button
          type="button"
          onClick={() => onChange('students')}
          className={btnClass(mode === 'students')}
        >
          <span className="block truncate px-1">Students</span>
        </button>
      </div>
    </div>
  );
}

function formatHeaderRange(from, to) {
  if (!from && !to) return '';
  try {
    const a = from ? new Date(from + 'T12:00:00') : null;
    const b = to ? new Date(to + 'T12:00:00') : null;
    const f = (d) => (d && !Number.isNaN(d.getTime()) ? d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : '…');
    return `${f(a)} – ${f(b)}`;
  } catch {
    return '';
  }
}

export default function AdminLayout() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/admin/login', { replace: true });
  };
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(readSidebarCollapsed);
  const [sidebarConfig, setSidebarConfig] = useState(getDefaultSidebarConfig);
  const [sidebarMode, setSidebarMode] = useState(readSidebarMode);

  const loadSidebarConfig = useCallback(async () => {
    const res = await getSidebarConfig();
    if (res.success && res.data?.sidebarConfig) {
      setSidebarConfig(mergeSidebarConfig(res.data.sidebarConfig));
    } else {
      setSidebarConfig(getDefaultSidebarConfig());
    }
  }, []);

  useEffect(() => {
    loadSidebarConfig();
  }, [loadSidebarConfig]);

  useEffect(() => {
    const onConfigUpdated = (event) => {
      if (event?.detail?.sidebarConfig) {
        setSidebarConfig(mergeSidebarConfig(event.detail.sidebarConfig));
      } else {
        loadSidebarConfig();
      }
    };
    window.addEventListener(SIDEBAR_CONFIG_UPDATED_EVENT, onConfigUpdated);
    return () => window.removeEventListener(SIDEBAR_CONFIG_UPDATED_EVENT, onConfigUpdated);
  }, [loadSidebarConfig]);

  const activeSidebarMode = useMemo(
    () => resolveActiveSidebarMode(sidebarMode, sidebarConfig.sectionsEnabled),
    [sidebarMode, sidebarConfig.sectionsEnabled]
  );

  useEffect(() => {
    if (activeSidebarMode !== sidebarMode) {
      setSidebarMode(activeSidebarMode);
      writeSidebarMode(activeSidebarMode);
    }
  }, [activeSidebarMode, sidebarMode]);

  const handleSidebarModeChange = (mode) => {
    setSidebarMode(mode);
    writeSidebarMode(mode);
  };

  const showSidebarToggle =
    sidebarConfig.sectionsEnabled.counsellors !== false &&
    sidebarConfig.sectionsEnabled.students !== false;

  const toggleSidebarCollapsed = () => {
    setSidebarCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(SIDEBAR_COLLAPSED_KEY, next ? '1' : '0');
      } catch {
        // ignore storage errors
      }
      return next;
    });
  };

  const visibleNavItems = useMemo(() => getVisibleNavItems(user), [user]);
  const sidebarNavItems = useMemo(
    () =>
      visibleNavItems.filter(
        (item) =>
          !item.hideInSidebar &&
          itemVisibleInMode(item, activeSidebarMode, sidebarConfig)
      ),
    [visibleNavItems, activeSidebarMode, sidebarConfig]
  );
  const closeMobileSidebar = () => setSidebarOpen(false);
  const showSettings = useMemo(
    () => visibleNavItems.some((item) => item.sectionKey === 'settings'),
    [visibleNavItems]
  );
  const allowedPaths = useMemo(() => new Set(visibleNavItems.map((item) => item.to)), [visibleNavItems]);
  const currentPath = location.pathname;
  const isPathAllowed =
    currentPath === '/admin' ||
    currentPath === '/admin/' ||
    allowedPaths.has(currentPath) ||
    currentPath.startsWith('/admin/whatsapp-ops') ||
    currentPath.startsWith('/admin/student-panel') ||
    currentPath.startsWith('/admin/student-workspace-updates') ||
    currentPath.startsWith('/admin/student-testimonials') ||
    currentPath.startsWith('/admin/calling-team') ||
    currentPath.startsWith('/admin/calling-data') ||
    currentPath.startsWith('/admin/ai-calls') ||
    currentPath.startsWith('/admin/iit-ai-calls-summary') ||
    currentPath.startsWith('/admin/lead-intelligence') ||
    currentPath.startsWith('/admin/human-copilot');
  useEffect(() => {
    const firstAllowed = visibleNavItems[0];
    if (user && !user.isSuperAdmin && !isPathAllowed && firstAllowed) {
      navigate(firstAllowed.to, { replace: true });
    }
  }, [user, isPathAllowed, visibleNavItems, navigate, currentPath]);
  const initials = (user?.username || 'A').slice(0, 2).toUpperCase();
  const { onScroll: onSidebarScroll, active: sidebarScrollActive } = useSidebarScrollbarActivity();

  return (
    <div className="counsellor-portal min-h-screen h-screen overflow-hidden bg-gray-50 flex">
      <div
        className="fixed inset-0 bg-black/50 z-20 lg:hidden transition-opacity duration-200"
        aria-hidden={!sidebarOpen}
        style={{ visibility: sidebarOpen ? 'visible' : 'hidden', opacity: sidebarOpen ? 1 : 0 }}
        onClick={() => setSidebarOpen(false)}
      />

      <aside
        className={`
          fixed inset-y-0 left-0 z-30 flex flex-col bg-sidebar-blue
          transform transition-[transform,width] duration-200 ease-out
          lg:transform-none w-[280px]
          ${sidebarCollapsed ? 'lg:w-[72px]' : 'lg:w-[280px]'}
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
        style={{ boxShadow: '1px 0 0 0 rgba(255,255,255,0.04), 8px 0 32px rgba(0,0,0,0.16)' }}
      >
        <div className="relative border-b border-white/10 shrink-0">
          <button
            type="button"
            onClick={toggleSidebarCollapsed}
            className={`hidden lg:flex absolute z-10 p-1.5 rounded-lg text-white/80 hover:bg-white/10 hover:text-white transition-colors ${
              sidebarCollapsed ? 'top-2 left-1/2 -translate-x-1/2' : 'top-2.5 right-2'
            }`}
            aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {sidebarCollapsed ? (
              <FiChevronRight className="w-5 h-5 shrink-0" aria-hidden />
            ) : (
              <FiChevronLeft className="w-5 h-5 shrink-0" aria-hidden />
            )}
          </button>
          <div
            className={`flex flex-col items-center justify-center gap-1 py-3 ${
              sidebarCollapsed ? 'lg:px-2 lg:pt-7 lg:pb-2' : 'px-4 lg:pr-10'
            }`}
          >
            <img
              src="https://res.cloudinary.com/dfqdb1xws/image/upload/v1773394005/GuideXpert_Logo_inbaz5.png"
              alt="GuideXpert"
              className={`h-7 w-auto object-contain ${sidebarCollapsed ? 'lg:h-6' : ''}`}
            />
            <p className={`text-[0.5625rem] font-semibold text-white/70 uppercase tracking-wider text-center leading-tight ${sidebarCollapsed ? 'lg:hidden' : ''}`}>
              GuideXpert Admin
            </p>
          </div>
        </div>

        <nav
          className={`sidebar-nav-scroll flex-1 min-h-0 overflow-y-auto overscroll-y-contain py-3 flex flex-col ${sidebarCollapsed ? 'lg:px-2' : 'px-3'}${sidebarScrollActive ? ' sidebar-nav-scroll--active' : ''}`}
          onScroll={onSidebarScroll}
        >
          <SidebarModeToggle
            mode={activeSidebarMode}
            onChange={handleSidebarModeChange}
            showToggle={showSidebarToggle}
            sidebarCollapsed={sidebarCollapsed}
          />

          <div>
            <p className={`mb-1.5 text-[0.6875rem] font-semibold text-white/50 uppercase tracking-wider ${sidebarCollapsed ? 'lg:hidden' : ''}`}>
              {activeSidebarMode === 'students' ? 'GuideXpert Students' : 'GuideXpert Counsellors'}
            </p>
            <div className="space-y-0.5">
              {sidebarNavItems.map(({ to, label, icon }) => (
                <SidebarNavLink
                  key={to}
                  to={to}
                  label={label}
                  icon={icon}
                  sidebarCollapsed={sidebarCollapsed}
                  end={to === '/admin/dashboard'}
                  onNavigate={closeMobileSidebar}
                />
              ))}
            </div>
          </div>
        </nav>
      </aside>

      <div
        className={`flex-1 flex flex-col min-w-0 min-h-0 transition-[margin] duration-200 ease-out ${
          sidebarCollapsed ? 'lg:ml-[72px]' : 'lg:ml-[280px]'
        }`}
      >
        <AdminDashboardProvider>
          <AdminChrome
            sidebarOpen={sidebarOpen}
            setSidebarOpen={setSidebarOpen}
            initials={initials}
            username={user?.username}
            onLogout={handleLogout}
            showSettings={showSettings}
          />
        </AdminDashboardProvider>
      </div>
    </div>
  );
}

function AdminProfileMenu({ initials, username, onLogout, showSettings }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onDocClick = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    const onEsc = (e) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onEsc);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onEsc);
    };
  }, [open]);

  return (
    <div
      ref={rootRef}
      className="relative pl-2 border-l border-gray-200"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-lg p-1 pr-2 hover:bg-gray-100 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-navy focus:ring-offset-2"
        aria-expanded={open}
        aria-haspopup="true"
        aria-label="Account menu"
      >
        <div className="w-9 h-9 rounded-full bg-primary-navy flex items-center justify-center shrink-0 ring-2 ring-gray-100">
          <span className="text-white text-xs font-semibold">{initials}</span>
        </div>
        <p className="text-sm font-semibold text-gray-800 truncate max-w-[120px] hidden sm:block">
          {username || 'Admin'}
        </p>
      </button>

      <div
        className={`absolute right-0 top-full z-50 pt-1.5 transition-all duration-150 ${
          open ? 'visible opacity-100 translate-y-0' : 'invisible opacity-0 -translate-y-1 pointer-events-none'
        }`}
        role="menu"
      >
        <div className="w-56 rounded-xl border border-gray-200 bg-white shadow-lg py-2">
          <div className="flex items-center gap-3 px-3 py-2.5 border-b border-gray-100">
            <div className="w-9 h-9 rounded-full bg-primary-navy flex items-center justify-center shrink-0 ring-2 ring-gray-100">
              <span className="text-white text-xs font-semibold">{initials}</span>
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-gray-900 truncate">{username || 'Admin'}</p>
              <p className="text-xs text-gray-500">Admin</p>
            </div>
          </div>
          <div className="px-2 pt-1">
            {showSettings && (
              <Link
                to={SETTINGS_ROUTE}
                role="menuitem"
                onClick={() => setOpen(false)}
                className="flex items-center gap-2 w-full px-2 py-2 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <FiSettings className="w-4 h-4 shrink-0 text-gray-500" aria-hidden />
                Settings
              </Link>
            )}
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                onLogout();
              }}
              className="flex items-center gap-2 w-full px-2 py-2 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <FiLogOut className="w-4 h-4 shrink-0 text-gray-500" aria-hidden />
              Log out
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function AdminChrome({ sidebarOpen, setSidebarOpen, initials, username, onLogout, showSettings }) {
  const [filtersOpen, setFiltersOpen] = useState(false);
  const location = useLocation();
  const { dateRange, leadListFilters } = useAdminDateRange();
  const rangeLabel = formatHeaderRange(dateRange.from, dateRange.to);
  const badgeCount = countActiveLeadFilters(leadListFilters);
  const isDashboard = /^\/admin\/dashboard\/?$/.test(location.pathname);

  return (
    <>
      <header className="bg-white border-b border-gray-200 px-4 lg:px-6 py-2 flex flex-wrap items-center justify-between gap-2 shrink-0 shadow-sm">
        <div className="flex items-center gap-2 min-w-0">
          <button
            type="button"
            onClick={() => setSidebarOpen((o) => !o)}
            className="lg:hidden p-1.5 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors"
            aria-label={sidebarOpen ? 'Close menu' : 'Open menu'}
          >
            {sidebarOpen ? <HiX className="w-5 h-5" /> : <HiMenu className="w-5 h-5" />}
          </button>
          <div className="min-w-0">
            <h1 className="text-base lg:text-lg font-bold text-gray-900 leading-snug truncate">
              Sales Analytics Dashboard
            </h1>
            {rangeLabel && (
              <p className="text-xs text-gray-500 truncate hidden sm:block mt-0.5">{rangeLabel}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <AdminFiltersTriggerButton onClick={() => setFiltersOpen(true)} activeCount={badgeCount} />
          <Link
            to="/admin/export"
            className="inline-flex items-center gap-2 h-9 px-4 rounded-lg border border-gray-300 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <FiDownload className="w-4 h-4" aria-hidden />
            Export
          </Link>
          <button
            type="button"
            className="p-2 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors"
            aria-label="Notifications"
          >
            <FiBell className="w-5 h-5" aria-hidden />
          </button>
          <AdminProfileMenu
            initials={initials}
            username={username}
            onLogout={onLogout}
            showSettings={showSettings}
          />
        </div>
      </header>
      <AdminFiltersPanel open={filtersOpen} onClose={() => setFiltersOpen(false)} />
      <main
        className={`grow bg-gray-50 ${
          location.pathname.includes('/admin/human-copilot')
            ? 'flex min-h-0 flex-col overflow-hidden p-4 lg:p-6'
            : `overflow-auto scrollbar-hide px-4 pb-3 lg:px-6 lg:pb-4 ${isDashboard ? 'pt-0' : 'pt-2 lg:pt-3'}`
        }`}
      >
        <Outlet />
      </main>
    </>
  );
}

import { createElement, useState, useCallback, useEffect } from 'react';
import { useSidebarScrollbarActivity } from '../../hooks/useSidebarScrollbarActivity';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useCounsellorAuth } from '../../contexts/CounsellorAuthContext';
import {
  FiLayout,
  FiUsers,
  FiBookOpen,
  FiCalendar,
  FiTool,
  FiTrendingUp,
  FiSettings,
  FiBell,
  FiHelpCircle,
  FiChevronDown,
  FiLogOut,
  FiUser,
  FiSearch,
  FiLink,
  FiRadio,
} from 'react-icons/fi';
import { HiMenu as HiMenuIcon, HiX as HiXIcon } from 'react-icons/hi';
import { useCounsellorProfile } from '../../contexts/CounsellorProfileContext';
import { getAnnouncements, getAnnouncement, markAnnouncementRead, markAllAnnouncementsRead } from '../../utils/counsellorApi';
import { formatAnnouncementDescription } from '../../utils/formatAnnouncementDescription';
import NotificationDropdown from './NotificationDropdown';
import SlideOverPanel from './SlideOverPanel';
import { ContentSkeleton } from '../UI/Skeleton';
import TrainingSidebar from './TrainingSidebar';

const primaryNav = [
  { to: '/counsellor/dashboard', label: 'Dashboard', icon: FiLayout },
  { to: '/counsellor/students', label: 'Students', icon: FiUsers },
  { to: '/counsellor/admissions', label: 'Admissions', icon: FiBookOpen },
  { to: '/counsellor/sessions', label: 'Sessions', icon: FiCalendar },
];
const secondaryNav = [
  { to: '/counsellor/announcements-feed', label: 'Announcements Feed', icon: FiRadio },
  { to: '/counsellor/tools', label: 'Tools', icon: FiTool },
  { to: '/counsellor/marketing', label: 'Marketing', icon: FiTrendingUp },
];
const collegeNav = [
  { to: '/counsellor/college-referrals', label: 'College Referrals', icon: FiLink },
  { to: '/counsellor/know-about-colleges', label: 'Know About Colleges', icon: FiBookOpen },
];
const pageMeta = {
  '/counsellor/dashboard': { title: 'Dashboard', subtitle: 'Overview of your counseling practice' },
  '/counsellor/students': { title: 'Students', subtitle: 'Manage student profiles and documents' },
  '/counsellor/admissions': { title: 'Admissions', subtitle: 'Track college applications and deadlines' },
  '/counsellor/sessions': { title: 'Sessions', subtitle: 'Schedule and manage counseling sessions' },
  '/counsellor/announcements-feed': { title: 'Announcements', subtitle: 'Stay updated with the latest updates and important notices.' },
  '/counsellor/tools': { title: 'Tools', subtitle: 'Assessment and prediction tools' },
  '/counsellor/tools/college-predictor': { title: 'College Predictor', subtitle: 'Select an exam to get started' },
  '/counsellor/marketing': { title: 'Marketing', subtitle: 'Download seasonal, official, and customisable marketing posters' },
  '/counsellor/college-referrals': { title: 'College Referrals', subtitle: 'Know about referrals and share partner college links' },
  '/counsellor/know-about-colleges': { title: 'Know About Colleges', subtitle: 'Browse partner colleges and referral information' },
  '/counsellor/certificate': { title: 'Poster', subtitle: 'Download your certified counsellor poster' },
  '/counsellor/training': { title: 'Counsellor Training', subtitle: 'Complete modules to earn your certificate' },
  '/counsellor/settings': { title: 'Settings', subtitle: 'Manage your account and preferences' },
  '/counsellor/help': { title: 'Help & Support', subtitle: 'Get in touch with our team' },
};

const PRIORITY_BADGE = {
  normal: 'bg-primary-blue-100 text-primary-navy',
  important: 'bg-orange-100 text-orange-800',
  urgent: 'bg-red-100 text-red-800',
};

export default function CounsellorLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notificationFilter, setNotificationFilter] = useState('all');
  const [announcements, setAnnouncements] = useState([]);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailAnnouncement, setDetailAnnouncement] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useCounsellorAuth();
  const { displayName: profileName, email: profileEmail, initials: profileInitials } = useCounsellorProfile();
  const displayName = profileName || user?.name || 'Counsellor';
  const displayEmail = profileEmail || user?.email || '';
  const initials = profileInitials || displayName.split(/\s+/).map((n) => n[0]).slice(0, 2).join('').toUpperCase() || 'C';

  const currentPage =
    pageMeta[location.pathname] ||
    (location.pathname.startsWith('/counsellor/tools/college-predictor/')
      ? { title: 'College Predictor', subtitle: 'Configure filters and view results' }
      : location.pathname.startsWith('/counsellor/college-referrals/')
        ? { title: 'College Referrals', subtitle: 'Know about referrals, fee details, and share referral links' }
      : location.pathname.startsWith('/counsellor/know-about-colleges/')
        ? { title: 'Know About Colleges', subtitle: 'Browse partner colleges, fee details, and referral information' }
      : { title: 'Counsellor Portal', subtitle: '' });

  const handleLogout = () => {
    setProfileOpen(false);
    logout();
    navigate('/counsellor/login', { replace: true });
  };

  const fetchNotifications = useCallback(async () => {
    setNotificationsLoading(true);
    const res = await getAnnouncements();
    setNotificationsLoading(false);
    setAnnouncements(Array.isArray(res.data?.data) ? res.data.data : []);
  }, []);

  const openNotifications = () => {
    setProfileOpen(false);
    if (!notificationsOpen) {
      fetchNotifications();
    }
    setNotificationsOpen((o) => !o);
  };

  const handleMarkAllRead = async () => {
    const res = await markAllAnnouncementsRead();
    if (res.success) {
      setAnnouncements((prev) => prev.map((a) => ({ ...a, read: true })));
    }
  };

  const handleNotificationClick = async (item) => {
    const id = String(item.id);
    setNotificationsOpen(false);
    setDetailAnnouncement(null);
    setDetailOpen(true);
    setDetailLoading(true);
    if (!item.read) {
      await markAnnouncementRead(id);
      setAnnouncements((prev) => prev.map((a) => (String(a.id) === id ? { ...a, read: true } : a)));
    }
    const res = await getAnnouncement(id);
    setDetailLoading(false);
    const doc = res.data?.data ?? res.data;
    if (res.success && doc) setDetailAnnouncement(doc);
  };

  const unreadCount = announcements.filter((a) => !a.read).length;
  const [isMobile, setIsMobile] = useState(false);
  const { onScroll: onSidebarScroll, active: sidebarScrollActive } = useSidebarScrollbarActivity();
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)');
    const update = () => setIsMobile(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

  return (
    <div className="counsellor-portal min-h-screen h-screen overflow-hidden bg-[#f1f5f9] flex">
      {/* Sidebar overlay (mobile) */}
      <div
        className="fixed inset-0 bg-black/50 z-20 lg:hidden transition-opacity duration-200"
        aria-hidden={!sidebarOpen}
        style={{ visibility: sidebarOpen ? 'visible' : 'hidden', opacity: sidebarOpen ? 1 : 0 }}
        onClick={() => setSidebarOpen(false)}
      />

      {/* ── Sidebar — Professional Command Panel ── */}
      <aside
        className={`
          fixed inset-y-0 left-0 z-30 w-[280px] flex flex-col
          transform transition-transform duration-200 ease-out
          lg:transform-none
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
        style={{
          background: '#041e30',
          boxShadow: '1px 0 0 0 rgba(255,255,255,0.04), 8px 0 32px rgba(0,0,0,0.16)',
        }}
      >
        {/* Brand block — logo + Certified Counsellor Dashboard */}
        <Link
          to="/become-counsellor"
          className="flex w-full flex-col items-start justify-center py-5 border-b border-white/5 hover:bg-white/[0.02] transition-colors duration-200"
          aria-label="GuideXpert Home"
        >
          <div className="w-full flex flex-col items-center justify-center py-3 px-4 gap-1.5">
            <img
              src="https://res.cloudinary.com/dfqdb1xws/image/upload/v1773394005/GuideXpert_Logo_inbaz5.png"
              alt="GuideXpert"
              className="h-8 w-auto object-contain"
            />
            <p className="text-[0.5625rem] font-semibold text-slate-400 uppercase tracking-wider text-center leading-tight">
              Certified Counsellor Dashboard
            </p>
          </div>
        </Link>

        {/* Navigation — iOS-style overlay scrollbar (see .sidebar-nav-scroll in index.css) */}
        <nav
          className={`sidebar-nav-scroll flex-1 min-h-0 overflow-y-auto overscroll-y-contain py-5 flex flex-col gap-6 px-3${sidebarScrollActive ? ' sidebar-nav-scroll--active' : ''}`}
          onScroll={onSidebarScroll}
        >
          {/* Main */}
          <div>
            <p className="px-3 mb-2 text-[0.6875rem] font-semibold text-slate-500 uppercase tracking-wider">Main</p>
            <div className="space-y-0.5">
              {primaryNav.map(({ to, label, icon: Icon }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={to === '/counsellor/dashboard'}
                  onClick={() => setSidebarOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2.5 rounded-lg text-[0.8125rem] font-medium transition-all duration-200 ${
                      isActive
                        ? 'bg-primary-navy/90 text-white shadow-[inset_3px_0_0_0_#4d8ec7]'
                        : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
                    }`
                  }
                >
                  {createElement(Icon, { className: 'w-[1.125rem] h-[1.125rem] shrink-0 opacity-90' })}
                  <span>{label}</span>
                </NavLink>
              ))}
            </div>
          </div>

          {/* Tools & growth */}
          <div>
            <p className="px-3 mb-2 text-[0.6875rem] font-semibold text-slate-500 uppercase tracking-wider">Tools & growth</p>
            <div className="space-y-0.5">
              {secondaryNav.map(({ to, label, icon: Icon }) => (
                <NavLink
                  key={to}
                  to={to}
                  onClick={() => setSidebarOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2.5 rounded-lg text-[0.8125rem] font-medium transition-all duration-200 ${
                      isActive
                        ? 'bg-primary-navy/90 text-white shadow-[inset_3px_0_0_0_#4d8ec7]'
                        : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
                    }`
                  }
                >
                  {createElement(Icon, { className: 'w-[1.125rem] h-[1.125rem] shrink-0 opacity-90' })}
                  <span>{label}</span>
                </NavLink>
              ))}
            </div>
          </div>

          {/* Know about colleges */}
          <div>
            <p className="px-3 mb-2 text-[0.6875rem] font-semibold text-slate-500 uppercase tracking-wider">Know about colleges</p>
            <div className="space-y-0.5">
              {collegeNav.map(({ to, label, icon: Icon }) => (
                <NavLink
                  key={to}
                  to={to}
                  onClick={() => setSidebarOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2.5 rounded-lg text-[0.8125rem] font-medium transition-all duration-200 ${
                      isActive
                        ? 'bg-primary-navy/90 text-white shadow-[inset_3px_0_0_0_#4d8ec7]'
                        : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
                    }`
                  }
                >
                  {createElement(Icon, { className: 'w-[1.125rem] h-[1.125rem] shrink-0 opacity-90' })}
                  <span>{label}</span>
                </NavLink>
              ))}
            </div>
          </div>

          {/* Counsellor Training — single link; full progress on /counsellor/training */}
          <div className="shrink-0">
            <TrainingSidebar onCloseSidebar={() => setSidebarOpen(false)} />
          </div>

        </nav>
      </aside>

      {/* ── Main Content Area ── */}
      <div className="flex-1 flex flex-col min-w-0 min-h-0 lg:ml-[280px]">
        {/* Top Navbar: search, profile/settings */}
        <header className="bg-white border-b border-gray-200 shrink-0 shadow-sm" role="banner">
          <div className="flex items-center justify-between gap-3 px-4 lg:px-6 py-3 min-h-[3.25rem]">
            {/* Left: Mobile menu + Page title */}
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <button
                type="button"
                onClick={() => setSidebarOpen((o) => !o)}
                className="lg:hidden p-2 -ml-1 rounded-lg text-gray-600 hover:bg-gray-100 shrink-0 transition-colors"
                aria-label={sidebarOpen ? 'Close menu' : 'Open menu'}
              >
                {sidebarOpen ? <HiXIcon className="w-6 h-6" /> : <HiMenuIcon className="w-6 h-6" />}
              </button>
              <div className="hidden sm:block min-w-0 ml-1">
                <h1 className="text-lg font-bold text-gray-900 leading-tight truncate">
                  {currentPage.title}
                </h1>
                {currentPage.subtitle && (
                  <p className="text-xs text-gray-500 mt-0.5 leading-snug truncate">
                    {currentPage.subtitle}
                  </p>
                )}
              </div>
            </div>

            {/* Center: Search bar - prominent, professional (visible from sm up) */}
            <div className="hidden sm:flex items-center flex-1 max-w-md mx-4 min-w-0">
              <label htmlFor="counsellor-nav-search" className="sr-only">Search</label>
              <div className="relative w-full">
                <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" aria-hidden />
                <input
                  id="counsellor-nav-search"
                  type="search"
                  placeholder="Search students, tools..."
                  autoComplete="off"
                  className="w-full pl-9 pr-4 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-navy/20 focus:border-primary-navy/40 focus:bg-white placeholder:text-gray-400 transition-colors"
                />
              </div>
            </div>

            {/* Right: Nav items - Notifications, Help, Profile, Settings, Account */}
            <nav className="flex items-center gap-0.5 relative shrink-0" aria-label="Account and tools">
            {/* Notifications */}
            <button
              type="button"
              onClick={openNotifications}
              className="relative p-2 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-navy/30 focus-visible:ring-offset-2"
              aria-label="Notifications"
              aria-expanded={notificationsOpen}
            >
              <FiBell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 min-w-[1.125rem] h-4.5 px-1 flex items-center justify-center bg-red-500 text-white text-[0.6875rem] font-bold rounded-full ring-2 ring-white">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </button>
            {notificationsOpen && (
              <NotificationDropdown
                isOpen={notificationsOpen}
                onClose={() => setNotificationsOpen(false)}
                announcements={announcements}
                loading={notificationsLoading}
                filter={notificationFilter}
                onFilterChange={setNotificationFilter}
                onMarkAllRead={handleMarkAllRead}
                onItemClick={handleNotificationClick}
                unreadCount={unreadCount}
                isMobile={isMobile}
              />
            )}

            {/* Help */}
            <button
              type="button"
              onClick={() => { setProfileOpen(false); navigate('/counsellor/help'); }}
              className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors hidden sm:block focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-navy/30 focus-visible:ring-offset-2"
              aria-label="Help"
            >
              <FiHelpCircle className="w-5 h-5" />
            </button>

            {/* Divider */}
            <div className="w-px h-6 bg-gray-200 mx-0.5 hidden md:block" />

            {/* Profile (nav link) */}
            <NavLink
              to="/counsellor/settings"
              onClick={() => setProfileOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-navy/30 focus-visible:ring-offset-2 ${
                  isActive ? 'text-primary-navy bg-primary-navy/10' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-800'
                }`
              }
              aria-label="Profile"
            >
              <FiUser className="w-4 h-4 shrink-0" />
              <span className="hidden md:inline">Profile</span>
            </NavLink>

            {/* Settings (nav link) */}
            <NavLink
              to="/counsellor/settings"
              onClick={() => setProfileOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-navy/30 focus-visible:ring-offset-2 ${
                  isActive ? 'text-primary-navy bg-primary-navy/10' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-800'
                }`
              }
              aria-label="Settings"
            >
              <FiSettings className="w-4 h-4 shrink-0" />
              <span className="hidden md:inline">Settings</span>
            </NavLink>

            {/* Divider before avatar */}
            <div className="w-px h-6 bg-gray-200 mx-0.5 hidden sm:block" />

            {/* Profile Dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setProfileOpen((o) => !o)}
                className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-gray-50 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-navy/30 focus-visible:ring-offset-2"
                aria-label="Account menu"
                aria-expanded={profileOpen}
              >
                <div className="w-9 h-9 rounded-full bg-primary-navy flex items-center justify-center ring-2 ring-gray-100">
                  <span className="text-white text-xs font-bold">{initials}</span>
                </div>
                <div className="hidden md:block text-left">
                  <p className="text-sm font-semibold text-gray-800 leading-tight">{displayName}</p>
                  <div className="flex items-center gap-1 mt-0.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
                    <span className="text-[0.6875rem] text-emerald-600 font-semibold">Certified</span>
                  </div>
                </div>
                <FiChevronDown className="w-4 h-4 text-gray-400 hidden md:block" />
              </button>

              {/* Dropdown */}
              {profileOpen && (
                <>
                  <div className="fixed inset-0 z-30" onClick={() => setProfileOpen(false)} />
                  <div className="absolute right-0 top-full mt-1.5 w-52 bg-white rounded-xl py-1.5 z-40" style={{ boxShadow: '0 4px 24px rgba(0,0,0,0.12), 0 1px 4px rgba(0,0,0,0.08)' }}>
                    <div className="px-3 py-2 border-b border-gray-100 mb-1">
                      <p className="text-sm font-semibold text-gray-900">{displayName}</p>
                      <p className="text-xs text-gray-500">{displayEmail || '—'}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => { setProfileOpen(false); navigate('/counsellor/settings'); }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors text-left"
                    >
                      <FiUser className="w-4 h-4 text-gray-400" /> My Profile
                    </button>
                    <Link
                      to="/counsellor/settings"
                      onClick={() => setProfileOpen(false)}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      <FiSettings className="w-4 h-4 text-gray-400" /> Settings
                    </Link>
                    <Link
                      to="/counsellor/help"
                      onClick={() => setProfileOpen(false)}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      <FiHelpCircle className="w-4 h-4 text-gray-400" /> Help & Support
                    </Link>
                    {user && (
                      <>
                        <div className="border-t border-gray-100 my-1" />
                        <button type="button" onClick={handleLogout} className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors">
                          <FiLogOut className="w-4 h-4" /> Sign Out
                        </button>
                      </>
                    )}
                  </div>
                </>
              )}
            </div>
          </nav>
          </div>
        </header>

        {/* Page content */}
        <main className="grow p-4 lg:p-6 overflow-auto">
          <Outlet />
        </main>
      </div>

      {/* Full announcement drawer */}
      <SlideOverPanel
        isOpen={detailOpen}
        onClose={() => { setDetailOpen(false); setDetailAnnouncement(null); }}
        title={detailAnnouncement?.title || 'Announcement'}
      >
        {detailLoading ? (
          <div className="p-6"><ContentSkeleton lines={5} /></div>
        ) : detailAnnouncement ? (
          <div className="space-y-5">
            <div className="flex flex-wrap items-center gap-2">
              <span className={`inline-flex px-2.5 py-1 rounded-lg text-xs font-semibold capitalize ${PRIORITY_BADGE[detailAnnouncement.priority] || PRIORITY_BADGE.normal}`}>
                {detailAnnouncement.priority}
              </span>
              <span className="text-sm text-gray-500">
                {new Date(detailAnnouncement.createdAt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}
              </span>
            </div>
            <div className="border-t border-gray-200 pt-4">
              <div
                className="prose prose-sm max-w-none text-gray-700 prose-p:leading-relaxed prose-ul:my-2 prose-li:my-0.5 prose-a:text-primary-navy prose-a:underline"
                dangerouslySetInnerHTML={{ __html: formatAnnouncementDescription(detailAnnouncement.description) }}
              />
            </div>
          </div>
        ) : (
          <div className="py-12 text-center text-gray-500 text-sm">Could not load announcement.</div>
        )}
      </SlideOverPanel>
    </div>
  );
}

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import {
  FiBookOpen,
  FiBriefcase,
  FiCalendar,
  FiChevronDown,
  FiChevronRight,
  FiGrid,
  FiHelpCircle,
  FiMenu,
  FiSearch,
  FiTarget,
  FiUser,
  FiX,
} from 'react-icons/fi';
import { LuGraduationCap, LuScale } from 'react-icons/lu';
import { getWorkspaceMegaMenus } from '../../../constants/studentWorkspaceNavMenus';
import { C360, LAYOUT } from './careers360Theme';
import { useStudentAuthRequired } from '../../../contexts/StudentAuthContext';
import StudentUpdatesBell from '../StudentUpdatesBell';
import { getStudentWorkspaceUpdatesFeed } from '../../../utils/api';
import {
  countUnreadUpdates,
  markUpdatesSeen,
} from '../../../utils/studentWorkspaceUpdates';

const LOGO_URL =
  'https://res.cloudinary.com/dfqdb1xws/image/upload/v1773394627/GuideXpert_Logo_2_icepsv.png';

const MENU_ICONS = {
  rank: FiTarget,
  college: LuGraduationCap,
  fit: FiBookOpen,
  compare: LuScale,
  deadlines: FiCalendar,
  more: FiGrid,
};

function MegaMenuPanel({ menu, activePanelId, onPanelHover, onNavigate }) {
  const activePanel = menu.panels.find((p) => p.id === activePanelId) || menu.panels[0];

  return (
    <div className="flex min-h-[280px] overflow-hidden rounded-b-lg border border-t-0 border-[#e5e7eb] bg-white shadow-[0_12px_32px_rgba(20,30,60,0.12)]">
      {/* Left sidebar */}
      <aside className="w-[240px] shrink-0 bg-[#f7f8fa] py-2">
        <ul role="list">
          {menu.panels.map((panel) => {
            const isActive = panel.id === activePanel.id;
            return (
              <li key={panel.id}>
                <button
                  type="button"
                  onMouseEnter={() => onPanelHover(panel.id)}
                  className={`flex w-full items-center justify-between gap-2 border-l-[3px] px-4 py-3 text-left text-sm transition ${
                    isActive
                      ? 'border-[#f27921] bg-[#eceef2] font-medium text-[#222]'
                      : 'border-transparent text-[#444] hover:bg-[#eceef2]/70'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    {panel.label}
                    {panel.badge ? (
                      <span className="rounded bg-emerald-500 px-1.5 py-px text-[10px] font-bold uppercase tracking-wide text-white">
                        {panel.badge}
                      </span>
                    ) : null}
                  </span>
                  <FiChevronRight
                    className={`h-3.5 w-3.5 shrink-0 ${isActive ? 'text-[#888]' : 'text-transparent'}`}
                    aria-hidden
                  />
                </button>
              </li>
            );
          })}
        </ul>
      </aside>

      {/* Right multi-column links */}
      <div className="flex min-w-0 flex-1 flex-col px-8 py-5">
        <div
          className="grid flex-1 gap-x-10 gap-y-2"
          style={{ gridTemplateColumns: `repeat(${Math.max(activePanel.columns.length, 1)}, minmax(0, 1fr))` }}
        >
          {activePanel.columns.map((column, colIdx) => (
            <ul key={colIdx} className="space-y-0.5">
              {column.map((link) => (
                <li key={link.to + link.label}>
                  <Link
                    to={link.to}
                    onClick={onNavigate}
                    className="block py-1.5 text-sm text-[#333] transition hover:text-[#f27921]"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          ))}
        </div>
        {activePanel.viewAll ? (
          <div className="mt-4 border-t border-[#eee] pt-3">
            <Link
              to={activePanel.viewAll.to}
              onClick={onNavigate}
              className="inline-flex items-center gap-1 text-sm font-medium text-[#2563eb] hover:underline"
            >
              {activePanel.viewAll.label}
              <FiChevronRight className="h-3.5 w-3.5" aria-hidden />
            </Link>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export default function Careers360Navbar({
  searchTerm = '',
  onSearchChange,
  onSearchFocus,
  onSearchBlur,
  onSearchKeyDown,
}) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [openMenuKey, setOpenMenuKey] = useState(null);
  const [activePanelByMenu, setActivePanelByMenu] = useState({});
  const [updatesOpen, setUpdatesOpen] = useState(false);
  const [updates, setUpdates] = useState([]);
  const [updatesLoading, setUpdatesLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const { pathname } = useLocation();
  const { isAuthenticated, openAuthModal, session, profile } = useStudentAuthRequired();

  const menus = useMemo(() => getWorkspaceMegaMenus(), []);
  const displayName = profile?.fullName || session?.fullName || 'Profile';

  const closeActions = useCallback(() => {
    setMobileOpen(false);
    setOpenMenuKey(null);
    setUpdatesOpen(false);
  }, []);

  useEffect(() => {
    closeActions();
  }, [pathname, closeActions]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setUpdatesLoading(true);
      const res = await getStudentWorkspaceUpdatesFeed({ placement: 'navbar', limit: 12 });
      if (cancelled) return;
      const items = res.success ? res.data?.data?.items || [] : [];
      setUpdates(items);
      setUnreadCount(countUnreadUpdates(items));
      setUpdatesLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleUpdatesToggle = () => {
    setUpdatesOpen((prev) => {
      const next = !prev;
      if (next) {
        markUpdatesSeen(updates.map((u) => u.id));
        setUnreadCount(0);
      }
      return next;
    });
  };

  const openMenu = menus.find((m) => m.key === openMenuKey);

  const handleMenuEnter = (key) => {
    setOpenMenuKey(key);
    setActivePanelByMenu((prev) => {
      if (prev[key]) return prev;
      const menu = menus.find((m) => m.key === key);
      return { ...prev, [key]: menu?.panels[0]?.id };
    });
  };

  const menuOpen = Boolean(openMenu) || mobileOpen;

  return (
    <>
      {menuOpen ? (
        <button
          type="button"
          aria-label="Close menu"
          className="fixed inset-0 z-40 bg-[#041e30]/25 backdrop-blur-[3px] transition-opacity"
          onClick={closeActions}
        />
      ) : null}

      <header className="sticky top-0 z-50 bg-white shadow-[0_1px_0_#e8eaed]" role="banner">
      <div className="border-b border-[#eceef2]">
        <div className={`${LAYOUT.container} flex h-[3.75rem] items-center gap-4 lg:h-16 lg:gap-6`}>
          <Link to="/" className="shrink-0" aria-label="GuideXpert students workspace">
            <img src={LOGO_URL} alt="GuideXpert" className="h-7 w-auto object-contain lg:h-8" />
          </Link>

          <div className="hidden min-w-0 flex-1 md:block">
            <div className="relative mx-auto w-full max-w-xl lg:max-w-2xl">
              <input
                type="search"
                value={searchTerm}
                onChange={(e) => onSearchChange?.(e.target.value)}
                onFocus={onSearchFocus}
                onBlur={onSearchBlur}
                onKeyDown={onSearchKeyDown}
                placeholder="Search Colleges, Exams, Courses & more"
                className="w-full rounded-lg border border-[#d8dce6] bg-[#f7f8fb] py-2.5 pl-4 pr-10 text-sm text-[#333] placeholder:text-[#9aa0ae] focus:border-[#f27921] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#f27921]/15"
              />
              <FiSearch className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8b90a0]" />
            </div>
          </div>

          <div className="ml-auto flex items-center gap-1 sm:gap-2">
            <StudentUpdatesBell
              items={updates}
              unreadCount={unreadCount}
              open={updatesOpen}
              loading={updatesLoading}
              onToggle={handleUpdatesToggle}
              onClose={() => setUpdatesOpen(false)}
              onOpenItem={(item) => {
                markUpdatesSeen([item.id]);
                setUnreadCount((c) => Math.max(0, c - 1));
                setUpdatesOpen(false);
              }}
            />
            <Link
              to="/students/rank-predictor"
              className="hidden h-9 w-9 items-center justify-center rounded-full text-[#666] transition hover:bg-[#f5f6f8] hover:text-[#333] sm:inline-flex"
              aria-label="Help with predictors"
              title="Rank predictors"
            >
              <FiHelpCircle className="h-5 w-5" />
            </Link>
            <Link
              to="/students/predictors"
              className="hidden h-9 w-9 items-center justify-center rounded-full text-[#666] transition hover:bg-[#f5f6f8] hover:text-[#333] md:inline-flex"
              aria-label="All predictors"
              title="All predictors"
            >
              <FiBriefcase className="h-5 w-5" />
            </Link>
            {isAuthenticated ? (
              <Link
                to="/students/profile"
                className="inline-flex items-center gap-2 rounded-md border border-[#d0d7e1] bg-white px-3 py-2 text-sm font-semibold text-[#041e30] transition hover:border-[#f27921]/50 hover:bg-[#fff8f3]"
                title="My profile"
              >
                <FiUser className="h-4 w-4 text-[#f27921]" aria-hidden />
                <span className="hidden max-w-[7rem] truncate sm:inline">{displayName}</span>
              </Link>
            ) : (
              <button
                type="button"
                onClick={() => openAuthModal('login')}
                className="rounded-md px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:opacity-90"
                style={{ backgroundColor: C360.orange }}
              >
                Login
              </button>
            )}
            <button
              type="button"
              className="ml-1 flex h-10 w-10 items-center justify-center rounded-lg text-[#444] hover:bg-[#f5f6f8] lg:hidden"
              onClick={() => setMobileOpen((o) => !o)}
              aria-label="Menu"
              aria-expanded={mobileOpen}
            >
              {mobileOpen ? <FiX className="h-5 w-5" /> : <FiMenu className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Category bar + mega menu */}
      <div
        className="relative hidden lg:block"
        onMouseLeave={() => setOpenMenuKey(null)}
      >
        <div className="border-b border-[#eceef2]">
          <div className={LAYOUT.container}>
            <nav
              className="flex items-stretch justify-center gap-1 overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden xl:gap-2"
              aria-label="Workspace categories"
            >
              {menus.map((menu) => {
                const Icon = MENU_ICONS[menu.key] || FiGrid;
                const isOpen = openMenuKey === menu.key;
                return (
                  <div
                    key={menu.key}
                    className="relative shrink-0"
                    onMouseEnter={() => handleMenuEnter(menu.key)}
                  >
                    <NavLink
                      to={menu.hub}
                      className={({ isActive }) =>
                        `inline-flex items-center gap-1.5 border-b-[3px] px-3 py-3 text-[13px] font-medium transition xl:px-3.5 ${
                          isActive || isOpen
                            ? 'border-[#f27921] text-[#f27921]'
                            : 'border-transparent text-[#444] hover:text-[#f27921]'
                        }`
                      }
                    >
                      <Icon className="h-4 w-4 shrink-0 opacity-80" aria-hidden />
                      <span className="whitespace-nowrap">{menu.label}</span>
                      <FiChevronDown className="h-3.5 w-3.5 opacity-50" aria-hidden />
                    </NavLink>
                  </div>
                );
              })}
            </nav>
          </div>
        </div>

        {openMenu ? (
          <div className="absolute left-0 right-0 top-full z-50">
            <div className={LAYOUT.container}>
              <MegaMenuPanel
                menu={openMenu}
                activePanelId={activePanelByMenu[openMenu.key] || openMenu.panels[0]?.id}
                onPanelHover={(panelId) =>
                  setActivePanelByMenu((prev) => ({ ...prev, [openMenu.key]: panelId }))
                }
                onNavigate={closeActions}
              />
            </div>
          </div>
        ) : null}
      </div>

      {mobileOpen ? (
        <div className="border-b border-[#eceef2] bg-white px-5 py-4 lg:hidden">
          <div className="relative mb-4">
            <input
              type="search"
              value={searchTerm}
              onChange={(e) => onSearchChange?.(e.target.value)}
              onKeyDown={onSearchKeyDown}
              placeholder="Search Colleges, Exams, Courses & more"
              className="w-full rounded-lg border border-[#d8dce6] bg-[#f7f8fb] py-2.5 pl-3 pr-10 text-sm"
            />
            <FiSearch className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8b90a0]" />
          </div>
          {menus.map((menu) => {
            const seen = new Set();
            const links = menu.panels
              .flatMap((panel) => panel.columns.flat())
              .filter((item) => {
                if (seen.has(item.to)) return false;
                seen.add(item.to);
                return true;
              });
            return (
              <div key={menu.key} className="mb-4 border-b border-[#f0f1f4] pb-3 last:mb-0 last:border-0 last:pb-0">
                <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-[#999]">{menu.label}</p>
                {links.map((item) => (
                  <Link
                    key={`${menu.key}-${item.to}`}
                    to={item.to}
                    className="block py-2 text-sm text-[#444]"
                    onClick={closeActions}
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
            );
          })}
        </div>
      ) : null}
    </header>
    </>
  );
}

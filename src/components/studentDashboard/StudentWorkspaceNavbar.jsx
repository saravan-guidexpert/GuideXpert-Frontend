import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { FiChevronDown, FiMenu, FiX } from 'react-icons/fi';
import {
  compareCollegesNavItems,
  fitTestNavItems,
  getRankPredictorNavItems,
} from '../../constants/studentWorkspaceNavMenus';

const LOGO_URL =
  'https://res.cloudinary.com/dfqdb1xws/image/upload/v1773394627/GuideXpert_Logo_2_icepsv.png';

const DROPDOWN_IDS = {
  predictors: 'predictors',
  fitTests: 'fitTests',
  compare: 'compare',
};

function isPredictorsSectionActive(pathname) {
  return (
    pathname === '/students/rank-predictor' || pathname.startsWith('/students/rank-predictor/')
  );
}

function isFitTestsSectionActive(pathname) {
  return (
    pathname === '/students/tests' ||
    pathname === '/students/course-fit-test' ||
    pathname === '/students/college-fit-test'
  );
}

function isCompareSectionActive(pathname) {
  return pathname === '/students/college-comparison' || pathname.startsWith('/students/college-comparison/');
}

const dropdownAnchorClass = 'absolute left-0 top-full z-[120] min-w-[min(100vw-2rem,260px)] pt-2';
const dropdownFrameClass = 'overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-lg shadow-slate-200/50';
const dropdownScrollClass = 'max-h-[min(70vh,calc(100dvh-6rem))] overflow-y-auto';
const dropdownLinkClass =
  'block px-4 py-2.5 text-sm font-medium text-slate-700 outline-none transition-colors hover:bg-slate-50 hover:text-slate-900 focus-visible:bg-slate-50';

export default function StudentWorkspaceNavbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [openMenuId, setOpenMenuId] = useState(null);
  const { pathname } = useLocation();
  const menuId = useId();
  const navRef = useRef(null);

  const rankPredictorItems = useMemo(() => getRankPredictorNavItems(), []);

  const closeMenu = useCallback(() => setMobileOpen(false), []);
  const closeDropdown = useCallback(() => setOpenMenuId(null), []);

  useEffect(() => {
    const handle = requestAnimationFrame(() => {
      setMobileOpen(false);
      setOpenMenuId(null);
    });
    return () => cancelAnimationFrame(handle);
  }, [pathname]);

  useEffect(() => {
    if (!mobileOpen) return;
    const onKeyDown = (e) => {
      if (e.key === 'Escape') closeMenu();
    };
    document.addEventListener('keydown', onKeyDown);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = prev;
    };
  }, [mobileOpen, closeMenu]);

  useEffect(() => {
    if (!openMenuId) return;
    const onKeyDown = (e) => {
      if (e.key === 'Escape') closeDropdown();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [openMenuId, closeDropdown]);

  useEffect(() => {
    if (!openMenuId) return;
    const onPointerDown = (e) => {
      if (navRef.current && !navRef.current.contains(e.target)) {
        setOpenMenuId(null);
      }
    };
    document.addEventListener('pointerdown', onPointerDown, true);
    return () => document.removeEventListener('pointerdown', onPointerDown, true);
  }, [openMenuId]);

  const predictorsActive = isPredictorsSectionActive(pathname);
  const fitTestsActive = isFitTestsSectionActive(pathname);
  const compareActive = isCompareSectionActive(pathname);

  const handleNavLinkClick = useCallback(
    (e, menuId) => {
      if (window.innerWidth >= 640) {
        if (openMenuId !== menuId) {
          e.preventDefault();
          setOpenMenuId(menuId);
        } else {
          e.preventDefault();
          setOpenMenuId(null);
        }
      }
    },
    [openMenuId]
  );

  const navLinkBase =
    'inline-flex items-center gap-0.5 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-900';
  const navLinkActive = 'bg-slate-100 text-slate-900';

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/90 backdrop-blur-md" role="banner">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
        <div className="flex min-w-0 shrink-0 items-center">
          <Link to="/" className="flex min-w-0 items-center gap-2" aria-label="GuideXpert home">
            <img
              src={LOGO_URL}
              alt=""
              className="h-7 max-h-8 w-auto max-w-[min(100%,200px)] object-contain md:h-8"
            />
          </Link>
        </div>

        <div
          ref={navRef}
          className="hidden min-w-0 flex-1 items-center justify-end gap-4 overflow-visible sm:flex"
        >
          <nav className="flex items-center gap-1" aria-label="Student workspace">
            <div
              className="relative"
              onMouseEnter={() => setOpenMenuId(DROPDOWN_IDS.predictors)}
              onMouseLeave={() => setOpenMenuId((id) => (id === DROPDOWN_IDS.predictors ? null : id))}
              onFocusCapture={() => setOpenMenuId(DROPDOWN_IDS.predictors)}
              onBlurCapture={(e) => {
                if (!e.currentTarget.contains(e.relatedTarget)) {
                  setOpenMenuId((id) => (id === DROPDOWN_IDS.predictors ? null : id));
                }
              }}
            >
              <NavLink
                to="/students/rank-predictor"
                className={({ isActive }) =>
                  `${navLinkBase} ${isActive || predictorsActive ? navLinkActive : ''}`
                }
                onClick={(e) => handleNavLinkClick(e, DROPDOWN_IDS.predictors)}
                aria-haspopup="menu"
                aria-expanded={openMenuId === DROPDOWN_IDS.predictors}
              >
                Predictors
                <FiChevronDown className="h-4 w-4 shrink-0 opacity-60" aria-hidden />
              </NavLink>
              <div
                className={`${dropdownAnchorClass} ${openMenuId === DROPDOWN_IDS.predictors ? 'block' : 'hidden'}`}
                role="menu"
                aria-label="Rank predictor exams"
              >
                <div className={dropdownFrameClass}>
                  <div className={dropdownScrollClass}>
                    <ul className="m-0 list-none p-0">
                      {rankPredictorItems.map((item) => (
                        <li key={item.to} role="none">
                          <NavLink
                            role="menuitem"
                            to={item.to}
                            className={({ isActive }) =>
                              `${dropdownLinkClass} ${isActive ? 'bg-emerald-50 text-emerald-700' : ''}`
                            }
                            onClick={() => setOpenMenuId(null)}
                          >
                            {item.label}
                          </NavLink>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            <div
              className="relative"
              onMouseEnter={() => setOpenMenuId(DROPDOWN_IDS.fitTests)}
              onMouseLeave={() => setOpenMenuId((id) => (id === DROPDOWN_IDS.fitTests ? null : id))}
              onFocusCapture={() => setOpenMenuId(DROPDOWN_IDS.fitTests)}
              onBlurCapture={(e) => {
                if (!e.currentTarget.contains(e.relatedTarget)) {
                  setOpenMenuId((id) => (id === DROPDOWN_IDS.fitTests ? null : id));
                }
              }}
            >
              <NavLink
                to="/students/tests"
                className={({ isActive }) =>
                  `${navLinkBase} ${isActive || fitTestsActive ? navLinkActive : ''}`
                }
                onClick={(e) => handleNavLinkClick(e, DROPDOWN_IDS.fitTests)}
                aria-haspopup="menu"
                aria-expanded={openMenuId === DROPDOWN_IDS.fitTests}
              >
                Fit Tests
                <FiChevronDown className="h-4 w-4 shrink-0 opacity-60" aria-hidden />
              </NavLink>
              <div
                className={`${dropdownAnchorClass} ${openMenuId === DROPDOWN_IDS.fitTests ? 'block' : 'hidden'}`}
                role="menu"
                aria-label="Fit tests"
              >
                <div className={dropdownFrameClass}>
                  <div className={dropdownScrollClass}>
                    <ul className="m-0 list-none p-0">
                      {fitTestNavItems.map((item) => (
                        <li key={item.to} role="none">
                          <NavLink
                            role="menuitem"
                            to={item.to}
                            className={({ isActive }) =>
                              `${dropdownLinkClass} ${isActive ? 'bg-emerald-50 text-emerald-700' : ''}`
                            }
                            onClick={() => setOpenMenuId(null)}
                          >
                            {item.label}
                          </NavLink>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            <div
              className="relative"
              onMouseEnter={() => setOpenMenuId(DROPDOWN_IDS.compare)}
              onMouseLeave={() => setOpenMenuId((id) => (id === DROPDOWN_IDS.compare ? null : id))}
              onFocusCapture={() => setOpenMenuId(DROPDOWN_IDS.compare)}
              onBlurCapture={(e) => {
                if (!e.currentTarget.contains(e.relatedTarget)) {
                  setOpenMenuId((id) => (id === DROPDOWN_IDS.compare ? null : id));
                }
              }}
            >
              <NavLink
                to="/students/college-comparison"
                className={({ isActive }) =>
                  `${navLinkBase} ${isActive || compareActive ? navLinkActive : ''}`
                }
                onClick={(e) => handleNavLinkClick(e, DROPDOWN_IDS.compare)}
                aria-haspopup="menu"
                aria-expanded={openMenuId === DROPDOWN_IDS.compare}
              >
                Compare
                <FiChevronDown className="h-4 w-4 shrink-0 opacity-60" aria-hidden />
              </NavLink>
              <div
                className={`${dropdownAnchorClass} ${openMenuId === DROPDOWN_IDS.compare ? 'block' : 'hidden'}`}
                role="menu"
                aria-label="Compare colleges"
              >
                <div className={dropdownFrameClass}>
                  <div className={dropdownScrollClass}>
                    <ul className="m-0 list-none p-0">
                      {compareCollegesNavItems.map((item) => (
                        <li key={item.to} role="none">
                          <NavLink
                            role="menuitem"
                            to={item.to}
                            className={({ isActive }) =>
                              `${dropdownLinkClass} ${isActive ? 'bg-emerald-50 text-emerald-700' : ''}`
                            }
                            onClick={() => setOpenMenuId(null)}
                          >
                            {item.label}
                          </NavLink>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </nav>

          <Link
            to="/students/rank-predictor"
            className="shrink-0 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-500"
          >
            Start prediction
          </Link>
        </div>

        <div className="flex shrink-0 items-center sm:hidden">
          <button
            type="button"
            className="flex h-10 w-10 items-center justify-center rounded-lg text-slate-600 transition hover:bg-slate-100"
            aria-expanded={mobileOpen}
            aria-controls={menuId}
            aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
            onClick={() => setMobileOpen((o) => !o)}
          >
            {mobileOpen ? <FiX className="h-5 w-5" aria-hidden /> : <FiMenu className="h-5 w-5" aria-hidden />}
          </button>
        </div>
      </div>

      {mobileOpen ? (
        <>
          <button
            type="button"
            className="fixed inset-x-0 bottom-0 top-14 z-40 bg-slate-900/20 backdrop-blur-sm sm:hidden"
            aria-label="Close menu"
            onClick={closeMenu}
          />
          <div
            id={menuId}
            className="absolute left-0 right-0 top-full z-50 max-h-[min(70vh,calc(100dvh-5rem))] overflow-y-auto border-b border-slate-200 bg-white shadow-lg sm:hidden"
            role="navigation"
            aria-label="Student workspace"
          >
            <nav className="mx-auto max-w-6xl px-4 py-4">
              <Link
                to="/students/rank-predictor"
                className="mb-4 flex w-full items-center justify-center rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white"
                onClick={closeMenu}
              >
                Start prediction
              </Link>
              <ul className="flex flex-col gap-4">
                <li>
                  <p className="mb-2 px-1 text-xs font-medium uppercase tracking-wider text-slate-400">Predictors</p>
                  <NavLink
                    to="/students/rank-predictor"
                    className={({ isActive }) =>
                      `mb-2 block rounded-lg px-3 py-2.5 text-sm font-medium ${
                        isActive || predictorsActive ? 'bg-slate-100 text-slate-900' : 'text-slate-700'
                      }`
                    }
                    onClick={closeMenu}
                  >
                    All rank predictors
                  </NavLink>
                  <ul className="flex max-h-48 flex-col gap-0.5 overflow-y-auto border-t border-slate-100 pt-2">
                    {rankPredictorItems.map((item) => (
                      <li key={item.to}>
                        <NavLink
                          to={item.to}
                          className={({ isActive }) =>
                            `block rounded-lg px-3 py-2 text-sm ${
                              isActive ? 'bg-emerald-50 font-medium text-emerald-700' : 'text-slate-600'
                            }`
                          }
                          onClick={closeMenu}
                        >
                          {item.label}
                        </NavLink>
                      </li>
                    ))}
                  </ul>
                </li>

                <li>
                  <p className="mb-2 px-1 text-xs font-medium uppercase tracking-wider text-slate-400">Fit tests</p>
                  <NavLink
                    to="/students/tests"
                    className={({ isActive }) =>
                      `mb-2 block rounded-lg px-3 py-2.5 text-sm font-medium ${
                        isActive || fitTestsActive ? 'bg-slate-100 text-slate-900' : 'text-slate-700'
                      }`
                    }
                    onClick={closeMenu}
                  >
                    Fit tests hub
                  </NavLink>
                  <ul className="flex flex-col gap-0.5 border-t border-slate-100 pt-2">
                    {fitTestNavItems.map((item) => (
                      <li key={item.to}>
                        <NavLink
                          to={item.to}
                          className={({ isActive }) =>
                            `block rounded-lg px-3 py-2 text-sm ${
                              isActive ? 'bg-emerald-50 font-medium text-emerald-700' : 'text-slate-600'
                            }`
                          }
                          onClick={closeMenu}
                        >
                          {item.label}
                        </NavLink>
                      </li>
                    ))}
                  </ul>
                </li>

                <li>
                  <p className="mb-2 px-1 text-xs font-medium uppercase tracking-wider text-slate-400">Compare</p>
                  <ul className="flex flex-col gap-0.5">
                    {compareCollegesNavItems.map((item) => (
                      <li key={item.to}>
                        <NavLink
                          to={item.to}
                          className={({ isActive }) =>
                            `block rounded-lg px-3 py-2.5 text-sm font-medium ${
                              isActive || compareActive ? 'bg-slate-100 text-slate-900' : 'text-slate-700'
                            }`
                          }
                          onClick={closeMenu}
                        >
                          {item.label}
                        </NavLink>
                      </li>
                    ))}
                  </ul>
                </li>
              </ul>
            </nav>
          </div>
        </>
      ) : null}
    </header>
  );
}

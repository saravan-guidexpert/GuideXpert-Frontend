import { useCallback, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useStudentAuthRequired } from '../../contexts/StudentAuthContext';

/**
 * Soft auth wrapper:
 * - Page content stays visible (blurred when logged out)
 * - Side OTP popup handles login (no center blocking card)
 * - useRequireLoginToUse() gates predict/submit actions
 */
export default function RequireStudentAuth({ children }) {
  const { isAuthenticated, openAuthModal } = useStudentAuthRequired();
  const location = useLocation();

  useEffect(() => {
    if (isAuthenticated) return;
    openAuthModal('login', {
      pendingPath: `${location.pathname}${location.search || ''}`,
    });
  }, [isAuthenticated, openAuthModal, location.pathname, location.search]);

  if (isAuthenticated) return children;

  return (
    <div className="relative">
      <div
        className="pointer-events-none select-none blur-[2.5px] opacity-[0.72] transition-[filter,opacity] duration-500 ease-out sm:blur-[3px]"
        aria-hidden
      >
        {children}
      </div>
      <div
        className="pointer-events-none absolute inset-0 bg-gradient-to-b from-[#f3f5f8]/35 via-transparent to-[#f3f5f8]/50"
        aria-hidden
      />
    </div>
  );
}

/**
 * Call at the start of predict / submit / start-test handlers.
 * @returns {boolean} true if the user may continue; false if the side login popup was opened
 */
export function useRequireLoginToUse() {
  const { isAuthenticated, openAuthModal } = useStudentAuthRequired();
  const location = useLocation();

  return useCallback(() => {
    if (isAuthenticated) return true;
    openAuthModal('login', {
      pendingPath: `${location.pathname}${location.search || ''}`,
    });
    return false;
  }, [isAuthenticated, openAuthModal, location.pathname, location.search]);
}

/**
 * Single source of truth for the backend `/api` base URL.
 *
 * Prefer same-origin `/api` whenever the host can proxy to the backend (Vite dev,
 * Vercel frontend rewrites, guidexpert.co.in). That avoids CORS and JWT/env mismatches.
 *
 * Set VITE_DIRECT_LOCAL_API=true to force a direct absolute URL in dev (e.g. :5000).
 * Set VITE_API_URL to override the production fallback when not using same-origin `/api`.
 */
const PRODUCTION_API = 'https://gxp-new-backend.vercel.app/api';

/** Hosts that should call `/api` on the same origin (proxy/rewrite). */
function shouldUseSameOriginApi(hostname) {
  if (!hostname) return false;
  const h = hostname.toLowerCase();
  return (
    h === 'localhost' ||
    h === '127.0.0.1' ||
    h.endsWith('.vercel.app') ||
    h === 'guidexpert.co.in' ||
    h === 'www.guidexpert.co.in' ||
    h.endsWith('.guidexpert.co.in')
  );
}

export function getApiBaseUrl() {
  const isDev = import.meta.env.DEV;
  const envUrl = (import.meta.env.VITE_API_URL || '').trim();
  const directLocal =
    String(import.meta.env.VITE_DIRECT_LOCAL_API || '').toLowerCase() === 'true';

  if (typeof window !== 'undefined' && window.location?.hostname) {
    if (shouldUseSameOriginApi(window.location.hostname) && !directLocal) {
      return '/api';
    }
  }

  const pointsAtLoopback = /^https?:\/\/(127\.0\.0\.1|localhost)(:\d+)?(\/|$)/i.test(envUrl);
  const pointsAtKnownProdApi =
    envUrl.includes('gxp-new-backend.vercel.app') ||
    envUrl.includes('guide-xpert-backend.vercel.app');
  const useProxyInDev =
    isDev &&
    !directLocal &&
    (!envUrl || pointsAtKnownProdApi || pointsAtLoopback);
  if (useProxyInDev) return '/api';

  const raw = envUrl || PRODUCTION_API;
  const noTrailing = raw.replace(/\/+$/, '');
  return noTrailing.endsWith('/api') ? noTrailing : `${noTrailing}/api`;
}

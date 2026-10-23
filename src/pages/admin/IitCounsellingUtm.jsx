import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  FiCopy,
  FiExternalLink,
  FiEye,
  FiLink,
  FiRefreshCw,
  FiSave,
  FiTrash2,
} from 'react-icons/fi';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import AdminChartFrame from '../../components/Admin/AdminChartFrame';
import {
  createIitCounsellingSavedUtmLink,
  deleteIitCounsellingSavedUtmLink,
  getIitCounsellingSavedUtmLinks,
  getIitCounsellingUtmAnalytics,
  getIitCounsellingVisitAnalytics,
  getStoredToken,
} from '../../utils/adminApi';
import { useAuth } from '../../hooks/useAuth';
import TableSkeleton from '../../components/UI/TableSkeleton';
import CopyToSheetsModal from '../../components/Admin/CopyToSheetsModal';
import {
  PLATFORMS,
  DEFAULT_CAMPAIGN,
  PLATFORM_TO_UTM_SOURCE,
  IIT_COUNSELLING_UTM_LINK_TARGETS,
  normalizeIitUtmLinkTargetFromQuery,
  isIitUtmSavedLinksOnlyTarget,
  getIitUtmPagePath,
  getIitUtmTabLabel,
} from '../../constants/influencerAdminConstants';

const COMBO_COPY_FIELDS = [
  { key: 'utm_source', label: 'utm_source' },
  { key: 'utm_medium', label: 'utm_medium' },
  { key: 'utm_campaign', label: 'utm_campaign' },
  { key: 'utm_content', label: 'utm_content' },
  { key: 'influencerName', label: 'Influencer name' },
  { key: 'dateCreated', label: 'Date created' },
  { key: 'lastVisitAt', label: 'Last visit' },
  { key: 'visits', label: 'Visits' },
  { key: 'uniqueVisitors', label: 'Unique visitors' },
  { key: 'linkedSubmissions', label: 'Linked submissions' },
];

const DEFAULT_IIT_COUNSELLING_PAGE_URL = (
  import.meta.env.VITE_IIT_COUNSELLING_PAGE_URL || 'https://guidexpert.co.in/iit-counselling'
).trim();

const DEFAULT_ONE_ON_ONE_SESSION_PAGE_URL = (
  import.meta.env.VITE_ONE_ON_ONE_SESSION_PAGE_URL || 'https://www.guidexpert.co.in/one-on-one-session'
).trim();

const DEFAULT_GUIDANCE_BOOKING_CONFIRMATION_PAGE_URL = (
  import.meta.env.VITE_GUIDANCE_BOOKING_CONFIRMATION_PAGE_URL
    || 'https://www.guidexpert.co.in/guidance-booking-confirmation'
).trim();

const DEFAULT_BECOME_COUNSELLOR_PAGE_URL = (
  import.meta.env.VITE_BECOME_COUNSELLOR_PAGE_URL || 'https://www.guidexpert.co.in/become-counsellor'
).trim();

const DEFAULT_MAIN_PAGE_URL = (
  import.meta.env.VITE_MAIN_PAGE_URL || 'https://guidexpert.co.in'
).trim();

function buildIitCounsellingShareUrl(baseUrl, { utm_source, utm_medium, utm_campaign, utm_content }) {
  const base = String(baseUrl || '').trim().replace(/\/+$/, '');
  if (!base) return '';
  const p = new URLSearchParams();
  if (String(utm_source || '').trim()) p.set('utm_source', String(utm_source).trim());
  if (String(utm_medium || '').trim()) p.set('utm_medium', String(utm_medium).trim());
  if (String(utm_campaign || '').trim()) p.set('utm_campaign', String(utm_campaign).trim());
  if (String(utm_content || '').trim()) p.set('utm_content', String(utm_content).trim());
  const qs = p.toString();
  return qs ? `${base}?${qs}` : base;
}

function normalizeUtmToken(val) {
  if (val == null || val === '') return '';
  let s = String(val).trim();
  try {
    s = decodeURIComponent(s);
  } catch {
    // keep as-is
  }
  return s.trim().toLowerCase();
}

/** Map saved UTM links → display names for the combo analytics table. */
function buildInfluencerNameLookup(savedLinks) {
  const byFullKey = new Map();
  const byContent = new Map();
  const createdAtByFullKey = new Map();
  const createdAtByContent = new Map();
  for (const link of savedLinks || []) {
    const name = (link.influencerName || '').trim();
    if (!name) continue;
    const parsed = parseUtmParamsFromHref(link.utmLink) || {};
    const contentNorm = normalizeUtmToken(parsed.utm_content || name);
    const fullKey = [
      normalizeUtmToken(parsed.utm_source),
      normalizeUtmToken(parsed.utm_medium),
      normalizeUtmToken(parsed.utm_campaign),
      contentNorm,
    ].join('|');
    const createdAt = link.createdAt || null;
    if (fullKey && !byFullKey.has(fullKey)) byFullKey.set(fullKey, name);
    if (contentNorm && !byContent.has(contentNorm)) byContent.set(contentNorm, name);
    const nameNorm = normalizeUtmToken(name);
    if (nameNorm && !byContent.has(nameNorm)) byContent.set(nameNorm, name);
    if (createdAt && fullKey && !createdAtByFullKey.has(fullKey)) createdAtByFullKey.set(fullKey, createdAt);
    if (createdAt && contentNorm && !createdAtByContent.has(contentNorm)) {
      createdAtByContent.set(contentNorm, createdAt);
    }
    if (createdAt && nameNorm && !createdAtByContent.has(nameNorm)) {
      createdAtByContent.set(nameNorm, createdAt);
    }
  }
  return { byFullKey, byContent, createdAtByFullKey, createdAtByContent };
}

function resolveSavedLinkCreatedAt(row, lookup) {
  if (!row || !lookup) return null;
  const contentRaw = row.utm_content === '(none)' ? '' : String(row.utm_content || '').trim();
  const fullKey = [
    normalizeUtmToken(row.utm_source),
    normalizeUtmToken(row.utm_medium),
    normalizeUtmToken(row.utm_campaign),
    normalizeUtmToken(contentRaw),
  ].join('|');
  return lookup.createdAtByFullKey.get(fullKey)
    || lookup.createdAtByContent.get(normalizeUtmToken(contentRaw))
    || null;
}

/** First visit in range, or saved-link created date when no visits yet. */
function resolveDateCreated(row, lookup) {
  if (row?.firstVisitAt) return row.firstVisitAt;
  return resolveSavedLinkCreatedAt(row, lookup);
}

function resolveInfluencerName(row, lookup) {
  if (!row || !lookup) return '';
  const contentRaw = row.utm_content === '(none)' ? '' : String(row.utm_content || '').trim();
  const fullKey = [
    normalizeUtmToken(row.utm_source),
    normalizeUtmToken(row.utm_medium),
    normalizeUtmToken(row.utm_campaign),
    normalizeUtmToken(contentRaw),
  ].join('|');
  const fromFull = lookup.byFullKey.get(fullKey);
  if (fromFull) return fromFull;
  const fromContent = lookup.byContent.get(normalizeUtmToken(contentRaw));
  if (fromContent) return fromContent;
  if (String(row.utm_medium || '').toLowerCase() === 'influencer' && contentRaw) return contentRaw;
  return '';
}

/** Decoded UTM tuple as stored on IIT counselling visits (same as combo table / CSV keys). */
function parseUtmParamsFromHref(href) {
  if (!href || typeof href !== 'string') return null;
  try {
    const u = new URL(href);
    return {
      utm_source: u.searchParams.get('utm_source') ?? '',
      utm_medium: u.searchParams.get('utm_medium') ?? '',
      utm_campaign: u.searchParams.get('utm_campaign') ?? '',
      utm_content: u.searchParams.get('utm_content') ?? '',
    };
  } catch {
    return null;
  }
}

/** Match backend combo table: trimmed value or "(none)". */
function utmFieldForCombo(val) {
  const s = String(val ?? '').trim();
  return s || '(none)';
}

function comboRowKeyFromParts(source, medium, campaign, content) {
  return [source, medium, campaign, content].join('|');
}

function savedLinkCreatedInRange(createdAt, fromDate, toDate, fromTime, toTime) {
  if (!createdAt) return false;
  if (!fromDate && !toDate) return true;
  const t = new Date(createdAt).getTime();
  if (Number.isNaN(t)) return false;
  if (fromDate) {
    const start = new Date(`${fromDate}T${fromTime || '00:00'}`);
    if (!Number.isNaN(start.getTime()) && t < start.getTime()) return false;
  }
  if (toDate) {
    const end = new Date(`${toDate}T${toTime || '23:59'}`);
    if (!Number.isNaN(end.getTime()) && t > end.getTime()) return false;
  }
  return true;
}

/** Include saved UTM links in analytics even when visit count is still zero. */
function mergeSavedUtmLinksIntoCombo(byCombo, savedLinks, { fromDate, toDate, fromTime, toTime }) {
  const map = new Map();
  for (const row of byCombo || []) {
    map.set(
      comboRowKeyFromParts(row.utm_source, row.utm_medium, row.utm_campaign, row.utm_content),
      row,
    );
  }
  const hasDateRange = Boolean(fromDate || toDate);
  for (const link of savedLinks || []) {
    if (hasDateRange && !savedLinkCreatedInRange(link.createdAt, fromDate, toDate, fromTime, toTime)) {
      continue;
    }
    const parsed = parseUtmParamsFromHref(link.utmLink);
    if (!parsed) continue;
    const candidate = {
      utm_source: utmFieldForCombo(parsed.utm_source),
      utm_medium: utmFieldForCombo(parsed.utm_medium),
      utm_campaign: utmFieldForCombo(parsed.utm_campaign),
      utm_content: utmFieldForCombo(parsed.utm_content),
      visits: 0,
      uniqueVisitors: 0,
      linkedSubmissions: 0,
      completed: 0,
      inProgress: 0,
      firstVisitAt: null,
      latestVisitAt: null,
    };
    const key = comboRowKeyFromParts(
      candidate.utm_source,
      candidate.utm_medium,
      candidate.utm_campaign,
      candidate.utm_content,
    );
    if (!map.has(key)) {
      map.set(key, candidate);
    }
  }
  return [...map.values()];
}

/** Allowed combo keys from links saved for a given landing page (generator list). */
function buildSavedLinkComboKeys(savedLinks) {
  const keys = new Set();
  for (const link of savedLinks || []) {
    const parsed = parseUtmParamsFromHref(link.utmLink);
    if (!parsed) continue;
    keys.add(
      comboRowKeyFromParts(
        utmFieldForCombo(parsed.utm_source),
        utmFieldForCombo(parsed.utm_medium),
        utmFieldForCombo(parsed.utm_campaign),
        utmFieldForCombo(parsed.utm_content),
      ),
    );
  }
  return keys;
}

function filterComboRowsToSavedLinks(rows, savedLinkKeys) {
  if (!savedLinkKeys || savedLinkKeys.size === 0) return [];
  return (rows || []).filter((r) =>
    savedLinkKeys.has(
      comboRowKeyFromParts(r.utm_source, r.utm_medium, r.utm_campaign, r.utm_content),
    ),
  );
}

/** Map POST saved-utm-links response to table row shape. */
function mapCreateResponseToSavedLinkRow(saved) {
  if (!saved || typeof saved !== 'object') return null;
  const id = saved.id != null ? String(saved.id) : (saved._id != null ? String(saved._id) : '');
  if (!id) return null;
  return {
    id,
    influencerName: saved.influencerName,
    platform: saved.platform,
    campaign: saved.campaign,
    utmLink: saved.utmLink,
    linkTarget: saved.linkTarget || 'iitCounselling',
    cost: saved.cost ?? null,
    createdAt: saved.createdAt,
  };
}

function getDatePresetRange(preset) {
  const today = new Date();
  today.setHours(23, 59, 59, 999);
  const from = new Date();
  from.setHours(0, 0, 0, 0);
  if (preset === '7') {
    from.setDate(from.getDate() - 7);
    return { from: from.toISOString().slice(0, 10), to: today.toISOString().slice(0, 10) };
  }
  if (preset === '30') {
    from.setDate(from.getDate() - 30);
    return { from: from.toISOString().slice(0, 10), to: today.toISOString().slice(0, 10) };
  }
  if (preset === 'month') {
    from.setDate(1);
    return { from: from.toISOString().slice(0, 10), to: today.toISOString().slice(0, 10) };
  }
  return { from: '', to: '' };
}

function formatChartDate(isoDateStr) {
  if (!isoDateStr) return '—';
  const s = String(isoDateStr);
  const [y, m, d] = s.split(/[-T\s]/);
  if (!y || !m || !d) return s;
  const date = new Date(Date.UTC(parseInt(y, 10), parseInt(m, 10) - 1, parseInt(d, 10)));
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function ChartSkeleton() {
  return (
    <div className="h-[240px] flex items-center justify-center bg-gray-50 rounded-lg animate-pulse">
      <div className="text-gray-400 text-sm">Loading chart…</div>
    </div>
  );
}

function getComboCellValue(row, key) {
  if (key === 'dateCreated' || key === 'lastVisitAt') {
    const v = key === 'dateCreated' ? row.dateCreated : row.lastVisitAt;
    if (!v) return '';
    return formatSavedLinkDate(v);
  }
  const v = row[key];
  if (v == null || v === '') return '';
  return String(v);
}

function savedLinkMatchesTarget(link, target) {
  const explicit = link?.linkTarget;
  if (explicit) return explicit === target;
  const url = String(link?.utmLink || '');
  if (target === 'mainPage') return /^https?:\/\/[^/]+\/?(?:\?|#|$)/i.test(url);
  if (target === 'oneOnOneSession') return /\/one-on-one-session(?:\/|\?|#|$)/i.test(url);
  if (target === 'guidanceBookingConfirmation') return /\/guidance-booking-confirmation(?:\/|\?|#|$)/i.test(url);
  if (target === 'becomeCounsellor') return /\/become-counsellor(?:\/|\?|#|$)/i.test(url);
  return /\/iit-counselling(?:\/|\?|#|$)/i.test(url);
}

function formatSavedLinkDate(value) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatSavedCost(value) {
  if (value == null || value === '' || (typeof value === 'number' && Number.isNaN(value))) return '—';
  const n = Number(value);
  if (Number.isNaN(n)) return '—';
  return `₹ ${n.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

const cardClass = 'bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden';
const sectionHeaderClass = 'px-6 py-4 border-b border-gray-200 bg-gray-50/80 border-l-4 border-l-primary-navy';

const LINE_POINT_CAP = 90;

function LandingPageTargetToggle({ value, onChange, label, ariaLabel }) {
  return (
    <div className="flex flex-wrap items-center gap-2 sm:gap-3" role="group" aria-label={ariaLabel || label}>
      {label ? (
        <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide shrink-0">{label}</span>
      ) : null}
      <div className="inline-flex rounded-lg border border-gray-300 bg-white p-0.5 shadow-sm">
        {IIT_COUNSELLING_UTM_LINK_TARGETS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={`text-xs sm:text-sm px-3 py-2 rounded-md transition-colors whitespace-nowrap ${
              value === opt.value
                ? 'bg-primary-navy text-white font-medium shadow-sm'
                : 'text-gray-700 hover:bg-gray-50'
            }`}
          >
            {opt.tabLabel || getIitUtmTabLabel(opt.value)}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function IitCounsellingUtm() {
  const { logout } = useAuth();
  const [searchParams] = useSearchParams();
  const queryLinkTarget = normalizeIitUtmLinkTargetFromQuery(searchParams.get('linkTarget'));

  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [fromTime, setFromTime] = useState('00:00');
  const [toTime, setToTime] = useState('23:59');
  const [rangePreset, setRangePreset] = useState('');

  const [data, setData] = useState(null);
  const [visitTrend, setVisitTrend] = useState([]);
  const [loading, setLoading] = useState(true);
  const [trendLoading, setTrendLoading] = useState(true);
  const [error, setError] = useState('');

  const [comboSearch, setComboSearch] = useState('');
  const [comboSort, setComboSort] = useState('newest');
  const [copyComboModalOpen, setCopyComboModalOpen] = useState(false);

  const [genLinkTarget, setGenLinkTarget] = useState(queryLinkTarget);
  /** Landing page for visit analytics (KPIs, charts, combo table). */
  const [analyticsLinkTarget, setAnalyticsLinkTarget] = useState(queryLinkTarget);
  const [genInfluencerName, setGenInfluencerName] = useState('');
  const [genPlatform, setGenPlatform] = useState('Instagram');
  const [genCampaign, setGenCampaign] = useState(DEFAULT_CAMPAIGN);
  const [genCost, setGenCost] = useState('');
  const [genCopied, setGenCopied] = useState(false);
  const [genLinkError, setGenLinkError] = useState('');
  const [genSaveLoading, setGenSaveLoading] = useState(false);
  const [genSaveSuccess, setGenSaveSuccess] = useState('');
  /** After save, server-built URL (aligns DB link with env base). Cleared when UTM inputs change. */
  const [canonicalIitUtmLink, setCanonicalIitUtmLink] = useState(null);

  const [savedIitLinks, setSavedIitLinks] = useState([]);
  /** All saved links (both landing pages) for influencer name lookup in analytics table. */
  const [savedLinksForLookup, setSavedLinksForLookup] = useState([]);
  const [savedLinksLoading, setSavedLinksLoading] = useState(true);
  const [savedLinksError, setSavedLinksError] = useState('');
  /** Set when the API returns 404 (route missing on host) or wrong handler (legacy server). */
  const [savedLinksEnvHint, setSavedLinksEnvHint] = useState('');
  const [deletingLinkId, setDeletingLinkId] = useState(null);

  const sharedFilters = useMemo(() => ({
    fromDate,
    toDate,
    fromTime,
    toTime,
    granularity: 'daily',
    linkTarget: analyticsLinkTarget,
  }), [fromDate, toDate, fromTime, toTime, analyticsLinkTarget]);

  /** Incremented on each fetch so stale responses cannot overwrite the active tab's data. */
  const analyticsLoadIdRef = useRef(0);

  const handleAnalyticsLinkTargetChange = useCallback((nextTarget) => {
    if (nextTarget === analyticsLinkTarget) return;
    analyticsLoadIdRef.current += 1;
    setAnalyticsLinkTarget(nextTarget);
    setData(null);
    setVisitTrend([]);
    setError('');
    setLoading(true);
    setTrendLoading(true);
  }, [analyticsLinkTarget]);

  const loadData = useCallback(() => {
    const token = getStoredToken();
    const loadId = ++analyticsLoadIdRef.current;
    const requestedLinkTarget = analyticsLinkTarget;

    setLoading(true);
    setTrendLoading(true);
    setError('');

    Promise.all([
      getIitCounsellingUtmAnalytics(sharedFilters, token),
      getIitCounsellingVisitAnalytics(sharedFilters, token),
    ]).then(([utmRes, visitRes]) => {
      if (loadId !== analyticsLoadIdRef.current) return;

      setLoading(false);
      setTrendLoading(false);
      if (!utmRes.success) {
        setError(utmRes.message || 'Failed to load UTM analytics');
        setData(null);
        setVisitTrend([]);
        return;
      }
      const payload = utmRes.data?.data || null;
      const responseLinkTarget = payload?.filters?.linkTarget;
      if (responseLinkTarget && responseLinkTarget !== requestedLinkTarget) {
        return;
      }
      setData(payload);
      if (visitRes.success && visitRes.data?.data?.trend) {
        const visitFilters = visitRes.data.data.filters;
        if (visitFilters?.linkTarget && visitFilters.linkTarget !== requestedLinkTarget) {
          setVisitTrend([]);
          return;
        }
        setVisitTrend(visitRes.data.data.trend);
      } else {
        setVisitTrend([]);
      }
    });
  }, [sharedFilters, analyticsLinkTarget]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    setGenLinkTarget(queryLinkTarget);
    setAnalyticsLinkTarget(queryLinkTarget);
  }, [queryLinkTarget]);

  const fetchSavedIitLinks = useCallback(() => {
    const t = getStoredToken();
    setSavedLinksLoading(true);
    setSavedLinksError('');
    setSavedLinksEnvHint('');
    getIitCounsellingSavedUtmLinks(t, { linkTarget: genLinkTarget }).then((result) => {
      setSavedLinksLoading(false);
      if (!result.success) {
        if (result.status === 401) {
          logout();
          window.location.href = '/admin/login';
          return;
        }
        const msg = String(result.message || '').toLowerCase();
        const missingSavedLinksRoute =
          result.status === 404 &&
          (msg === 'not found' || msg.includes('submission not found'));
        if (missingSavedLinksRoute) {
          // Do not clear rows already added this session (Save works; list GET may 404 on older hosts).
          setSavedLinksEnvHint(
            'List could not reload from the server. Use Refresh after deploying the API, or set VITE_PROXY_TARGET to your local backend (port 5000).',
          );
          return;
        }
        setSavedLinksError(result.message || 'Failed to load saved links');
        setSavedIitLinks([]);
        return;
      }
      const body = result.data;
      const list = (Array.isArray(body?.data) ? body.data : Array.isArray(body) ? body : [])
        .filter((link) => savedLinkMatchesTarget(link, genLinkTarget));
      list.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
      setSavedIitLinks(list);
    });
  }, [logout, genLinkTarget]);

  useEffect(() => {
    const id = window.setTimeout(() => fetchSavedIitLinks(), 0);
    return () => window.clearTimeout(id);
  }, [fetchSavedIitLinks]);

  useEffect(() => {
    setCanonicalIitUtmLink(null);
    setGenSaveSuccess('');
  }, [genLinkTarget]);

  useEffect(() => {
    const onFocus = () => fetchSavedIitLinks();
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [fetchSavedIitLinks]);

  const fetchSavedLinksForLookup = useCallback(() => {
    const t = getStoredToken();
    Promise.all([
      getIitCounsellingSavedUtmLinks(t, { linkTarget: 'iitCounselling' }),
      getIitCounsellingSavedUtmLinks(t, { linkTarget: 'oneOnOneSession' }),
      getIitCounsellingSavedUtmLinks(t, { linkTarget: 'guidanceBookingConfirmation' }),
      getIitCounsellingSavedUtmLinks(t, { linkTarget: 'becomeCounsellor' }),
      getIitCounsellingSavedUtmLinks(t, { linkTarget: 'mainPage' }),
    ]).then(([iitRes, oneOnOneRes, guidanceRes, becomeCounsellorRes, mainPageRes]) => {
      const pick = (result) => {
        if (!result.success) return [];
        const body = result.data;
        return Array.isArray(body?.data) ? body.data : Array.isArray(body) ? body : [];
      };
      const merged = [...pick(iitRes), ...pick(oneOnOneRes), ...pick(guidanceRes), ...pick(becomeCounsellorRes), ...pick(mainPageRes)]
        .filter((link, index, all) => {
          const id = link?.id || link?._id;
          if (!id) return true;
          return all.findIndex((item) => (item?.id || item?._id) === id) === index;
        });
      merged.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
      setSavedLinksForLookup(merged);
    });
  }, []);

  useEffect(() => {
    const id = window.setTimeout(() => fetchSavedLinksForLookup(), 0);
    return () => window.clearTimeout(id);
  }, [fetchSavedLinksForLookup]);

  useEffect(() => {
    const onFocus = () => fetchSavedLinksForLookup();
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [fetchSavedLinksForLookup]);

  const savedLinksForAnalyticsLookup = useMemo(
    () => savedLinksForLookup.filter((l) => {
      const t = l.linkTarget || 'iitCounselling';
      return t === analyticsLinkTarget;
    }),
    [savedLinksForLookup, analyticsLinkTarget]
  );

  const influencerNameLookup = useMemo(
    () => buildInfluencerNameLookup(savedLinksForAnalyticsLookup),
    [savedLinksForAnalyticsLookup]
  );

  const analyticsPagePath = getIitUtmPagePath(analyticsLinkTarget);
  const analyticsPageTitle = analyticsLinkTarget === 'oneOnOneSession'
    ? '1-on-1 session UTM analytics'
    : analyticsLinkTarget === 'guidanceBookingConfirmation'
      ? 'Guidance booking confirmation UTM analytics'
      : analyticsLinkTarget === 'becomeCounsellor'
        ? 'Become a counsellor UTM analytics'
        : analyticsLinkTarget === 'mainPage'
          ? 'JEE mock test UTM analytics'
          : 'IIT Counselling UTM analytics';
  const isMainPageTarget = analyticsLinkTarget === 'mainPage';
  const analyticsLinkedHelp = analyticsLinkTarget === 'oneOnOneSession'
    ? 'Linked = visit tied to a 1-on-1 form submission.'
    : analyticsLinkTarget === 'guidanceBookingConfirmation'
      ? 'Linked = visit tied to a confirmed guidance slot booking.'
      : analyticsLinkTarget === 'becomeCounsellor'
        ? 'Linked = visit tied to a counsellor registration submission.'
        : isMainPageTarget
          ? 'Linked = visit tied to a JEE mock test registration. Completed and in progress are shown on this tab only.'
          : 'Linked = visit tied to section 1 save.';
  const isSavedLinksOnlyTarget = isIitUtmSavedLinksOnlyTarget(analyticsLinkTarget);

  const savedLinkComboKeys = useMemo(() => {
    if (!isSavedLinksOnlyTarget) return null;
    return buildSavedLinkComboKeys(savedLinksForAnalyticsLookup);
  }, [isSavedLinksOnlyTarget, savedLinksForAnalyticsLookup]);

  useEffect(() => {
    if (window.location.hash !== '#iit-utm-generator') return undefined;
    const t = window.setTimeout(() => {
      document.getElementById('iit-utm-generator')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
    return () => window.clearTimeout(t);
  }, []);

  const summary = data?.summary || {};

  const applyRangePreset = (preset) => {
    const { from, to } = getDatePresetRange(preset);
    setRangePreset(preset);
    setFromDate(from);
    setToDate(to);
    setFromTime('00:00');
    setToTime('23:59');
  };

  const mergedComboRows = useMemo(() => {
    const merged = mergeSavedUtmLinksIntoCombo(data?.byCombo, savedLinksForAnalyticsLookup, {
      fromDate,
      toDate,
      fromTime,
      toTime,
    });
    if (isSavedLinksOnlyTarget) {
      return filterComboRowsToSavedLinks(merged, savedLinkComboKeys);
    }
    return merged;
  }, [
    data?.byCombo,
    savedLinksForAnalyticsLookup,
    fromDate,
    toDate,
    fromTime,
    toTime,
    isSavedLinksOnlyTarget,
    savedLinkComboKeys,
  ]);

  const linkedMetricLabel = isMainPageTarget
    ? 'Linked registrations'
    : isIitUtmSavedLinksOnlyTarget(analyticsLinkTarget)
      ? 'Linked leads'
      : 'Linked submissions';

  const barChartData = useMemo(() => {
    const linkedCount = (row) => Number(row.linkedSubmissions) || 0;
    const src = isSavedLinksOnlyTarget
      ? [...mergedComboRows]
          .map((r) => ({ utm_content: r.utm_content, linked: linkedCount(r) }))
          .sort((a, b) => b.linked - a.linked)
          .slice(0, 10)
      : [...(data?.byContent || [])]
          .map((r) => ({ utm_content: r.utm_content, linked: linkedCount(r) }))
          .sort((a, b) => b.linked - a.linked)
          .slice(0, 10);
    return src.map((row, i) => {
      const label = row.utm_content || '—';
      const short = label.length > 14 ? `${String(label).slice(0, 14)}…` : label;
      return {
        name: `${short}\u200c${i}`,
        linked: row.linked,
        fullName: label,
      };
    });
  }, [data?.byContent, isSavedLinksOnlyTarget, mergedComboRows]);

  const topUtmContentLabel = useMemo(() => {
    const linkedCount = (row) => Number(row.linkedSubmissions) || 0;
    const rows = isSavedLinksOnlyTarget
      ? [...mergedComboRows].filter((r) => r.utm_content && r.utm_content !== '(none)')
      : [...(data?.byContent || [])].filter((r) => r.utm_content && r.utm_content !== '(none)');
    if (rows.length === 0) return '—';
    rows.sort((a, b) => linkedCount(b) - linkedCount(a));
    return rows[0].utm_content || '—';
  }, [data?.byContent, isSavedLinksOnlyTarget, mergedComboRows]);

  const analyticsSummary = useMemo(() => {
    if (!isSavedLinksOnlyTarget) return summary;
    const totalVisits = mergedComboRows.reduce((s, r) => s + (Number(r.visits) || 0), 0);
    const visitsWithAnyUtm = mergedComboRows.reduce((s, r) => {
      const has = [r.utm_source, r.utm_medium, r.utm_campaign, r.utm_content].some(
        (v) => v && v !== '(none)',
      );
      return s + (has ? Number(r.visits) || 0 : 0);
    }, 0);
    return {
      ...summary,
      totalVisits,
      visitsWithAnyUtm,
      visitsWithoutUtm: Math.max(0, totalVisits - visitsWithAnyUtm),
    };
  }, [summary, isSavedLinksOnlyTarget, mergedComboRows]);

  const lineChartData = useMemo(() => {
    const raw = (visitTrend || []).map((p) => ({
      date: p.bucket || '',
      count: Number(p.totalVisits) || 0,
    }));
    const byDay = new Map();
    for (const row of raw) {
      const d = row.date;
      if (!d) continue;
      byDay.set(d, (byDay.get(d) || 0) + row.count);
    }
    const merged = [...byDay.entries()].map(([date, count]) => ({ date, count }));
    merged.sort((a, b) => String(a.date).localeCompare(String(b.date)));
    if (merged.length > LINE_POINT_CAP) return merged.slice(-LINE_POINT_CAP);
    return merged;
  }, [visitTrend]);

  const filteredSortedCombo = useMemo(() => {
    const rows = mergedComboRows.map((r) => ({
      ...r,
      influencerName: resolveInfluencerName(r, influencerNameLookup),
      dateCreated: resolveDateCreated(r, influencerNameLookup),
      lastVisitAt: r.latestVisitAt || null,
    }));
    const q = comboSearch.trim().toLowerCase();
    let filtered = rows;
    if (q) {
      filtered = rows.filter((r) =>
        [r.utm_source, r.utm_medium, r.utm_campaign, r.utm_content, r.influencerName]
          .some((v) => String(v || '').toLowerCase().includes(q))
      );
    }
    if (comboSort === 'newest') {
      filtered.sort((a, b) => {
        const ta = a.latestVisitAt ? new Date(a.latestVisitAt).getTime() : 0;
        const tb = b.latestVisitAt ? new Date(b.latestVisitAt).getTime() : 0;
        return tb - ta;
      });
    } else {
      const key = comboSort === 'unique' ? 'uniqueVisitors' : comboSort === 'linked' ? 'linkedSubmissions' : 'visits';
      filtered.sort((a, b) => (Number(b[key]) || 0) - (Number(a[key]) || 0));
    }
    return filtered;
  }, [mergedComboRows, comboSearch, comboSort, influencerNameLookup]);

  const exportComboCsv = () => {
    const headers = [
      'utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'Influencer name',
      'Date created', 'Last visit', 'Visits', 'Unique visitors',
      isMainPageTarget
        ? 'Linked registrations'
        : analyticsLinkTarget === 'oneOnOneSession' || analyticsLinkTarget === 'guidanceBookingConfirmation'
          ? 'Linked leads'
          : 'Linked submissions',
      ...(isMainPageTarget ? ['Completed', 'In progress'] : []),
    ];
    const rows = filteredSortedCombo.map((r) => [
      r.utm_source ?? '',
      r.utm_medium ?? '',
      r.utm_campaign ?? '',
      r.utm_content ?? '',
      r.influencerName ?? '',
      r.dateCreated ? formatSavedLinkDate(r.dateCreated) : '',
      r.lastVisitAt ? formatSavedLinkDate(r.lastVisitAt) : '',
      r.visits ?? 0,
      r.uniqueVisitors ?? 0,
      r.linkedSubmissions ?? 0,
      ...(isMainPageTarget ? [r.completed ?? 0, r.inProgress ?? 0] : []),
    ]);
    const csv = [headers.join(','), ...rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const slug = analyticsLinkTarget === 'oneOnOneSession'
      ? 'one-on-one-session-utm'
      : analyticsLinkTarget === 'guidanceBookingConfirmation'
        ? 'guidance-booking-confirmation-utm'
        : analyticsLinkTarget === 'mainPage'
          ? 'jee-mock-test-utm'
          : 'iit-counselling-utm';
    a.download = `${slug}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const generatorBaseUrl = genLinkTarget === 'oneOnOneSession'
    ? DEFAULT_ONE_ON_ONE_SESSION_PAGE_URL
    : genLinkTarget === 'guidanceBookingConfirmation'
      ? DEFAULT_GUIDANCE_BOOKING_CONFIRMATION_PAGE_URL
      : genLinkTarget === 'becomeCounsellor'
        ? DEFAULT_BECOME_COUNSELLOR_PAGE_URL
        : genLinkTarget === 'mainPage'
          ? DEFAULT_MAIN_PAGE_URL
          : DEFAULT_IIT_COUNSELLING_PAGE_URL;

  const generatedIitUtmLink = useMemo(() => {
    const name = genInfluencerName.trim();
    if (!name) return '';
    const utmSource = PLATFORM_TO_UTM_SOURCE[genPlatform] || String(genPlatform || '').toLowerCase();
    const campaign = (genCampaign || '').trim() || DEFAULT_CAMPAIGN;
    return buildIitCounsellingShareUrl(generatorBaseUrl, {
      utm_source: utmSource,
      utm_medium: 'influencer',
      utm_campaign: campaign,
      utm_content: name,
    });
  }, [genInfluencerName, genPlatform, genCampaign, generatorBaseUrl]);

  const displayIitUtmLink = canonicalIitUtmLink || generatedIitUtmLink;

  const generatorDecodedUtms = useMemo(() => parseUtmParamsFromHref(displayIitUtmLink), [displayIitUtmLink]);

  const copyGeneratedIitLink = () => {
    if (!displayIitUtmLink) return;
    navigator.clipboard.writeText(displayIitUtmLink).then(() => {
      setGenCopied(true);
      setTimeout(() => setGenCopied(false), 2000);
    });
  };

  const handleGenerateIitLink = () => {
    setGenLinkError('');
    setGenSaveSuccess('');
    setCanonicalIitUtmLink(null);
    if (!genInfluencerName.trim()) {
      setGenLinkError('Influencer name is required.');
      return;
    }
    document.getElementById('iit-generated-link-preview')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  };

  const handleSaveIitLinkToList = async () => {
    setGenLinkError('');
    setGenSaveSuccess('');
    if (!genInfluencerName.trim()) {
      setGenLinkError('Influencer name is required.');
      return;
    }
    const t = getStoredToken();
    setGenSaveLoading(true);
    const payload = {
      influencerName: genInfluencerName.trim(),
      platform: genPlatform,
      campaign: (genCampaign || '').trim() || DEFAULT_CAMPAIGN,
      linkTarget: genLinkTarget,
    };
    const costTrimmed = typeof genCost === 'string' ? genCost.trim() : '';
    if (costTrimmed !== '') {
      const costNum = Number(costTrimmed);
      if (!Number.isNaN(costNum) && costNum >= 0) payload.cost = costNum;
    }
    const result = await createIitCounsellingSavedUtmLink(payload, t);
    setGenSaveLoading(false);
    if (!result.success) {
      if (result.status === 401) {
        logout();
        window.location.href = '/admin/login';
        return;
      }
      const errMsg = result.message || result.data?.message || 'Failed to save link';
      setGenLinkError(errMsg);
      return;
    }
    const apiBody = result.data;
    const saved = apiBody?.data != null && typeof apiBody.data === 'object' ? apiBody.data : apiBody;
    const savedId = saved?.id ?? saved?._id;
    // Persisted save includes a Mongo id; a "generate only" response has no id.
    if (savedId == null) {
      setGenLinkError(
        apiBody?.message
        || 'Link was not saved (no record id returned). If the API is older than this screen, redeploy the backend.'
      );
      return;
    }
    const row = mapCreateResponseToSavedLinkRow(saved);
    if (!row) {
      setGenLinkError('Invalid save response from server.');
      return;
    }
    const savedUrl = typeof row.utmLink === 'string' ? row.utmLink.trim() : '';
    if (savedUrl) {
      setCanonicalIitUtmLink(savedUrl);
    }
    setGenSaveSuccess('Saved to the list.');
    setSavedIitLinks((prev) => {
      const idStr = String(row.id);
      const rest = prev.filter((r) => String(r.id) !== idStr);
      return [row, ...rest];
    });
    setSavedLinksForLookup((prev) => {
      const idStr = String(row.id);
      const rest = prev.filter((r) => String(r.id) !== idStr);
      return [row, ...rest];
    });
  };

  const handleDeleteSavedIitLink = async (id) => {
    if (!id || !window.confirm('Delete this saved IIT counselling link?')) return;
    const t = getStoredToken();
    setDeletingLinkId(id);
    setSavedLinksError('');
    const result = await deleteIitCounsellingSavedUtmLink(id, t);
    setDeletingLinkId(null);
    if (!result.success) {
      if (result.status === 401) {
        logout();
        window.location.href = '/admin/login';
        return;
      }
      setSavedLinksError(result.message || 'Failed to delete link');
      return;
    }
    setSavedIitLinks((prev) => prev.filter((r) => String(r.id) !== String(id)));
  };

  const dateRangeToolbar = (
    <div className="flex flex-wrap items-center gap-2">
      {['7', '30', 'month', ''].map((preset) => (
        <button
          key={preset || 'all'}
          type="button"
          onClick={() => applyRangePreset(preset)}
          className={`text-sm px-3 py-1.5 rounded-lg border ${rangePreset === preset ? 'bg-primary-navy text-white border-primary-navy' : 'border-gray-300 hover:bg-gray-50'}`}
        >
          {preset === '7' ? 'Last 7 days' : preset === '30' ? 'Last 30 days' : preset === 'month' ? 'This month' : 'All time'}
        </button>
      ))}
      <input
        type="date"
        value={fromDate}
        onChange={(e) => { setRangePreset(''); setFromDate(e.target.value); }}
        className="rounded border border-gray-300 px-2 py-1.5 text-sm"
      />
      <input
        type="date"
        value={toDate}
        onChange={(e) => { setRangePreset(''); setToDate(e.target.value); }}
        className="rounded border border-gray-300 px-2 py-1.5 text-sm"
      />
      <input
        type="time"
        value={fromTime}
        onChange={(e) => { setRangePreset(''); setFromTime(e.target.value); }}
        className="rounded border border-gray-300 px-2 py-1.5 text-sm"
        title="From time (IST)"
      />
      <input
        type="time"
        value={toTime}
        onChange={(e) => { setRangePreset(''); setToTime(e.target.value); }}
        className="rounded border border-gray-300 px-2 py-1.5 text-sm"
        title="To time (IST)"
      />
      <button
        type="button"
        onClick={() => {
          setRangePreset('');
          setFromDate('');
          setToDate('');
          setFromTime('00:00');
          setToTime('23:59');
        }}
        className="text-sm px-3 py-1.5 rounded-lg border border-gray-300 hover:bg-gray-50"
      >
        Reset range
      </button>
      <button
        type="button"
        onClick={loadData}
        disabled={loading}
        className="p-2 rounded-lg text-gray-500 hover:bg-gray-200 disabled:opacity-50"
        title="Refresh"
      >
        <FiRefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
      </button>
      <select
        value={comboSort}
        onChange={(e) => setComboSort(e.target.value)}
        className="rounded border border-gray-300 px-2 py-1.5 text-sm bg-white"
      >
        <option value="newest">Sort: Newest first</option>
        <option value="visits">Sort: Visits</option>
        <option value="unique">Sort: Unique</option>
        <option value="linked">Sort: Linked</option>
      </select>
      <button
        type="button"
        onClick={exportComboCsv}
        disabled={filteredSortedCombo.length === 0}
        className="text-sm px-3 py-1.5 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-50"
      >
        Export CSV
      </button>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-800">IIT Counselling UTM</h2>
        <p className="text-sm text-gray-500 mt-1">
          Create trackable links for the JEE mock test{' '}
          <span className="font-mono text-xs bg-gray-100 px-1 rounded">/</span>
          {', '}
          <span className="font-mono text-xs bg-gray-100 px-1 rounded">/iit-counselling</span>
          {', '}
          <span className="font-mono text-xs bg-gray-100 px-1 rounded">/one-on-one-session</span>
          {', or '}
          <span className="font-mono text-xs bg-gray-100 px-1 rounded">/guidance-booking-confirmation</span>.
        </p>
        <p className="text-xs text-gray-500 mt-1">
          <Link to="/admin/iit-counselling" className="text-primary-navy hover:underline">IIT Counselling submissions</Link>
          {' · '}
          <Link to="/admin/one-on-one-counseling" className="text-primary-navy hover:underline">1-on-1 Counseling Leads</Link>
          {' · '}
          <Link to="/admin/guidance-slot-bookings" className="text-primary-navy hover:underline">Guidance Slot Bookings</Link>
        </p>
      </div>

      <div className={`${cardClass} px-4 py-4 sm:px-5 flex flex-wrap items-center justify-between gap-4`}>
        <LandingPageTargetToggle
          label="Visit analytics"
          ariaLabel="Visit analytics landing page"
          value={analyticsLinkTarget}
          onChange={handleAnalyticsLinkTargetChange}
        />
        <p className="text-sm text-gray-600 min-w-0">
          Showing KPIs and charts for{' '}
          <span className="font-mono text-xs bg-gray-100 px-1.5 py-0.5 rounded border border-gray-200">
            {analyticsPagePath}
          </span>
          {isSavedLinksOnlyTarget ? (
            <span className="text-gray-500">
              {' '}
              · saved {getIitUtmTabLabel(analyticsLinkTarget).toLowerCase()} links only
            </span>
          ) : null}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className={cardClass + ' p-4'}>
          <div className="flex items-center gap-2 text-gray-500 text-sm">
            <FiEye className="w-4 h-4" />
            <span>Total visits</span>
          </div>
          <p className="text-2xl font-semibold text-gray-900 mt-1">{loading ? '—' : (analyticsSummary.totalVisits ?? 0)}</p>
        </div>
        <div className={cardClass + ' p-4'}>
          <div className="flex items-center gap-2 text-gray-500 text-sm">
            <FiLink className="w-4 h-4" />
            <span>Visits with any UTM</span>
          </div>
          <p className="text-2xl font-semibold text-gray-900 mt-1">{loading ? '—' : (analyticsSummary.visitsWithAnyUtm ?? 0)}</p>
        </div>
        <div className={cardClass + ' p-4'}>
          <div className="text-gray-500 text-sm">Top utm_content (by linked)</div>
          <p className="text-lg font-medium text-gray-900 mt-1 truncate" title={topUtmContentLabel === '—' ? '' : topUtmContentLabel}>
            {loading ? '—' : topUtmContentLabel}
          </p>
        </div>
        <div className={cardClass + ' p-4'}>
          <div className="text-gray-500 text-sm">In range</div>
          <p className="text-2xl font-semibold text-gray-900 mt-1">
            {loading ? '—' : (fromDate || toDate ? (analyticsSummary.totalVisits ?? 0) : 'All time')}
          </p>
        </div>
        {isMainPageTarget ? (
          <>
            <div className={cardClass + ' p-4'}>
              <div className="text-gray-500 text-sm">Completed</div>
              <p className="text-2xl font-semibold text-gray-900 mt-1">
                {loading ? '—' : (analyticsSummary.registrationStatus?.completed ?? 0)}
              </p>
              <p className="text-xs text-gray-400 mt-1">JEE mock test, this tab only</p>
            </div>
            <div className={cardClass + ' p-4'}>
              <div className="text-gray-500 text-sm">In progress</div>
              <p className="text-2xl font-semibold text-gray-900 mt-1">
                {loading ? '—' : (analyticsSummary.registrationStatus?.inProgress ?? 0)}
              </p>
              <p className="text-xs text-gray-400 mt-1">Step 1 saved, form not finished</p>
            </div>
          </>
        ) : null}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className={cardClass}>
          <div className={sectionHeaderClass}>
            <h3 className="text-sm font-semibold text-gray-800">Linked by utm_content</h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Top 10 by {linkedMetricLabel.toLowerCase()} (current date range)
            </p>
          </div>
          <div className="p-4 h-[240px] min-h-[200px] w-full min-w-0">
            {loading ? (
              <ChartSkeleton />
            ) : barChartData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-gray-500 text-sm">No data</div>
            ) : (
              <AdminChartFrame height={200}>
                <BarChart data={barChartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 11 }}
                    tickFormatter={(v) => (typeof v === 'string' && v.includes('\u200c') ? v.split('\u200c')[0] : v)}
                  />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                  <Tooltip
                    formatter={(value) => [value, linkedMetricLabel]}
                    labelFormatter={(_, payload) => payload?.[0]?.payload?.fullName ?? ''}
                    contentStyle={{ fontSize: 12 }}
                  />
                  <Bar dataKey="linked" fill="#003366" name={linkedMetricLabel} radius={[4, 4, 0, 0]}>
                    {barChartData.map((entry, index) => (
                      <Cell key={`iit-utm-bar-${index}-${String(entry.fullName)}`} />
                    ))}
                  </Bar>
                </BarChart>
              </AdminChartFrame>
            )}
          </div>
        </div>
        <div className={cardClass}>
          <div className={sectionHeaderClass}>
            <h3 className="text-sm font-semibold text-gray-800">Visits over time</h3>
            <p className="text-xs text-gray-500 mt-0.5">Daily count (IST), current date range</p>
          </div>
          <div className="p-4 h-[240px] min-h-[200px] w-full min-w-0">
            {trendLoading ? (
              <ChartSkeleton />
            ) : lineChartData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-gray-500 text-sm">No data</div>
            ) : (
              <AdminChartFrame height={200}>
                <LineChart data={lineChartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={(v) => (v && v.length >= 10 ? `${v.slice(8, 10)}/${v.slice(5, 7)}` : v)} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                  <Tooltip
                    formatter={(value) => [value, 'Visits']}
                    labelFormatter={(label) => (label ? formatChartDate(label) : '')}
                    contentStyle={{ fontSize: 12 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="count"
                    stroke="#003366"
                    strokeWidth={2}
                    name="Visits"
                    dot={{ r: 3 }}
                  />
                </LineChart>
              </AdminChartFrame>
            )}
          </div>
        </div>
      </div>

      <section id="iit-utm-generator" className={cardClass}>
        <div className={`${sectionHeaderClass} py-2 sm:py-3`}>
          <h2 className="text-base font-semibold text-gray-800">Generate UTM Link</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            Query keys: <span className="font-mono text-xs">utm_source</span> (platform),{' '}
            <span className="font-mono text-xs">utm_medium</span>=<span className="font-mono text-xs">influencer</span>,{' '}
            <span className="font-mono text-xs">utm_campaign</span>,{' '}
            <span className="font-mono text-xs">utm_content</span> (influencer name).
          </p>
        </div>
        <form className="p-6 space-y-5" onSubmit={(e) => { e.preventDefault(); handleGenerateIitLink(); }}>
          <div className="rounded-lg border border-gray-200 bg-gray-50/80 px-4 py-3">
            <LandingPageTargetToggle
              label="Save links for"
              ariaLabel="Landing page for UTM link generator and saved list"
              value={genLinkTarget}
              onChange={setGenLinkTarget}
            />
            <p className="text-xs text-gray-500 mt-2">
              {genLinkTarget === 'oneOnOneSession'
                ? 'Links point to /one-on-one-session and appear in the 1-on-1 saved list below.'
                : genLinkTarget === 'guidanceBookingConfirmation'
                  ? 'Links point to /guidance-booking-confirmation and appear in the guidance booking saved list below.'
                  : genLinkTarget === 'becomeCounsellor'
                    ? 'Links point to /become-counsellor and appear in the become counsellor saved list below.'
                    : genLinkTarget === 'mainPage'
                      ? 'Links point to / for the JEE mock test and appear in the JEE mock test saved list below. Completed and in progress are counted on this tab only.'
                      : 'Links point to /iit-counselling and appear in the IIT counselling saved list below.'}
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div>
              <label htmlFor="iitGenInfluencerName" className="block text-sm font-medium text-gray-700 mb-1.5">Influencer Name</label>
              <input
                id="iitGenInfluencerName"
                type="text"
                value={genInfluencerName}
                onChange={(e) => {
                  setGenInfluencerName(e.target.value);
                  setGenLinkError('');
                  setGenSaveSuccess('');
                  setCanonicalIitUtmLink(null);
                }}
                placeholder="e.g. John Doe"
                className="w-full h-10 rounded-lg border border-gray-300 px-3 text-sm focus:ring-2 focus:ring-primary-navy/30 focus:border-primary-navy outline-none"
              />
            </div>
            <div>
              <label htmlFor="iitGenPlatform" className="block text-sm font-medium text-gray-700 mb-1.5">Platform</label>
              <select
                id="iitGenPlatform"
                value={genPlatform}
                onChange={(e) => {
                  setGenPlatform(e.target.value);
                  setGenSaveSuccess('');
                  setCanonicalIitUtmLink(null);
                }}
                className="w-full h-10 rounded-lg border border-gray-300 px-3 text-sm focus:ring-2 focus:ring-primary-navy/30 focus:border-primary-navy outline-none bg-white"
              >
                {PLATFORMS.map((p) => (
                  <option key={p.value} value={p.value}>{p.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="iitGenCampaignName" className="block text-sm font-medium text-gray-700 mb-1.5">Campaign Name</label>
              <input
                id="iitGenCampaignName"
                type="text"
                value={genCampaign}
                onChange={(e) => {
                  setGenCampaign(e.target.value);
                  setGenSaveSuccess('');
                  setCanonicalIitUtmLink(null);
                }}
                placeholder={DEFAULT_CAMPAIGN}
                className="w-full h-10 rounded-lg border border-gray-300 px-3 text-sm focus:ring-2 focus:ring-primary-navy/30 focus:border-primary-navy outline-none"
              />
            </div>
            <div>
              <label htmlFor="iitGenCost" className="block text-sm font-medium text-gray-700 mb-1.5">Cost (₹)</label>
              <input
                id="iitGenCost"
                type="number"
                min="0"
                step="0.01"
                value={genCost}
                onChange={(e) => {
                  setGenCost(e.target.value);
                  setGenSaveSuccess('');
                }}
                placeholder="Optional"
                className="w-full h-10 rounded-lg border border-gray-300 px-3 text-sm focus:ring-2 focus:ring-primary-navy/30 focus:border-primary-navy outline-none"
              />
              <p className="text-xs text-gray-500 mt-0.5">Optional; included when you use Save to list.</p>
            </div>
          </div>
          {genLinkError ? (
            <p className="text-sm text-red-600" role="alert">{genLinkError}</p>
          ) : null}
          {genSaveSuccess ? (
            <p className="text-sm text-green-700" role="status">{genSaveSuccess}</p>
          ) : null}
          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button
              type="submit"
              disabled={!genInfluencerName.trim()}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white bg-primary-navy hover:bg-primary-navy/90 focus:ring-2 focus:ring-primary-navy focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none"
            >
              Generate Link
            </button>
            <button
              type="button"
              onClick={copyGeneratedIitLink}
              disabled={!displayIitUtmLink}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 border border-gray-300 disabled:opacity-50 disabled:pointer-events-none"
            >
              <FiCopy className="w-4 h-4" aria-hidden />
              {genCopied ? 'Copied' : 'Copy'}
            </button>
            <button
              type="button"
              onClick={handleSaveIitLinkToList}
              disabled={!genInfluencerName.trim() || genSaveLoading}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white bg-primary-navy hover:bg-primary-navy/90 focus:ring-2 focus:ring-primary-navy focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none"
            >
              <FiSave className="w-4 h-4" aria-hidden />
              {genSaveLoading ? 'Saving…' : 'Save to list'}
            </button>
            <button
              type="button"
              onClick={() => displayIitUtmLink && window.open(displayIitUtmLink, '_blank', 'noopener,noreferrer')}
              disabled={!displayIitUtmLink}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 border border-gray-300 disabled:opacity-50 disabled:pointer-events-none"
            >
              <FiExternalLink className="w-4 h-4" aria-hidden />
              Open page
            </button>
          </div>
          {displayIitUtmLink ? (
            <div id="iit-generated-link-preview" className="mt-4 p-4 rounded-lg border border-gray-200 bg-gray-50 scroll-mt-4">
              <p className="text-sm font-medium text-gray-700 mb-1">Generated link</p>
              <p className="text-sm text-gray-800 break-all font-mono">{displayIitUtmLink}</p>
              {canonicalIitUtmLink ? (
                <p className="text-xs text-gray-500 mt-2">
                  Showing saved URL from server (matches list
                  {genLinkTarget === 'iitCounselling' ? ' and visit tracking' : ''}).
                </p>
              ) : null}
              {generatorDecodedUtms ? (
                <div className="mt-4 pt-3 border-t border-gray-200">
                  <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">Decoded UTM fields (same as combo table)</p>
                  <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-sm">
                    <div className="flex flex-wrap gap-x-2">
                      <dt className="font-mono text-xs text-gray-500 shrink-0">utm_source</dt>
                      <dd className="text-gray-900 font-medium break-all">{generatorDecodedUtms.utm_source || <span className="text-gray-400">(none)</span>}</dd>
                    </div>
                    <div className="flex flex-wrap gap-x-2">
                      <dt className="font-mono text-xs text-gray-500 shrink-0">utm_medium</dt>
                      <dd className="text-gray-900 font-medium break-all">{generatorDecodedUtms.utm_medium || <span className="text-gray-400">(none)</span>}</dd>
                    </div>
                    <div className="flex flex-wrap gap-x-2">
                      <dt className="font-mono text-xs text-gray-500 shrink-0">utm_campaign</dt>
                      <dd className="text-gray-900 font-medium break-all">{generatorDecodedUtms.utm_campaign || <span className="text-gray-400">(none)</span>}</dd>
                    </div>
                    <div className="flex flex-wrap gap-x-2">
                      <dt className="font-mono text-xs text-gray-500 shrink-0">utm_content</dt>
                      <dd className="text-gray-900 font-medium break-all">{generatorDecodedUtms.utm_content || <span className="text-gray-400">(none)</span>}</dd>
                    </div>
                  </dl>
                </div>
              ) : null}
            </div>
          ) : (
            <div className="mt-4 p-4 rounded-lg border border-dashed border-gray-200 bg-gray-50/50">
              <p className="text-sm text-gray-600 leading-relaxed">
                Enter an influencer name to preview the trackable link (utm_content).
              </p>
            </div>
          )}
        </form>

        <div className="border-t border-gray-200 px-6 py-5 bg-gray-50/40">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div>
              <h3 className="text-sm font-semibold text-gray-800">Saved names and links</h3>
              <p className="text-xs text-gray-500 mt-0.5">
                Names you save with <span className="font-medium">Save</span> are stored in the database and listed here.
              </p>
            </div>
            <button
              type="button"
              onClick={fetchSavedIitLinks}
              disabled={savedLinksLoading}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 disabled:opacity-50"
            >
              <FiRefreshCw className={`w-4 h-4 ${savedLinksLoading ? 'animate-spin' : ''}`} aria-hidden />
              Refresh
            </button>
          </div>
          {savedLinksError ? (
            <p className="text-sm text-red-600 mb-3" role="alert">{savedLinksError}</p>
          ) : null}
          {savedLinksEnvHint ? (
            <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-3" role="status">
              {savedLinksEnvHint}
            </p>
          ) : null}
          {savedLinksLoading ? (
            <div className="py-6"><TableSkeleton rows={4} cols={8} /></div>
          ) : savedIitLinks.length === 0 ? (
            savedLinksEnvHint ? null : (
              <p className="text-sm text-gray-500 py-4">No saved links yet. Generate a URL and use Save to list.</p>
            )
          ) : (
            <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Influencer</th>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Landing</th>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Platform</th>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Campaign</th>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Link</th>
                    <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">Cost</th>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Created</th>
                    <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {savedIitLinks.map((row) => (
                    <tr key={`iit-saved-${String(row.id)}-${row.createdAt || ''}`} className="hover:bg-gray-50/80">
                      <td className="px-4 py-3 font-medium text-gray-900 max-w-[140px] truncate" title={row.influencerName}>{row.influencerName}</td>
                      <td className="px-4 py-3 text-gray-600 text-xs whitespace-nowrap">
                        {getIitUtmTabLabel(row.linkTarget || 'iitCounselling')}
                      </td>
                      <td className="px-4 py-3 text-gray-700">{row.platform}</td>
                      <td className="px-4 py-3 text-gray-600 max-w-[120px] truncate" title={row.campaign}>{row.campaign}</td>
                      <td className="px-4 py-3 text-gray-600 max-w-[min(280px,40vw)] truncate font-mono text-xs" title={row.utmLink}>{row.utmLink}</td>
                      <td className="px-4 py-3 text-right tabular-nums text-gray-700">{formatSavedCost(row.cost)}</td>
                      <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{formatSavedLinkDate(row.createdAt)}</td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => row.utmLink && navigator.clipboard.writeText(row.utmLink)}
                          className="inline-flex items-center justify-center p-1.5 rounded-lg text-gray-600 hover:bg-gray-100 mr-1"
                          title="Copy link"
                          aria-label="Copy link"
                        >
                          <FiCopy className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteSavedIitLink(row.id)}
                          disabled={deletingLinkId === row.id}
                          className="inline-flex items-center justify-center p-1.5 rounded-lg text-red-600 hover:bg-red-50 disabled:opacity-50"
                          title="Delete"
                          aria-label="Delete saved link"
                        >
                          <FiTrash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>

      <section className={cardClass}>
        <div className={`${sectionHeaderClass} flex flex-wrap items-start justify-between gap-4`}>
          <div className="space-y-3 min-w-0 flex-1">
            <div>
              <h2 className="text-base font-semibold text-gray-800">{analyticsPageTitle}</h2>
              <p className="text-sm text-gray-500 mt-0.5">
                {isSavedLinksOnlyTarget ? (
                  <>
                    Metrics for{' '}
                    <strong className="font-medium text-gray-700">
                      saved {getIitUtmTabLabel(analyticsLinkTarget).toLowerCase()} UTM links only
                    </strong>
                    {' '}(from Generate UTM Link above). {analyticsLinkedHelp}
                  </>
                ) : (
                  <>
                    UTM combinations from visits and saved links on{' '}
                    <span className="font-mono text-xs">{analyticsPagePath}</span>. {analyticsLinkedHelp}
                  </>
                )}
              </p>
              <p className="text-xs text-gray-500 mt-0.5">
                {isSavedLinksOnlyTarget
                  ? `Date filters apply to visit and lead counts for those saved links. Visits-over-time chart includes all ${analyticsPagePath} traffic.`
                  : 'Date filters apply to this table, KPIs, and charts above.'}
              </p>
            </div>
            <LandingPageTargetToggle
              label="Visit analytics"
              ariaLabel="UTM combo table landing page"
              value={analyticsLinkTarget}
              onChange={handleAnalyticsLinkTargetChange}
            />
          </div>
          {dateRangeToolbar}
        </div>

        {error ? (
          <div className="px-6 py-6">
            <p className="text-red-600 text-sm" role="alert">{error}</p>
          </div>
        ) : null}

        <div className="p-4 border-b border-gray-100 flex flex-wrap items-center gap-3">
          <input
            type="search"
            placeholder="Search source, medium, campaign, content, influencer"
            value={comboSearch}
            onChange={(e) => setComboSearch(e.target.value)}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm w-56 focus:ring-2 focus:ring-primary-navy/30 focus:border-primary-navy outline-none"
          />
          <button
            type="button"
            onClick={() => setCopyComboModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            aria-label="Copy to sheets"
          >
            <FiCopy className="w-4 h-4" /> Copy
          </button>
          {comboSearch ? (
            <span className="text-sm text-gray-500 self-center">
              Showing {filteredSortedCombo.length} of {mergedComboRows.length} rows
            </span>
          ) : null}
        </div>

        {loading ? (
          <div className="px-6 py-8"><TableSkeleton rows={8} cols={10} /></div>
        ) : mergedComboRows.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <p className="text-gray-500 text-sm">
              {isSavedLinksOnlyTarget
                ? `No saved ${getIitUtmTabLabel(analyticsLinkTarget).toLowerCase()} links yet.`
                : 'No UTM rows in this range.'}
            </p>
            <p className="text-gray-400 text-xs mt-1">
              {isSavedLinksOnlyTarget
                ? `Choose ${getIitUtmTabLabel(analyticsLinkTarget)} in Generate UTM Link, save influencer links, then refresh.`
                : `Saved links or visits with UTM tags on ${analyticsPagePath} will appear here.`}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">utm_source</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">utm_medium</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">utm_campaign</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">utm_content</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Influencer name</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider whitespace-nowrap">Date created</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider whitespace-nowrap">Last visit</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">Visits</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">Unique</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    {isMainPageTarget ? 'Linked registrations' : isIitUtmSavedLinksOnlyTarget(analyticsLinkTarget) ? 'Linked leads' : 'Linked'}
                  </th>
                  {isMainPageTarget ? (
                    <>
                      <th className="px-6 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">Completed</th>
                      <th className="px-6 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider whitespace-nowrap">In progress</th>
                    </>
                  ) : null}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredSortedCombo.map((row, idx) => (
                  <tr key={`${row.utm_source}-${row.utm_medium}-${row.utm_campaign}-${row.utm_content}-${idx}`} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/60 hover:bg-primary-blue-50/30'}>
                    <td className="px-6 py-4 text-sm max-w-[160px] truncate" title={row.utm_source}>{row.utm_source === '(none)' ? <span className="text-gray-400">(none)</span> : row.utm_source}</td>
                    <td className="px-6 py-4 text-sm max-w-[140px] truncate" title={row.utm_medium}>{row.utm_medium === '(none)' ? <span className="text-gray-400">(none)</span> : row.utm_medium}</td>
                    <td className="px-6 py-4 text-sm max-w-[160px] truncate" title={row.utm_campaign}>{row.utm_campaign === '(none)' ? <span className="text-gray-400">(none)</span> : row.utm_campaign}</td>
                    <td className="px-6 py-4 text-sm max-w-[160px] truncate" title={row.utm_content}>{row.utm_content === '(none)' ? <span className="text-gray-400">(none)</span> : row.utm_content}</td>
                    <td className="px-6 py-4 text-sm max-w-[160px] truncate font-medium text-gray-900" title={row.influencerName || ''}>
                      {row.influencerName ? row.influencerName : <span className="text-gray-400 font-normal">—</span>}
                    </td>
                    <td
                      className="px-6 py-4 text-sm text-gray-600 whitespace-nowrap"
                      title={row.dateCreated ? 'First visit with this UTM in range, or saved link created date' : ''}
                    >
                      {row.dateCreated ? formatSavedLinkDate(row.dateCreated) : <span className="text-gray-400">—</span>}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 whitespace-nowrap">
                      {row.lastVisitAt ? formatSavedLinkDate(row.lastVisitAt) : <span className="text-gray-400">—</span>}
                    </td>
                    <td className="px-6 py-4 text-sm text-right font-medium text-gray-900 tabular-nums">{row.visits}</td>
                    <td className="px-6 py-4 text-sm text-right text-gray-600 tabular-nums">{row.uniqueVisitors}</td>
                    <td className="px-6 py-4 text-sm text-right text-gray-600 tabular-nums">{row.linkedSubmissions}</td>
                    {isMainPageTarget ? (
                      <>
                        <td className="px-6 py-4 text-sm text-right text-gray-900 tabular-nums">{row.completed ?? 0}</td>
                        <td className="px-6 py-4 text-sm text-right text-gray-600 tabular-nums">{row.inProgress ?? 0}</td>
                      </>
                    ) : null}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <CopyToSheetsModal
        fields={isMainPageTarget
          ? [
              ...COMBO_COPY_FIELDS.filter((field) => field.key !== 'linkedSubmissions'),
              { key: 'linkedSubmissions', label: 'Linked registrations' },
              { key: 'completed', label: 'Completed' },
              { key: 'inProgress', label: 'In progress' },
            ]
          : COMBO_COPY_FIELDS}
        records={filteredSortedCombo}
        getCellValue={getComboCellValue}
        open={copyComboModalOpen}
        onClose={() => setCopyComboModalOpen(false)}
        recordLabel="UTM rows"
      />
    </div>
  );
}

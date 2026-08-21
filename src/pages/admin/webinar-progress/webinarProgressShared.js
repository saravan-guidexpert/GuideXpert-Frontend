export const MODULE_ORDER = ['intro', 's2', 'a1', 's3', 'a2', 's4', 'a3', 's5', 'a4', 's6', 'a5'];
export const TIMELINE_IDS = [...MODULE_ORDER, 'certificate'];
export const SESSION_IDS = ['intro', 's2', 's3', 's4', 's5', 's6'];
export const ASSESSMENT_IDS = ['a1', 'a2', 'a3', 'a4', 'a5'];
export const MODULE_LABELS = {
  intro: 'Introduction to GuideXpert Counsellor training program',
  s2: 'Session 1',
  a1: 'Assessment 1',
  s3: 'Session 2',
  a2: 'Assessment 2',
  s4: 'Session 3',
  a3: 'Assessment 3',
  s5: 'Session 4',
  a4: 'Assessment 4',
  s6: 'Session 5',
  a5: 'Assessment 5',
  certificate: 'Certificate',
};

export const SHORT_MODULE_LABELS = {
  intro: 'Intro',
  s2: 'Session 1',
  a1: 'Assess 1',
  s3: 'Session 2',
  a2: 'Assess 2',
  s4: 'Session 3',
  a3: 'Assess 3',
  s5: 'Session 4',
  a4: 'Assess 4',
  s6: 'Session 5',
  a5: 'Assess 5',
  certificate: 'Certificate',
};

export const INITIAL_FILTERS = {
  sort: '-lastActivityAt',
  filterMode: 'first_join',
  statuses: [],
  activeOn: '',
  fromDate: '',
  toDate: '',
  modulesMode: 'none',
  modulesBucket: '',
  modulesMin: '',
  modulesMax: '',
  progressMin: 0,
  progressMax: 100,
  lastActiveModule: '',
  activity: '',
};

export const WEBINAR_COPY_FIELDS = [
  { key: 'phone', label: 'Phone' },
  { key: 'fullName', label: 'Name' },
  { key: 'overallPercent', label: 'Progress %' },
  { key: 'modulesDone', label: 'Modules done' },
  { key: 'lastActiveModule', label: 'Last active module' },
  { key: 'firstJoinedAt', label: 'First joined' },
  { key: 'lastActivityAt', label: 'Last activity' },
  { key: 'isLegacyUser', label: 'Join type' },
];

export const MOTION_EASE = [0.22, 1, 0.36, 1];

export function toYMDLocal(d) {
  if (!d) return '';
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function parseYMDLocal(s) {
  if (!s || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return undefined;
  const [y, mo, d] = s.split('-').map(Number);
  return new Date(y, mo - 1, d);
}

export function buildListParams(f, debouncedSearch, page, limit) {
  const params = { page, limit, sort: f.sort, filterMode: f.filterMode || 'first_join' };
  const q = debouncedSearch.trim();
  if (q) params.search = q;
  if (f.statuses.length) params.status = f.statuses;
  if (f.activeOn) params.activeOn = f.activeOn;
  if (f.fromDate) params.firstJoinedFrom = f.fromDate;
  if (f.toDate) params.firstJoinedTo = f.toDate;
  if (f.modulesMode === 'bucket' && f.modulesBucket) params.modulesBucket = f.modulesBucket;
  if (f.modulesMode === 'custom') {
    if (f.modulesMin !== '') params.modulesMin = f.modulesMin;
    if (f.modulesMax !== '') params.modulesMax = f.modulesMax;
  }
  if (f.progressMin > 0 || f.progressMax < 100) {
    params.progressMin = f.progressMin;
    params.progressMax = f.progressMax;
  }
  if (f.lastActiveModule) params.lastActiveModule = f.lastActiveModule;
  if (f.activity) params.activity = f.activity;
  return params;
}

export function buildExportParams(f, debouncedSearch) {
  const p = buildListParams(f, debouncedSearch, 1, 25);
  delete p.page;
  delete p.limit;
  return p;
}

export function timeAgo(dateStr) {
  if (!dateStr) return '—';
  const diff = Date.now() - new Date(dateStr).getTime();
  if (diff < 60_000) return 'Just now';
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  return `${Math.floor(diff / 86_400_000)}d ago`;
}

export function formatDateTime(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
}

export function rowStatus(percent) {
  if (percent >= 100) return 'completed';
  if (percent > 0) return 'in_progress';
  return 'not_started';
}

export function initialsFromName(name) {
  const parts = String(name || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

export function countActiveFilters(f, searchInput) {
  let n = 0;
  if (searchInput.trim()) n += 1;
  if (f.statuses.length) n += 1;
  if (f.activeOn || f.fromDate || f.toDate) n += 1;
  if (f.activity) n += 1;
  if (f.lastActiveModule) n += 1;
  if (f.progressMin > 0 || f.progressMax < 100) n += 1;
  if (f.modulesMode !== 'none' && (f.modulesBucket || f.modulesMin !== '' || f.modulesMax !== '')) n += 1;
  return n;
}

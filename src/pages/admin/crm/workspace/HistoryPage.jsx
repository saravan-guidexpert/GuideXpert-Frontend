import { useId, useMemo, useState } from 'react';
import {
  FiActivity,
  FiChevronDown,
  FiChevronUp,
  FiClock,
  FiFilter,
  FiGitBranch,
  FiLayers,
  FiRefreshCw,
  FiSearch,
  FiUserCheck,
  FiUserMinus,
  FiUsers,
  FiX,
} from 'react-icons/fi';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useCrmSession } from '../../../crm-app/useCrmSession';
import { getPortalAdmissionHistory, getPortalAssignmentHistory, getPortalDailyHistory } from '../../../../utils/crmSessionApi';
import {
  PHASE_A_TIME_ZONE,
  historyAdmissionScopeNote,
  historyDailyScopeNote,
  historyEmptyMessage,
  historyQuery,
  paginationSummary,
  workspaceRouteDecision,
} from '../../../../utils/crmWorkspace';
import {
  HISTORY_ADMISSION_KINDS,
  HISTORY_ADMISSION_STATUSES,
  HISTORY_ASSIGNMENT_STATES,
  HISTORY_PERIODS,
  actorDisplay,
  admissionStatusDistribution,
  assignmentDuration,
  assignmentSummary,
  countActiveHistoryFilters,
  dailyActionBreakdown,
  dailyTrendRows,
  defaultHistoryFilters,
  filterAdmissionItems,
  filterAssignmentItems,
  filterDailyItems,
  formatHistoryWhen,
  historyActionLabel,
  historyFilterChips,
  historyMetricCards,
  reportingPeriodLabel,
  resolveHistoryPeriod,
} from '../../../../utils/crmHistory';
import { chartPalette } from '../../../crm-demo/crmTheme';
import { useCrmResource } from './useCrmResource';
import { AccessNote } from './workspaceUi';
import { useAdminTheme } from './adminThemeContext';
import { Notice } from './consultancyUi';
import './superAdminHistory.css';

const PAGE_LIMIT = 50;

function reducedMotion() {
  return typeof window !== 'undefined'
    && typeof window.matchMedia === 'function'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function TrendTip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const point = payload[0].payload;
  return (
    <div className="hist-tip">
      <span>{point.day}</span>
      <strong>{point.total} recorded · {point.business} business · {point.security} security</strong>
    </div>
  );
}

function StatusBarTip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const point = payload[0].payload;
  return (
    <div className="hist-tip">
      <span>{point.status}</span>
      <strong>{point.count} recorded transition{point.count === 1 ? '' : 's'} into this status</strong>
    </div>
  );
}

function MetricIcon({ id }) {
  if (id === 'admissions' || id === 'transitions') return <FiGitBranch size={14} aria-hidden="true" />;
  if (id === 'initial') return <FiUsers size={14} aria-hidden="true" />;
  if (id === 'assignments' || id === 'opened') return <FiUserCheck size={14} aria-hidden="true" />;
  if (id === 'revoked') return <FiUserMinus size={14} aria-hidden="true" />;
  if (id === 'activity' || id === 'recorded') return <FiActivity size={14} aria-hidden="true" />;
  return <FiLayers size={14} aria-hidden="true" />;
}

function Pager({ page, limit, total, onPage, disabled }) {
  const summary = paginationSummary(page, limit, total);
  return (
    <nav className="hist-pager" aria-label="Pagination">
      <span>{summary.label}</span>
      <div className="hist-pager-actions">
        <button type="button" className="hist-btn is-small" disabled={disabled || summary.previousDisabled} onClick={() => onPage(page - 1)}>Previous</button>
        <button type="button" className="hist-btn is-small" disabled={disabled || summary.nextDisabled} onClick={() => onPage(page + 1)}>Next</button>
      </div>
    </nav>
  );
}

function AdmissionDetail({ row, mode = 'full' }) {
  // Timeline already shows when/student/status/actor — keep expand sparse.
  if (mode === 'compact') {
    return (
      <div className="hist-detail is-compact">
        <dl>
          <dt>Student id</dt>
          <dd>{row.studentId || 'Unavailable'}</dd>
          {row.kind === 'initial' ? null : (
            <>
              <dt>Previous</dt>
              <dd>{row.previousStatus || 'Unavailable — not recorded'}</dd>
            </>
          )}
          <dt>New status</dt>
          <dd>{row.nextStatus || 'Unavailable — not recorded'}</dd>
        </dl>
      </div>
    );
  }
  return (
    <div className="hist-detail">
      <dl>
        <dt>Record type</dt>
        <dd>{row.kind === 'initial' ? 'Initial status' : 'Status transition'}</dd>
        <dt>When</dt>
        <dd>{formatHistoryWhen(row.at, PHASE_A_TIME_ZONE)}</dd>
        <dt>Student</dt>
        <dd>{row.studentName || 'Student name is not available'}</dd>
        <dt>Student id</dt>
        <dd>{row.studentId || 'Unavailable'}</dd>
        <dt>Previous status</dt>
        <dd>{row.kind === 'initial' ? 'Not applicable for an initial record' : (row.previousStatus || 'Unavailable — not recorded')}</dd>
        <dt>New status</dt>
        <dd>{row.nextStatus || 'Unavailable — not recorded'}</dd>
        <dt>Actor</dt>
        <dd>{actorDisplay(row.actor)}</dd>
      </dl>
    </div>
  );
}

function AssignmentDetail({ row }) {
  const duration = assignmentDuration(row);
  return (
    <div className="hist-detail">
      <dl>
        <dt>Consultancy</dt>
        <dd>{row.consultancyName || row.consultancyId || 'Unavailable'}</dd>
        <dt>Assigned user</dt>
        <dd>{row.userName || row.userId || 'Unavailable'}</dd>
        <dt>State</dt>
        <dd>{row.state === 'active' ? 'Still active' : 'Revoked'}</dd>
        <dt>Assigned</dt>
        <dd>{formatHistoryWhen(row.openedAt, PHASE_A_TIME_ZONE)}</dd>
        <dt>Assigned by</dt>
        <dd>{actorDisplay(row.openedBy)}</dd>
        <dt>Revoked</dt>
        <dd>{row.revokedAt ? formatHistoryWhen(row.revokedAt, PHASE_A_TIME_ZONE) : 'Still active'}</dd>
        <dt>Revoked by</dt>
        <dd>{row.revokedAt ? actorDisplay(row.revokedBy) : 'Not applicable'}</dd>
        <dt>{duration.elapsed ? 'Elapsed duration' : 'Stored duration'}</dt>
        <dd>{duration.text}. {duration.detail}</dd>
      </dl>
      {Array.isArray(row.events) && row.events.length ? (
        <div className="hist-lifecycle" aria-label="Assignment lifecycle">
          {row.events.map((event) => (
            <div key={`${event.action}-${event.at}`} className="hist-life-step">
              <strong>{event.action === 'assigned' ? 'Opened' : 'Revoked'}</strong>
              <span>{formatHistoryWhen(event.at, PHASE_A_TIME_ZONE)}</span>
              <span>{actorDisplay(event.actor)}</span>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export default function HistoryPage() {
  const { user } = useCrmSession();
  const decision = workspaceRouteDecision(user, 'history');
  const allowed = decision.state === 'allowed';
  const theme = useAdminTheme();
  const palette = chartPalette(theme);
  const brand = theme === 'dark' ? '#d6ff4a' : '#c6f000';
  const securityStroke = theme === 'dark' ? '#9aa3b2' : '#8a867f';
  const gradientId = useId().replace(/:/g, '');

  const [filters, setFilters] = useState(() => defaultHistoryFilters());
  const [pages, setPages] = useState({ admissions: 1, assignments: 1, daily: 1 });
  const [reloadKey, setReloadKey] = useState(0);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [admissionView, setAdmissionView] = useState('timeline');
  const [assignmentView, setAssignmentView] = useState('lifecycle');
  const [selectedAdmission, setSelectedAdmission] = useState(null);
  const [selectedAssignment, setSelectedAssignment] = useState(null);
  const [expandedDaily, setExpandedDaily] = useState(null);

  const built = useMemo(
    () => historyQuery({ ...filters, timeZone: PHASE_A_TIME_ZONE, page: 1, limit: PAGE_LIMIT }),
    [filters]
  );

  function admissionQuery() {
    return historyQuery({ ...filters, timeZone: PHASE_A_TIME_ZONE, page: pages.admissions, limit: PAGE_LIMIT });
  }
  function assignmentQuery() {
    return historyQuery({ ...filters, timeZone: PHASE_A_TIME_ZONE, page: pages.assignments, limit: PAGE_LIMIT });
  }
  function dailyQuery() {
    return historyQuery({ ...filters, timeZone: PHASE_A_TIME_ZONE, page: pages.daily, limit: PAGE_LIMIT });
  }

  const admissions = useCrmResource(
    allowed && !built.error,
    `${reloadKey}:admissions:${built.error || JSON.stringify({ ...filters, page: pages.admissions })}`,
    () => getPortalAdmissionHistory(admissionQuery().query),
    true,
    { keepData: true }
  );
  const assignments = useCrmResource(
    allowed && !built.error,
    `${reloadKey}:assignments:${built.error || JSON.stringify({ ...filters, page: pages.assignments })}`,
    () => getPortalAssignmentHistory(assignmentQuery().query),
    true,
    { keepData: true }
  );
  const daily = useCrmResource(
    allowed && !built.error,
    `${reloadKey}:daily:${built.error || JSON.stringify({ ...filters, page: pages.daily })}`,
    () => getPortalDailyHistory(dailyQuery().query),
    true,
    { keepData: true }
  );

  function update(patch) {
    setFilters((current) => ({ ...current, ...patch }));
    setPages({ admissions: 1, assignments: 1, daily: 1 });
    setSelectedAdmission(null);
    setSelectedAssignment(null);
    setExpandedDaily(null);
  }

  function setPeriod(period) {
    if (period === 'custom') {
      update({ period });
      return;
    }
    const range = resolveHistoryPeriod(period);
    update({ period, from: range.from, to: range.to });
  }

  function resetFilters() {
    setFilters(defaultHistoryFilters());
    setPages({ admissions: 1, assignments: 1, daily: 1 });
    setSelectedAdmission(null);
    setSelectedAssignment(null);
    setExpandedDaily(null);
    setAdvancedOpen(false);
  }

  function refresh() {
    setReloadKey((value) => value + 1);
  }

  const loading = admissions.loading || assignments.loading || daily.loading;
  const firstLoad = loading && !admissions.data && !assignments.data && !daily.data;
  const activeFilterCount = countActiveHistoryFilters(filters);
  const chips = historyFilterChips(filters);
  const rangeLabel = reportingPeriodLabel(filters.from, filters.to, PHASE_A_TIME_ZONE);
  const admissionScope = historyAdmissionScopeNote(admissions.data);
  const dailyScope = historyDailyScopeNote(daily.data);

  const metrics = useMemo(
    () => historyMetricCards({
      admissions: admissions.data,
      assignments: assignments.data,
      daily: daily.data,
      rangeLabel,
      filters,
    }),
    [admissions.data, assignments.data, daily.data, rangeLabel, filters]
  );

  const admissionItems = useMemo(
    () => filterAdmissionItems(admissions.data?.items || [], filters.search),
    [admissions.data, filters.search]
  );
  const assignmentItems = useMemo(
    () => filterAssignmentItems(assignments.data?.items || [], filters.search),
    [assignments.data, filters.search]
  );
  const dailyItems = useMemo(
    () => filterDailyItems(daily.data?.items || [], filters.search),
    [daily.data, filters.search]
  );

  const statusDist = useMemo(() => admissionStatusDistribution(admissionItems), [admissionItems]);
  const assignStats = useMemo(() => assignmentSummary(assignments.data), [assignments.data]);
  const trend = useMemo(() => dailyTrendRows(dailyItems), [dailyItems]);
  const breakdown = useMemo(() => dailyActionBreakdown(dailyItems), [dailyItems]);

  if (!allowed) return <AccessNote>{decision.message}</AccessNote>;

  return (
    <div className="gx-admin-page hist-page">
      <header className="hist-head">
        <div className="hist-head-copy">
          <h1 className="hist-title">History &amp; Audit Intelligence</h1>
          <p className="hist-lede">
            Recorded admission changes, assignment intervals, and daily CRM activity · {PHASE_A_TIME_ZONE}.
          </p>
        </div>
        <div className="hist-head-actions">
          <span className="hist-zone" title={rangeLabel}>
            <FiClock size={13} aria-hidden="true" />
            {filters.from && filters.to ? `${filters.from} → ${filters.to}` : 'Set dates'}
          </span>
          <button type="button" className={`hist-btn is-icon${loading ? ' is-spinning' : ''}`} onClick={refresh} disabled={loading} aria-label="Refresh history">
            <FiRefreshCw size={15} aria-hidden="true" />
          </button>
        </div>
      </header>

      <section className="hist-panel hist-toolbar-panel" aria-labelledby="hist-filters-title">
        <header className="hist-panel-head">
          <div>
            <h2 id="hist-filters-title">Filters</h2>
            <p>Dates apply to every section</p>
          </div>
        </header>

        <div className="hist-toolbar" role="search" aria-label="History filters">
          <div className="hist-field hist-field-periods">
            <span className="hist-label" id="hist-period-label">Period</span>
            <div className="hist-periods" role="group" aria-labelledby="hist-period-label">
              {HISTORY_PERIODS.map((period) => (
                <button
                  key={period.id}
                  type="button"
                  className={`hist-period${filters.period === period.id ? ' is-active' : ''}`}
                  onClick={() => setPeriod(period.id)}
                >
                  {period.label}
                </button>
              ))}
            </div>
          </div>
          <div className="hist-field">
            <label className="hist-label" htmlFor="hist-from">Start date</label>
            <input
              id="hist-from"
              type="date"
              className="hist-input"
              value={filters.from}
              disabled={loading && !admissions.data}
              onChange={(event) => update({ period: 'custom', from: event.target.value })}
            />
          </div>
          <div className="hist-field">
            <label className="hist-label" htmlFor="hist-to">End date</label>
            <input
              id="hist-to"
              type="date"
              className="hist-input"
              value={filters.to}
              disabled={loading && !admissions.data}
              onChange={(event) => update({ period: 'custom', to: event.target.value })}
            />
          </div>
          <div className="hist-field hist-field-search">
            <label className="hist-label" htmlFor="hist-search">Search</label>
            <div className="hist-input-wrap">
              <FiSearch size={14} aria-hidden="true" className="hist-input-ico" />
              <input
                id="hist-search"
                className="hist-input has-icon"
                value={filters.search}
                maxLength={80}
                placeholder="Student, consultancy, action, actor"
                onChange={(event) => setFilters((current) => ({ ...current, search: event.target.value }))}
              />
            </div>
          </div>
          <div className="hist-toolbar-actions">
            <span className="hist-label hist-label-spacer" aria-hidden="true">Actions</span>
            <div className="hist-toolbar-buttons">
              <button
                type="button"
                className="hist-btn"
                aria-expanded={advancedOpen}
                onClick={() => setAdvancedOpen((open) => !open)}
              >
                <FiFilter size={14} aria-hidden="true" />
                Advanced{activeFilterCount ? ` (${activeFilterCount})` : ''}
                {advancedOpen ? <FiChevronUp size={14} aria-hidden="true" /> : <FiChevronDown size={14} aria-hidden="true" />}
              </button>
              {activeFilterCount ? (
                <button type="button" className="hist-btn is-quiet" onClick={resetFilters}>
                  <FiX size={14} aria-hidden="true" /> Clear
                </button>
              ) : null}
            </div>
          </div>
        </div>

        {advancedOpen ? (
          <div className="hist-advanced">
            <div className="hist-advanced-grid">
              <div className="hist-field">
                <label className="hist-label" htmlFor="hist-kind">Admission record</label>
                <select id="hist-kind" className="hist-input" value={filters.kind} onChange={(event) => update({ kind: event.target.value })}>
                  {HISTORY_ADMISSION_KINDS.map((option) => <option key={option.id || 'all'} value={option.id}>{option.label}</option>)}
                </select>
              </div>
              <div className="hist-field">
                <label className="hist-label" htmlFor="hist-assignment">Assignment state</label>
                <select id="hist-assignment" className="hist-input" value={filters.assignment} onChange={(event) => update({ assignment: event.target.value })}>
                  {HISTORY_ASSIGNMENT_STATES.map((option) => <option key={option.id || 'all'} value={option.id}>{option.label}</option>)}
                </select>
              </div>
              <div className="hist-field">
                <label className="hist-label" htmlFor="hist-from-status">Previous status</label>
                <select id="hist-from-status" className="hist-input" value={filters.fromStatus} onChange={(event) => update({ fromStatus: event.target.value })}>
                  <option value="">Any previous status</option>
                  {HISTORY_ADMISSION_STATUSES.map((status) => <option key={status} value={status}>{status}</option>)}
                </select>
              </div>
              <div className="hist-field">
                <label className="hist-label" htmlFor="hist-to-status">New status</label>
                <select id="hist-to-status" className="hist-input" value={filters.toStatus} onChange={(event) => update({ toStatus: event.target.value })}>
                  <option value="">Any new status</option>
                  {HISTORY_ADMISSION_STATUSES.map((status) => <option key={status} value={status}>{status}</option>)}
                </select>
              </div>
              <div className="hist-field">
                <label className="hist-label" htmlFor="hist-consultancy">Consultancy id</label>
                <input
                  id="hist-consultancy"
                  className="hist-input"
                  value={filters.consultancyId}
                  placeholder="Object id"
                  onChange={(event) => update({ consultancyId: event.target.value.trim() })}
                />
              </div>
              <div className="hist-field">
                <label className="hist-label" htmlFor="hist-actor">Staff / actor id</label>
                <input
                  id="hist-actor"
                  className="hist-input"
                  value={filters.actorId}
                  placeholder="Who recorded it"
                  onChange={(event) => update({ actorId: event.target.value.trim() })}
                />
              </div>
              <div className="hist-field">
                <label className="hist-label" htmlFor="hist-user">Assigned user id</label>
                <input
                  id="hist-user"
                  className="hist-input"
                  value={filters.userId}
                  placeholder="Assignment interval"
                  onChange={(event) => update({ userId: event.target.value.trim() })}
                />
              </div>
            </div>
          </div>
        ) : null}

        {chips.length ? (
          <div className="hist-chips" aria-label="Active filters">
            {chips.map((chip) => (
              <button
                key={chip.key}
                type="button"
                className="hist-chip"
                onClick={() => {
                  if (chip.key === 'search') setFilters((current) => ({ ...current, search: '' }));
                  else update(chip.clear);
                }}
              >
                {chip.label}
                <FiX size={12} aria-hidden="true" />
              </button>
            ))}
          </div>
        ) : null}
      </section>

      {built.error ? <Notice tone="warning">{built.error}</Notice> : null}
      {admissions.notice ? <Notice tone={admissions.notice.tone}>{admissions.notice.message}</Notice> : null}
      {assignments.notice ? <Notice tone={assignments.notice.tone}>{assignments.notice.message}</Notice> : null}
      {daily.notice ? <Notice tone={daily.notice.tone}>{daily.notice.message}</Notice> : null}

      <section className="hist-metrics-section" aria-labelledby="hist-metrics-title">
        <div className="hist-panel-head">
          <div>
            <h2 id="hist-metrics-title">Audit intelligence summary</h2>
            <p>{rangeLabel}</p>
          </div>
        </div>
        {firstLoad ? (
          <div className="hist-metrics" aria-busy="true" aria-label="Loading metrics">
            {Array.from({ length: 8 }, (_, index) => <div key={index} className="hist-bone h-metric" />)}
          </div>
        ) : (
          <ul className="hist-metrics">
            {metrics.map((card) => {
              const active = card.filter && Object.keys(card.filter).every((key) => (filters[key] || '') === (card.filter[key] || ''));
              return (
                <li key={card.key}>
                  <button
                    type="button"
                    className={`hist-metric${card.unavailable ? ' is-unavailable' : ''}${active && card.filter ? ' is-active' : ''}`}
                    disabled={card.unavailable || !card.filter}
                    onClick={() => card.filter && update(card.filter)}
                    title={card.detail}
                  >
                    <span className="hist-metric-top">
                      <span className="hist-metric-icon" aria-hidden="true"><MetricIcon id={card.key} /></span>
                      <span className="hist-metric-label">{card.label}</span>
                    </span>
                    <span className="hist-metric-foot">
                      <span className="hist-metric-value">{card.text}</span>
                      {card.pageScoped ? <span className="hist-metric-scope">Loaded page only</span> : null}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="hist-panel" aria-labelledby="hist-admissions-title">
        <header className="hist-panel-head">
          <div>
            <h2 id="hist-admissions-title">Admission history</h2>
            <p>{admissionScope || 'Recorded status changes and initial records'}</p>
          </div>
          <div className="hist-tabs" role="tablist" aria-label="Admission view">
            <button type="button" role="tab" aria-selected={admissionView === 'timeline'} className={`hist-tab${admissionView === 'timeline' ? ' is-active' : ''}`} onClick={() => setAdmissionView('timeline')}>Timeline</button>
            <button type="button" role="tab" aria-selected={admissionView === 'table'} className={`hist-tab${admissionView === 'table' ? ' is-active' : ''}`} onClick={() => setAdmissionView('table')}>Table</button>
          </div>
        </header>

        {admissions.loading && !admissions.data ? <div className="hist-bone h-list" /> : null}

        {admissions.data ? (
          <>
            {admissions.data.truncated ? (
              <Notice tone="warning">This window has more audits than the report loads. Narrow the dates. The omitted rows are not shown as zero.</Notice>
            ) : null}
            {admissions.data.unclassified ? (
              <p className="hist-note">
                {admissions.data.unclassified} audit {admissions.data.unclassified === 1 ? 'row does' : 'rows do'} not contain a readable admission status and {admissions.data.unclassified === 1 ? 'is' : 'are'} omitted.
              </p>
            ) : null}

            {statusDist.length ? (
              <div className="hist-chart is-status" role="img" aria-label="Admission status transition distribution">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={statusDist} margin={{ top: 2, right: 8, left: 0, bottom: 24 }}>
                    <CartesianGrid vertical={false} stroke={palette.grid} />
                    <XAxis dataKey="status" tick={{ fontSize: 11, fill: palette.tick }} interval={0} angle={-18} textAnchor="end" height={46} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: palette.tick }} width={28} />
                    <Tooltip content={<StatusBarTip />} />
                    <Bar dataKey="count" fill={brand} radius={[4, 4, 0, 0]} isAnimationActive={!reducedMotion()} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : null}

            {!admissionItems.length ? (
              <p className="hist-empty">{filters.search ? 'No loaded admission rows match this search.' : historyEmptyMessage('admissions')}</p>
            ) : null}

            {admissionView === 'timeline' && admissionItems.length ? (
              <ul className="hist-timeline hist-ios-scroll">
                {admissionItems.map((row) => {
                  const open = selectedAdmission === row.id;
                  return (
                    <li key={row.id}>
                      <button
                        type="button"
                        className={`hist-event is-${row.kind}${open ? ' is-selected is-open' : ''}`}
                        onClick={() => setSelectedAdmission(open ? null : row.id)}
                        aria-expanded={open}
                      >
                        <span className="hist-rail" aria-hidden="true"><span className="hist-dot" /></span>
                        <span className="hist-event-main">
                          <p className="hist-event-title">{row.studentName || 'Student name is not available'}</p>
                          <p className="hist-event-meta">
                            {row.kind === 'initial' ? 'Initial status' : 'Status change'}
                            {' · '}
                            {actorDisplay(row.actor)}
                          </p>
                          <span className="hist-status-flow">
                            {row.kind === 'transition' ? (
                              <>
                                <span className="hist-status">{row.previousStatus || 'Unavailable'}</span>
                                <span className="hist-arrow" aria-hidden="true">→</span>
                                <span className="hist-status is-next">{row.nextStatus || 'Unavailable'}</span>
                              </>
                            ) : (
                              <span className="hist-status is-next">{row.nextStatus || 'Unavailable'}</span>
                            )}
                          </span>
                          {open ? <AdmissionDetail row={row} mode="compact" /> : null}
                        </span>
                        <span className="hist-event-side">
                          <span className="hist-event-when">{formatHistoryWhen(row.at, PHASE_A_TIME_ZONE)}</span>
                          <span className={`hist-pill is-${row.kind}`}>{row.kind === 'initial' ? 'Initial' : 'Transition'}</span>
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            ) : null}

            {admissionView === 'table' && admissionItems.length ? (
              <div className="hist-table-wrap">
                <table className="hist-table">
                  <thead>
                    <tr>
                      <th>When</th>
                      <th>Record</th>
                      <th>Student</th>
                      <th>Status</th>
                      <th>Actor</th>
                    </tr>
                  </thead>
                  <tbody>
                    {admissionItems.map((row) => (
                      <tr key={row.id}>
                        <td>{formatHistoryWhen(row.at, PHASE_A_TIME_ZONE)}</td>
                        <td>{row.kind === 'initial' ? 'Initial status' : 'Status change'}</td>
                        <td>{row.studentName || 'Student name is not available'}</td>
                        <td>{row.kind === 'initial' ? row.nextStatus : `${row.previousStatus || '?'} → ${row.nextStatus || '?'}`}</td>
                        <td>{actorDisplay(row.actor)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : null}

            <Pager
              page={admissions.data.page}
              limit={admissions.data.limit}
              total={admissions.data.total}
              disabled={admissions.loading}
              onPage={(admissionsPage) => setPages((current) => ({ ...current, admissions: admissionsPage }))}
            />
          </>
        ) : null}
      </section>

      <section className="hist-panel" aria-labelledby="hist-assignments-title">
        <header className="hist-panel-head">
          <div>
            <h2 id="hist-assignments-title">Consultancy assignment history</h2>
            <p>Open and revoke intervals for assigned consultancies</p>
          </div>
          <div className="hist-tabs" role="tablist" aria-label="Assignment view">
            <button type="button" role="tab" aria-selected={assignmentView === 'lifecycle'} className={`hist-tab${assignmentView === 'lifecycle' ? ' is-active' : ''}`} onClick={() => setAssignmentView('lifecycle')}>Lifecycle</button>
            <button type="button" role="tab" aria-selected={assignmentView === 'table'} className={`hist-tab${assignmentView === 'table' ? ' is-active' : ''}`} onClick={() => setAssignmentView('table')}>Table</button>
          </div>
        </header>

        {assignments.loading && !assignments.data ? <div className="hist-bone h-list" /> : null}

        {assignments.data ? (
          <>
            <div className="hist-summary-strip" aria-label="Assignment summary">
              <div className="hist-summary-cell">
                <strong>{assignStats.total == null ? '—' : assignStats.total}</strong>
                <span>Historical rows</span>
              </div>
              <div className="hist-summary-cell">
                <strong>{assignStats.opened}</strong>
                <span>Opened in period</span>
              </div>
              <div className="hist-summary-cell">
                <strong>{assignStats.revokedInPeriod}</strong>
                <span>Revoked in period</span>
              </div>
              <div className="hist-summary-cell">
                <strong>{assignStats.active}</strong>
                <span>Still active</span>
              </div>
            </div>
            {assignStats.pageScoped ? (
              <p className="hist-note hist-note-tight">Opened, revoked, and active counts are from the loaded page. Historical total is server-side.</p>
            ) : null}

            {!assignmentItems.length ? (
              <p className="hist-empty">{filters.search ? 'No loaded assignment rows match this search.' : historyEmptyMessage('assignments')}</p>
            ) : null}

            {assignmentView === 'lifecycle' && assignmentItems.length ? (
              <ul className="hist-timeline hist-ios-scroll">
                {assignmentItems.map((row) => {
                  const open = selectedAssignment === row.id;
                  const duration = assignmentDuration(row);
                  return (
                    <li key={row.id} className="hist-assign-card">
                      <button
                        type="button"
                        className={`hist-event is-${row.state}${open ? ' is-selected is-open' : ''}`}
                        onClick={() => setSelectedAssignment(open ? null : row.id)}
                        aria-expanded={open}
                      >
                        <span className="hist-rail" aria-hidden="true"><span className="hist-dot" /></span>
                        <span className="hist-event-main">
                          <p className="hist-event-title">{row.consultancyName || row.consultancyId}</p>
                          <p className="hist-event-meta">
                            {row.userName || row.userId}
                            {' · '}
                            {duration.elapsed ? `Elapsed ${duration.text}` : `Held ${duration.text}`}
                          </p>
                          {open ? <AssignmentDetail row={row} /> : null}
                        </span>
                        <span className="hist-event-side">
                          <span className="hist-event-when">{formatHistoryWhen(row.openedAt, PHASE_A_TIME_ZONE)}</span>
                          <span className={`hist-pill is-${row.state}`}>{row.state === 'active' ? 'Active' : 'Revoked'}</span>
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            ) : null}

            {assignmentView === 'table' && assignmentItems.length ? (
              <div className="hist-table-wrap">
                <table className="hist-table">
                  <thead>
                    <tr>
                      <th>Consultancy</th>
                      <th>Assigned user</th>
                      <th>Assigned</th>
                      <th>Assigned by</th>
                      <th>Revoked</th>
                      <th>State</th>
                    </tr>
                  </thead>
                  <tbody>
                    {assignmentItems.map((row) => (
                      <tr key={row.id}>
                        <td>{row.consultancyName || row.consultancyId}</td>
                        <td>{row.userName || row.userId}</td>
                        <td>{formatHistoryWhen(row.openedAt, PHASE_A_TIME_ZONE)}</td>
                        <td>{actorDisplay(row.openedBy)}</td>
                        <td>{row.revokedAt ? formatHistoryWhen(row.revokedAt, PHASE_A_TIME_ZONE) : 'Still active'}</td>
                        <td>{row.state}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : null}

            <Pager
              page={assignments.data.page}
              limit={assignments.data.limit}
              total={assignments.data.total}
              disabled={assignments.loading}
              onPage={(assignmentsPage) => setPages((current) => ({ ...current, assignments: assignmentsPage }))}
            />
          </>
        ) : null}
      </section>

      <div className="hist-grid">
        <section className="hist-panel" aria-labelledby="hist-trend-title">
          <header className="hist-panel-head">
            <div>
              <h2 id="hist-trend-title">Daily activity trend</h2>
              <p>{dailyScope || 'Business vs security by day'}</p>
            </div>
          </header>
          {daily.loading && !daily.data ? <div className="hist-bone h-chart" /> : null}
          {daily.data && !trend.length ? <div className="hist-chart-empty">{filters.search ? 'No loaded activity groups match this search.' : historyEmptyMessage('daily')}</div> : null}
          {trend.length ? (
            <div className="hist-chart" role="img" aria-label="Daily recorded activity chart">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trend} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id={`hist-biz-${gradientId}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={brand} stopOpacity={theme === 'dark' ? 0.28 : 0.45} />
                      <stop offset="100%" stopColor={brand} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid vertical={false} stroke={palette.grid} />
                  <XAxis dataKey="label" tickLine={false} axisLine={false} minTickGap={28} tick={{ fontSize: 11, fill: palette.tick }} />
                  <YAxis allowDecimals={false} tickLine={false} axisLine={false} width={28} tick={{ fontSize: 11, fill: palette.tick }} />
                  <Tooltip content={<TrendTip />} />
                  <Area type="monotone" dataKey="business" name="Business" stroke={brand} fill={`url(#hist-biz-${gradientId})`} strokeWidth={2} isAnimationActive={!reducedMotion()} />
                  <Area type="monotone" dataKey="security" name="Security" stroke={securityStroke} fill="transparent" strokeWidth={1.5} strokeDasharray="4 4" isAnimationActive={!reducedMotion()} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : null}
        </section>

        <section className="hist-panel" aria-labelledby="hist-dist-title">
          <header className="hist-panel-head">
            <div>
              <h2 id="hist-dist-title">Action breakdown</h2>
              <p>Top actions on loaded days</p>
            </div>
          </header>
          {breakdown.length ? (
            <ul className="hist-dist">
              {breakdown.slice(0, 10).map((row) => (
                <li key={row.id} className="hist-dist-row">
                  <div className="hist-dist-meta">
                    <span className="hist-dist-label">{row.label}</span>
                    <span className="hist-dist-track" aria-hidden="true"><span className="hist-dist-fill" style={{ width: `${Math.max(row.percent, 4)}%` }} /></span>
                  </div>
                  <span className="hist-dist-count">{row.count}</span>
                </li>
              ))}
            </ul>
          ) : (
            <div className="hist-chart-empty">No actions to chart on this page.</div>
          )}
        </section>
      </div>

      <section className="hist-panel" aria-labelledby="hist-daily-title">
        <header className="hist-panel-head">
          <div>
            <h2 id="hist-daily-title">Daily event explorer</h2>
            <p>Grouped recorded actions for the selected range</p>
          </div>
        </header>

        {daily.loading && !daily.data ? <div className="hist-bone h-list" /> : null}

        {daily.data ? (
          <>
            {!dailyItems.length ? (
              <p className="hist-empty">{filters.search ? 'No loaded activity groups match this search.' : historyEmptyMessage('daily')}</p>
            ) : (
              <ul className="hist-timeline hist-ios-scroll">
                {dailyItems.map((row) => {
                  const key = `${row.day}:${row.action}:${row.source}:${row.actor?.id || 'none'}`;
                  const open = expandedDaily === key;
                  return (
                    <li key={key}>
                      <button
                        type="button"
                        className={`hist-event${open ? ' is-selected is-open' : ''}`}
                        onClick={() => setExpandedDaily(open ? null : key)}
                        aria-expanded={open}
                      >
                        <span className="hist-rail" aria-hidden="true"><span className="hist-dot" /></span>
                        <span className="hist-event-main">
                          <p className="hist-event-title">{historyActionLabel(row.action)}</p>
                          <p className="hist-event-meta">{actorDisplay(row.actor)} · {row.count === 1 ? '1 recorded row' : `${row.count} recorded rows`}</p>
                          {open ? (
                            <div className="hist-detail">
                              <dl>
                                <dt>Day</dt>
                                <dd>{row.day}</dd>
                                <dt>Action</dt>
                                <dd>{row.action}</dd>
                                <dt>Source</dt>
                                <dd>{row.source === 'security' ? 'Security audit' : 'Business audit'}</dd>
                                <dt>Actor</dt>
                                <dd>{actorDisplay(row.actor)}</dd>
                                <dt>Recorded rows</dt>
                                <dd>{row.count}</dd>
                                <dt>Individual records</dt>
                                <dd>Unavailable on this endpoint — open Activity for per-event inspection when authorized.</dd>
                              </dl>
                            </div>
                          ) : null}
                        </span>
                        <span className="hist-event-side">
                          <span className="hist-event-when">{row.day}</span>
                          <span className={`hist-pill is-${row.source === 'security' ? 'security' : 'business'}`}>
                            {row.source === 'security' ? 'Security' : 'Business'}
                          </span>
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
            <Pager
              page={daily.data.page}
              limit={daily.data.limit}
              total={daily.data.total}
              disabled={daily.loading}
              onPage={(dailyPage) => setPages((current) => ({ ...current, daily: dailyPage }))}
            />
          </>
        ) : null}
      </section>

      <details className="hist-limits">
        <summary>Data definitions &amp; limitations</summary>
        <ul>
          <li>Dates use {PHASE_A_TIME_ZONE}, pending business-owner confirmation. An omitted timezone is UTC on the server.</li>
          <li>This is recorded history — not working time, productivity, or a conversion rate.</li>
          <li>Legacy students without an audit are omitted, not shown as zero.</li>
          <li>Consultancy filters on admission history use the student&apos;s current referral, not the consultancy on the day of the change.</li>
          <li>Assignment duration is open → revoke (or elapsed to date). It does not credit work to the earliest assignee.</li>
          <li>Daily trend points are only days present in the loaded page; empty days are left out.</li>
          <li>Daily groups do not expand individual audit rows — open Activity for per-event inspection when authorized.</li>
          <li>Page-scoped KPI figures are labeled when server totals for that slice are unavailable.</li>
        </ul>
      </details>
    </div>
  );
}

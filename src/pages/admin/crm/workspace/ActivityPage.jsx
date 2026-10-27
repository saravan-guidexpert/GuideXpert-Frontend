import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import {
  FiAlertTriangle,
  FiChevronLeft,
  FiChevronRight,
  FiClock,
  FiRefreshCw,
  FiSearch,
  FiUsers,
  FiX,
} from 'react-icons/fi';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useCrmSession } from '../../../crm-app/useCrmSession';
import { useDebouncedValue } from '../../../../hooks/useDebouncedValue';
import {
  fetchPortalDirectory,
  getPortalActivity,
  getPortalActivitySummary,
  getPortalConsultancyOverview,
  listPortalActivity,
} from '../../../../utils/crmSessionApi';
import {
  activityListQuery,
  activitySummaryQuery,
  applyFilterPatch,
  isObjectId,
  PHASE_A_TIME_ZONE,
  presenceBadge,
  workspaceRouteDecision,
} from '../../../../utils/crmWorkspace';
import {
  ACTIVITY_ENTITY_TYPES,
  ACTIVITY_PERIODS,
  ACTIVITY_SOURCES,
  actionOptions,
  activityCountsByDay,
  activityDistribution,
  activityMetricCards,
  activityResultSummary,
  activityTrendRows,
  buildActivityCalendarDays,
  calendarMonthLabel,
  defaultActivityFilters,
  formatChangeValue,
  hasActivityFilters,
  mergeStaffPresence,
  resolveActivityPeriod,
  shiftCalendarMonth,
  timelineStory,
} from '../../../../utils/crmActivity';
import { filterStaffDirectory, PRESENCE_MEANINGS } from '../../../../utils/crmStaff360';
import { formatMoment, relativeTime } from '../../../../utils/crmOverview';
import { chartPalette } from '../../../crm-demo/crmTheme';
import { useCrmResource } from './useCrmResource';
import Staff360Detail from './Staff360Detail';
import { AccessNote } from './workspaceUi';
import { useAdminTheme } from './adminThemeContext';
import { Avatar, Notice, PersonCombobox, Sheet } from './consultancyUi';
import './superAdminActivity.css';

function reducedMotion() {
  return typeof window !== 'undefined'
    && typeof window.matchMedia === 'function'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function TrendTip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const point = payload[0].payload;
  return (
    <div className="act-tip">
      <span>{point.label}</span>
      <strong>{point.business} business · {point.security} security</strong>
    </div>
  );
}

function PresencePill({ state }) {
  const badge = presenceBadge(state);
  return <span className={`act-pill is-${badge.tone}`}>{badge.label}</span>;
}

function SourcePill({ source }) {
  return <span className={`act-pill is-${source === 'security' ? 'security' : 'business'}`}>{source === 'security' ? 'Security' : 'Business'}</span>;
}

function useIosScrollActive(idleMs = 700) {
  const [active, setActive] = useState(false);
  const timer = useRef(null);
  useEffect(() => () => {
    if (timer.current) window.clearTimeout(timer.current);
  }, []);
  const onScroll = useCallback(() => {
    setActive(true);
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setActive(false), idleMs);
  }, [idleMs]);
  return { active, onScroll };
}

export default function ActivityPage() {
  const { user } = useCrmSession();
  const decision = workspaceRouteDecision(user, 'activity');
  const allowed = decision.state === 'allowed';
  const theme = useAdminTheme();
  const palette = chartPalette(theme);
  const brand = theme === 'dark' ? '#d6ff4a' : '#c6f000';
  const securityStroke = theme === 'dark' ? '#9aa3b2' : '#8a867f';

  const [filters, setFilters] = useState(() => defaultActivityFilters());
  const [searchText, setSearchText] = useState('');
  const debouncedSearch = useDebouncedValue(searchText, 300);
  const [appliedSearch, setAppliedSearch] = useState('');
  if (debouncedSearch !== appliedSearch) {
    setAppliedSearch(debouncedSearch);
    setFilters((current) => applyFilterPatch(current, { q: debouncedSearch.trim() }));
  }

  const [staffQuery, setStaffQuery] = useState('');
  const debouncedStaff = useDebouncedValue(staffQuery, 300);
  const [staffFilter, setStaffFilter] = useState(null);
  const [staffListQ, setStaffListQ] = useState('');
  const [staffRole, setStaffRole] = useState('');
  const [staffStatus, setStaffStatus] = useState('');
  const [staffPresence, setStaffPresence] = useState('');
  const [houseQuery, setHouseQuery] = useState('');
  const debouncedHouse = useDebouncedValue(houseQuery, 300);
  const [houseFilter, setHouseFilter] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [selected, setSelected] = useState(null);
  const timelineScroll = useIosScrollActive();
  const staffScroll = useIosScrollActive();
  const [profile, setProfile] = useState(null);
  const [calendarCursor, setCalendarCursor] = useState(() => {
    const today = resolveActivityPeriod('today').from;
    const [year, month] = today.split('-').map(Number);
    return { year, monthIndex: month - 1 };
  });
  const gradientId = useId().replace(/:/g, '');

  const listBuilt = useMemo(
    () => ({
      ...filters,
      timeZone: PHASE_A_TIME_ZONE,
      actorId: staffFilter?.id || filters.actorId || '',
      consultancyId: houseFilter?.id || filters.consultancyId || '',
    }),
    [filters, staffFilter, houseFilter]
  );
  const listQuery = useMemo(() => activityListQuery(listBuilt), [listBuilt]);
  const summaryQuery = useMemo(() => activitySummaryQuery({ ...listBuilt, summaryLimit: 8 }), [listBuilt]);

  const summary = useCrmResource(
    allowed && !summaryQuery.error,
    `${reloadKey}:summary:${summaryQuery.error || JSON.stringify(summaryQuery.query)}`,
    () => getPortalActivitySummary(summaryQuery.query),
    false,
    { keepData: true }
  );
  const list = useCrmResource(
    allowed && !listQuery.error,
    `${reloadKey}:list:${listQuery.error || JSON.stringify(listQuery.query)}`,
    () => listPortalActivity(listQuery.query),
    true,
    { keepData: true }
  );
  const directory = useCrmResource(
    allowed,
    `${reloadKey}:directory`,
    () => fetchPortalDirectory({ page: 1, limit: 40 }),
    true,
    { keepData: true }
  );
  const staffOptions = useCrmResource(
    allowed && !staffFilter,
    `staff:${debouncedStaff}`,
    () => fetchPortalDirectory({ page: 1, limit: 8, q: debouncedStaff.trim() || undefined })
  );
  const houseOptions = useCrmResource(
    allowed && !houseFilter,
    `house:${debouncedHouse}`,
    () => getPortalConsultancyOverview({ page: 1, limit: 8, q: debouncedHouse.trim() || undefined })
  );
  const detail = useCrmResource(
    allowed && Boolean(selected?.id) && isObjectId(selected.id) && (selected?.source === 'business' || selected?.source === 'security'),
    `detail:${selected?.source || ''}:${selected?.id || ''}`,
    () => getPortalActivity(selected.source, selected.id)
  );

  function update(patch) {
    setFilters((current) => applyFilterPatch(current, patch));
    setSelected(null);
  }

  function setPeriod(period) {
    if (period === 'custom') {
      update({ period });
      return;
    }
    const range = resolveActivityPeriod(period);
    update({ period, from: range.from, to: range.to });
    if (range.from) {
      const [year, month] = range.from.split('-').map(Number);
      setCalendarCursor({ year, monthIndex: month - 1 });
    }
  }

  function selectCalendarDay(isoDay) {
    update({ period: 'custom', from: isoDay, to: isoDay });
  }

  function moveCalendarMonth(delta) {
    setCalendarCursor((current) => shiftCalendarMonth(current.year, current.monthIndex, delta));
  }

  function resetFilters() {
    setSearchText('');
    setStaffFilter(null);
    setStaffQuery('');
    setHouseFilter(null);
    setHouseQuery('');
    setProfile(null);
    const next = defaultActivityFilters();
    setFilters(next);
  }

  function applyMetricFilter(card) {
    if (!card.filter) return;
    update({
      source: card.filter.source || filters.source,
      action: card.filter.action || '',
    });
  }

  function openStaff(person) {
    setProfile(person);
    setStaffFilter({ id: person.id, primary: person.fullName || person.email || 'Staff member' });
    update({ actorId: person.id, actorType: 'crm-user', source: filters.source === 'security' ? 'security' : 'both' });
  }

  if (!allowed) return <AccessNote>{decision.message}</AccessNote>;

  const firstLoad = (summary.loading && !summary.data) || (list.loading && !list.data);
  const metrics = activityMetricCards(summary.data);
  const trend = activityTrendRows(summary.data);
  const distribution = activityDistribution(summary.data);
  const dayCounts = activityCountsByDay(trend);
  const calendarDays = buildActivityCalendarDays(
    calendarCursor.year,
    calendarCursor.monthIndex,
    dayCounts,
    filters.from,
    filters.to
  );
  const staffRows = filterStaffDirectory(
    mergeStaffPresence(directory.data?.items, summary.data?.staff),
    { q: staffListQ, role: staffRole, status: staffStatus, presence: staffPresence }
  );
  const events = list.data?.items || [];
  const pager = list.data ? activityResultSummary(list.data.page, list.data.limit, list.data.total || 0) : null;
  const filtered = hasActivityFilters({ ...filters, actorId: staffFilter?.id || '', consultancyId: houseFilter?.id || '', q: searchText });
  const event = detail.data?.event || detail.data || selected || null;
  const eventStory = event ? timelineStory(event) : null;

  function clearStaffFocus() {
    setProfile(null);
    setStaffFilter(null);
    update({ actorId: '', actorType: '' });
  }

  const timelinePanel = (
    <>
      <div className="act-timeline-filters" role="search" aria-label="Filter timeline">
        <label className="act-field">
          <span className="act-label">Search</span>
          <div className="act-input-wrap">
            <FiSearch size={14} aria-hidden="true" className="act-input-ico" />
            <input
              className="act-input has-icon"
              value={searchText}
              maxLength={80}
              placeholder="Action or reason"
              aria-label="Search timeline"
              onChange={(event) => setSearchText(event.target.value)}
            />
          </div>
        </label>
        <label className="act-field">
          <span className="act-label">Source</span>
          <select
            className="act-input"
            value={filters.source}
            aria-label="Filter timeline by source"
            onChange={(event) => update({ source: event.target.value })}
          >
            {ACTIVITY_SOURCES.map((source) => <option key={source.id} value={source.id}>{source.label}</option>)}
          </select>
        </label>
        <label className="act-field">
          <span className="act-label">Action</span>
          <select
            className="act-input"
            value={filters.action}
            aria-label="Filter timeline by action"
            onChange={(event) => update({ action: event.target.value })}
          >
            <option value="">Any recorded action</option>
            {actionOptions().map((action) => <option key={action.id} value={action.id}>{action.label}</option>)}
          </select>
        </label>
        <label className="act-field">
          <span className="act-label">Record type</span>
          <select
            className="act-input"
            value={filters.entityType}
            aria-label="Filter timeline by record type"
            onChange={(event) => update({
              entityType: event.target.value,
              entityId: event.target.value ? filters.entityId : '',
              source: event.target.value ? 'business' : filters.source,
            })}
          >
            {ACTIVITY_ENTITY_TYPES.map((entity) => <option key={entity.id || 'any'} value={entity.id}>{entity.label}</option>)}
          </select>
        </label>
      </div>

      {list.loading && !list.data ? (
        <div aria-busy="true">{Array.from({ length: 6 }, (_, index) => <div key={index} className="act-bone h-row" style={{ marginBottom: 8 }} />)}</div>
      ) : null}

      {list.data && !events.length ? (
        <div className="act-empty">
          <span className="act-empty-title">No events match these filters</span>
          <p>Try another date range, staff member, or action.</p>
          {filtered ? <button type="button" className="act-btn" onClick={resetFilters}>Reset filters</button> : null}
        </div>
      ) : null}

      {events.length ? (
        <>
          <ul
            className={`act-timeline act-ios-scroll${timelineScroll.active ? ' is-scrolling' : ''}`}
            onScroll={timelineScroll.onScroll}
          >
            {events.map((row) => {
              const story = timelineStory(row);
              return (
                <li key={`${row.source}:${row.id}`}>
                  <button
                    type="button"
                    className={`act-event${selected?.id === row.id ? ' is-active' : ''}`}
                    onClick={() => setSelected(row)}
                  >
                    <Avatar name={story.who} size="sm" />
                    <span className="act-event-copy">
                      <span className="act-event-title">{story.title}</span>
                      <span className="act-event-detail">{story.detail}</span>
                      <span className="act-event-tags">
                        <SourcePill source={row.source} />
                        <span className="act-pill">{story.actionLabel}</span>
                        {story.consultancyName ? <span className="act-pill">{story.consultancyName}</span> : null}
                      </span>
                    </span>
                    <time
                      className="act-event-when"
                      dateTime={row.createdAt}
                      title={formatMoment(row.createdAt, PHASE_A_TIME_ZONE)}
                    >
                      {relativeTime(row.createdAt, PHASE_A_TIME_ZONE) || formatMoment(row.createdAt, PHASE_A_TIME_ZONE)}
                    </time>
                  </button>
                </li>
              );
            })}
          </ul>
          {pager ? (
            <nav className="act-pager" aria-label="Pagination">
              <span>{pager.label}</span>
              {pager.showPager ? (
                <div className="act-pager-controls">
                  <button
                    type="button"
                    className="act-btn is-icon"
                    disabled={!list.data || list.data.page <= 1 || list.loading}
                    aria-label="Previous page"
                    onClick={() => update({ page: list.data.page - 1 })}
                  >
                    <FiChevronLeft size={16} aria-hidden="true" />
                  </button>
                  <span>Page {list.data.page} of {pager.pages}</span>
                  <button
                    type="button"
                    className="act-btn is-icon"
                    disabled={!list.data || list.data.page >= pager.pages || list.loading}
                    aria-label="Next page"
                    onClick={() => update({ page: list.data.page + 1 })}
                  >
                    <FiChevronRight size={16} aria-hidden="true" />
                  </button>
                </div>
              ) : null}
            </nav>
          ) : null}
        </>
      ) : null}
    </>
  );

  return (
    <div className="gx-admin-page act-page">
      <header className="act-head">
        <div className="act-head-copy">
          <h1 className="act-title">Activity & Audit Intelligence</h1>
          <p className="act-lede">
            Track CRM activity, inspect record changes, and understand staff access across your organization.
          </p>
        </div>
        <div className="act-head-actions">
          <div className="act-periods" role="group" aria-label="Date range">
            {ACTIVITY_PERIODS.map((period) => (
              <button
                key={period.id}
                type="button"
                className={`act-period${filters.period === period.id ? ' is-active' : ''}`}
                onClick={() => setPeriod(period.id)}
              >
                {period.label}
              </button>
            ))}
          </div>
          <span className="act-zone" title="Pending business-owner confirmation">
            <FiClock size={12} aria-hidden="true" /> {PHASE_A_TIME_ZONE} · pending confirmation
          </span>
          <button
            type="button"
            className={`act-btn is-icon${summary.loading || list.loading ? ' is-spinning' : ''}`}
            aria-label="Refresh activity"
            disabled={summary.loading || list.loading}
            onClick={() => setReloadKey((key) => key + 1)}
          >
            <FiRefreshCw size={15} aria-hidden="true" />
          </button>
        </div>
      </header>

      {listQuery.error || summaryQuery.error ? (
        <Notice tone="warning">{listQuery.error || summaryQuery.error}</Notice>
      ) : null}
      {summary.notice ? <Notice tone={summary.notice.tone}>{summary.notice.message}</Notice> : null}
      {list.notice ? <Notice tone={list.notice.tone}>{list.notice.message}</Notice> : null}
      {directory.notice ? <Notice tone={directory.notice.tone}>{directory.notice.message}</Notice> : null}

      {filters.period === 'custom' ? (
        <div className="act-toolbar" style={{ gridTemplateColumns: 'repeat(2, minmax(140px, 200px))' }}>
          <div className="act-field">
            <label className="act-label" htmlFor="act-from">From</label>
            <input id="act-from" type="date" className="act-input" value={filters.from} onChange={(event) => update({ from: event.target.value })} />
          </div>
          <div className="act-field">
            <label className="act-label" htmlFor="act-to">To</label>
            <input id="act-to" type="date" className="act-input" value={filters.to} onChange={(event) => update({ to: event.target.value })} />
          </div>
        </div>
      ) : null}

      <section aria-labelledby="act-metrics-title">
        <div className="act-panel-head">
          <div>
            <h2 id="act-metrics-title">Overview</h2>
            <p>
              {filters.from && filters.to
                ? `${filters.from} → ${filters.to}`
                : 'Selected filters'}
              {' · '}Event counts are recorded audits, not productivity.
            </p>
          </div>
          {summary.data?.insights?.lastActivityAt ? (
            <span className="act-faint" title={formatMoment(summary.data.insights.lastActivityAt, PHASE_A_TIME_ZONE)}>
              Last activity {relativeTime(summary.data.insights.lastActivityAt, PHASE_A_TIME_ZONE)}
            </span>
          ) : null}
        </div>
        {firstLoad ? (
          <div className="act-metrics" aria-busy="true" aria-label="Loading metrics">
            {Array.from({ length: 7 }, (_, index) => <div key={index} className="act-bone h-metric" />)}
          </div>
        ) : (
          <ul className="act-metrics">
            {metrics.map((card) => (
              <li key={card.key}>
                <button
                  type="button"
                  className={`act-metric${card.unavailable ? ' is-unavailable' : ''}${card.filter && filters.source === card.filter.source && (!card.filter.action || filters.action === card.filter.action) ? ' is-active' : ''}`}
                  disabled={card.unavailable || !card.filter}
                  onClick={() => applyMetricFilter(card)}
                >
                  <span className="act-metric-label">{card.label}</span>
                  <span className="act-metric-value">{card.text}</span>
                  <span className="act-metric-detail">{card.detail}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="act-grid">
        <section className="act-panel" aria-labelledby="act-trend-title">
          <header className="act-panel-head">
            <div>
              <h2 id="act-trend-title">Activity over time</h2>
              <p>Daily recorded business and security events in {PHASE_A_TIME_ZONE}.</p>
            </div>
          </header>
          {summary.loading && !summary.data ? <div className="act-bone h-chart" /> : null}
          {!summary.loading && !trend.length ? (
            <div className="act-chart-empty">No recorded events in this range.</div>
          ) : null}
          {trend.length ? (
            <div className="act-chart" role="img" aria-label="Daily activity chart">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trend} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id={`act-biz-${gradientId}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={brand} stopOpacity={theme === 'dark' ? 0.28 : 0.45} />
                      <stop offset="100%" stopColor={brand} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid vertical={false} stroke={palette.grid} />
                  <XAxis dataKey="label" tickLine={false} axisLine={false} minTickGap={28} tick={{ fontSize: 11, fill: palette.tick }} />
                  <YAxis allowDecimals={false} tickLine={false} axisLine={false} width={32} tick={{ fontSize: 11, fill: palette.tick }} />
                  <Tooltip content={<TrendTip />} />
                  <Area type="monotone" dataKey="business" name="Business" stroke={brand} fill={`url(#act-biz-${gradientId})`} strokeWidth={2} isAnimationActive={!reducedMotion()} />
                  <Area type="monotone" dataKey="security" name="Security" stroke={securityStroke} fill="transparent" strokeWidth={1.5} strokeDasharray="4 4" isAnimationActive={!reducedMotion()} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : null}
        </section>

        <section className="act-panel" aria-labelledby="act-dist-title">
          <header className="act-panel-head">
            <div>
              <h2 id="act-dist-title">Action distribution</h2>
              <p>Top recorded actions in the current filters.</p>
            </div>
          </header>
          {distribution.length ? (
            <ul className="act-dist">
              {distribution.map((row) => (
                <li key={row.id} className="act-dist-row">
                  <button type="button" className="act-dist-meta act-name-btn" onClick={() => update({ action: row.action, source: row.source })}>
                    <span className="act-dist-label">{row.label}</span>
                    <span className="act-dist-track" aria-hidden="true"><span className="act-dist-fill" style={{ width: `${Math.max(row.percent, 4)}%` }} /></span>
                  </button>
                  <span className="act-dist-count">{row.count}</span>
                </li>
              ))}
            </ul>
          ) : (
            <div className="act-chart-empty">No actions to chart yet.</div>
          )}
        </section>
      </div>

      <section className="act-panel" aria-labelledby="act-filters-title">
        <header className="act-panel-head">
          <div>
            <h2 id="act-filters-title">Audit timeline</h2>
            <p aria-live="polite">
              {list.data
                ? <><strong>{Number(list.data.total || 0).toLocaleString()}</strong> events match these filters</>
                : 'Loading events…'}
            </p>
          </div>
          {filtered ? (
            <button type="button" className="act-btn is-quiet" onClick={resetFilters}>
              <FiX size={14} aria-hidden="true" /> Clear filters
            </button>
          ) : null}
        </header>

        <div className="act-toolbar" role="search" aria-label="Filter activity">
          <div className="act-field">
            <label className="act-label" htmlFor="act-search">Search</label>
            <div className="act-input-wrap">
              <FiSearch size={14} aria-hidden="true" className="act-input-ico" />
              <input
                id="act-search"
                className="act-input has-icon"
                value={searchText}
                maxLength={80}
                placeholder="Action or reason"
                onChange={(event) => setSearchText(event.target.value)}
              />
            </div>
          </div>
          <div className="act-field">
            <label className="act-label" htmlFor="act-source">Source</label>
            <select id="act-source" className="act-input" value={filters.source} onChange={(event) => update({ source: event.target.value })}>
              {ACTIVITY_SOURCES.map((source) => <option key={source.id} value={source.id}>{source.label}</option>)}
            </select>
          </div>
          <div className="act-field">
            <label className="act-label" htmlFor="act-action">Action</label>
            <select id="act-action" className="act-input" value={filters.action} onChange={(event) => update({ action: event.target.value })}>
              <option value="">Any recorded action</option>
              {actionOptions().map((action) => <option key={action.id} value={action.id}>{action.label}</option>)}
            </select>
          </div>
          <div className="act-field">
            <label className="act-label" htmlFor="act-entity">Record type</label>
            <select id="act-entity" className="act-input" value={filters.entityType} onChange={(event) => update({ entityType: event.target.value, entityId: event.target.value ? filters.entityId : '', source: event.target.value ? 'business' : filters.source })}>
              {ACTIVITY_ENTITY_TYPES.map((entity) => <option key={entity.id || 'any'} value={entity.id}>{entity.label}</option>)}
            </select>
          </div>
          <div className="act-field">
            <label className="act-label" htmlFor="act-actor-type">Actor type</label>
            <select
              id="act-actor-type"
              className="act-input"
              value={filters.actorType}
              onChange={(event) => {
                const actorType = event.target.value;
                if (actorType !== 'crm-user') {
                  setStaffFilter(null);
                  setStaffQuery('');
                  setProfile(null);
                }
                update({ actorType, actorId: actorType === 'crm-user' ? (staffFilter?.id || filters.actorId || '') : '' });
              }}
            >
              <option value="">Any actor type</option>
              <option value="crm-user">CRM staff</option>
              <option value="admin">Platform admin</option>
            </select>
          </div>
          {filters.entityType ? (
            <div className="act-field">
              <label className="act-label" htmlFor="act-entity-id">Record id</label>
              <input
                id="act-entity-id"
                className="act-input"
                value={filters.entityId || ''}
                placeholder="24-character record id"
                maxLength={24}
                spellCheck={false}
                onChange={(event) => update({ entityId: event.target.value.trim(), source: 'business' })}
              />
            </div>
          ) : null}
          <PersonCombobox
            label="Staff"
            query={staffQuery}
            onQuery={setStaffQuery}
            loading={staffOptions.loading}
            error={staffOptions.notice?.message}
            options={(staffOptions.data?.items || []).map((person) => ({
              id: person.id,
              primary: person.fullName || person.email || 'Unnamed',
              secondary: [person.roleLabel || person.role, person.email].filter(Boolean).join(' · '),
            }))}
            selected={staffFilter}
            onSelect={(option) => { setStaffFilter(option); update({ actorId: option.id, actorType: 'crm-user' }); }}
            onClear={() => { setStaffFilter(null); setStaffQuery(''); update({ actorId: '', actorType: '' }); setProfile(null); }}
            placeholder="Any staff member"
          />
          <PersonCombobox
            label="Consultancy"
            query={houseQuery}
            onQuery={setHouseQuery}
            loading={houseOptions.loading}
            error={houseOptions.notice?.message}
            options={(houseOptions.data?.items || []).map((row) => ({
              id: row.id,
              primary: row.name,
              secondary: row.status,
            }))}
            selected={houseFilter}
            onSelect={(option) => { setHouseFilter(option); update({ consultancyId: option.id }); }}
            onClear={() => { setHouseFilter(null); setHouseQuery(''); update({ consultancyId: '' }); }}
            placeholder="Any consultancy"
            emptyText="No matching consultancies."
          />
        </div>
      </section>

      <div className="act-board">
        <div className="act-board-top">
          <section className="act-panel act-calendar-panel" aria-labelledby="act-calendar-title">
            <header className="act-panel-head">
              <div>
                <h2 id="act-calendar-title">Calendar</h2>
                <p>Pick a day to focus the timeline. Dot density uses recorded events in the current filters.</p>
              </div>
              <div className="act-cal-nav">
                <button type="button" className="act-btn is-icon" aria-label="Previous month" onClick={() => moveCalendarMonth(-1)}>
                  <FiChevronLeft size={16} aria-hidden="true" />
                </button>
                <span className="act-cal-label">{calendarMonthLabel(calendarCursor.year, calendarCursor.monthIndex)}</span>
                <button type="button" className="act-btn is-icon" aria-label="Next month" onClick={() => moveCalendarMonth(1)}>
                  <FiChevronRight size={16} aria-hidden="true" />
                </button>
              </div>
            </header>
            <div className="act-cal" role="grid" aria-label="Activity calendar">
              <div className="act-cal-weekdays" aria-hidden="true">
                {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((label) => (
                  <span key={label}>{label}</span>
                ))}
              </div>
              <div className="act-cal-grid">
                {calendarDays.map((cell) => (
                  cell.blank ? (
                    <span key={cell.key} className="act-cal-cell is-blank" />
                  ) : (
                    <button
                      key={cell.key}
                      type="button"
                      role="gridcell"
                      className={[
                        'act-cal-cell',
                        cell.inRange ? 'is-range' : '',
                        cell.isStart || cell.isSingle ? 'is-start' : '',
                        cell.isEnd || cell.isSingle ? 'is-end' : '',
                        cell.isSingle ? 'is-selected' : '',
                      ].filter(Boolean).join(' ')}
                      aria-label={`${cell.iso}${cell.count ? `, ${cell.count} events` : ''}`}
                      aria-pressed={cell.isSingle || (cell.isStart && cell.isEnd)}
                      onClick={() => selectCalendarDay(cell.iso)}
                    >
                      <span className="act-cal-day">{cell.day}</span>
                      <span className={`act-cal-dot is-i${cell.intensity}`} aria-hidden="true" />
                    </button>
                  )
                ))}
              </div>
            </div>
            <p className="act-cal-legend">
              Selected {filters.from && filters.to && filters.from === filters.to
                ? filters.from
                : filters.from && filters.to
                  ? `${filters.from} → ${filters.to}`
                  : 'range'}
              {' · '}Click a day to filter activity to that date.
            </p>
          </section>

          <section className="act-panel s360-dir act-users-panel" aria-labelledby="act-staff-title">
            <header className="act-panel-head">
              <div>
                <h2 id="act-staff-title">Users</h2>
                <p title={`${PRESENCE_MEANINGS.online} ${PRESENCE_MEANINGS.idle}`}>
                  Select a person to open their detailed overview and timeline below.
                </p>
              </div>
            </header>
            <div className="s360-dir-filters">
              <label className="act-field s360-dir-search">
                <span className="act-label">Search</span>
                <input
                  className="act-input"
                  value={staffListQ}
                  onChange={(event) => setStaffListQ(event.target.value)}
                  placeholder="Name or email"
                  aria-label="Search staff"
                />
              </label>
              <label className="act-field">
                <span className="act-label">Role</span>
                <select className="act-input" value={staffRole} onChange={(event) => setStaffRole(event.target.value)} aria-label="Filter by role">
                  <option value="">All roles</option>
                  <option value="crm_administrator">Administrator</option>
                  <option value="crm_manager">Manager</option>
                  <option value="crm_viewer">Viewer</option>
                </select>
              </label>
              <label className="act-field">
                <span className="act-label">Status</span>
                <select className="act-input" value={staffStatus} onChange={(event) => setStaffStatus(event.target.value)} aria-label="Filter by account status">
                  <option value="">All</option>
                  <option value="active">Active</option>
                  <option value="invited">Invited</option>
                  <option value="inactive">Inactive</option>
                </select>
              </label>
              <label className="act-field">
                <span className="act-label">Presence</span>
                <select className="act-input" value={staffPresence} onChange={(event) => setStaffPresence(event.target.value)} aria-label="Filter by presence">
                  <option value="">All</option>
                  <option value="online">Online</option>
                  <option value="idle">Idle</option>
                  <option value="offline">Offline</option>
                </select>
              </label>
            </div>
            {directory.loading && !directory.data ? (
              <div aria-busy="true">{Array.from({ length: 5 }, (_, index) => <div key={index} className="act-bone h-row" style={{ marginBottom: 8 }} />)}</div>
            ) : null}
            {staffRows.length ? (
              <ul
                className={`act-staff-list act-ios-scroll${staffScroll.active ? ' is-scrolling' : ''}`}
                onScroll={staffScroll.onScroll}
              >
                {staffRows.slice(0, 40).map((person) => (
                  <li key={person.id}>
                    <button
                      type="button"
                      className={`act-staff-row${staffFilter?.id === person.id ? ' is-active' : ''}`}
                      onClick={() => openStaff(person)}
                      aria-pressed={staffFilter?.id === person.id}
                      title={PRESENCE_MEANINGS[person.presence?.state] || undefined}
                    >
                      <Avatar name={person.fullName} size="sm" />
                      <span className="act-staff-copy">
                        <span className="act-staff-name">{person.fullName || 'Unnamed account'}</span>
                        <span className="act-staff-meta">
                          {person.roleLabel || person.role}
                          {typeof person.assignmentCount === 'number' ? ` · ${person.assignmentCount} houses` : ''}
                        </span>
                        <span className="act-staff-meta act-staff-signals">
                          <span>Seen {person.presence?.lastSeenAt ? relativeTime(person.presence.lastSeenAt, PHASE_A_TIME_ZONE) : '—'}</span>
                          <span>
                            {person.hasRecordedBusiness
                              ? `${person.businessEvents} events`
                              : 'No events'}
                          </span>
                        </span>
                      </span>
                      <span className="act-staff-stats">
                        <PresencePill state={person.presence?.state} />
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : (!directory.loading ? (
              <div className="act-empty">
                <p className="act-empty-title">No staff match</p>
                <p>Try clearing filters or confirm Access Management permission.</p>
              </div>
            ) : null)}
          </section>
        </div>

        <section className="act-board-below" aria-labelledby={profile ? 'act-detail-title' : 'act-timeline-title'}>
          {profile ? (
            <div className="act-panel act-detail-panel">
              <Staff360Detail
                staffId={profile.id}
                profileHint={profile}
                onClear={clearStaffFocus}
                timeline={timelinePanel}
                rangeFrom={filters.from}
                rangeTo={filters.to}
              />
            </div>
          ) : (
            <section className="act-panel" aria-labelledby="act-timeline-title">
              <header className="act-panel-head">
                <div>
                  <h2 id="act-timeline-title">Searchable timeline</h2>
                  <p>Newest recorded events first. Select a user above for their detailed Staff 360° overview.</p>
                </div>
              </header>
              {timelinePanel}
            </section>
          )}
        </section>
      </div>

      <p className="act-footnote">
        <FiAlertTriangle size={13} aria-hidden="true" style={{ marginRight: 6, verticalAlign: '-2px' }} />
        Last login comes from authentication events. Last seen comes from session heartbeats and is not working time.
        Business-event counts are audits, not a productivity score. Missing before values cannot be reconstructed.
        Timezone {PHASE_A_TIME_ZONE} is pending business-owner confirmation.
      </p>

      {selected ? (
        <Sheet
          open
          title={eventStory?.title || 'Event detail'}
          subtitle={eventStory ? (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
              <SourcePill source={eventStory.source} />
              <span className="act-pill">{eventStory.actionLabel}</span>
              <span className="act-faint">{formatMoment(event?.createdAt, PHASE_A_TIME_ZONE)}</span>
            </div>
          ) : null}
          onClose={() => setSelected(null)}
        >
          {detail.loading ? <div className="act-bone h-row" /> : null}
          {detail.notice ? <Notice tone={detail.notice.tone}>{detail.notice.message}</Notice> : null}
          {event ? (
            <>
              <dl className="act-facts">
                <div>
                  <dt>Actor</dt>
                  <dd>{event.actor?.displayName || event.actor?.name || 'Unknown actor'}</dd>
                </div>
                <div>
                  <dt>Actor type</dt>
                  <dd>{event.actorType === 'admin' ? 'Platform admin' : event.actorType === 'crm-user' ? 'CRM staff' : (event.actorType || 'Not recorded')}</dd>
                </div>
                <div>
                  <dt>Source</dt>
                  <dd>{event.source}</dd>
                </div>
                <div>
                  <dt>Category</dt>
                  <dd>{event.category || '—'}</dd>
                </div>
                <div>
                  <dt>Record</dt>
                  <dd>{[event.entityType, event.entityLabel || event.entityName || event.entityId].filter(Boolean).join(' · ') || '—'}</dd>
                </div>
                <div>
                  <dt>Consultancy</dt>
                  <dd>{event.consultancyName || event.consultancyId || '—'}</dd>
                </div>
                {event.targetUserName ? (
                  <div>
                    <dt>Target staff</dt>
                    <dd>{event.targetUserName}</dd>
                  </div>
                ) : null}
                {event.reason ? (
                  <div>
                    <dt>Reason</dt>
                    <dd>{event.reason}</dd>
                  </div>
                ) : null}
              </dl>

              <div>
                <h3 className="act-strong" style={{ margin: '0 0 8px', fontSize: 13.5 }}>Change details</h3>
                {event.changes?.length ? (
                  <div style={{ overflowX: 'auto', border: '1px solid var(--sa-line)', borderRadius: 10 }}>
                    <table className="act-diff">
                      <caption className="act-sr-only">Before and after field values</caption>
                      <thead>
                        <tr>
                          <th scope="col">Field</th>
                          <th scope="col">Previous value</th>
                          <th scope="col">New value</th>
                        </tr>
                      </thead>
                      <tbody>
                        {event.changes.map((change) => (
                          <tr key={change.field}>
                            <th scope="row">{change.field}</th>
                            <td className={change.beforeMissing ? 'is-missing' : ''}>{formatChangeValue(change.before, change.beforeMissing)}</td>
                            <td className={change.afterMissing ? 'is-missing' : ''}>{formatChangeValue(change.after, change.afterMissing)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="act-muted">No field-level before/after values were recorded for this event.</p>
                )}
              </div>

              {event.actor?.type === 'crm-user' && event.actor?.id ? (
                <button
                  type="button"
                  className="act-btn"
                  onClick={() => {
                    openStaff({
                      id: event.actor.id,
                      fullName: event.actor.displayName || event.actor.name || 'Unknown actor',
                      email: '',
                      role: '',
                      presence: { state: 'offline' },
                    });
                    setSelected(null);
                  }}
                >
                  <FiUsers size={14} aria-hidden="true" /> View this staff timeline
                </button>
              ) : null}
            </>
          ) : null}
        </Sheet>
      ) : null}
    </div>
  );
}

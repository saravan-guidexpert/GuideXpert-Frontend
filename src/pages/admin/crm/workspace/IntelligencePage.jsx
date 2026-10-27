import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  FiAlertTriangle,
  FiCalendar,
  FiCheckCircle,
  FiChevronDown,
  FiChevronUp,
  FiFilter,
  FiRefreshCw,
  FiRotateCcw,
  FiX,
} from 'react-icons/fi';
import { useCrmSession } from '../../../crm-app/useCrmSession';
import { getPortalDayEndReport, getPortalFollowUpIntelligence, getPortalWorkload } from '../../../../utils/crmSessionApi';
import {
  PHASE_A_TIME_ZONE,
  completionRateText,
  dayEndAccuracy,
  dayEndQuery,
  dayEndScheduleNote,
  intelligenceEmptyMessage,
  intelligenceQuery,
  intelligenceScopeNote,
  paginationSummary,
  workspaceRouteDecision,
} from '../../../../utils/crmWorkspace';
import {
  INTEL_BUCKETS,
  INTEL_EVENTS,
  INTEL_PERIODS,
  INTEL_WORKLOAD_METRICS,
  actorDisplay,
  bucketLabel,
  bucketPillLabel,
  countActiveIntelFilters,
  dayEndCategoryBreakdown,
  dayEndEventDetail,
  dayEndGroups,
  dayEndHeadline,
  dayEndKindLabel,
  dayEndSourceLabel,
  defaultIntelFilters,
  followUpChartState,
  followUpOverview,
  formatIntelWhen,
  intelDayLabel,
  intelFilterChips,
  intelFiltersChanged,
  intelRangeLabel,
  intelScopeBadge,
  resolveIntelPeriod,
  workloadChartRows,
  workloadScopeLine,
  workloadSummaryCards,
} from '../../../../utils/crmIntelligence';
import { useCrmResource } from './useCrmResource';
import { AccessNote, CountChart } from './workspaceUi';
import { Notice } from './consultancyUi';
import Staff360Detail from './Staff360Detail';
import './superAdminActivity.css';
import './superAdminIntelligence.css';

function prefersReducedMotion() {
  return typeof window !== 'undefined'
    && typeof window.matchMedia === 'function'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function Pager({ page, limit, total, onPage, disabled }) {
  const summary = paginationSummary(page, limit, total);
  return (
    <nav className="intel-pager" aria-label="Pagination">
      <span>{summary.label}</span>
      <div className="intel-pager-actions">
        <button type="button" className="intel-btn is-small" disabled={disabled || summary.previousDisabled} onClick={() => onPage(page - 1)}>Previous</button>
        <button type="button" className="intel-btn is-small" disabled={disabled || summary.nextDisabled} onClick={() => onPage(page + 1)}>Next</button>
      </div>
    </nav>
  );
}

function ScopeBadge({ data, note }) {
  const badge = intelScopeBadge(data, note);
  if (!badge) return null;
  return <span className="intel-scope" title={badge.title}>{badge.label}</span>;
}

function SectionHead({ id, title, subtitle, scope, onHow }) {
  return (
    <header className="intel-section-head">
      <div className="intel-section-copy">
        <h2 id={id}>{title}</h2>
        <p>{subtitle}</p>
      </div>
      <div className="intel-section-meta">
        {scope}
        {onHow ? (
          <button type="button" className="intel-btn is-quiet is-small" onClick={onHow}>
            How this is calculated
          </button>
        ) : null}
      </div>
    </header>
  );
}

/** Horizontal bars with exact values. Used for follow-up mix, event types and staff comparison. */
function BarList({ rows, label, onSelect, describe }) {
  return (
    <ul className="intel-bars" aria-label={label}>
      {rows.map((row) => {
        const text = describe ? describe(row) : `${row.label}: ${row.count}`;
        const inner = (
          <>
            <span className="intel-bar-label">{row.label}</span>
            <span className="intel-bar-track" aria-hidden="true">
              <span className={`intel-bar-fill is-${row.tone || 'brand'}`} style={{ width: row.count > 0 ? `${Math.max(row.percent, 3)}%` : '0%' }} />
            </span>
            <span className="intel-bar-value">{row.count}</span>
          </>
        );
        return (
          <li key={row.id}>
            {onSelect && row.bucket !== undefined ? (
              <button type="button" className="intel-bar-row" title={text} aria-label={text} onClick={() => onSelect(row)}>
                {inner}
              </button>
            ) : (
              <div className="intel-bar-row" title={text} role="group" aria-label={text}>
                {inner}
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}

function KpiSkeleton({ count }) {
  return (
    <div className="intel-kpis" aria-busy="true" aria-label="Loading metrics">
      {Array.from({ length: count }, (_, index) => <div key={index} className="intel-bone h-kpi" />)}
    </div>
  );
}

function DayEventDetail({ row }) {
  return (
    <div className="intel-detail">
      <dl>
        <dt>Record</dt>
        <dd>{dayEndKindLabel(row.kind)}</dd>
        <dt>When</dt>
        <dd>{formatIntelWhen(row.at, PHASE_A_TIME_ZONE)}</dd>
        <dt>Subject</dt>
        <dd>{row.consultancyName || row.studentName || 'Name was not stored'}</dd>
        <dt>Outcome</dt>
        <dd>{dayEndEventDetail(row)}</dd>
        <dt>Source</dt>
        <dd>{dayEndSourceLabel(row.source)}</dd>
        <dt>Actor</dt>
        <dd>{actorDisplay(row.actor)}</dd>
        <dt>Accuracy</dt>
        <dd>{dayEndAccuracy(row)}</dd>
      </dl>
    </div>
  );
}

function Definition({ id, title, open, children }) {
  return (
    <details className="intel-def" id={id} open={open}>
      <summary>{title}</summary>
      <div className="intel-def-body">{children}</div>
    </details>
  );
}

const DEF_GROUPS = Object.freeze({
  followUps: ['overdue-now', 'due-today', 'upcoming'],
  completion: ['completion-rate'],
  dayEnd: ['outstanding-day'],
  workload: ['assigned-workload'],
  admissions: ['admissions-recorded'],
});

function Formulas({ metrics, ids }) {
  const rows = (metrics || []).filter((metric) => ids.includes(metric.id));
  if (!rows.length) return null;
  return (
    <ul className="intel-formulas">
      {rows.map((metric) => (
        <li key={metric.id}>
          <strong>{metric.id}</strong>
          {' · '}
          {metric.formula} {metric.denominator} {metric.limitations}
        </li>
      ))}
    </ul>
  );
}

export default function IntelligencePage() {
  const { user } = useCrmSession();
  const decision = workspaceRouteDecision(user, 'intelligence');
  const allowed = decision.state === 'allowed';

  const [filters, setFilters] = useState(() => defaultIntelFilters());
  const [pages, setPages] = useState({ followUps: 1, dayEnd: 1, workload: 1 });
  const [reloadKey, setReloadKey] = useState(0);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [defsOpen, setDefsOpen] = useState(false);
  const [workMetric, setWorkMetric] = useState('assignedConsultancies');
  const [selectedDayEvent, setSelectedDayEvent] = useState(null);
  const [selectedStaff, setSelectedStaff] = useState(null);
  const defsRef = useRef(null);
  const staffDetailRef = useRef(null);

  const followBuilt = useMemo(
    () => intelligenceQuery({ ...filters, timeZone: PHASE_A_TIME_ZONE, page: pages.followUps }),
    [filters, pages.followUps]
  );
  const dayBuilt = useMemo(
    () => dayEndQuery({ ...filters, timeZone: PHASE_A_TIME_ZONE, page: pages.dayEnd }),
    [filters, pages.dayEnd]
  );
  const workBuilt = useMemo(
    () => intelligenceQuery({ ...filters, timeZone: PHASE_A_TIME_ZONE, page: pages.workload }),
    [filters, pages.workload]
  );

  const followUps = useCrmResource(
    allowed && !followBuilt.error,
    `${reloadKey}:follow-ups:${followBuilt.error || JSON.stringify(followBuilt.query)}`,
    () => getPortalFollowUpIntelligence(followBuilt.query),
    true,
    { keepData: true }
  );
  const dayEnd = useCrmResource(
    allowed && !dayBuilt.error,
    `${reloadKey}:day-end:${dayBuilt.error || JSON.stringify(dayBuilt.query)}`,
    () => getPortalDayEndReport(dayBuilt.query),
    true,
    { keepData: true }
  );
  const workload = useCrmResource(
    allowed && !workBuilt.error,
    `${reloadKey}:workload:${workBuilt.error || JSON.stringify(workBuilt.query)}`,
    () => getPortalWorkload(workBuilt.query),
    true,
    { keepData: true }
  );

  useEffect(() => {
    if (!selectedStaff || !staffDetailRef.current) return;
    staffDetailRef.current.scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth', block: 'start' });
  }, [selectedStaff]);

  function update(patch) {
    setFilters((current) => ({ ...current, ...patch }));
    setPages({ followUps: 1, dayEnd: 1, workload: 1 });
    setSelectedDayEvent(null);
  }

  function setPeriod(period) {
    if (period === 'custom') {
      update({ period });
      return;
    }
    const range = resolveIntelPeriod(period);
    update({ period, from: range.from, to: range.to, date: range.to });
  }

  function resetFilters() {
    setFilters(defaultIntelFilters());
    setPages({ followUps: 1, dayEnd: 1, workload: 1 });
    setSelectedDayEvent(null);
    setAdvancedOpen(false);
  }

  function showDefinitions() {
    setDefsOpen(true);
    window.requestAnimationFrame(() => {
      defsRef.current?.scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth', block: 'start' });
    });
  }

  if (!allowed) return <AccessNote>{decision.message}</AccessNote>;

  const loading = followUps.loading || dayEnd.loading || workload.loading;
  const activeFilterCount = countActiveIntelFilters(filters);
  const chips = intelFilterChips(filters);
  const changed = intelFiltersChanged(filters, defaultIntelFilters());
  const queryError = followBuilt.error || dayBuilt.error;

  const timeZoneConfirmed = followUps.data?.timeZoneConfirmed === true || dayEnd.data?.timeZoneConfirmed === true;
  const rangeLabel = intelRangeLabel(filters.from, filters.to) || 'Select dates';

  const followScope = intelligenceScopeNote(followUps.data);
  const dayScope = intelligenceScopeNote(dayEnd.data);
  const workScope = intelligenceScopeNote(workload.data);

  const overview = followUpOverview(followUps.data);
  const chart = followUpChartState(followUps.data);
  const followItems = followUps.data?.items || [];
  const trend = followUps.data?.completionTrend || [];
  const approxOverdue = followUps.data?.overdueApproximation || [];
  const followLoadingFirst = followUps.loading && !followUps.data;
  const followUnavailable = !followUps.data && !followUps.loading;

  const dayGroups = dayEndGroups(dayEnd.data);
  const dayHeadline = dayEndHeadline(dayEnd.data);
  const dayItems = dayEnd.data?.items || [];
  const dayBreakdown = dayEndCategoryBreakdown(dayItems);
  const dayLoadingFirst = dayEnd.loading && !dayEnd.data;
  const dayUnavailable = !dayEnd.data && !dayEnd.loading;

  const workCards = workloadSummaryCards(workload.data);
  const workItems = workload.data?.items || [];
  const workRows = workloadChartRows(workItems, workMetric);
  const workMetricLabel = INTEL_WORKLOAD_METRICS.find((row) => row.id === workMetric)?.label || 'selected metric';
  const workMax = workRows.reduce((peak, row) => Math.max(peak, row.value), 0);
  const workBars = workRows.map((row) => ({
    id: row.id,
    label: row.label,
    name: row.name,
    count: row.value,
    percent: workMax ? Math.round((row.value / workMax) * 100) : 0,
    tone: 'brand',
  }));
  const workLoadingFirst = workload.loading && !workload.data;
  const workUnavailable = !workload.data && !workload.loading;

  const definitions = followUps.data?.metrics || workload.data?.metrics || [];
  const limitations = (followUps.data?.limitations || dayEnd.data?.limitations || []).slice(0, 4);

  return (
    <div className="intel-page">
      <header className="intel-head">
        <div className="intel-head-copy">
          <h1 className="intel-title">Intelligence</h1>
          <p className="intel-lede">Monitor follow-ups, review daily CRM activity, and understand staff workload.</p>
        </div>
        <div className="intel-head-meta">
          <span className="intel-chip-static" title="Date range used for follow-ups and workload">
            <FiCalendar size={14} aria-hidden="true" />
            {rangeLabel}
          </span>
          <span
            className={`intel-chip-static${timeZoneConfirmed ? '' : ' is-warn'}`}
            title={timeZoneConfirmed ? `${PHASE_A_TIME_ZONE} confirmed` : `${PHASE_A_TIME_ZONE} is pending business-owner confirmation`}
          >
            {timeZoneConfirmed ? <FiCheckCircle size={14} aria-hidden="true" /> : <FiAlertTriangle size={14} aria-hidden="true" />}
            {PHASE_A_TIME_ZONE} · {timeZoneConfirmed ? 'Confirmed' : 'Pending confirmation'}
          </span>
          <button
            type="button"
            className={`intel-btn is-icon${loading ? ' is-spinning' : ''}`}
            onClick={() => setReloadKey((value) => value + 1)}
            disabled={loading}
            aria-label="Refresh intelligence"
            title="Refresh"
          >
            <FiRefreshCw size={15} aria-hidden="true" />
          </button>
        </div>
      </header>

      <section className="intel-filters" aria-label="Filters">
        <div className="intel-filter-row" role="search">
          <div className="intel-filter-group">
            <span className="intel-group-label">Date range · <em>drives follow-ups and workload</em></span>
            <div className="intel-filter-controls">
              <div className="intel-periods" role="group" aria-label="Date range presets">
                {INTEL_PERIODS.map((period) => (
                  <button
                    key={period.id}
                    type="button"
                    className={`intel-period${filters.period === period.id ? ' is-active' : ''}`}
                    aria-pressed={filters.period === period.id}
                    onClick={() => setPeriod(period.id)}
                  >
                    {period.label}
                  </button>
                ))}
              </div>
              <label className="intel-field">
                <span className="intel-label">Start date</span>
                <input
                  type="date"
                  className="intel-input"
                  value={filters.from}
                  onChange={(event) => update({ period: 'custom', from: event.target.value })}
                />
              </label>
              <label className="intel-field">
                <span className="intel-label">End date</span>
                <input
                  type="date"
                  className="intel-input"
                  value={filters.to}
                  onChange={(event) => update({ period: 'custom', to: event.target.value })}
                />
              </label>
            </div>
          </div>

          <div className="intel-filter-group is-day">
            <span className="intel-group-label">Reporting day · <em>drives the day-end report</em></span>
            <div className="intel-filter-controls">
              <label className="intel-field">
                <span className="intel-label">Reporting day</span>
                <input
                  type="date"
                  className="intel-input"
                  value={filters.date}
                  onChange={(event) => update({ date: event.target.value })}
                />
              </label>
            </div>
          </div>

          <div className="intel-filter-actions">
            <button type="button" className="intel-btn" aria-expanded={advancedOpen} onClick={() => setAdvancedOpen((open) => !open)}>
              <FiFilter size={14} aria-hidden="true" />
              Advanced filters{activeFilterCount ? ` (${activeFilterCount})` : ''}
              {advancedOpen ? <FiChevronUp size={14} aria-hidden="true" /> : <FiChevronDown size={14} aria-hidden="true" />}
            </button>
            {changed ? (
              <button type="button" className="intel-btn is-quiet" onClick={resetFilters}>
                <FiRotateCcw size={14} aria-hidden="true" /> Reset
              </button>
            ) : null}
          </div>
        </div>

        {advancedOpen ? (
          <div className="intel-advanced">
            <label className="intel-field">
              <span className="intel-label">Follow-up view</span>
              <select className="intel-input" value={filters.bucket} onChange={(event) => update({ bucket: event.target.value })}>
                {INTEL_BUCKETS.map((option) => <option key={option.id || 'open'} value={option.id}>{option.label}</option>)}
              </select>
            </label>
            <label className="intel-field">
              <span className="intel-label">Day-end records</span>
              <select className="intel-input" value={filters.event} onChange={(event) => update({ event: event.target.value })}>
                {INTEL_EVENTS.map((option) => <option key={option.id || 'all'} value={option.id}>{option.label}</option>)}
              </select>
            </label>
            <label className="intel-field">
              <span className="intel-label">Consultancy id</span>
              <input className="intel-input" value={filters.consultancyId} placeholder="Optional" onChange={(event) => update({ consultancyId: event.target.value.trim() })} />
            </label>
            <label className="intel-field">
              <span className="intel-label">Assigned staff id</span>
              <input className="intel-input" value={filters.userId} placeholder="Assigned at day end" onChange={(event) => update({ userId: event.target.value.trim() })} />
            </label>
            <label className="intel-field">
              <span className="intel-label">Actor id</span>
              <input className="intel-input" value={filters.actorId} placeholder="Who recorded the event" onChange={(event) => update({ actorId: event.target.value.trim() })} />
            </label>
          </div>
        ) : null}

        {chips.length ? (
          <div className="intel-chips" aria-label="Active filters">
            <span className="intel-chips-label">Active</span>
            {chips.map((chip) => (
              <button key={chip.key} type="button" className="intel-chip" onClick={() => update(chip.clear)}>
                {chip.label}
                <FiX size={12} aria-hidden="true" />
                <span className="intel-sr-only"> remove filter</span>
              </button>
            ))}
          </div>
        ) : null}

        {queryError ? <p className="intel-inline-error" role="alert">{queryError}</p> : null}
      </section>

      {/* ───────────── A · Follow-up overview ───────────── */}
      <section className="intel-section" aria-labelledby="intel-follow-title">
        <SectionHead
          id="intel-follow-title"
          title="Follow-up overview"
          subtitle="What needs attention now, and what is coming next."
          scope={<ScopeBadge data={followUps.data} note={followScope} />}
          onHow={showDefinitions}
        />

        {followUps.notice ? <Notice tone={followUps.notice.tone}>{followUps.notice.message}</Notice> : null}
        {followUps.data?.truncated ? (
          <Notice tone="warning">This report stopped at its row cap. Narrow the dates. Omitted rows are not shown as zero.</Notice>
        ) : null}

        {followLoadingFirst ? <KpiSkeleton count={4} /> : (
          <ul className="intel-kpis">
            {overview.cards.map((card) => {
              const active = Boolean(card.filter) && filters.bucket === card.filter.bucket;
              return (
                <li key={card.key}>
                  <button
                    type="button"
                    className={`intel-kpi${card.attention ? ' is-attention' : ''}${card.unavailable ? ' is-unavailable' : ''}${active ? ' is-active' : ''}`}
                    disabled={!card.filter}
                    aria-pressed={card.filter ? active : undefined}
                    onClick={() => card.filter && update(card.filter)}
                  >
                    <span className="intel-kpi-top">
                      <span className="intel-kpi-label">{card.label}</span>
                      {card.attention ? <span className="intel-flag">Needs attention</span> : null}
                    </span>
                    <span className="intel-kpi-value">{card.text}</span>
                    <span className="intel-kpi-detail">{card.detail}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}

        {!followLoadingFirst ? (
          <dl className="intel-facts">
            <div>
              <dt>Unscheduled</dt>
              <dd>
                {overview.unscheduled.filter ? (
                  <button type="button" className="intel-link" onClick={() => update(overview.unscheduled.filter)}>
                    {overview.unscheduled.text}
                  </button>
                ) : overview.unscheduled.text}
                <span>{overview.unscheduled.detail}</span>
              </dd>
            </div>
            <div>
              <dt>Completion rate</dt>
              <dd className={overview.completion.available ? '' : 'is-muted'} title={overview.completion.detail}>
                {overview.completion.text}
                <span>{overview.completion.detail}</span>
              </dd>
            </div>
            {overview.previous ? (
              <div className="is-wide">
                <dt>Comparison</dt>
                <dd><span>{overview.previous}</span></dd>
              </div>
            ) : null}
          </dl>
        ) : null}

        {followUnavailable ? null : (
          <div className={`intel-split${chart.state === 'ready' ? ' has-chart' : ''}`}>
            {chart.state === 'ready' ? (
              <div className="intel-card">
                <h3 className="intel-card-title">Follow-up mix</h3>
                <p className="intel-faint">Select a bar to filter the records.</p>
                <BarList
                  rows={chart.rows}
                  label="Follow-ups by classification"
                  onSelect={(row) => update({ bucket: row.bucket })}
                  describe={(row) => `${row.label}: ${row.count} follow-up${row.count === 1 ? '' : 's'}`}
                />
              </div>
            ) : null}

            <div className="intel-card intel-records">
              <div className="intel-card-head">
                <div>
                  <h3 className="intel-card-title">{bucketLabel(filters.bucket)}</h3>
                  <p className="intel-faint">
                    {followUps.data ? `${Number(followUps.data.total || 0).toLocaleString('en-US')} matching follow-up${Number(followUps.data.total || 0) === 1 ? '' : 's'}` : 'Loading follow-ups…'}
                  </p>
                </div>
                {filters.bucket ? (
                  <button type="button" className="intel-btn is-quiet is-small" onClick={() => update({ bucket: '' })}>
                    Show open commitments
                  </button>
                ) : null}
              </div>

              {followLoadingFirst ? <div className="intel-bone h-list" /> : null}

              {followUps.data && !followItems.length ? (
                <p className="intel-empty">
                  {chart.state === 'empty'
                    ? 'No follow-ups to show. Nothing is open, scheduled, or completed in these dates, so there is nothing to chart.'
                    : intelligenceEmptyMessage('follow-ups')}
                </p>
              ) : null}

              {followItems.length ? (
                <ul className="intel-rows">
                  {followItems.map((row) => {
                    const overdue = row.bucket === 'overdue';
                    return (
                      <li key={row.id} className="intel-row">
                        <div className="intel-row-main">
                          <strong>{row.consultancyName || 'Consultancy name was not stored'}</strong>
                          <span>
                            {row.status}
                            {' · '}
                            {row.completedAt && row.completedBy
                              ? `Completed by ${actorDisplay(row.completedBy)}`
                              : `Recorded by ${actorDisplay(row.createdBy)}`}
                          </span>
                        </div>
                        <div className="intel-row-side">
                          <span className="intel-row-when">
                            {row.scheduledAt ? formatIntelWhen(row.scheduledAt, PHASE_A_TIME_ZONE) : 'No due date'}
                          </span>
                          <span className={`intel-pill${overdue ? ' is-warn' : ''}`}>{bucketPillLabel(row.bucket, row.status)}</span>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              ) : null}

              {followUps.data && Number(followUps.data.total) > 0 ? (
                <Pager
                  page={followUps.data.page}
                  limit={followUps.data.limit}
                  total={followUps.data.total}
                  disabled={followUps.loading}
                  onPage={(followPage) => setPages((current) => ({ ...current, followUps: followPage }))}
                />
              ) : null}
            </div>
          </div>
        )}

        {trend.length >= 2 ? (
          <details className="intel-fold">
            <summary>Completed follow-ups by day ({trend.length} days)</summary>
            <p className="intel-faint">Days with no completions are omitted, not drawn as zero.</p>
            <div className="intel-trend">
              <CountChart rows={trend} xKey="day" yKey="count" label="Completed follow-ups by day" />
            </div>
          </details>
        ) : null}

        {approxOverdue.length ? (
          <details className="intel-fold">
            <summary>Approximate overdue by day ({approxOverdue.length})</summary>
            <p className="intel-faint">Rebuilt from surviving rows. Days with no surviving due row are omitted, not drawn as zero.</p>
            <div className="intel-table-wrap">
              <table className="intel-table">
                <thead>
                  <tr>
                    <th>Day</th>
                    <th className="num">Approximate overdue</th>
                    <th>Accuracy</th>
                  </tr>
                </thead>
                <tbody>
                  {approxOverdue.map((row) => (
                    <tr key={row.day}>
                      <td>{row.day}</td>
                      <td className="num">{row.count}</td>
                      <td><span className="intel-pill is-approx">Reconstructed</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
        ) : null}
      </section>

      {/* ───────────── B · Day-end report ───────────── */}
      <section className="intel-section" aria-labelledby="intel-day-title">
        <SectionHead
          id="intel-day-title"
          title="Day-end report"
          subtitle={`What happened on ${intelDayLabel(filters.date) || 'the reporting day'} (${PHASE_A_TIME_ZONE}).`}
          scope={<ScopeBadge data={dayEnd.data} note={dayScope} />}
          onHow={showDefinitions}
        />

        {dayEnd.notice ? <Notice tone={dayEnd.notice.tone}>{dayEnd.notice.message}</Notice> : null}
        {dayEnd.data?.truncated ? (
          <Notice tone="warning">This report stopped at its row cap. Narrow the filters. Omitted rows are not shown as zero.</Notice>
        ) : null}

        {dayHeadline.summary ? (
          <div className="intel-summary">
            <p>{dayHeadline.summary}</p>
            {dayHeadline.note ? <p className="intel-faint">{dayHeadline.note}</p> : null}
          </div>
        ) : null}

        {dayLoadingFirst ? (
          <div className="intel-groups" aria-busy="true" aria-label="Loading day-end report">
            {Array.from({ length: 3 }, (_, index) => <div key={index} className="intel-bone h-group" />)}
          </div>
        ) : (
          <div className="intel-groups">
            {dayGroups.map((group) => (
              <div key={group.id} className="intel-group">
                <h3 className="intel-group-title">{group.title}</h3>
                <ul>
                  {group.metrics.map((metric) => {
                    const active = Boolean(metric.filter) && filters.event === metric.filter.event;
                    return (
                      <li key={metric.key}>
                        <button
                          type="button"
                          className={`intel-metric-row${active ? ' is-active' : ''}${metric.unavailable ? ' is-unavailable' : ''}`}
                          disabled={!metric.filter}
                          aria-pressed={metric.filter ? active : undefined}
                          onClick={() => metric.filter && update(metric.filter)}
                        >
                          <span className="intel-metric-text">
                            <span className="intel-metric-name">
                              {metric.label}
                              {metric.kind === 'unavailable' ? null : (
                                <span className={`intel-tag is-${metric.kind}`}>
                                  {metric.kind === 'recorded' ? 'Recorded' : 'Reconstructed'}
                                </span>
                              )}
                            </span>
                            <span className="intel-metric-note">{metric.detail}</span>
                          </span>
                          <span className={`intel-metric-number${metric.unavailable ? ' is-unavailable' : ''}`}>{metric.text}</span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
                {group.id === 'follow_up' && dayEnd.data?.exactSnapshot === false ? (
                  <details className="intel-fold is-inline">
                    <summary>About reconstructed figures</summary>
                    <p className="intel-faint">{dayEndScheduleNote(dayEnd.data.summary)}</p>
                  </details>
                ) : null}
              </div>
            ))}
          </div>
        )}

        <div className={`intel-split${dayBreakdown.length >= 2 ? ' has-chart is-narrow' : ''}`}>
          {dayBreakdown.length >= 2 ? (
            <div className="intel-card">
              <h3 className="intel-card-title">Recorded events by type</h3>
              <p className="intel-faint">
                {Number(dayEnd.data?.total || 0) > dayItems.length ? 'Events on this page only.' : 'All events for this day.'}
              </p>
              <BarList
                rows={dayBreakdown.map((row) => ({ ...row, tone: 'brand' }))}
                label="Recorded events by type"
                describe={(row) => `${row.label}: ${row.count} event${row.count === 1 ? '' : 's'}`}
              />
            </div>
          ) : null}

          <div className="intel-card intel-records">
            <div className="intel-card-head">
              <div>
                <h3 className="intel-card-title">Recorded events</h3>
                <p className="intel-faint">
                  {dayEnd.data
                    ? `${Number(dayEnd.data.total || 0).toLocaleString('en-US')} row${Number(dayEnd.data.total || 0) === 1 ? '' : 's'} for ${intelDayLabel(filters.date)}`
                    : 'Loading events…'}
                </p>
              </div>
              {filters.event ? (
                <button type="button" className="intel-btn is-quiet is-small" onClick={() => update({ event: '' })}>
                  Show all events
                </button>
              ) : null}
            </div>

            {dayLoadingFirst ? <div className="intel-bone h-list" /> : null}
            {dayUnavailable ? <p className="intel-empty">The day-end report is unavailable right now.</p> : null}

            {dayEnd.data && !dayItems.length ? (
              <p className="intel-empty">{intelligenceEmptyMessage('day-end')}</p>
            ) : null}

            {dayItems.length ? (
              <ul className="intel-timeline">
                {dayItems.map((row) => {
                  const open = selectedDayEvent === row.id;
                  const approx = row.exact === false;
                  return (
                    <li key={row.id} className={`intel-event${approx ? ' is-approx' : ''}${open ? ' is-open' : ''}`}>
                      <span className="intel-dot" aria-hidden="true" />
                      <div className="intel-event-main">
                        <p className="intel-event-title">{dayEndKindLabel(row.kind)}</p>
                        <p className="intel-event-meta">
                          {row.consultancyName || row.studentName || 'Name was not stored'}
                          {' · '}
                          {actorDisplay(row.actor)}
                          {' · '}
                          {dayEndSourceLabel(row.source)}
                        </p>
                        <button
                          type="button"
                          className="intel-link"
                          aria-expanded={open}
                          onClick={() => setSelectedDayEvent(open ? null : row.id)}
                        >
                          {open ? 'Hide audit details' : 'View audit details'}
                        </button>
                        {open ? <DayEventDetail row={row} /> : null}
                      </div>
                      <div className="intel-event-side">
                        <span className="intel-event-when">{formatIntelWhen(row.at, PHASE_A_TIME_ZONE)}</span>
                        <span className={`intel-pill${approx ? ' is-approx' : ' is-brand'}`}>{approx ? 'Reconstructed' : 'Recorded'}</span>
                      </div>
                    </li>
                  );
                })}
              </ul>
            ) : null}

            {dayEnd.data && Number(dayEnd.data.total) > 0 ? (
              <Pager
                page={dayEnd.data.page}
                limit={dayEnd.data.limit}
                total={dayEnd.data.total}
                disabled={dayEnd.loading}
                onPage={(dayPage) => setPages((current) => ({ ...current, dayEnd: dayPage }))}
              />
            ) : null}
          </div>
        </div>
      </section>

      {/* ───────────── C · Staff workload ───────────── */}
      <section className="intel-section" aria-labelledby="intel-work-title">
        <SectionHead
          id="intel-work-title"
          title="Staff workload"
          subtitle="How assigned work is distributed. Not a ranking, and not a productivity measure."
          scope={<ScopeBadge data={workload.data} note={workScope} />}
          onHow={showDefinitions}
        />

        {workload.notice ? <Notice tone={workload.notice.tone}>{workload.notice.message}</Notice> : null}

        {workLoadingFirst ? <KpiSkeleton count={3} /> : (
          <ul className="intel-kpis is-3">
            {workCards.map((card) => (
              <li key={card.key}>
                <div className={`intel-kpi is-static${card.unavailable ? ' is-unavailable' : ''}`}>
                  <span className="intel-kpi-top"><span className="intel-kpi-label">{card.label}</span></span>
                  <span className="intel-kpi-value">{card.text}</span>
                  <span className="intel-kpi-detail">{card.detail}</span>
                </div>
              </li>
            ))}
          </ul>
        )}

        {workUnavailable ? null : (
          <div className="intel-card">
            <div className="intel-card-head">
              <div>
                <h3 className="intel-card-title">Compare by metric</h3>
                <p className="intel-faint">
                  {workload.data ? `${workloadScopeLine(workload.data)}, listed alphabetically. Shared consultancies count for each assignee.` : 'Loading staff workload…'}
                </p>
              </div>
              <div className="intel-seg" role="group" aria-label="Workload metric">
                {INTEL_WORKLOAD_METRICS.map((metric) => (
                  <button
                    key={metric.id}
                    type="button"
                    className={workMetric === metric.id ? 'is-active' : undefined}
                    aria-pressed={workMetric === metric.id}
                    onClick={() => setWorkMetric(metric.id)}
                  >
                    {metric.label}
                  </button>
                ))}
              </div>
            </div>

            {workload.data && !workItems.length ? <p className="intel-empty">{intelligenceEmptyMessage('workload')}</p> : null}
            {workload.data && workItems.length && workMax === 0 ? (
              <p className="intel-empty">Every listed staff member has 0 for {workMetricLabel.toLowerCase()} in this report.</p>
            ) : null}
            {workload.data && workItems.length && workMax > 0 ? (
              <BarList
                rows={workBars}
                label={`Staff comparison: ${workMetricLabel}`}
                describe={(row) => `${row.name}: ${row.count} ${workMetricLabel.toLowerCase()}. Assigned workload, not performance.`}
              />
            ) : null}
          </div>
        )}

        {workload.data && workItems.length ? (
          <div className="intel-card">
            <div className="intel-card-head">
              <div>
                <h3 className="intel-card-title">Staff list</h3>
                <p className="intel-faint">Select a staff member to open their Staff 360° detail.</p>
              </div>
            </div>
            <div className="intel-table-wrap">
              <table className="intel-table is-staff">
                <thead>
                  <tr>
                    <th>Staff member</th>
                    <th className="num">Consultancies</th>
                    <th className="num">Open</th>
                    <th className="num">Overdue</th>
                    <th className="num">Admission events</th>
                    <th className="num">Completed</th>
                    <th className="num">Completion rate</th>
                  </tr>
                </thead>
                <tbody>
                  {workItems.map((row) => {
                    const rate = completionRateText(row.completion);
                    const selected = selectedStaff?.id === row.userId;
                    return (
                      <tr key={row.userId} className={selected ? 'is-selected' : undefined}>
                        <td>
                          <button
                            type="button"
                            className="intel-link"
                            aria-expanded={selected}
                            onClick={() => (selected ? setSelectedStaff(null) : setSelectedStaff({ id: row.userId, fullName: row.name || '' }))}
                          >
                            {row.name || 'Name was not stored'}
                          </button>
                        </td>
                        <td className="num">{row.assignedConsultancies}</td>
                        <td className="num">{row.openFollowUps}</td>
                        <td className={`num${row.overdueFollowUps > 0 ? ' is-attention' : ''}`}>{row.overdueFollowUps}</td>
                        <td className="num">{row.admissionsRecorded}</td>
                        <td className="num">{row.followUpsCompleted}</td>
                        <td className="num" title={rate.detail}>
                          {rate.unavailable ? <span className="intel-muted">Not enough data</span> : rate.text}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <Pager
              page={workload.data.page}
              limit={workload.data.limit}
              total={workload.data.total}
              disabled={workload.loading}
              onPage={(workPage) => setPages((current) => ({ ...current, workload: workPage }))}
            />
          </div>
        ) : null}

        {selectedStaff ? (
          <div className="intel-staff-detail" ref={staffDetailRef}>
            <Staff360Detail
              staffId={selectedStaff.id}
              profileHint={selectedStaff}
              onClear={() => setSelectedStaff(null)}
              timeline={(
                <p className="intel-faint">
                  The full audit timeline lives in <Link to="/crm/admin/activity">Activity</Link>.
                </p>
              )}
              rangeFrom={filters.from}
              rangeTo={filters.to}
            />
          </div>
        ) : null}
      </section>

      {/* ───────────── D · How metrics are calculated ───────────── */}
      <section
        className="intel-section intel-defs-section"
        aria-labelledby="intel-defs-title"
        id="intel-definitions"
        ref={defsRef}
      >
        <header className="intel-section-head">
          <div className="intel-section-copy">
            <h2 id="intel-defs-title">How metrics are calculated</h2>
            <p>Plain-language definitions and limits. Technical field names are shown where they matter.</p>
          </div>
          <div className="intel-section-meta">
            <button type="button" className="intel-btn is-quiet is-small" onClick={() => setDefsOpen((open) => !open)} aria-expanded={defsOpen}>
              {defsOpen ? 'Hide definitions' : 'Show definitions'}
            </button>
          </div>
        </header>

        {defsOpen ? (
          <div className="intel-defs">
            <Definition id="def-follow-ups" title="Follow-up classification" open>
              <ul>
                <li>An <strong>open</strong> follow-up has the status Meeting Scheduled or Follow-up Required, with no <code>completedAt</code> and no <code>cancelledAt</code>.</li>
                <li><strong>Overdue</strong> means open and past its <code>scheduledAt</code> time. <strong>Due today</strong> is still ahead of now, today. <strong>Upcoming</strong> is after today.</li>
                <li>A follow-up with no due date is <strong>unscheduled</strong>. It is never counted as overdue.</li>
                <li>The default records view lists overdue, due today, and upcoming. It does not list unscheduled rows.</li>
              </ul>
              <Formulas metrics={definitions} ids={DEF_GROUPS.followUps} />
            </Definition>
            <Definition id="def-completion" title="Completion-rate calculation">
              <ul>
                <li>Completion rate = follow-ups scheduled in the selected dates that are now completed, divided by all follow-ups scheduled in those dates.</li>
                <li>Cancelled follow-ups are excluded from the denominator.</li>
                <li>With no scheduled follow-ups there is no valid denominator, so the page says &ldquo;Not enough scheduled follow-ups&rdquo; instead of showing a percentage.</li>
              </ul>
              <Formulas metrics={definitions} ids={DEF_GROUPS.completion} />
            </Definition>
            <Definition id="def-day-end" title="Day-end reconstruction">
              <ul>
                <li>No end-of-day snapshot is stored. Outstanding and overdue figures are rebuilt from surviving records and are labelled Reconstructed.</li>
                <li>Rescheduled or deleted rows can make the reconstruction approximate. Missing history is never filled in.</li>
                <li>If a figure cannot be rebuilt it shows <strong>Unavailable</strong> with the reason, never 0.</li>
                <li>Recorded events come from audit logs, assignment records, and follow-up records. Each row names its source.</li>
              </ul>
              <Formulas metrics={definitions} ids={DEF_GROUPS.dayEnd} />
            </Definition>
            <Definition id="def-workload" title="Staff workload attribution">
              <ul>
                <li>Workload is assigned volume, not working time, not a productivity score, and not performance. It is not ranked by volume; staff are listed by name.</li>
                <li>A shared consultancy&apos;s open and overdue follow-ups are counted for every current assignee. They are not split between assignees and not treated as independently completed work.</li>
                <li>Completed follow-ups and admission events use the person stored on the event, within the selected dates.</li>
              </ul>
              <Formulas metrics={definitions} ids={DEF_GROUPS.workload} />
            </Definition>
            <Definition id="def-admissions" title="Admission-event interpretation">
              <ul>
                <li>Admission events are recorded status changes (<code>student.created</code> and status changes in <code>student.updated</code>). They are not conversions or outcomes.</li>
                <li>A student with no audit record is omitted. Missing historical audits cannot be fabricated.</li>
                <li>If the audit scan is cut off at its row cap, the affected figures show Unavailable.</li>
              </ul>
              <Formulas metrics={definitions} ids={DEF_GROUPS.admissions} />
            </Definition>
            <Definition id="def-timezone" title="Timezone and reporting limitations">
              <ul>
                <li>{PHASE_A_TIME_ZONE} is used for days and times, and is pending business-owner confirmation until that is recorded.</li>
                <li>A request that omits the timezone is treated as UTC by the server.</li>
                <li>Reporting day is separate from the date range: the range drives follow-ups and workload; the reporting day drives the day-end report.</li>
                {limitations.map((line) => <li key={line}>{line}</li>)}
              </ul>
            </Definition>
          </div>
        ) : null}
      </section>
    </div>
  );
}

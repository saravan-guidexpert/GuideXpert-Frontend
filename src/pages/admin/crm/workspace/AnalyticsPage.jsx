import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  FiAlertTriangle,
  FiArrowDownRight,
  FiArrowUpRight,
  FiBriefcase,
  FiClock,
  FiInbox,
  FiMinus,
  FiRefreshCw,
  FiTrendingUp,
  FiUserCheck,
  FiUsers,
  FiChevronLeft,
  FiChevronRight,
} from 'react-icons/fi';
import { useCrmSession } from '../../../crm-app/useCrmSession';
import { getPortalOperations } from '../../../../utils/crmSessionApi';
import {
  PHASE_A_TIME_ZONE,
  WORKSPACE_HOME,
  applyFilterPatch,
  operationsQuery,
  workspaceRouteDecision,
} from '../../../../utils/crmWorkspace';
import {
  OPERATIONS_PERIODS,
  OPERATIONS_SORTS,
  consultancyBarRows,
  displayMetricValue,
  filterConsultancyItems,
  operationsAdmission,
  operationsKpis,
  operationsPeriodName,
  operationsScopeNote,
  operationsVolumeRows,
  operationsVolumeStats,
  pagerLabel,
  referralDelta,
  volumeBucketRange,
} from '../../../../utils/crmOperationsDashboard';
import { formatCount } from '../../../../utils/crmOverview';
import { useCrmResource } from './useCrmResource';
import { AccessNote } from './workspaceUi';
import { ConsultancyCompareChart, OperationsTrendChart } from './operationsCharts';
import './superAdminOperations.css';

const KPI_ICONS = {
  referrals: FiTrendingUp,
  previous: FiClock,
  students: FiUsers,
  unassigned: FiInbox,
  active: FiBriefcase,
  referred: FiUserCheck,
};

function Notice({ tone = 'error', children, onRetry }) {
  return (
    <div className={`ops-notice is-${tone}`} role={tone === 'error' ? 'alert' : 'status'}>
      <FiAlertTriangle size={16} aria-hidden="true" />
      <p>{children}</p>
      {onRetry ? <button type="button" className="ops-btn is-quiet" onClick={onRetry}>Try again</button> : null}
    </div>
  );
}

function ComparisonAside({ comparison }) {
  if (!comparison) return null;
  const Icon = comparison.direction === 'up' ? FiArrowUpRight : comparison.direction === 'down' ? FiArrowDownRight : FiMinus;
  const short = comparison.direction === 'flat'
    ? 'Flat'
    : comparison.text.replace(/ vs the previous period$/i, '');
  return (
    <span className={`ops-kpi-aside is-${comparison.direction}`} title={comparison.text}>
      <Icon size={11} aria-hidden="true" />
      {short}
    </span>
  );
}

function KpiCard({ item }) {
  const Icon = KPI_ICONS[item.id] || FiTrendingUp;
  const shown = displayMetricValue(item.value, item.whenNull);
  const hint = shown.unavailable && shown.detail ? shown.detail : item.hint;
  return (
    <li
      className={`ops-kpi${item.tone === 'primary' ? ' is-primary' : ''}${item.tone === 'warn' ? ' is-warn' : ''}${item.currentState ? ' is-current' : ''}`}
      title={hint}
    >
      <div className="ops-kpi-top">
        <span className="ops-kpi-icon" aria-hidden="true"><Icon size={14} /></span>
        <span className="ops-kpi-label">{item.label}</span>
      </div>
      <div className="ops-kpi-foot">
        <p className={`ops-kpi-value${shown.unavailable ? ' is-muted' : ''}`}>{shown.text}</p>
        <span className="ops-kpi-meta">
          {item.comparison ? <ComparisonAside comparison={item.comparison} /> : null}
          {item.currentState && !item.comparison ? <span className="ops-tag">Now</span> : null}
        </span>
      </div>
    </li>
  );
}

function AdmissionBlock({ admission }) {
  if (!admission.rows.length) {
    return (
      <div className="ops-empty">
        <strong>No admission data</strong>
        <p>Current status counts will appear when students are in scope.</p>
      </div>
    );
  }
  return (
    <ol className="ops-pipe" aria-label="Students by current admission status">
      {admission.rows.map((row) => (
        <li key={row.status} className={`ops-pipe-row is-${row.tone}`}>
          <div className="ops-pipe-meta">
            <span className="ops-pipe-name">{row.status}</span>
            <span className="ops-pipe-num">
              <strong>{formatCount(row.count)}</strong>
              <em>{admission.total ? `${row.share}%` : '—'}</em>
            </span>
          </div>
          <div className="ops-pipe-track" aria-hidden="true">
            <span style={{ width: `${row.count ? Math.max(row.width, 1.5) : 0}%` }} />
          </div>
        </li>
      ))}
    </ol>
  );
}

export default function AnalyticsPage() {
  const { user } = useCrmSession();
  const decision = workspaceRouteDecision(user, 'analytics');
  const timeZone = PHASE_A_TIME_ZONE;
  const [filters, setFilters] = useState({ period: '30', from: '', to: '', page: 1, limit: 20 });
  const [reloadKey, setReloadKey] = useState(0);
  const [houseQ, setHouseQ] = useState('');
  const [houseSort, setHouseSort] = useState('referrals');

  const built = useMemo(
    () => operationsQuery({ ...filters, timeZone }),
    [filters, timeZone]
  );
  const operations = useCrmResource(
    decision.state === 'allowed' && !built.error,
    `${reloadKey}:${built.error || JSON.stringify(built.query)}`,
    () => getPortalOperations(built.query),
    false,
    { keepData: true }
  );

  if (decision.state !== 'allowed') return <AccessNote>{decision.message}</AccessNote>;

  const data = operations.data;
  const periodLabel = operationsPeriodName(filters.period, data?.range);
  const scopeNote = operationsScopeNote(data);
  const kpis = operationsKpis(data);
  const volumeRows = operationsVolumeRows(data?.period?.volume);
  const volume = operationsVolumeStats(volumeRows);
  const grain = data?.period?.volume?.grain === 'month' ? 'month' : 'day';
  const admission = operationsAdmission(data);
  const houseRows = filterConsultancyItems(data?.consultancies?.items, { q: houseQ, sort: houseSort });
  const barRows = consultancyBarRows(houseRows, 8);
  const page = data?.consultancies?.page || filters.page;
  const limit = data?.consultancies?.limit || filters.limit;
  const total = data?.consultancies?.total || 0;
  const pageCount = Math.max(1, Math.ceil(total / limit));

  function update(patch) {
    setFilters((current) => applyFilterPatch(current, patch));
  }

  function selectBucket(point) {
    const next = volumeBucketRange(point, grain);
    if (!next) return;
    update(next);
  }

  return (
    <div className="gx-admin-page ops-page">
      <header className="ops-head">
        <div className="ops-head-copy">
          <h1 className="ops-title">Operations &amp; Intelligence</h1>
          <p className="ops-lede">
            Referral activity, admission pipeline, and consultancy workload
            {scopeNote ? ` · ${scopeNote}` : ''}.
          </p>
        </div>
        <div className="ops-head-actions">
          <div className="ops-toolbar">
            <div className="ops-periods" role="group" aria-label="Reporting period">
              {OPERATIONS_PERIODS.map((period) => (
                <button
                  key={period.id}
                  type="button"
                  className={`ops-period${filters.period === period.id ? ' is-active' : ''}`}
                  onClick={() => update({ period: period.id })}
                  title={period.name}
                >
                  {period.label}
                </button>
              ))}
            </div>
            <div className="ops-meta">
              <span className="ops-rangechip" title={data?.range ? `${data.range.from} → ${data.range.to}` : periodLabel}>
                {periodLabel}
              </span>
              <span className="ops-zone" title="Pending business-owner confirmation">
                <FiClock size={12} aria-hidden="true" /> {timeZone}
              </span>
              <button
                type="button"
                className={`ops-btn is-icon${operations.loading ? ' is-spinning' : ''}`}
                aria-label="Refresh operations"
                disabled={operations.loading || Boolean(built.error)}
                onClick={() => setReloadKey((key) => key + 1)}
              >
                <FiRefreshCw size={14} aria-hidden="true" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {filters.period === 'custom' ? (
        <div className="ops-custom">
          <label className="ops-field">
            <span className="ops-label">From</span>
            <input
              className="ops-input"
              type="date"
              value={filters.from}
              onChange={(event) => update({ from: event.target.value })}
            />
          </label>
          <label className="ops-field">
            <span className="ops-label">To</span>
            <input
              className="ops-input"
              type="date"
              value={filters.to}
              onChange={(event) => update({ to: event.target.value })}
            />
          </label>
        </div>
      ) : null}

      {built.error ? <Notice tone="warning">{built.error}</Notice> : null}
      {operations.notice ? (
        <Notice tone={operations.notice.tone} onRetry={() => setReloadKey((key) => key + 1)}>
          {operations.notice.message}
        </Notice>
      ) : null}

      {operations.loading && !data ? (
        <>
          <div className="ops-kpis" aria-busy="true">
            {Array.from({ length: 6 }, (_, index) => <div key={index} className="ops-bone h-kpi" />)}
          </div>
          <div className="ops-grid" aria-busy="true">
            <div className="ops-bone h-panel" />
            <div className="ops-bone h-panel" />
          </div>
        </>
      ) : null}

      {data ? (
        <div className={`ops-body${operations.loading ? ' is-stale' : ''}`}>
          <ul className="ops-kpis" aria-label="Operations metrics">
            {kpis.map((item) => <KpiCard key={item.id} item={item} />)}
          </ul>

          <div className="ops-grid">
            <section className="ops-panel" aria-labelledby="ops-trend-title">
              <header className="ops-panel-head">
                <div>
                  <h2 id="ops-trend-title">Referral trend</h2>
                  <p>{grain === 'month' ? 'Monthly' : 'Daily'} referrals · click a point to focus</p>
                </div>
                <ul className="ops-statline is-inline">
                  <li>Total <strong>{formatCount(volume.total)}</strong></li>
                  <li>Peak <strong>{volume.peak ? `${volume.peak.label} · ${formatCount(volume.peak.count)}` : '—'}</strong></li>
                </ul>
              </header>
              {volumeRows.length ? (
                <>
                  <OperationsTrendChart
                    rows={volumeRows}
                    grain={grain}
                    peakKey={volume.peak?.key}
                    label={`Referral trend, ${periodLabel}: ${volume.total} referrals`}
                    onSelect={selectBucket}
                  />
                  {volume.empty ? <p className="ops-chart-empty">No referrals recorded in this period.</p> : null}
                </>
              ) : (
                <div className="ops-empty">
                  <strong>No trend points</strong>
                  <p>Nothing to chart for this selection.</p>
                </div>
              )}
            </section>

            <section className="ops-panel" aria-labelledby="ops-admission-title">
              <header className="ops-panel-head">
                <div>
                  <h2 id="ops-admission-title">Admission pipeline</h2>
                  <p title={admission.note || undefined}>Current status snapshot, not historical funnel</p>
                </div>
              </header>
              <AdmissionBlock admission={admission} />
            </section>
          </div>

          <section className="ops-panel" aria-labelledby="ops-houses-title">
            <header className="ops-panel-head">
              <div>
                <h2 id="ops-houses-title">Consultancy performance</h2>
                <p>Period referrals and current assignees</p>
              </div>
              <div className="ops-tools is-inline">
                <label className="ops-field">
                  <span className="act-sr-only">Search this page</span>
                  <input
                    className="ops-input is-search"
                    value={houseQ}
                    onChange={(event) => setHouseQ(event.target.value)}
                    placeholder="Search name"
                    aria-label="Search consultancies on this page"
                  />
                </label>
                <label className="ops-field">
                  <span className="act-sr-only">Sort</span>
                  <select
                    className="ops-input is-sort"
                    value={houseSort}
                    onChange={(event) => setHouseSort(event.target.value)}
                    aria-label="Sort consultancies on this page"
                  >
                    {OPERATIONS_SORTS.map((item) => (
                      <option key={item.id} value={item.id}>{item.label}</option>
                    ))}
                  </select>
                </label>
              </div>
            </header>

            <div className="ops-perf">
              {barRows.length ? (
                <div className="ops-perf-chart">
                  <div className="ops-perf-caption">
                    <span>New referrals</span>
                    <span>Top {barRows.length} on this page</span>
                  </div>
                  <ConsultancyCompareChart
                    rows={barRows}
                    label="Top consultancies by new referrals on this page"
                  />
                </div>
              ) : null}

              <div className="ops-perf-table">
                {houseRows.length ? (
                  <div className="ops-table-wrap">
                    <table className="ops-table">
                      <thead>
                        <tr>
                          <th>Consultancy</th>
                          <th>Status</th>
                          <th>Students</th>
                          <th>New referrals</th>
                          <th>Previous</th>
                          <th>Change</th>
                          <th>Assignees</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {houseRows.map((row) => {
                          const delta = referralDelta(row.newReferrals, row.previousNewReferrals);
                          return (
                            <tr key={row.id}>
                              <td>
                                <span className="ops-house">
                                  <span className="ops-house-mark" aria-hidden="true">
                                    {String(row.name || 'U').trim().charAt(0).toUpperCase()}
                                  </span>
                                  <Link className="ops-link" to={`${WORKSPACE_HOME}/consultancies`} title="Open consultancies workspace">
                                    {row.name || 'Untitled'}
                                  </Link>
                                </span>
                              </td>
                              <td>
                                <span className={`ops-status is-${String(row.status || 'unknown').toLowerCase()}`}>
                                  {row.status || '—'}
                                </span>
                              </td>
                              <td className="is-num" title="Students whose current referral points here">
                                {formatCount(row.students)}
                              </td>
                              <td className="is-num" title="Referrals recorded in the selected period">
                                {formatCount(row.newReferrals)}
                              </td>
                              <td className="is-num">
                                {row.previousNewReferrals == null ? '—' : formatCount(row.previousNewReferrals)}
                              </td>
                              <td className="is-num">
                                <span className={`ops-delta is-${delta.direction}`} title={delta.title}>
                                  {delta.direction === 'up' ? <FiArrowUpRight size={12} aria-hidden="true" /> : null}
                                  {delta.direction === 'down' ? <FiArrowDownRight size={12} aria-hidden="true" /> : null}
                                  {delta.direction === 'flat' ? <FiMinus size={12} aria-hidden="true" /> : null}
                                  {delta.text}
                                </span>
                              </td>
                              <td className="is-num">{formatCount(row.activeAssignees)}</td>
                              <td>
                                <Link className="ops-btn is-quiet is-table-action" to={`${WORKSPACE_HOME}/consultancies`}>
                                  View
                                  <FiChevronRight size={14} aria-hidden="true" />
                                </Link>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="ops-empty">
                    <strong>No consultancies on this page</strong>
                    <p>Try another page, clear search, or confirm your assignment scope.</p>
                  </div>
                )}

                <div className="ops-pager">
                  <span>{pagerLabel(page, limit, total)}</span>
                  {pageCount > 1 ? (
                    <div className="ops-pager-controls">
                      <button
                        type="button"
                        className="ops-btn is-icon"
                        disabled={page <= 1 || operations.loading}
                        aria-label="Previous page"
                        onClick={() => update({ page: page - 1 })}
                      >
                        <FiChevronLeft size={16} aria-hidden="true" />
                      </button>
                      <span>Page {page} of {pageCount}</span>
                      <button
                        type="button"
                        className="ops-btn is-icon"
                        disabled={page >= pageCount || operations.loading}
                        aria-label="Next page"
                        onClick={() => update({ page: page + 1 })}
                      >
                        <FiChevronRight size={16} aria-hidden="true" />
                      </button>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          </section>

          {Array.isArray(data.limitations) && data.limitations.length ? (
            <details className="ops-limits">
              <summary>Data definitions &amp; limitations</summary>
              <ul>
                {data.limitations.map((item) => <li key={item}>{item}</li>)}
                <li>Timezone {timeZone} is pending business-owner confirmation.</li>
                <li>Search and sort apply to the current consultancy page. Pagination remains server-ordered by name.</li>
                <li>Student counts on consultancies use current referral links, not original source attribution.</li>
              </ul>
            </details>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

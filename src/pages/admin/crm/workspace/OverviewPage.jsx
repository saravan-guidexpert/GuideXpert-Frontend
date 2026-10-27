import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  FiAlertTriangle,
  FiArrowDownRight,
  FiArrowRight,
  FiArrowUpRight,
  FiBriefcase,
  FiCalendar,
  FiEdit3,
  FiFileText,
  FiInbox,
  FiLock,
  FiMinus,
  FiRefreshCw,
  FiTrendingUp,
  FiUser,
  FiUsers,
} from 'react-icons/fi';
import { useCrmSession } from '../../../crm-app/useCrmSession';
import { dayGreeting } from '../../../crm-demo/dashboard/dashboardModel';
import {
  fetchPortalDirectory,
  fetchPortalUsers,
  getPortalOperations,
  listPortalActivity,
} from '../../../../utils/crmSessionApi';
import { analyticsParams } from '../crmProductionQuery';
import {
  HIDDEN_METRIC,
  PHASE_A_TIME_ZONE,
  WORKSPACE_HOME,
  metricText,
  volumeChartRows,
  workspaceRouteDecision,
} from '../../../../utils/crmWorkspace';
import {
  OVERVIEW_PERIODS,
  TEAM_FETCH_LIMIT,
  TEAM_FILTERS,
  TEAM_STATES,
  TEAM_VISIBLE_ROWS,
  activityLabel,
  activityVisual,
  admissionBars,
  formatClock,
  formatCount,
  formatMoment,
  formatStamp,
  overviewOperationsQuery,
  periodName,
  periodPhrase,
  referralComparison,
  relativeTime,
  teamFilter,
  teamQueries,
  teamRows,
  teamTotals,
  updateSubject,
  volumeStats,
} from '../../../../utils/crmOverview';
import { useCrmResource } from './useCrmResource';
import { AccessNote } from './workspaceUi';
import { AdmissionPipeline, ReferralTrendChart, Sparkline } from './overviewCharts';
import './superAdminOverview.css';

const ACTIVITY_ICONS = {
  consultancy: FiBriefcase,
  student: FiUser,
  referral: FiFileText,
  record: FiEdit3,
};

function greetingName(fullName) {
  const name = String(fullName || '').trim();
  if (!name) return 'there';
  const first = name.split(/\s+/)[0];
  return /^[A-Z]{2,4}$/.test(first) ? name : first;
}

function todayKey(timeZone) {
  return new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
}

function ScopeTag({ scope, children }) {
  return <span className={`ov-scope-tag is-${scope}`}>{children}</span>;
}

function Notice({ tone = 'error', children, onRetry }) {
  return (
    <div className={`ov-notice is-${tone}`} role={tone === 'error' ? 'alert' : 'status'}>
      <FiAlertTriangle size={16} aria-hidden="true" />
      <p>{children}</p>
      {onRetry ? <button type="button" className="ov-btn is-quiet" onClick={onRetry}>Try again</button> : null}
    </div>
  );
}

function Kpi({ icon, label, value, whenNull, hint, scope, scopeLabel, aside, children }) {
  const Icon = icon;
  const shown = metricText(value, whenNull);
  const locked = shown.unavailable && whenNull === HIDDEN_METRIC;
  return (
    <article className={`ov-kpi${shown.unavailable ? ' is-unavailable' : ''}`}>
      <header className="ov-kpi-head">
        <span className="ov-kpi-ico" aria-hidden="true"><Icon size={15} strokeWidth={2} /></span>
        <h3>{label}</h3>
        {scopeLabel ? <ScopeTag scope={scope}>{scopeLabel}</ScopeTag> : null}
      </header>
      <div className="ov-kpi-row">
        <p className="ov-kpi-value">
          {locked ? <FiLock size={18} aria-hidden="true" /> : null}
          {shown.unavailable ? shown.text : formatCount(value)}
        </p>
        {shown.unavailable ? null : aside}
      </div>
      <p className="ov-kpi-hint">{shown.detail || hint}</p>
      {children ? <div className="ov-kpi-foot">{children}</div> : null}
    </article>
  );
}

function Comparison({ current, previous }) {
  const change = referralComparison(current, previous);
  if (!change) return null;
  const Icon = change.direction === 'up' ? FiArrowUpRight : change.direction === 'down' ? FiArrowDownRight : FiMinus;
  return (
    <p className={`ov-delta is-${change.direction}`}>
      <Icon size={13} strokeWidth={2.25} aria-hidden="true" />
      <span>{change.text}</span>
    </p>
  );
}

function PeriodPicker({ selected, onSelect }) {
  return (
    <div className="ov-seg" role="group" aria-label="Reporting period">
      {OVERVIEW_PERIODS.map((item) => (
        <button
          key={item.id}
          type="button"
          aria-pressed={selected === item.id}
          aria-label={item.name}
          title={item.name}
          className={selected === item.id ? 'is-on' : ''}
          onClick={() => onSelect(item.id)}
        >
          {item.id === 'custom' ? <FiCalendar size={13} aria-hidden="true" /> : null}
          {item.label}
        </button>
      ))}
    </div>
  );
}

function CustomRange({ draft, error, max, onChange, onApply, onCancel }) {
  return (
    <form
      className="ov-custom"
      aria-label="Custom reporting period"
      onSubmit={(event) => {
        event.preventDefault();
        onApply();
      }}
    >
      <label>
        <span>From</span>
        <input type="date" value={draft.from} max={max} onChange={(event) => onChange({ from: event.target.value })} required />
      </label>
      <label>
        <span>To</span>
        <input type="date" value={draft.to} max={max} onChange={(event) => onChange({ to: event.target.value })} required />
      </label>
      <div className="ov-custom-actions">
        <button type="submit" className="ov-btn is-primary">Apply range</button>
        <button type="button" className="ov-btn is-quiet" onClick={onCancel}>Cancel</button>
      </div>
      {error ? <p className="ov-custom-error" role="alert">{error}</p> : null}
    </form>
  );
}

function OverviewSkeleton() {
  return (
    <div className="ov-skeleton" aria-hidden="true">
      <div className="ov-primary">
        {[0, 1, 2, 3].map((key) => <div key={key} className="ov-bone h-kpi" />)}
      </div>
      <div className="ov-analytics">
        <div className="ov-bone h-chart" />
        <div className="ov-bone h-chart" />
      </div>
    </div>
  );
}

function TeamStatus({ row }) {
  const info = TEAM_STATES[row.state];
  let detail = '';
  if (row.state === 'online') detail = row.sessions > 1 ? `${row.sessions} open sessions` : 'Using the CRM now';
  if (row.state === 'idle' || row.state === 'offline') {
    const seen = relativeTime(row.lastSeenAt, PHASE_A_TIME_ZONE);
    detail = seen ? `Last seen ${seen[0].toLowerCase()}${seen.slice(1)}` : 'Not seen yet';
  }
  return (
    <div className="ov-team-status" title={info.hint}>
      <span className={`ov-pill is-${row.state}`}><span className="ov-dot" aria-hidden="true" />{info.label}</span>
      {detail ? <small title={formatMoment(row.lastSeenAt, PHASE_A_TIME_ZONE)}>{detail}</small> : null}
    </div>
  );
}

function TeamLogin({ login }) {
  if (!login.known) return <span className="ov-team-muted">Hidden</span>;
  if (!login.at) return <span className="ov-team-muted">Never signed in</span>;
  return (
    <div className="ov-team-when">
      <time dateTime={new Date(login.at).toISOString()} title={formatMoment(login.at, PHASE_A_TIME_ZONE)}>
        {relativeTime(login.at, PHASE_A_TIME_ZONE)}
      </time>
      <small>{formatStamp(login.at, PHASE_A_TIME_ZONE)}</small>
    </div>
  );
}

function TeamUpdate({ update }) {
  if (!update.known) return <span className="ov-team-muted">Hidden</span>;
  const event = update.event;
  if (!event) {
    return (
      <span className="ov-team-muted">
        {update.complete ? 'No changes recorded' : `None in the latest ${TEAM_FETCH_LIMIT} changes`}
      </span>
    );
  }
  const Icon = ACTIVITY_ICONS[activityVisual(event).kind] || FiEdit3;
  const subject = updateSubject(event);
  return (
    <div className="ov-team-update">
      <span className="ov-event-ico is-accent" aria-hidden="true"><Icon size={13} strokeWidth={2} /></span>
      <div>
        <p>{activityLabel(event)}{subject ? <span> · {subject}</span> : null}</p>
        <small>
          <time dateTime={event.createdAt} title={formatMoment(event.createdAt, PHASE_A_TIME_ZONE)}>
            {relativeTime(event.createdAt, PHASE_A_TIME_ZONE)}
          </time>
        </small>
      </div>
    </div>
  );
}

function TeamActivityPanel({ directory, users, updates, onRetry }) {
  const [filter, setFilter] = useState('all');
  const [expanded, setExpanded] = useState(false);
  const loading = directory.loading && !directory.data;
  const rows = directory.data
    ? teamRows({
      directory: directory.data,
      users: users.data,
      updates: updates.data,
    })
    : [];
  const totals = teamTotals(rows, PHASE_A_TIME_ZONE);
  const shown = teamFilter(rows, filter);
  const visible = expanded ? shown : shown.slice(0, TEAM_VISIBLE_ROWS);
  const total = Number(directory.data?.total) || rows.length;
  const pending = users.loading || updates.loading;

  return (
    <section className="ov-panel ov-team" aria-labelledby="ov-team-title" aria-busy={directory.loading || pending}>
      <header className="ov-panel-head">
        <div>
          <h3 id="ov-team-title">Recent activity</h3>
          <p>Who is online, when each person last signed in, and the last change they made.</p>
        </div>
        <div className="ov-team-links">
          <Link className="ov-link" to={`${WORKSPACE_HOME}/activity`}>
            Full activity log <FiArrowRight size={13} aria-hidden="true" />
          </Link>
          <Link className="ov-btn is-primary" to={`${WORKSPACE_HOME}/users`}>
            Manage users <FiArrowRight size={14} aria-hidden="true" />
          </Link>
        </div>
      </header>

      {directory.notice ? <Notice tone={directory.notice.tone} onRetry={onRetry}>{directory.notice.message}</Notice> : null}

      {loading ? (
        <div className="ov-feed-skeleton" aria-hidden="true">
          <div className="ov-bone h-strip" />
          {[0, 1, 2, 3, 4].map((key) => <div key={key} className="ov-bone h-row" />)}
        </div>
      ) : null}

      {directory.data ? (
        <>
          <dl className="ov-team-strip">
            <div className="is-online">
              <dt><span className="ov-dot" aria-hidden="true" />Online now</dt>
              <dd>{formatCount(totals.online)}</dd>
            </div>
            <div>
              <dt>Idle</dt>
              <dd>{formatCount(totals.idle)}</dd>
            </div>
            <div>
              <dt>Signed in today</dt>
              <dd>{totals.signedInToday == null ? (pending ? '…' : 'Hidden') : formatCount(totals.signedInToday)}</dd>
            </div>
            <div>
              <dt>Made changes today</dt>
              <dd>{totals.updatedToday == null ? (pending ? '…' : 'Hidden') : formatCount(totals.updatedToday)}</dd>
            </div>
          </dl>

          <div className="ov-seg is-small ov-team-filter" role="group" aria-label="Show team members">
            {TEAM_FILTERS.map((item) => (
              <button
                key={item.id}
                type="button"
                aria-pressed={filter === item.id}
                className={filter === item.id ? 'is-on' : ''}
                onClick={() => { setFilter(item.id); setExpanded(false); }}
              >
                {item.label}
                <span className="ov-seg-count">{formatCount(totals[item.id])}</span>
              </button>
            ))}
          </div>

          {visible.length ? (
            <div className="ov-table-wrap">
              <table className="ov-table ov-team-table">
                <thead>
                  <tr>
                    <th scope="col">Team member</th>
                    <th scope="col">Status</th>
                    <th scope="col">Last sign-in</th>
                    <th scope="col">Last change</th>
                    <th scope="col" className="is-num">Consultancies</th>
                  </tr>
                </thead>
                <tbody>
                  {visible.map((row) => (
                    <tr key={row.id} className={`is-${row.state}`}>
                      <th scope="row">
                        <div className="ov-person">
                          <span className={`ov-avatar is-${row.state}`} aria-hidden="true">{row.initials}</span>
                          <span className="ov-person-copy">
                            <span className="ov-person-name">{row.name}</span>
                            <small>{row.role || row.email}</small>
                          </span>
                        </div>
                      </th>
                      <td data-label="Status"><TeamStatus row={row} /></td>
                      <td data-label="Last sign-in"><TeamLogin login={row.lastLogin} /></td>
                      <td data-label="Last change"><TeamUpdate update={row.lastUpdate} /></td>
                      <td data-label="Consultancies" className="is-num">{formatCount(row.assignments)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="ov-empty is-compact">
              <span className="ov-empty-ico" aria-hidden="true"><FiInbox size={18} /></span>
              <p className="ov-empty-title">
                {rows.length ? 'Nobody matches this filter' : 'No CRM team members yet'}
              </p>
              {rows.length ? (
                <button type="button" className="ov-btn is-quiet" onClick={() => setFilter('all')}>Show everyone</button>
              ) : null}
            </div>
          )}

          <div className="ov-team-foot">
            {shown.length > TEAM_VISIBLE_ROWS ? (
              <button type="button" className="ov-btn is-quiet" onClick={() => setExpanded((value) => !value)} aria-expanded={expanded}>
                {expanded ? 'Show fewer' : `Show all ${formatCount(shown.length)}`}
              </button>
            ) : null}
            <p>
              Sorted by who is online, then most recent activity.
              {total > rows.length ? ` Showing the first ${formatCount(rows.length)} of ${formatCount(total)} accounts by name.` : ''}
              {users.notice ? ' Sign-in times are hidden for this account.' : ''}
              {updates.notice ? ' Changes are hidden for this account.' : ''}
            </p>
          </div>
        </>
      ) : null}
    </section>
  );
}

export default function OverviewPage() {
  const { user } = useCrmSession();
  const decision = workspaceRouteDecision(user, 'overview');
  const timeZone = PHASE_A_TIME_ZONE;
  const [applied, setApplied] = useState({ period: '30', from: '', to: '' });
  const [customOpen, setCustomOpen] = useState(false);
  const [draft, setDraft] = useState({ from: '', to: '' });
  const [draftError, setDraftError] = useState('');
  const [refresh, setRefresh] = useState(0);
  const [now] = useState(() => new Date());
  const allowed = decision.state === 'allowed';

  const built = overviewOperationsQuery({ ...applied, timeZone });
  const operations = useCrmResource(
    allowed && !built.error,
    `operations:${JSON.stringify(built.query || {})}:${refresh}`,
    () => getPortalOperations(built.query),
    false,
    { keepData: true }
  );
  const team = teamQueries();
  const directory = useCrmResource(
    allowed,
    `team-directory:${refresh}`,
    () => fetchPortalDirectory(team.directory),
    false,
    { keepData: true }
  );
  const teamUsers = useCrmResource(
    allowed,
    `team-users:${refresh}`,
    () => fetchPortalUsers(team.users),
    false,
    { keepData: true }
  );
  const teamUpdates = useCrmResource(
    allowed,
    `team-updates:${refresh}`,
    () => listPortalActivity(team.updates),
    false,
    { keepData: true }
  );

  if (!allowed) return <AccessNote>{decision.message}</AccessNote>;

  const data = operations.data;
  const current = data?.current;
  const label = periodName(applied.period, data?.range);
  const phrase = periodPhrase(applied.period, data?.range);
  const volumeRows = volumeChartRows(data?.period?.volume);
  const volume = volumeStats(volumeRows);
  const grain = data?.period?.volume?.grain === 'month' ? 'month' : 'day';
  const bars = admissionBars(current?.admissionStatus);
  const refreshing = operations.loading || directory.loading || teamUsers.loading || teamUpdates.loading;
  const updatedAt = data?.generatedAt ? formatClock(data.generatedAt, timeZone) : null;
  const students = current?.students;
  const greetName = greetingName(user?.fullName);
  const todayLabel = new Intl.DateTimeFormat('en-IN', { timeZone, weekday: 'long', day: 'numeric', month: 'long' }).format(now);
  const consultancies = current?.consultancies;

  function selectPeriod(id) {
    if (id === 'custom') {
      setCustomOpen(true);
      setDraftError('');
      return;
    }
    setCustomOpen(false);
    setApplied({ period: id, from: '', to: '' });
  }

  function applyCustom() {
    const check = analyticsParams({ period: 'custom', from: draft.from, to: draft.to, timeZone });
    if (check.error) {
      setDraftError(check.error);
      return;
    }
    setDraftError('');
    setCustomOpen(false);
    setApplied({ period: 'custom', from: draft.from, to: draft.to });
  }

  return (
    <div className="gx-admin-page ov" aria-busy={refreshing}>
      <header className="ov-head">
        <div className="ov-head-copy">
          <h1 className="ov-greeting">{dayGreeting(now)}, {greetName}</h1>
          <p className="ov-lede" aria-live="polite">
            {todayLabel}
            <span aria-hidden="true"> · </span>
            {refreshing ? 'Updating…' : updatedAt ? `Updated ${updatedAt}` : 'Here’s what’s happening across the CRM.'}
          </p>
        </div>
        <div className="ov-controls">
          <PeriodPicker selected={customOpen ? 'custom' : applied.period} onSelect={selectPeriod} />
          <button
            type="button"
            className={`ov-btn is-icon${refreshing ? ' is-spinning' : ''}`}
            onClick={() => setRefresh((value) => value + 1)}
            aria-label={refreshing ? 'Refreshing overview' : 'Refresh overview'}
            title="Refresh"
          >
            <FiRefreshCw size={15} aria-hidden="true" />
          </button>
        </div>
      </header>

      {customOpen ? (
        <CustomRange
          draft={draft}
          error={draftError}
          max={todayKey(timeZone)}
          onChange={(patch) => setDraft((value) => ({ ...value, ...patch }))}
          onApply={applyCustom}
          onCancel={() => { setCustomOpen(false); setDraftError(''); }}
        />
      ) : null}

      {built.error ? <Notice tone="warning">{built.error}</Notice> : null}
      {operations.notice ? (
        <Notice tone={operations.notice.tone} onRetry={() => setRefresh((value) => value + 1)}>{operations.notice.message}</Notice>
      ) : null}
      {operations.loading && !data ? (
        <>
          <p className="sr-only" role="status">Loading overview…</p>
          <OverviewSkeleton />
        </>
      ) : null}

      {current ? (
        <div className={`ov-body${operations.loading ? ' is-stale' : ''}`}>
          <section className="ov-primary" aria-label="Key totals">
            <Kpi
              icon={FiBriefcase}
              label="Consultancies"
              value={consultancies?.total}
              whenNull={HIDDEN_METRIC}
              hint={consultancies?.active == null ? '' : `${formatCount(consultancies.active)} active · ${formatCount(consultancies.inactive)} inactive`}
            >
              {Number(data.consultancies?.unassigned) > 0 ? (
                <Link className="ov-flag" to={`${WORKSPACE_HOME}/consultancies`}>
                  <FiAlertTriangle size={12} aria-hidden="true" />
                  {formatCount(data.consultancies.unassigned)} without an assigned user
                </Link>
              ) : null}
            </Kpi>
            <Kpi
              icon={FiUsers}
              label="Students"
              value={students?.total}
              whenNull={HIDDEN_METRIC}
              hint={`${formatCount(students?.withCurrentReferral ?? 0)} referred${students?.withoutReferral == null ? '' : ` · ${formatCount(students.withoutReferral)} not referred`}`}
            />
            <Kpi
              icon={FiFileText}
              label="Referrals on file"
              value={current.referrals?.total}
              whenNull={HIDDEN_METRIC}
              hint="Each student is counted once"
            />
            <Kpi
              icon={FiTrendingUp}
              label="New referrals"
              scope="period"
              scopeLabel={label}
              value={data.period?.newReferrals}
              whenNull={HIDDEN_METRIC}
              hint={`Added in ${phrase}`}
              aside={<Sparkline rows={volume.empty ? [] : volumeRows} />}
            >
              <Comparison current={data.period?.newReferrals} previous={data.period?.previousNewReferrals} />
            </Kpi>
          </section>

          <div className="ov-analytics">
            <section className="ov-panel ov-trend" aria-labelledby="ov-trend-title">
              <header className="ov-panel-head">
                <div>
                  <h3 id="ov-trend-title">Referral trend</h3>
                  <p>New referrals per {grain}, {phrase}.</p>
                </div>
                <ScopeTag scope="period">{label}</ScopeTag>
              </header>
              <dl className="ov-figures">
                <div>
                  <dt>Total</dt>
                  <dd>{formatCount(volume.total)}</dd>
                </div>
                <div>
                  <dt>Busiest {grain === 'month' ? 'month' : 'day'}</dt>
                  <dd>{volume.peak ? <>{volume.peak.label} <em>· {formatCount(volume.peak.count)}</em></> : '—'}</dd>
                </div>
              </dl>
              {volumeRows.length ? (
                <div className="ov-chart-shell">
                  <ReferralTrendChart rows={volumeRows} grain={grain} label={`Referral trend, ${label}: ${volume.total} referrals`} />
                  {volume.empty ? <p className="ov-chart-empty">No referrals were recorded in this period.</p> : null}
                </div>
              ) : (
                <div className="ov-empty is-compact">
                  <span className="ov-empty-ico" aria-hidden="true"><FiTrendingUp size={18} /></span>
                  <p className="ov-empty-title">No points to chart for this selection</p>
                </div>
              )}
            </section>

            <section className="ov-panel ov-admission" aria-labelledby="ov-admission-title">
              <header className="ov-panel-head">
                <div>
                  <h3 id="ov-admission-title">Admission pipeline</h3>
                  <p>Where every student stands today.</p>
                </div>
              </header>
              {bars.rows.length ? (
                <>
                  <AdmissionPipeline bars={bars} />
                  <p className="ov-panel-foot">{formatCount(bars.total)} students in total</p>
                </>
              ) : (
                <div className="ov-empty is-compact">
                  <span className="ov-empty-ico" aria-hidden="true"><FiUsers size={18} /></span>
                  <p className="ov-empty-title">No admission statuses to show</p>
                </div>
              )}
            </section>
          </div>
        </div>
      ) : null}

      <TeamActivityPanel
        directory={directory}
        users={teamUsers}
        updates={teamUpdates}
        onRetry={() => setRefresh((value) => value + 1)}
      />

      <footer className="ov-notes">
        <p>Times are shown in India Standard Time. Idle means signed in with no activity for over 2 minutes.</p>
      </footer>
    </div>
  );
}

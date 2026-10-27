import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  FiActivity,
  FiAlertCircle,
  FiBriefcase,
  FiClock,
  FiFlag,
  FiInbox,
  FiLogIn,
  FiRefreshCw,
  FiUsers,
  FiZap,
} from 'react-icons/fi';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useDebouncedValue } from '../../../../hooks/useDebouncedValue';
import { getPortalDayEndReport, getPortalStaff360 } from '../../../../utils/crmSessionApi';
import {
  PHASE_A_TIME_ZONE,
  WORKSPACE_HOME,
  dayEndAccuracy,
  dayEndQuery,
  dayEndScheduleNote,
  intelligenceEmptyMessage,
  presenceBadge,
} from '../../../../utils/crmWorkspace';
import {
  STAFF360_TABS,
  PRESENCE_MEANINGS,
  admissionChartRows,
  businessChartRows,
  formatActionLabel,
  formatCompactTime,
  formatDuration,
  staff360EmptyMessage,
  staff360FocusDate,
  staff360FollowUpIntel,
  staff360HeaderCards,
  staff360Query,
} from '../../../../utils/crmStaff360';
import { formatMoment, relativeTime } from '../../../../utils/crmOverview';
import { chartPalette } from '../../../crm-demo/crmTheme';
import { useCrmResource } from './useCrmResource';
import { Avatar, Notice } from './consultancyUi';
import { useAdminTheme } from './adminThemeContext';

const METRIC_ICONS = {
  'log-in': FiLogIn,
  clock: FiClock,
  activity: FiActivity,
  briefcase: FiBriefcase,
  users: FiUsers,
  flag: FiFlag,
  alert: FiAlertCircle,
  zap: FiZap,
};

const SCOPE_LABEL = {
  current: 'Current snapshot',
  period: 'Selected period',
  day: 'Selected day',
};

function PresencePill({ state }) {
  const badge = presenceBadge(state);
  const meaning = PRESENCE_MEANINGS[state] || PRESENCE_MEANINGS.offline;
  return (
    <span className={`act-pill is-${badge.tone}`} title={meaning}>
      <span className="s360-dot" aria-hidden="true" />
      {badge.label}
    </span>
  );
}

function StatusPill({ status }) {
  const label = String(status || '—');
  const tone = label.toLowerCase() === 'active'
    ? 'ok'
    : label.toLowerCase() === 'invited'
      ? 'info'
      : label.toLowerCase() === 'inactive'
        ? 'muted'
        : 'neutral';
  return <span className={`act-pill is-${tone} s360-status-pill`}>{label}</span>;
}

function MetricCard({ card, onActivate }) {
  let display = card.empty || '—';
  let title = card.hint || undefined;
  if (card.kind === 'datetime') {
    display = card.value ? formatCompactTime(card.value, PHASE_A_TIME_ZONE) : '—';
    title = [
      card.value ? formatMoment(card.value, PHASE_A_TIME_ZONE) : null,
      card.hint,
    ].filter(Boolean).join(' — ') || undefined;
  } else if (card.kind === 'number') {
    display = card.value == null ? '—' : Number(card.value).toLocaleString();
  } else if (card.value != null && card.value !== '') {
    display = card.value;
  }
  const Icon = METRIC_ICONS[card.icon] || FiActivity;
  const scope = SCOPE_LABEL[card.scope] || null;
  const clickable = Boolean(card.tab && onActivate);
  const className = `s360-metric${clickable ? ' is-action' : ''}${card.id === 'overdue-followups' && card.value > 0 ? ' is-warn' : ''}`;
  const body = (
    <>
      <span className="s360-metric-top">
        <span className="s360-metric-icon" aria-hidden="true">
          <Icon size={14} />
        </span>
        <span className="s360-metric-copy">
          <span className="s360-metric-label">{card.label}</span>
          {scope ? <span className="s360-metric-scope">{scope}</span> : null}
        </span>
      </span>
      <strong className="s360-metric-value">{display}</strong>
      {card.hint && card.kind === 'text' ? (
        <span className="s360-metric-sub">Observed elapsed · not working hours</span>
      ) : null}
    </>
  );
  if (clickable) {
    return (
      <button type="button" className={className} title={title} onClick={() => onActivate(card.tab)}>
        {body}
      </button>
    );
  }
  return (
    <article className={className} title={title}>
      {body}
    </article>
  );
}

function EmptyBlock({ title, detail, compact = false, icon = FiInbox }) {
  const EmptyIcon = icon;
  return (
    <div className={`s360-empty${compact ? ' is-compact' : ''}`}>
      <EmptyIcon size={compact ? 18 : 22} aria-hidden="true" className="s360-empty-icon" />
      <p className="s360-empty-title">{title}</p>
      {detail ? <p className="s360-empty-detail">{detail}</p> : null}
    </div>
  );
}

function SectionHead({ title, meta, action }) {
  return (
    <header className="s360-section-head">
      <div className="s360-section-titles">
        <h3>{title}</h3>
        {meta ? <span className="s360-section-meta">{meta}</span> : null}
      </div>
      {action || null}
    </header>
  );
}

function formatCount(value) {
  if (value == null) return '—';
  return Number(value).toLocaleString();
}

export default function Staff360Detail({
  staffId,
  profileHint,
  onClear,
  timeline,
  rangeFrom,
  rangeTo,
}) {
  const theme = useAdminTheme();
  const palette = chartPalette(theme);
  const brand = theme === 'dark' ? '#d6ff4a' : '#c6f000';
  const securityStroke = theme === 'dark' ? '#9aa3b2' : '#8a867f';
  const [tab, setTab] = useState('overview');
  const [studentQ, setStudentQ] = useState('');
  const debouncedStudentQ = useDebouncedValue(studentQ, 300);
  const [admissionStatus, setAdmissionStatus] = useState('');
  const [followUpState, setFollowUpState] = useState('');
  const [consultancyPage, setConsultancyPage] = useState(1);
  const [studentPage, setStudentPage] = useState(1);
  const [dayEndPage, setDayEndPage] = useState(1);
  const [refreshNonce, setRefreshNonce] = useState(0);
  const [consultancyQ, setConsultancyQ] = useState('');

  const today = useMemo(() => {
    try {
      return new Intl.DateTimeFormat('en-CA', { timeZone: PHASE_A_TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
    } catch {
      return new Date().toISOString().slice(0, 10);
    }
  }, []);

  const focusDate = staff360FocusDate({ from: rangeFrom, to: rangeTo, fallback: today });

  const query = useMemo(
    () => staff360Query({
      date: focusDate,
      from: rangeFrom || focusDate,
      to: rangeTo || focusDate,
      timeZone: PHASE_A_TIME_ZONE,
      consultancyPage,
      consultancyLimit: 8,
      studentPage,
      studentLimit: 8,
      studentQ: debouncedStudentQ,
      admissionStatus,
      followUpState,
    }),
    [focusDate, rangeFrom, rangeTo, consultancyPage, studentPage, debouncedStudentQ, admissionStatus, followUpState]
  );

  const queryKey = staffId ? `${staffId}:${JSON.stringify(query)}:${refreshNonce}` : 'none';
  const resource = useCrmResource(
    Boolean(staffId),
    queryKey,
    () => getPortalStaff360(staffId, query),
    false,
    { keepData: true }
  );

  const dayBuilt = useMemo(
    () => dayEndQuery({
      date: focusDate,
      timeZone: PHASE_A_TIME_ZONE,
      actorId: staffId,
      userId: staffId,
      page: dayEndPage,
      limit: 20,
    }),
    [focusDate, staffId, dayEndPage]
  );

  const dayEnd = useCrmResource(
    Boolean(staffId && tab === 'day-end' && !dayBuilt.error),
    `s360-day-end:${staffId}:${dayBuilt.error || JSON.stringify(dayBuilt.query)}:${refreshNonce}`,
    () => getPortalDayEndReport(dayBuilt.query),
    false,
    { keepData: true }
  );

  const data = resource.data;
  const cards = staff360HeaderCards(data);
  const admissionRows = admissionChartRows(data?.admissionDistribution);
  const businessRows = businessChartRows(data?.businessByAction);
  const presence = data?.profile?.presence || profileHint?.presence?.state || 'offline';
  const roleLabel = data?.profile?.roleLabel || profileHint?.roleLabel || profileHint?.role || '—';
  const statusLabel = data?.profile?.status || profileHint?.status || '—';
  const fu = staff360FollowUpIntel(data);
  const recent = data?.recentBusiness || [];
  const consultancyItems = data?.consultancies?.items || [];
  const consultancyNeedle = consultancyQ.trim().toLowerCase();
  const filteredConsultancies = consultancyNeedle
    ? consultancyItems.filter((row) => `${row.name || ''} ${row.status || ''}`.toLowerCase().includes(consultancyNeedle))
    : consultancyItems;
  const overviewConsultancies = consultancyItems.slice(0, 4);
  const businessTotal = data?.summary?.businessEvents;
  const tzConfirmed = data?.timeZoneConfirmed === true;

  function goTab(next) {
    setTab(next);
  }

  function refresh() {
    setRefreshNonce((value) => value + 1);
  }

  return (
    <section className="s360" aria-labelledby="s360-title">
      <header className="s360-head">
        <div className="s360-identity">
          <Avatar name={data?.profile?.fullName || profileHint?.fullName || 'Staff'} size="md" />
          <div className="s360-identity-copy">
            <div className="s360-title-row">
              <h2 id="s360-title" className="s360-title">
                {data?.profile?.fullName || profileHint?.fullName || 'Staff 360°'}
              </h2>
              <span className="act-pill s360-role-pill">{roleLabel}</span>
              <PresencePill state={presence} />
              <StatusPill status={statusLabel} />
            </div>
            <p className="s360-sub">
              <span className="s360-email" title={data?.profile?.email || profileHint?.email || undefined}>
                {data?.profile?.email || profileHint?.email || '—'}
              </span>
              <span className="s360-sep" aria-hidden="true" />
              <span title={PRESENCE_MEANINGS[presence] || PRESENCE_MEANINGS.offline}>
                Seen {data?.profile?.lastSeenAt ? relativeTime(data.profile.lastSeenAt, PHASE_A_TIME_ZONE) : '—'}
              </span>
            </p>
          </div>
        </div>
        <div className="s360-head-actions">
          <span className="s360-daychip" title={tzConfirmed ? 'Timezone confirmed' : 'Timezone pending business-owner confirmation'}>
            <strong>{data?.day?.date || focusDate}</strong>
            <span>{PHASE_A_TIME_ZONE}{tzConfirmed ? '' : ' · unconfirmed'}</span>
          </span>
          <button
            type="button"
            className={`act-btn is-small is-quiet${resource.loading ? ' is-spinning' : ''}`}
            onClick={refresh}
            disabled={resource.loading}
            aria-label="Refresh staff detail"
          >
            <FiRefreshCw size={14} aria-hidden="true" />
            Refresh
          </button>
          <button type="button" className="act-btn is-small is-quiet" onClick={onClear}>
            Clear selection
          </button>
        </div>
      </header>

      {resource.loading && !data ? (
        <div aria-busy="true" className="s360-grid">
          {Array.from({ length: 8 }, (_, index) => <div key={index} className="act-bone h-row" />)}
        </div>
      ) : null}
      {resource.notice ? <Notice tone={resource.notice.tone}>{resource.notice.message}</Notice> : null}

      {data ? (
        <div className="s360-grid">
          {cards.map((card) => (
            <MetricCard key={card.id} card={card} onActivate={goTab} />
          ))}
        </div>
      ) : null}

      <div className="s360-tabs" role="tablist" aria-label="Staff 360 sections">
        {STAFF360_TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            id={`s360-tab-${item.id}`}
            aria-selected={tab === item.id}
            aria-controls={`s360-panel-${item.id}`}
            tabIndex={tab === item.id ? 0 : -1}
            className={`s360-tab${tab === item.id ? ' is-active' : ''}`}
            onClick={() => setTab(item.id)}
            onKeyDown={(event) => {
              const index = STAFF360_TABS.findIndex((row) => row.id === item.id);
              if (event.key === 'ArrowRight') {
                event.preventDefault();
                const next = STAFF360_TABS[(index + 1) % STAFF360_TABS.length];
                setTab(next.id);
                document.getElementById(`s360-tab-${next.id}`)?.focus();
              } else if (event.key === 'ArrowLeft') {
                event.preventDefault();
                const prev = STAFF360_TABS[(index - 1 + STAFF360_TABS.length) % STAFF360_TABS.length];
                setTab(prev.id);
                document.getElementById(`s360-tab-${prev.id}`)?.focus();
              } else if (event.key === 'Home') {
                event.preventDefault();
                setTab(STAFF360_TABS[0].id);
                document.getElementById(`s360-tab-${STAFF360_TABS[0].id}`)?.focus();
              } else if (event.key === 'End') {
                event.preventDefault();
                const last = STAFF360_TABS[STAFF360_TABS.length - 1];
                setTab(last.id);
                document.getElementById(`s360-tab-${last.id}`)?.focus();
              }
            }}
          >
            {item.label}
          </button>
        ))}
      </div>

      {tab === 'overview' && data ? (
        <div className="s360-panel" id="s360-panel-overview" role="tabpanel" aria-labelledby="s360-tab-overview">
          <div className="s360-overview">
            <article className="s360-card">
              <SectionHead
                title="Admission status"
                meta="Current snapshot"
                action={(
                  <button type="button" className="s360-text-btn" onClick={() => setTab('students')}>
                    Students
                  </button>
                )}
              />
              {admissionRows.length ? (
                <>
                  <div className="s360-chart-frame is-compact">
                    <ResponsiveContainer width="100%" height={160}>
                      <BarChart data={admissionRows} margin={{ top: 4, right: 4, left: 0, bottom: 28 }}>
                        <CartesianGrid stroke={palette.grid} vertical={false} />
                        <XAxis dataKey="status" tick={{ fill: palette.tick, fontSize: 10 }} interval={0} angle={-20} textAnchor="end" height={44} />
                        <YAxis allowDecimals={false} tick={{ fill: palette.tick, fontSize: 11 }} width={28} />
                        <Tooltip />
                        <Bar dataKey="count" fill={brand} radius={[3, 3, 0, 0]} name="Students" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <ul className="s360-chip-counts" aria-label="Admission status counts">
                    {admissionRows.map((row) => (
                      <li key={row.status}>
                        <span>{row.status}</span>
                        <strong>{row.count}</strong>
                      </li>
                    ))}
                  </ul>
                </>
              ) : (
                <EmptyBlock
                  compact
                  icon={FiUsers}
                  title={staff360EmptyMessage('overview')}
                  detail="Students appear when their current referral consultancy is among this staff member’s active assignments."
                />
              )}
            </article>

            <article className="s360-card">
              <SectionHead
                title="Business activity"
                meta="Selected period"
                action={(
                  <button type="button" className="s360-text-btn" onClick={() => setTab('timeline')}>
                    Timeline
                  </button>
                )}
              />
              {businessRows.length ? (
                <>
                  <p className="s360-card-stat">
                    <strong>{formatCount(businessTotal)}</strong>
                    <span>recorded events · not a productivity score</span>
                  </p>
                  <div className="s360-chart-frame is-compact">
                    <ResponsiveContainer width="100%" height={140}>
                      <BarChart data={businessRows} margin={{ top: 4, right: 4, left: 0, bottom: 28 }}>
                        <CartesianGrid stroke={palette.grid} vertical={false} />
                        <XAxis dataKey="action" tick={{ fill: palette.tick, fontSize: 10 }} interval={0} angle={-20} textAnchor="end" height={44} />
                        <YAxis allowDecimals={false} tick={{ fill: palette.tick, fontSize: 11 }} width={28} />
                        <Tooltip />
                        <Bar dataKey="count" fill={securityStroke} radius={[3, 3, 0, 0]} name="Events" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </>
              ) : (
                <EmptyBlock
                  compact
                  icon={FiZap}
                  title={staff360EmptyMessage('business')}
                  detail="Attributed CrmAuditLog actions for this staff member in the selected range."
                />
              )}
            </article>

            <article className="s360-card">
              <SectionHead
                title="Follow-up intelligence"
                meta="Current snapshot"
                action={(
                  <button
                    type="button"
                    className="s360-text-btn"
                    onClick={() => { setFollowUpState(''); setStudentPage(1); setTab('students'); }}
                  >
                    Review students
                  </button>
                )}
              />
              <div className="s360-fu-grid">
                <div className="s360-fu-tile">
                  <span>Open</span>
                  <strong>{formatCount(fu.open)}</strong>
                </div>
                <div className={`s360-fu-tile${fu.overdue > 0 ? ' is-warn' : ''}`}>
                  <span>Overdue</span>
                  <strong>{formatCount(fu.overdue)}</strong>
                </div>
                <div className="s360-fu-tile">
                  <span>Due today</span>
                  <strong>{formatCount(fu.dueToday)}</strong>
                </div>
                <div className="s360-fu-tile">
                  <span>Upcoming</span>
                  <strong>{formatCount(fu.upcoming)}</strong>
                </div>
                <div className="s360-fu-tile is-muted" title="Completed-in-period is not returned by this endpoint">
                  <span>Completed (period)</span>
                  <strong>Unavailable</strong>
                </div>
              </div>
              <p className="s360-card-foot">
                Shared across all current assignees on {formatCount(fu.houses)} consultanc{fu.houses === 1 ? 'y' : 'ies'}.
                {' '}
                <Link className="s360-inline-link" to={`${WORKSPACE_HOME}/consultancies`}>Open consultancies workspace</Link>
              </p>
            </article>

            <article className="s360-card">
              <SectionHead
                title="Consultancy assignments"
                meta="Active assignments"
                action={consultancyItems.length > 4 ? (
                  <button type="button" className="s360-text-btn" onClick={() => setTab('consultancies')}>
                    View all consultancies
                  </button>
                ) : (
                  <button type="button" className="s360-text-btn" onClick={() => setTab('consultancies')}>
                    View all
                  </button>
                )}
              />
              {overviewConsultancies.length ? (
                <ul className="s360-assign-list">
                  {overviewConsultancies.map((row) => (
                    <li key={row.id}>
                      <div className="s360-assign-main">
                        <strong>{row.name || 'Untitled'}</strong>
                        <span className="s360-assign-meta">
                          <span className={`act-pill is-${String(row.status).toLowerCase() === 'active' ? 'ok' : 'muted'}`}>
                            {row.status || '—'}
                          </span>
                          <span>{row.students} student{row.students === 1 ? '' : 's'}</span>
                          {(row.openFollowUps > 0 || row.overdueFollowUps > 0) ? (
                            <span>
                              {row.openFollowUps} open
                              {row.overdueFollowUps > 0 ? ` · ${row.overdueFollowUps} overdue` : ''}
                            </span>
                          ) : null}
                        </span>
                      </div>
                      <div className="s360-assign-side">
                        <time className="s360-muted" dateTime={row.assignedAt || undefined}>
                          {row.assignedAt ? formatMoment(row.assignedAt, PHASE_A_TIME_ZONE) : '—'}
                        </time>
                        <Link className="s360-text-btn" to={`${WORKSPACE_HOME}/consultancies`}>
                          Open
                        </Link>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <EmptyBlock compact icon={FiBriefcase} title={staff360EmptyMessage('consultancies')} />
              )}
            </article>

            <article className="s360-card s360-card-wide">
              <SectionHead
                title="Recent activity"
                meta="Selected period"
                action={(
                  <button type="button" className="s360-text-btn" onClick={() => setTab('timeline')}>
                    View full timeline
                  </button>
                )}
              />
              {recent.length ? (
                <ul className="s360-recent-list">
                  {recent.slice(0, 6).map((row) => (
                    <li key={row.id}>
                      <div>
                        <strong>{formatActionLabel(row.action)}</strong>
                        <span className="s360-muted">
                          {row.entityType || 'record'}
                          {row.entityId ? ` · …${String(row.entityId).slice(-6)}` : ''}
                        </span>
                      </div>
                      <time className="s360-muted" dateTime={row.createdAt}>
                        {row.createdAt ? relativeTime(row.createdAt, PHASE_A_TIME_ZONE) : '—'}
                      </time>
                    </li>
                  ))}
                </ul>
              ) : (
                <EmptyBlock compact title={staff360EmptyMessage('recent')} />
              )}
            </article>
          </div>

          {(fu.overdue > 0 || data.limitations?.length) ? (
            <div className="s360-attention">
              {fu.overdue > 0 ? (
                <p>
                  <strong>{fu.overdue}</strong> overdue follow-up{fu.overdue === 1 ? '' : 's'} on assigned consultancies.
                  {' '}
                  <button
                    type="button"
                    className="s360-text-btn"
                    onClick={() => { setFollowUpState('overdue'); setStudentPage(1); setTab('students'); }}
                  >
                    Review students
                  </button>
                </p>
              ) : null}
              {data.limitations?.length ? (
                <details className="s360-limits">
                  <summary>Definitions &amp; limitations</summary>
                  <ul>
                    {data.limitations.map((line) => <li key={line}>{line}</li>)}
                  </ul>
                </details>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}

      {tab === 'consultancies' && data ? (
        <div className="s360-panel" id="s360-panel-consultancies" role="tabpanel" aria-labelledby="s360-tab-consultancies">
          <p className="s360-panel-note">
            Current active assignments only. Revoked history is not listed here. Shared follow-ups are counted for every current assignee.
          </p>
          <div className="s360-filters s360-filters-1">
            <label className="act-field">
              <span className="act-label">Search consultancies</span>
              <input
                className="act-input"
                value={consultancyQ}
                onChange={(event) => setConsultancyQ(event.target.value)}
                placeholder="Name or status"
              />
            </label>
          </div>
          {filteredConsultancies.length ? (
            <div className="s360-table-wrap act-ios-scroll">
              <table className="s360-table">
                <thead>
                  <tr>
                    <th scope="col">Consultancy</th>
                    <th scope="col">Assignment</th>
                    <th scope="col">Assigned</th>
                    <th scope="col">Students</th>
                    <th scope="col">Open / overdue</th>
                    <th scope="col">Upcoming</th>
                    <th scope="col"><span className="act-sr-only">Actions</span></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredConsultancies.map((row) => (
                    <tr key={row.id}>
                      <td>
                        <strong>{row.name || 'Untitled'}</strong>
                        <span className="s360-muted">{row.status || '—'}</span>
                      </td>
                      <td>
                        <span className="act-pill is-ok">Active</span>
                      </td>
                      <td>{row.assignedAt ? formatMoment(row.assignedAt, PHASE_A_TIME_ZONE) : '—'}</td>
                      <td>{row.students}</td>
                      <td>
                        {row.openFollowUps}
                        {' / '}
                        <span className={row.overdueFollowUps > 0 ? 's360-warn-text' : undefined}>{row.overdueFollowUps}</span>
                      </td>
                      <td>{row.upcomingFollowUps}</td>
                      <td>
                        <Link className="s360-text-btn" to={`${WORKSPACE_HOME}/consultancies`}>Open</Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyBlock compact icon={FiBriefcase} title={staff360EmptyMessage('consultancies')} detail="Only current active assignments are listed." />
          )}
          {data.consultancies.total > data.consultancies.limit ? (
            <div className="s360-pager">
              <button type="button" className="act-btn is-small" disabled={consultancyPage <= 1} onClick={() => setConsultancyPage((page) => page - 1)}>Previous</button>
              <span>Page {data.consultancies.page} · {data.consultancies.total} total</span>
              <button
                type="button"
                className="act-btn is-small"
                disabled={consultancyPage * data.consultancies.limit >= data.consultancies.total}
                onClick={() => setConsultancyPage((page) => page + 1)}
              >
                Next
              </button>
            </div>
          ) : null}
          <Link className="s360-inline-link" to={`${WORKSPACE_HOME}/consultancies`}>Manage assignments in Consultancies</Link>
        </div>
      ) : null}

      {tab === 'students' && data ? (
        <div className="s360-panel" id="s360-panel-students" role="tabpanel" aria-labelledby="s360-tab-students">
          <p className="s360-panel-note">
            Cohort = students whose <em>current</em> referral consultancy is among this staff member’s active assignments. Creating a student does not imply ownership.
          </p>
          <div className="s360-filters">
            <label className="act-field">
              <span className="act-label">Search students</span>
              <input className="act-input" value={studentQ} onChange={(event) => { setStudentPage(1); setStudentQ(event.target.value); }} placeholder="Name" />
            </label>
            <label className="act-field">
              <span className="act-label">Admission status</span>
              <select className="act-input" value={admissionStatus} onChange={(event) => { setStudentPage(1); setAdmissionStatus(event.target.value); }}>
                <option value="">Any</option>
                <option value="Not started">Not started</option>
                <option value="Contacted">Contacted</option>
                <option value="Counselling">Counselling</option>
                <option value="Applied">Applied</option>
                <option value="Admitted">Admitted</option>
                <option value="Enrolled">Enrolled</option>
                <option value="Not proceeding">Not proceeding</option>
              </select>
            </label>
            <label className="act-field">
              <span className="act-label">Follow-up state</span>
              <select className="act-input" value={followUpState} onChange={(event) => { setStudentPage(1); setFollowUpState(event.target.value); }}>
                <option value="">Any</option>
                <option value="overdue">Overdue</option>
                <option value="due_today">Due today</option>
                <option value="upcoming">Upcoming</option>
                <option value="unscheduled">Unscheduled</option>
                <option value="none">None open</option>
              </select>
            </label>
          </div>
          {data.students.items.length ? (
            <div className="s360-table-wrap act-ios-scroll">
              <table className="s360-table">
                <thead>
                  <tr>
                    <th scope="col">Student</th>
                    <th scope="col">Mobile</th>
                    <th scope="col">Referral consultancy</th>
                    <th scope="col">Referred</th>
                    <th scope="col">Admission</th>
                    <th scope="col">Next follow-up</th>
                    <th scope="col">State</th>
                  </tr>
                </thead>
                <tbody>
                  {data.students.items.map((row) => (
                    <tr key={row.id}>
                      <td>
                        <strong>{row.fullName}</strong>
                        <span className="s360-muted">…{String(row.id).slice(-6)}</span>
                      </td>
                      <td>{row.phone || '—'}</td>
                      <td>{row.consultancyName || '—'}</td>
                      <td>{row.referredAt ? formatMoment(row.referredAt, PHASE_A_TIME_ZONE) : '—'}</td>
                      <td>{row.admissionStatus}</td>
                      <td>{row.nextFollowUpAt ? formatMoment(row.nextFollowUpAt, PHASE_A_TIME_ZONE) : '—'}</td>
                      <td>
                        <span className={`act-pill${row.followUpState === 'overdue' ? ' is-warning' : ''}`}>
                          {row.followUpState}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyBlock compact icon={FiUsers} title={staff360EmptyMessage('students')} detail="Students linked via current referral to assigned consultancies." />
          )}
          {data.students.total > data.students.limit ? (
            <div className="s360-pager">
              <button type="button" className="act-btn is-small" disabled={studentPage <= 1} onClick={() => setStudentPage((page) => page - 1)}>Previous</button>
              <span>Page {data.students.page} · {data.students.total} total</span>
              <button
                type="button"
                className="act-btn is-small"
                disabled={studentPage * data.students.limit >= data.students.total}
                onClick={() => setStudentPage((page) => page + 1)}
              >
                Next
              </button>
            </div>
          ) : null}
        </div>
      ) : null}

      {tab === 'sessions' && data ? (
        <div className="s360-panel" id="s360-panel-sessions" role="tabpanel" aria-labelledby="s360-tab-sessions">
          <div className="s360-session-summary">
            <div>
              <span className="s360-metric-label">Observed span ({data.day?.date || focusDate})</span>
              <strong>{formatDuration(data.day.sessions?.totalObservedMs)}</strong>
              <span className="s360-metric-scope">Selected day · not working hours</span>
            </div>
            <div>
              <span className="s360-metric-label">Successful logins</span>
              <strong>{data.day.loginCount == null ? '—' : data.day.loginCount}</strong>
              <span className="s360-metric-scope">Selected day</span>
            </div>
            <div>
              <span className="s360-metric-label">Verified idle / active work</span>
              <strong>Unavailable</strong>
              <span className="s360-metric-scope">Not measured</span>
            </div>
          </div>
          <p className="s360-panel-note">
            Session span merges overlapping intervals. It is observed elapsed time, not proof the person was actively working. Secrets and tokens are never shown.
          </p>
          {data.day.sessions?.sessions?.filter((row) => row.overlapsSelectedDay).length ? (
            <div className="s360-table-wrap act-ios-scroll">
              <table className="s360-table">
                <thead>
                  <tr>
                    <th scope="col">Status</th>
                    <th scope="col">Sign-in</th>
                    <th scope="col">Last heartbeat</th>
                    <th scope="col">Observed end</th>
                    <th scope="col">Observed span</th>
                    <th scope="col">End reason</th>
                  </tr>
                </thead>
                <tbody>
                  {data.day.sessions.sessions.filter((row) => row.overlapsSelectedDay).map((row) => (
                    <tr key={row.id}>
                      <td>
                        <span className={`act-pill is-${row.open ? 'ok' : 'muted'}`}>
                          {row.open ? 'Open' : 'Closed'}
                        </span>
                      </td>
                      <td title={row.observedStartAt ? formatMoment(row.observedStartAt, PHASE_A_TIME_ZONE) : undefined}>
                        {row.observedStartAt ? formatCompactTime(row.observedStartAt, PHASE_A_TIME_ZONE) : '—'}
                      </td>
                      <td>{row.lastSeenAt ? relativeTime(row.lastSeenAt, PHASE_A_TIME_ZONE) : '—'}</td>
                      <td title={row.observedEndAt ? formatMoment(row.observedEndAt, PHASE_A_TIME_ZONE) : undefined}>
                        {row.observedEndAt ? formatCompactTime(row.observedEndAt, PHASE_A_TIME_ZONE) : '—'}
                      </td>
                      <td>{formatDuration(row.observedMs)}</td>
                      <td><span className="act-pill">{row.endedReason || '—'}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyBlock compact icon={FiClock} title={staff360EmptyMessage('sessions')} />
          )}
        </div>
      ) : null}

      {tab === 'timeline' ? (
        <div className="s360-panel s360-timeline" id="s360-panel-timeline" role="tabpanel" aria-labelledby="s360-tab-timeline">
          {timeline}
        </div>
      ) : null}

      {tab === 'day-end' ? (
        <div className="s360-panel" id="s360-panel-day-end" role="tabpanel" aria-labelledby="s360-tab-day-end">
          <p className="s360-panel-note">
            Day-end for <strong>{focusDate}</strong> ({PHASE_A_TIME_ZONE}, unconfirmed). Actor filter = recorded actions by this staff member; assignee filter = consultancies assigned to them. Outstanding/overdue are reconstructed — not a stored snapshot.
          </p>
          {dayBuilt.error ? <Notice tone="warning">{dayBuilt.error}</Notice> : null}
          {dayEnd.notice ? <Notice tone={dayEnd.notice.tone}>{dayEnd.notice.message}</Notice> : null}
          {dayEnd.loading && !dayEnd.data ? (
            <div aria-busy="true" className="s360-grid">
              {Array.from({ length: 4 }, (_, index) => <div key={index} className="act-bone h-row" />)}
            </div>
          ) : null}
          {dayEnd.data ? (
            <>
              {dayEnd.data.truncated ? (
                <Notice tone="warning">This report stopped at its row cap. Narrow filters. Omitted rows are not shown as zero.</Notice>
              ) : null}
              {dayEnd.data.exactSnapshot === false ? (
                <p className="s360-panel-note">{dayEndScheduleNote(dayEnd.data.summary)}</p>
              ) : null}
              <div className="s360-grid s360-day-kpis">
                {[
                  { id: 'stu', label: 'Students created', value: dayEnd.data.summary?.studentsCreated, hint: 'student.created audits', scope: 'day' },
                  { id: 'adm', label: 'Admission changes', value: dayEnd.data.summary?.admissionChanges, hint: 'Recorded status changes', scope: 'day' },
                  { id: 'aopen', label: 'Assignments opened', value: dayEnd.data.summary?.assignmentsOpened, scope: 'day' },
                  { id: 'arev', label: 'Assignments revoked', value: dayEnd.data.summary?.assignmentsRevoked, scope: 'day' },
                  { id: 'fdone', label: 'Follow-ups completed', value: dayEnd.data.summary?.followUpsCompleted, scope: 'day' },
                  {
                    id: 'out',
                    label: 'Outstanding at day end',
                    value: dayEnd.data.summary?.outstanding?.count,
                    empty: '—',
                    hint: dayEnd.data.summary?.outstanding?.exact === false ? 'Approximate reconstruction' : 'Recorded reconstruction',
                    approx: dayEnd.data.summary?.outstanding?.exact === false,
                  },
                  {
                    id: 'odue',
                    label: 'Overdue at day end',
                    value: dayEnd.data.summary?.overdue?.count,
                    empty: '—',
                    hint: dayEnd.data.summary?.overdue?.exact === false ? 'Approximate reconstruction' : 'Recorded reconstruction',
                    approx: dayEnd.data.summary?.overdue?.exact === false,
                  },
                ].map((card) => (
                  <article key={card.id} className="s360-metric" title={card.hint}>
                    <span className="s360-metric-top">
                      <span className="s360-metric-copy">
                        <span className="s360-metric-label">{card.label}</span>
                        {card.approx ? (
                          <span className="s360-metric-scope is-approx">Approx.</span>
                        ) : card.scope ? (
                          <span className="s360-metric-scope">{SCOPE_LABEL[card.scope]}</span>
                        ) : null}
                      </span>
                    </span>
                    <strong className="s360-metric-value">
                      {card.value == null ? (card.empty || '—') : Number(card.value).toLocaleString()}
                    </strong>
                  </article>
                ))}
              </div>
              {dayEnd.data.items?.length ? (
                <div className="s360-table-wrap act-ios-scroll">
                  <table className="s360-table">
                    <thead>
                      <tr>
                        <th scope="col">When</th>
                        <th scope="col">Record</th>
                        <th scope="col">Subject</th>
                        <th scope="col">Detail</th>
                        <th scope="col">Accuracy</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dayEnd.data.items.map((row, index) => (
                        <tr key={row.id || `${row.kind}-${row.at}-${index}`}>
                          <td>{row.at ? formatMoment(row.at, PHASE_A_TIME_ZONE) : '—'}</td>
                          <td>{row.kind || '—'}</td>
                          <td>{row.consultancyName || row.studentName || 'Name was not stored'}</td>
                          <td>
                            {row.exceptionReason
                              ? `${row.exceptionReason}${row.severity ? ` · ${row.severity}` : ''}`
                              : row.outcome || row.nextAction
                                ? [row.outcome, row.nextAction].filter(Boolean).join(' · ')
                                : row.previousStatus || row.nextStatus
                                  ? `${row.previousStatus || '—'} → ${row.nextStatus || '—'}`
                                  : '—'}
                          </td>
                          <td>
                            <span className={`act-pill${row.exact === false ? ' is-warning' : ''}`}>
                              {dayEndAccuracy(row) === 'Recorded' ? 'Recorded' : 'Approximate reconstruction'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <EmptyBlock compact title={intelligenceEmptyMessage('day-end')} />
              )}
              {dayEnd.data.total > dayEnd.data.limit ? (
                <div className="s360-pager">
                  <button type="button" className="act-btn is-small" disabled={dayEndPage <= 1} onClick={() => setDayEndPage((page) => page - 1)}>Previous</button>
                  <span>Page {dayEnd.data.page} · {dayEnd.data.total} total</span>
                  <button
                    type="button"
                    className="act-btn is-small"
                    disabled={dayEndPage * dayEnd.data.limit >= dayEnd.data.total}
                    onClick={() => setDayEndPage((page) => page + 1)}
                  >
                    Next
                  </button>
                </div>
              ) : null}
            </>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}

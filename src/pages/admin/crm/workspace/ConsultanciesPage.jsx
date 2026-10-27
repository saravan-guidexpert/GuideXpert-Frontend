import { useMemo, useRef, useState } from 'react';
import {
  FiActivity,
  FiAlertTriangle,
  FiChevronLeft,
  FiChevronRight,
  FiClock,
  FiPlus,
  FiRefreshCw,
  FiRepeat,
  FiSearch,
  FiSliders,
  FiUserMinus,
  FiUserPlus,
  FiUsers,
  FiX,
} from 'react-icons/fi';
import { useCrmSession } from '../../../crm-app/useCrmSession';
import { useDebouncedValue } from '../../../../hooks/useDebouncedValue';
import {
  assignPortalConsultancy,
  createPortalConsultancy,
  fetchPortalDirectory,
  getPortalAssignmentHistory,
  getPortalConsultancyOverview,
  listPortalActivity,
  revokePortalConsultancy,
} from '../../../../utils/crmSessionApi';
import {
  accountActions,
  applyCrmResult,
  applyFilterPatch,
  PHASE_A_TIME_ZONE,
  workspaceRouteDecision,
} from '../../../../utils/crmWorkspace';
import {
  CONSULTANCY_FILTERS,
  CONSULTANCY_SORTS,
  NOTES_MAX,
  activityStory,
  actorName,
  assignedByMap,
  assignmentOutcome,
  assignmentState,
  consultancyListQuery,
  hasActiveFilters,
  historyWindow,
  markAssigned,
  resultSummary,
  validateConsultancyForm,
} from '../../../../utils/crmConsultancies';
import { formatMoment, relativeTime } from '../../../../utils/crmOverview';
import { useCrmResource } from './useCrmResource';
import { AccessNote, ConfirmDialog } from './workspaceUi';
import { Avatar, DistributionPanel, Notice, PersonCombobox, Sheet, SummaryCards } from './consultancyUi';
import './superAdminConsultancies.css';

const TABS = [
  { id: 'assignments', label: 'Assignments', icon: FiUsers },
  { id: 'history', label: 'History', icon: FiClock },
  { id: 'activity', label: 'Activity', icon: FiActivity },
];

function formatDay(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric', timeZone: PHASE_A_TIME_ZONE });
}

function personOption(person, extra = {}) {
  return {
    id: person.id,
    primary: person.fullName || person.email || 'Unnamed account',
    secondary: [person.roleLabel || person.role, person.email].filter(Boolean).join(' · '),
    ...extra,
  };
}

function StatusPill({ status }) {
  return <span className={`cs-pill is-${status === 'active' ? 'active' : 'inactive'}`}>{status === 'active' ? 'Active' : 'Inactive'}</span>;
}

function AssignmentPill({ row }) {
  const state = assignmentState(row);
  return <span className={`cs-pill is-${state.id}`}>{state.label}</span>;
}

function StaffStack({ assignees }) {
  if (!assignees?.length) return <span className="cs-faint">No staff assigned</span>;
  const shown = assignees.slice(0, 4);
  const extra = assignees.length - shown.length;
  return (
    <ul className="cs-staff" aria-label={`${assignees.length} assigned staff`}>
      {shown.map((person) => (
        <li key={person.id} className="cs-staff-person" title={[person.fullName, person.roleLabel || person.role].filter(Boolean).join(' · ')}>
          <Avatar name={person.fullName} size="xs" />
          <span className="cs-staff-name">{person.fullName || 'Unnamed account'}</span>
        </li>
      ))}
      {extra > 0 ? (
        <li className="cs-staff-more" title={assignees.slice(4).map((person) => person.fullName || 'Unnamed account').join(', ')}>
          +{extra} more
        </li>
      ) : null}
    </ul>
  );
}

export default function ConsultanciesPage() {
  const { user } = useCrmSession();
  const decision = workspaceRouteDecision(user, 'consultancies');
  const actions = accountActions(user);
  const allowed = decision.state === 'allowed';

  const [filters, setFilters] = useState(CONSULTANCY_FILTERS);
  const [searchText, setSearchText] = useState('');
  const debouncedSearch = useDebouncedValue(searchText, 300);
  const [appliedSearch, setAppliedSearch] = useState('');
  if (debouncedSearch !== appliedSearch) {
    setAppliedSearch(debouncedSearch);
    setFilters((current) => applyFilterPatch(current, { q: debouncedSearch.trim() }));
  }
  const [staffQuery, setStaffQuery] = useState('');
  const debouncedStaffQuery = useDebouncedValue(staffQuery, 300);
  const [staffFilter, setStaffFilter] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [notice, setNotice] = useState(null);
  const [target, setTarget] = useState(null);
  const [createOpen, setCreateOpen] = useState(false);

  const query = useMemo(() => consultancyListQuery(filters), [filters]);
  const overview = useCrmResource(
    allowed,
    `${reloadKey}:${JSON.stringify(query)}`,
    () => getPortalConsultancyOverview(query),
    true,
    { keepData: true }
  );
  const staffOptions = useCrmResource(
    allowed && actions.viewDirectory && !staffFilter,
    `staff-filter:${debouncedStaffQuery}`,
    () => fetchPortalDirectory({ page: 1, limit: 8, q: debouncedStaffQuery.trim() || undefined })
  );

  function update(patch) {
    setFilters((current) => applyFilterPatch(current, patch));
  }

  function resetFilters() {
    setSearchText('');
    setStaffFilter(null);
    setStaffQuery('');
    setFilters((current) => ({ ...CONSULTANCY_FILTERS, sort: current.sort, limit: current.limit }));
  }

  function pickStaff(option) {
    setStaffFilter(option);
    update({ userId: option.id });
  }

  function refresh() {
    setReloadKey((key) => key + 1);
  }

  if (!allowed) return <AccessNote>{decision.message}</AccessNote>;

  const data = overview.data;
  const summary = data?.summary ?? null;
  const items = data?.items || [];
  const total = data?.total ?? 0;
  const pager = data ? resultSummary(data.page, data.limit, total) : null;
  const filtered = hasActiveFilters(filters);
  const firstLoad = overview.loading && !data;
  const organizationEmpty = data && !filtered && total === 0 && (!summary || summary.total === 0);

  return (
    <div className="gx-admin-page cs-page">
      <header className="cs-head">
        <div className="cs-head-copy">
          <h1 className="cs-title">Consultancies</h1>
          <p className="cs-lede">Manage consultancy records, assign CRM staff, and track ownership across your organization.</p>
        </div>
        <div className="cs-head-actions">
          <button
            type="button"
            className={`cs-btn is-icon${overview.loading ? ' is-spinning' : ''}`}
            onClick={refresh}
            disabled={overview.loading}
            aria-label="Refresh consultancies"
            title="Refresh"
          >
            <FiRefreshCw size={15} aria-hidden="true" />
          </button>
          <button type="button" className="cs-btn is-primary" onClick={() => setCreateOpen(true)}>
            <FiPlus size={15} aria-hidden="true" /> Create consultancy
          </button>
        </div>
      </header>

      {notice ? <Notice tone={notice.tone} onDismiss={() => setNotice(null)}>{notice.message}</Notice> : null}
      {overview.notice ? (
        <Notice tone={overview.notice.tone}>
          {overview.notice.message}{' '}
          <button type="button" className="cs-inline-link" onClick={refresh}>Try again</button>
        </Notice>
      ) : null}

      <section aria-labelledby="cs-org-title" className="cs-org">
        <div className="cs-section-head">
          <h2 id="cs-org-title">Organization totals</h2>
          <span className="cs-tag">{summary ? 'All consultancies · ignores filters' : 'Restricted'}</span>
        </div>
        {!firstLoad && data && !summary ? (
          <p className="cs-muted-block">
            Organization-wide totals are not returned for this account. {data.unassignedMeaning || ''}
          </p>
        ) : null}
        <SummaryCards summary={summary} loading={firstLoad} />
      </section>

      {summary && summary.total > 0 ? <DistributionPanel summary={summary} onPickStaff={(row) => pickStaff({ id: row.id, primary: row.name })} /> : null}

      <section className="cs-panel cs-directory" aria-labelledby="cs-dir-title">
        <header className="cs-panel-head">
          <div>
            <h2 id="cs-dir-title">Directory</h2>
            <p aria-live="polite">
              {data ? (
                <>
                  <strong>{total.toLocaleString()}</strong> {total === 1 ? 'consultancy' : 'consultancies'} {filtered ? 'match these filters' : 'in this list'}
                </>
              ) : 'Loading…'}
            </p>
          </div>
        </header>

        <div className="cs-toolbar" role="search" aria-label="Filter consultancies">
          <div className="cs-field cs-search">
            <label className="cs-label" htmlFor="cs-search">Search</label>
            <div className="cs-input-wrap">
              <FiSearch size={14} aria-hidden="true" className="cs-input-ico" />
              <input
                id="cs-search"
                type="search"
                className="cs-input has-icon"
                placeholder="Consultancy name"
                maxLength={100}
                value={searchText}
                onChange={(event) => setSearchText(event.target.value)}
              />
            </div>
          </div>
          <div className="cs-field">
            <label className="cs-label" htmlFor="cs-status">Status</label>
            <select id="cs-status" className="cs-input" value={filters.status} onChange={(event) => update({ status: event.target.value })}>
              <option value="">All statuses</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
          <div className="cs-field">
            <label className="cs-label" htmlFor="cs-assignment">Assignment</label>
            <select id="cs-assignment" className="cs-input" value={filters.assignment} onChange={(event) => update({ assignment: event.target.value })}>
              <option value="">All</option>
              <option value="assigned">Assigned</option>
              <option value="unassigned">Unassigned</option>
            </select>
          </div>
          {actions.viewDirectory ? (
            <PersonCombobox
              label="Staff"
              query={staffQuery}
              onQuery={setStaffQuery}
              loading={staffOptions.loading}
              error={staffOptions.notice?.message}
              options={(staffOptions.data?.items || []).map((person) => personOption(person, {
                badge: person.status !== 'active' ? 'Inactive' : (person.assignmentCount ? `${person.assignmentCount}` : null),
              }))}
              selected={staffFilter}
              onSelect={pickStaff}
              onClear={() => { setStaffFilter(null); setStaffQuery(''); update({ userId: '' }); }}
              placeholder="Any staff member"
            />
          ) : null}
          <div className="cs-field">
            <label className="cs-label" htmlFor="cs-sort">Sort by</label>
            <select id="cs-sort" className="cs-input" value={filters.sort} onChange={(event) => update({ sort: event.target.value })}>
              {CONSULTANCY_SORTS.map((sort) => <option key={sort.id} value={sort.id}>{sort.label}</option>)}
            </select>
          </div>
          {filtered ? (
            <button type="button" className="cs-btn is-quiet cs-clear" onClick={resetFilters}>
              <FiX size={14} aria-hidden="true" /> Clear filters
            </button>
          ) : null}
        </div>

        {firstLoad ? (
          <div className="cs-rows-skeleton" aria-busy="true" aria-label="Loading consultancies">
            {Array.from({ length: 5 }, (_, index) => <div key={index} className="cs-bone h-row" />)}
          </div>
        ) : null}

        {organizationEmpty ? (
          <div className="cs-empty">
            <span className="cs-empty-ico"><FiUsers size={18} aria-hidden="true" /></span>
            <p className="cs-empty-title">No consultancies yet</p>
            <p>Create the first consultancy record, then assign CRM staff to it.</p>
            <button type="button" className="cs-btn is-primary" onClick={() => setCreateOpen(true)}>
              <FiPlus size={15} aria-hidden="true" /> Create consultancy
            </button>
          </div>
        ) : null}

        {data && !organizationEmpty && !items.length ? (
          <div className="cs-empty">
            <span className="cs-empty-ico"><FiSliders size={18} aria-hidden="true" /></span>
            <p className="cs-empty-title">No consultancies match these filters</p>
            <p>Try a different name, status, or staff member.</p>
            {filtered ? <button type="button" className="cs-btn" onClick={resetFilters}>Reset filters</button> : null}
          </div>
        ) : null}

        {items.length ? (
          <div className={`cs-results${overview.loading ? ' is-stale' : ''}`} aria-busy={overview.loading}>
            <div className="cs-table-wrap">
              <table className="cs-table">
                <caption className="cs-sr-only">Consultancies, {pager?.label}</caption>
                <thead>
                  <tr>
                    <th scope="col">Consultancy</th>
                    <th scope="col">Status</th>
                    <th scope="col">Assigned staff</th>
                    <th scope="col">Assignment</th>
                    <th scope="col" className="is-num">Students</th>
                    <th scope="col">Last updated</th>
                    <th scope="col"><span className="cs-sr-only">Actions</span></th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((row) => (
                    <tr key={row.id}>
                      <td>
                        <div className="cs-name">
                          <Avatar name={row.name} />
                          <span className="cs-name-copy">
                            <button type="button" className="cs-name-btn" onClick={() => setTarget({ id: row.id, name: row.name, tab: 'assignments' })}>
                              {row.name}
                            </button>
                            <span className="cs-faint">Added {formatDay(row.createdAt)}</span>
                          </span>
                        </div>
                      </td>
                      <td><StatusPill status={row.status} /></td>
                      <td><StaffStack assignees={row.assignees} /></td>
                      <td><AssignmentPill row={row} /></td>
                      <td className="is-num">{Number(row.students || 0).toLocaleString()}</td>
                      <td>
                        <span className="cs-when" title={formatMoment(row.updatedAt, PHASE_A_TIME_ZONE)}>
                          {row.updatedAt ? relativeTime(row.updatedAt, PHASE_A_TIME_ZONE) : '—'}
                        </span>
                      </td>
                      <td className="cs-actions">
                        <button type="button" className="cs-btn is-small" onClick={() => setTarget({ id: row.id, name: row.name, tab: 'assignments' })}>
                          Manage
                        </button>
                        <button type="button" className="cs-btn is-small is-quiet" onClick={() => setTarget({ id: row.id, name: row.name, tab: 'history' })}>
                          Details
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <ul className="cs-cardlist" aria-label="Consultancies">
              {items.map((row) => (
                <li key={row.id} className="cs-rowcard">
                  <div className="cs-rowcard-head">
                    <Avatar name={row.name} />
                    <div className="cs-name-copy">
                      <button type="button" className="cs-name-btn" onClick={() => setTarget({ id: row.id, name: row.name, tab: 'assignments' })}>
                        {row.name}
                      </button>
                      <span className="cs-faint">Updated {row.updatedAt ? relativeTime(row.updatedAt, PHASE_A_TIME_ZONE) : '—'}</span>
                    </div>
                  </div>
                  <div className="cs-rowcard-pills">
                    <StatusPill status={row.status} />
                    <AssignmentPill row={row} />
                    <span className="cs-faint">{Number(row.students || 0).toLocaleString()} students</span>
                  </div>
                  <StaffStack assignees={row.assignees} />
                  <div className="cs-rowcard-actions">
                    <button type="button" className="cs-btn is-small" onClick={() => setTarget({ id: row.id, name: row.name, tab: 'assignments' })}>
                      Manage assignments
                    </button>
                    <button type="button" className="cs-btn is-small is-quiet" onClick={() => setTarget({ id: row.id, name: row.name, tab: 'history' })}>
                      View details
                    </button>
                  </div>
                </li>
              ))}
            </ul>

            <nav className="cs-pager" aria-label="Pagination">
              <span>{pager.label}</span>
              {pager.showPager ? (
                <div className="cs-pager-controls">
                  <button
                    type="button"
                    className="cs-btn is-icon"
                    disabled={data.page <= 1 || overview.loading}
                    onClick={() => update({ page: data.page - 1 })}
                    aria-label="Previous page"
                  >
                    <FiChevronLeft size={16} aria-hidden="true" />
                  </button>
                  <span className="cs-page-of">Page {data.page} of {pager.pages}</span>
                  <button
                    type="button"
                    className="cs-btn is-icon"
                    disabled={data.page >= pager.pages || overview.loading}
                    onClick={() => update({ page: data.page + 1 })}
                    aria-label="Next page"
                  >
                    <FiChevronRight size={16} aria-hidden="true" />
                  </button>
                </div>
              ) : null}
            </nav>
          </div>
        ) : null}
      </section>

      {data?.studentsMeaning ? <p className="cs-footnote">Students: {data.studentsMeaning}</p> : null}

      {target ? (
        <ConsultancyDrawer
          key={target.id}
          target={target}
          actions={actions}
          reloadKey={reloadKey}
          onClose={() => setTarget(null)}
          onChanged={refresh}
        />
      ) : null}

      {createOpen ? (
        <CreateConsultancyModal
          user={user}
          canAssign={actions.manageAssignment}
          onClose={() => setCreateOpen(false)}
          onOpenExisting={(row) => { setCreateOpen(false); setTarget({ id: row.id, name: row.name, tab: 'assignments' }); }}
          onCreated={(created, outcome) => {
            setCreateOpen(false);
            setNotice(outcome || { tone: 'success', message: `${created.name} was created.` });
            refresh();
            setTarget({ id: created.id, name: created.name, tab: 'assignments' });
          }}
        />
      ) : null}
    </div>
  );
}

function ConsultancyDrawer({ target, actions, reloadKey, onClose, onChanged }) {
  const [tab, setTab] = useState(target.tab || 'assignments');
  const [localKey, setLocalKey] = useState(0);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [replacing, setReplacing] = useState(null);
  const [peopleQuery, setPeopleQuery] = useState('');
  const debouncedPeople = useDebouncedValue(peopleQuery, 300);
  const [candidate, setCandidate] = useState(null);
  const pickerRef = useRef(null);
  const returnFocus = useRef(null);
  const inFlight = useRef(false);
  const key = `${target.id}:${reloadKey}:${localKey}`;
  const window10y = useMemo(() => historyWindow(), []);

  const row = useCrmResource(
    true,
    `row:${key}`,
    () => getPortalConsultancyOverview({ page: 1, limit: 1, consultancyId: target.id }),
    false,
    { keepData: true }
  );
  const history = useCrmResource(
    true,
    `history:${key}`,
    () => getPortalAssignmentHistory({ consultancyId: target.id, ...window10y, page: 1, limit: 50 }),
    false,
    { keepData: true }
  );
  const activity = useCrmResource(
    tab === 'activity',
    `activity:${key}`,
    () => listPortalActivity({ consultancyId: target.id, page: 1, limit: 20 })
  );
  const people = useCrmResource(
    actions.manageAssignment && !candidate,
    `people:${debouncedPeople}`,
    () => fetchPortalDirectory({ page: 1, limit: 8, q: debouncedPeople.trim() || undefined, status: 'active' })
  );

  const current = row.data?.items?.[0] || null;
  const name = current?.name || target.name;
  const assignees = useMemo(() => current?.assignees || [], [current]);
  const openedBy = useMemo(() => assignedByMap(history.data?.items), [history.data]);
  const candidates = markAssigned(people.data?.items, assignees).map((person) => personOption(person, {
    disabled: person.alreadyAssigned,
    badge: person.alreadyAssigned ? 'Assigned' : null,
  }));

  function afterMutation() {
    setLocalKey((value) => value + 1);
    onChanged();
  }

  function restoreFocus() {
    const node = returnFocus.current;
    window.setTimeout(() => {
      const usable = node && document.contains(node) && !node.disabled;
      const fallback = pickerRef.current || node?.closest?.('[role="dialog"]');
      (usable ? node : fallback)?.focus();
    }, 0);
  }

  function askRevoke(person, reason) {
    returnFocus.current = document.activeElement;
    setConfirm({ userId: person.id, consultancyId: target.id, name: person.fullName || 'This user', consultancy: name, reason });
  }

  async function assign() {
    if (!candidate || busy || inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    setNotice(null);
    const result = await assignPortalConsultancy(candidate.id, target.id);
    const applied = applyCrmResult(result);
    inFlight.current = false;
    setBusy(false);
    if (!applied.ok) {
      setNotice(applied.notice);
      return;
    }
    const added = candidate;
    setCandidate(null);
    setPeopleQuery('');
    afterMutation();
    if (replacing) {
      const previous = replacing;
      setReplacing(null);
      setNotice({ tone: 'success', message: `${added.primary} is now assigned. Confirm whether ${previous.fullName || 'the previous assignee'} should lose access.` });
      askRevoke(previous, 'replace');
      return;
    }
    setNotice({ tone: 'success', message: `${added.primary} was assigned to ${name}.` });
  }

  async function revoke() {
    if (!confirm || busy || inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    const result = await revokePortalConsultancy(confirm.userId, confirm.consultancyId);
    const applied = applyCrmResult(result);
    inFlight.current = false;
    setBusy(false);
    const removed = confirm.name;
    setConfirm(null);
    restoreFocus();
    if (!applied.ok) {
      setNotice(applied.notice);
      return;
    }
    setNotice({ tone: 'success', message: `${removed} no longer has access to ${name}.` });
    afterMutation();
  }

  function startReplace(person) {
    setReplacing(person);
    setCandidate(null);
    setPeopleQuery('');
    window.setTimeout(() => pickerRef.current?.focus(), 0);
  }

  const subtitle = current ? (
    <div className="cs-sheet-meta">
      <StatusPill status={current.status} />
      <AssignmentPill row={current} />
      <span>{Number(current.students || 0).toLocaleString()} students</span>
    </div>
  ) : null;

  return (
    <>
      <Sheet open title={name} subtitle={subtitle} onClose={() => { if (!confirm) onClose(); }}>
        {row.notice ? <Notice tone={row.notice.tone}>{row.notice.message}</Notice> : null}
        {notice ? <Notice tone={notice.tone} onDismiss={() => setNotice(null)}>{notice.message}</Notice> : null}

        {current ? (
          <dl className="cs-facts">
            <div><dt>Created</dt><dd>{formatDay(current.createdAt)}</dd></div>
            <div><dt>Last updated</dt><dd title={formatMoment(current.updatedAt, PHASE_A_TIME_ZONE)}>{current.updatedAt ? relativeTime(current.updatedAt, PHASE_A_TIME_ZONE) : '—'}</dd></div>
            <div><dt>Active assignees</dt><dd>{current.activeAssignees}</dd></div>
            <div><dt>Students</dt><dd>{Number(current.students || 0).toLocaleString()}</dd></div>
          </dl>
        ) : (row.loading ? <div className="cs-bone h-facts" /> : null)}

        <div className="cs-tabs" role="tablist" aria-label="Consultancy sections">
          {TABS.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                type="button"
                role="tab"
                id={`cs-tab-${item.id}`}
                aria-selected={tab === item.id}
                aria-controls={`cs-tabpanel-${item.id}`}
                className={`cs-tab${tab === item.id ? ' is-active' : ''}`}
                onClick={() => setTab(item.id)}
              >
                <Icon size={14} aria-hidden="true" /> {item.label}
              </button>
            );
          })}
        </div>

        {tab === 'assignments' ? (
          <div role="tabpanel" id="cs-tabpanel-assignments" aria-labelledby="cs-tab-assignments" className="cs-tabpanel">
            <h3 className="cs-sub">Current assignees</h3>
            {assignees.length ? (
              <ul className="cs-people">
                {assignees.map((person) => {
                  const by = openedBy.get(person.id);
                  return (
                    <li key={person.id} className={`cs-person${replacing?.id === person.id ? ' is-replacing' : ''}`}>
                      <Avatar name={person.fullName} />
                      <div className="cs-person-copy">
                        <span className="cs-strong">{person.fullName || 'Unnamed account'}</span>
                        <span className="cs-faint">{[person.roleLabel || person.role, person.email].filter(Boolean).join(' · ')}</span>
                        <span className="cs-faint">
                          Since {formatDay(person.assignedAt)}{by ? ` · by ${actorName(by)}` : ''}
                          {person.status && person.status !== 'active' ? ' · account inactive' : ''}
                        </span>
                      </div>
                      {actions.manageAssignment ? (
                        <div className="cs-person-actions">
                          <button type="button" className="cs-btn is-small is-quiet" onClick={() => startReplace(person)} disabled={busy}>
                            <FiRepeat size={13} aria-hidden="true" /> Reassign
                          </button>
                          <button
                            type="button"
                            className="cs-btn is-small is-danger"
                            disabled={busy}
                            onClick={() => setConfirm({ userId: person.id, consultancyId: target.id, name: person.fullName || 'This user', consultancy: name })}
                            onFocus={(event) => { returnFocus.current = event.currentTarget; }}
                          >
                            <FiUserMinus size={13} aria-hidden="true" /> Revoke
                          </button>
                        </div>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="cs-muted-block">
                {row.loading ? 'Loading assignees…' : 'No CRM staff are assigned. Assign someone so this consultancy has an owner.'}
              </p>
            )}

            {actions.manageAssignment ? (
              <div className="cs-assign">
                <h3 className="cs-sub">
                  {replacing ? `Choose a replacement for ${replacing.fullName || 'this assignee'}` : 'Assign CRM staff'}
                </h3>
                {replacing ? (
                  <p className="cs-hint">
                    The new person is assigned first. You then confirm removing {replacing.fullName || 'the previous assignee'} — nobody loses access silently.{' '}
                    <button type="button" className="cs-inline-link" onClick={() => setReplacing(null)}>Cancel reassignment</button>
                  </p>
                ) : (
                  <p className="cs-hint">Only active CRM accounts are listed. People already assigned are marked.</p>
                )}
                <div className="cs-assign-row">
                  <PersonCombobox
                    label="CRM staff member"
                    query={peopleQuery}
                    onQuery={setPeopleQuery}
                    loading={people.loading}
                    error={people.notice?.message}
                    options={candidates}
                    selected={candidate}
                    onSelect={setCandidate}
                    onClear={() => setCandidate(null)}
                    inputRef={pickerRef}
                  />
                  <button type="button" className="cs-btn is-primary" disabled={busy || !candidate} onClick={assign}>
                    <FiUserPlus size={14} aria-hidden="true" /> {busy ? 'Saving…' : 'Assign'}
                  </button>
                </div>
              </div>
            ) : (
              <p className="cs-hint">Assignment changes require CRM Access Management.</p>
            )}
          </div>
        ) : null}

        {tab === 'history' ? (
          <div role="tabpanel" id="cs-tabpanel-history" aria-labelledby="cs-tab-history" className="cs-tabpanel">
            <h3 className="cs-sub">Assignment history</h3>
            <p className="cs-hint">Every assignment opened or revoked on this consultancy, with who made the change.</p>
            {history.notice ? <Notice tone={history.notice.tone}>{history.notice.message}</Notice> : null}
            {history.loading && !history.data ? <div className="cs-bone h-row" /> : null}
            {history.data ? (
              history.data.items?.length ? (
                <ol className="cs-timeline">
                  {history.data.items.map((item) => (
                    <li key={item.id} className="cs-timeline-item">
                      <div className="cs-timeline-head">
                        <Avatar name={item.userName} size="sm" muted={item.state !== 'active'} />
                        <span className="cs-strong">{item.userName || 'Unnamed account'}</span>
                        <span className={`cs-pill is-${item.state === 'active' ? 'assigned' : 'inactive'}`}>{item.state === 'active' ? 'Current' : 'Ended'}</span>
                      </div>
                      <ul className="cs-events">
                        {(item.events || []).map((event, index) => (
                          <li key={`${item.id}-${index}`}>
                            <span className={`cs-event-dot is-${event.action}`} aria-hidden="true" />
                            {event.action === 'assigned' ? 'Assigned' : 'Revoked'} by {actorName(event.actor)}
                            <time dateTime={event.at} className="cs-faint"> · {formatMoment(event.at, PHASE_A_TIME_ZONE)}</time>
                          </li>
                        ))}
                      </ul>
                    </li>
                  ))}
                </ol>
              ) : <p className="cs-muted-block">No assignments have been recorded for this consultancy.</p>
            ) : null}
          </div>
        ) : null}

        {tab === 'activity' ? (
          <div role="tabpanel" id="cs-tabpanel-activity" aria-labelledby="cs-tab-activity" className="cs-tabpanel">
            <h3 className="cs-sub">Recent activity</h3>
            <p className="cs-hint">Who changed this consultancy, newest first.</p>
            {activity.notice ? <Notice tone={activity.notice.tone}>{activity.notice.message}</Notice> : null}
            {activity.loading ? <div className="cs-bone h-row" /> : null}
            {activity.data ? (
              activity.data.items?.length ? (
                <ul className="cs-activity">
                  {activity.data.items.map((event) => {
                    const story = activityStory(event);
                    return (
                      <li key={event.id} className={`cs-activity-item is-${story.tone}`}>
                        <Avatar name={story.who} size="sm" />
                        <span className="cs-activity-copy">
                          <span className="cs-activity-title">{story.title}</span>
                          <span className="cs-activity-detail">{story.detail}</span>
                          <time
                            dateTime={event.createdAt}
                            className="cs-activity-when"
                            title={formatMoment(event.createdAt, PHASE_A_TIME_ZONE)}
                          >
                            {relativeTime(event.createdAt, PHASE_A_TIME_ZONE) || formatMoment(event.createdAt, PHASE_A_TIME_ZONE)}
                          </time>
                        </span>
                      </li>
                    );
                  })}
                </ul>
              ) : <p className="cs-muted-block">No activity is recorded for this consultancy yet.</p>
            ) : null}
          </div>
        ) : null}
      </Sheet>
      <ConfirmDialog
        open={Boolean(confirm)}
        title="Revoke this assignment?"
        body={confirm ? `${confirm.name} will lose ${confirm.consultancy} on the next request.${confirm.reason === 'replace' ? ' Cancel to keep both people assigned.' : ''}` : ''}
        confirmLabel="Revoke assignment"
        busy={busy}
        onConfirm={revoke}
        onClose={() => { if (!busy) { setConfirm(null); restoreFocus(); } }}
      />
    </>
  );
}

function CreateConsultancyModal({ user, canAssign, onClose, onCreated, onOpenExisting }) {
  const [form, setForm] = useState({ name: '', status: 'active', notes: '' });
  const [errors, setErrors] = useState({});
  const [duplicate, setDuplicate] = useState(null);
  const [failure, setFailure] = useState(null);
  const [busy, setBusy] = useState(false);
  const [initial, setInitial] = useState([]);
  const [peopleQuery, setPeopleQuery] = useState('');
  const debouncedPeople = useDebouncedValue(peopleQuery, 300);
  const nameRef = useRef(null);
  const inFlight = useRef(false);
  const people = useCrmResource(
    canAssign,
    `create-people:${debouncedPeople}`,
    () => fetchPortalDirectory({ page: 1, limit: 8, q: debouncedPeople.trim() || undefined, status: 'active' })
  );
  const taken = new Set([String(user?.id || ''), ...initial.map((row) => row.id)]);
  const options = (people.data?.items || []).map((person) => personOption(person, {
    disabled: taken.has(String(person.id)),
    badge: String(person.id) === String(user?.id) ? 'You' : (taken.has(String(person.id)) ? 'Added' : null),
  }));

  function patch(next) {
    setForm((current) => ({ ...current, ...next }));
    if (next.name !== undefined) setDuplicate(null);
  }

  async function submit(event) {
    event.preventDefault();
    if (busy || inFlight.current) return;
    const checked = validateConsultancyForm(form);
    setErrors(checked.errors);
    setFailure(null);
    if (!checked.ok) {
      nameRef.current?.focus();
      return;
    }
    inFlight.current = true;
    setBusy(true);
    const result = await createPortalConsultancy(checked.body);
    if (!result.success) {
      inFlight.current = false;
      setBusy(false);
      if (result.status === 409 && result.code === 'duplicate_consultancy') {
        setDuplicate({ message: result.message || 'An active consultancy already uses this name.', existing: result.data?.consultancy || null });
        nameRef.current?.focus();
        return;
      }
      setFailure(applyCrmResult(result).notice);
      return;
    }
    const created = result.data?.consultancy;
    const results = [];
    for (const person of initial) {
      const assigned = applyCrmResult(await assignPortalConsultancy(person.id, created.id));
      results.push({ ok: assigned.ok, name: person.primary, message: assigned.notice?.message || '' });
    }
    inFlight.current = false;
    setBusy(false);
    onCreated(created, assignmentOutcome(results));
  }

  const notesLeft = NOTES_MAX - form.notes.length;
  return (
    <Sheet
      open
      variant="modal"
      title="Create consultancy"
      subtitle={<span>Creates a real record in the CRM. Duplicate active names are rejected.</span>}
      onClose={() => { if (!busy) onClose(); }}
      initialFocusRef={nameRef}
      footer={(
        <>
          <button type="button" className="cs-btn" onClick={onClose} disabled={busy}>Cancel</button>
          <button type="submit" form="cs-create-form" className="cs-btn is-primary" disabled={busy}>
            {busy ? 'Creating…' : 'Create consultancy'}
          </button>
        </>
      )}
    >
      <form id="cs-create-form" className="cs-form" onSubmit={submit} noValidate>
        {failure ? <Notice tone={failure.tone}>{failure.message}</Notice> : null}
        <div className="cs-field">
          <label className="cs-label" htmlFor="cs-new-name">Consultancy name <span aria-hidden="true">*</span></label>
          <input
            ref={nameRef}
            id="cs-new-name"
            className={`cs-input${errors.name || duplicate ? ' is-invalid' : ''}`}
            value={form.name}
            maxLength={200}
            required
            aria-invalid={Boolean(errors.name || duplicate)}
            aria-describedby="cs-new-name-msg"
            onChange={(event) => patch({ name: event.target.value })}
          />
          <p id="cs-new-name-msg" className={errors.name || duplicate ? 'cs-error' : 'cs-hint'}>
            {errors.name || duplicate?.message || '2–200 characters.'}
            {duplicate?.existing ? (
              <>
                {' '}
                <button type="button" className="cs-inline-link" onClick={() => onOpenExisting(duplicate.existing)}>Open the existing record</button>
              </>
            ) : null}
          </p>
        </div>
        <div className="cs-field">
          <label className="cs-label" htmlFor="cs-new-status">Status</label>
          <select id="cs-new-status" className="cs-input" value={form.status} onChange={(event) => patch({ status: event.target.value })}>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
        <div className="cs-field">
          <label className="cs-label" htmlFor="cs-new-notes">Notes <span className="cs-faint">(optional)</span></label>
          <textarea
            id="cs-new-notes"
            className={`cs-input cs-textarea${errors.notes ? ' is-invalid' : ''}`}
            rows={3}
            value={form.notes}
            maxLength={NOTES_MAX}
            aria-describedby="cs-new-notes-msg"
            onChange={(event) => patch({ notes: event.target.value })}
          />
          <p id="cs-new-notes-msg" className={errors.notes ? 'cs-error' : 'cs-hint'}>{errors.notes || `${notesLeft.toLocaleString()} characters left.`}</p>
        </div>

        <div className="cs-disclosure">
          <FiAlertTriangle size={14} aria-hidden="true" />
          <span>You will be assigned to this consultancy automatically, because the server assigns the CRM account that creates it.</span>
        </div>

        {canAssign ? (
          <div className="cs-field">
            <PersonCombobox
              label="Also assign (optional)"
              query={peopleQuery}
              onQuery={setPeopleQuery}
              loading={people.loading}
              error={people.notice?.message}
              options={options}
              onSelect={(option) => { setInitial((rows) => [...rows, option]); setPeopleQuery(''); }}
            />
            {initial.length ? (
              <ul className="cs-chips" aria-label="Staff to assign after creating">
                {initial.map((person) => (
                  <li key={person.id} className="cs-chip">
                    <Avatar name={person.primary} size="xs" />
                    <span className="cs-chip-text">{person.primary}</span>
                    <button
                      type="button"
                      className="cs-chip-x"
                      onClick={() => setInitial((rows) => rows.filter((row) => row.id !== person.id))}
                      aria-label={`Remove ${person.primary}`}
                    >
                      <FiX size={13} aria-hidden="true" />
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
            <p className="cs-hint">These are saved one by one after the consultancy is created. If any fail, the record still exists and you will see which ones to retry.</p>
          </div>
        ) : null}
      </form>
    </Sheet>
  );
}

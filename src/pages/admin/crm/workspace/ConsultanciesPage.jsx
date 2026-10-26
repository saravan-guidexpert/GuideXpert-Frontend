import { useMemo, useState } from 'react';
import { useCrmSession } from '../../../crm-app/useCrmSession';
import { useDebouncedValue } from '../../../../hooks/useDebouncedValue';
import { assignPortalConsultancy, fetchPortalDirectory, getPortalConsultancyOverview, listPortalActivity, revokePortalConsultancy } from '../../../../utils/crmSessionApi';
import { Banner, Pagination } from '../crmUi';
import {
  HIDDEN_METRIC,
  accountActions,
  applyCrmResult,
  applyFilterPatch,
  emptyCopy,
  formatTimestamp,
  metricText,
  overviewQuery,
  PHASE_A_TIME_ZONE,
  workspaceRouteDecision,
} from '../../../../utils/crmWorkspace';
import { useCrmResource } from './useCrmResource';
import { AccessNote, ConfirmDialog, DataTable, SelectField, SkeletonBlock, StatusBadge, TextField } from './workspaceUi';

const INITIAL = { page: 1, limit: 20, status: '', assignment: '' };

export default function ConsultanciesPage() {
  const { user } = useCrmSession();
  const decision = workspaceRouteDecision(user, 'consultancies');
  const actions = accountActions(user);
  const [filters, setFilters] = useState(INITIAL);
  const [reloadKey, setReloadKey] = useState(0);
  const [target, setTarget] = useState(null);
  const [userQuery, setUserQuery] = useState('');
  const debouncedUserQuery = useDebouncedValue(userQuery, 300);
  const [assigneeId, setAssigneeId] = useState('');
  const [confirm, setConfirm] = useState(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState(null);
  const query = useMemo(() => overviewQuery(filters), [filters]);
  const overview = useCrmResource(
    decision.state === 'allowed',
    `${reloadKey}:${JSON.stringify(query)}`,
    () => getPortalConsultancyOverview(query),
    true
  );
  const people = useCrmResource(
    decision.state === 'allowed' && actions.manageAssignment && Boolean(target),
    `assign:${debouncedUserQuery}`,
    () => fetchPortalDirectory({ page: 1, limit: 8, q: debouncedUserQuery, status: 'active' })
  );
  const shownTarget = target
    ? (overview.data?.items || []).find((row) => row.id === target.id) || target
    : null;
  const history = useCrmResource(
    decision.state === 'allowed' && Boolean(target?.id),
    `history:${target?.id || ''}:${reloadKey}`,
    () => listPortalActivity({ source: 'security', consultancyId: target.id, page: 1, limit: 20 })
  );

  function update(patch) {
    setFilters((current) => applyFilterPatch(current, patch));
  }

  async function assign() {
    if (!target || !assigneeId) return;
    setBusy(true);
    const result = await assignPortalConsultancy(assigneeId, target.id);
    const applied = applyCrmResult(result);
    setBusy(false);
    if (!applied.ok) {
      setNotice(applied.notice);
      return;
    }
    setNotice({ tone: 'success', message: 'Assignment saved.' });
    setAssigneeId('');
    setReloadKey((current) => current + 1);
  }

  async function revoke() {
    if (!confirm) return;
    setBusy(true);
    const result = await revokePortalConsultancy(confirm.userId, confirm.consultancyId);
    const applied = applyCrmResult(result);
    setBusy(false);
    setConfirm(null);
    if (!applied.ok) {
      setNotice(applied.notice);
      return;
    }
    setNotice({ tone: 'success', message: 'Assignment revoked.' });
    setReloadKey((current) => current + 1);
  }

  if (decision.state !== 'allowed') return <AccessNote>{decision.message}</AccessNote>;

  const unassigned = metricText(overview.data?.unassignedConsultancies, HIDDEN_METRIC);
  const columns = [
    { key: 'name', label: 'Consultancy', render: (row) => (
      <button type="button" className="font-medium text-[#003366] underline" onClick={() => { setTarget(row); setNotice(null); }}>{row.name}</button>
    ) },
    { key: 'status', label: 'Status', render: (row) => <StatusBadge kind="account" value={row.status} /> },
    { key: 'count', label: 'Active assignees', render: (row) => row.activeAssignees },
    { key: 'people', label: 'Assigned users', render: (row) => (
      row.assignees?.length
        ? row.assignees.map((person) => person.fullName || person.id).join(', ')
        : 'None'
    ) },
  ];

  return (
    <div className="gx-admin-page">
      <header className="gx-page-head">
        <div>
          <h2 className="gx-title">Consultancies</h2>
          <p className="gx-subtitle">Active assignees are CRM users whose assignment has not been revoked. The unassigned count can be organization-wide while this list stays limited to consultancies assigned to this account. Assignment history shows events this account is allowed to read.</p>
        </div>
      </header>
      <div className="gx-toolbar">
        <SelectField label="Status" value={filters.status} onChange={(status) => update({ status })}>
          <option value="">Any status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </SelectField>
        <SelectField label="Assignment" value={filters.assignment} onChange={(assignment) => update({ assignment })}>
          <option value="">Any consultancy</option>
          <option value="assigned">Has an active assignee</option>
          <option value="unassigned">No active assignee</option>
        </SelectField>
        {overview.data ? (
          <article className="gx-kpi">
            <p className="text-sm text-gray-500">Unassigned consultancies</p>
            <p className="text-2xl font-semibold text-[#003366]">{unassigned.text}</p>
            <p className="text-xs text-gray-500">{unassigned.detail || overview.data.unassignedMeaning || 'No active CRM assignment.'}</p>
          </article>
        ) : <div />}
      </div>
      {overview.notice ? <Banner tone={overview.notice.tone}>{overview.notice.message}</Banner> : null}
      {notice ? <Banner tone={notice.tone}>{notice.message}</Banner> : null}
      {overview.loading ? <SkeletonBlock className="h-40" /> : null}
      {overview.data ? (
        <>
          <DataTable columns={columns} rows={overview.data.items || []} empty={emptyCopy('consultancies')} />
          <Pagination page={overview.data.page} limit={overview.data.limit} total={overview.data.total} onPage={(page) => update({ page })} />
        </>
      ) : null}
      {shownTarget ? (
        <section className="gx-card">
          <h3 className="font-semibold text-[#003366]">{shownTarget.name}</h3>
          <p className="text-sm text-gray-500">{shownTarget.activeAssignees} active assignee{shownTarget.activeAssignees === 1 ? '' : 's'}</p>
          <ul className="mt-3 space-y-2">
            {(shownTarget.assignees || []).map((person) => (
              <li key={person.id} className="flex flex-wrap items-center justify-between gap-2 text-sm">
                <span>{person.fullName || person.id} · {person.role || 'Unknown role'}</span>
                {actions.manageAssignment ? (
                  <button
                    type="button"
                    className="rounded-lg border border-red-300 px-2 py-1 text-xs text-red-800"
                    onClick={() => setConfirm({ userId: person.id, consultancyId: shownTarget.id, name: person.fullName || 'This user', consultancy: shownTarget.name })}
                  >
                    Revoke
                  </button>
                ) : null}
              </li>
            ))}
            {shownTarget.assignees?.length ? null : <li className="text-sm text-gray-500">No active assignees are listed.</li>}
          </ul>
          <h4 className="mt-4 font-medium text-[#003366]">Assignment history</h4>
          <p className="text-xs text-gray-500">Events this account is allowed to read for this consultancy. This is not a complete organization history, and it does not measure who did the work.</p>
          {history.notice ? <div className="mt-2"><Banner tone={history.notice.tone}>{history.notice.message}</Banner></div> : null}
          {history.loading ? <SkeletonBlock className="mt-2 h-12" /> : null}
          {history.data ? (
            <ul className="mt-2 space-y-1">
              {(history.data.items || []).map((event) => (
                <li key={event.id} className="text-sm text-gray-600">
                  {formatTimestamp(event.createdAt, PHASE_A_TIME_ZONE)} · {event.summary || event.action}
                </li>
              ))}
              {history.data.items?.length ? null : <li className="text-sm text-gray-500">No assignment events are visible for this consultancy.</li>}
            </ul>
          ) : null}
          {actions.manageAssignment ? (
            <div className="mt-4 grid gap-3 md:grid-cols-[1fr_1fr_auto] md:items-end">
              <TextField label="Find an active CRM user" value={userQuery} onChange={setUserQuery} placeholder="Name or email" />
              <SelectField label="Assign" value={assigneeId} onChange={setAssigneeId}>
                <option value="">Choose a user</option>
                {(people.data?.items || []).map((person) => (
                  <option key={person.id} value={person.id}>{person.fullName}</option>
                ))}
              </SelectField>
              <button type="button" className="rounded-lg bg-[#003366] px-4 py-2 text-sm font-medium text-white disabled:opacity-60" disabled={busy || !assigneeId} onClick={assign}>
                Assign
              </button>
            </div>
          ) : (
            <p className="mt-3 text-sm text-gray-500">Assignment changes require CRM Access Management.</p>
          )}
          {people.notice ? <div className="mt-3"><Banner tone={people.notice.tone}>{people.notice.message}</Banner></div> : null}
        </section>
      ) : null}
      <ConfirmDialog
        open={Boolean(confirm)}
        title="Revoke this assignment?"
        body={confirm ? `${confirm.name} will lose ${confirm.consultancy} on the next request.` : ''}
        confirmLabel="Revoke assignment"
        busy={busy}
        onConfirm={revoke}
        onClose={() => { if (!busy) setConfirm(null); }}
      />
    </div>
  );
}

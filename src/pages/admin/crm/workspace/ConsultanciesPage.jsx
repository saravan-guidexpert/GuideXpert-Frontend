import { useMemo, useState } from 'react';
import { useCrmSession } from '../../../crm-app/useCrmSession';
import { useDebouncedValue } from '../../../../hooks/useDebouncedValue';
import { assignPortalConsultancy, fetchPortalDirectory, getPortalConsultancyOverview, revokePortalConsultancy } from '../../../../utils/crmSessionApi';
import { Banner, Pagination } from '../crmUi';
import {
  HIDDEN_METRIC,
  accountActions,
  applyCrmResult,
  applyFilterPatch,
  emptyCopy,
  metricText,
  overviewQuery,
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
    <div className="space-y-4">
      <p className="text-sm text-gray-500">Active assignees are CRM users whose assignment has not been revoked. A revoked assignment drops access on the next request.</p>
      <div className="grid gap-3 md:grid-cols-3">
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
          <article className="rounded-xl border border-gray-200 bg-white p-4">
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
        <section className="rounded-xl border border-gray-200 bg-white p-4">
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

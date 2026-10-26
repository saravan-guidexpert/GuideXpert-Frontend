import { useMemo, useState } from 'react';
import { useCrmSession } from '../../../crm-app/useCrmSession';
import { fetchPortalDirectory, fetchPortalUserSessions, revokeAllPortalUserSessions, revokePortalUserSession } from '../../../../utils/crmSessionApi';
import { Banner, Pagination } from '../crmUi';
import {
  accountActions,
  applyCrmResult,
  applyFilterPatch,
  directoryQuery,
  emptyCopy,
  formatTimestamp,
  observedSessionSpan,
  PHASE_A_TIME_ZONE,
  workspaceRouteDecision,
} from '../../../../utils/crmWorkspace';
import { useCrmResource } from './useCrmResource';
import { AccessNote, ConfirmDialog, DataTable, SelectField, SkeletonBlock, StatusBadge, TextField } from './workspaceUi';

const INITIAL = { page: 1, limit: 20, status: '', role: '', q: '', presence: '', assignment: '' };

export default function UsersPage() {
  const { user } = useCrmSession();
  const decision = workspaceRouteDecision(user, 'users');
  const actions = accountActions(user);
  const [filters, setFilters] = useState(INITIAL);
  const [selectedId, setSelectedId] = useState('');
  const [confirm, setConfirm] = useState(null);
  const [busy, setBusy] = useState(false);
  const [actionNotice, setActionNotice] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);
  const query = useMemo(() => directoryQuery(filters), [filters]);
  const directory = useCrmResource(
    decision.state === 'allowed',
    `${reloadKey}:${JSON.stringify(query)}`,
    () => fetchPortalDirectory(query),
    true
  );
  const sessions = useCrmResource(
    decision.state === 'allowed' && Boolean(selectedId),
    `${reloadKey}:sessions:${selectedId}`,
    () => fetchPortalUserSessions(selectedId, { page: 1, limit: 20 })
  );
  const selected = (directory.data?.items || []).find((row) => row.id === selectedId) || null;

  function update(patch) {
    setFilters((current) => applyFilterPatch(current, patch));
    setSelectedId('');
  }

  async function runConfirm() {
    if (!confirm) return;
    setBusy(true);
    const result = confirm.sessionId
      ? await revokePortalUserSession(confirm.userId, confirm.sessionId)
      : await revokeAllPortalUserSessions(confirm.userId);
    const applied = applyCrmResult(result);
    setBusy(false);
    setConfirm(null);
    if (!applied.ok) {
      setActionNotice(applied.notice);
      return;
    }
    setActionNotice({ tone: 'success', message: result.message || 'Sessions updated.' });
    setReloadKey((current) => current + 1);
  }

  if (decision.state !== 'allowed') return <AccessNote>{decision.message}</AccessNote>;

  const columns = [
    { key: 'name', label: 'Account', render: (row) => (
      <button type="button" className="text-left font-medium text-[#003366] underline" onClick={() => setSelectedId(row.id)}>{row.fullName}</button>
    ) },
    { key: 'status', label: 'Status', render: (row) => <StatusBadge kind="account" value={row.status} /> },
    { key: 'role', label: 'Role', render: (row) => row.roleLabel || row.role },
    { key: 'consultancies', label: 'Consultancies', render: (row) => {
      const names = (row.consultancies || []).map((item) => item.name).filter(Boolean);
      const extra = Math.max(0, (row.assignmentCount || 0) - names.length);
      return <span>{row.assignmentCount}{names.length ? ` · ${names.join(', ')}` : ''}{extra ? ` and ${extra} more` : ''}</span>;
    } },
    { key: 'presence', label: 'Presence', render: (row) => <StatusBadge kind="presence" value={row.presence?.state} /> },
    { key: 'seen', label: 'Last seen', render: (row) => formatTimestamp(row.presence?.lastSeenAt, PHASE_A_TIME_ZONE) },
    { key: 'activity', label: 'Last activity', render: (row) => formatTimestamp(row.lastActivityAt, PHASE_A_TIME_ZONE) },
  ];

  return (
    <div className="gx-admin-page">
      <header className="gx-page-head">
        <div>
          <h2 className="gx-title">CRM Users</h2>
          <p className="gx-subtitle">Directory of CRM accounts. Online is a valid session heartbeated within two minutes. Idle is a valid session with a stale heartbeat and is not working time. Offline is an active account with no valid session. Inactive and Invited are account statuses. Times use {PHASE_A_TIME_ZONE}. Creating accounts and changing roles stays in platform Admin, under CRM Access Management.</p>
        </div>
      </header>
      <div className="gx-toolbar">
        <TextField label="Search" value={filters.q} placeholder="Name, email, or username" onChange={(q) => update({ q })} />
        <SelectField label="Status" value={filters.status} onChange={(status) => update({ status })}>
          <option value="">Any status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="invited">Invited</option>
        </SelectField>
        <SelectField label="Role" value={filters.role} onChange={(role) => update({ role })}>
          <option value="">Any role</option>
          <option value="crm_administrator">CRM Administrator</option>
          <option value="crm_manager">CRM Manager</option>
          <option value="crm_viewer">CRM Viewer</option>
        </SelectField>
        <SelectField label="Presence" value={filters.presence} onChange={(presence) => update({ presence })}>
          <option value="">Any presence</option>
          <option value="online">Online</option>
          <option value="idle">Idle</option>
          <option value="offline">Offline</option>
          <option value="inactive">Inactive</option>
          <option value="invited">Invited</option>
        </SelectField>
        <SelectField label="Assignment" value={filters.assignment} onChange={(assignment) => update({ assignment })}>
          <option value="">Any assignment</option>
          <option value="assigned">Assigned</option>
          <option value="unassigned">Unassigned</option>
        </SelectField>
      </div>
      {directory.data ? <p className="text-sm text-gray-500">Accounts with no active consultancy: {directory.data.unassignedUsers}</p> : null}
      {directory.notice ? <Banner tone={directory.notice.tone}>{directory.notice.message}</Banner> : null}
      {actionNotice ? <Banner tone={actionNotice.tone}>{actionNotice.message}</Banner> : null}
      {directory.loading ? <SkeletonBlock className="h-40" /> : null}
      {directory.data ? (
        <>
          <DataTable columns={columns} rows={directory.data.items || []} empty={emptyCopy('users')} />
          <Pagination page={directory.data.page} limit={directory.data.limit} total={directory.data.total} onPage={(page) => update({ page })} />
        </>
      ) : null}
      {selected ? (
        <section className="gx-card" aria-live="polite">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="font-semibold text-[#003366]">{selected.fullName}</h3>
              <p className="text-sm text-gray-500">{selected.email} · {selected.permissionSummary}</p>
              <p className="text-sm text-gray-500">{selected.presence?.activeSessions ?? 0} active session{selected.presence?.activeSessions === 1 ? '' : 's'}</p>
            </div>
            {actions.revokeSession ? (
              <button
                type="button"
                className="rounded-lg border border-red-300 px-3 py-2 text-sm text-red-800"
                onClick={() => setConfirm({ userId: selected.id, name: selected.fullName })}
              >
                Revoke all sessions
              </button>
            ) : null}
          </div>
          {sessions.notice ? <div className="mt-3"><Banner tone={sessions.notice.tone}>{sessions.notice.message}</Banner></div> : null}
          {sessions.loading ? <SkeletonBlock className="mt-3 h-16" /> : null}
          {sessions.data ? (
            <ul className="mt-3 space-y-2">
              {(sessions.data.items || []).map((session) => (
                <li key={session.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-gray-50 px-3 py-2 text-sm">
                  <span>
                    <StatusBadge kind="presence" value={session.state === 'ended' ? 'offline' : session.state} />
                    <span className="ml-2">Seen {formatTimestamp(session.lastSeenAt, PHASE_A_TIME_ZONE)} · observed {observedSessionSpan(session).text}</span>
                    <span className="ml-2 text-xs">{observedSessionSpan(session).detail}</span>
                  </span>
                  {actions.revokeSession && (session.state === 'online' || session.state === 'idle') ? (
                    <button
                      type="button"
                      className="rounded-lg border border-gray-300 px-2 py-1 text-xs"
                      onClick={() => setConfirm({ userId: selected.id, sessionId: session.id, name: selected.fullName })}
                    >
                      Revoke session
                    </button>
                  ) : null}
                </li>
              ))}
              {sessions.data.items?.length ? null : <li className="text-sm text-gray-500">No sessions are stored for this account.</li>}
            </ul>
          ) : null}
        </section>
      ) : null}
      <ConfirmDialog
        open={Boolean(confirm)}
        title={confirm?.sessionId ? 'Revoke this session?' : 'Revoke every session?'}
        body={confirm?.sessionId
          ? `${confirm.name} will need to sign in again on that device.`
          : `${confirm?.name || 'This account'} will be signed out everywhere.`}
        confirmLabel="Revoke"
        busy={busy}
        onConfirm={runConfirm}
        onClose={() => { if (!busy) setConfirm(null); }}
      />
    </div>
  );
}

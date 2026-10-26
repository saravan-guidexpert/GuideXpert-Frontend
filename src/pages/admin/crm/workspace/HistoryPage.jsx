import { useMemo, useState } from 'react';
import { useCrmSession } from '../../../crm-app/useCrmSession';
import { getPortalAdmissionHistory, getPortalAssignmentHistory, getPortalDailyHistory } from '../../../../utils/crmSessionApi';
import { Banner, Pagination } from '../crmUi';
import {
  PHASE_A_TIME_ZONE,
  formatTimestamp,
  historyAdmissionScopeNote,
  historyDailyScopeNote,
  historyDefaultRange,
  historyEmptyMessage,
  historyQuery,
  workspaceRouteDecision,
} from '../../../../utils/crmWorkspace';
import { useCrmResource } from './useCrmResource';
import { AccessNote, DataTable, SelectField, SkeletonBlock, TextField } from './workspaceUi';

function actorLabel(actor) {
  if (!actor) return 'Actor was not stored';
  const series = actor.type === 'admin' ? 'Platform admin' : 'CRM user';
  return `${actor.name || actor.id} · ${series}`;
}

export default function HistoryPage() {
  const { user } = useCrmSession();
  const decision = workspaceRouteDecision(user, 'history');
  const [filters, setFilters] = useState(() => ({
    ...historyDefaultRange(),
    kind: '',
    assignment: '',
    fromStatus: '',
    toStatus: '',
    consultancyId: '',
    actorId: '',
    userId: '',
  }));
  const [pages, setPages] = useState({ admissions: 1, assignments: 1, daily: 1 });
  const built = useMemo(() => historyQuery({ ...filters, timeZone: PHASE_A_TIME_ZONE, page: 1 }), [filters]);

  function admissionQuery() {
    return historyQuery({ ...filters, timeZone: PHASE_A_TIME_ZONE, page: pages.admissions });
  }
  function assignmentQuery() {
    return historyQuery({ ...filters, timeZone: PHASE_A_TIME_ZONE, page: pages.assignments });
  }
  function dailyQuery() {
    return historyQuery({ ...filters, timeZone: PHASE_A_TIME_ZONE, page: pages.daily });
  }

  const admissions = useCrmResource(
    decision.state === 'allowed' && !built.error,
    `admissions:${built.error || JSON.stringify({ ...filters, page: pages.admissions })}`,
    () => getPortalAdmissionHistory(admissionQuery().query),
    true
  );
  const assignments = useCrmResource(
    decision.state === 'allowed' && !built.error,
    `assignments:${built.error || JSON.stringify({ ...filters, page: pages.assignments })}`,
    () => getPortalAssignmentHistory(assignmentQuery().query),
    true
  );
  const daily = useCrmResource(
    decision.state === 'allowed' && !built.error,
    `daily:${built.error || JSON.stringify({ ...filters, page: pages.daily })}`,
    () => getPortalDailyHistory(dailyQuery().query),
    true
  );

  function update(patch) {
    setFilters((current) => ({ ...current, ...patch }));
    setPages({ admissions: 1, assignments: 1, daily: 1 });
  }

  const admissionScope = historyAdmissionScopeNote(admissions.data);
  const dailyScope = historyDailyScopeNote(daily.data);

  if (decision.state !== 'allowed') return <AccessNote>{decision.message}</AccessNote>;

  const admissionColumns = [
    { key: 'when', label: 'When', render: (row) => formatTimestamp(row.at, PHASE_A_TIME_ZONE) },
    { key: 'kind', label: 'Record', render: (row) => (row.kind === 'initial' ? 'Initial status' : 'Status change') },
    { key: 'student', label: 'Student', render: (row) => row.studentName || 'Student name is not available' },
    { key: 'change', label: 'Status', render: (row) => (row.kind === 'initial' ? row.nextStatus : `${row.previousStatus} → ${row.nextStatus}`) },
    { key: 'actor', label: 'Actor', render: (row) => actorLabel(row.actor) },
  ];
  const assignmentColumns = [
    { key: 'consultancy', label: 'Consultancy', render: (row) => row.consultancyName || row.consultancyId },
    { key: 'user', label: 'Assigned user', render: (row) => row.userName || row.userId },
    { key: 'opened', label: 'Assigned', render: (row) => formatTimestamp(row.openedAt, PHASE_A_TIME_ZONE) },
    { key: 'by', label: 'Assigned by', render: (row) => actorLabel(row.openedBy) },
    { key: 'closed', label: 'Revoked', render: (row) => (row.revokedAt ? formatTimestamp(row.revokedAt, PHASE_A_TIME_ZONE) : 'Still active') },
    { key: 'state', label: 'State', render: (row) => row.state },
  ];
  const dailyColumns = [
    { key: 'day', label: 'Day', render: (row) => row.day },
    { key: 'action', label: 'Activity', render: (row) => row.action },
    { key: 'actor', label: 'Actor', render: (row) => actorLabel(row.actor) },
    { key: 'count', label: 'Recorded rows', render: (row) => row.count },
  ];

  return (
    <div className="gx-admin-page">
      <header className="gx-page-head">
        <div>
          <h2 className="gx-title">History</h2>
          <p className="gx-subtitle">
            Recorded admission-status changes, assignment intervals, and daily audit counts.
            Dates use {PHASE_A_TIME_ZONE}, which is pending business-owner confirmation. An omitted timezone is UTC on the server.
            This is not working time, productivity, or a conversion rate. Legacy students without an audit are omitted, not shown as zero.
          </p>
        </div>
      </header>
      <div className="gx-toolbar">
        <TextField label="From" type="date" value={filters.from} onChange={(from) => update({ from })} />
        <TextField label="To" type="date" value={filters.to} onChange={(to) => update({ to })} />
        <SelectField label="Admission record" value={filters.kind} onChange={(kind) => update({ kind })}>
          <option value="">Initial and changes</option>
          <option value="initial">Initial status only</option>
          <option value="transition">Status changes only</option>
        </SelectField>
        <SelectField label="Assignment state" value={filters.assignment} onChange={(assignment) => update({ assignment })}>
          <option value="">Active and revoked</option>
          <option value="active">Still active</option>
          <option value="revoked">Revoked in this window</option>
        </SelectField>
        <TextField label="From status" value={filters.fromStatus} onChange={(fromStatus) => update({ fromStatus })} placeholder="Previous status" />
        <TextField label="To status" value={filters.toStatus} onChange={(toStatus) => update({ toStatus })} placeholder="New status" />
        <TextField label="Consultancy id" value={filters.consultancyId} onChange={(consultancyId) => update({ consultancyId })} placeholder="Optional" />
        <TextField label="Actor id" value={filters.actorId} onChange={(actorId) => update({ actorId })} placeholder="Who recorded it" />
        <TextField label="Assigned user id" value={filters.userId} onChange={(userId) => update({ userId })} placeholder="Assignment interval" />
      </div>
      {built.error ? <Banner tone="warning">{built.error}</Banner> : null}

      <section className="gx-card">
        <h3 className="font-semibold text-[#003366]">Admission status</h3>
        <p className="mb-3 text-sm text-gray-500">
          {admissionScope}
          {admissionScope ? ' ' : null}
          A consultancy link, when filtered, is the student&apos;s current referral, not the consultancy on the day of the change.
        </p>
        {admissions.notice ? <Banner tone={admissions.notice.tone}>{admissions.notice.message}</Banner> : null}
        {admissions.loading ? <SkeletonBlock className="h-24" /> : null}
        {admissions.data ? (
          <>
            {admissions.data.truncated ? <Banner tone="warning">This window has more audits than the report loads. Narrow the dates. The omitted rows are not shown as zero.</Banner> : null}
            {admissions.data.unclassified ? <p className="mb-2 text-sm text-gray-500">{admissions.data.unclassified} audit {admissions.data.unclassified === 1 ? 'row does' : 'rows do'} not contain a readable admission status and {admissions.data.unclassified === 1 ? 'is' : 'are'} omitted.</p> : null}
            <DataTable columns={admissionColumns} rows={admissions.data.items || []} empty={historyEmptyMessage('admissions')} />
            <Pagination page={admissions.data.page} limit={admissions.data.limit} total={admissions.data.total} onPage={(admissionsPage) => setPages((current) => ({ ...current, admissions: admissionsPage }))} />
          </>
        ) : null}
      </section>

      <section className="gx-card">
        <h3 className="font-semibold text-[#003366]">Assignment intervals</h3>
        <p className="mb-3 text-sm text-gray-500">Each row is one stored assignment. A revoked row keeps its open and close times. This does not credit work to the earliest assignee.</p>
        {assignments.notice ? <Banner tone={assignments.notice.tone}>{assignments.notice.message}</Banner> : null}
        {assignments.loading ? <SkeletonBlock className="h-24" /> : null}
        {assignments.data ? (
          <>
            <DataTable columns={assignmentColumns} rows={assignments.data.items || []} empty={historyEmptyMessage('assignments')} />
            <Pagination page={assignments.data.page} limit={assignments.data.limit} total={assignments.data.total} onPage={(assignmentsPage) => setPages((current) => ({ ...current, assignments: assignmentsPage }))} />
          </>
        ) : null}
      </section>

      <section className="gx-card">
        <h3 className="font-semibold text-[#003366]">Daily recorded activity</h3>
        <p className="mb-3 text-sm text-gray-500">
          {dailyScope}
          {dailyScope ? ' ' : null}
          Days with no recorded rows are left out.
        </p>
        {daily.notice ? <Banner tone={daily.notice.tone}>{daily.notice.message}</Banner> : null}
        {daily.loading ? <SkeletonBlock className="h-24" /> : null}
        {daily.data ? (
          <>
            <DataTable columns={dailyColumns} rows={daily.data.items || []} empty={historyEmptyMessage('daily')} />
            <Pagination page={daily.data.page} limit={daily.data.limit} total={daily.data.total} onPage={(dailyPage) => setPages((current) => ({ ...current, daily: dailyPage }))} />
          </>
        ) : null}
      </section>
    </div>
  );
}

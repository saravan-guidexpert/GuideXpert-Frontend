import { useMemo, useState } from 'react';
import { useCrmSession } from '../../../crm-app/useCrmSession';
import { getPortalDayEndReport, getPortalFollowUpIntelligence, getPortalWorkload } from '../../../../utils/crmSessionApi';
import { Banner, Pagination } from '../crmUi';
import {
  PHASE_A_TIME_ZONE,
  completionRateText,
  dayEndQuery,
  formatTimestamp,
  historyDefaultRange,
  intelligenceEmptyMessage,
  intelligenceQuery,
  intelligenceScopeNote,
  workspaceRouteDecision,
} from '../../../../utils/crmWorkspace';
import { useCrmResource } from './useCrmResource';
import { AccessNote, CountChart, DataTable, MetricCard, SelectField, SkeletonBlock, TextField } from './workspaceUi';

const RATE_UNAVAILABLE = {
  text: '—',
  detail: 'No scheduled follow-ups form a denominator in this window.',
};

function actorLabel(actor) {
  if (!actor) return 'Actor was not stored';
  const series = actor.type === 'admin' ? 'Platform admin' : 'CRM user';
  return `${actor.name || actor.id} · ${series}`;
}

export default function IntelligencePage() {
  const { user } = useCrmSession();
  const decision = workspaceRouteDecision(user, 'intelligence');
  const initial = historyDefaultRange();
  const [filters, setFilters] = useState({
    ...initial,
    date: initial.to,
    bucket: '',
    event: '',
    consultancyId: '',
    userId: '',
  });
  const [pages, setPages] = useState({ followUps: 1, dayEnd: 1, workload: 1 });
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
    decision.state === 'allowed' && !followBuilt.error,
    `follow-ups:${followBuilt.error || JSON.stringify(followBuilt.query)}`,
    () => getPortalFollowUpIntelligence(followBuilt.query),
    true
  );
  const dayEnd = useCrmResource(
    decision.state === 'allowed' && !dayBuilt.error,
    `day-end:${dayBuilt.error || JSON.stringify(dayBuilt.query)}`,
    () => getPortalDayEndReport(dayBuilt.query),
    true
  );
  const workload = useCrmResource(
    decision.state === 'allowed' && !workBuilt.error,
    `workload:${workBuilt.error || JSON.stringify(workBuilt.query)}`,
    () => getPortalWorkload(workBuilt.query),
    true
  );

  function update(patch) {
    setFilters((current) => ({ ...current, ...patch }));
    setPages({ followUps: 1, dayEnd: 1, workload: 1 });
  }

  if (decision.state !== 'allowed') return <AccessNote>{decision.message}</AccessNote>;

  const followScope = intelligenceScopeNote(followUps.data);
  const dayScope = intelligenceScopeNote(dayEnd.data);
  const workScope = intelligenceScopeNote(workload.data);
  const rate = completionRateText(followUps.data?.current?.completion);
  const previousRate = completionRateText(followUps.data?.comparison?.completion);
  const trend = followUps.data?.completionTrend || [];
  const definitions = followUps.data?.metrics || workload.data?.metrics || [];

  const followColumns = [
    { key: 'consultancy', label: 'Consultancy', render: (row) => row.consultancyName || row.consultancyId },
    { key: 'status', label: 'Status', render: (row) => row.status },
    { key: 'when', label: 'Scheduled', render: (row) => (row.scheduledAt ? formatTimestamp(row.scheduledAt, PHASE_A_TIME_ZONE) : 'No due date') },
    { key: 'bucket', label: 'Classification', render: (row) => row.bucket || row.status },
    { key: 'actor', label: 'Recorded by', render: (row) => actorLabel(row.createdBy) },
  ];
  const dayColumns = [
    { key: 'when', label: 'When', render: (row) => formatTimestamp(row.at, PHASE_A_TIME_ZONE) },
    { key: 'kind', label: 'Record', render: (row) => row.kind },
    { key: 'who', label: 'Consultancy or student', render: (row) => row.consultancyName || row.studentName || 'Name was not stored' },
    { key: 'source', label: 'Source', render: (row) => row.source },
    { key: 'actor', label: 'Actor', render: (row) => actorLabel(row.actor) },
  ];
  const staffColumns = [
    { key: 'name', label: 'Staff', render: (row) => row.name || row.userId },
    { key: 'assigned', label: 'Assigned consultancies', render: (row) => row.assignedConsultancies },
    { key: 'open', label: 'Open follow-ups', render: (row) => row.openFollowUps },
    { key: 'overdue', label: 'Overdue now', render: (row) => row.overdueFollowUps },
    { key: 'admissions', label: 'Admission events', render: (row) => row.admissionsRecorded },
    { key: 'completed', label: 'Completions', render: (row) => row.followUpsCompleted },
    { key: 'rate', label: 'Completion rate', render: (row) => completionRateText(row.completion).text },
  ];

  return (
    <div className="gx-admin-page">
      <header className="gx-page-head">
        <div>
          <h2 className="gx-title">Intelligence</h2>
          <p className="gx-subtitle">
            Follow-ups, day-end records, and assigned workload. Dates use {PHASE_A_TIME_ZONE}, which is pending business-owner confirmation.
            An omitted timezone is UTC on the server. This is not working time, a productivity score, or a conversion rate.
            Staff are listed by name, not ranked by volume.
          </p>
        </div>
      </header>
      <div className="gx-toolbar">
        <TextField label="From" type="date" value={filters.from} onChange={(from) => update({ from })} />
        <TextField label="To" type="date" value={filters.to} onChange={(to) => update({ to })} />
        <TextField label="Reporting day" type="date" value={filters.date} onChange={(date) => update({ date })} />
        <SelectField label="Follow-up view" value={filters.bucket} onChange={(bucket) => update({ bucket })}>
          <option value="">Open commitments</option>
          <option value="overdue">Overdue now</option>
          <option value="due_today">Due today</option>
          <option value="upcoming">Upcoming</option>
          <option value="unscheduled">No due date</option>
          <option value="completed">Completed in range</option>
          <option value="cancelled">Cancelled in range</option>
        </SelectField>
        <SelectField label="Day-end records" value={filters.event} onChange={(event) => update({ event })}>
          <option value="">All recorded rows</option>
          <option value="admission">Admissions</option>
          <option value="assignment">Assignments</option>
          <option value="follow_up">Follow-ups</option>
          <option value="exception">Exceptions</option>
        </SelectField>
        <TextField label="Consultancy id" value={filters.consultancyId} onChange={(consultancyId) => update({ consultancyId })} placeholder="Optional" />
        <TextField label="CRM user id" value={filters.userId} onChange={(userId) => update({ userId })} placeholder="Optional" />
      </div>
      {followBuilt.error || dayBuilt.error ? <Banner tone="warning">{followBuilt.error || dayBuilt.error}</Banner> : null}

      <section className="gx-card">
        <h3 className="font-semibold text-[#003366]">Follow-up intelligence</h3>
        <p className="mb-3 text-sm text-gray-500">
          {followScope ? `${followScope} ` : null}
          Overdue means an open follow-up whose scheduled time is already past. A row with no due date is not overdue.
        </p>
        {followUps.notice ? <Banner tone={followUps.notice.tone}>{followUps.notice.message}</Banner> : null}
        {followUps.loading ? <SkeletonBlock className="h-24" /> : null}
        {followUps.data ? (
          <>
            {followUps.data.truncated ? <Banner tone="warning">This report stopped at its row cap. Narrow the dates. Omitted rows are not shown as zero.</Banner> : null}
            <div className="gx-kpis">
              <MetricCard label="Overdue now" value={followUps.data.current.overdue} hint="Open rows with a scheduled time before this report." />
              <MetricCard label="Due today" value={followUps.data.current.dueToday} hint="Still scheduled later today." />
              <MetricCard label="Upcoming" value={followUps.data.current.upcoming} hint="Scheduled after today." />
              <MetricCard label="No due date" value={followUps.data.current.unscheduled} hint="Open rows that are not counted as missed." />
              <MetricCard label="Completed in range" value={followUps.data.current.completedInRange} hint="completedAt falls in the selected dates." />
              <MetricCard
                label="Completion rate"
                value={rate.unavailable ? null : rate.text}
                whenNull={RATE_UNAVAILABLE}
                hint={rate.unavailable ? '' : rate.detail}
              />
            </div>
            {followUps.data.comparison ? (
              <p className="mb-3 text-sm text-gray-500">
                Previous window of the same length, ending when this range starts. It is not a calendar-aligned period.
                Completions: {followUps.data.comparison.completions}. Rate: {previousRate.text}.
              </p>
            ) : null}
            {trend.length ? <CountChart rows={trend} xKey="day" yKey="count" label="Completed follow-ups by day" /> : <p className="mb-3 text-sm text-gray-500">No recorded completions fall on these days. Missing days are not shown as zero.</p>}
            {followUps.data.overdueApproximation?.length ? (
              <DataTable
                columns={[
                  { key: 'day', label: 'Day', render: (row) => row.day },
                  { key: 'count', label: 'Approximate overdue', render: (row) => row.count },
                  { key: 'exact', label: 'Snapshot', render: () => 'Approximate' },
                ]}
                rows={followUps.data.overdueApproximation.map((row) => ({ ...row, id: row.day }))}
                empty="No reconstructed overdue day is shown."
              />
            ) : <p className="mb-3 text-sm text-gray-500">No reconstructed overdue day is shown. Days with no surviving due row are omitted, not drawn as zero.</p>}
            <DataTable columns={followColumns} rows={followUps.data.items || []} empty={intelligenceEmptyMessage('follow-ups')} />
            <Pagination page={followUps.data.page} limit={followUps.data.limit} total={followUps.data.total} onPage={(followPage) => setPages((current) => ({ ...current, followUps: followPage }))} />
          </>
        ) : null}
      </section>

      <section className="gx-card">
        <h3 className="font-semibold text-[#003366]">Day-end report</h3>
        <p className="mb-3 text-sm text-gray-500">
          {dayScope ? `${dayScope} ` : null}
          Outstanding and overdue figures are reconstructed from surviving rows. No end-of-day snapshot is stored.
        </p>
        {dayEnd.notice ? <Banner tone={dayEnd.notice.tone}>{dayEnd.notice.message}</Banner> : null}
        {dayEnd.loading ? <SkeletonBlock className="h-24" /> : null}
        {dayEnd.data ? (
          <>
            <div className="gx-kpis">
              <MetricCard label="New students" value={dayEnd.data.summary.studentsCreated} hint="student.created audits on this day." />
              <MetricCard label="Admission changes" value={dayEnd.data.summary.admissionChanges} hint="Recorded status changes. Not a conversion rate." />
              <MetricCard label="Assignments opened" value={dayEnd.data.summary.assignmentsOpened} hint="Assignment rows created this day." />
              <MetricCard label="Assignments revoked" value={dayEnd.data.summary.assignmentsRevoked} hint="Revoked rows stay in the report." />
              <MetricCard label="Follow-ups completed" value={dayEnd.data.summary.followUpsCompleted} hint="completedAt on this day." />
              <MetricCard
                label="Outstanding at day end"
                value={dayEnd.data.summary.outstanding?.count}
                whenNull={{ text: '—', detail: 'No follow-up rows exist to reconstruct this day.' }}
                hint="Approximate. Not an end-of-day snapshot."
              />
              <MetricCard
                label="Overdue at day end"
                value={dayEnd.data.summary.overdue?.count}
                whenNull={{ text: '—', detail: 'No follow-up rows exist to reconstruct this day.' }}
                hint="Approximate. A row with no due date is not overdue."
              />
            </div>
            <DataTable columns={dayColumns} rows={dayEnd.data.items || []} empty={intelligenceEmptyMessage('day-end')} />
            <Pagination page={dayEnd.data.page} limit={dayEnd.data.limit} total={dayEnd.data.total} onPage={(dayPage) => setPages((current) => ({ ...current, dayEnd: dayPage }))} />
          </>
        ) : null}
      </section>

      <section className="gx-card">
        <h3 className="font-semibold text-[#003366]">Staff and workload</h3>
        <p className="mb-3 text-sm text-gray-500">
          {workScope ? `${workScope} ` : null}
          Assigned consultancies are current assignments. Open follow-ups on a shared consultancy are counted for every current assignee. Admission events are recorded changes, not outcomes.
        </p>
        {workload.notice ? <Banner tone={workload.notice.tone}>{workload.notice.message}</Banner> : null}
        {workload.loading ? <SkeletonBlock className="h-24" /> : null}
        {workload.data ? (
          <>
            <DataTable columns={staffColumns} rows={(workload.data.items || []).map((row) => ({ ...row, id: row.userId }))} empty={intelligenceEmptyMessage('workload')} />
            <Pagination page={workload.data.page} limit={workload.data.limit} total={workload.data.total} onPage={(workPage) => setPages((current) => ({ ...current, workload: workPage }))} />
          </>
        ) : null}
      </section>

      {definitions.length ? (
        <section className="gx-card">
          <h3 className="font-semibold text-[#003366]">Metric definitions</h3>
          <ul className="space-y-3 text-sm text-gray-600">
            {definitions.map((metric) => (
              <li key={metric.id}>
                <strong>{metric.id}</strong>
                {'. '}
                {metric.formula}
                {' '}
                {metric.denominator}
                {' '}
                {metric.limitations}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

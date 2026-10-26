import { Link } from 'react-router-dom';
import { useCrmSession } from '../../../crm-app/useCrmSession';
import { getPortalActivitySummary, getPortalOperations } from '../../../../utils/crmSessionApi';
import { Banner } from '../crmUi';
import {
  HIDDEN_METRIC,
  PHASE_A_TIME_ZONE,
  RANGE_METRIC,
  WORKSPACE_HOME,
  admissionChartRows,
  formatTimestamp,
  operationsQuery,
  populationLabel,
  volumeChartRows,
  workspaceRouteDecision,
} from '../../../../utils/crmWorkspace';
import { useCrmResource } from './useCrmResource';
import { AccessNote, CountChart, MetricCard, SkeletonBlock } from './workspaceUi';

export default function OverviewPage() {
  const { user } = useCrmSession();
  const decision = workspaceRouteDecision(user, 'overview');
  const timeZone = PHASE_A_TIME_ZONE;
  const built = operationsQuery({ period: '30', timeZone, page: 1, limit: 8 });
  const operations = useCrmResource(
    decision.state === 'allowed' && !built.error,
    `operations:${JSON.stringify(built.query || {})}`,
    () => getPortalOperations(built.query)
  );
  const summary = useCrmResource(
    decision.state === 'allowed',
    'summary:10',
    () => getPortalActivitySummary({ limit: 10 })
  );

  if (decision.state !== 'allowed') return <AccessNote>{decision.message}</AccessNote>;

  const data = operations.data;
  const current = data?.current;
  const presence = data?.presence;
  return (
    <div className="gx-admin-page">
      <header className="gx-page-head">
        <div>
          <h2 className="gx-title">Overview</h2>
          <p className="gx-subtitle">Last 30 days in {timeZone}. Current totals ignore that window. Idle is a stale session, not working time. {timeZone} is the reporting zone pending business-owner confirmation. Follow-up totals, conversion rates, and staff rankings are not part of this response.</p>
        </div>
      </header>
      {operations.notice ? <Banner tone={operations.notice.tone}>{operations.notice.message}</Banner> : null}
      {operations.loading ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <SkeletonBlock /><SkeletonBlock /><SkeletonBlock /><SkeletonBlock />
        </div>
      ) : null}
      {current ? (
        <>
          <section className="gx-kpis" aria-label="Current totals">
            <MetricCard label="Consultancies" value={current.consultancies?.total} whenNull={HIDDEN_METRIC} hint={`${current.consultancies?.active ?? 0} active · ${current.consultancies?.inactive ?? 0} inactive`} />
            <MetricCard label="Students" value={current.students?.total} whenNull={HIDDEN_METRIC} hint={`${current.students?.withCurrentReferral ?? 0} with a current referral`} />
            <MetricCard label="Referrals on file" value={current.referrals?.total} whenNull={HIDDEN_METRIC} hint="One current referral row per student" />
            <MetricCard label="New referrals" value={data.period?.newReferrals} whenNull={HIDDEN_METRIC} hint={data.range?.label || 'Selected period'} />
          </section>
          <section className="gx-kpis" aria-label="Current totals">
            <MetricCard label="Previous period" value={data.period?.previousNewReferrals} whenNull={RANGE_METRIC} hint="Same length, immediately before" />
            <MetricCard label="Unassigned consultancies" value={data.consultancies?.unassigned} whenNull={HIDDEN_METRIC} hint="No active CRM assignment" />
            {presence ? (
              <>
                <MetricCard label="Online" value={presence.online} whenNull={HIDDEN_METRIC} hint="Valid session, heartbeat within two minutes" />
                <MetricCard label="Idle" value={presence.idle} whenNull={HIDDEN_METRIC} hint="Valid session, stale heartbeat. Not working time." />
                <MetricCard label="Offline" value={presence.offline} whenNull={HIDDEN_METRIC} hint="Active account, no valid session" />
                <MetricCard label="Inactive" value={presence.inactive} whenNull={HIDDEN_METRIC} hint="Account status, not a heartbeat" />
                <MetricCard label="Invited" value={presence.invited} whenNull={HIDDEN_METRIC} hint="Account status, not a heartbeat" />
              </>
            ) : (
              <div className="sm:col-span-2">
                <AccessNote>Presence counts are hidden for this account. A hidden count is not a zero.</AccessNote>
              </div>
            )}
          </section>
          <div className="gx-pair">
            <section className="gx-card">
              <h3 className="font-semibold text-[#003366]">Referral trend</h3>
              <p className="mb-3 text-sm text-gray-500">Referrals whose referredAt falls in the last 30 days.</p>
              <CountChart rows={volumeChartRows(data.period?.volume)} xKey="label" yKey="count" label="Referral trend" />
            </section>
            <section className="gx-card">
              <h3 className="font-semibold text-[#003366]">Admission status</h3>
              <p className="mb-3 text-sm text-gray-500">{populationLabel(current.admissionStatus?.population)} Earlier statuses are not stored.</p>
              <CountChart rows={admissionChartRows(current.admissionStatus)} xKey="status" yKey="count" label="Current admission status" />
            </section>
          </div>
          <section className="gx-card">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h3 className="font-semibold text-[#003366]">{data.aggregateScope === 'module' && data.scope === 'assigned' ? 'Assigned consultancies' : 'Consultancy summary'}</h3>
              <Link className="text-sm text-[#003366] underline" to={`${WORKSPACE_HOME}/consultancies`}>Open consultancies</Link>
            </div>
            <div className="gx-table-wrap is-static">
              <table className="gx-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Status</th>
                    <th>Students</th>
                    <th>New referrals</th>
                    <th>Active assignees</th>
                  </tr>
                </thead>
                <tbody>
                  {(data.consultancies?.items || []).map((row) => (
                    <tr key={row.id}>
                      <td>{row.name}</td>
                      <td>{row.status}</td>
                      <td>{row.students}</td>
                      <td>{row.newReferrals}</td>
                      <td>{row.activeAssignees}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      ) : null}
      <section className="gx-card">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h3 className="font-semibold text-[#003366]">Recent activity</h3>
          <Link className="text-sm text-[#003366] underline" to={`${WORKSPACE_HOME}/activity`}>Open activity</Link>
        </div>
        {summary.notice ? <Banner tone={summary.notice.tone}>{summary.notice.message}</Banner> : null}
        {summary.loading ? <SkeletonBlock className="h-16" /> : null}
        {summary.data ? (
          <ul className="space-y-2">
            {(summary.data.recent || []).map((event) => (
              <li key={`${event.source}:${event.id}`} className="flex flex-wrap items-baseline justify-between gap-2 border-t border-gray-100 py-2 text-sm">
                <span>{event.summary || event.action}</span>
                <time className="text-xs text-gray-500" dateTime={event.createdAt}>{formatTimestamp(event.createdAt, PHASE_A_TIME_ZONE)}</time>
              </li>
            ))}
            {summary.data.recent?.length ? null : <li className="text-sm text-gray-500">No recent activity is visible.</li>}
          </ul>
        ) : null}
        {summary.data && summary.data.accountEventsIncluded === false ? (
          <p className="mt-3 text-xs text-gray-500">Sign-in and account events are hidden for this account.</p>
        ) : null}
      </section>
    </div>
  );
}

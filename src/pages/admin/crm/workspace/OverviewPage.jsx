import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useCrmSession } from '../../../crm-app/useCrmSession';
import { getPortalActivitySummary, getPortalOperations } from '../../../../utils/crmSessionApi';
import { browserTimeZone } from '../crmProductionQuery';
import { Banner } from '../crmUi';
import {
  HIDDEN_METRIC,
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
  const timeZone = useMemo(() => browserTimeZone(), []);
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
    <div className="space-y-4">
      <p className="text-sm text-gray-500">Last 30 days in {timeZone}. Current totals ignore that window. Referral totals count events inside it.</p>
      {operations.notice ? <Banner tone={operations.notice.tone}>{operations.notice.message}</Banner> : null}
      {operations.loading ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <SkeletonBlock /><SkeletonBlock /><SkeletonBlock /><SkeletonBlock />
        </div>
      ) : null}
      {current ? (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <MetricCard label="Consultancies" value={current.consultancies?.total} whenNull={HIDDEN_METRIC} hint={`${current.consultancies?.active ?? 0} active · ${current.consultancies?.inactive ?? 0} inactive`} />
            <MetricCard label="Students" value={current.students?.total} whenNull={HIDDEN_METRIC} hint={`${current.students?.withCurrentReferral ?? 0} with a current referral`} />
            <MetricCard label="Referrals on file" value={current.referrals?.total} whenNull={HIDDEN_METRIC} hint="One current referral row per student" />
            <MetricCard label="New referrals" value={data.period?.newReferrals} whenNull={HIDDEN_METRIC} hint={data.range?.label || 'Selected period'} />
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <MetricCard label="Previous period" value={data.period?.previousNewReferrals} whenNull={RANGE_METRIC} hint="Same length, immediately before" />
            <MetricCard label="Unassigned consultancies" value={data.consultancies?.unassigned} whenNull={HIDDEN_METRIC} hint="No active CRM assignment" />
            {presence ? (
              <>
                <MetricCard label="Online now" value={presence.online} whenNull={HIDDEN_METRIC} hint="Heartbeat within two minutes" />
                <MetricCard label="Idle / offline" value={`${presence.idle} / ${presence.offline}`} whenNull={HIDDEN_METRIC} hint="Current sessions, not period events" />
              </>
            ) : (
              <div className="sm:col-span-2">
                <AccessNote>Presence counts are hidden for this account. A hidden count is not a zero.</AccessNote>
              </div>
            )}
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <section className="rounded-xl border border-gray-200 bg-white p-4">
              <h3 className="font-semibold text-[#003366]">Referral trend</h3>
              <p className="mb-3 text-sm text-gray-500">Referrals whose referredAt falls in the last 30 days.</p>
              <CountChart rows={volumeChartRows(data.period?.volume)} xKey="label" yKey="count" label="Referral trend" />
            </section>
            <section className="rounded-xl border border-gray-200 bg-white p-4">
              <h3 className="font-semibold text-[#003366]">Admission status</h3>
              <p className="mb-3 text-sm text-gray-500">{populationLabel(current.admissionStatus?.population)} Earlier statuses are not stored.</p>
              <CountChart rows={admissionChartRows(current.admissionStatus)} xKey="status" yKey="count" label="Current admission status" />
            </section>
          </div>
          <section className="rounded-xl border border-gray-200 bg-white p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h3 className="font-semibold text-[#003366]">Consultancy summary</h3>
              <Link className="text-sm text-[#003366] underline" to={`${WORKSPACE_HOME}/consultancies`}>Open consultancies</Link>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="text-xs uppercase text-gray-500">
                  <tr>
                    <th className="py-2 pr-3">Name</th>
                    <th className="py-2 pr-3">Status</th>
                    <th className="py-2 pr-3">Students</th>
                    <th className="py-2 pr-3">New referrals</th>
                    <th className="py-2">Active assignees</th>
                  </tr>
                </thead>
                <tbody>
                  {(data.consultancies?.items || []).map((row) => (
                    <tr key={row.id} className="border-t border-gray-100">
                      <td className="py-2 pr-3">{row.name}</td>
                      <td className="py-2 pr-3">{row.status}</td>
                      <td className="py-2 pr-3">{row.students}</td>
                      <td className="py-2 pr-3">{row.newReferrals}</td>
                      <td className="py-2">{row.activeAssignees}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      ) : null}
      <section className="rounded-xl border border-gray-200 bg-white p-4">
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
                <time className="text-xs text-gray-500" dateTime={event.createdAt}>{formatTimestamp(event.createdAt)}</time>
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

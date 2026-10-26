import { useMemo, useState } from 'react';
import { useCrmSession } from '../../../crm-app/useCrmSession';
import { getPortalOperations } from '../../../../utils/crmSessionApi';
import { Banner, Pagination } from '../crmUi';
import {
  HIDDEN_METRIC,
  PHASE_A_TIME_ZONE,
  RANGE_METRIC,
  admissionChartRows,
  applyFilterPatch,
  consultancyComparisonRows,
  emptyCopy,
  metricText,
  operationsQuery,
  populationLabel,
  volumeChartRows,
  workspaceRouteDecision,
} from '../../../../utils/crmWorkspace';
import { useCrmResource } from './useCrmResource';
import { AccessNote, CountChart, DataTable, MetricCard, PeriodControls, SkeletonBlock } from './workspaceUi';

export default function AnalyticsPage() {
  const { user } = useCrmSession();
  const decision = workspaceRouteDecision(user, 'analytics');
  const timeZone = PHASE_A_TIME_ZONE;
  const [filters, setFilters] = useState({ period: '30', from: '', to: '', page: 1, limit: 20 });
  const built = useMemo(
    () => operationsQuery({ ...filters, timeZone }),
    [filters, timeZone]
  );
  const operations = useCrmResource(
    decision.state === 'allowed' && !built.error,
    built.error || JSON.stringify(built.query),
    () => getPortalOperations(built.query)
  );

  if (decision.state !== 'allowed') return <AccessNote>{decision.message}</AccessNote>;

  const data = operations.data;
  const previous = metricText(data?.period?.previousNewReferrals, RANGE_METRIC);
  const columns = [
    { key: 'name', label: 'Consultancy', render: (row) => row.name },
    { key: 'students', label: 'Students now', render: (row) => row.students },
    { key: 'new', label: 'New referrals', render: (row) => row.newReferrals },
    { key: 'previous', label: 'Previous window', render: (row) => (row.previousNewReferrals == null ? '—' : row.previousNewReferrals) },
    { key: 'assignees', label: 'Active assignees', render: (row) => row.activeAssignees },
  ];

  return (
    <div className="gx-admin-page">
      <header className="gx-page-head">
        <div>
          <h2 className="gx-title">Operations</h2>
          <p className="gx-subtitle">Comparisons use referredAt in the selected window, in {timeZone}, counted at the referral’s current consultancy. Admission charts use the current status only. {timeZone} is pending business-owner confirmation. This is not a staff ranking and does not show conversion rates.</p>
        </div>
      </header>
      <PeriodControls
        period={filters.period}
        from={filters.from}
        to={filters.to}
        onPeriod={(period) => setFilters((current) => applyFilterPatch(current, { period }))}
        onFrom={(from) => setFilters((current) => applyFilterPatch(current, { from }))}
        onTo={(to) => setFilters((current) => applyFilterPatch(current, { to }))}
      />
      {built.error ? <Banner tone="warning">{built.error}</Banner> : null}
      {operations.notice ? <Banner tone={operations.notice.tone}>{operations.notice.message}</Banner> : null}
      {operations.loading ? <SkeletonBlock className="h-40" /> : null}
      {data ? (
        <>
          <section className="gx-kpis" aria-label="Operations totals">
            <MetricCard label="New referrals" value={data.period?.newReferrals} whenNull={HIDDEN_METRIC} hint={data.range?.label} />
            <MetricCard label="Previous window" value={data.period?.previousNewReferrals} whenNull={RANGE_METRIC} hint={previous.detail || 'Same length, immediately before'} />
            <MetricCard label="Students now" value={data.current?.students?.total} whenNull={HIDDEN_METRIC} hint="Current state, not the selected period" />
            <MetricCard label="Unassigned consultancies" value={data.consultancies?.unassigned} whenNull={HIDDEN_METRIC} hint="Current state" />
          </section>
          <section className="gx-card">
            <h3 className="font-semibold text-[#003366]">Referral trend</h3>
            <p className="mb-3 text-sm text-gray-500">{data.period?.volume?.grain === 'day' ? 'One bar per day.' : 'One bar per month.'}</p>
            <CountChart rows={volumeChartRows(data.period?.volume)} xKey="label" yKey="count" label="Referral trend" />
          </section>
          <section className="gx-card">
            <h3 className="font-semibold text-[#003366]">Current admission status</h3>
            <p className="mb-3 text-sm text-gray-500">{populationLabel(data.current?.admissionStatus?.population)} This is not a history of status changes.</p>
            <CountChart rows={admissionChartRows(data.current?.admissionStatus)} xKey="status" yKey="count" label="Current admission status" />
          </section>
          <section className="gx-card">
            <h3 className="font-semibold text-[#003366]">Consultancy comparison</h3>
            <p className="text-sm text-gray-500">New referrals on this page, for the selected window.</p>
            <CountChart rows={consultancyComparisonRows(data.consultancies?.items)} xKey="name" yKey="referrals" label="Consultancy referral comparison" />
            <DataTable columns={columns} rows={data.consultancies?.items || []} empty={emptyCopy('comparison')} />
            <Pagination
              page={data.consultancies?.page || 1}
              limit={data.consultancies?.limit || filters.limit}
              total={data.consultancies?.total || 0}
              onPage={(page) => setFilters((current) => ({ ...current, page }))}
            />
          </section>
          {Array.isArray(data.limitations) ? (
            <ul className="list-disc space-y-1 pl-5 text-xs text-gray-500">
              {data.limitations.map((item) => <li key={item}>{item}</li>)}
            </ul>
          ) : null}
        </>
      ) : null}
    </div>
  );
}

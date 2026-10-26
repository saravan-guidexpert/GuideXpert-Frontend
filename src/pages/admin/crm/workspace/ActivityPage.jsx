import { useMemo, useState } from 'react';
import { useCrmSession } from '../../../crm-app/useCrmSession';
import { getPortalActivity, getPortalActivitySummary, listPortalActivity } from '../../../../utils/crmSessionApi';
import { Banner, Pagination } from '../crmUi';
import {
  HIDDEN_METRIC,
  activityActionOptions,
  activityListQuery,
  activitySummaryQuery,
  applyFilterPatch,
  emptyCopy,
  formatTimestamp,
  isObjectId,
  metricText,
  PHASE_A_TIME_ZONE,
  workspaceRouteDecision,
} from '../../../../utils/crmWorkspace';
import { useCrmResource } from './useCrmResource';
import { AccessNote, ChangeList, DataTable, SelectField, SkeletonBlock, TextField } from './workspaceUi';

const INITIAL = { page: 1, limit: 20, source: 'both', action: '', from: '', to: '', q: '' };

export default function ActivityPage() {
  const { user } = useCrmSession();
  const decision = workspaceRouteDecision(user, 'activity');
  const [filters, setFilters] = useState(INITIAL);
  const [selected, setSelected] = useState(null);
  const built = useMemo(() => activityListQuery({ ...filters, timeZone: PHASE_A_TIME_ZONE }), [filters]);
  const summaryBuilt = useMemo(() => activitySummaryQuery({ ...filters, timeZone: PHASE_A_TIME_ZONE }), [filters]);
  const list = useCrmResource(
    decision.state === 'allowed' && !built.error,
    `list:${built.error || JSON.stringify(built.query)}`,
    () => listPortalActivity(built.query),
    true
  );
  const summary = useCrmResource(
    decision.state === 'allowed' && !summaryBuilt.error,
    `summary:${summaryBuilt.error || JSON.stringify(summaryBuilt.query)}`,
    () => getPortalActivitySummary(summaryBuilt.query)
  );
  const detail = useCrmResource(
    decision.state === 'allowed' && isObjectId(selected?.id) && (selected?.source === 'business' || selected?.source === 'security'),
    `detail:${selected?.source || ''}:${selected?.id || ''}`,
    () => getPortalActivity(selected.source, selected.id)
  );

  function update(patch) {
    setFilters((current) => applyFilterPatch(current, patch));
    setSelected(null);
  }

  if (decision.state !== 'allowed') return <AccessNote>{decision.message}</AccessNote>;

  const failed = metricText(summary.data?.security?.signInFailed, HIDDEN_METRIC);
  const inactive = metricText(summary.data?.security?.signInInactive, HIDDEN_METRIC);
  const revoked = metricText(summary.data?.security?.sessionRevocations, HIDDEN_METRIC);
  const event = detail.data?.event;
  const columns = [
    { key: 'when', label: 'When', render: (row) => formatTimestamp(row.createdAt, PHASE_A_TIME_ZONE) },
    { key: 'source', label: 'Source', render: (row) => row.source },
    { key: 'summary', label: 'Event', render: (row) => (
      <button type="button" className="text-left text-[#003366] underline" onClick={() => setSelected({ source: row.source, id: row.id })}>
        {row.summary || row.action}
      </button>
    ) },
    { key: 'actor', label: 'Actor', render: (row) => row.actorType || 'Recorded without an actor' },
  ];

  return (
    <div className="gx-admin-page">
      <header className="gx-page-head">
        <div>
          <h2 className="gx-title">Activity</h2>
          <p className="gx-subtitle">Business and security events that this account is allowed to read. Date filters use {PHASE_A_TIME_ZONE} calendar days. That zone is pending business-owner confirmation. Outcome is not stored, so it is not shown.</p>
        </div>
      </header>
      <div className="gx-toolbar">
        <SelectField label="Source" value={filters.source} onChange={(source) => update({ source })}>
          <option value="both">Business and security</option>
          <option value="business">Business</option>
          <option value="security">Security</option>
        </SelectField>
        <SelectField label="Action" value={filters.action} onChange={(action) => update({ action })}>
          <option value="">Any recorded action</option>
          {activityActionOptions().map((action) => <option key={action} value={action}>{action}</option>)}
        </SelectField>
        <TextField label="From" type="date" value={filters.from} onChange={(from) => update({ from })} />
        <TextField label="To" type="date" value={filters.to} onChange={(to) => update({ to })} />
        <TextField label="Search" value={filters.q} placeholder="Action or reason" onChange={(q) => update({ q })} />
      </div>
      {built.error ? <Banner tone="warning">{built.error}</Banner> : null}
      {summary.data ? (
        <section className="gx-kpis" aria-label="Activity totals">
          <article className="gx-kpi"><span className="gx-kpi-top"><em>Business events</em></span><strong>{summary.data.business?.total ?? 0}</strong></article>
          <article className="gx-kpi"><span className="gx-kpi-top"><em>Failed sign-ins</em></span><strong>{failed.text}</strong><small>{failed.detail}</small></article>
          <article className="gx-kpi"><span className="gx-kpi-top"><em>Inactive sign-ins</em></span><strong>{inactive.text}</strong><small>{inactive.detail}</small></article>
          <article className="gx-kpi"><span className="gx-kpi-top"><em>Session revocations</em></span><strong>{revoked.text}</strong><small>{revoked.detail}</small></article>
        </section>
      ) : null}
      {summary.notice ? <Banner tone={summary.notice.tone}>{summary.notice.message}</Banner> : null}
      {list.notice ? <Banner tone={list.notice.tone}>{list.notice.message}</Banner> : null}
      {list.loading ? <SkeletonBlock className="h-40" /> : null}
      {list.data ? (
        <>
          <DataTable
            columns={columns}
            rows={(list.data.items || []).map((row) => ({ ...row, rowKey: `${row.source}:${row.id}` }))}
            empty={emptyCopy('activity')}
          />
          <Pagination page={list.data.page} limit={list.data.limit} total={list.data.total} onPage={(page) => setFilters((current) => ({ ...current, page }))} />
        </>
      ) : null}
      {selected ? (
        <section className="gx-card">
          {detail.loading ? <SkeletonBlock className="h-24" /> : null}
          {detail.notice ? <Banner tone={detail.notice.tone}>{detail.notice.message}</Banner> : null}
          {event ? (
            <div className="space-y-3">
              <div>
                <p className="text-xs uppercase tracking-wide text-gray-500">{event.source} · {event.category}</p>
                <h3 className="text-lg font-semibold text-[#003366]">{event.summary || event.action}</h3>
                <p className="text-sm text-gray-500">{formatTimestamp(event.createdAt, PHASE_A_TIME_ZONE)} · {event.action}</p>
              </div>
              {event.reason ? <p className="text-sm text-gray-700">Reason: {event.reason}</p> : null}
              <ChangeList changes={event.changes} />
            </div>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}

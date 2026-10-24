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
  const built = useMemo(() => activityListQuery(filters), [filters]);
  const summaryBuilt = useMemo(() => activitySummaryQuery(filters), [filters]);
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
    { key: 'when', label: 'When', render: (row) => formatTimestamp(row.createdAt) },
    { key: 'source', label: 'Source', render: (row) => row.source },
    { key: 'summary', label: 'Event', render: (row) => (
      <button type="button" className="text-left text-[#003366] underline" onClick={() => setSelected({ source: row.source, id: row.id })}>
        {row.summary || row.action}
      </button>
    ) },
    { key: 'actor', label: 'Actor', render: (row) => row.actorType || 'Recorded without an actor' },
  ];

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-500">Business and security events that this account is allowed to read. Outcome is not stored, so it is not shown.</p>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
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
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <article className="rounded-xl border border-gray-200 bg-white p-3"><p className="text-sm text-gray-500">Business events</p><p className="text-xl font-semibold text-[#003366]">{summary.data.business?.total ?? 0}</p></article>
          <article className="rounded-xl border border-gray-200 bg-white p-3"><p className="text-sm text-gray-500">Failed sign-ins</p><p className="text-xl font-semibold text-[#003366]">{failed.text}</p><p className="text-xs text-gray-500">{failed.detail}</p></article>
          <article className="rounded-xl border border-gray-200 bg-white p-3"><p className="text-sm text-gray-500">Inactive sign-ins</p><p className="text-xl font-semibold text-[#003366]">{inactive.text}</p><p className="text-xs text-gray-500">{inactive.detail}</p></article>
          <article className="rounded-xl border border-gray-200 bg-white p-3"><p className="text-sm text-gray-500">Session revocations</p><p className="text-xl font-semibold text-[#003366]">{revoked.text}</p><p className="text-xs text-gray-500">{revoked.detail}</p></article>
        </div>
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
        <section className="rounded-xl border border-gray-200 bg-white p-4">
          {detail.loading ? <SkeletonBlock className="h-24" /> : null}
          {detail.notice ? <Banner tone={detail.notice.tone}>{detail.notice.message}</Banner> : null}
          {event ? (
            <div className="space-y-3">
              <div>
                <p className="text-xs uppercase tracking-wide text-gray-500">{event.source} · {event.category}</p>
                <h3 className="text-lg font-semibold text-[#003366]">{event.summary || event.action}</h3>
                <p className="text-sm text-gray-500">{formatTimestamp(event.createdAt)} · {event.action}</p>
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

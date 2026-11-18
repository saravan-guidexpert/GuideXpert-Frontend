import { useState } from 'react';
import { listSupportEmailJobs, retrySupportEmailJob } from '../../../utils/adminApi';
import { EMPTY_COPY, ERROR_COPY, LOADING_COPY, SUPPORT_EMAIL_LAYOUT, formatWhen } from './supportEmailFormat';
import { PanelMessage } from './SupportEmailShell';
import { useAsyncData } from './useAsyncData';

export const RETRY_COPY = 'Queued for the existing worker. This does not start processing by itself.';

const COUNT_LABELS = [
  ['pending', 'Pending'],
  ['processing', 'Processing'],
  ['failed', 'Failed'],
  ['dead_letter', 'Dead letter'],
];

export default function SupportEmailProcessing() {
  const { loading, result, reload } = useAsyncData(() => listSupportEmailJobs(), []);
  const [notice, setNotice] = useState('');
  const [retrying, setRetrying] = useState('');
  const data = result && result.success ? result.data : null;
  const state = { loading, error: result && !result.success ? (result.message || ERROR_COPY) : '', data, notice };
  const load = reload;

  async function retry(id) {
    if (retrying) return;
    setRetrying(id);
    const outcome = await retrySupportEmailJob(id);
    setRetrying('');
    setNotice(outcome.success ? RETRY_COPY : (outcome.message || ERROR_COPY));
    if (outcome.success) reload();
  }

  if (state.loading && !state.data) return <PanelMessage>{LOADING_COPY}</PanelMessage>;
  if (state.error) return <PanelMessage tone="error">{state.error}</PanelMessage>;
  const counts = data.counts || {};

  return (
    <section className="space-y-4" aria-busy={state.loading}>
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium text-slate-900">Processing queue</h2>
        <button type="button" onClick={load} disabled={state.loading} className="rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-700 disabled:opacity-50">Refresh</button>
      </div>
      <div className={SUPPORT_EMAIL_LAYOUT.stats} aria-label="Queue counts">
        {COUNT_LABELS.map(([key, label]) => (
          <article key={key} className={`${SUPPORT_EMAIL_LAYOUT.panel} px-3 py-2`}>
            <p className="text-xs text-slate-500">{label}</p>
            <p className="text-xl font-semibold text-slate-900">{counts[key] ?? 0}</p>
          </article>
        ))}
      </div>
      <p className="text-sm text-slate-600">Retry puts a job back in the queue. It does not start the processing worker, which stays off until it is enabled separately.</p>
      {state.notice && <PanelMessage>{state.notice}</PanelMessage>}
      <h3 className="text-sm font-medium text-slate-900">Failed and dead-letter jobs</h3>
      {data.jobs.length === 0 && <PanelMessage>{EMPTY_COPY}</PanelMessage>}
      <div className="space-y-2">
        {data.jobs.map((job) => (
          <article key={job.id} className={`${SUPPORT_EMAIL_LAYOUT.panel} flex flex-col gap-2 p-3 text-sm sm:flex-row sm:items-center sm:justify-between`}>
            <div>
              <p className="font-medium text-slate-900">{job.stage} · {job.state}</p>
              <p className="text-slate-600">Last error: {job.lastError || job.reason || 'No error recorded'}</p>
              <p className="text-slate-500">Retry count {job.attempts}/{job.maxAttempts} · last {formatWhen(job.lastAttempt, 'unknown')}{job.nextRetry ? ` · next ${formatWhen(job.nextRetry)}` : ''}</p>
            </div>
            {job.stage === 'sheets' ? (
              <span className="text-slate-500">Retired step</span>
            ) : (
              <button type="button" disabled={Boolean(retrying)} onClick={() => retry(job.id)} className="rounded border border-slate-300 px-2 py-1 disabled:opacity-50">
                {retrying === job.id ? 'Queuing' : 'Queue retry'}
              </button>
            )}
          </article>
        ))}
      </div>
      <section>
        <h3 className="mb-2 text-sm font-medium text-slate-900">Attachment extraction</h3>
        {data.attachmentFailures.length === 0 && <p className="text-sm text-slate-500">No extraction failures.</p>}
        {data.attachmentFailures.map((row) => <p key={row.id} className="text-sm text-slate-700">{row.name}: {row.reason || row.status}</p>)}
      </section>
      <section>
        <h3 className="mb-2 text-sm font-medium text-slate-900">Graph sync</h3>
        {data.graphFailures.map((row) => <p key={`${row.mailbox}-${row.folder}`} className="text-sm text-slate-700">{row.mailbox}/{row.folder}: {row.reason || row.status}</p>)}
        {data.graphFailures.length === 0 && <p className="text-sm text-slate-500">No sync failures.</p>}
      </section>
    </section>
  );
}

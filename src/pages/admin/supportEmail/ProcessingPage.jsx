import { useEffect, useState } from 'react';
import { listSupportEmailJobs, retrySupportEmailJob } from '../../../utils/adminApi';
import { EMPTY_COPY, ERROR_COPY, LOADING_COPY, SUPPORT_EMAIL_LAYOUT } from './supportEmailFormat';
import { PanelMessage } from './SupportEmailShell';

export default function SupportEmailProcessing() {
  const [state, setState] = useState({ loading: true, error: '', data: null, notice: '' });

  function load() {
    setState((current) => ({ ...current, loading: true, error: '' }));
    listSupportEmailJobs().then((result) => {
      if (!result.success) setState({ loading: false, error: result.message || ERROR_COPY, data: null, notice: '' });
      else setState({ loading: false, error: '', data: result.data, notice: '' });
    });
  }

  useEffect(() => { load(); }, []);

  async function retry(id) {
    const result = await retrySupportEmailJob(id);
    setState((current) => ({ ...current, notice: result.success ? 'Queued for the existing worker. This does not start processing by itself.' : (result.message || ERROR_COPY) }));
    if (result.success) load();
  }

  if (state.loading) return <PanelMessage>{LOADING_COPY}</PanelMessage>;
  if (state.error) return <PanelMessage tone="error">{state.error}</PanelMessage>;
  const data = state.data;

  return (
    <section className="space-y-4">
      <h2 className="text-sm font-medium text-slate-900">Failed processing</h2>
      {state.notice && <PanelMessage>{state.notice}</PanelMessage>}
      {data.jobs.length === 0 && <PanelMessage>{EMPTY_COPY}</PanelMessage>}
      <div className="space-y-2">
        {data.jobs.map((job) => (
          <article key={job.id} className={`${SUPPORT_EMAIL_LAYOUT.panel} flex flex-col gap-2 p-3 text-sm sm:flex-row sm:items-center sm:justify-between`}>
            <div>
              <p className="font-medium text-slate-900">{job.stage} · {job.state}</p>
              <p className="text-slate-600">{job.reason || 'No reason recorded'}</p>
              <p className="text-slate-500">Attempts {job.attempts}/{job.maxAttempts} · last {job.lastAttempt ? new Date(job.lastAttempt).toLocaleString() : 'unknown'}{job.nextRetry ? ` · next ${new Date(job.nextRetry).toLocaleString()}` : ''}</p>
            </div>
            <button type="button" onClick={() => retry(job.id)} className="rounded border border-slate-300 px-2 py-1">Queue retry</button>
          </article>
        ))}
      </div>
      <section>
        <h3 className="mb-2 text-sm font-medium text-slate-900">Attachment extraction</h3>
        {data.attachmentFailures.length === 0 && <p className="text-sm text-slate-500">No extraction failures.</p>}
        {data.attachmentFailures.map((row) => <p key={row.id} className="text-sm text-slate-700">{row.name}: {row.reason || row.status}</p>)}
      </section>
      <section>
        <h3 className="mb-2 text-sm font-medium text-slate-900">Sheets and Graph</h3>
        {data.sheetFailures.map((row) => <p key={row.id} className="text-sm text-slate-700">Sheet {row.state}: {row.reason || 'failed'} · attempts {row.attempts}</p>)}
        {data.graphFailures.map((row) => <p key={`${row.mailbox}-${row.folder}`} className="text-sm text-slate-700">{row.mailbox}/{row.folder}: {row.reason || row.status}</p>)}
        {data.sheetFailures.length === 0 && data.graphFailures.length === 0 && <p className="text-sm text-slate-500">No sync failures.</p>}
      </section>
    </section>
  );
}

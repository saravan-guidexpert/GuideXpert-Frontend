import { useContext, useEffect, useState } from 'react';
import { AuthContext } from '../../../contexts/AuthContext';
import { getSupportEmailHealth, testSupportEmailGraphAuthentication } from '../../../utils/adminApi';
import { ERROR_COPY, LOADING_COPY, SUPPORT_EMAIL_LAYOUT, verificationLabel, verificationTone } from './supportEmailFormat';
import { PanelMessage } from './SupportEmailShell';

function when(value) {
  return value ? new Date(value).toLocaleString() : 'Not recorded';
}

export default function SupportEmailHealth() {
  const auth = useContext(AuthContext);
  const isSuperAdmin = Boolean(auth && auth.user && auth.user.isSuperAdmin);
  const [state, setState] = useState({ loading: true, error: '', health: null });
  const [graph, setGraph] = useState(null);
  const [graphError, setGraphError] = useState('');
  const [graphRunning, setGraphRunning] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  useEffect(() => {
    let active = true;
    getSupportEmailHealth().then((result) => {
      if (!active) return;
      if (!result.success) setState({ loading: false, error: result.message || ERROR_COPY, health: null });
      else setState({ loading: false, error: '', health: result.data.health });
    });
    return () => { active = false; };
  }, [refreshKey]);
  if (state.loading) return <PanelMessage>{LOADING_COPY}</PanelMessage>;
  if (state.error) return <PanelMessage tone="error">{state.error}</PanelMessage>;
  async function onGraphTest() {
    if (graphRunning) return;
    setGraphRunning(true);
    setGraphError('');
    const result = await testSupportEmailGraphAuthentication();
    setGraphRunning(false);
    if (!result.success) {
      setGraphError(result.message || ERROR_COPY);
      return;
    }
    setGraph(result.data.graph);
    setRefreshKey((value) => value + 1);
  }

  const health = state.health;
  const ingestion = health.ingestion || { policies: [], mailboxScope: 'MAILBOX_SCOPE_UNVERIFIED', processingEnabled: false };
  const items = Array.isArray(health.items) ? health.items : [];
  const summary = health.summary || { verified: 0, failed: 0, unknown: 0 };
  return (
    <section className="grid gap-3 lg:grid-cols-2">
      <article className={`${SUPPORT_EMAIL_LAYOUT.panel} p-3 text-sm lg:col-span-2`} aria-label="System checks">
        <div className="flex items-center justify-between gap-2">
          <h2 className="font-medium text-slate-900">System checks</h2>
          <button type="button" onClick={() => setRefreshKey((value) => value + 1)} className="rounded-md border border-slate-300 px-3 py-1.5 text-slate-700">Refresh</button>
        </div>
        <p className="mt-1 text-slate-600">{summary.verified} verified · {summary.failed} not verified · {summary.unknown} unknown. Unknown means nothing has observed it yet, not that it is healthy.</p>
        <ul className="mt-3 grid gap-2 sm:grid-cols-2">
          {items.map((item) => (
            <li key={item.key} data-testid={`health-${item.key}`} className={`rounded-md border px-3 py-2 ${verificationTone(item.verified)}`}>
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium">{item.label}</span>
                <span className="text-xs font-semibold uppercase">{verificationLabel(item.verified)}</span>
              </div>
              {item.value && <p className="text-xs font-mono">{item.value}</p>}
              <p>{item.detail}</p>
            </li>
          ))}
        </ul>
      </article>
      <article className={`${SUPPORT_EMAIL_LAYOUT.panel} p-3 text-sm`}>
        <h2 className="font-medium text-slate-900">Synchronization</h2>
        <p className="mt-2 text-slate-700">Last successful sync: {when(health.sync.lastSuccessfulAt)}</p>
        <p>Last webhook: {health.webhook ? `${health.webhook.status} · ${when(health.webhook.receivedAt)}` : 'None recorded'}</p>
      </article>
      <article className={`${SUPPORT_EMAIL_LAYOUT.panel} p-3 text-sm`}>
        <h2 className="font-medium text-slate-900">Graph subscriptions</h2>
        {health.subscriptions.length === 0 && <p className="mt-2 text-slate-500">No subscriptions stored.</p>}
        {health.subscriptions.map((row) => (
          <p key={`${row.mailbox}-${row.folder}`} className="mt-2 text-slate-700">{row.mailbox}/{row.folder}: {row.healthy ? 'active and unexpired' : row.status} until {when(row.expiresAt)}</p>
        ))}
      </article>
      <article className={`${SUPPORT_EMAIL_LAYOUT.panel} p-3 text-sm`}>
        <h2 className="font-medium text-slate-900">Queue and recent runs</h2>
        <p className="mt-2">{health.queue.map((row) => `${row.state} ${row.count}`).join(' · ') || 'Queue is empty'}</p>
        {health.processing.map((row) => <p key={row.startedAt}>{when(row.startedAt)} · {row.active ? 'running' : row.success ? 'succeeded' : 'finished'}</p>)}
      </article>
      <article className={`${SUPPORT_EMAIL_LAYOUT.panel} p-3 text-sm`}>
        <h2 className="font-medium text-slate-900">Attachment storage and retention</h2>
        <p className="mt-2">{health.storage.files} stored files, {health.storage.declaredBytes} declared bytes.</p>
        <p>Last file purge: {when(health.retention.lastBinaryPurgeAt)}</p>
        <p>Last text purge: {when(health.retention.lastTextPurgeAt)}</p>
        <p className="text-slate-500">Retention stays a dry run until an operator calls it with execute=1. This page does not run cleanup.</p>
      </article>
      <article className={`${SUPPORT_EMAIL_LAYOUT.panel} p-3 text-sm lg:col-span-2`}>
        <h2 className="font-medium text-slate-900">Ingestion readiness</h2>
        <p className="mt-2 text-slate-700">Mailbox scope: {ingestion.mailboxScope}. Approved mailbox: {ingestion.approvedMailbox || 'support@niatindia.com'}.</p>
        <p>Global processing: {ingestion.processingEnabled ? 'enabled' : 'disabled'}.</p>
        {(ingestion.policies || []).length === 0 && <p>No mailbox policy is stored.</p>}
        {(ingestion.policies || []).map((policy) => (
          <p key={policy.mailbox}>{policy.mailbox}: {policy.enabled ? 'enabled' : 'disabled'}, activation {when(policy.activationAt)}, baseline {when(policy.baselineCompletedAt)}</p>
        ))}
        {(health.sync.cursors || []).map((cursor) => (
          <p key={`${cursor.mailbox}-${cursor.folder}`}>{cursor.mailbox}/{cursor.folder}: delta cursor {cursor.hasDeltaLink ? 'present' : 'absent'}, baseline {when(cursor.baselineCompletedAt)}</p>
        ))}
        {isSuperAdmin && (
          <button type="button" className="mt-3 rounded-md bg-slate-900 px-3 py-1.5 text-white disabled:opacity-50" onClick={onGraphTest} disabled={graphRunning}>
            {graphRunning ? 'Testing Graph authentication' : 'Test Graph authentication'}
          </button>
        )}
        {graphError && <p className="mt-2 text-red-700" role="alert">{graphError}</p>}
        {graph && <p className="mt-2">Token acquisition: {graph.ok ? 'succeeded' : 'failed'} ({graph.code}).</p>}
      </article>
    </section>
  );
}

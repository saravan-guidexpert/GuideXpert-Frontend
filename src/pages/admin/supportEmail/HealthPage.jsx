import { useEffect, useState } from 'react';
import { getSupportEmailHealth } from '../../../utils/adminApi';
import { ERROR_COPY, LOADING_COPY, SUPPORT_EMAIL_LAYOUT } from './supportEmailFormat';
import { PanelMessage } from './SupportEmailShell';

function when(value) {
  return value ? new Date(value).toLocaleString() : 'Not recorded';
}

export default function SupportEmailHealth() {
  const [state, setState] = useState({ loading: true, error: '', health: null });
  useEffect(() => {
    getSupportEmailHealth().then((result) => {
      if (!result.success) setState({ loading: false, error: result.message || ERROR_COPY, health: null });
      else setState({ loading: false, error: '', health: result.data.health });
    });
  }, []);
  if (state.loading) return <PanelMessage>{LOADING_COPY}</PanelMessage>;
  if (state.error) return <PanelMessage tone="error">{state.error}</PanelMessage>;
  const health = state.health;
  return (
    <section className="grid gap-3 lg:grid-cols-2">
      <article className={`${SUPPORT_EMAIL_LAYOUT.panel} p-3 text-sm`}>
        <h2 className="font-medium text-slate-900">Synchronization</h2>
        <p className="mt-2 text-slate-700">Last successful sync: {when(health.sync.lastSuccessfulAt)}</p>
        <p>Last webhook: {health.webhook ? `${health.webhook.status} · ${when(health.webhook.receivedAt)}` : 'None recorded'}</p>
      </article>
      <article className={`${SUPPORT_EMAIL_LAYOUT.panel} p-3 text-sm`}>
        <h2 className="font-medium text-slate-900">Graph subscriptions</h2>
        {health.subscriptions.length === 0 && <p className="mt-2 text-slate-500">No subscriptions stored.</p>}
        {health.subscriptions.map((row) => (
          <p key={`${row.mailbox}-${row.folder}`} className="mt-2 text-slate-700">{row.mailbox}/{row.folder}: {row.healthy ? 'healthy' : row.status} until {when(row.expiresAt)}</p>
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
    </section>
  );
}

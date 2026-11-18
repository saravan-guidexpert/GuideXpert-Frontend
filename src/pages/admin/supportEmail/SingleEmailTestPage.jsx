import { useContext, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { AuthContext } from '../../../contexts/AuthContext';
import { getSingleEmailTestReadiness, runSingleEmailTest, testSupportEmailGraphAuthentication } from '../../../utils/adminApi';
import { ERROR_COPY, SUPPORT_EMAIL_LAYOUT, singleTestErrorCopy } from './supportEmailFormat';
import { PanelMessage } from './SupportEmailShell';
import { canRunSingleEmailTest, readinessNotices, singleEmailBlockers } from './singleEmailTest';

export const CONFIRM_COPY = 'This creates or updates one real support ticket for the Graph message you entered. It does not send a reply.';

export default function SingleEmailTestPage() {
  const auth = useContext(AuthContext);
  const user = auth && auth.user;
  const [readiness, setReadiness] = useState(null);
  const [messageId, setMessageId] = useState('');
  const [error, setError] = useState('');
  const [duplicateTicketId, setDuplicateTicketId] = useState('');
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState(null);
  const [graph, setGraph] = useState(null);
  const [graphRunning, setGraphRunning] = useState(false);
  // A ref closes the gap between a click and the state update, so a double click cannot submit twice.
  const inFlight = useRef(false);

  useEffect(() => {
    if (!user || user.isSuperAdmin !== true) return undefined;
    getSingleEmailTestReadiness().then((response) => {
      if (!response.success) setError(response.message || ERROR_COPY);
      else setReadiness(response.data.readiness);
    });
    return undefined;
  }, [user]);

  if (!user || user.isSuperAdmin !== true) {
    return <PanelMessage tone="error">Super admin access is required for the single-email test.</PanelMessage>;
  }

  const blockers = singleEmailBlockers(readiness);
  const checks = readiness && Array.isArray(readiness.checks) ? readiness.checks : [];
  const notices = readinessNotices(readiness);
  const enabled = canRunSingleEmailTest(readiness, messageId) && !running;

  async function onGraphTest() {
    if (graphRunning) return;
    setGraphRunning(true);
    const response = await testSupportEmailGraphAuthentication();
    setGraphRunning(false);
    if (!response.success) {
      setGraph({ ok: false, code: response.message || ERROR_COPY });
      return;
    }
    setGraph(response.data.graph);
  }

  async function onSubmit(event) {
    event.preventDefault();
    if (inFlight.current || !canRunSingleEmailTest(readiness, messageId)) return;
    const confirmed = window.confirm(CONFIRM_COPY);
    if (!confirmed) return;
    inFlight.current = true;
    setRunning(true);
    setError('');
    setDuplicateTicketId('');
    setResult(null);
    try {
      const response = await runSingleEmailTest(messageId.trim());
      if (!response.success) {
        setError(singleTestErrorCopy(response.message));
        if (response.data && response.data.ticketId) setDuplicateTicketId(response.data.ticketId);
        if (response.data && response.data.readiness) setReadiness(response.data.readiness);
        return;
      }
      setResult(response.data.result);
    } finally {
      inFlight.current = false;
      setRunning(false);
    }
  }

  return (
    <section className={`${SUPPORT_EMAIL_LAYOUT.panel} p-3 text-sm`}>
      <h2 className="font-medium text-slate-900">Run single email test</h2>
      <p className="mt-2 text-slate-600">Processes one Graph message id. This page does not start the normal processing worker.</p>
      {!readiness && !error && <p className="mt-3 text-slate-500">Checking readiness.</p>}
      {checks.length > 0 && (
        <ul className="mt-3 space-y-1" aria-label="Readiness checks">
          {checks.filter((check) => check.blocking !== false).map((check) => (
            <li key={check.key} className={check.verified === true ? 'text-green-800' : 'text-amber-800'}>
              {check.code ? `${check.code}: ` : ''}{check.detail}
            </li>
          ))}
        </ul>
      )}
      {checks.length === 0 && blockers.length > 0 && (
        <ul className="mt-3 list-disc pl-5 text-amber-800" aria-label="Blockers">
          {blockers.map((blocker) => <li key={blocker}>{blocker}: {singleTestErrorCopy(blocker)}</li>)}
        </ul>
      )}
      {notices.map((notice) => (
        <p key={notice.key || notice.code} className="mt-3 text-slate-700" role="status">{notice.detail || singleTestErrorCopy(notice.code)}</p>
      ))}
      <div className="mt-3">
        <button type="button" className="rounded-md border border-slate-300 px-3 py-1.5 text-slate-800 disabled:opacity-50" onClick={onGraphTest} disabled={graphRunning}>
          {graphRunning ? 'Testing Graph token' : 'Test Graph token'}
        </button>
        {graph && (
          <p className="mt-2" role="status">
            Graph token: {graph.ok ? 'acquired' : 'not acquired'} ({graph.code}). {graph.ok ? 'No mailbox data was read.' : (graph.message || '')}
          </p>
        )}
      </div>
      <form className="mt-3 grid gap-2" onSubmit={onSubmit}>
        <label className="grid gap-1" htmlFor="graph-message-id">
          Graph message id
          <input
            id="graph-message-id"
            className="rounded-md border border-slate-300 px-2 py-1"
            value={messageId}
            onChange={(event) => setMessageId(event.target.value)}
            autoComplete="off"
            spellCheck="false"
            disabled={running}
          />
        </label>
        <button type="submit" className="w-fit rounded-md bg-slate-900 px-3 py-1.5 text-white disabled:bg-slate-300" disabled={!enabled}>
          {running ? 'Running test' : 'Run single email test'}
        </button>
      </form>
      {error && (
        <div className="mt-3 text-red-700" role="alert">
          <p>{error}</p>
          {duplicateTicketId && (
            <p>
              <Link className="underline" to={`/admin/support-email/tickets/${duplicateTicketId}`}>Open the existing ticket</Link>
            </p>
          )}
        </div>
      )}
      {result && result.ticket && (
        <div className="mt-3 text-slate-800">
          <p>Ticket <Link className="underline" to={`/admin/support-email/tickets/${result.ticket.id}`}>{result.ticket.ticketNumber}</Link></p>
          <p>Category {result.ticket.category} · priority {result.ticket.priority} · sentiment {result.ticket.sentiment}</p>
          <p>Confidence {result.ticket.confidence} · status {result.ticket.status}</p>
        </div>
      )}
    </section>
  );
}

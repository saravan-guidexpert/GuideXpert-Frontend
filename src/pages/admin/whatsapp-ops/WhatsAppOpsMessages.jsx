import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  FiAlertCircle,
  FiCheckCircle,
  FiClock,
  FiCopy,
  FiDownload,
  FiLoader,
  FiPlay,
  FiSearch,
  FiSlash
} from 'react-icons/fi';
import { useAuth } from '../../../hooks/useAuth';
import {
  listWhatsappOpsMessages,
  getWhatsappOpsMessageTimeline,
  manualWhatsappOpsResend,
  previewWhatsappOpsManualRecovery,
  startWhatsappOpsManualRecovery,
  getWhatsappOpsManualRecoveryJob,
  cancelWhatsappOpsManualRecoveryJob
} from '../../../utils/whatsappOpsAdminApi';
import { dateInputsToApiRange, defaultRangeIsoDates, formatDt } from './whatsappOpsShared';
import OpsFailureCell from './OpsFailureCell';
import {
  GX_TEMPLATE_OPTIONS,
  IIT_GENERIC_REMINDER_IDS,
  OPS_PRODUCT_GUIDEXPERT,
  OPS_PRODUCT_IIT,
  OPS_PRODUCT_ONE_ON_ONE,
  OPS_PRODUCT_GUIDANCE_BOOKING,
  OPS_PRODUCT_JEE_MOCK_TEST,
  ONE_ON_ONE_TEMPLATE_OPTIONS,
  GUIDANCE_BOOKING_TEMPLATE_OPTIONS,
  JEE_MOCK_TEST_TEMPLATE_OPTIONS,
  buildOpsProductQueryParams,
  parseOpsProductFromSearch,
  parsePreferredLanguageFromSearch,
  templateChipKey,
  visibleTemplateKindsForProduct,
} from './whatsappOpsProductConfig';
import WaStatusBadge from '../../../components/Admin/whatsapp-ops/WaStatusBadge';

const TEMPLATE_LABELS = {
  slot_booked: 'Slot booked',
  pre4hr: '4hr reminder',
  meet: 'Meet link (~1hr)',
  '30min': '30 min reminder',
  iit_pre2hr: 'IIT 2hr',
  iit_pre45min: 'IIT 45m',
  iit_pre15min: 'IIT 15m',
  one_on_one_submit: '1-on-1 submit',
  guidance_booking_submit: 'Guidance booking',
  jee_mock_test_submit: 'Mock test registration',
};

/** Compact eligibility audit for campaign templates (messages drill-down). */
function eligibilityTimingSummary(r) {
  const kinds = new Set(['pre4hr', 'meet', '30min']);
  if (!r.messageKind || !kinds.has(r.messageKind)) return '—';
  const t = r.eligibilityTiming;
  if (!t || typeof t !== 'object') return '—';
  const bits = [];
  if (t.sentTooEarly === true) bits.push('early');
  if (t.sentAfterExpiry === true) bits.push('after_slot');
  if (typeof t.eligibilityViolationDeltaMs === 'number')
    bits.push(`Δ${t.eligibilityViolationDeltaMs}`);
  return bits.length ? bits.join(' · ') : 'ok';
}

function buildUnresolvedCsv(candidates) {
  const header =
    'phone,lineageId,maxAttemptAtStart,reason,status,attemptNumber,retryGroupId,errorCode,errorReason,errorSource,errorMessage,createdAt';
  const lines = (candidates || []).map((c) => [
    c.phone || '',
    c.lineageId ? String(c.lineageId) : '',
    c.maxAttemptAtStart ?? '',
    c.reason || '',
    c.status || '',
    c.attemptNumber ?? '',
    c.retryGroupId ? String(c.retryGroupId) : '',
    c.errorCode || '',
    (c.errorReason || '').replace(/[\r\n]+/g, ' ').replace(/"/g, '""'),
    c.errorSource || '',
    (c.errorMessage || '').replace(/[\r\n]+/g, ' ').replace(/"/g, '""'),
    c.createdAt ? new Date(c.createdAt).toISOString() : ''
  ].map((v) => /[",]/.test(String(v)) ? `"${v}"` : String(v)).join(','));
  return [header, ...lines].join('\n');
}

function downloadCsv(filename, content) {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function ManualRecoveryPanel({ messageKind, from, to, apiScopeParams, isSuper, onJobComplete }) {
  const [preview, setPreview] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewErr, setPreviewErr] = useState(null);
  const [job, setJob] = useState(null);
  const [starting, setStarting] = useState(false);
  const [actionErr, setActionErr] = useState(null);
  const pollRef = useRef(null);

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  const refreshJob = useCallback(async (jobId) => {
    if (!jobId) return null;
    const res = await getWhatsappOpsManualRecoveryJob(jobId);
    if (!res.success) return null;
    const data = res.data?.data ?? res.data;
    setJob(data);
    return data;
  }, []);

  const startPolling = useCallback((jobId) => {
    stopPolling();
    pollRef.current = setInterval(async () => {
      const next = await refreshJob(jobId);
      if (next && (next.status === 'completed' || next.status === 'failed' || next.status === 'cancelled')) {
        stopPolling();
        if (typeof onJobComplete === 'function') onJobComplete(next);
      }
    }, 2000);
  }, [refreshJob, stopPolling, onJobComplete]);

  useEffect(() => () => stopPolling(), [stopPolling]);

  const apiDateRange = useMemo(() => dateInputsToApiRange(from, to), [from, to]);

  const handlePreview = useCallback(async () => {
    setPreviewLoading(true);
    setPreviewErr(null);
    const res = await previewWhatsappOpsManualRecovery({ messageKind, ...apiDateRange, ...apiScopeParams });
    setPreviewLoading(false);
    if (!res.success) {
      setPreviewErr(res.message || 'Preview failed');
      setPreview(null);
      return;
    }
    setPreview(res.data?.data ?? res.data);
  }, [messageKind, apiDateRange, apiScopeParams]);

  const handleStart = useCallback(async () => {
    if (!preview || !preview.candidates?.length) {
      setActionErr('Preview first to load candidates');
      return;
    }
    if (!window.confirm(`Send recovery to ${preview.candidates.length} unresolved recipient(s)?`)) return;
    setStarting(true);
    setActionErr(null);
    const res = await startWhatsappOpsManualRecovery({ messageKind, ...apiDateRange, ...apiScopeParams });
    setStarting(false);
    if (!res.success) {
      setActionErr(res.message || 'Could not start recovery');
      return;
    }
    const data = res.data?.data ?? res.data;
    if (data?.jobId) {
      const initial = await refreshJob(data.jobId);
      if (initial && initial.status === 'running') startPolling(data.jobId);
      else if (initial && initial.status === 'queued') startPolling(data.jobId);
    }
  }, [preview, messageKind, apiDateRange, apiScopeParams, refreshJob, startPolling]);

  const handleCancel = useCallback(async () => {
    if (!job?._id) return;
    if (!window.confirm('Cancel this recovery job? In-progress sends will not be reverted.')) return;
    const res = await cancelWhatsappOpsManualRecoveryJob(job._id);
    if (res.success) await refreshJob(job._id);
  }, [job, refreshJob]);

  const handleCopy = useCallback(async () => {
    const list = preview?.candidates || [];
    if (!list.length) return;
    const text = list.map((c) => c.phone).join('\n');
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const fallback = document.createElement('textarea');
      fallback.value = text;
      document.body.appendChild(fallback);
      fallback.select();
      document.execCommand('copy');
      document.body.removeChild(fallback);
    }
  }, [preview]);

  const handleExport = useCallback(() => {
    const list = preview?.candidates || [];
    if (!list.length) return;
    const date = new Date().toISOString().slice(0, 10);
    downloadCsv(`unresolved-${messageKind}-${date}.csv`, buildUnresolvedCsv(list));
  }, [preview, messageKind]);

  const counts = preview?.candidatesByReason || {};
  const isSlotBooked = messageKind === 'slot_booked';
  const isJobRunning = job && (job.status === 'queued' || job.status === 'running');
  const counters = job?.counters || {};

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-[0_4px_24px_-12px_rgba(15,23,42,0.08)] ring-1 ring-slate-900/[0.04]">
      <div className="border-b border-slate-200/80 bg-slate-50/90 px-4 py-3 sm:px-5 sm:py-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-[0.1em] text-slate-500">Manual recovery (audit)</p>
            <h2 className="mt-1 text-base font-semibold text-primary-navy">
              {TEMPLATE_LABELS[messageKind] || messageKind} · unresolved
            </h2>
            <p className="mt-1 text-xs leading-relaxed text-slate-600">
              Uses the same safeguards as Recovery: skips globally recent delivered/read to avoid duplicates.
            </p>
            {isSlotBooked && (
              <p className="mt-2 inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[11px] font-semibold text-slate-700">
                Transactional template · immediate-only retry preserved
              </p>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={handlePreview}
            disabled={previewLoading}
            className="inline-flex items-center gap-1.5 rounded-lg border border-primary-blue-300 bg-white px-3 py-2 text-xs font-semibold text-primary-navy shadow-sm transition hover:bg-primary-blue-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {previewLoading ? <FiLoader className="animate-spin" size={14} /> : <FiSearch size={14} />}
            Preview unresolved
          </button>
          <button
            type="button"
            onClick={handleCopy}
            disabled={!preview?.candidates?.length}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <FiCopy size={14} /> Copy phones
          </button>
          <button
            type="button"
            onClick={handleExport}
            disabled={!preview?.candidates?.length}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <FiDownload size={14} /> Export CSV
          </button>
          {isSuper && (
            <button
              type="button"
              onClick={handleStart}
              disabled={starting || isJobRunning || !preview?.candidates?.length}
              className="inline-flex items-center gap-1.5 rounded-lg border border-rose-300 bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {starting ? <FiLoader className="animate-spin" size={14} /> : <FiPlay size={14} />}
              Start recovery
            </button>
          )}
          {isSuper && isJobRunning && (
            <button
              type="button"
              onClick={handleCancel}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
            >
              <FiSlash size={14} /> Cancel
            </button>
          )}
        </div>
        </div>
      </div>

      <div className="space-y-3 px-4 py-4 sm:px-5 sm:py-5">
      {previewErr && (
        <div className="mt-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-800">{previewErr}</div>
      )}
      {actionErr && (
        <div className="mt-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-800">{actionErr}</div>
      )}

      {preview && (
        <div className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-2">
          <div className="rounded-xl border border-slate-200/90 bg-slate-50/40 p-3">
            <p className="text-xs font-bold uppercase tracking-[0.1em] text-slate-500">Unresolved breakdown</p>
            <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
              <div className="rounded-lg border border-slate-200 bg-white px-2.5 py-2">
                <p className="text-[11px] uppercase text-slate-600">Targeted</p>
                <p className="text-base font-semibold text-primary-navy">{preview.targeted || 0}</p>
              </div>
              <div className="rounded-lg border border-emerald-200 bg-emerald-50/60 px-2.5 py-2">
                <p className="text-[11px] uppercase text-emerald-800">Skipped (already delivered)</p>
                <p className="text-base font-semibold text-emerald-900">
                  {(preview.skippedAlreadyDelivered || 0) + (preview.skippedGlobalRecentSuccess || 0)}
                </p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50/60 px-2.5 py-2">
                <p className="text-[11px] uppercase text-slate-600">Skipped (in-flight)</p>
                <p className="text-base font-semibold text-slate-800">{preview.skippedInFlightDuplicate || 0}</p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50/60 px-2.5 py-2">
                <p className="text-[11px] uppercase text-slate-600">Lookback / stale</p>
                <p className="text-xs font-mono text-slate-700">
                  {preview.lookbackDays || '—'}d / {preview.inFlightStaleMinutes || '—'}m
                </p>
              </div>
            </div>
            {Object.keys(counts).length > 0 && (
              <div className="mt-3 grid grid-cols-1 gap-1 text-xs sm:grid-cols-2">
                {Object.entries(counts).map(([reason, count]) => (
              <div key={reason} className="flex items-center justify-between rounded-md border border-slate-200 bg-white px-2 py-1">
                    <span className="text-slate-700">{reason.replace(/_/g, ' ')}</span>
                    <span className="font-semibold text-slate-900">{count}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-xl border border-slate-200/90 bg-white p-3 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-[0.1em] text-slate-500">
              {job ? 'Recovery job progress' : 'No active job'}
            </p>
            {job ? (
              <div className="mt-2 space-y-2 text-xs">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold ${
                    job.status === 'completed' ? 'border-emerald-300 bg-emerald-50 text-emerald-900'
                    : job.status === 'failed' ? 'border-rose-300 bg-rose-50 text-rose-900'
                    : job.status === 'cancelled' ? 'border-slate-300 bg-slate-50 text-slate-700'
                    : 'border-primary-blue-200 bg-primary-blue-50 text-primary-navy'
                  }`}>{job.status}</span>
                  <span className="text-slate-500 font-mono text-[11px]">{job._id}</span>
                  {job.startedAt && <span className="text-slate-400">started {formatDt(job.startedAt)}</span>}
                  {job.finishedAt && <span className="text-slate-400">finished {formatDt(job.finishedAt)}</span>}
                </div>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-6">
                  <Counter label="Targeted" value={counters.targeted} />
                  <Counter label="Attempted" value={counters.attempted} />
                  <Counter label="API accepted" value={counters.apiAccepted} accent="text-emerald-700" />
                  <Counter label="Send failed" value={counters.sendFailed} accent="text-rose-700" />
                  <Counter label="Skipped delivered" value={counters.skippedAlreadyDelivered} />
                  <Counter label="Skipped recent" value={counters.skippedGlobalRecentSuccess} />
                  <Counter label="Skipped in-flight" value={counters.skippedInFlightDuplicate} />
                  <Counter label="Remaining" value={counters.remaining} accent="text-amber-800" />
                  <Counter label="Recovered" value={counters.recovered} accent="text-emerald-800" />
                  <Counter label="Delivered (post)" value={counters.delivered} accent="text-teal-700" />
                  <Counter label="Excluded (post)" value={counters.excluded} />
                  <Counter label="Failed (post)" value={counters.failed} accent="text-rose-800" />
                </div>
                {job.errorSummary && (
                  <p className="rounded-md border border-rose-200 bg-rose-50 px-2 py-1 text-rose-800">{job.errorSummary}</p>
                )}
              </div>
            ) : (
              <p className="mt-2 text-xs text-slate-500">
                Run preview, then start recovery (super-admin) to send fresh attempts to unresolved recipients.
              </p>
            )}
          </div>
        </div>
      )}
      </div>
    </section>
  );
}

function Counter({ label, value, accent }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50/60 px-2 py-1.5">
      <p className="text-[10px] uppercase text-slate-500">{label}</p>
      <p className={`text-sm font-semibold ${accent || 'text-slate-800'}`}>{Number.isFinite(value) ? value : 0}</p>
    </div>
  );
}

function WhatsAppOpsMessagesInner({ syncProductFromUrl }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const [{ from, to }, setRange] = useState(defaultRangeIsoDates);
  const [opsProduct, setOpsProduct] = useState(() => parseOpsProductFromSearch(searchParams));
  const [preferredLanguage, setPreferredLanguage] = useState(() => parsePreferredLanguageFromSearch(searchParams));
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [messageKind, setMessageKind] = useState('');
  const [status, setStatus] = useState('');
  const [attemptNumber, setAttemptNumber] = useState('');
  const [retryGroupId, setRetryGroupId] = useState('');
  const [errorCodeFilter, setErrorCodeFilter] = useState('');
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState(null);
  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState({ total: 0, page: 1 });
  const [page, setPage] = useState(1);
  const [reloadKey, setReloadKey] = useState(0);
  const [drawer, setDrawer] = useState(null);
  const [tlLoading, setTlLoading] = useState(false);
  const [resendBusy, setResendBusy] = useState(null);

  const isSuper = user?.isSuperAdmin === true;

  useEffect(() => {
    const date = searchParams.get('date');
    if (date && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
      setRange({ from: date, to: date });
    } else {
      const fromQ = searchParams.get('from');
      const toQ = searchParams.get('to');
      if (fromQ && /^\d{4}-\d{2}-\d{2}$/.test(fromQ)) {
        setRange((r) => ({
          from: fromQ,
          to: toQ && /^\d{4}-\d{2}-\d{2}$/.test(toQ) ? toQ : r.to
        }));
      } else if (toQ && /^\d{4}-\d{2}-\d{2}$/.test(toQ)) {
        setRange((r) => ({ ...r, to: toQ }));
      }
    }
    setOpsProduct(parseOpsProductFromSearch(searchParams));
    const k = searchParams.get('messageKind');
    if (k) setMessageKind(k);
    const pl = parsePreferredLanguageFromSearch(searchParams);
    if (pl) setPreferredLanguage(pl);
    else if (!searchParams.get('preferredLanguage')) setPreferredLanguage('');
    const st = searchParams.get('status');
    if (st) setStatus(st);
    const an = searchParams.get('attemptNumber');
    if (an) setAttemptNumber(an);
    const rg = searchParams.get('retryGroupId');
    if (rg) setRetryGroupId(rg);
  }, [searchParams]);

  const isIitProduct = opsProduct === OPS_PRODUCT_IIT;
  const isOneOnOneProduct = opsProduct === OPS_PRODUCT_ONE_ON_ONE;
  const isGuidanceBookingProduct = opsProduct === OPS_PRODUCT_GUIDANCE_BOOKING;
  const isJeeMockTestProduct = opsProduct === OPS_PRODUCT_JEE_MOCK_TEST;

  const apiScopeParams = useMemo(
    () => buildOpsProductQueryParams(opsProduct, messageKind || null, preferredLanguage),
    [opsProduct, messageKind, preferredLanguage]
  );

  const visibleTemplateChips = useMemo(
    () => visibleTemplateKindsForProduct([], opsProduct),
    [opsProduct]
  );

  const selectedChipKey = useMemo(
    () => (messageKind ? templateChipKey({ id: messageKind, preferredLanguage }) : 'all'),
    [messageKind, preferredLanguage]
  );

  const handleProductChange = useCallback(
    (next) => {
      setOpsProduct(next);
      setMessageKind('');
      setPreferredLanguage('');
      setPage(1);
      syncProductFromUrl(next, '', '');
    },
    [syncProductFromUrl]
  );

  const handleTemplateChip = useCallback(
    (chip) => {
      if (!chip) {
        setMessageKind('');
        setPreferredLanguage('');
        setPage(1);
        syncProductFromUrl(opsProduct, '', '');
        return;
      }
      setMessageKind(chip.id);
      setPreferredLanguage(chip.preferredLanguage || '');
      setPage(1);
      syncProductFromUrl(opsProduct, chip.id, chip.preferredLanguage || '');
    },
    [opsProduct, syncProductFromUrl]
  );

  const statusPillClass = (status) => {
    const s = String(status || '').toLowerCase();
    if (s === 'read' || s === 'delivered') return 'bg-emerald-50 text-emerald-800 border-emerald-200';
    if (s === 'sent') return 'bg-sky-50 text-sky-900 border-sky-200';
    if (s === 'failed' || s === 'retry_exhausted') return 'bg-rose-50 text-rose-800 border-rose-200';
    return 'bg-amber-50 text-amber-800 border-amber-200';
  };

  useEffect(() => {
    let cancelled = false;
    Promise.resolve().then(async () => {
      setLoading(true);
      setErr(null);
      const { from: apiFrom, to: apiTo } = dateInputsToApiRange(from, to);
      const params = {
        from: apiFrom,
        to: apiTo,
        page,
        limit: 40,
        ...apiScopeParams,
        ...(phone ? { phone } : {}),
        ...(name ? { name } : {}),
        ...(messageKind ? { messageKind } : {}),
        ...(status ? { status } : {}),
        ...(attemptNumber ? { attemptNumber } : {}),
        ...(retryGroupId ? { retryGroupId } : {}),
        ...(errorCodeFilter.trim() ? { errorCode: errorCodeFilter.trim() } : {}),
      };
      const res = await listWhatsappOpsMessages(params);
      if (cancelled) return;
      setLoading(false);
      if (!res.success) {
        setErr(res.message);
        setRows([]);
        return;
      }
      setRows(Array.isArray(res.data.data) ? res.data.data : []);
      setMeta({ total: res.data.total || 0, page: res.data.page });
    });
    return () => {
      cancelled = true;
    };
  }, [from, to, phone, name, messageKind, status, attemptNumber, retryGroupId, errorCodeFilter, page, reloadKey, apiScopeParams]);

  async function openTimeline(id) {
    setDrawer(null);
    setTlLoading(true);
    const res = await getWhatsappOpsMessageTimeline(id);
    setTlLoading(false);
    if (res.success) setDrawer(res.data.data);
    else {
      setDrawer(null);
      alert(res.message || 'Could not load timeline');
    }
  }

  async function resend(row, kindOverride) {
    if (!row?.formSubmissionId && !row?.iitCounsellingSubmissionId && !row?.phone) return;
    if (!window.confirm('Super-admin resend: duplicate message may be delivered. Continue?')) return;
    setResendBusy(row._id);
    const kind = kindOverride || row.messageKind;
    const body = {
      messageKind: kind,
      phone: row.phone,
      ...(row.opsProduct ? { opsProduct: row.opsProduct } : apiScopeParams),
    };
    if (row.iitCounsellingSubmissionId) body.iitCounsellingSubmissionId = row.iitCounsellingSubmissionId;
    else if (row.formSubmissionId) body.formSubmissionId = row.formSubmissionId;
    const res = await manualWhatsappOpsResend(body);
    setResendBusy(null);
    if (!res.success) alert(res.message || 'Resend failed');
    else setReloadKey((k) => k + 1);
  }

  const auditSummary = useMemo(() => {
    const counts = { delivered: 0, failed: 0, pending: 0 };
    rows.forEach((r) => {
      const s = String(r.deliveryStatus || r.status || '').toLowerCase();
      if (s === 'read' || s === 'delivered') counts.delivered += 1;
      else if (s === 'failed' || s === 'retry_exhausted') counts.failed += 1;
      else counts.pending += 1;
    });
    return counts;
  }, [rows]);

  const auditField =
    'mt-1.5 block h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 shadow-sm focus:border-primary-navy/40 focus:outline-none focus:ring-2 focus:ring-primary-navy/15';

  return (
    <div className="relative space-y-4 sm:space-y-5">
      <header className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-sm ring-1 ring-slate-900/[0.04]">
        <div className="border-b border-slate-100 px-4 py-4 sm:px-5">
          <div className="border-l-[3px] border-primary-navy pl-3">
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">Audit</p>
            <h1 className="mt-1 text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">Delivery audit</h1>
            <p className="mt-1 max-w-3xl text-sm leading-relaxed text-slate-600">
              Recipient-level delivery events and webhooks. Page counts below reflect the current query only.
            </p>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-2 p-3 sm:grid-cols-3 sm:gap-3 sm:p-4">
          <div className="relative overflow-hidden rounded-xl border border-slate-200/90 bg-white px-3 py-3 shadow-sm ring-1 ring-slate-900/[0.03] sm:px-4 sm:py-3.5">
            <span className="absolute inset-y-2 left-0 w-1 rounded-full bg-emerald-500/90" aria-hidden />
            <p className="pl-2 text-[10px] font-semibold uppercase tracking-wide text-slate-500">Delivered (page)</p>
            <p className="mt-1 flex items-center gap-2 pl-2 text-xl font-bold tabular-nums text-emerald-800">
              <FiCheckCircle className="shrink-0 text-emerald-600" size={18} /> {auditSummary.delivered}
            </p>
          </div>
          <div className="relative overflow-hidden rounded-xl border border-slate-200/90 bg-white px-3 py-3 shadow-sm ring-1 ring-slate-900/[0.03] sm:px-4 sm:py-3.5">
            <span className="absolute inset-y-2 left-0 w-1 rounded-full bg-rose-500/90" aria-hidden />
            <p className="pl-2 text-[10px] font-semibold uppercase tracking-wide text-slate-500">Failed (page)</p>
            <p className="mt-1 flex items-center gap-2 pl-2 text-xl font-bold tabular-nums text-rose-800">
              <FiAlertCircle className="shrink-0 text-rose-600" size={18} /> {auditSummary.failed}
            </p>
          </div>
          <div className="relative overflow-hidden rounded-xl border border-slate-200/90 bg-white px-3 py-3 shadow-sm ring-1 ring-slate-900/[0.03] sm:px-4 sm:py-3.5">
            <span className="absolute inset-y-2 left-0 w-1 rounded-full bg-amber-500/90" aria-hidden />
            <p className="pl-2 text-[10px] font-semibold uppercase tracking-wide text-slate-500">Pending (page)</p>
            <p className="mt-1 flex items-center gap-2 pl-2 text-xl font-bold tabular-nums text-amber-900">
              <FiClock className="shrink-0 text-amber-600" size={18} /> {auditSummary.pending}
            </p>
          </div>
        </div>
      </header>

      <div className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-sm ring-1 ring-slate-900/[0.04] sm:p-5">
        <p className="text-xs font-bold uppercase tracking-[0.1em] text-slate-500">Query filters</p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Product</span>
          <button
            type="button"
            onClick={() => handleProductChange(OPS_PRODUCT_GUIDEXPERT)}
            className={`rounded-lg border px-3 py-1.5 text-sm font-semibold transition ${
              opsProduct === OPS_PRODUCT_GUIDEXPERT
                ? 'border-primary-navy bg-primary-navy text-white'
                : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
            }`}
          >
            GuideXpert
          </button>
          <button
            type="button"
            onClick={() => handleProductChange(OPS_PRODUCT_IIT)}
            className={`rounded-lg border px-3 py-1.5 text-sm font-semibold transition ${
              opsProduct === OPS_PRODUCT_IIT
                ? 'border-primary-navy bg-primary-navy text-white'
                : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
            }`}
          >
            IIT Counselling
          </button>
          <button
            type="button"
            onClick={() => handleProductChange(OPS_PRODUCT_ONE_ON_ONE)}
            className={`rounded-lg border px-3 py-1.5 text-sm font-semibold transition ${
              opsProduct === OPS_PRODUCT_ONE_ON_ONE
                ? 'border-primary-navy bg-primary-navy text-white'
                : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
            }`}
          >
            1-on-1 Counseling
          </button>
          <button
            type="button"
            onClick={() => handleProductChange(OPS_PRODUCT_GUIDANCE_BOOKING)}
            className={`rounded-lg border px-3 py-1.5 text-sm font-semibold transition ${
              opsProduct === OPS_PRODUCT_GUIDANCE_BOOKING
                ? 'border-primary-navy bg-primary-navy text-white'
                : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
            }`}
          >
            Guidance Booking
          </button>
          <button
            type="button"
            onClick={() => handleProductChange(OPS_PRODUCT_JEE_MOCK_TEST)}
            className={`rounded-lg border px-3 py-1.5 text-sm font-semibold transition ${
              opsProduct === OPS_PRODUCT_JEE_MOCK_TEST
                ? 'border-primary-navy bg-primary-navy text-white'
                : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
            }`}
          >
            JEE Mock Test
          </button>
        </div>
        {(isIitProduct || isOneOnOneProduct || isGuidanceBookingProduct || isJeeMockTestProduct) ? (
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => handleTemplateChip(null)}
              className={`rounded-lg border px-2.5 py-1 text-xs font-semibold transition ${
                !messageKind
                  ? 'border-primary-navy bg-primary-navy text-white'
                  : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
              }`}
            >
              All templates
            </button>
            {visibleTemplateChips.map((chip) => {
              const key = templateChipKey(chip);
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => handleTemplateChip(chip)}
                  className={`rounded-lg border px-2.5 py-1 text-xs font-semibold transition ${
                    selectedChipKey === key
                      ? 'border-primary-navy bg-primary-navy text-white'
                      : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  {chip.label || chip.id}
                </button>
              );
            })}
          </div>
        ) : null}
        <div className="mt-3 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-12 lg:items-end">
          <label className="text-sm font-medium text-slate-700 lg:col-span-2">
            From
            <input type="date" value={from} onChange={(e) => setRange((r) => ({ ...r, from: e.target.value }))} className={auditField} />
          </label>
          <label className="text-sm font-medium text-slate-700 lg:col-span-2">
            To
            <input type="date" value={to} onChange={(e) => setRange((r) => ({ ...r, to: e.target.value }))} className={auditField} />
          </label>
          <label className="text-sm font-medium text-slate-700 lg:col-span-2">
            Phone
            <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="10-digit" className={auditField} />
          </label>
          <label className="text-sm font-medium text-slate-700 lg:col-span-3">
            Name contains
            <input value={name} onChange={(e) => setName(e.target.value)} className={auditField} />
          </label>
          <label className="text-sm font-medium text-slate-700 lg:col-span-3">
            Kind
            <select
              value={messageKind}
              onChange={(e) => {
                const v = e.target.value;
                setMessageKind(v);
                if (opsProduct === OPS_PRODUCT_IIT && IIT_GENERIC_REMINDER_IDS.has(v)) {
                  setPreferredLanguage('');
                }
                setPage(1);
                syncProductFromUrl(opsProduct, v, preferredLanguage);
              }}
              className={auditField}
            >
              <option value="">All</option>
              {(isIitProduct
                ? [{ value: 'slot_booked', label: 'slot_booked' }]
                : isOneOnOneProduct
                  ? ONE_ON_ONE_TEMPLATE_OPTIONS.filter((o) => o.value)
                  : isGuidanceBookingProduct
                    ? GUIDANCE_BOOKING_TEMPLATE_OPTIONS.filter((o) => o.value)
                    : isJeeMockTestProduct
                      ? JEE_MOCK_TEST_TEMPLATE_OPTIONS.filter((o) => o.value)
                    : GX_TEMPLATE_OPTIONS.filter((o) => o.value)
              ).map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label || TEMPLATE_LABELS[opt.value] || opt.value}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm font-medium text-slate-700 lg:col-span-3">
            Status
            <select value={status} onChange={(e) => setStatus(e.target.value)} className={auditField}>
              <option value="">All</option>
              <option value="submitted">submitted</option>
              <option value="sent">sent</option>
              <option value="delivered">delivered</option>
              <option value="read">read</option>
              <option value="failed">failed (+ retry_exhausted via multi)</option>
              <option value="failed,retry_exhausted">failed,retry_exhausted</option>
              <option value="retry_exhausted">retry_exhausted</option>
            </select>
          </label>
          <label className="text-sm font-medium text-slate-700 lg:col-span-2">
            Error code
            <input
              value={errorCodeFilter}
              onChange={(e) => setErrorCodeFilter(e.target.value)}
              placeholder="e.g. 132012"
              className={`${auditField} font-mono text-xs`}
            />
          </label>
          <label className="text-sm font-medium text-slate-700 lg:col-span-2">
            Attempt #
            <select value={attemptNumber} onChange={(e) => setAttemptNumber(e.target.value)} className={auditField}>
              <option value="">All</option>
              <option value="1">1</option>
              <option value="2">2</option>
              <option value="3">3</option>
            </select>
          </label>
          <label className="text-sm font-medium text-slate-700 lg:col-span-4">
            Retry group id
            <input
              value={retryGroupId}
              onChange={(e) => setRetryGroupId(e.target.value)}
              placeholder="Mongo ObjectId"
              className={`${auditField} font-mono text-xs`}
            />
          </label>
          <div className="flex items-end lg:col-span-2">
            <button
              type="button"
              className="inline-flex h-10 w-full items-center justify-center rounded-lg bg-primary-navy px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-navy/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-navy/30"
              onClick={() => {
                setPage(1);
                setReloadKey((k) => k + 1);
              }}
            >
              Search
            </button>
          </div>
        </div>
      </div>

      {messageKind && (
        <ManualRecoveryPanel
          key={`${messageKind}|${from}|${to}|${opsProduct}|${preferredLanguage}`}
          messageKind={messageKind}
          from={from}
          to={to}
          apiScopeParams={apiScopeParams}
          isSuper={isSuper}
          onJobComplete={() => setReloadKey((k) => k + 1)}
        />
      )}

      {err && <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">{err}</div>}

      <div className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-[0_4px_24px_-12px_rgba(15,23,42,0.08)] ring-1 ring-slate-900/[0.04]">
        <div className="max-h-[min(70vh,720px)] overflow-auto">
          <table className="min-w-[1240px] w-full border-collapse text-sm">
            <thead className="sticky top-0 z-10 border-b border-slate-200 bg-white/95 text-xs font-bold uppercase tracking-wide text-slate-500 shadow-sm backdrop-blur-md">
              <tr>
                <th className="px-4 py-3.5 text-left">Sent time</th>
                <th className="px-4 py-3.5 text-left">Name</th>
                <th className="px-4 py-3.5 text-left">Phone number</th>
                <th className="px-4 py-3.5 text-left">Message type</th>
                <th className="px-4 py-3.5 text-left">Attempt</th>
                <th className="max-w-[140px] px-4 py-3.5 text-left">Timing audit</th>
                <th className="px-4 py-3.5 text-left">Retry group</th>
                <th className="px-4 py-3.5 text-left">Delivery status</th>
                <th className="min-w-[14rem] px-4 py-3.5 text-left">What went wrong</th>
                <th className="px-4 py-3.5 text-right">Retry count</th>
                <th className="px-4 py-3.5 text-left">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading && rows.length === 0 && (
                <tr>
                  <td colSpan={11} className="px-4 py-14 text-center text-sm text-slate-500">
                    <FiLoader className="mr-2 inline animate-spin" /> Loading…
                  </td>
                </tr>
              )}
              {!loading && rows.length === 0 && (
                <tr>
                  <td colSpan={11} className="px-4 py-16 text-center text-sm text-slate-600">
                    No message events yet.
                  </td>
                </tr>
              )}
              {rows.map((r) => (
                <tr key={r._id} className="odd:bg-white even:bg-slate-50/50 hover:bg-slate-100/80">
                  <td className="whitespace-nowrap px-4 py-3.5 text-sm text-slate-700">{formatDt(r.sentAt || r.createdAt)}</td>
                  <td className="px-4 py-3.5 text-sm text-slate-800">{r.userName || 'Not available'}</td>
                  <td className="px-4 py-3.5 font-mono text-sm font-medium text-slate-900">{r.phone || 'Not available'}</td>
                  <td className="px-4 py-3.5 text-sm text-slate-800">{r.messageKind || 'Not available'}</td>
                  <td className="px-4 py-3.5 text-center text-sm tabular-nums text-slate-800">{r.attemptNumber ?? '—'}</td>
                  <td
                    className="max-w-[140px] px-4 py-3.5 text-xs leading-snug text-slate-700"
                    title={
                      r.eligibilityTiming?.firstEligibleAt
                        ? `firstEligibleAt: ${formatDt(r.eligibilityTiming.firstEligibleAt)}`
                        : undefined
                    }
                  >
                    {eligibilityTimingSummary(r)}
                  </td>
                  <td className="max-w-[140px] truncate px-4 py-3.5 font-mono text-xs text-slate-600" title={r.retryGroupId ? String(r.retryGroupId) : ''}>
                    {r.retryGroupId ? String(r.retryGroupId).slice(-8) : '—'}
                  </td>
                  <td className="px-4 py-3.5">
                    <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${statusPillClass(r.deliveryStatus || r.status)}`}>
                      {r.deliveryStatus || r.status || 'Not available'}
                    </span>
                  </td>
                  <td className="max-w-md px-4 py-3.5">
                    <OpsFailureCell row={r} compact />
                  </td>
                  <td className="px-4 py-3.5 text-right font-mono text-sm tabular-nums text-slate-800">{r.retryCount ?? r.retryCountSnapshot ?? 0}</td>
                  <td className="space-x-3 whitespace-nowrap px-4 py-3.5">
                    <button type="button" className="text-sm font-semibold text-primary-navy hover:underline" onClick={() => openTimeline(r._id)}>
                      Timeline
                    </button>
                    {isSuper && (r.formSubmissionId || r.iitCounsellingSubmissionId || r.phone) && (
                      <button
                        type="button"
                        disabled={resendBusy === r._id}
                        className="text-sm font-semibold text-rose-700 hover:underline disabled:opacity-40"
                        onClick={() => resend(r)}
                      >
                        Resend kind
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 text-sm text-slate-700">
        <button
          type="button"
          disabled={page <= 1 || loading}
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          className="inline-flex h-9 items-center rounded-lg border border-slate-200 bg-white px-3 font-semibold text-primary-navy shadow-sm hover:bg-slate-50 disabled:opacity-40"
        >
          Prev
        </button>
        <span className="tabular-nums">
          Page {page} · {meta.total} rows
        </span>
        <button
          type="button"
          disabled={loading || page * 40 >= meta.total}
          onClick={() => setPage((p) => p + 1)}
          className="inline-flex h-9 items-center rounded-lg border border-slate-200 bg-white px-3 font-semibold text-primary-navy shadow-sm hover:bg-slate-50 disabled:opacity-40"
        >
          Next
        </button>
      </div>

      {(tlLoading || drawer) && (
        <div className="fixed inset-y-0 right-0 z-40 w-full max-w-lg bg-white shadow-2xl border-l border-gray-200 flex flex-col">
          <div className="p-4 border-b flex justify-between items-center">
            <h2 className="font-bold text-lg">Timeline</h2>
            <button
              type="button"
              className="text-sm font-semibold text-gray-600 hover:text-gray-900"
              onClick={() => {
                setDrawer(null);
                setTlLoading(false);
              }}
            >
              Close
            </button>
          </div>
          <div className="flex-1 overflow-auto p-4 space-y-4 text-sm">
            {tlLoading && !drawer && (
              <p className="text-gray-500 py-16 flex items-center gap-2 justify-center">
                <FiLoader className="animate-spin" /> Loading timeline…
              </p>
            )}
            {drawer && (
              <>
                {drawer.providerError &&
                (drawer.providerError.headline ||
                  drawer.providerError.errorHeadline ||
                  drawer.providerError.errorCode ||
                  drawer.providerError.errorReason) ? (
                  <div className="rounded-lg border border-rose-200 bg-rose-50/80 p-3">
                    <p className="text-xs font-bold uppercase tracking-wide text-rose-900">What went wrong</p>
                    <OpsFailureCell
                      row={{
                        errorHeadline: drawer.providerError.headline || drawer.providerError.errorHeadline,
                        errorDetail: drawer.providerError.detail || drawer.providerError.errorDetail,
                        errorCode: drawer.providerError.technicalCode || drawer.providerError.errorCode,
                        errorSource: drawer.providerError.technicalSource || drawer.providerError.errorSource,
                        errorReason: drawer.providerError.errorReason,
                        errorMessage: drawer.event?.errorMessage
                      }}
                    />
                  </div>
                ) : null}
                <div>
                  <p className="font-semibold text-gray-900">Event</p>
                  <pre className="text-xs bg-gray-50 rounded-lg p-2 overflow-auto max-h-48">{JSON.stringify(drawer.event, null, 2)}</pre>
                </div>
                <div>
                  <p className="font-semibold text-gray-900">Inbound webhooks ({drawer.webhooks?.length || 0})</p>
                  <ul className="space-y-2">
                    {(drawer.webhooks || []).map((w) => (
                      <li key={w._id} className="border border-gray-100 rounded-lg p-2 text-xs">
                        <span className="font-semibold">{formatDt(w.receivedAt)}</span>{' '}
                        <WaStatusBadge status={w.status} /> msg {w.messageId || '—'}
                        {w.parsedErrorCode ? (
                          <span className="ml-2 font-mono text-rose-800" title={w.parsedErrorReason || ''}>
                            code {w.parsedErrorCode}
                          </span>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function WhatsAppOpsMessages() {
  const [searchParams, setSearchParams] = useSearchParams();

  const syncProductFromUrl = useCallback(
    (product, kind, lang) => {
      const next = new URLSearchParams(searchParams);
      if (product === OPS_PRODUCT_IIT) next.set('opsProduct', OPS_PRODUCT_IIT);
      else if (product === OPS_PRODUCT_ONE_ON_ONE) next.set('opsProduct', OPS_PRODUCT_ONE_ON_ONE);
      else if (product === OPS_PRODUCT_GUIDANCE_BOOKING) next.set('opsProduct', OPS_PRODUCT_GUIDANCE_BOOKING);
      else if (product === OPS_PRODUCT_JEE_MOCK_TEST) next.set('opsProduct', OPS_PRODUCT_JEE_MOCK_TEST);
      else next.delete('opsProduct');
      if (kind) next.set('messageKind', kind);
      else next.delete('messageKind');
      if (lang) next.set('preferredLanguage', lang);
      else next.delete('preferredLanguage');
      setSearchParams(next, { replace: true });
    },
    [searchParams, setSearchParams]
  );

  return <WhatsAppOpsMessagesInner syncProductFromUrl={syncProductFromUrl} />;
}

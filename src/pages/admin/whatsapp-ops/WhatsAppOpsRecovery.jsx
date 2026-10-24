import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  FiActivity,
  FiAlertOctagon,
  FiAlertTriangle,
  FiArrowDown,
  FiArrowRight,
  FiChevronDown,
  FiCheckCircle,
  FiClock,
  FiCopy,
  FiDownload,
  FiEye,
  FiInfo,
  FiLoader,
  FiMoreHorizontal,
  FiPauseCircle,
  FiPlay,
  FiRefreshCw,
  FiRotateCw,
  FiSearch,
  FiSlash,
  FiSliders,
  FiTarget,
  FiX,
  FiZap
} from 'react-icons/fi';
import { useAuth } from '../../../hooks/useAuth';
import {
  cancelWhatsappOpsManualRecoveryJob,
  downloadUnresolvedCsv,
  fetchUnresolvedCsvText,
  getUnresolvedRecipients,
  getWhatsappOpsCalendarDay,
  getWhatsappOpsManualRecoveryJob,
  listWhatsappOpsManualRecoveryJobs,
  previewWhatsappOpsManualRecovery,
  startWhatsappOpsManualRecovery
} from '../../../utils/whatsappOpsAdminApi';
import {
  dateInputsToApiRange,
  defaultRangeIsoDates,
  escapeCsvCell,
  formatDt,
  formatIndianMobile91
} from './whatsappOpsShared';
import OpsFailureCell from './OpsFailureCell';
import {
  GX_TEMPLATE_OPTIONS,
  IIT_REMINDER_LANGUAGE_CHIPS,
  IIT_GENERIC_REMINDER_IDS,
  OPS_PRODUCT_GUIDEXPERT,
  OPS_PRODUCT_IIT,
  OPS_PRODUCT_ONE_ON_ONE,
  OPS_PRODUCT_GUIDANCE_BOOKING,
  OPS_PRODUCT_JEE_MOCK_TEST,
  buildOpsProductQueryParams,
  parseOpsProductFromSearch,
  parsePreferredLanguageFromSearch,
  templateChipKey,
  visibleTemplateKindsForProduct,
} from './whatsappOpsProductConfig';
import WhatsAppOpsMessages from './WhatsAppOpsMessages';

const GROUP_OPTIONS = [
  { id: 'all', label: 'All unresolved' },
  { id: 'failed', label: 'Failed' },
  { id: 'excluded', label: 'Excluded' },
  { id: 'exhausted', label: 'Exhausted' },
  { id: 'not_accepted', label: 'Not accepted' },
  { id: 'in_flight_stale', label: 'In-flight stale' }
];

const EXCLUSION_CATEGORY_LABELS = {
  permanent_failure: 'Permanently failed',
  invalid_recipient: 'Invalid / no WhatsApp',
  retry_exhausted: 'Retry exhausted',
  cooldown: 'Cooldown blocked',
  duplicate_protected: 'Duplicate protected',
  manually_disabled: 'Manually disabled',
  already_resolved: 'Already resolved',
  in_flight_timeout: 'In-flight timeout (promotion)',
  promotion_superseded: 'Superseded by retry',
  unresolved_other: 'Other'
};

const EXCLUSION_CATEGORY_COLORS = {
  permanent_failure: 'border-rose-200 bg-rose-50 text-rose-800',
  invalid_recipient: 'border-slate-300 bg-slate-50 text-slate-700',
  retry_exhausted: 'border-amber-200 bg-amber-50 text-amber-800',
  cooldown: 'border-sky-200 bg-sky-50 text-sky-800',
  duplicate_protected: 'border-violet-200 bg-violet-50 text-violet-800',
  manually_disabled: 'border-slate-300 bg-slate-50 text-slate-700',
  already_resolved: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  in_flight_timeout: 'border-orange-200 bg-orange-50 text-orange-900',
  promotion_superseded: 'border-slate-200 bg-slate-50 text-slate-700',
  unresolved_other: 'border-slate-200 bg-slate-50 text-slate-700'
};

const TERMINAL_STATUSES = ['completed', 'failed', 'cancelled'];

function isTerminal(status) {
  return TERMINAL_STATUSES.includes(status);
}

function formatElapsed(ms) {
  if (!Number.isFinite(ms) || ms < 0) return '0:00';
  const total = Math.floor(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  if (m < 60) return `${m}:${String(s).padStart(2, '0')}`;
  const h = Math.floor(m / 60);
  return `${h}h ${m % 60}m ${s}s`;
}

function copyToClipboard(text) {
  if (!text) return Promise.resolve();
  if (navigator.clipboard?.writeText) return navigator.clipboard.writeText(text);
  const ta = document.createElement('textarea');
  ta.value = text;
  document.body.appendChild(ta);
  ta.select();
  document.execCommand('copy');
  document.body.removeChild(ta);
  return Promise.resolve();
}

/* ============================================================================
 * SectionCard — standardized admin theme card shell with optional gradient header
 * ========================================================================= */

function SectionCard({
  icon: Icon,
  kicker,
  title,
  subtitle,
  headerRight,
  bodyClassName,
  className,
  children,
  noHeader,
  sticky,
  stickyTop = 'top-0',
  compact
}) {
  const stickyCls = sticky ? `sticky ${stickyTop} z-30` : '';
  const headerPad = compact ? 'px-3 py-2.5 sm:px-4' : 'px-4 py-4 sm:px-5';
  const iconWrap = compact ? 'h-8 w-8' : 'h-10 w-10';
  const iconSz = compact ? 16 : 18;
  return (
    <section
      className={`overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-[0_4px_24px_-12px_rgba(15,23,42,0.08)] ring-1 ring-slate-900/[0.04] ${stickyCls} ${className || ''}`}
    >
      {!noHeader && (
        <div className={`border-b border-slate-200/80 bg-slate-50/90 ${headerPad}`}>
          <div className={`flex min-w-0 flex-col ${compact ? 'gap-2' : 'gap-3'} sm:flex-row sm:items-center sm:justify-between`}>
            <div className="flex min-w-0 flex-1 items-center gap-3">
              {Icon && (
                <span className={`flex ${iconWrap} shrink-0 items-center justify-center rounded-xl bg-white text-primary-navy shadow-sm ring-1 ring-slate-200/80`}>
                  <Icon size={iconSz} />
                </span>
              )}
              <div className="min-w-0">
                {kicker && (
                  <p className="text-xs font-bold uppercase tracking-[0.08em] text-slate-500">
                    {kicker}
                  </p>
                )}
                {title && (
                  <h3 className={`mt-0.5 truncate font-semibold text-slate-900 ${compact ? 'text-sm' : 'text-base'}`}>{title}</h3>
                )}
                {subtitle && (
                  <p className={`mt-1 leading-snug text-slate-600 ${compact ? 'text-xs' : 'text-sm'}`}>{subtitle}</p>
                )}
              </div>
            </div>
            {headerRight && (
              <div className="flex shrink-0 flex-wrap items-center gap-2 sm:justify-end">{headerRight}</div>
            )}
          </div>
        </div>
      )}
      <div className={bodyClassName ?? (compact ? 'p-3 sm:p-4' : 'p-4 sm:p-5')}>{children}</div>
    </section>
  );
}

/* ============================================================================
 * Status pill with icon + intent color (used in unresolved table)
 * ========================================================================= */

function StatusPill({ status, size = 'sm' }) {
  const raw = String(status || '');
  const s = raw.toLowerCase();
  let cls = 'border-slate-200 bg-slate-100 text-slate-700';
  let Icon = FiClock;
  if (s === 'delivered' || s === 'read') {
    cls = 'border-emerald-200 bg-emerald-50 text-emerald-800';
    Icon = FiCheckCircle;
  } else if (s === 'failed') {
    cls = 'border-rose-200 bg-rose-50 text-rose-800';
    Icon = FiAlertTriangle;
  } else if (s === 'retry_exhausted') {
    cls = 'border-amber-200 bg-amber-50 text-amber-800';
    Icon = FiAlertOctagon;
  } else if (s === 'sent') {
    cls = 'border-sky-200 bg-sky-50 text-sky-800';
    Icon = FiArrowRight;
  } else if (s === 'submitted') {
    cls = 'border-blue-200 bg-blue-50 text-blue-800';
    Icon = FiTarget;
  } else if (s === 'queued' || s === 'retry_pending') {
    cls = 'border-slate-200 bg-slate-50 text-slate-700';
    Icon = FiPauseCircle;
  }
  const sizeCls = size === 'lg'
    ? 'px-2.5 py-1 text-sm'
    : 'px-2.5 py-0.5 text-xs';
  const label = s || '—';
  return (
    <span title={raw || label} className={`inline-flex max-w-[9rem] min-w-0 items-center gap-1 rounded-full border font-semibold ${cls} ${sizeCls}`}>
      <Icon className="shrink-0" size={size === 'lg' ? 14 : 12} aria-hidden />
      <span className="min-w-0 truncate">{label}</span>
    </span>
  );
}

function CounterTile({ label, value, accent }) {
  return (
    <div className="rounded-lg border border-slate-200/90 bg-white px-3 py-2 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p className={`mt-0.5 text-lg font-semibold tabular-nums ${accent || 'text-slate-800'}`}>
        {Number.isFinite(value) ? value.toLocaleString() : (value || 0)}
      </p>
    </div>
  );
}

const RECOVERY_INTENTS = {
  default: {
    stripe: 'from-slate-600 via-slate-500 to-slate-400',
    barAccent: 'from-slate-600 to-slate-400',
    value: 'text-slate-900',
    iconWrap: 'bg-gradient-to-br from-slate-100 to-slate-50 text-slate-600 ring-slate-200/80 shadow-inner'
  },
  primary: {
    stripe: 'from-primary-navy via-[#0a4f8f] to-primary-blue-400',
    barAccent: 'from-primary-navy to-primary-blue-400',
    value: 'text-primary-navy',
    iconWrap: 'bg-gradient-to-br from-primary-blue-100 to-primary-blue-50 text-primary-navy ring-primary-blue-200/70 shadow-sm'
  },
  success: {
    stripe: 'from-emerald-600 via-emerald-500 to-teal-400',
    barAccent: 'from-emerald-600 to-teal-500',
    value: 'text-emerald-700',
    iconWrap: 'bg-gradient-to-br from-emerald-100 to-emerald-50 text-emerald-700 ring-emerald-200/80 shadow-sm'
  },
  successAlt: {
    stripe: 'from-teal-600 via-teal-500 to-cyan-400',
    barAccent: 'from-teal-600 to-cyan-500',
    value: 'text-teal-700',
    iconWrap: 'bg-gradient-to-br from-teal-100 to-teal-50 text-teal-700 ring-teal-200/80 shadow-sm'
  },
  muted: {
    stripe: 'from-slate-500 to-slate-400',
    barAccent: 'from-slate-500 to-slate-400',
    value: 'text-slate-800',
    iconWrap: 'bg-gradient-to-br from-slate-100 to-white text-slate-600 ring-slate-200/80 shadow-inner'
  },
  warning: {
    stripe: 'from-amber-600 via-amber-500 to-orange-400',
    barAccent: 'from-amber-600 to-orange-400',
    value: 'text-amber-800',
    iconWrap: 'bg-gradient-to-br from-amber-100 to-amber-50 text-amber-700 ring-amber-200/80 shadow-sm'
  },
  danger: {
    stripe: 'from-rose-600 via-rose-500 to-orange-400',
    barAccent: 'from-rose-600 to-rose-400',
    value: 'text-rose-700',
    iconWrap: 'bg-gradient-to-br from-rose-100 to-rose-50 text-rose-700 ring-rose-200/80 shadow-sm'
  },
  dangerStrong: {
    stripe: 'from-rose-800 via-rose-600 to-rose-500',
    barAccent: 'from-rose-800 to-rose-500',
    value: 'text-rose-800',
    iconWrap: 'bg-gradient-to-br from-rose-100 to-rose-50 text-rose-800 ring-rose-200/80 shadow-sm'
  }
};

function RecoveryThroughputMetric({ label, value, intent = 'default', icon: Glyph, dense = false }) {
  const s = RECOVERY_INTENTS[intent] || RECOVERY_INTENTS.default;
  return (
    <div
      className={`group relative overflow-hidden rounded-xl border border-white/90 bg-white shadow-sm ring-1 ring-slate-900/[0.04] transition duration-200 hover:border-slate-300/90 hover:shadow ${
        dense ? 'p-3.5 sm:p-4' : 'p-5 hover:-translate-y-0.5 hover:shadow-md'
      }`}
    >
      <div className={`absolute inset-x-0 top-0 bg-gradient-to-r ${dense ? 'h-0.5' : 'h-[3px]'} ${s.stripe}`} aria-hidden />
      <div className={`flex items-start justify-between gap-3 ${dense ? 'pt-1' : 'pt-2'}`}>
        <p className="min-w-0 text-[10px] font-bold uppercase leading-snug tracking-[0.14em] text-slate-500">{label}</p>
        <span className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ring-1 ring-inset sm:h-10 sm:w-10 ${s.iconWrap}`}>
          {Glyph ? <Glyph className={dense ? 'h-4 w-4 sm:h-[18px] sm:w-[18px]' : 'h-5 w-5'} strokeWidth={2} /> : null}
        </span>
      </div>
      <p
        className={`font-bold leading-none tracking-tight tabular-nums ${dense ? 'mt-2 text-[1.4rem] sm:text-[1.55rem]' : 'mt-5 text-[1.75rem] sm:text-[2rem]'} ${s.value}`}
      >
        {Number.isFinite(value) ? value.toLocaleString() : (value || 0)}
      </p>
    </div>
  );
}

function RecoveryOutcomeMetric({ label, value, intent = 'muted', icon: Glyph }) {
  const s = RECOVERY_INTENTS[intent] || RECOVERY_INTENTS.muted;
  return (
    <div className="relative min-h-[5.75rem] bg-white/[0.55] p-3.5 pl-5 transition-colors hover:bg-white/90 sm:min-h-[6.25rem] sm:p-4 sm:pl-6">
      <span
        className={`absolute bottom-4 left-0 top-4 w-[3px] rounded-full bg-gradient-to-b opacity-95 ${s.barAccent}`}
        aria-hidden
      />
      <div className="flex items-start justify-between gap-2">
        <p className="min-w-0 text-[9px] font-bold uppercase leading-snug tracking-[0.12em] text-slate-500 sm:text-[10px]">
          {label}
        </p>
        <span className={`inline-flex shrink-0 rounded-lg p-1.5 ring-1 ${s.iconWrap}`}>
          {Glyph ? <Glyph className="h-3.5 w-3.5 sm:h-4 sm:w-4" strokeWidth={2} /> : null}
        </span>
      </div>
      <p className={`mt-3 text-xl font-bold tabular-nums sm:text-[1.4rem] ${s.value}`}>
        {Number.isFinite(value) ? value.toLocaleString() : (value || 0)}
      </p>
    </div>
  );
}

function SummaryTile({ label, value, accent, dense = false }) {
  return (
    <div
      className={`relative flex flex-col justify-center overflow-hidden rounded-xl border border-slate-200/90 bg-white shadow-sm ring-1 ring-slate-900/[0.03] ${
        dense
          ? 'min-h-0 px-2.5 py-2 sm:px-3 sm:py-2.5'
          : 'min-h-[4.25rem] px-3 py-2.5 sm:min-h-[4.5rem] sm:px-4 sm:py-3'
      }`}
    >
      <span className={`absolute left-0 w-1 rounded-full bg-primary-navy/80 ${dense ? 'inset-y-1.5' : 'inset-y-2'}`} aria-hidden />
      <p className={`pl-2 font-semibold uppercase tracking-wide text-slate-500 ${dense ? 'text-[9px] tracking-wider sm:text-[10px]' : 'text-[10px] sm:text-xs'}`}>
        {label}
      </p>
      <p className={`mt-0.5 pl-2 font-bold leading-none tabular-nums ${dense ? 'text-base sm:text-lg' : 'text-xl sm:text-2xl'} ${accent || 'text-slate-900'}`}>
        {Number.isFinite(value) ? value.toLocaleString() : (value || 0)}
      </p>
    </div>
  );
}

/** Booked cohort reference (Overview parity) when single IST day + template selected */
function CohortSummaryTile({ label, value, subtitle, loading }) {
  return (
    <div className="relative flex flex-col justify-center overflow-hidden rounded-xl border border-slate-200/90 bg-white px-2.5 py-2 shadow-sm ring-1 ring-slate-900/[0.03] sm:px-3 sm:py-2.5">
      <span className="absolute left-0 inset-y-1.5 w-1 rounded-full bg-primary-navy/80 sm:inset-y-2" aria-hidden />
      <p className="pl-2 text-[9px] font-bold uppercase tracking-wider text-slate-500 sm:text-[10px]">{label}</p>
      <p className="mt-0.5 pl-2 text-base font-bold leading-none tabular-nums text-primary-navy sm:text-lg">
        {loading ? <FiLoader className="inline animate-spin text-primary-navy" size={18} aria-label="Loading" /> : Number.isFinite(value) ? value.toLocaleString() : '—'}
      </p>
      {subtitle ? (
        <p className="mt-1 pl-2 text-[10px] leading-snug text-slate-500 line-clamp-2">{subtitle}</p>
      ) : null}
    </div>
  );
}

function severityStripeClass(row) {
  if (row.retryExhausted) return 'bg-rose-500';
  if (row.lifecycleState === 'failed') return 'bg-amber-500';
  if (row.exclusionReason) return 'bg-slate-400';
  if (['queued', 'submitted', 'sent', 'retry_pending'].includes(row.lifecycleState)) return 'bg-sky-400';
  return 'bg-slate-200';
}

/* ============================================================================
 * RecoveryCommandBar — unified header + KPIs + filters in one panel
 * ========================================================================= */

function RecoveryStatTile({ label, value, barClass, loading }) {
  return (
    <div className="relative overflow-hidden rounded-xl border border-slate-200/90 bg-white px-3 py-3 shadow-sm ring-1 ring-slate-900/[0.03] sm:px-4">
      <span className={`absolute inset-y-2 left-0 w-1 rounded-full ${barClass}`} aria-hidden />
      <p className="pl-2 text-[10px] font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 pl-2 text-xl font-bold tabular-nums text-slate-900">
        {loading ? '…' : typeof value === 'number' ? value.toLocaleString() : (value ?? '—')}
      </p>
    </div>
  );
}

function RecoveryCommandBar({
  totalRows, totals, totalsByCategory,
  jobActive, onRefresh, loading, lastSyncAt,
  messageKind, cohortLoading, cohortBookedSlots, cohortSubtitle, cohortHint,
  from, to, group, search,
  opsProduct, isIitProduct, isOneOnOneProduct, isGuidanceBookingProduct, isJeeMockTestProduct, preferredLanguage, visibleTemplateChips, selectedChipKey,
  onFromChange, onToChange, onTemplateChange, onGroupChange, onSearchChange,
  onOpsProductChange, onTemplateChipSelect,
  embedded = false
}) {
  const showCohort = cohortSubtitle != null;
  const categoryEntries = Object.entries(totalsByCategory || {})
    .filter(([, c]) => c > 0)
    .sort((a, b) => (b[1] || 0) - (a[1] || 0));

  const fieldClass =
    'mt-1.5 block h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 shadow-sm placeholder:text-slate-400 focus:border-primary-navy/40 focus:outline-none focus:ring-2 focus:ring-primary-navy/15';

  const shellClass = embedded
    ? ''
    : 'overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-sm ring-1 ring-slate-900/[0.04]';

  const groupCount = (id) => (id === 'all' ? totalRows : totals[id] ?? 0);

  return (
    <section className={shellClass}>
      <div className="border-b border-slate-100 px-4 py-4 sm:px-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 border-l-[3px] border-primary-navy pl-3">
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">Recovery</p>
            <h1 className="mt-1 text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">Manual recovery</h1>
            <p className="mt-1 max-w-2xl text-sm leading-relaxed text-slate-600">
              Unresolved recipients for the selected product and date range. Pick a template to preview and send a recovery batch.
            </p>
          </div>
          <div className="flex shrink-0 flex-col items-stretch gap-2 sm:items-end">
            {lastSyncAt && (
              <p className="text-xs text-slate-400">Last sync {formatDt(lastSyncAt)}</p>
            )}
            <button
              type="button"
              onClick={onRefresh}
              disabled={loading}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-primary-navy shadow-sm transition hover:bg-slate-50 disabled:opacity-50"
            >
              <FiRefreshCw size={15} className={loading ? 'animate-spin' : ''} />
              Refresh data
            </button>
          </div>
        </div>
        {jobActive && (
          <p className="mt-3 inline-flex items-center gap-2 rounded-lg border border-primary-blue-200 bg-primary-blue-50 px-3 py-1.5 text-xs font-medium text-primary-navy">
            <FiRotateCw className="animate-spin" size={12} />
            Batch running — list auto-refreshes
          </p>
        )}
      </div>

      {cohortHint && (
        <div className="mx-4 mb-0 flex items-start gap-2 rounded-lg border border-amber-100 bg-amber-50 px-3 py-2 text-xs text-amber-900 sm:mx-5">
          <FiInfo className="mt-0.5 shrink-0" size={14} />
          <span>{cohortHint}</span>
        </div>
      )}

      <div className={`grid grid-cols-2 gap-2 p-3 sm:grid-cols-4 sm:gap-3 sm:p-4 ${showCohort ? 'lg:grid-cols-5' : ''}`}>
        {showCohort && (
          <RecoveryStatTile
            label="Booked (cohort)"
            value={cohortBookedSlots}
            barClass="bg-primary-navy/90"
            loading={cohortLoading}
          />
        )}
        <RecoveryStatTile label="All unresolved" value={totalRows} barClass="bg-slate-500/90" />
        <RecoveryStatTile label="Failed" value={totals.failed || 0} barClass="bg-rose-500/90" />
        <RecoveryStatTile label="Excluded" value={totals.excluded || 0} barClass="bg-violet-500/90" />
        <RecoveryStatTile label="Exhausted" value={totals.exhausted || 0} barClass="bg-amber-500/90" />
      </div>

      <div className="border-t border-slate-100 px-4 py-4 sm:px-5">
        <p className="text-xs font-bold uppercase tracking-[0.1em] text-slate-500">Filters</p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold text-slate-500">Product</span>
          <button
            type="button"
            onClick={() => onOpsProductChange(OPS_PRODUCT_GUIDEXPERT)}
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
            onClick={() => onOpsProductChange(OPS_PRODUCT_IIT)}
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
            onClick={() => onOpsProductChange(OPS_PRODUCT_ONE_ON_ONE)}
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
            onClick={() => onOpsProductChange(OPS_PRODUCT_GUIDANCE_BOOKING)}
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
            onClick={() => onOpsProductChange(OPS_PRODUCT_JEE_MOCK_TEST)}
            className={`rounded-lg border px-3 py-1.5 text-sm font-semibold transition ${
              opsProduct === OPS_PRODUCT_JEE_MOCK_TEST
                ? 'border-primary-navy bg-primary-navy text-white'
                : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
            }`}
          >
            JEE Mock Test
          </button>
        </div>

        {(isIitProduct || isOneOnOneProduct || isGuidanceBookingProduct || isJeeMockTestProduct) && (
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => onTemplateChipSelect(null)}
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
                  onClick={() => onTemplateChipSelect(chip)}
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
            {preferredLanguage && (
              <span className="self-center text-xs text-slate-500">· {preferredLanguage}</span>
            )}
          </div>
        )}

        <div className="mt-3 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-12 lg:items-end">
          <label className="text-sm font-medium text-slate-700 lg:col-span-2">
            From
            <input type="date" value={from} onChange={(e) => onFromChange(e.target.value)} className={fieldClass} />
          </label>
          <label className="text-sm font-medium text-slate-700 lg:col-span-2">
            To
            <input type="date" value={to} onChange={(e) => onToChange(e.target.value)} className={fieldClass} />
          </label>
          {opsProduct === OPS_PRODUCT_GUIDEXPERT && (
            <label className="text-sm font-medium text-slate-700 lg:col-span-3">
              Template
              <select value={messageKind} onChange={(e) => onTemplateChange(e.target.value)} className={fieldClass}>
                <option value="">All templates</option>
                {GX_TEMPLATE_OPTIONS.filter((o) => o.value).map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </label>
          )}
          <label className={`text-sm font-medium text-slate-700 ${isIitProduct || isOneOnOneProduct || isGuidanceBookingProduct || isJeeMockTestProduct ? 'lg:col-span-8' : 'lg:col-span-5'}`}>
            Search
            <input
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Phone, name, or error text"
              className={fieldClass}
            />
          </label>
        </div>
      </div>

      <nav className="scrollbar-hide flex gap-1 overflow-x-auto border-t border-slate-100 px-4 sm:px-5" aria-label="Recipient status">
        {GROUP_OPTIONS.map((g) => {
          const active = group === g.id;
          const count = groupCount(g.id);
          return (
            <button
              key={g.id}
              type="button"
              onClick={() => onGroupChange(g.id)}
              className={`shrink-0 border-b-2 px-3 py-3 text-sm font-semibold transition-colors ${
                active
                  ? 'border-primary-navy text-primary-navy'
                  : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-800'
              }`}
            >
              {g.label}
              <span className={`ml-1.5 tabular-nums text-xs font-medium ${active ? 'text-primary-navy/80' : 'text-slate-400'}`}>
                {count.toLocaleString()}
              </span>
            </button>
          );
        })}
      </nav>

      {categoryEntries.length > 0 && (
        <details className="border-t border-slate-100 px-4 sm:px-5">
          <summary className="cursor-pointer py-2.5 text-xs font-semibold text-slate-600 hover:text-slate-900">
            Exclusion breakdown · {categoryEntries.length} categories
          </summary>
          <div className="flex flex-wrap gap-2 pb-4">
            {categoryEntries.map(([cat, count]) => (
              <span
                key={cat}
                className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs text-slate-700"
              >
                <span>{EXCLUSION_CATEGORY_LABELS[cat] || cat}</span>
                <span className="font-semibold tabular-nums text-slate-900">{count.toLocaleString()}</span>
              </span>
            ))}
          </div>
        </details>
      )}
    </section>
  );
}

/* ============================================================================
 * RecoveryBatchHero — themed live execution card with 3+3 KPI grid + footer
 * ========================================================================= */

function recoveryHeroChrome(status) {
  const active = {
    spectrum: 'from-primary-navy via-violet-600 to-sky-500',
    ringVariant: 'active',
    cardRing: 'ring-primary-blue-200/50',
    header:
      'border-b border-white/10 bg-gradient-to-br from-[#001f3d] via-primary-navy to-[#074a82] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]',
    kicker: 'text-sky-200/70',
    title: 'text-white',
    templateMono: 'font-mono text-sky-100/90 font-medium',
    dotSep: 'text-sky-400/55',
    iconShell:
      'bg-gradient-to-br from-white/25 to-white/5 text-white ring-white/35 shadow-xl shadow-black/25 backdrop-blur-sm',
    statusBadge:
      'border-white/20 bg-white/10 text-white shadow-inner shadow-black/20 backdrop-blur-md',
    dot: 'bg-sky-300 shadow-[0_0_14px_rgba(125,211,252,0.75)]',
    batchChip: 'border-white/15 bg-black/22 font-mono text-sky-100/95 shadow-inner backdrop-blur-sm',
    bodyBgClass:
      'bg-[radial-gradient(ellipse_90%_50%_at_12%_-20%,rgba(77,142,199,0.11),transparent_50%),rgb(248,250,252)]',
    gridPatternClass:
      '[background-image:radial-gradient(circle_at_1px_1px,rgba(100,116,139,0.11)_1px,transparent_0)] bg-[length:24px_24px]',
    progressShell: 'border-slate-200/80 bg-white/90 shadow-[0_2px_24px_-14px_rgba(15,23,42,0.12)] ring-slate-900/[0.04]',
    progressTrack: 'bg-slate-200/90 shadow-[inset_0_2px_4px_rgba(15,23,42,0.06)]',
    progressPercent: 'text-primary-navy',
    ringPctLabel: 'text-primary-navy',
    progressFillClassName: 'bg-gradient-to-r from-primary-navy via-[#084a82] to-primary-blue-400',
    cancelBtn:
      'border-rose-300/55 bg-white/10 text-rose-100 shadow-lg shadow-black/15 backdrop-blur-sm hover:bg-rose-500/20 hover:border-rose-200/80',
    dismissBtn:
      'border-white/18 bg-white/10 text-white/90 backdrop-blur-sm hover:bg-white/14',
    footerBar:
      'border-slate-200/85 bg-gradient-to-r from-white via-primary-blue-50/40 to-sky-50/30 shadow-[0_4px_30px_-18px_rgba(0,51,102,0.35)] ring-slate-900/[0.04]',
    footerRateBorder: 'border-primary-navy',
    footerElapsedBorder: 'border-slate-300',
    rateValue: 'text-primary-navy',
    elapsedValue: 'text-slate-800',
    refreshPill:
      'border-sky-300/55 bg-white/70 text-primary-navy shadow-md shadow-primary-navy/10 backdrop-blur-md',
    metaMuted: 'text-slate-600'
  };

  switch (status) {
    case 'completed':
      return {
        spectrum: 'from-emerald-500 via-teal-500 to-cyan-400',
        ringVariant: 'completed',
        cardRing: 'ring-emerald-200/55',
        header:
          'border-b border-emerald-400/25 bg-gradient-to-r from-emerald-950 via-emerald-900 to-teal-900 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]',
        kicker: 'text-emerald-200/75',
        title: 'text-white',
        templateMono: 'font-mono text-emerald-100/95 font-medium',
        dotSep: 'text-emerald-400/50',
        iconShell:
          'bg-white/15 text-white ring-emerald-200/35 shadow-xl shadow-emerald-950/35 backdrop-blur-sm',
        statusBadge:
          'border-emerald-300/40 bg-emerald-500/12 text-emerald-50 backdrop-blur-md shadow-inner',
        dot: 'bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.75)]',
        batchChip: 'border-white/12 bg-black/28 font-mono text-emerald-100/95 backdrop-blur-sm',
        bodyBgClass:
          'bg-[radial-gradient(ellipse_100%_55%_at_8%_-25%,rgba(16,185,129,0.09),transparent_52%),rgb(248,250,252)]',
        gridPatternClass:
          '[background-image:radial-gradient(circle_at_1px_1px,rgba(100,116,139,0.1)_1px,transparent_0)] bg-[length:24px_24px]',
        progressShell: 'border-emerald-200/60 bg-white/95 shadow-[0_2px_28px_-14px_rgba(6,78,59,0.12)] ring-emerald-900/[0.05]',
        progressTrack: 'bg-emerald-100/80 shadow-[inset_0_2px_4px_rgba(6,78,59,0.07)]',
        progressPercent: 'text-emerald-950',
        ringPctLabel: 'text-emerald-900',
        progressFillClassName: 'bg-gradient-to-r from-emerald-600 via-teal-500 to-cyan-400',
        cancelBtn: active.cancelBtn,
        dismissBtn:
          'border-white/20 bg-white/10 text-emerald-50 backdrop-blur-sm hover:bg-white/16',
        footerBar:
          'border-emerald-200/70 bg-gradient-to-r from-emerald-50/95 via-white to-teal-50/45 ring-emerald-900/[0.04]',
        footerRateBorder: 'border-emerald-600',
        footerElapsedBorder: 'border-slate-300',
        rateValue: 'text-emerald-800',
        elapsedValue: 'text-slate-800',
        refreshPill:
          'border-emerald-300/50 bg-emerald-50/90 text-emerald-900 shadow-sm backdrop-blur-sm',
        metaMuted: 'text-slate-600'
      };
    case 'failed':
      return {
        spectrum: 'from-rose-600 via-rose-500 to-amber-500',
        ringVariant: 'failed',
        cardRing: 'ring-rose-200/55',
        header:
          'border-b border-rose-500/30 bg-gradient-to-r from-rose-950 via-rose-900 to-slate-950 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]',
        kicker: 'text-rose-200/75',
        title: 'text-white',
        templateMono: 'font-mono text-rose-100/95 font-medium',
        dotSep: 'text-rose-400/45',
        iconShell:
          'bg-white/12 text-white ring-rose-300/35 shadow-xl shadow-rose-950/40 backdrop-blur-sm',
        statusBadge: 'border-rose-300/45 bg-rose-500/15 text-rose-50 backdrop-blur-md shadow-inner',
        dot: 'bg-rose-400 shadow-[0_0_12px_rgba(251,113,133,0.65)]',
        batchChip: 'border-white/12 bg-black/30 font-mono text-rose-100/95 backdrop-blur-sm',
        bodyBgClass:
          'bg-[radial-gradient(ellipse_100%_55%_at_8%_-25%,rgba(244,63,94,0.07),transparent_52%),rgb(248,250,252)]',
        gridPatternClass:
          '[background-image:radial-gradient(circle_at_1px_1px,rgba(100,116,139,0.1)_1px,transparent_0)] bg-[length:24px_24px]',
        progressShell: 'border-rose-200/55 bg-white/95 shadow-[0_2px_28px_-14px_rgba(136,19,55,0.12)] ring-rose-900/[0.05]',
        progressTrack: 'bg-rose-100/70 shadow-[inset_0_2px_4px_rgba(136,19,55,0.08)]',
        progressPercent: 'text-rose-950',
        ringPctLabel: 'text-rose-950',
        progressFillClassName: 'bg-gradient-to-r from-rose-600 via-rose-500 to-amber-400',
        cancelBtn: active.cancelBtn,
        dismissBtn:
          'border-white/20 bg-white/10 text-rose-50 backdrop-blur-sm hover:bg-white/14',
        footerBar:
          'border-rose-200/65 bg-gradient-to-r from-rose-50/90 via-white to-orange-50/35 ring-rose-900/[0.04]',
        footerRateBorder: 'border-rose-600',
        footerElapsedBorder: 'border-slate-300',
        rateValue: 'text-rose-800',
        elapsedValue: 'text-slate-800',
        refreshPill:
          'border-rose-200/60 bg-rose-50/90 text-rose-900 shadow-sm backdrop-blur-sm',
        metaMuted: 'text-slate-600'
      };
    case 'cancelled':
      return {
        spectrum: 'from-slate-600 via-slate-500 to-slate-400',
        ringVariant: 'cancelled',
        cardRing: 'ring-slate-200/70',
        header:
          'border-b border-slate-600/35 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-700 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]',
        kicker: 'text-slate-300/80',
        title: 'text-white',
        templateMono: 'font-mono text-slate-200/95 font-medium',
        dotSep: 'text-slate-500/60',
        iconShell:
          'bg-white/12 text-white ring-slate-400/30 shadow-lg shadow-black/25 backdrop-blur-sm',
        statusBadge: 'border-slate-400/35 bg-slate-500/15 text-slate-100 backdrop-blur-md',
        dot: 'bg-slate-300 shadow-[0_0_8px_rgba(203,213,225,0.5)]',
        batchChip: 'border-white/10 bg-black/25 font-mono text-slate-200/95 backdrop-blur-sm',
        bodyBgClass:
          'bg-[radial-gradient(ellipse_100%_55%_at_8%_-25%,rgba(100,116,139,0.08),transparent_52%),rgb(248,250,252)]',
        gridPatternClass:
          '[background-image:radial-gradient(circle_at_1px_1px,rgba(100,116,139,0.1)_1px,transparent_0)] bg-[length:24px_24px]',
        progressShell: 'border-slate-200/80 bg-white/95 shadow-[0_2px_24px_-14px_rgba(15,23,42,0.1)]',
        progressTrack: 'bg-slate-200/90 shadow-[inset_0_2px_4px_rgba(15,23,42,0.06)]',
        progressPercent: 'text-slate-900',
        ringPctLabel: 'text-slate-800',
        progressFillClassName: 'bg-gradient-to-r from-slate-600 to-slate-400',
        cancelBtn: active.cancelBtn,
        dismissBtn:
          'border-white/18 bg-white/10 text-slate-100 backdrop-blur-sm hover:bg-white/14',
        footerBar:
          'border-slate-200/85 bg-gradient-to-r from-slate-50/95 via-white to-slate-100/40 ring-slate-900/[0.04]',
        footerRateBorder: 'border-slate-600',
        footerElapsedBorder: 'border-slate-300',
        rateValue: 'text-slate-800',
        elapsedValue: 'text-slate-800',
        refreshPill:
          'border-slate-300/70 bg-slate-100/90 text-slate-800 shadow-sm backdrop-blur-sm',
        metaMuted: 'text-slate-600'
      };
    default:
      return active;
  }
}

function RecoveryBatchHero({ job, isSuper, onCancel, onDismiss, dismissed }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    /** Drive the elapsed timer at 1s while a job is present and not yet terminal. */
    if (!job || isTerminal(job.status)) return undefined;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [job]);

  if (!job || dismissed) return null;

  const counters = job.counters || {};
  const targeted = counters.targeted || (job.candidatePhonesCount || 0);
  const completedSteps = (counters.attempted || 0)
    + (counters.skippedAlreadyDelivered || 0)
    + (counters.skippedGlobalRecentSuccess || 0)
    + (counters.skippedInFlightDuplicate || 0);
  const percent = job.progressPercent != null
    ? job.progressPercent
    : (targeted ? Math.min(100, Math.round((completedSteps / targeted) * 100)) : 0);
  const recovered = counters.recovered || 0;
  const recoveryRate =
    typeof counters.recoveryRatePct === 'number' && Number.isFinite(counters.recoveryRatePct)
      ? counters.recoveryRatePct
      : (targeted ? Math.round((recovered / targeted) * 1000) / 10 : 0);

  const startedAt = job.startedAt ? new Date(job.startedAt).getTime() : null;
  const finishedAt = job.finishedAt ? new Date(job.finishedAt).getTime() : null;
  const elapsedMs = startedAt ? (finishedAt || now) - startedAt : 0;

  const isRunning = !isTerminal(job.status);
  const chrome = recoveryHeroChrome(job.status);

  let stageBadge = 'Running';
  if (job.status === 'completed') stageBadge = 'Completed';
  else if (job.status === 'failed') stageBadge = 'Failed';
  else if (job.status === 'cancelled') stageBadge = 'Cancelled';
  else if (job.status === 'queued') stageBadge = 'Queued';

  const batchSuffix = String(job._id || '').slice(-8);
  const messageKindLabel = job.messageKind || job.template || '—';

  const dotPulse = isRunning && (job.status === 'running' || job.status === 'queued');

  return (
    <section
      className={`relative overflow-hidden rounded-2xl border border-slate-200/85 bg-white shadow-md ring-1 ring-slate-900/[0.04] xl:ring-inset ${chrome.cardRing}`}
    >
      <div className={`relative px-4 py-3.5 sm:px-5 sm:py-4 ${chrome.header}`}>
        <div
          className="pointer-events-none absolute inset-0 bg-[linear-gradient(120deg,rgba(255,255,255,0.06)_0%,transparent_42%,transparent_100%)] mix-blend-overlay"
          aria-hidden
        />
        <div className="relative flex flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <span
              className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ring-2 ring-inset ${chrome.iconShell}`}
            >
              <FiActivity size={20} strokeWidth={2} />
            </span>
            <div className="min-w-0">
              <p className={`text-[10px] font-bold uppercase tracking-[0.16em] ${chrome.kicker}`}>Live operation</p>
              <h3 className="mt-1 truncate text-base font-semibold tracking-tight sm:text-[1.05rem]">
                <span className={chrome.title}>Recovery batch</span>
                <span className={`mx-1.5 text-sm font-normal ${chrome.dotSep}`} aria-hidden>
                  ·
                </span>
                <span className={`text-[0.875rem] ${chrome.templateMono}`}>{messageKindLabel}</span>
              </h3>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:justify-end">
            <span
              className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[11px] font-bold uppercase tracking-wide ${chrome.statusBadge}`}
            >
              <span
                className={`relative flex h-2 w-2 shrink-0 rounded-full ${chrome.dot}${dotPulse ? ' motion-safe:animate-pulse' : ''}`}
                aria-hidden
              />
              {stageBadge}
            </span>
            <span
              className={`rounded-lg border px-2 py-1 font-mono text-[10px] font-semibold tabular-nums tracking-normal sm:text-[11px] ${chrome.batchChip}`}
            >
              Batch · {batchSuffix}
            </span>
            {isSuper && isRunning && (
              <button
                type="button"
                onClick={onCancel}
                title="Cancel this recovery batch"
                className={`inline-flex h-8 items-center gap-1 rounded-lg border px-3 text-[11px] font-bold uppercase tracking-wide transition sm:h-9 sm:rounded-xl ${chrome.cancelBtn}`}
              >
                <FiSlash size={13} strokeWidth={2.5} /> Cancel
              </button>
            )}
            {!isRunning && typeof onDismiss === 'function' && (
              <button
                type="button"
                onClick={onDismiss}
                title="Dismiss completed batch banner"
                className={`inline-flex h-8 items-center gap-1 rounded-lg border px-3 text-[11px] font-semibold transition sm:h-9 sm:rounded-xl ${chrome.dismissBtn}`}
              >
                <FiX size={13} strokeWidth={2.5} /> Dismiss
              </button>
            )}
          </div>
        </div>
      </div>

      <div className={`relative ${chrome.bodyBgClass}`}>
        <div className="relative space-y-4 px-4 py-4 sm:px-5 sm:py-5">
          <div className={`rounded-xl border p-4 ring-1 ring-inset sm:p-4 ${chrome.progressShell}`}>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-5">
              <div
                className={`flex shrink-0 flex-col justify-center rounded-lg border border-slate-100 bg-slate-50/80 px-4 py-2 text-center tabular-nums sm:min-w-[5.25rem]`}
              >
                <span className={`text-[1.85rem] font-bold leading-none sm:text-[2rem] ${chrome.ringPctLabel}`}>{percent}%</span>
                <span className="mt-1 text-[9px] font-semibold uppercase tracking-[0.12em] text-slate-500">Progress</span>
              </div>
              <div className="min-w-0 flex-1 space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">Batch progress</span>
                  <span className={`font-mono text-xs font-bold tabular-nums ${chrome.progressPercent}`}>
                    {completedSteps.toLocaleString()} / {targeted.toLocaleString()} steps
                  </span>
                </div>
                <div
                  className={`relative h-2.5 w-full overflow-hidden rounded-full ${chrome.progressTrack}`}
                  role="progressbar"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={percent}
                  aria-label={`Recovery progress ${percent} percent`}
                >
                  <div
                    className={`relative h-full overflow-hidden rounded-full shadow-sm transition-[width] duration-700 ease-out ${chrome.progressFillClassName}`}
                    style={{ width: `${percent}%` }}
                  >
                    <span
                      className="pointer-events-none absolute inset-y-0 left-0 w-full bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.28),transparent)]"
                      aria-hidden
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div>
            <div className="mb-3 flex flex-wrap items-end justify-between gap-2 border-b border-slate-200/80 pb-2">
              <h4 className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">Throughput</h4>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <RecoveryThroughputMetric label="Targeted" value={targeted} icon={FiTarget} intent="default" dense />
              <RecoveryThroughputMetric
                label="Attempted"
                value={counters.attempted || 0}
                icon={FiArrowRight}
                intent="default"
                dense
              />
              <RecoveryThroughputMetric
                label="Accepted"
                value={counters.apiAccepted || 0}
                icon={FiActivity}
                intent="primary"
                dense
              />
            </div>
          </div>

          <details
            className="group overflow-hidden rounded-xl border border-slate-200/85 bg-white ring-1 ring-slate-900/[0.04] open:bg-white"
            open={!isRunning}
          >
            <summary className="cursor-pointer list-none px-4 py-3 [&::-webkit-details-marker]:hidden">
              <span className="flex w-full flex-wrap items-center justify-between gap-2">
                <span>
                  <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">Outcomes</span>
                  <span className="ml-2 text-xs font-medium text-slate-400">
                    Recovered · delivered · exclusions · failures
                  </span>
                </span>
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-primary-navy">
                  <span className="sm:hidden">{isRunning ? 'Tap to expand' : 'Details'}</span>
                  <span className="hidden sm:inline">{isRunning ? 'Expand while running' : 'Toggle'}</span>
                  <FiChevronDown className="h-4 w-4 shrink-0 text-slate-400 transition-transform group-open:rotate-180" aria-hidden />
                </span>
              </span>
            </summary>
            <div className="border-t border-slate-100">
              <div className="grid grid-cols-2 divide-x divide-y divide-slate-200/85 sm:grid-cols-3 lg:grid-cols-6">
                <RecoveryOutcomeMetric label="Recovered" value={recovered} icon={FiCheckCircle} intent="success" />
                <RecoveryOutcomeMetric label="Delivered (post)" value={counters.delivered || 0} icon={FiCheckCircle} intent="successAlt" />
                <RecoveryOutcomeMetric label="Excluded (post)" value={counters.excluded || 0} icon={FiSlash} intent="muted" />
                <RecoveryOutcomeMetric label="Failed" value={counters.sendFailed || 0} icon={FiAlertTriangle} intent="danger" />
                <RecoveryOutcomeMetric label="In-flight" value={counters.inFlight || 0} icon={FiClock} intent="warning" />
                <RecoveryOutcomeMetric label="Failed (post)" value={counters.failed || 0} icon={FiAlertOctagon} intent="dangerStrong" />
              </div>
            </div>
          </details>

          {job.errorSummary && (
            <div className="rounded-xl border border-rose-300/55 bg-gradient-to-br from-rose-50 to-white p-3.5 text-sm leading-relaxed text-rose-900 shadow-sm ring-1 ring-rose-900/[0.05]">
              <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-rose-700">Batch error</p>
              <p className="mt-1.5">{job.errorSummary}</p>
            </div>
          )}

          <div
            className={`flex flex-wrap items-center justify-between gap-4 rounded-xl border px-4 py-4 ring-1 sm:gap-6 ${chrome.footerBar}`}
          >
            <div className="flex flex-wrap items-stretch gap-5 sm:gap-8">
              <div className={`min-w-[5.5rem] border-l-[3px] pl-3 ${chrome.footerRateBorder}`}>
                <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-slate-500">Recovery rate</p>
                <p className={`mt-1.5 font-mono text-xl font-bold tabular-nums sm:text-2xl ${chrome.rateValue}`}>{recoveryRate}%</p>
              </div>
              <div className={`min-w-[5.5rem] border-l-[3px] pl-3 ${chrome.footerElapsedBorder}`}>
                <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-slate-500">Elapsed</p>
                <p className={`mt-1.5 font-mono text-xl font-bold tabular-nums sm:text-2xl ${chrome.elapsedValue}`}>{formatElapsed(elapsedMs)}</p>
              </div>
            </div>
            <div className={`flex min-w-[11rem] flex-col items-start gap-1 sm:items-end sm:text-right ${chrome.metaMuted} text-[11px] sm:text-xs`}>
              {isRunning ? (
                <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[10px] font-bold uppercase tracking-wide ${chrome.refreshPill}`}>
                  <FiRotateCw className="shrink-0 motion-safe:animate-spin" size={12} strokeWidth={2.5} />
                  Auto-refresh 2s
                </span>
              ) : (
                <span>Started {formatDt(job.startedAt)}</span>
              )}
              {!isRunning && job.finishedAt && <span className="text-slate-500">Finished {formatDt(job.finishedAt)}</span>}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ============================================================================
 * RecoveryActionStrip — compact single-card action bar replacing two tall cards
 * ========================================================================= */

function RecoveryActionStrip({
  messageKind, isSuper, selectedPhones, job, recentJobs,
  preview, previewLoading, previewErr, starting, actionErr,
  onPreview, onStart,
  embedded = false
}) {
  const isRunning = job && (job.status === 'queued' || job.status === 'running');
  const isSlotBooked = messageKind === 'slot_booked';
  const top3 = (recentJobs || []).slice(0, 3);

  const targeted = selectedPhones?.length || preview?.candidates?.length || 0;
  const skippedTotal = preview
    ? (preview.skippedAlreadyDelivered || 0)
      + (preview.skippedGlobalRecentSuccess || 0)
      + (preview.skippedInFlightDuplicate || 0)
    : null;
  const ready = !!preview && targeted > 0;

  const recentSection = top3.length > 0 ? (
    <div className="border-t border-slate-100 px-4 py-2">
      <div className="scrollbar-hide flex flex-wrap gap-x-6 gap-y-1.5 overflow-x-auto">
        {top3.map((j) => {
          const c = j.counters || {};
          const rec = c.recovered || 0;
          const tgt = c.targeted || j.candidatePhonesCount || 0;
          const statusCls =
            j.status === 'completed' ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
            : j.status === 'failed' ? 'border-rose-200 bg-rose-50 text-rose-800'
            : j.status === 'cancelled' ? 'border-slate-200 bg-slate-50 text-slate-600'
            : 'border-amber-200 bg-amber-50 text-amber-800';
          return (
            <div key={j._id} className="flex shrink-0 items-center gap-2 text-xs text-slate-600">
              <span className="font-mono text-[11px] text-slate-400">{String(j._id).slice(-6)}</span>
              <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${statusCls}`}>{j.status}</span>
              <span className="font-mono tabular-nums">
                <span className="text-emerald-700">{rec}</span>
                <span className="text-slate-400">/</span>
                <span>{tgt}</span>
              </span>
              <span className="text-slate-400">{formatDt(j.createdAt)}</span>
            </div>
          );
        })}
      </div>
    </div>
  ) : null;

  const wrapClass = embedded
    ? 'border-t border-slate-200 bg-slate-50/60'
    : 'overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-sm ring-1 ring-slate-900/[0.04]';

  if (!messageKind) {
    return (
      <div className={wrapClass}>
        <p className="px-4 py-3 text-sm text-slate-600 sm:px-5">
          Select a specific template (not “All templates”) to preview and start recovery.
        </p>
        {recentSection}
      </div>
    );
  }

  if (isRunning) {
    return (
      <div className={wrapClass}>
        <div className="flex flex-wrap items-center gap-3 px-4 py-3 sm:px-5">
          <FiActivity className="shrink-0 text-primary-navy" size={18} />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-slate-900">Recovery batch running</p>
            <p className="text-xs text-slate-500">
              {messageKind} · started {formatDt(job.startedAt)} · see progress below
            </p>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-lg border border-primary-blue-200 bg-primary-blue-50 px-2.5 py-1 text-xs font-semibold text-primary-navy">
            <FiRotateCw className="animate-spin" size={12} /> In progress
          </span>
        </div>
        {recentSection}
      </div>
    );
  }

  return (
    <div className={wrapClass}>
      <div className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:px-5">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-slate-900">
            Recovery · <span className="font-mono text-primary-navy">{messageKind}</span>
          </p>
          <p className="mt-0.5 text-xs text-slate-500">
            {isSlotBooked
              ? 'Transactional send · immediate retry only'
              : 'Safe send with duplicate and delivered suppression'}
            {ready && (
              <span className="ml-2 inline-flex items-center gap-1 text-emerald-700">
                <FiCheckCircle size={12} /> {targeted} ready
              </span>
            )}
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onPreview}
            disabled={previewLoading}
            className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-primary-navy shadow-sm transition hover:bg-slate-50 disabled:opacity-60"
          >
            {previewLoading ? <FiLoader className="animate-spin" size={14} /> : <FiSearch size={14} />}
            {preview ? 'Re-run preview' : 'Preview batch'}
          </button>
          {isSuper && (
            <button
              type="button"
              onClick={onStart}
              disabled={starting || !ready}
              className={`inline-flex h-10 items-center gap-2 rounded-lg px-4 text-sm font-semibold shadow-sm transition disabled:cursor-not-allowed disabled:opacity-50 ${
                ready
                  ? 'bg-rose-600 text-white hover:bg-rose-700'
                  : 'border border-slate-200 bg-slate-100 text-slate-500'
              }`}
            >
              {starting ? <FiLoader className="animate-spin" size={14} /> : <FiPlay size={14} />}
              {selectedPhones?.length
                ? `Recover ${selectedPhones.length} selected`
                : ready
                  ? `Start recovery (${targeted})`
                  : 'Start recovery'}
            </button>
          )}
        </div>
      </div>

      {(previewErr || actionErr) && (
        <div className="mx-4 mb-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800 sm:mx-5">
          {previewErr || actionErr}
        </div>
      )}

      {(ready || selectedPhones?.length > 0) && (
        <div className="border-t border-slate-200/80 bg-white px-4 py-2 text-xs text-slate-600 sm:px-5">
          <span className="font-medium text-slate-800">
            {selectedPhones?.length ? `${selectedPhones.length} rows selected` : `${targeted} candidates after guards`}
          </span>
          {!selectedPhones?.length && skippedTotal != null && skippedTotal > 0 && (
            <span className="ml-2 text-slate-500">· {skippedTotal.toLocaleString()} skipped</span>
          )}
          {!selectedPhones?.length && preview && (
            <span className="ml-2 text-slate-500">
              · lookback {preview.lookbackDays || '—'}d
            </span>
          )}
        </div>
      )}

      {!ready && !selectedPhones?.length && !previewLoading && (
        <p className="border-t border-slate-200/80 px-4 py-2 text-xs text-slate-500 sm:px-5">
          Run preview to see how many recipients will be targeted, or select rows in the table.
        </p>
      )}

      {recentSection}
    </div>
  );
}

/* ============================================================================
 * UnresolvedExportToolbar — primary download + overflow menu for copy actions
 * ========================================================================= */

function UnresolvedExportToolbar({ onCopyPhones, onCopyCsv, onDownloadCsv, csvBusy }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const wrapRef = useRef(null);

  useEffect(() => {
    if (!menuOpen) return undefined;
    const onDocDown = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', onDocDown);
    return () => document.removeEventListener('mousedown', onDocDown);
  }, [menuOpen]);

  const btnSecondary =
    'inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-navy/20';
  const btnPrimary =
    'inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg border border-primary-navy bg-primary-navy px-3.5 text-xs font-semibold text-white shadow-sm transition hover:bg-primary-navy/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-navy/30 disabled:opacity-60';
  const menuBtn =
    'flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50';

  return (
    <div ref={wrapRef} className="flex min-w-0 shrink-0 flex-wrap items-center justify-end gap-2">
      <div className="relative">
        <button
          type="button"
          className={`${btnSecondary} min-w-0`}
          aria-expanded={menuOpen}
          aria-haspopup="menu"
          title="More export options"
          onClick={() => setMenuOpen((o) => !o)}
        >
          <FiMoreHorizontal size={18} className="shrink-0" aria-hidden />
          <span className="truncate">More</span>
        </button>
        {menuOpen ? (
          <div
            role="menu"
            className="absolute right-0 top-full z-50 mt-1 min-w-[12.5rem] rounded-lg border border-slate-200 bg-white py-1 shadow-lg ring-1 ring-slate-900/5"
          >
            <button
              type="button"
              role="menuitem"
              className={menuBtn}
              onClick={() => {
                onCopyPhones();
                setMenuOpen(false);
              }}
            >
              <FiCopy size={14} aria-hidden /> Copy phones (this page)
            </button>
            <button
              type="button"
              role="menuitem"
              className={menuBtn}
              disabled={csvBusy}
              onClick={() => {
                onCopyCsv();
                setMenuOpen(false);
              }}
            >
              {csvBusy ? <FiLoader className="animate-spin" size={14} /> : <FiCopy size={14} aria-hidden />}
              Copy filtered CSV
            </button>
          </div>
        ) : null}
      </div>
      <button
        type="button"
        onClick={onDownloadCsv}
        disabled={csvBusy}
        title="Download phone (91…) and name as CSV"
        className={btnPrimary}
      >
        {csvBusy ? <FiLoader className="animate-spin" size={14} /> : <FiDownload size={14} />}
        Download CSV
      </button>
    </div>
  );
}

/* ============================================================================
 * UnresolvedTableCard — themed table with sticky thead + bulk-actions
 * ========================================================================= */

function UnresolvedTableCard({
  rows, loading, page, totalPages, totalRows,
  selected, onToggleRow, onTogglePage, onClearSelection,
  onPrev, onNext,
  onCopyPhones, onCopyCsv, onDownloadCsv, csvBusy,
  isSuper, onBulkRecover
}) {
  const allOnPageSelected = rows.length > 0 && rows.every((r) => selected.has(r.phone));
  const showBulkBar = selected.size > 0;

  const headerRight = (
    <UnresolvedExportToolbar
      onCopyPhones={onCopyPhones}
      onCopyCsv={onCopyCsv}
      onDownloadCsv={onDownloadCsv}
      csvBusy={csvBusy}
    />
  );

  return (
    <SectionCard
      compact
      icon={FiTarget}
      title="Unresolved recipients"
      subtitle={`${rows.length} on this page · ${totalRows.toLocaleString()} total · page ${page} of ${totalPages || 1}`}
      headerRight={headerRight}
      bodyClassName="p-0"
    >
      {showBulkBar && (
        <div className="sticky top-0 z-20 flex flex-wrap items-center gap-2 border-b border-slate-200 bg-white/95 px-4 py-2.5 text-sm shadow-sm backdrop-blur-md sm:py-3">
          <span className="inline-flex items-center gap-1.5 rounded-md bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-800">
            {selected.size} selected
          </span>
          {isSuper && (
            <button
              type="button"
              onClick={onBulkRecover}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-rose-600 bg-rose-600 px-3 text-xs font-bold text-white shadow-sm transition hover:bg-rose-700"
            >
              <FiPlay size={14} /> Recover selected
            </button>
          )}
          <button
            type="button"
            onClick={onCopyPhones}
            title="Copy selected phones"
            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50"
          >
            <FiCopy size={14} /> Copy
          </button>
          <span className="hidden text-xs text-slate-500 sm:inline">Esc clears selection</span>
          <button
            type="button"
            onClick={onClearSelection}
            title="Clear selection"
            className="ml-auto inline-flex h-9 items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-600 hover:bg-slate-50"
          >
            <FiX size={14} /> Clear
          </button>
        </div>
      )}

      <div className="max-h-[min(70vh,720px)] min-w-0 overflow-x-auto">
        <table className="w-full min-w-[1100px] border-collapse text-sm">
          <thead className="sticky top-0 z-10 border-b border-slate-200 bg-slate-50/95 text-xs font-semibold text-slate-600 shadow-sm backdrop-blur-md">
            <tr>
              <th className="w-10 px-2 py-2 text-left align-middle sm:px-2.5">
                <input
                  type="checkbox"
                  checked={allOnPageSelected}
                  onChange={onTogglePage}
                  aria-label="Select page"
                  className="rounded border-slate-300"
                />
              </th>
              <th className="min-w-[9rem] px-2 py-2 text-left align-middle sm:px-2.5">Recipient</th>
              <th className="min-w-[8rem] px-2 py-2 text-left align-middle sm:px-2.5">Template / stage</th>
              <th className="hidden min-w-[6.5rem] px-2 py-2 text-left align-middle lg:table-cell sm:px-2.5">
                State
              </th>
              <th className="min-w-[16rem] px-2 py-2 text-left align-middle sm:px-2.5">
                What went wrong
              </th>
              <th className="hidden min-w-[7rem] px-2 py-2 text-left align-middle lg:table-cell sm:px-2.5">
                Delivered
              </th>
              <th className="hidden w-16 px-2 py-2 text-right align-middle lg:table-cell sm:px-2.5">
                Retries
              </th>
              <th className="hidden min-w-[7rem] px-2 py-2 text-left align-middle lg:table-cell sm:px-2.5">
                Last attempt
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading && rows.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-14 text-center text-sm text-slate-500">
                  <FiLoader className="mr-2 inline animate-spin" /> Loading unresolved recipients…
                </td>
              </tr>
            )}
            {!loading && rows.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-16 text-center">
                  <div className="mx-auto flex max-w-md flex-col items-center gap-2 text-slate-500">
                    <FiCheckCircle className="text-emerald-500" size={32} />
                    <p className="text-base font-semibold text-slate-800">No unresolved recipients in this slice.</p>
                    <p className="text-sm text-slate-600">Adjust filters or widen the date range. Use Overview for trends.</p>
                  </div>
                </td>
              </tr>
            )}
            {rows.map((r) => {
              const isSel = selected.has(r.phone);
              return (
                <tr
                  key={`${r.phone}-${r.messageKind}-${r.lastEventId}`}
                  className={`relative transition-colors ${
                    isSel
                      ? 'bg-slate-50 ring-2 ring-inset ring-primary-navy/20'
                      : 'odd:bg-white even:bg-slate-50/40 hover:bg-slate-100/80'
                  }`}
                >
                  <td className="relative w-10 px-2 py-1.5 align-middle sm:py-2">
                    <span className={`absolute bottom-1.5 left-0 top-1.5 w-0.5 rounded-full sm:bottom-2 sm:top-2 ${severityStripeClass(r)}`} aria-hidden />
                    <input
                      type="checkbox"
                      checked={isSel}
                      onChange={() => onToggleRow(r.phone)}
                      aria-label={`Select ${r.phone}`}
                      className="ml-0.5 rounded border-slate-300 sm:ml-1"
                    />
                  </td>
                  <td className="min-w-0 px-2 py-1.5 align-middle sm:py-2">
                    <p className="truncate font-mono text-xs font-semibold text-slate-900">{r.phone}</p>
                    <p className="mt-0.5 truncate text-xs text-slate-600" title={r.name ? String(r.name) : ''}>
                      {r.name || '—'}
                    </p>
                  </td>
                  <td className="min-w-0 px-2 py-1.5 align-middle sm:py-2">
                    <div className="flex min-w-0 flex-col gap-0.5">
                      <span
                        className="inline-flex max-w-full truncate rounded-md bg-slate-100 px-2 py-0.5 font-mono text-[11px] font-medium text-slate-800"
                        title={r.messageKind}
                      >
                        {r.messageKind}
                      </span>
                      <p
                        className="line-clamp-1 min-w-0 text-xs text-slate-600"
                        title={`${r.attemptStage || '—'} · #${r.lastAttemptNumber || '—'}`}
                      >
                        {r.attemptStage || '—'}
                        <span className="text-slate-400"> · #{r.lastAttemptNumber || '—'}</span>
                      </p>
                      <div className="flex flex-wrap items-start gap-x-1 gap-y-0.5 lg:hidden">
                        <StatusPill status={r.lifecycleState} size="sm" />
                        {r.retryExhausted ? (
                          <span className="inline-flex items-center gap-0.5 rounded-full border border-amber-200 bg-amber-50 px-1.5 py-0.5 text-[9px] font-semibold leading-tight text-amber-900 sm:text-[10px]">
                            <FiAlertOctagon size={11} aria-hidden /> Exhausted
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-0.5 line-clamp-1 text-[10px] tabular-nums text-slate-500 2xl:hidden">
                        {typeof r.retryHistoryCount === 'number' ? `${r.retryHistoryCount} retr.` : ''}
                        {r.lastAttemptAt ? ` · ${formatDt(r.lastAttemptAt)}` : ''}
                      </p>
                    </div>
                  </td>
                  <td className="hidden min-w-0 px-2 py-1.5 align-middle lg:table-cell sm:py-2">
                    <div className="flex flex-col items-start gap-1">
                      <StatusPill status={r.lifecycleState} size="sm" />
                      {r.retryExhausted ? (
                        <span className="inline-flex items-center gap-0.5 rounded-full border border-amber-200 bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold text-amber-900 sm:text-xs">
                          <FiAlertOctagon size={11} aria-hidden /> Exhausted
                        </span>
                      ) : null}
                    </div>
                  </td>
                  <td className="min-w-0 px-2 py-2 align-middle sm:px-2.5">
                    <OpsFailureCell row={r} />
                  </td>
                  <td className="hidden min-w-0 px-2 py-1.5 align-middle text-xs lg:table-cell sm:py-2">
                    {r.everDeliveredAt ? (
                      <span
                        className="inline-flex max-w-full items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-900"
                        title={formatDt(r.everDeliveredAt)}
                      >
                        <FiCheckCircle className="shrink-0" size={12} aria-hidden />
                        <span className="min-w-0 truncate">{formatDt(r.everDeliveredAt)}</span>
                      </span>
                    ) : (
                      <span className="text-slate-400">Never</span>
                    )}
                  </td>
                  <td className="hidden whitespace-nowrap px-2 py-1.5 text-right align-middle font-mono text-xs tabular-nums text-slate-800 lg:table-cell sm:py-2">
                    {r.retryHistoryCount ?? 0}
                  </td>
                  <td className="hidden min-w-0 whitespace-nowrap px-2 py-1.5 align-middle text-xs text-slate-600 lg:table-cell sm:py-2">
                    {formatDt(r.lastAttemptAt)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 bg-slate-50/80 px-4 py-3 text-sm text-slate-600">
        <span className="tabular-nums">
          Showing {(rows.length ? (page - 1) * 50 + 1 : 0)}–{(page - 1) * 50 + rows.length} of {totalRows.toLocaleString()}
        </span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={page <= 1 || loading}
            onClick={onPrev}
            className="inline-flex h-9 items-center rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-primary-navy shadow-sm hover:bg-white disabled:opacity-50"
          >
            Prev
          </button>
          <span className="text-sm">
            Page <strong className="text-primary-navy tabular-nums">{page}</strong> / {totalPages || 1}
          </span>
          <button
            type="button"
            disabled={page >= totalPages || loading}
            onClick={onNext}
            className="inline-flex h-9 items-center rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-primary-navy shadow-sm hover:bg-white disabled:opacity-50"
          >
            Next
          </button>
        </div>
      </div>
    </SectionCard>
  );
}

/* ============================================================================
 * RecoveryTab — orchestrator with lifted job state + 6s reload ticker
 * ========================================================================= */

function RecoveryTab() {
  const { user } = useAuth();
  const isSuper = user?.isSuperAdmin === true;
  const [searchParams, setSearchParams] = useSearchParams();
  const urlHydratedRef = useRef(false);

  const opsProduct = parseOpsProductFromSearch(searchParams);
  const isIitProduct = opsProduct === OPS_PRODUCT_IIT;
  const isOneOnOneProduct = opsProduct === OPS_PRODUCT_ONE_ON_ONE;
  const isGuidanceBookingProduct = opsProduct === OPS_PRODUCT_GUIDANCE_BOOKING;
  const isJeeMockTestProduct = opsProduct === OPS_PRODUCT_JEE_MOCK_TEST;

  const [{ from, to }, setRange] = useState(defaultRangeIsoDates);
  const [messageKind, setMessageKind] = useState('');
  const [preferredLanguage, setPreferredLanguage] = useState(() =>
    parsePreferredLanguageFromSearch(searchParams)
  );
  const [group, setGroup] = useState('all');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [selected, setSelected] = useState(() => new Set());
  const [csvBusy, setCsvBusy] = useState(false);
  const [lastSyncAt, setLastSyncAt] = useState(null);

  /* Debounce search text for server-side `q` filter */
  useEffect(() => {
    const t = window.setTimeout(() => {
      setDebouncedSearch(String(search || '').trim());
    }, 350);
    return () => window.clearTimeout(t);
  }, [search]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch]);

  /* One-time hydrate from URL so filters match shareable links */
  useLayoutEffect(() => {
    if (urlHydratedRef.current) return;
    urlHydratedRef.current = true;
    const date = searchParams.get('date');
    if (date && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
      setRange({ from: date, to: date });
    } else {
      const fromQ = searchParams.get('from');
      const toQ = searchParams.get('to');
      const def = defaultRangeIsoDates();
      if (fromQ && /^\d{4}-\d{2}-\d{2}$/.test(fromQ)) {
        setRange({
          from: fromQ,
          to: toQ && /^\d{4}-\d{2}-\d{2}$/.test(toQ) ? toQ : def.to
        });
      } else if (toQ && /^\d{4}-\d{2}-\d{2}$/.test(toQ)) {
        setRange((r) => ({ ...r, to: toQ }));
      }
    }
    setMessageKind(searchParams.get('messageKind')?.trim() || '');
    setPreferredLanguage(parsePreferredLanguageFromSearch(searchParams));
    const g = searchParams.get('group')?.trim().toLowerCase();
    const allowed = new Set(['all', 'failed', 'excluded', 'exhausted', 'not_accepted', 'in_flight_stale']);
    setGroup(g && allowed.has(g) ? g : 'all');
    const q0 = searchParams.get('q')?.trim() || '';
    setSearch(q0);
    setDebouncedSearch(q0);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- initial URL only
  }, []);

  /* Write filter state to URL (replace; avoids stale keys) */
  useEffect(() => {
    if (!urlHydratedRef.current) return;
    const next = new URLSearchParams();
    if (from) next.set('from', from);
    if (to) next.set('to', to);
    if (messageKind) next.set('messageKind', messageKind);
    if (isIitProduct) next.set('opsProduct', OPS_PRODUCT_IIT);
    else if (isOneOnOneProduct) next.set('opsProduct', OPS_PRODUCT_ONE_ON_ONE);
    else if (isGuidanceBookingProduct) next.set('opsProduct', OPS_PRODUCT_GUIDANCE_BOOKING);
    else if (isJeeMockTestProduct) next.set('opsProduct', OPS_PRODUCT_JEE_MOCK_TEST);
    if (preferredLanguage && IIT_GENERIC_REMINDER_IDS.has(messageKind)) {
      next.set('preferredLanguage', preferredLanguage);
    }
    if (group && group !== 'all') next.set('group', group);
    if (debouncedSearch) next.set('q', debouncedSearch);
    setSearchParams(next, { replace: true });
  }, [from, to, messageKind, group, debouncedSearch, isIitProduct, isOneOnOneProduct, isGuidanceBookingProduct, isJeeMockTestProduct, preferredLanguage, setSearchParams]);

  const visibleTemplateChips = useMemo(
    () => visibleTemplateKindsForProduct([], opsProduct),
    [opsProduct]
  );
  const selectedChipKey = useMemo(
    () => (messageKind ? templateChipKey({ id: messageKind, preferredLanguage }) : 'all'),
    [messageKind, preferredLanguage]
  );
  const apiScopeParams = useMemo(
    () => buildOpsProductQueryParams(opsProduct, messageKind || null, preferredLanguage),
    [opsProduct, messageKind, preferredLanguage]
  );

  /* ---------------------- Job state lifted to RecoveryTab ----------------- */
  const [job, setJob] = useState(null);
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const [preview, setPreview] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewErr, setPreviewErr] = useState(null);
  const [starting, setStarting] = useState(false);
  const [actionErr, setActionErr] = useState(null);
  const [recentJobs, setRecentJobs] = useState([]);
  const pollRef = useRef(null);
  const tableTickRef = useRef(null);

  /** Same instant bounds the API uses (local calendar day → UTC ISO). */
  const apiDateRange = useMemo(() => dateInputsToApiRange(from, to), [from, to]);

  /*
   * Booked (cohort) KPI: shown only when From === To (valid YYYY-MM-DD), a specific template is
   * selected (not “All templates”), and GET /calendar/day succeeds. Multi-day ranges or all-templates
   * hide the cohort tile by design. After pulling changes, restart dev / hard-refresh if UI looks stale.
   */
  const cohortEligible = useMemo(
    () => Boolean(messageKind) && from === to && /^\d{4}-\d{2}-\d{2}$/.test(String(from)),
    [from, to, messageKind]
  );

  const [cohortFetch, setCohortFetch] = useState(() => ({ status: 'idle', bookedSlots: null }));

  useEffect(() => {
    if (!cohortEligible) {
      setCohortFetch({ status: 'idle', bookedSlots: null });
      return undefined;
    }
    let cancelled = false;
    setCohortFetch({ status: 'loading', bookedSlots: null });
    getWhatsappOpsCalendarDay({
      date: from,
      slotTime: 'all',
      messageKind,
      ...apiScopeParams,
    })
      .then((res) => {
        if (cancelled) return;
        if (!res.success) {
          setCohortFetch({ status: 'error', bookedSlots: null });
          return;
        }
        const doc = res.data?.data ?? res.data;
        const raw = doc?.bookedSlotsCount;
        let booked = 0;
        if (typeof raw === 'number' && Number.isFinite(raw)) booked = raw;
        else if (raw != null) {
          const n = Number(raw);
          booked = Number.isFinite(n) ? n : 0;
        }
        setCohortFetch({ status: 'ok', bookedSlots: booked });
      })
      .catch(() => {
        if (!cancelled) setCohortFetch({ status: 'error', bookedSlots: null });
      });
    return () => {
      cancelled = true;
    };
  }, [cohortEligible, from, messageKind, apiScopeParams]);

  const cohortSubtitle =
    cohortEligible && cohortFetch.status !== 'error'
      ? isIitProduct
        ? `IIT counselling · registrations · IST ${from}`
        : `FormSubmission · registered · IST ${from} · all slot times on this IST date`
      : null;
  const cohortLoading = cohortFetch.status === 'loading';
  const cohortBookedSlots = cohortFetch.status === 'ok' ? cohortFetch.bookedSlots ?? 0 : null;

  const cohortHint = useMemo(() => {
    if (cohortSubtitle != null) return null;
    if (!cohortEligible) {
      return 'Booked (cohort) shows when From = To (one IST calendar day) and you pick a template—not “All templates”.';
    }
    if (cohortFetch.status === 'error') {
      return 'Could not load Booked (cohort) for this day (calendar API). Other KPIs still match the unresolved slice.';
    }
    return null;
  }, [cohortSubtitle, cohortEligible, cohortFetch.status]);

  /** Reset action/preview state when scope changes (template/range). */
  const scopeKey = `${opsProduct}|${messageKind || 'none'}|${preferredLanguage || ''}|${from}|${to}`;
  const lastScopeKeyRef = useRef(scopeKey);
  useEffect(() => {
    if (lastScopeKeyRef.current !== scopeKey) {
      lastScopeKeyRef.current = scopeKey;
      setPreview(null);
      setPreviewErr(null);
      setActionErr(null);
    }
  }, [scopeKey]);

  const stopJobPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  const stopTableTick = useCallback(() => {
    if (tableTickRef.current) {
      clearInterval(tableTickRef.current);
      tableTickRef.current = null;
    }
  }, []);

  useEffect(() => () => {
    stopJobPolling();
    stopTableTick();
  }, [stopJobPolling, stopTableTick]);

  const refreshJob = useCallback(async (jobId) => {
    if (!jobId) return null;
    const res = await getWhatsappOpsManualRecoveryJob(jobId);
    if (!res.success) return null;
    const next = res.data?.data ?? res.data;
    setJob(next);
    return next;
  }, []);

  const loadRecentJobs = useCallback(async () => {
    if (!messageKind) {
      setRecentJobs([]);
      return;
    }
    const res = await listWhatsappOpsManualRecoveryJobs({ messageKind, limit: 5, ...apiScopeParams });
    if (res.success) {
      const arr = res.data?.data ?? res.data;
      setRecentJobs(Array.isArray(arr) ? arr : []);
    }
  }, [messageKind, apiScopeParams]);

  useEffect(() => {
    Promise.resolve().then(() => loadRecentJobs());
  }, [loadRecentJobs]);

  /** Start polling whenever we hold a non-terminal job. Also tick reloadKey every 6s
   *  so the unresolved table reflects live recovery progress without manual refresh. */
  useEffect(() => {
    if (!job || isTerminal(job.status)) {
      stopJobPolling();
      stopTableTick();
      return;
    }
    if (!pollRef.current) {
      pollRef.current = setInterval(async () => {
        const next = await refreshJob(job._id);
        if (next && isTerminal(next.status)) {
          stopJobPolling();
          stopTableTick();
          loadRecentJobs();
          setReloadKey((k) => k + 1);
        }
      }, 2000);
    }
    if (!tableTickRef.current) {
      tableTickRef.current = setInterval(() => {
        setReloadKey((k) => k + 1);
      }, 6000);
    }
  }, [job, refreshJob, stopJobPolling, stopTableTick, loadRecentJobs]);

  /* ---------------------- Unresolved list load ---------------------------- */
  const load = useCallback(async () => {
    setLoading(true);
    setErr(null);
    const params = { ...apiDateRange, ...apiScopeParams, group, page, limit: 50 };
    if (debouncedSearch) params.q = debouncedSearch;
    const res = await getUnresolvedRecipients(params);
    setLoading(false);
    if (!res.success) {
      setErr(res.message || 'Failed to load unresolved recipients');
      setData(null);
      return;
    }
    setData(res.data?.data ?? res.data);
    setLastSyncAt(new Date().toISOString());
  }, [apiDateRange, apiScopeParams, group, page, debouncedSearch]);

  useEffect(() => {
    load();
  }, [load, reloadKey]);

  const tableRows = data?.rows || [];

  const totals = data?.totalsByGroup || {};
  const totalsByCategory = data?.totalsByExclusionCategory || {};
  const totalRows = data?.total || 0;
  const totalPages = data?.totalPages || 1;
  const jobActive = !!(job && !isTerminal(job.status));

  const toggleRow = (phone) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(phone)) next.delete(phone);
      else next.add(phone);
      return next;
    });
  };
  const togglePage = () => {
    setSelected((prev) => {
      const allOn = tableRows.length > 0 && tableRows.every((r) => prev.has(r.phone));
      const next = new Set(prev);
      if (allOn) tableRows.forEach((r) => next.delete(r.phone));
      else tableRows.forEach((r) => next.add(r.phone));
      return next;
    });
  };
  const clearSelection = useCallback(() => setSelected(new Set()), []);
  const selectedArr = useMemo(() => Array.from(selected), [selected]);

  /** Esc key clears selection — accessibility hint shown in bulk-actions bar. */
  useEffect(() => {
    if (selected.size === 0) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') clearSelection();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selected.size, clearSelection]);

  /* ---------------------- Recovery actions -------------------------------- */
  const handlePreview = useCallback(async () => {
    if (!messageKind) return;
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
    if (!messageKind) {
      setActionErr('Select a template first');
      return;
    }
    const targeted = selectedArr.length || preview?.candidates?.length || 0;
    if (!targeted) {
      setActionErr('Nothing to send. Run preview or select rows first.');
      return;
    }
    const label = selectedArr.length
      ? `${selectedArr.length} selected recipient(s)`
      : `${preview?.candidates?.length || 0} unresolved recipient(s)`;
    if (!window.confirm(`Send manual recovery to ${label}? Duplicate protections still apply.`)) return;
    setStarting(true);
    setActionErr(null);
    const body = { messageKind, ...apiDateRange, ...apiScopeParams };
    if (selectedArr.length) body.phones = selectedArr;
    const res = await startWhatsappOpsManualRecovery(body);
    setStarting(false);
    if (!res.success) {
      setActionErr(res.message || 'Could not start recovery');
      return;
    }
    const out = res.data?.data ?? res.data;
    if (out?.jobId) {
      setBannerDismissed(false);
      const initial = await refreshJob(out.jobId);
      if (initial) {
        loadRecentJobs();
      }
    }
  }, [messageKind, apiDateRange, apiScopeParams, selectedArr, preview, refreshJob, loadRecentJobs]);

  const handleCancel = useCallback(async () => {
    if (!job?._id) return;
    if (!window.confirm('Cancel this recovery batch? In-progress sends will not be reverted.')) return;
    const res = await cancelWhatsappOpsManualRecoveryJob(job._id);
    if (res.success) await refreshJob(job._id);
  }, [job, refreshJob]);

  const handleBulkRecover = useCallback(() => handleStart(), [handleStart]);

  /* ---------------------- Export actions ---------------------------------- */
  const handleCopyPhones = async () => {
    const seen = new Set();
    const body = [];
    for (const r of tableRows) {
      const phone = formatIndianMobile91(r.phone);
      if (!phone || seen.has(phone)) continue;
      seen.add(phone);
      const name = r.name != null ? String(r.name) : '';
      body.push(`${escapeCsvCell(phone)},${escapeCsvCell(name)}`);
    }
    await copyToClipboard(['phone,name', ...body].join('\n'));
  };
  const handleCopyCsv = async () => {
    setCsvBusy(true);
    setErr(null);
    try {
      const params = { ...apiDateRange, ...apiScopeParams, group };
      if (debouncedSearch) params.q = debouncedSearch;
      const text = await fetchUnresolvedCsvText(params);
      const forClipboard = text.replace(/^\uFEFF/, '');
      await copyToClipboard(forClipboard);
    } catch (e) {
      setErr(e?.message || 'CSV copy failed');
    }
    setCsvBusy(false);
  };
  const handleDownloadCsv = async () => {
    setCsvBusy(true);
    setErr(null);
    try {
      const params = { ...apiDateRange, ...apiScopeParams, group };
      if (debouncedSearch) params.q = debouncedSearch;
      await downloadUnresolvedCsv(params);
    } catch (e) {
      setErr(e?.message || 'CSV export failed');
    }
    setCsvBusy(false);
  };

  /* ---------------------- Render ----------------------------------------- */
  return (
    <div className="space-y-4">
      <div className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-sm ring-1 ring-slate-900/[0.04]">
      <RecoveryCommandBar
        embedded
        totalRows={totalRows}
        totals={totals}
        totalsByCategory={totalsByCategory}
        jobActive={jobActive}
        onRefresh={() => setReloadKey((k) => k + 1)}
        loading={loading}
        lastSyncAt={lastSyncAt}
        messageKind={messageKind}
        cohortLoading={cohortLoading}
        cohortBookedSlots={cohortBookedSlots}
        cohortSubtitle={cohortSubtitle}
        cohortHint={cohortHint}
        from={from}
        to={to}
        group={group}
        search={search}
        opsProduct={opsProduct}
        isIitProduct={isIitProduct}
        isOneOnOneProduct={isOneOnOneProduct}
        isGuidanceBookingProduct={isGuidanceBookingProduct}
        isJeeMockTestProduct={isJeeMockTestProduct}
        preferredLanguage={preferredLanguage}
        visibleTemplateChips={visibleTemplateChips}
        selectedChipKey={selectedChipKey}
        onFromChange={(v) => { setRange((r) => ({ ...r, from: v })); setPage(1); }}
        onToChange={(v) => { setRange((r) => ({ ...r, to: v })); setPage(1); }}
        onTemplateChange={(v) => { setMessageKind(v); setPreferredLanguage(null); setPage(1); }}
        onOpsProductChange={(next) => {
          const sp = new URLSearchParams(searchParams.toString());
          if (next === OPS_PRODUCT_GUIDEXPERT) {
            sp.delete('opsProduct');
            sp.delete('preferredLanguage');
          } else if (next === OPS_PRODUCT_IIT) {
            sp.set('opsProduct', OPS_PRODUCT_IIT);
            sp.delete('preferredLanguage');
          } else if (next === OPS_PRODUCT_ONE_ON_ONE) {
            sp.set('opsProduct', OPS_PRODUCT_ONE_ON_ONE);
            sp.delete('preferredLanguage');
          } else if (next === OPS_PRODUCT_JEE_MOCK_TEST) {
            sp.set('opsProduct', OPS_PRODUCT_JEE_MOCK_TEST);
            sp.delete('preferredLanguage');
          } else {
            sp.set('opsProduct', OPS_PRODUCT_GUIDANCE_BOOKING);
            sp.delete('preferredLanguage');
          }
          sp.delete('messageKind');
          setSearchParams(sp, { replace: true });
          setMessageKind('');
          setPreferredLanguage(null);
          setPage(1);
        }}
        onTemplateChipSelect={(chip) => {
          setMessageKind(chip?.id || '');
          setPreferredLanguage(chip?.preferredLanguage || null);
          setPage(1);
        }}
        onGroupChange={(v) => { setGroup(v); setPage(1); }}
        onSearchChange={(v) => setSearch(v)}
      />
      <RecoveryActionStrip
        embedded
        messageKind={messageKind}
        isSuper={isSuper}
        selectedPhones={selectedArr}
        job={job}
        recentJobs={recentJobs}
        preview={preview}
        previewLoading={previewLoading}
        previewErr={previewErr}
        starting={starting}
        actionErr={actionErr}
        onPreview={handlePreview}
        onStart={handleStart}
      />
      </div>

      {/* inline error */}
      {err && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-900">{err}</div>
      )}

      {/* 3 — batch hero (only when job active/dismissed) */}
      <RecoveryBatchHero
        job={job}
        isSuper={isSuper}
        onCancel={handleCancel}
        onDismiss={() => setBannerDismissed(true)}
        dismissed={bannerDismissed}
      />

      {/* full-width unresolved table */}
      <UnresolvedTableCard
        rows={tableRows}
        loading={loading}
        page={page}
        totalPages={totalPages}
        totalRows={totalRows}
        selected={selected}
        onToggleRow={toggleRow}
        onTogglePage={togglePage}
        onClearSelection={clearSelection}
        onPrev={() => setPage((p) => Math.max(1, p - 1))}
        onNext={() => setPage((p) => p + 1)}
        onCopyPhones={handleCopyPhones}
        onCopyCsv={handleCopyCsv}
        onDownloadCsv={handleDownloadCsv}
        csvBusy={csvBusy}
        isSuper={isSuper}
        onBulkRecover={handleBulkRecover}
      />
    </div>
  );
}

export default function WhatsAppOpsRecovery() {
  const [tab, setTab] = useState('recovery');
  return (
    <div className="space-y-4">
      <nav
        role="tablist"
        aria-label="Messages console sections"
        className="inline-flex w-full max-w-md items-center gap-1 rounded-xl border border-slate-200 bg-slate-50 p-1 sm:w-auto"
      >
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'recovery'}
          onClick={() => setTab('recovery')}
          className={`inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-lg px-4 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-navy/25 sm:flex-initial ${
            tab === 'recovery'
              ? 'bg-primary-navy text-white shadow-md'
              : 'text-slate-700 hover:bg-white'
          }`}
        >
          <FiZap size={16} /> Recovery
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'audit'}
          onClick={() => setTab('audit')}
          className={`inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-lg px-4 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-navy/25 sm:flex-initial ${
            tab === 'audit'
              ? 'bg-primary-navy text-white shadow-md'
              : 'text-slate-700 hover:bg-white'
          }`}
        >
          <FiEye size={16} /> Audit (raw events)
        </button>
      </nav>
      <div role="tabpanel">
        {tab === 'recovery' ? <RecoveryTab /> : <WhatsAppOpsMessages />}
      </div>
    </div>
  );
}

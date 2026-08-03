import { useMemo } from 'react';
import { FiArrowLeft, FiClock, FiInbox, FiX } from 'react-icons/fi';
import TableSkeleton from '../../../components/UI/TableSkeleton';
import { useLeadDetails } from '../../../hooks/useLeadDetails';
import { useLeadTranscript } from '../../../hooks/useLeadTranscript';
import LeadChatTranscript from './LeadChatTranscript';
import LeadPredictionSection from './LeadPredictionSection';
import LeadStageBadge from './LeadStageBadge';
import {
  flattenRecentEvents,
  formatConfidence,
  formatLeadDate,
  formatNoReplyDuration,
} from './leadIntelligenceUtils';

function DetailField({ label, value }) {
  return (
    <div>
      <dt className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">{label}</dt>
      <dd className="mt-1 text-sm text-slate-900 break-words">{value || '—'}</dd>
    </div>
  );
}

export default function LeadDetailPanel({ phone, onClose, compact = false }) {
  const { details, loading, error, retry } = useLeadDetails(phone);
  const {
    messages,
    loading: transcriptLoading,
    error: transcriptError,
    retry: retryTranscript,
  } = useLeadTranscript(phone);

  const profile = details?.profile || null;
  const score = details?.score || null;
  const eventRows = useMemo(
    () => flattenRecentEvents(details?.recentEvents || []),
    [details?.recentEvents]
  );

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-white">
      <div className="flex shrink-0 items-start justify-between gap-3 border-b border-slate-200/80 bg-gradient-to-r from-white to-slate-50 px-4 py-3 sm:px-5">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            {compact ? (
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg border border-slate-200 bg-white p-1.5 text-slate-600 lg:hidden"
                aria-label="Back to list"
              >
                <FiArrowLeft className="h-4 w-4" />
              </button>
            ) : null}
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary-blue-600">
              Lead workspace
            </p>
          </div>
          <h2 className="mt-1 truncate text-lg font-semibold tracking-tight text-slate-900">
            {details?.name || profile?.name || 'Lead details'}
          </h2>
          <p className="mt-0.5 text-xs tabular-nums text-slate-500">{phone}</p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <LeadStageBadge stage={score?.leadStage} />
            <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-xs font-semibold tabular-nums text-slate-700">
              Score {score?.leadScore ?? '—'}
            </span>
            {details?.awaitingReply ? (
              <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-800">
                <FiClock className="h-3 w-3" />
                No reply {formatNoReplyDuration(details.noReplyMs)}
              </span>
            ) : (
              <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-800">
                Replied
              </span>
            )}
          </div>
        </div>
        {onClose ? (
          <button
            type="button"
            onClick={onClose}
            className="hidden rounded-xl border border-slate-200 bg-white p-2 text-slate-600 shadow-sm transition hover:bg-slate-50 lg:inline-flex"
            aria-label="Close"
          >
            <FiX />
          </button>
        ) : null}
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-1 overflow-hidden xl:grid-cols-2">
        <div className="min-h-0 space-y-4 overflow-y-auto border-b border-slate-200 p-4 xl:border-b-0 xl:border-r xl:border-slate-200">
          {loading ? (
            <TableSkeleton rows={6} cols={2} />
          ) : error ? (
            <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800 flex items-center justify-between gap-3">
              <span>{error}</span>
              <button
                type="button"
                onClick={retry}
                className="rounded-lg border border-red-300 bg-white px-3 py-1.5 text-xs font-medium text-red-800 hover:bg-red-100"
              >
                Retry
              </button>
            </div>
          ) : (
            <>
              <section className="rounded-xl border border-slate-200/80 bg-slate-50/50 p-3.5">
                <h3 className="mb-3 text-sm font-semibold text-slate-900">Scoring</h3>
                <dl className="grid grid-cols-2 gap-3">
                  <DetailField label="Lead score" value={score?.leadScore ?? '—'} />
                  <div>
                    <dt className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                      Lead type
                    </dt>
                    <dd className="mt-1">
                      <LeadStageBadge stage={score?.leadStage} />
                    </dd>
                  </div>
                  <DetailField label="Confidence" value={formatConfidence(score?.confidence)} />
                  <DetailField
                    label="Last inbound"
                    value={formatLeadDate(details?.lastInboundAt)}
                  />
                  <DetailField
                    label="Last outbound"
                    value={formatLeadDate(details?.lastOutboundAt)}
                  />
                  <DetailField
                    label="No-reply time"
                    value={
                      details?.awaitingReply
                        ? formatNoReplyDuration(details.noReplyMs)
                        : '—'
                    }
                  />
                </dl>
                {Array.isArray(score?.scoreReasons) && score.scoreReasons.length ? (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {score.scoreReasons.map((reason) => (
                      <span
                        key={reason}
                        className="rounded-md border border-slate-200 bg-white px-2 py-0.5 text-[11px] font-medium text-slate-600"
                      >
                        {reason.replace(/_/g, ' ')}
                      </span>
                    ))}
                  </div>
                ) : null}
              </section>

              <section className="rounded-xl border border-slate-200/80 bg-slate-50/50 p-3.5">
                <h3 className="mb-3 text-sm font-semibold text-slate-900">Profile</h3>
                <dl className="grid grid-cols-2 gap-3">
                  <DetailField label="Name" value={details?.name || profile?.name} />
                  <DetailField label="Branch" value={profile?.branchInterest} />
                  <DetailField label="College" value={profile?.collegeInterest} />
                  <DetailField label="Exam" value={profile?.exam} />
                  <DetailField label="Language" value={profile?.languagePreference} />
                  <DetailField label="Events synced" value={profile?.eventCount ?? 0} />
                </dl>
              </section>

              <LeadPredictionSection phone={phone} />

              <section className="rounded-xl border border-slate-200/80 bg-slate-50/50 p-3.5">
                <h3 className="mb-3 text-sm font-semibold text-slate-900">Extraction events</h3>
                {eventRows.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-slate-300 p-4 text-center text-xs text-slate-500">
                    <FiInbox className="mx-auto mb-1 h-4 w-4" />
                    No legacy extraction events
                  </div>
                ) : (
                  <ul className="max-h-40 space-y-2 overflow-y-auto text-xs">
                    {eventRows.slice(0, 12).map((row, index) => (
                      <li
                        key={`${row.type}-${row.createdAt}-${index}`}
                        className="flex justify-between gap-2 border-b border-slate-100 pb-1.5"
                      >
                        <span className="font-medium text-slate-700">
                          {row.type}: {row.value}
                        </span>
                        <span className="shrink-0 text-slate-400">
                          {formatLeadDate(row.createdAt)}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </>
          )}
        </div>

        <div className="min-h-[22rem] min-w-0 xl:min-h-0">
          <LeadChatTranscript
            messages={messages}
            loading={transcriptLoading}
            error={transcriptError}
            onRetry={retryTranscript}
          />
        </div>
      </div>
    </div>
  );
}

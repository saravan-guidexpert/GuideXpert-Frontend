import { FiClock, FiInbox } from 'react-icons/fi';
import TableSkeleton from '../../../components/UI/TableSkeleton';
import LeadPredictionSection from './LeadPredictionSection';
import LeadStageBadge from './LeadStageBadge';
import {
  formatConfidence,
  formatLeadDate,
  formatNoReplyDuration,
  formatPhoneDisplay,
  LI,
} from './leadIntelligenceUtils';

const SECTION_TITLE = 'text-[14px] font-semibold uppercase tracking-wide text-[#6B7280]';

function DetailRow({ label, value }) {
  return (
    <div className="py-2 first:pt-0 last:pb-0">
      <dt className="text-[12px] font-semibold uppercase tracking-wide text-[#6B7280]">{label}</dt>
      <dd className={`mt-1 break-words text-[15px] ${LI.text}`}>{value ?? '—'}</dd>
    </div>
  );
}

function Card({ title, children, collapsible = false, defaultOpen = true }) {
  if (!collapsible) {
    return (
      <section className="rounded-xl border border-[#E5E7EB] bg-white p-4">
        <h3 className={`${SECTION_TITLE} mb-3`}>{title}</h3>
        {children}
      </section>
    );
  }

  return (
    <details
      open={defaultOpen}
      className="group rounded-xl border border-[#E5E7EB] bg-white p-4"
    >
      <summary className="cursor-pointer list-none marker:content-none">
        <span className="flex items-center justify-between">
          <span className={SECTION_TITLE}>{title}</span>
          <span className="text-[#6B7280] transition-transform duration-200 group-open:rotate-180">
            ▾
          </span>
        </span>
      </summary>
      <div className="mt-3">{children}</div>
    </details>
  );
}

export function LeadDetailsHeader({ phone, details, score, profile }) {
  return (
    <div className="flex w-full items-center justify-between gap-2">
      <div className="min-w-0">
        <h2 className={`truncate text-[14px] font-semibold leading-tight ${LI.text}`}>
          {details?.name || profile?.name || 'Lead details'}
        </h2>
        <p className={`truncate text-[12px] leading-tight tabular-nums ${LI.muted}`}>
          {formatPhoneDisplay(phone)}
        </p>
      </div>
      <div className="flex shrink-0 items-center justify-end gap-1.5 overflow-hidden">
        <LeadStageBadge stage={score?.leadStage} />
        {details?.awaitingReply ? (
          <span className="inline-flex h-6 max-w-[7rem] items-center gap-1 truncate rounded-full border border-amber-100 bg-amber-50 px-2 text-[11px] font-medium text-amber-700">
            <FiClock className="h-3 w-3 shrink-0" />
            <span className="truncate">{formatNoReplyDuration(details.noReplyMs)}</span>
          </span>
        ) : (
          <span className="inline-flex h-6 items-center rounded-full border border-emerald-100 bg-emerald-50 px-2 text-[11px] font-medium text-emerald-700">
            Replied
          </span>
        )}
      </div>
    </div>
  );
}

export default function LeadDetailsSidebar({
  phone,
  details,
  score,
  profile,
  eventRows,
  loading,
  error,
  onRetry,
  hideHeader = false,
}) {
  if (loading) {
    return (
      <div className={`flex h-full min-h-0 flex-col overflow-hidden ${LI.bg}`}>
        <div className="px-3 py-3">
          <TableSkeleton rows={8} cols={1} />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`flex h-full flex-col items-center justify-center gap-3 p-4 text-center text-[15px] text-red-700 ${LI.bg}`}>
        <span>{error}</span>
        {onRetry ? (
          <button
            type="button"
            onClick={onRetry}
            className={`${LI.input} px-3 py-1.5 text-[13px] font-semibold text-red-800`}
          >
            Retry
          </button>
        ) : null}
      </div>
    );
  }

  return (
    <div className={`flex h-full min-h-0 flex-col overflow-hidden ${LI.bg}`}>
      {!hideHeader ? (
        <div className={`${LI.panelHeader} justify-between gap-2`}>
          <LeadDetailsHeader phone={phone} details={details} score={score} profile={profile} />
        </div>
      ) : null}

      <div
        className={`min-h-0 flex-1 space-y-3 overflow-y-auto overflow-x-hidden overscroll-contain px-3 py-3 ${LI.scrollbar}`}
      >
        {score?.leadScore != null ? (
          <div className="rounded-xl border border-[#E5E7EB] bg-white px-3 py-2 text-[13px] font-semibold tabular-nums text-[#111827]">
            Score {score.leadScore}
            {score?.confidence != null ? (
              <span className="ml-2 font-normal text-[#6B7280]">
                · {formatConfidence(score.confidence)}
              </span>
            ) : null}
          </div>
        ) : null}

        <Card title="Activity">
          <dl className="divide-y divide-[#E5E7EB]">
            <DetailRow label="Last inbound" value={formatLeadDate(details?.lastInboundAt)} />
            <DetailRow label="Last outbound" value={formatLeadDate(details?.lastOutboundAt)} />
            <DetailRow
              label="Reply status"
              value={details?.awaitingReply ? formatNoReplyDuration(details.noReplyMs) : 'Replied'}
            />
          </dl>
        </Card>

        <Card title="Profile">
          <dl className="divide-y divide-[#E5E7EB]">
            <DetailRow label="Name" value={details?.name || profile?.name} />
            <DetailRow label="Phone" value={formatPhoneDisplay(phone)} />
            <DetailRow label="Branch" value={profile?.branchInterest} />
            <DetailRow label="College" value={profile?.collegeInterest} />
            <DetailRow label="Exam" value={profile?.exam} />
            <DetailRow label="Score" value={score?.leadScore ?? '—'} />
            <DetailRow label="Stage" value={score?.leadStage || 'Unscored'} />
            <DetailRow label="Demo interested" value={profile?.demoInterested ? 'Yes' : 'No'} />
            <DetailRow label="Handoff requested" value={profile?.handoffRequested ? 'Yes' : 'No'} />
            <DetailRow label="Events synced" value={profile?.eventCount ?? 0} />
          </dl>
        </Card>

        <Card title="Intelligence">
          {!score ? (
            <p className={`text-[13px] leading-relaxed ${LI.muted}`}>
              Not scored yet. Scoring appears after the bot syncs profile data from WhatsApp
              conversations.
            </p>
          ) : (
            <>
              <dl className="divide-y divide-[#E5E7EB]">
                <DetailRow label="Lead score" value={score.leadScore ?? '—'} />
                <DetailRow label="Confidence" value={formatConfidence(score.confidence)} />
                <DetailRow label="Last scored" value={formatLeadDate(score.lastScoredAt)} />
              </dl>
              {Array.isArray(score.scoreReasons) && score.scoreReasons.length ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  {score.scoreReasons.map((reason) => (
                    <span
                      key={reason}
                      className="inline-flex h-6 items-center rounded-full border border-[#E5E7EB] bg-[#F8FAFC] px-2.5 text-[12px] font-medium text-[#6B7280]"
                    >
                      {reason.replace(/_/g, ' ')}
                    </span>
                  ))}
                </div>
              ) : null}
            </>
          )}
        </Card>

        <Card title="Prediction" collapsible defaultOpen={false}>
          <LeadPredictionSection phone={phone} compact />
        </Card>

        <Card title="Extraction" collapsible defaultOpen={false}>
          {eventRows.length === 0 ? (
            <div className="rounded-[10px] border border-dashed border-[#E5E7EB] py-6 text-center text-[13px] text-[#6B7280]">
              <FiInbox className="mx-auto mb-2 h-4 w-4" />
              No extraction events
            </div>
          ) : (
            <ul className="space-y-2">
              {eventRows.slice(0, 10).map((row, index) => (
                <li
                  key={`${row.type}-${row.createdAt}-${index}`}
                  className="rounded-[10px] border border-[#E5E7EB] bg-[#F8FAFC] px-3 py-2 text-[13px]"
                >
                  <p className={`font-medium ${LI.text}`}>
                    {row.type}: {row.value}
                  </p>
                  <p className={`mt-1 ${LI.muted}`}>{formatLeadDate(row.createdAt)}</p>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}

import { FiMinusCircle, FiPlusCircle, FiTarget } from 'react-icons/fi';
import TableSkeleton from '../../../components/UI/TableSkeleton';
import { useLeadPrediction } from '../../../hooks/useLeadPrediction';
import { LI } from './leadIntelligenceUtils';

const RISK_STYLES = {
  critical: 'bg-red-50 text-red-700 border-red-100',
  high: 'bg-orange-50 text-orange-700 border-orange-100',
  medium: 'bg-amber-50 text-amber-700 border-amber-100',
  low: 'bg-emerald-50 text-emerald-700 border-emerald-100',
};

function formatPct(value) {
  if (value == null || Number.isNaN(value)) return '—';
  return `${value}%`;
}

function ProbabilityBar({ label, value, tone = 'blue', compact = false }) {
  const toneClass =
    tone === 'green' ? 'bg-emerald-500' : tone === 'amber' ? 'bg-amber-500' : 'bg-[#2563EB]';

  return (
    <div>
      <div className={`mb-1 flex items-center justify-between ${compact ? 'text-[12px]' : 'text-[13px]'}`}>
        <span className={`font-medium ${LI.muted}`}>{label}</span>
        <span className={`tabular-nums font-semibold ${LI.text}`}>{formatPct(value)}</span>
      </div>
      <div className={`overflow-hidden rounded-full bg-[#F8FAFC] ${compact ? 'h-1.5' : 'h-2'}`}>
        <div
          className={`h-full rounded-full ${toneClass}`}
          style={{ width: `${Math.min(value || 0, 100)}%` }}
        />
      </div>
    </div>
  );
}

function FactorList({ title, icon: Icon, items, emptyText, compact = false }) {
  return (
    <div>
      <div
        className={`mb-2 flex items-center gap-1.5 font-semibold uppercase tracking-wide ${LI.muted} ${compact ? 'text-[12px]' : 'text-[12px]'}`}
      >
        <Icon className="h-3 w-3" />
        {title}
      </div>
      {items?.length ? (
        <ul className={`space-y-2 ${compact ? 'text-[13px]' : 'text-[15px]'} ${LI.text}`}>
          {items.map((factor) => (
            <li
              key={factor.ruleId}
              className="rounded-[10px] border border-[#E5E7EB] bg-[#F8FAFC] px-3 py-2"
            >
              <span className={`font-medium ${compact ? 'line-clamp-2' : ''}`}>{factor.label}</span>
              {!compact ? (
                <span className={`mt-0.5 block text-[12px] uppercase tracking-wide ${LI.muted}`}>
                  {factor.category}
                </span>
              ) : null}
            </li>
          ))}
        </ul>
      ) : (
        <p className={`${LI.muted} ${compact ? 'text-[13px]' : 'text-[15px]'}`}>{emptyText}</p>
      )}
    </div>
  );
}

export default function LeadPredictionSection({ phone, compact = false }) {
  const { prediction, loading, error, retry, refresh } = useLeadPrediction(phone);

  const shellClass = compact ? '' : LI.card;

  return (
    <section className={shellClass}>
      {!compact ? (
        <div className="mb-3 flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-[#2563EB]">
              <FiTarget className="h-4 w-4" />
              <h3 className={`text-[15px] font-semibold tracking-tight ${LI.text}`}>
                Conversion Prediction
              </h3>
            </div>
            <p className={`mt-1 text-[13px] ${LI.muted}`}>
              Rule-based forecast from lifecycle, score, and copilot signals.
            </p>
          </div>
          <button
            type="button"
            onClick={refresh}
            className={`${LI.input} shrink-0 px-2.5 py-1 text-[13px] font-medium transition-all duration-200 hover:bg-[#F8FAFC]`}
          >
            Refresh
          </button>
        </div>
      ) : (
        <div className="mb-3 flex items-center justify-between gap-2">
          <span className={`text-[13px] ${LI.muted}`}>Rule-based forecast</span>
          <button
            type="button"
            onClick={refresh}
            className={`${LI.input} px-2.5 py-1 text-[12px] font-medium transition-all duration-200 hover:bg-[#F8FAFC]`}
          >
            Refresh
          </button>
        </div>
      )}

      {loading ? (
        <TableSkeleton rows={compact ? 3 : 4} cols={1} />
      ) : error ? (
        <div className="flex items-center justify-between gap-3 rounded-[10px] border border-red-100 bg-red-50 p-2 text-[13px] text-red-800">
          <span>{error}</span>
          <button type="button" onClick={retry} className="font-medium underline">
            Retry
          </button>
        </div>
      ) : !prediction ? (
        <p className={`${LI.muted} ${compact ? 'text-[13px]' : 'text-[15px]'}`}>
          No prediction available for this lead.
        </p>
      ) : (
        <div className={compact ? 'space-y-3' : 'space-y-4'}>
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`inline-flex h-6 items-center rounded-full border px-2.5 text-[12px] font-medium capitalize ${RISK_STYLES[prediction.riskLevel] || RISK_STYLES.medium}`}
            >
              {prediction.riskLevel} risk
            </span>
            <span className={`text-[12px] ${LI.muted}`}>
              {formatPct(prediction.confidenceScore)} conf.
            </span>
          </div>

          <div className={compact ? 'space-y-2' : 'space-y-3'}>
            <ProbabilityBar
              compact={compact}
              label="Booking"
              value={prediction.bookingProbability}
              tone="blue"
            />
            <ProbabilityBar
              compact={compact}
              label="Attendance"
              value={prediction.attendanceProbability}
              tone="amber"
            />
            <ProbabilityBar
              compact={compact}
              label="Admission"
              value={prediction.admissionProbability}
              tone="green"
            />
          </div>

          <div className="grid grid-cols-1 gap-3">
            <FactorList
              compact={compact}
              title="Positive factors"
              icon={FiPlusCircle}
              items={prediction.explanation?.positiveFactors}
              emptyText="No positive rules matched."
            />
            <FactorList
              compact={compact}
              title="Negative factors"
              icon={FiMinusCircle}
              items={prediction.explanation?.negativeFactors}
              emptyText="No negative rules matched."
            />
          </div>
        </div>
      )}
    </section>
  );
}

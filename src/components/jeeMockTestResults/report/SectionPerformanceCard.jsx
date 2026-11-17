import { formatDuration, formatPercentage, scorePercentage } from '../../../utils/jeeMockTestResultFormat';
import { ScoreBar, ScoreLine } from './OverallScoreCard';

function SectionIcon({ kind }) {
  const common = 'h-4 w-4';
  return (
    <span className={`flex h-8 w-8 items-center justify-center rounded-lg ${kind === 'mcq' ? 'bg-[#E8F0F8] text-[#0B3B65]' : 'bg-[#FFF1E6] text-[#C65A10]'}`} aria-hidden="true">
      {kind === 'mcq' ? (
        <svg viewBox="0 0 16 16" className={common} fill="none" stroke="currentColor" strokeWidth="1.6">
          <rect x="2" y="2" width="12" height="12" rx="2" />
          <path d="M4.5 8.2 6.7 10.3 11.5 5.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ) : (
        <svg viewBox="0 0 16 16" className={common} fill="none" stroke="currentColor" strokeWidth="1.6">
          <path d="M4 12V4h8" strokeLinecap="round" />
          <path d="M7 12V7M10 12V5" strokeLinecap="round" />
        </svg>
      )}
    </span>
  );
}

export default function SectionPerformanceCard({ kind, title, obtained, total, durationMinutes }) {
  const percentage = scorePercentage(obtained, total);
  return (
    <article className="jee-report-in flex h-full flex-col rounded-2xl border border-[#E5EAF0] bg-white p-4 transition-colors duration-150 md:hover:border-[#0B3B65]/25" style={{ animationDelay: kind === 'mcq' ? '80ms' : '120ms' }}>
      <div className="flex items-center gap-2.5">
        <SectionIcon kind={kind} />
        <h2 className="text-[11px] font-semibold tracking-[0.14em] text-[#69798A] uppercase">{title}</h2>
      </div>
      <div className="mt-3">
        <ScoreLine obtained={obtained} total={total} />
      </div>
      <p className="mt-1 text-sm text-[#69798A]">Marks obtained.</p>
      <p className="mt-3 text-sm font-semibold text-[#0B3B65]">{formatPercentage(percentage) || 'Not available'}</p>
      <div className="mt-2">
        <ScoreBar percentage={percentage} />
      </div>
      <div className="mt-3 flex items-baseline justify-between gap-3 border-t border-[#E5EAF0] pt-2.5">
        <span className="text-xs font-medium text-[#69798A]">Time spent</span>
        <span className="text-sm font-semibold text-[#102A3D]">{formatDuration(durationMinutes)}</span>
      </div>
    </article>
  );
}

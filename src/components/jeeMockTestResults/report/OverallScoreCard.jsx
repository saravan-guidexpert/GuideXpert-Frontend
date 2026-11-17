import { barPercent, formatPercentage, formatScore } from '../../../utils/jeeMockTestResultFormat';
import ScoreRing from './ScoreRing';

function ScoreLine({ obtained, total, large = false }) {
  const missing = typeof obtained !== 'number' || !Number.isFinite(obtained);
  return (
    <p className="font-sw-display leading-none font-semibold tracking-[-0.04em] text-[#06243A]">
      <span className={missing ? 'text-[1.65rem] sm:text-[1.85rem]' : large ? 'text-[3.25rem] sm:text-[3.6rem]' : 'text-[2rem]'}>
        {missing ? 'Not available' : formatScore(obtained)}
      </span>
      {typeof total === 'number' && Number.isFinite(total) && (
        <span className={`ml-1 font-medium text-[#69798A] ${large ? 'text-xl' : 'text-base'}`}>/ {formatScore(total)}</span>
      )}
    </p>
  );
}

export function ScoreBar({ percentage }) {
  const width = barPercent(percentage);
  return (
    <div className="h-1.5 overflow-hidden rounded-full bg-[#E5EAF0]" aria-hidden="true">
      <div className="jee-bar-fill h-full rounded-full bg-[#16A36A]" style={{ width: `${width}%` }} />
    </div>
  );
}

export default function OverallScoreCard({ obtained, total, percentage }) {
  const percentLabel = formatPercentage(percentage);
  return (
    <section className="jee-report-in rounded-2xl border border-[#E5EAF0] bg-white px-4 py-3.5 sm:px-5" style={{ animationDelay: '40ms' }} aria-label="Overall score">
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold tracking-[0.14em] text-[#69798A] uppercase">Overall score</p>
          <div className="mt-2">
            <ScoreLine obtained={obtained} total={total} large />
          </div>
          <p className="mt-2 text-sm text-[#69798A]">Your overall mock test score.</p>
        </div>
        <ScoreRing percentage={percentage} />
      </div>
      <div className="mt-4">
        <div className="mb-1.5 flex items-center justify-between text-xs font-medium text-[#69798A]">
          <span>Score progress</span>
          <span className="text-[#102A3D]">{percentLabel || 'Not available'}</span>
        </div>
        <ScoreBar percentage={percentage} />
      </div>
    </section>
  );
}

export { ScoreLine };

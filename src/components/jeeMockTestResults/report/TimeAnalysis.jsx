import { formatDuration, sectionTimeShare } from '../../../utils/jeeMockTestResultFormat';

function Metric({ label, value, suffix }) {
  return (
    <div className="rounded-xl bg-[#F5F7FA] px-3 py-3">
      <p className="text-[11px] font-semibold tracking-[0.12em] text-[#69798A] uppercase">{label}</p>
      <p className="mt-1.5 text-lg leading-tight font-semibold tracking-tight text-[#102A3D]">
        {value}
        {suffix && <span className="text-sm font-medium text-[#69798A]"> {suffix}</span>}
      </p>
    </div>
  );
}

export default function TimeAnalysis({ overallMinutes, allottedMinutes, mcqMinutes, numericalMinutes }) {
  const spent = formatDuration(overallMinutes);
  const allotted = formatDuration(allottedMinutes);
  const share = sectionTimeShare(mcqMinutes, numericalMinutes);

  return (
    <section className="jee-report-in rounded-2xl border border-[#E5EAF0] bg-white p-4" style={{ animationDelay: '160ms' }} aria-label="Time analysis">
      <h2 className="text-[11px] font-semibold tracking-[0.14em] text-[#69798A] uppercase">Time analysis</h2>
      <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
        <Metric label="Total time spent" value={spent} suffix={allotted === 'Not available' ? null : `/ ${allotted}`} />
        <Metric label="MCQ time" value={formatDuration(mcqMinutes)} />
        <Metric label="Numerical time" value={formatDuration(numericalMinutes)} />
      </div>
      {share ? (
        <div className="mt-4">
          <div className="flex h-2 overflow-hidden rounded-full bg-[#E5EAF0]" aria-hidden="true">
            <div className="jee-bar-fill h-full bg-[#0B3B65]" style={{ width: `${share.mcq}%` }} />
            <div className="jee-bar-fill h-full bg-[#F58220]" style={{ width: `${share.numerical}%` }} />
          </div>
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-[#69798A]">
            <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-[#0B3B65]" /> MCQ {share.mcq}%</span>
            <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-[#F58220]" /> Numerical {share.numerical}%</span>
          </div>
        </div>
      ) : (
        <p className="mt-3 text-sm text-[#69798A]">Section time split is not available.</p>
      )}
    </section>
  );
}

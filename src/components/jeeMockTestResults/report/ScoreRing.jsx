import { useEffect, useState } from 'react';
import { barPercent, formatPercentage } from '../../../utils/jeeMockTestResultFormat';

export default function ScoreRing({ percentage }) {
  const [drawn, setDrawn] = useState(false);
  const radius = 34;
  const circumference = 2 * Math.PI * radius;
  const hasValue = typeof percentage === 'number' && Number.isFinite(percentage);
  const fill = drawn ? barPercent(percentage) : 0;
  const dash = circumference - (fill / 100) * circumference;
  const label = hasValue ? formatPercentage(percentage) : '—';

  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) {
      setDrawn(true);
      return undefined;
    }
    const frame = window.requestAnimationFrame(() => setDrawn(true));
    return () => window.cancelAnimationFrame(frame);
  }, [percentage]);

  return (
    <div className="relative h-[92px] w-[92px] shrink-0" role="img" aria-label={hasValue ? `${label} overall` : 'Percentage not available'}>
      <svg viewBox="0 0 92 92" className="h-full w-full -rotate-90">
        <circle cx="46" cy="46" r={radius} fill="none" stroke="#E5EAF0" strokeWidth="7" />
        <circle
          cx="46"
          cy="46"
          r={radius}
          fill="none"
          stroke="#16A36A"
          strokeWidth="7"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dash}
          className="transition-[stroke-dashoffset] duration-700 ease-out motion-reduce:transition-none"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="font-sw-display text-[15px] font-semibold tracking-tight text-[#102A3D]">{label}</span>
      </div>
    </div>
  );
}
